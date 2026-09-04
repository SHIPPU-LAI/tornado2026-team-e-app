// GET /profile の画面。
//
// 【重要】これは仮の画面です。AGENTS.md では /<画面名> はフロントエンドが
// 本番の画面を置く場所と決めており、本来バックエンドは占有しません。
// 今回は「プロフィールのリンク先が無い」状態を一旦解消するため、
// 人間の判断で例外的にバックエンド側が仮置きしています
// （Slackでフロント担当に、本番の画面ができたら差し替えてほしいと伝達済み）。
//
// 既存のAPI（/api/auth/me, /api/introduce/artisan/mine,
// /api/introduce/user/liked）を呼ぶだけで、新しいAPIは作っていません。
// 表示言語（lang）には対応していません（日本語のみ）。
// /css/style.css は app-shell 前提の作りなので読み込まず、自己完結した
// <style> だけで組んでいます。

export function renderPage() {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>プロフィール（仮）</title>
<style>
  :root { --bg:#faf9f7; --fg:#1c1a17; --muted:#6b6256; --line:#e0dbd2; --card:#fff; --accent:#5E2727; }
  * { box-sizing:border-box; }
  body { margin:0; padding:1.5rem 1rem 4rem; background:var(--bg); color:var(--fg);
    font-family:system-ui,-apple-system,"Hiragino Sans","Yu Gothic",sans-serif; line-height:1.6; }
  main { max-width:480px; margin:0 auto; }
  .notice { background:#fff3cd; border:1px solid #f0d78c; color:#6b5a1e;
    border-radius:8px; padding:.6rem .9rem; font-size:.82rem; margin-bottom:1rem; }
  h1 { font-size:1.3rem; margin:0 0 1rem; }
  section.box { background:var(--card); border:1px solid var(--line); border-radius:10px;
    padding:1rem; margin-bottom:1rem; }
  h2 { font-size:.95rem; margin:0 0 .6rem; color:var(--muted); }
  .status { font-size:.9rem; }
  .muted { color:var(--muted); font-size:.82rem; }
  a { color:var(--accent); }
  ul.plain { list-style:none; margin:.4rem 0 0; padding:0; }
  ul.plain li { padding:.35rem 0; border-bottom:1px solid var(--line); font-size:.9rem; }
  ul.plain li:last-child { border-bottom:0; }
  button, .btn { display:inline-block; padding:.55rem 1.1rem; font-size:.88rem; font-family:inherit;
    border:0; border-radius:7px; background:var(--accent); color:#fff; cursor:pointer;
    text-decoration:none; margin-top:.4rem; }
  button.ghost, .btn.ghost { background:transparent; color:var(--accent); border:1px solid var(--accent); }
  .row { display:flex; gap:.6rem; flex-wrap:wrap; }
</style>
</head>
<body>
<main>
  <div class="notice">この画面は仮のものです。本番の画面ができるまでの間、最低限の情報だけ表示しています。</div>
  <h1>プロフィール</h1>

  <section class="box">
    <div class="status" id="profile-status">確認中…</div>
    <div id="profile-body" hidden>
      <p><b id="profile-email"></b><br><span class="muted" id="profile-role"></span></p>
      <div id="profile-artisan" hidden>
        <h2>登録したカード</h2>
        <p class="muted" id="artisan-count"></p>
        <ul class="plain" id="artisan-list"></ul>
      </div>
      <div id="profile-user" hidden>
        <h2>お気に入り</h2>
        <p class="muted" id="user-liked-count"></p>
        <a class="btn ghost" href="/html/favorites.html">お気に入り一覧を見る</a>
      </div>
      <div class="row">
        <button id="logout-btn" class="ghost" type="button">ログアウト</button>
        <a class="btn ghost" href="/html/home.html">ホームへ戻る</a>
      </div>
    </div>
    <div id="profile-guest" hidden>
      <p>ログインしていません。</p>
      <a class="btn" href="/html/login.html">ログイン画面へ</a>
    </div>
  </section>
</main>
<script>
(async () => {
  const statusEl = document.getElementById("profile-status");
  const bodyEl = document.getElementById("profile-body");
  const guestEl = document.getElementById("profile-guest");

  const ROLE_LABEL = { artisan: "職人", user: "一般利用者" };

  async function api(path, opts) {
    const res = await fetch(path, { credentials: "include", ...opts });
    let data = null;
    try { data = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, data };
  }

  const me = await api("/api/auth/me");
  statusEl.hidden = true;

  if (!me.ok) {
    guestEl.hidden = false;
    return;
  }

  bodyEl.hidden = false;
  const user = me.data.user;
  document.getElementById("profile-email").textContent = user.email;
  document.getElementById("profile-role").textContent = ROLE_LABEL[user.role] || user.role;

  if (user.role === "artisan") {
    const el = document.getElementById("profile-artisan");
    el.hidden = false;
    const mine = await api("/api/introduce/artisan/mine");
    if (mine.ok) {
      const items = mine.data.items || [];
      document.getElementById("artisan-count").textContent = items.length + " 件";
      document.getElementById("artisan-list").innerHTML = items
        .map((c) => "<li>" + (c.name || "") + "</li>")
        .join("") || '<li class="muted">まだカードがありません</li>';
    } else {
      document.getElementById("artisan-count").textContent = "取得に失敗しました";
    }
  }

  if (user.role === "user") {
    const el = document.getElementById("profile-user");
    el.hidden = false;
    const liked = await api("/api/introduce/user/liked");
    if (liked.ok) {
      document.getElementById("user-liked-count").textContent = (liked.data.total ?? (liked.data.items || []).length) + " 件";
    } else {
      document.getElementById("user-liked-count").textContent = "取得に失敗しました";
    }
  }

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("craftsMatchingIsLoggedIn");
    location.href = "/html/home.html";
  });
})();
</script>
</body>
</html>`;
}
