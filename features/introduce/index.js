// 紹介機能。
//
// この feature が持つパス（実装済み分のみ。残りは実装計画書のステップ順で足す）:
//   POST   /api/introduce/artisan/compose   カード作成の中核（設計書3章）
//   GET    /api/introduce/artisan/mine      自分のカード一覧
//   POST   /api/introduce/artisan           新規登録
//   PUT    /api/introduce/artisan/:id       修正
//   DELETE /api/introduce/artisan/:id       削除
//   GET    /api/introduce/artisan/:id       1件取得（修正フォーム用）
//
// 【重要】静的パス（/compose, /mine）は :id より先に登録する。
// 後から足す /name-kana /name-suggestions /postal /geocode /reverse も
// 必ず :id より前に置くこと（AGENTS.md 3, 設計書2-3）。
//
// 未実装の /api/introduce/user/* は 501 を返す。

import { Hono } from "hono";

import { readSessionCookie, userBySessionToken } from "../auth/session.js";
import { QUESTIONS } from "./prompt.js";
import { composeCard } from "./compose.js";
import {
  normalizeTags,
  insertCard,
  getCardForArtisan,
  listMineCards,
  updateCardForArtisan,
  deleteCardForArtisan,
  deleteCardRelated,
  upsertCardI18nEn,
} from "./db.js";

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

app.post("/api/introduce/artisan", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim();

  if (!name || !description) {
    return fail(c, "VALIDATION_ERROR", "name, description は必須です", 400);
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

  // image_keys はステップ5で card_images に紐付ける。今は受け取るだけで何もしない。

  return c.json({ ok: true, id });
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

  // card_embedding は検索機能の所有物なので触らない（設計書8章。ステップ8でまとめて扱う）。
  await deleteCardRelated(db(c), id);

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

// ここより下は未実装のスタブ。実装計画書のステップに沿って上から実装していく。
app.all("/api/introduce/artisan/*", notImplemented);
app.all("/api/introduce/user/*", notImplemented);

export default app;
