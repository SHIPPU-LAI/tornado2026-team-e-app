// 統合ルーティング。
//
// 各 feature は「自分の絶対パスを自分で持つ」規約。
// ここは app.route() で mount するだけ。機能を足すときも1行追加で済む。

import { Hono } from "hono";

import search from "../features/search/index.js";
import introduce from "../features/introduce/index.js";
import auth from "../features/auth/index.js";

const app = new Hono();

// 各機能の現況。トップページの表示にも使う。
//
// 画面（見た目）はフロントエンドの担当。
// バックエンド側の成果物は API であって、ここに出てくる /dev/* は検証用。
const FEATURES = [
  {
    dir: "features/search/",
    label: "検索",
    status: "ready",
    page: "/dev/search",
    pageNote: "検証用",
    api: "/api/search",
    note: "段1 キーワード → 段2 シノニム → 段3 ベクトル。英語のクエリも一部通る",
  },
  {
    dir: "features/introduce/",
    label: "紹介（カード作成・表示・いいね）",
    status: "ready",
    page: "/dev/introduce",
    pageNote: "検証用",
    api: "/api/introduce",
    note: "カード作成（5問→AI）・編集・表示・いいね・画像・住所",
  },
  {
    dir: "features/auth/",
    label: "ログイン・ユーザー登録",
    status: "ready",
    page: "/dev/login",
    pageNote: "検証用",
    api: "/api/auth",
    note: "職人と一般のロールがある。パスワードは12文字以上",
  },
  {
    dir: "frontend/",
    label: "フロントエンド（画面）",
    status: "external",
    page: "/ , /search , /user , /login , /artisan",
    api: "—",
    note: "パスは空けてある（/ , /search , /user , /login , /artisan）。API仕様は docs/フロントエンド向けAPI.md",
  },
];

// 【重要】トップページは route() より前に定義する。
// 後に置くと、サブアプリが "/" を持っていた場合に黙って奪われる（Hono は先勝ち）。
app.get("/", (c) => {
  const LABEL = {
    ready: '<span class="ok">実装済み</span>',
    stub: '<span class="ng">スタブ</span>',
    external: '<span class="ng">別担当</span>',
  };

  const row = (f) => {
    const on = f.status === "ready";
    return `<tr>
      <td><span class="dot ${on ? "on" : "off"}"></span>${f.label}</td>
      <td class="muted mono small">${f.dir}</td>
      <td>${LABEL[f.status]}</td>
      <td>${
        on
          ? `<a href="${f.page}">${f.page}</a>${
              f.pageNote ? ` <span class="muted small">${f.pageNote}</span>` : ""
            }`
          : `<span class="muted small">${f.page}</span>`
      }</td>
      <td class="muted mono small">${f.api}</td>
      <td class="muted small">${f.note || ""}</td>
    </tr>`;
  };

  return c.html(`<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>チームE 統合アプリ</title>
<style>
  :root{--bg:#faf9f7;--fg:#1c1a17;--muted:#6b6256;--line:#e0dbd2;--card:#fff;--accent:#8c4a2f;}
  body{margin:0;padding:2rem 1rem 4rem;background:var(--bg);color:var(--fg);line-height:1.7;
    font-family:system-ui,-apple-system,"Hiragino Sans","Yu Gothic",sans-serif;}
  main{max-width:820px;margin:0 auto;}
  h1{font-size:1.3rem;margin:0 0 .2rem;}
  .sub{color:var(--muted);font-size:.87rem;margin:0 0 1.5rem;}
  table{width:100%;border-collapse:collapse;background:var(--card);
    border:1px solid var(--line);border-radius:10px;overflow:hidden;}
  th,td{text-align:left;padding:.6rem .8rem;border-bottom:1px solid var(--line);font-size:.9rem;}
  th{background:#f4f1ec;font-size:.78rem;color:var(--muted);font-weight:600;}
  tr:last-child td{border-bottom:0;}
  .muted{color:var(--muted);} .small{font-size:.8rem;} .mono{font-family:ui-monospace,monospace;font-size:.82rem;}
  .ok{color:#3d6b33;font-weight:600;} .ng{color:var(--muted);}
  .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:.5rem;}
  .dot.on{background:#3d6b33;} .dot.off{background:#c9c2b8;}
  a{color:var(--accent);}
  .note{margin-top:1.5rem;padding:.8rem 1rem;background:var(--card);
    border:1px solid var(--line);border-radius:10px;font-size:.85rem;}
  .note b{font-weight:600;}
  ul{margin:.4rem 0 0;padding-left:1.2rem;}
</style></head>
<body><main>
  <h1>チームE 統合アプリ</h1>
  <p class="sub">各機能を1つの Worker として動かす場所です。
    <b>担当ごとに作業ディレクトリが分かれています。</b></p>

  <table>
    <tr><th>機能</th><th>作業ディレクトリ</th><th>状態</th><th>画面</th><th>API</th><th>備考</th></tr>
    ${FEATURES.map(row).join("")}
  </table>

  <div class="note">
    <b>これは統合の受け皿です。</b>
    <ul>
      <li><b>自分の作業ディレクトリの中だけを触ってください。</b>
          他の担当のディレクトリと、<code>src/index.js</code> は共有です</li>
      <li>機能を足すときは <code>features/&lt;名前&gt;/index.js</code> を作り、
          <code>src/index.js</code> に <code>app.route("/", 機能)</code> を1行足すだけです。
          各機能は自分の絶対パスを自分で持ちます</li>
      <li><b>画面（見た目）はフロントエンドの担当です。</b>
          <code>/dev/*</code> はバックエンドの動作確認用で、成果物ではありません。
          本番の画面を置けるよう <code>/search</code> などのパスは空けてあります</li>
      <li><b>本番はここで動いています</b>（デプロイ済み）</li>
      <li>フロントエンド向けのAPI仕様は <code>docs/フロントエンド向けAPI.md</code> にあります</li>
      <li>残りの未決事項は README.md にまとめてあります</li>
    </ul>
  </div>
</main></body></html>`);
});

app.route("/", search);
app.route("/", introduce);
app.route("/", auth);

app.notFound((c) =>
  c.json({ error: { code: "NOT_FOUND", message: "そのパスはありません" } }, 404),
);

app.onError((err, c) => {
  console.error("[unhandled]", err);
  return c.json({ error: { code: "INTERNAL_ERROR", message: "サーバーエラー" } }, 500);
});

export default app;
