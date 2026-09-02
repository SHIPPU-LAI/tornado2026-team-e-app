// D1 アクセス（cards の書き込みは紹介機能が所有）。
//
// card_embedding は検索機能の所有物なので、ここでは一切触らない（ステップ8で
// features/search/embed.js, db.js の公開関数を import して使う）。

export const MAX_TAGS = 5;

const CARD_COLS = `
  id, artisan_id, name, name_kana, artisan_name, description,
  image_url, hp_url, region, address, history, tags, lang, created_at, updated_at
`;

function shapeTags(tagsStr) {
  return (tagsStr || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function shapeCard(row) {
  if (!row) return null;
  return { ...row, tags: shapeTags(row.tags) };
}

// フロントを信用しない。サーバー側でも上限5個を強制する（設計書の完了条件）。
export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return "";
  return tags
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, MAX_TAGS)
    .join(",");
}

export async function insertCard(db, card) {
  await db
    .prepare(
      `insert into cards
        (id, artisan_id, name, name_kana, artisan_name, description,
         image_url, hp_url, region, address, history, tags, lang, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      card.id,
      card.artisan_id,
      card.name,
      card.name_kana,
      card.artisan_name,
      card.description,
      card.image_url,
      card.hp_url,
      card.region,
      card.address,
      card.history,
      card.tags,
      card.lang,
      card.created_at,
      card.updated_at,
    )
    .run();
}

// 他人のカードを触らせない：where に artisan_id を必ず入れる。
export async function getCardForArtisan(db, id, artisanId) {
  const row = await db
    .prepare(`select ${CARD_COLS} from cards where id = ? and artisan_id = ?`)
    .bind(id, artisanId)
    .first();
  return shapeCard(row);
}

export async function listMineCards(db, artisanId) {
  const { results } = await db
    .prepare(`select ${CARD_COLS} from cards where artisan_id = ? order by updated_at desc`)
    .bind(artisanId)
    .all();
  return results.map(shapeCard);
}

// 更新できたら true、他人のカード（該当行なし）なら false。
export async function updateCardForArtisan(db, id, artisanId, fields, updatedAt) {
  const cols = [
    "name", "name_kana", "artisan_name", "description",
    "image_url", "hp_url", "region", "address", "history", "tags",
  ];
  const sets = [];
  const binds = [];
  for (const col of cols) {
    if (Object.prototype.hasOwnProperty.call(fields, col)) {
      sets.push(`${col} = ?`);
      binds.push(fields[col]);
    }
  }
  sets.push("updated_at = ?");
  binds.push(updatedAt);

  const res = await db
    .prepare(`update cards set ${sets.join(", ")} where id = ? and artisan_id = ?`)
    .bind(...binds, id, artisanId)
    .run();

  return res.meta.changes > 0;
}

// 削除できたら true、他人のカード（該当行なし）なら false。
export async function deleteCardForArtisan(db, id, artisanId) {
  const res = await db
    .prepare("delete from cards where id = ? and artisan_id = ?")
    .bind(id, artisanId)
    .run();
  return res.meta.changes > 0;
}

// カード削除時の後始末。card_embedding は検索機能の所有物なので触らない
// （孤児が残っても cards と突き合わせているため検索結果には出ない。ステップ8で扱う）。
export async function deleteCardRelated(db, cardId) {
  await Promise.all([
    db.prepare("delete from card_i18n where card_id = ?").bind(cardId).run(),
    db.prepare("delete from card_geo where card_id = ?").bind(cardId).run(),
    db.prepare("delete from card_images where card_id = ?").bind(cardId).run(),
    db.prepare("delete from likes where card_id = ?").bind(cardId).run(),
  ]);
}

// 住所検索で得た緯度経度を保存する（設計書7章）。無ければ呼ばなくてよい。
// 検索機能は無い場合、都道府県の代表座標（features/search/regions.js）で代替する。
export async function setCardGeo(db, cardId, lat, lng, source, updatedAt) {
  await db
    .prepare(
      `insert into card_geo (card_id, lat, lng, source, updated_at)
       values (?, ?, ?, ?, ?)
       on conflict(card_id) do update set
         lat = excluded.lat, lng = excluded.lng, source = excluded.source, updated_at = excluded.updated_at`,
    )
    .bind(cardId, lat, lng, source ?? null, updatedAt)
    .run();
}

// --- ユーザー側（カード閲覧・いいね） -----------------------------

// artisan_name が「（架空）」で始まるカードは発表用のダミーデータ。
// features/search/db.js の shape() と同じ判定（実在の工房と誤解させないため）。
export function isDummyCard(card) {
  return String(card.artisan_name || "").startsWith("（架空）");
}

export async function getCardPublic(db, id) {
  const row = await db
    .prepare(`select ${CARD_COLS} from cards where id = ?`)
    .bind(id)
    .first();
  return shapeCard(row);
}

// 品単位のカードをランダムに1件返す（伝統名でグループ化しない。設計書3-2）。
// swipes を持たないので既読管理はしない。同じカードが連続で出ることがある
// （既知の割り切り。除外ロジックは足さない）。
export async function getRandomCard(db) {
  const row = await db
    .prepare(`select ${CARD_COLS} from cards order by random() limit 1`)
    .first();
  return shapeCard(row);
}

export async function countLikes(db, cardId) {
  const row = await db
    .prepare("select count(*) as n from likes where card_id = ?")
    .bind(cardId)
    .first();
  return row.n;
}

export async function isLikedByUser(db, cardId, userId) {
  if (!userId) return false;
  const row = await db
    .prepare("select id from likes where user_id = ? and card_id = ?")
    .bind(userId, cardId)
    .first();
  return Boolean(row);
}

// トグル。既に居れば消す、無ければ増やす。likes.unique(user_id, card_id) が
// 最後の砦（同じユーザーの同じカードへの二重いいねを防ぐ）。
export async function toggleLike(db, cardId, userId) {
  const existing = await db
    .prepare("select id from likes where user_id = ? and card_id = ?")
    .bind(userId, cardId)
    .first();

  if (existing) {
    await db.prepare("delete from likes where id = ?").bind(existing.id).run();
  } else {
    await db
      .prepare("insert into likes (user_id, card_id, created_at) values (?, ?, ?)")
      .bind(userId, cardId, Date.now())
      .run();
  }

  const like_count = await countLikes(db, cardId);
  return { liked: !existing, like_count };
}

export async function listLikedCards(db, userId) {
  const { results } = await db
    .prepare(
      `select ${CARD_COLS.split(",").map((c) => `c.${c.trim()}`).join(", ")}
       from likes l join cards c on c.id = l.card_id
       where l.user_id = ?
       order by l.created_at desc`,
    )
    .bind(userId)
    .all();
  return results.map(shapeCard);
}

export async function getCardGeoRow(db, cardId) {
  return db
    .prepare("select lat, lng from card_geo where card_id = ?")
    .bind(cardId)
    .first();
}

export async function listCardImages(db, cardId) {
  const { results } = await db
    .prepare("select image_key from card_images where card_id = ? order by sort_order")
    .bind(cardId)
    .all();
  return results.map((r) => r.image_key);
}

export async function getCardI18n(db, cardId, lang) {
  return db
    .prepare("select name, description from card_i18n where card_id = ? and lang = ?")
    .bind(cardId, lang)
    .first();
}

export async function upsertCardI18nEn(db, cardId, name, description, updatedAt) {
  await db
    .prepare(
      `insert into card_i18n (card_id, lang, name, description, updated_at)
       values (?, 'en', ?, ?, ?)
       on conflict(card_id, lang) do update set
         name = excluded.name, description = excluded.description, updated_at = excluded.updated_at`,
    )
    .bind(cardId, name ?? null, description ?? null, updatedAt)
    .run();
}
