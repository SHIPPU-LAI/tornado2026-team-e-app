// 段階的な検索。上の段で足りたら下の段は動かさない。
//
//   段1 キーワード一致        D1のみ          0円   <10ms
//   段2 シノニム展開          D1のみ          0円   <10ms
//   段3 ベクトル類似          Workers AI      無料枠 ~100ms
//
// 外部のLLM APIは検索経路に一切登場しない。

import { keywordCards, cardsByTags, cardsWithEmbedding, loadSynonyms } from "./db.js";
import { expand, SYNONYMS } from "./synonyms.js";
import { embed, cosine } from "./embed.js";

const VECTOR_THRESHOLD = 0.45; // これ未満は「関係ない」として捨てる
const VECTOR_LIMIT = 5;

export async function search(
  env,
  { q = "", block = "", prefecture = "", tag = "", name = "" } = {},
) {
  const db = env.DB;
  const filters = { block, prefecture, tag, name };
  const query = q.trim();

  // --- 段1: キーワード一致 ---------------------------------
  const hits = await keywordCards(db, query, filters);
  if (hits.length > 0 || !query) {
    return { stage: "keyword", items: hits.map((card) => ({ card })), meta: {} };
  }

  // --- 段2: シノニム展開 -----------------------------------
  let dict = SYNONYMS;
  try {
    const fromDb = await loadSynonyms(db);
    if (Object.keys(fromDb).length > 0) dict = fromDb;
  } catch {
    // 辞書テーブルが無くてもコード側の定義で動く
  }

  const tags = expand(query, dict);
  if (tags.length > 0) {
    const byTag = await cardsByTags(db, tags, filters);
    if (byTag.length > 0) {
      return {
        stage: "synonym",
        items: byTag.map((card) => ({ card })),
        meta: { expanded: tags },
      };
    }
  }

  // --- 段3: ベクトル類似 -----------------------------------
  if (!env.AI) {
    return {
      stage: "none",
      items: [],
      meta: {
        note: "段3はWorkers AIが必要です。`npx wrangler login` のうえ wrangler.jsonc の ai バインディングを有効にしてください",
      },
    };
  }

  const pool = await cardsWithEmbedding(db, filters);
  if (pool.length === 0) {
    return {
      stage: "none",
      items: [],
      meta: { note: "埋め込み未生成。「再インデックス」を実行してください" },
    };
  }

  const t0 = Date.now();
  const [qv] = await embed(env.AI, [query]);
  const ms = Date.now() - t0;

  const scored = pool
    .map(({ card, vector }) => ({ card, score: cosine(qv, vector) }))
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score >= VECTOR_THRESHOLD)
    .slice(0, VECTOR_LIMIT);

  return {
    stage: "vector",
    items: scored.map((x) => ({
      card: x.card,
      score: Number(x.score.toFixed(3)),
    })),
    meta: { embed_ms: ms, pool: pool.length, threshold: VECTOR_THRESHOLD },
  };
}
