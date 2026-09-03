// D1 へのアクセス。
//
// cards テーブルは紹介機能（introduce-artisan）が所有しているので、ここでは読むだけ。
// 検索側が書き込むのは card_embedding と synonym の2つだけ。

import { blockOf, coordsOf, prefecturesByBlock } from "./regions.js";
import { cardToText } from "./embed.js";

const CARD_COLS = `
  id, artisan_id, name, name_kana, artisan_name, description,
  hp_url, region, address, history, tags, lang, created_at, updated_at
`;

// DBの行を、画面や検索が扱いやすい形に整える。
// - tags はカンマ区切りなので配列にする
// - block（地方）と座標は region から導出する（cards には持たせない）
function shape(row) {
  const tags = (row.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  let block = null;
  try {
    block = blockOf(row.region);
  } catch {
    block = null; // 未知の都道府県でも落とさない
  }

  const co = coordsOf(row.region);

  return {
    ...row,
    tags,
    block,
    lat: co ? co[0] : null,
    lng: co ? co[1] : null,
    is_dummy: String(row.artisan_name || "").startsWith("（架空）"),
  };
}

export async function listCards(
  db,
  { block = "", prefecture = "", tag = "", name = "" } = {},
) {
  const where = [];
  const binds = [];

  if (prefecture) { where.push("region = ?"); binds.push(prefecture); }
  if (name) { where.push("name = ?"); binds.push(name); }

  const sql =
    `select ${CARD_COLS} from cards` +
    (where.length ? ` where ${where.join(" and ")}` : "") +
    " order by updated_at desc, id";

  const { results } = await db.prepare(sql).bind(...binds).all();
  let items = results.map(shape);

  // block と tag は SQL で持てない（cards に列が無い / カンマ区切り）ので JS 側で絞る。
  // 件数が数千を超えたら、派生テーブルを作って索引を張る。
  if (block) items = items.filter((c) => c.block === block);
  if (tag) items = items.filter((c) => c.tags.includes(tag));

  return items;
}

// 段1：キーワード一致。ふりがなも対象にする（ひらがな入力に対応）
export async function keywordCards(db, q, filters = {}) {
  const all = await listCards(db, filters);
  const key = (q || "").trim();
  if (!key) return all;

  return all.filter((c) =>
    [
      c.name, c.name_kana, c.artisan_name, c.description,
      c.block, c.region, c.address, c.history,
      ...c.tags,
    ]
      .filter(Boolean)
      .some((f) => String(f).includes(key)),
  );
}

// 段2：タグ集合で引く（シノニム展開の受け皿）
export async function cardsByTags(db, tags, filters = {}) {
  if (tags.length === 0) return [];
  const all = await listCards(db, filters);
  const want = new Set(tags);
  return all
    .map((c) => ({ card: c, score: c.tags.filter((t) => want.has(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.card);
}

// 段3：埋め込みを持つカードを読む
export async function cardsWithEmbedding(db, filters = {}) {
  const all = await listCards(db, filters);
  if (all.length === 0) return [];

  // D1 は1クエリのバインドパラメータ上限が100。in (?,?,...) だと
  // カード101件で本番だけ落ちる（ローカルのSQLiteは上限が桁違いなので気づけない）。
  // listCards が既に全件読んでいるので、ここも全件読んでJSで突き合わせる。
  const { results } = await db
    .prepare("select card_id, vector from card_embedding")
    .all();

  const vecs = new Map(results.map((r) => [r.card_id, JSON.parse(r.vector)]));
  return all
    .filter((c) => vecs.has(c.id))
    .map((c) => ({ card: c, vector: vecs.get(c.id) }));
}

export async function facets(db) {
  const [regions, tagRows] = await Promise.all([
    db.prepare("select distinct region from cards where region is not null").all(),
    db.prepare("select tags from cards where tags is not null and tags <> ''").all(),
  ]);

  const prefs = regions.results.map((r) => r.region);

  // 実際に登録がある都道府県だけを、地方ごとにまとめる
  const all = prefecturesByBlock();
  const byBlock = {};
  for (const [b, list] of Object.entries(all)) {
    const hit = list.filter((p) => prefs.includes(p));
    if (hit.length) byBlock[b] = hit;
  }

  const tags = [
    ...new Set(
      tagRows.results.flatMap((r) =>
        String(r.tags).split(",").map((t) => t.trim()).filter(Boolean),
      ),
    ),
  ].sort();

  return { blocks: Object.keys(byBlock), prefectures_by_block: byBlock, tags };
}

export async function loadSynonyms(db) {
  const { results } = await db.prepare("select term, maps_to from synonym").all();
  const dict = {};
  for (const r of results) (dict[r.term] ||= []).push(r.maps_to);
  return dict;
}

// --- 埋め込みの管理（検索側が書き込む唯一の場所） -----------------

export async function cardsMissingEmbedding(db) {
  const { results } = await db
    .prepare(
      `select ${CARD_COLS} from cards
       where id not in (select card_id from card_embedding)`,
    )
    .all();
  return results.map(shape);
}

// card_i18n は紹介機能の所有テーブル。ここでは読むだけ（cards を読むのと同じ扱い）。
// 検索結果の?lang=en（search.js）とbuildEmbeddingTextの両方から使う。
export async function getEnglishI18n(db, cardId) {
  const row = await db
    .prepare("select name, description from card_i18n where card_id = ? and lang = 'en'")
    .bind(cardId)
    .first();
  return row || null;
}

// 埋め込みに使うテキストを組み立てる唯一の経路（設計書8-2-b）。
// 全件reindex（このファイルの呼び出し元）も、紹介機能の reindexCard()（1件）も、
// 必ずここを通す。片方だけ英語入りだと結果が歪むため。
// 英訳が無いカードでも落ちない（getEnglishI18n が null を返すだけ）。
export async function buildEmbeddingText(db, card) {
  const i18n = await getEnglishI18n(db, card.id);
  return cardToText({ ...card, name_en: i18n?.name, description_en: i18n?.description });
}

export async function saveEmbedding(db, id, vector, model) {
  await db
    .prepare(
      `insert into card_embedding (card_id, vector, model, updated_at)
       values (?, ?, ?, ?)
       on conflict(card_id) do update set
         vector = excluded.vector, model = excluded.model, updated_at = excluded.updated_at`,
    )
    .bind(id, JSON.stringify(vector), model, Date.now())
    .run();
}

export async function countEmbedded(db) {
  const total = await db.prepare("select count(*) as n from cards").first();
  const emb = await db.prepare("select count(*) as n from card_embedding").first();
  return { total: total.n, embedded: emb.n };
}
