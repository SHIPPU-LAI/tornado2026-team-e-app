// 紹介機能。
//
// この feature が持つパス（実装済み分のみ。残りは実装計画書のステップ順で足す）:
//   POST   /api/introduce/artisan/compose   カード作成の中核（設計書3章）
//   GET    /api/introduce/artisan/mine      自分のカード一覧
//   GET    /api/introduce/artisan/postal    郵便番号→住所（zipcloud中継、設計書7章）
//   GET    /api/introduce/artisan/geocode   屋号・住所→候補＋緯度経度（Nominatim中継）
//   GET    /api/introduce/artisan/reverse   緯度経度→住所（Nominatim逆引き）
//   POST   /api/introduce/artisan           新規登録
//   PUT    /api/introduce/artisan/:id       修正
//   DELETE /api/introduce/artisan/:id       削除
//   GET    /api/introduce/artisan/:id       1件取得（修正フォーム用）
//   POST   /api/introduce/artisan/upload-image  画像を1枚アップロード（設計書6章）
//   GET    /api/introduce/image/:key        画像を返す              未ログインOK
//   GET    /api/introduce/user/liked        いいね一覧              ← requireAuth
//   GET    /api/introduce/user/next         カードを1枚             未ログインOK
//   POST   /api/introduce/user/:id/like     いいねトグル            ← requireAuth
//   GET    /api/introduce/user/:id          記事詳細                未ログインOK
//   GET    /dev/introduce                   compose動作確認用の画面（成果物ではない）
//
// 【重要】静的パス（/compose, /mine, /postal, /geocode, /reverse, /liked, /next）は
// :id より先に登録する。後から足す /name-kana /name-suggestions も
// 必ず :id より前に置くこと（AGENTS.md 3, 設計書2-3）。
//
// 閲覧（next, :id）は未ログインでも通す。訪日客が偶然開いて見られることが
// 前提のアプリのため（設計書4-3）。いいね関連だけ requireAuth を掛ける。

import { Hono } from "hono";

import { readSessionCookie, userBySessionToken } from "../auth/session.js";
import { QUESTIONS } from "./prompt.js";
import { composeCard } from "./compose.js";
import { fetchPostal, fetchGeocode, fetchReverse } from "./address.js";
import { renderPage } from "./ui.js";
import { embed, EMBED_MODEL } from "../search/embed.js";
import { saveEmbedding, buildEmbeddingText } from "../search/db.js";
import {
  normalizeTags,
  insertCard,
  getCardForArtisan,
  listMineCards,
  updateCardForArtisan,
  deleteCardForArtisan,
  deleteCardRelated,
  upsertCardI18nEn,
  setCardGeo,
  isDummyCard,
  getCardPublic,
  getRandomCard,
  countLikes,
  isLikedByUser,
  toggleLike,
  listLikedCards,
  getCardGeoRow,
  listCardImages,
  insertCardImages,
  getCardI18n,
  MAX_IMAGES,
} from "./db.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const app = new Hono();

const fail = (c, code, message, status) =>
  c.json({ error: { code, message } }, status);

// バインディング名は AGENTS.md のとおり teame_taka_introduce。
// DB と同じ database_id を指しているので、features/auth が作ったセッションも読める。
const db = (c) => c.env.teame_taka_introduce;

const notImplemented = (c) =>
  fail(c, "NOT_IMPLEMENTED", "紹介機能はまだこのパスを実装していません", 501);

// 【重要】"*" では登録しない。自分の接頭辞に限定する（AGENTS.md 2-c）。
// 職人側APIは role === 'artisan' も確認する。artisan_id はクエリではなく
// セッションから取る（設計書4-3。仕様書の簡易実装はなりすませてしまう）。
async function requireArtisan(c, next) {
  const token = readSessionCookie(c);
  const user = await userBySessionToken(db(c), token);
  if (!user) return fail(c, "UNAUTHORIZED", "ログインが必要です", 401);
  if (user.role !== "artisan") {
    return fail(c, "UNAUTHORIZED", "職人アカウントでログインしてください", 401);
  }
  c.set("user", user);
  await next();
}

// --- 検証用の画面 -----------------------------------------------
// これは成果物ではない。features/search/ui.js と同じ位置づけ。
// /artisan, /user はフロントエンド担当のために空けてあるので占有しない。
app.get("/dev/introduce", (c) => c.html(renderPage(QUESTIONS)));

app.use("/api/introduce/artisan/*", requireArtisan);

app.post("/api/introduce/artisan/compose", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const answers = Array.isArray(body.answers)
    ? body.answers.map((a) => String(a ?? ""))
    : [];
  while (answers.length < QUESTIONS.length) answers.push("");

  const followups = Array.isArray(body.followups) ? body.followups : [];

  if (!name) {
    return fail(c, "VALIDATION_ERROR", "name は必須です", 400);
  }

  // artisan_id はここでセッションから取れる状態にしてある。
  // compose 自体はまだ何も保存しないので今は使わない（ステップ4のカード登録で使う）。
  void c.get("user").id;

  const result = await composeCard(c.env, { name, answers, followups });
  return c.json(result);
});

app.get("/api/introduce/artisan/mine", async (c) => {
  const items = await listMineCards(db(c), c.get("user").id);
  return c.json({ items, total: items.length });
});

// --- 住所検索の中継（設計書7章） ---------------------------------
// 外部APIが落ちても登録自体は続けられる。ここで握りつぶさず、
// 呼び出し側（フロント）に失敗をそのまま返す。

app.get("/api/introduce/artisan/postal", async (c) => {
  const code = (c.req.query("code") || "").replace(/-/g, "");
  if (!/^\d{7}$/.test(code)) {
    return fail(c, "VALIDATION_ERROR", "code は7桁の数字で指定してください", 400);
  }
  try {
    const data = await fetchPostal(code);
    return c.json(data);
  } catch (e) {
    console.error("[introduce] postal: 外部APIの呼び出しに失敗", e);
    return fail(c, "UPSTREAM_ERROR", "住所の取得に失敗しました", 502);
  }
});

app.get("/api/introduce/artisan/geocode", async (c) => {
  const q = (c.req.query("q") || "").trim();
  if (!q) return fail(c, "VALIDATION_ERROR", "q は必須です", 400);
  try {
    const items = await fetchGeocode(q);
    return c.json({ items });
  } catch (e) {
    console.error("[introduce] geocode: 外部APIの呼び出しに失敗", e);
    return fail(c, "UPSTREAM_ERROR", "住所の検索に失敗しました", 502);
  }
});

app.get("/api/introduce/artisan/reverse", async (c) => {
  const lat = c.req.query("lat");
  const lng = c.req.query("lng");
  if (!lat || !lng) {
    return fail(c, "VALIDATION_ERROR", "lat, lng は必須です", 400);
  }
  try {
    // Nominatim側のパラメータ名は lon（lng ではない）。ここで変換する。
    const data = await fetchReverse(lat, lng);
    return c.json(data);
  } catch (e) {
    console.error("[introduce] reverse: 外部APIの呼び出しに失敗", e);
    return fail(c, "UPSTREAM_ERROR", "住所の取得に失敗しました", 502);
  }
});

// カード1件だけ埋め込みを作り直す（設計書8章）。全件reindexは呼ばない。
// card_embedding は検索機能の所有物なので、直接SQLは書かず公開関数を呼ぶ。
// 失敗してもカードの保存自体は成功させる（段1・段2では検索できるため）。
async function reindexCard(c, cardId) {
  try {
    const card = await getCardPublic(db(c), cardId);
    if (!card) return;
    // buildEmbeddingText が全件reindexと同じ経路（設計書8-2-b）。
    // card_i18n(lang='en') があれば埋め込みテキストに混ぜる。無くても壊れない。
    const text = await buildEmbeddingText(c.env.DB, card);
    const [vector] = await embed(c.env.AI, [text]);
    await saveEmbedding(c.env.DB, cardId, vector, EMBED_MODEL);
  } catch (e) {
    console.error("[introduce] 埋め込み生成に失敗", e);
  }
}

// lat/lng が両方とも数値で渡されたときだけ card_geo に保存する。
// 無くてもカードは作れる（検索機能が都道府県の代表座標で代替する）。
async function saveGeoIfPresent(c, cardId, body, updatedAt) {
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const source = body.geo_source ? String(body.geo_source) : null;
  await setCardGeo(db(c), cardId, lat, lng, source, updatedAt);
}

// --- 画像（設計書6章） --------------------------------------------
// KV に生バイトで保存する。base64 は経由しない。
// content_type を metadata に入れないと、取り出すときに何の画像か分からない。

app.post("/api/introduce/artisan/upload-image", async (c) => {
  const body = await c.req.parseBody().catch(() => ({}));
  const file = body.file;

  if (!(file instanceof File)) {
    return fail(c, "VALIDATION_ERROR", "file は必須です", 400);
  }
  if (!file.type || !file.type.startsWith("image/")) {
    return fail(c, "VALIDATION_ERROR", "画像ファイルのみアップロードできます", 400);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return fail(c, "VALIDATION_ERROR", "5MBを超える画像はアップロードできません", 400);
  }

  const key = `card-image:${crypto.randomUUID()}`;
  const buf = await file.arrayBuffer();
  await c.env.teame_images.put(key, buf, { metadata: { content_type: file.type } });

  return c.json({ key });
});

app.post("/api/introduce/artisan", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim();

  if (!name || !description) {
    return fail(c, "VALIDATION_ERROR", "name, description は必須です", 400);
  }

  const imageKeys = Array.isArray(body.image_keys) ? body.image_keys.map(String) : [];
  if (imageKeys.length > MAX_IMAGES) {
    return fail(c, "VALIDATION_ERROR", `画像は最大${MAX_IMAGES}枚までです`, 400);
  }

  const artisanId = c.get("user").id;
  const id = crypto.randomUUID();
  const now = Date.now();

  const card = {
    id,
    artisan_id: artisanId,
    name,
    name_kana: body.name_kana ? String(body.name_kana) : null,
    artisan_name: body.artisan_name ? String(body.artisan_name) : null,
    description,
    image_url: null, // ステップ5で card_images 経由に置き換える。未使用の列（dev-schema参照）
    hp_url: body.hp_url ? String(body.hp_url) : null,
    region: body.region ? String(body.region) : null,
    address: body.address ? String(body.address) : null,
    history: body.history ? String(body.history) : null,
    tags: normalizeTags(body.tags),
    lang: "ja",
    created_at: now,
    updated_at: now,
  };

  await insertCard(db(c), card);

  if (body.description_en) {
    await upsertCardI18nEn(db(c), id, body.name_en ?? null, String(body.description_en), now);
  }

  await saveGeoIfPresent(c, id, body, now);

  if (imageKeys.length > 0) {
    await insertCardImages(db(c), id, imageKeys);
  }

  await reindexCard(c, id);

  // フロントが送った配列との差（6個目が切られた等）に気づけるよう、
  // 保存後の tags をそのまま返す。
  return c.json({ ok: true, id, tags: card.tags ? card.tags.split(",").filter(Boolean) : [] });
});

app.put("/api/introduce/artisan/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const artisanId = c.get("user").id;

  const fields = {};
  const strCols = ["name", "name_kana", "artisan_name", "description", "hp_url", "region", "address", "history"];
  for (const col of strCols) {
    if (Object.prototype.hasOwnProperty.call(body, col)) {
      fields[col] = body[col] === null ? null : String(body[col]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "tags")) {
    fields.tags = normalizeTags(body.tags);
  }

  const now = Date.now();
  const updated = await updateCardForArtisan(db(c), id, artisanId, fields, now);
  if (!updated) {
    return fail(c, "NOT_FOUND", "カードが見つかりません", 404);
  }

  if (Object.prototype.hasOwnProperty.call(body, "description_en")) {
    await upsertCardI18nEn(db(c), id, body.name_en ?? null, body.description_en, now);
  }

  await saveGeoIfPresent(c, id, body, now);

  await reindexCard(c, id);

  const card = await getCardForArtisan(db(c), id, artisanId);
  return c.json({ ok: true, card });
});

app.delete("/api/introduce/artisan/:id", async (c) => {
  const id = c.req.param("id");
  const artisanId = c.get("user").id;

  const deleted = await deleteCardForArtisan(db(c), id, artisanId);
  if (!deleted) {
    return fail(c, "NOT_FOUND", "カードが見つかりません", 404);
  }

  // card_images の行を消す前に、KV上の実体を消すための鍵を読んでおく
  // （ステップ4では card_images の行だけ消していて、KVには残っていた）。
  const imageKeys = await listCardImages(db(c), id);

  // card_embedding は検索機能の所有物なので触らない（設計書8章。ステップ8でまとめて扱う）。
  await deleteCardRelated(db(c), id);

  await Promise.all(imageKeys.map((key) => c.env.teame_images.delete(key)));

  return c.json({ ok: true });
});

app.get("/api/introduce/artisan/:id", async (c) => {
  const id = c.req.param("id");
  const artisanId = c.get("user").id;

  const card = await getCardForArtisan(db(c), id, artisanId);
  if (!card) {
    return fail(c, "NOT_FOUND", "カードが見つかりません", 404);
  }
  return c.json({ card });
});

// 【重要】/api/introduce/artisan/* の外にある。カード閲覧で誰でも見るため
// 認証を掛けない（設計書6章）。キーは uuid なので推測できない。
app.get("/api/introduce/image/:key", async (c) => {
  const key = c.req.param("key");
  const { value, metadata } = await c.env.teame_images.getWithMetadata(key, "stream");
  if (!value) {
    return fail(c, "NOT_FOUND", "画像が見つかりません", 404);
  }
  return new Response(value, {
    headers: { "content-type": metadata?.content_type || "application/octet-stream" },
  });
});

// --- ユーザー側（カード閲覧・いいね、設計書4-3・8章） -------------
// 【重要】/api/introduce/user/* にまとめて requireAuth を掛けない。
// 閲覧（/next, /:id）は未ログインで通す。いいね関連だけ要ログイン。

async function requireLoginUser(c, next) {
  const token = readSessionCookie(c);
  const user = await userBySessionToken(db(c), token);
  if (!user) return fail(c, "UNAUTHORIZED", "ログインが必要です", 401);
  c.set("user", user);
  await next();
}

async function optionalUser(c) {
  const token = readSessionCookie(c);
  if (!token) return null;
  return userBySessionToken(db(c), token);
}

// next/:id/liked で共通の表示形を作る。tags は配列化済み、like_count・liked・
// lat/lng・images・is_dummy を必ず含める。lang=en なら card_i18n で差し替える
// （その場で翻訳はしない。設計書5章）。
async function buildCardView(dbc, card, userId, lang) {
  const [like_count, liked, geo, images] = await Promise.all([
    countLikes(dbc, card.id),
    isLikedByUser(dbc, card.id, userId),
    getCardGeoRow(dbc, card.id),
    listCardImages(dbc, card.id),
  ]);

  let name = card.name;
  let description = card.description;
  if (lang === "en") {
    const i18n = await getCardI18n(dbc, card.id, "en");
    if (i18n?.name) name = i18n.name;
    if (i18n?.description) description = i18n.description;
  }

  return {
    ...card,
    name,
    description,
    like_count,
    liked,
    lat: geo ? geo.lat : null,
    lng: geo ? geo.lng : null,
    images,
    is_dummy: isDummyCard(card),
  };
}

app.use("/api/introduce/user/liked", requireLoginUser);
app.use("/api/introduce/user/:id/like", requireLoginUser);

app.get("/api/introduce/user/liked", async (c) => {
  const lang = c.req.query("lang") || "ja";
  const userId = c.get("user").id;
  const items = await listLikedCards(db(c), userId);
  const views = await Promise.all(
    items.map((card) => buildCardView(db(c), card, userId, lang)),
  );
  return c.json({ items: views, total: views.length });
});

// 品単位のカードをランダムに1枚返す（伝統名でグループ化しない。設計書3-2）。
// サーバーは既読状態を持たない。フロントが見たIDを ?exclude=id1,id2,... で
// 送る。除外しても0件になったら無視して全件から返す（getRandomCard参照）。
// カードが0件のときは 404 ではなく card:null を返す（フロントが「もう無い」を表示できるように）。
//
// exclude は1回のリクエストにつきこの件数まで見る。それ以上は先頭だけ使う。
// D1側の上限（100バインド）とは無関係（in(...)を使わずJS側で除外するため）だが、
// URLとレスポンスが際限なく肥大化しないよう上限を決めた。
const EXCLUDE_LIMIT = 500;

app.get("/api/introduce/user/next", async (c) => {
  const lang = c.req.query("lang") || "ja";
  const excludeIds = (c.req.query("exclude") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, EXCLUDE_LIMIT);
  const user = await optionalUser(c);
  const card = await getRandomCard(db(c), excludeIds);
  if (!card) return c.json({ card: null });
  const view = await buildCardView(db(c), card, user ? user.id : null, lang);
  return c.json({ card: view });
});

app.post("/api/introduce/user/:id/like", async (c) => {
  const id = c.req.param("id");
  const card = await getCardPublic(db(c), id);
  if (!card) return fail(c, "NOT_FOUND", "カードが見つかりません", 404);

  const result = await toggleLike(db(c), id, c.get("user").id);
  return c.json(result);
});

app.get("/api/introduce/user/:id", async (c) => {
  const id = c.req.param("id");
  const lang = c.req.query("lang") || "ja";
  const user = await optionalUser(c);

  const card = await getCardPublic(db(c), id);
  if (!card) return fail(c, "NOT_FOUND", "カードが見つかりません", 404);

  const view = await buildCardView(db(c), card, user ? user.id : null, lang);
  return c.json({ card: view });
});

// ここより下は未実装のスタブ。実装計画書のステップに沿って上から実装していく。
app.all("/api/introduce/artisan/*", notImplemented);
app.all("/api/introduce/user/*", notImplemented);

export default app;
