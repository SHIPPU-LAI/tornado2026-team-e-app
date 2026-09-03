// 検索機能
//
// この feature が持つパス:
//   GET  /dev/search             検証用の画面（フロント担当が本番画面を作るまでの確認用）
//   GET  /api/search/facets      フィルタ用の選択肢
//   GET  /api/search/cards       一覧（絞り込みのみ）
//   GET  /api/search             検索（段1→段2→段3）
//   POST /api/search/reindex     埋め込みの生成（REINDEX_TOKEN を設定すると要認証）
//   GET  /api/search/status      インデックス済み件数
//
// この feature が書き込むテーブル: card_embedding, synonym
// cards は紹介機能の持ち物なので読むだけ。

import { Hono } from "hono";
import { cors } from "hono/cors";

import {
  facets,
  cardsMissingEmbedding,
  saveEmbedding,
  countEmbedded,
  listCards,
  buildEmbeddingText,
} from "./db.js";
import { search } from "./search.js";
import { embed, EMBED_MODEL } from "./embed.js";
import { renderPage } from "./ui.js";

const app = new Hono();

app.use("/api/search/*", cors());

const fail = (c, code, message, status) =>
  c.json({ error: { code, message } }, status);

// バインディング名の食い違いは wrangler.jsonc 側で解消した
// （同じ database_id を DB と teame_taka_introduce の2名で公開）。
// コード側でフォールバックすると、どちらのDBを見ているか分からなくなるのでしない。
const db = (c) => c.env.DB;

// --- 検証用の画面 -----------------------------------------------
// これは成果物ではない。本番の検索結果画面はフロントエンド担当が作る。
// フロントが /search を使えるよう、こちらは /dev/search に退避してある。
app.get("/dev/search", (c) => c.html(renderPage()));

// --- API --------------------------------------------------------
app.get("/api/search/facets", async (c) => c.json(await facets(db(c))));

app.get("/api/search/cards", async (c) => {
  const { block = "", prefecture = "", tag = "", name = "" } = c.req.query();
  const items = await listCards(db(c), { block, prefecture, tag, name });
  return c.json({ items, total: items.length, next_cursor: null });
});

app.get("/api/search", async (c) => {
  const { q = "", block = "", prefecture = "", tag = "", name = "" } = c.req.query();
  const t0 = Date.now();
  try {
    const r = await search({ DB: db(c), AI: c.env.AI }, { q, block, prefecture, tag, name });
    return c.json({ query: q, ...r, total: r.items.length, ms: Date.now() - t0 });
  } catch (e) {
    console.error("[search]", e);
    return fail(c, "INTERNAL_ERROR", String(e.message || e), 500);
  }
});

// 埋め込みの生成。登録時に1回だけ動く処理を、まとめて実行する版。
//
// 未処理のカードだけを対象にするので、2回目以降は AI を1回も呼ばない。
// つまり総コストは「カード枚数ぶん」で頭打ちになる。
//
// 【デプロイするときは REINDEX_TOKEN を必ず設定すること】
//   npx wrangler secret put REINDEX_TOKEN
// 未設定だと誰でも叩ける状態のまま公開されます。
// ローカル開発を止めないため、未設定のときは通す作りにしてあります。
app.post("/api/search/reindex", async (c) => {
  const want = c.env.REINDEX_TOKEN;
  if (want && c.req.header("x-reindex-token") !== want) {
    return fail(c, "UNAUTHORIZED", "x-reindex-token が違います", 401);
  }

  const targets = await cardsMissingEmbedding(db(c));
  if (targets.length === 0) {
    return c.json({ indexed: 0, ...(await countEmbedded(db(c))) });
  }

  const t0 = Date.now();
  try {
    // 一度に投げすぎないよう小分けにする
    const BATCH = 10;
    let done = 0;
    for (let i = 0; i < targets.length; i += BATCH) {
      const chunk = targets.slice(i, i + BATCH);
      const texts = await Promise.all(chunk.map((card) => buildEmbeddingText(db(c), card)));
      const vectors = await embed(c.env.AI, texts);
      for (let j = 0; j < chunk.length; j++) {
        await saveEmbedding(db(c), chunk[j].id, vectors[j], EMBED_MODEL);
        done++;
      }
    }
    return c.json({ indexed: done, ms: Date.now() - t0, ...(await countEmbedded(db(c))) });
  } catch (e) {
    console.error("[reindex]", e);
    return fail(c, "EMBED_ERROR", String(e.message || e), 502);
  }
});

app.get("/api/search/status", async (c) => c.json(await countEmbedded(db(c))));

export default app;
