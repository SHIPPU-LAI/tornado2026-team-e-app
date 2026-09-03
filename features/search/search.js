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

// 【重要】絶対値では切れない。実測で分布に2つの型があることが分かった
// （設計書8-2-c）。
//   bamboo flute      0.529 → 0.416          1位だけ突出（差 0.113）
//   子どもと一緒に…  0.429 → 0.424 → 0.411  なだらか
// 1本の絶対値だと、前者では無関係が混ざり、後者では正解（実在の体験施設）が
// 0件になる。そのため最高スコアからの相対窓で切る。
const VECTOR_REL_WINDOW = 0.06; // 最高スコアからこの差以内を残す
const VECTOR_FLOOR = 0.35; // これ未満は何にも近くないので捨てる（相対窓だけだと無関係でも1件は返ってしまうため）
const VECTOR_LIMIT = 5; // 最大件数

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

  const ranked = pool
    .map(({ card, vector }) => ({ card, score: cosine(qv, vector) }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const scored =
    top && top.score >= VECTOR_FLOOR
      ? ranked
          .filter((x) => x.score >= VECTOR_FLOOR && x.score >= top.score - VECTOR_REL_WINDOW)
          .slice(0, VECTOR_LIMIT)
      : [];

  return {
    stage: "vector",
    items: scored.map((x) => ({
      card: x.card,
      score: Number(x.score.toFixed(3)),
    })),
    meta: {
      embed_ms: ms,
      pool: pool.length,
      rel_window: VECTOR_REL_WINDOW,
      floor: VECTOR_FLOOR,
    },
  };
}
