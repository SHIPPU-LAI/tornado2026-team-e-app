// /dev/login の動作確認用画面。
//
// 【重要】これは成果物ではない。features/search/ui.js と同じ位置づけの
// 動作確認用で、見た目には凝らない。本番のログイン画面はフロントエンド担当が作る。
// /login, /register はフロントのために空けてあるので占有しない。
//
// ログインとカード作成（/dev/introduce）は別画面にする。フロントが確定させた
// 18画面でも「ログイン」と「サインアップ」は独立した画面のため、
// この動作確認用画面も同じ構成に揃える。

export function renderPage() {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ログイン 動作確認</title>
<style>
  :root { --bg:#faf9f7; --fg:#1c1a17; --muted:#6b6256; --line:#e0dbd2; --card:#fff; --accent:#8c4a2f; }
  * { box-sizing:border-box; }
  body { margin:0; padding:1.5rem 1rem 4rem; background:var(--bg); color:var(--fg);
    font-family:system-ui,-apple-system,"Hiragino Sans","Yu Gothic",sans-serif; line-height:1.6; }
  main { max-width:480px; margin:0 auto; }
  h1 { font-size:1.3rem; margin:0 0 .2rem; }
  h2 { font-size:1rem; margin:1.6rem 0 .5rem; border-top:1px solid var(--line); padding-top:1.2rem; }
  .sub { color:var(--muted); font-size:.85rem; margin:0 0 1rem; }
  section.box { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:1rem; margin-bottom:1rem; }
  label { display:block; font-size:.82rem; color:var(--muted); margin:.6rem 0 .2rem; }
  label:first-child { margin-top:0; }
  input[type=text], input[type=email], input[type=password], select {
    width:100%; padding:.55rem .7rem; font-size:.92rem; font-family:inherit;
    border:1px solid var(--line); border-radius:7px; background:var(--bg); color:inherit; }
  button { padding:.5rem 1rem; font-size:.88rem; font-family:inherit; border:0;
    border-radius:7px; background:var(--accent); color:#fff; cursor:pointer; margin-top:.6rem; }
  button.ghost { background:transparent; color:var(--muted); border:1px solid var(--line); }
  .row { display:flex; gap:.5rem; }
  .row > * { flex:1; }
  .status { font-size:.83rem; margin-top:.5rem; min-height:1.3em; }
  .status.err { color:#b3261e; }
  .status.ok { color:#3d6b33; }
  .muted { color:var(--muted); font-size:.82rem; }
  .session { background:#fff; border:1px solid var(--line); border-radius:8px; padding:.6rem .8rem; margin-bottom:1rem; font-size:.85rem; }
  a { color:var(--accent); }
</style>
</head>
<body>
<main>
  <h1>ログイン 動作確認</h1>
  <p class="sub">これは成果物ではありません。signup / login / logout の動作を確かめるためだけの画面です。</p>

  <div class="session" id="session-info">確認中…</div>

  <section class="box">
    <h2 style="margin-top:0;border-top:0;padding-top:0">新規登録</h2>
    <label>email</label>
    <input type="email" id="su-email" autocomplete="username">
    <label>password</label>
    <input type="password" id="su-password" autocomplete="new-password">
    <p class="muted">12文字以上にしてください。大文字や記号は不要です。</p>
    <label>役割</label>
    <select id="su-role">
      <option value="artisan">職人</option>
      <option value="user">一般</option>
    </select>
    <label>表示名（任意）</label>
    <input type="text" id="su-display-name">
    <button id="signup">新規登録</button>
    <div class="status" id="signup-status"></div>
  </section>

  <section class="box">
    <h2 style="margin-top:0;border-top:0;padding-top:0">ログイン</h2>
    <label>email</label>
    <input type="email" id="li-email" autocomplete="username">
    <label>password</label>
    <input type="password" id="li-password" autocomplete="current-password">
    <button id="login">ログイン</button>
    <div class="status" id="login-status"></div>
  </section>

  <section class="box">
    <h2 style="margin-top:0;border-top:0;padding-top:0">ログアウト</h2>
    <button id="logout" class="ghost">ログアウト</button>
    <div class="status" id="logout-status"></div>
  </section>

  <p class="muted">カード作成・編集は <a href="/dev/introduce">/dev/introduce</a> から（職人アカウントが必要です）。</p>
</main>

<script>
const $ = (id) => document.getElementById(id);

function setStatus(id, msg, kind) {
  const el = $(id);
  el.className = "status" + (kind ? " " + kind : "");
  el.textContent = msg || "";
}

async function api(path, opts) {
  const res = await fetch(path, { credentials: "same-origin", ...opts });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error((data && data.error && data.error.message) || (path + " に失敗しました"));
  return data;
}

async function refreshSession() {
  try {
    const data = await api("/api/auth/me");
    $("session-info").textContent =
      "ログイン中: " + data.user.email + "（role: " + data.user.role + "）";
  } catch {
    $("session-info").textContent = "未ログイン";
  }
}

async function doSignup() {
  setStatus("signup-status", "登録しています…");
  try {
    await api("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: $("su-email").value,
        password: $("su-password").value,
        role: $("su-role").value,
        display_name: $("su-display-name").value || undefined,
      }),
    });
    setStatus("signup-status", "登録してログインしました", "ok");
    refreshSession();
  } catch (e) {
    setStatus("signup-status", e.message, "err");
  }
}

async function doLogin() {
  setStatus("login-status", "ログインしています…");
  try {
    await api("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: $("li-email").value, password: $("li-password").value }),
    });
    setStatus("login-status", "ログインしました", "ok");
    refreshSession();
  } catch (e) {
    setStatus("login-status", e.message, "err");
  }
}

async function doLogout() {
  setStatus("logout-status", "ログアウトしています…");
  try {
    await api("/api/auth/logout", { method: "POST" });
    setStatus("logout-status", "ログアウトしました", "ok");
    refreshSession();
  } catch (e) {
    setStatus("logout-status", e.message, "err");
  }
}

$("signup").addEventListener("click", doSignup);
$("login").addEventListener("click", doLogin);
$("logout").addEventListener("click", doLogout);

refreshSession();
</script>
</body>
</html>`;
}
