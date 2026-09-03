// /dev/introduce の動作確認用画面。
//
// 【重要】これは成果物ではない。features/search/ui.js と同じ位置づけの
// 動作確認用で、見た目には凝らない。本番の登録画面はフロントエンド担当が作る。
// /artisan, /user はフロントのために空けてあるので占有しない。

export function renderPage(questions) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>紹介機能 動作確認</title>
<style>
  :root { --bg:#faf9f7; --fg:#1c1a17; --muted:#6b6256; --line:#e0dbd2; --card:#fff; --accent:#8c4a2f; }
  * { box-sizing:border-box; }
  body { margin:0; padding:1.5rem 1rem 4rem; background:var(--bg); color:var(--fg);
    font-family:system-ui,-apple-system,"Hiragino Sans","Yu Gothic",sans-serif; line-height:1.6; }
  main { max-width:720px; margin:0 auto; }
  h1 { font-size:1.3rem; margin:0 0 .2rem; }
  h2 { font-size:1rem; margin:1.6rem 0 .5rem; border-top:1px solid var(--line); padding-top:1.2rem; }
  .sub { color:var(--muted); font-size:.85rem; margin:0 0 1rem; }
  section.box { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:1rem; }
  label { display:block; font-size:.82rem; color:var(--muted); margin:.6rem 0 .2rem; }
  label:first-child { margin-top:0; }
  input[type=text], input[type=email], input[type=password], input[type=number], textarea {
    width:100%; padding:.55rem .7rem; font-size:.92rem; font-family:inherit;
    border:1px solid var(--line); border-radius:7px; background:var(--bg); color:inherit; }
  textarea { min-height:4.2em; resize:vertical; }
  button { padding:.5rem 1rem; font-size:.88rem; font-family:inherit; border:0;
    border-radius:7px; background:var(--accent); color:#fff; cursor:pointer; margin-top:.6rem; }
  button.ghost { background:transparent; color:var(--muted); border:1px solid var(--line); }
  button:disabled { opacity:.5; cursor:default; }
  .row { display:flex; gap:.5rem; align-items:flex-end; }
  .row > * { flex:1; }
  .status { font-size:.83rem; margin-top:.5rem; min-height:1.3em; }
  .status.err { color:#b3261e; }
  .status.ok { color:#3d6b33; }
  .muted { color:var(--muted); font-size:.82rem; }
  ul.plain { list-style:none; padding:0; margin:.3rem 0; }
  ul.plain li { font-size:.85rem; padding:.2rem 0; }
  code { background:var(--accent-soft,#f4ece7); padding:.05rem .35rem; border-radius:4px; }
  .followup { background:#fff8ec; border:1px solid #e6d3a3; border-radius:8px; padding:.7rem; margin-top:.7rem; }
  [hidden] { display:none !important; }
</style>
</head>
<body>
<main>
  <h1>紹介機能 動作確認</h1>
  <p class="sub">これは成果物ではありません。compose（5問→AI→3文）の流れを画面で確かめるためだけの画面です。</p>

  <section class="box" id="login-box">
    <h2 style="margin-top:0;border-top:0;padding-top:0">1. ログイン（職人アカウント）</h2>
    <label>email</label>
    <input type="email" id="email" autocomplete="username">
    <label>password</label>
    <input type="password" id="password" autocomplete="current-password">
    <div class="row">
      <button id="login">ログイン</button>
      <button id="signup" class="ghost">新規登録も試す</button>
    </div>
    <div class="status" id="login-status"></div>
  </section>

  <section class="box" id="mine-box" hidden>
    <h2 style="margin-top:0;border-top:0;padding-top:0">自分のカード</h2>
    <ul class="plain" id="mine-list"></ul>
    <div class="status" id="mine-status"></div>
  </section>

  <section class="box" id="compose-box" hidden>
    <h2 id="compose-heading" style="margin-top:0;border-top:0;padding-top:0">2. カードの中身をAIに作らせる</h2>
    <label>伝統名</label>
    <input type="text" id="name" placeholder="例：輪島塗">
    <label>職人名</label>
    <input type="text" id="artisan_name" placeholder="例：輪島塗会館">
    <p class="muted">架空のデータなら先頭に「（架空）」を付けてください。画面に架空と表示されます。</p>
    <label>ふりがな（任意）</label>
    <input type="text" id="name_kana" placeholder="例：わじまぬり">
    <label>タグ（カンマ区切り。サーバー側で5個に切られます）</label>
    <input type="text" id="tags" placeholder="例：漆器,食器,見学できる">
    <label>HP URL（任意）</label>
    <input type="text" id="hp_url" placeholder="https://...">
    <div id="questions"></div>
    <div class="followup" id="followup-box" hidden>
      <div id="followup-question"></div>
      <label>答え</label>
      <input type="text" id="followup-answer">
    </div>
    <button id="compose">AIに文章を作らせる</button>
    <div class="status" id="compose-status"></div>

    <div id="result-box" hidden>
      <label>日本語（編集できます。1行1文）</label>
      <textarea id="ja"></textarea>
      <label>英訳（編集できます。1行1文）</label>
      <textarea id="en"></textarea>
      <p class="muted" id="ai-flag"></p>
    </div>
  </section>

  <section class="box" id="images-box" hidden>
    <h2 style="margin-top:0;border-top:0;padding-top:0">3. 画像（最大3枚）</h2>
    <input type="file" id="image-file" accept="image/*">
    <button id="upload-image" class="ghost">アップロード</button>
    <div class="status" id="image-status"></div>
    <ul class="plain" id="image-list"></ul>
  </section>

  <section class="box" id="address-box" hidden>
    <h2 style="margin-top:0;border-top:0;padding-top:0">4. 住所</h2>
    <div class="row">
      <div>
        <label>郵便番号</label>
        <input type="text" id="postal-code" placeholder="9280001">
      </div>
      <button id="postal-go" class="ghost">郵便番号で調べる</button>
    </div>
    <div class="row">
      <div>
        <label>屋号・住所（Nominatim検索）</label>
        <input type="text" id="geocode-q" placeholder="輪島塗会館">
      </div>
      <button id="geocode-go" class="ghost">検索</button>
    </div>
    <div class="status" id="address-status"></div>
    <ul class="plain" id="geocode-list"></ul>
    <label>都道府県</label>
    <input type="text" id="region">
    <label>住所</label>
    <input type="text" id="address">
    <div class="row">
      <div><label>lat</label><input type="number" step="any" id="lat"></div>
      <div><label>lng</label><input type="number" step="any" id="lng"></div>
    </div>
  </section>

  <section class="box" id="register-box" hidden>
    <h2 style="margin-top:0;border-top:0;padding-top:0">5. 登録する</h2>
    <button id="register">登録する</button>
    <button id="cancel-edit" class="ghost" hidden style="margin-left:.5rem">修正をやめる</button>
    <div class="status" id="register-status"></div>
    <div id="register-result" hidden>
      <p>作成したカードID: <code id="created-id"></code></p>
      <p><a id="search-link" href="#" target="_blank">このカードを検索で探す</a></p>
    </div>
  </section>
</main>

<script>
const QUESTIONS = ${JSON.stringify(questions)};
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (m) =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[m]));

let followups = [];
let imageKeys = [];
let loggedIn = false;
let editingId = null;
let mineCards = [];

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

function renderQuestions() {
  $("questions").innerHTML = QUESTIONS.map((q, i) =>
    '<label>Q' + (i + 1) + '. ' + esc(q) + '</label>' +
    '<input type="text" data-qidx="' + i + '" class="answer">'
  ).join("");
}

function showLoggedInUI() {
  loggedIn = true;
  $("mine-box").hidden = false;
  $("compose-box").hidden = false;
  $("images-box").hidden = false;
  $("address-box").hidden = false;
  $("register-box").hidden = false;
  loadMine();
}

async function doLogin() {
  setStatus("login-status", "ログイン中…");
  try {
    await api("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: $("email").value, password: $("password").value }),
    });
    setStatus("login-status", "ログインしました", "ok");
    showLoggedInUI();
  } catch (e) {
    setStatus("login-status", e.message, "err");
  }
}

async function doSignup() {
  setStatus("login-status", "新規登録中…（12文字以上のパスワードにしてください）");
  try {
    await api("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: $("email").value, password: $("password").value,
        role: "artisan", display_name: "確認用工房",
      }),
    });
    setStatus("login-status", "登録してログインしました", "ok");
    showLoggedInUI();
  } catch (e) {
    setStatus("login-status", e.message, "err");
  }
}

// --- 自分のカード一覧・編集 -----------------------------------------

function fmtDate(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return p(d.getMonth() + 1) + "/" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

async function loadMine() {
  try {
    const data = await api("/api/introduce/artisan/mine");
    mineCards = data.items || [];
    $("mine-list").innerHTML = mineCards.length
      ? mineCards.map((c) =>
          "<li>" + esc(c.name) +
          ' <span class="muted">更新 ' + fmtDate(c.updated_at) + "</span> " +
          '<button type="button" class="ghost edit-btn" data-id="' + esc(c.id) + '">修正</button> ' +
          '<button type="button" class="ghost delete-btn" data-id="' + esc(c.id) + '">削除</button></li>'
        ).join("")
      : '<li class="muted">まだカードがありません</li>';
    setStatus("mine-status", "");
  } catch (e) {
    setStatus("mine-status", e.message, "err");
  }
}

function resetForm() {
  editingId = null;
  $("name").value = "";
  $("artisan_name").value = "";
  $("name_kana").value = "";
  $("tags").value = "";
  $("hp_url").value = "";
  $("region").value = "";
  $("address").value = "";
  $("lat").value = "";
  $("lng").value = "";
  $("ja").value = "";
  $("en").value = "";
  $("result-box").hidden = true;
  document.querySelectorAll(".answer").forEach((el) => (el.value = ""));
  followups = [];
  $("followup-box").hidden = true;
  imageKeys = [];
  $("image-list").innerHTML = "";
  $("register-result").hidden = true;
  $("compose-heading").textContent = "2. カードの中身をAIに作らせる";
  $("register").textContent = "登録する";
  $("cancel-edit").hidden = true;
}

async function startEdit(id) {
  setStatus("mine-status", "読み込み中…");
  try {
    const data = await api("/api/introduce/artisan/" + encodeURIComponent(id));
    const c = data.card;
    resetForm();
    editingId = id;
    $("name").value = c.name || "";
    $("artisan_name").value = c.artisan_name || "";
    $("name_kana").value = c.name_kana || "";
    $("tags").value = (c.tags || []).join(",");
    $("hp_url").value = c.hp_url || "";
    $("region").value = c.region || "";
    $("address").value = c.address || "";
    $("ja").value = c.description || "";
    $("result-box").hidden = false;
    // 編集時は5問・composeを必須にしない。既存の説明文を直接直して更新するだけでよい。
    $("ai-flag").textContent = "既存の説明文を読み込みました。このまま直して更新できます（AIに作り直させることもできます）。";
    $("compose-heading").textContent = "伝統を修正する";
    $("register").textContent = "更新する";
    $("cancel-edit").hidden = false;
    setStatus("mine-status", "");
  } catch (e) {
    setStatus("mine-status", e.message, "err");
  }
}

async function doDelete(id) {
  if (!confirm("本当に削除しますか？")) return;
  try {
    await api("/api/introduce/artisan/" + encodeURIComponent(id), { method: "DELETE" });
    if (editingId === id) resetForm();
    await loadMine();
  } catch (e) {
    setStatus("mine-status", e.message, "err");
  }
}

function currentAnswers() {
  return Array.from(document.querySelectorAll(".answer")).map((el) => el.value);
}

async function doCompose() {
  setStatus("compose-status", "AIに聞いています…");
  $("followup-box").hidden = true;
  $("result-box").hidden = true;
  try {
    const data = await api("/api/introduce/artisan/compose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: $("name").value, answers: currentAnswers(), followups }),
    });

    if (data.followup) {
      // 掘り下げは1周だけ。この質問に答えてもう一度ボタンを押すと必ず3文が返る。
      $("followup-question").textContent = "掘り下げの質問: " + data.followup.question;
      $("followup-box").hidden = false;
      $("followup-box").dataset.index = data.followup.index;
      setStatus("compose-status", "答えを入力してもう一度「AIに文章を作らせる」を押してください");
      return;
    }

    $("ja").value = (data.ja || []).join("\\n");
    $("en").value = (data.en || []).join("\\n");
    $("ai-flag").textContent = data.ai
      ? "AIが作成しました（ai:true）"
      : "AIが使えなかったため、答えをそのまま連結しました（ai:false）。このまま登録できます。";
    $("result-box").hidden = false;
    setStatus("compose-status", "");
  } catch (e) {
    setStatus("compose-status", e.message, "err");
  }
}

function collectFollowupIfAny() {
  const box = $("followup-box");
  if (box.hidden) return;
  followups.push({
    index: Number(box.dataset.index),
    question: $("followup-question").textContent,
    answer: $("followup-answer").value,
  });
}

async function doUploadImage() {
  const file = $("image-file").files[0];
  if (!file) { setStatus("image-status", "ファイルを選んでください", "err"); return; }
  if (imageKeys.length >= 3) { setStatus("image-status", "3枚まで（設計書6章）", "err"); return; }
  setStatus("image-status", "アップロード中…");
  try {
    const body = new FormData();
    body.append("file", file);
    const data = await api("/api/introduce/artisan/upload-image", { method: "POST", body });
    imageKeys.push(data.key);
    $("image-list").innerHTML = imageKeys.map((k) =>
      '<li><code>' + esc(k) + '</code> <a href="/api/introduce/image/' + esc(k) + '" target="_blank">開く</a></li>'
    ).join("");
    setStatus("image-status", imageKeys.length + " / 3 枚", "ok");
    $("image-file").value = "";
  } catch (e) {
    setStatus("image-status", e.message, "err");
  }
}

async function doPostal() {
  setStatus("address-status", "郵便番号を調べています…");
  try {
    const data = await api("/api/introduce/artisan/postal?code=" + encodeURIComponent($("postal-code").value));
    const r = (data.results || [])[0];
    if (r) {
      $("region").value = r.address1 || "";
      $("address").value = (r.address1 || "") + (r.address2 || "") + (r.address3 || "");
    }
    setStatus("address-status", r ? "見つかりました" : "見つかりませんでした");
  } catch (e) {
    setStatus("address-status", e.message, "err");
  }
}

async function doGeocode() {
  setStatus("address-status", "検索しています…");
  try {
    const data = await api("/api/introduce/artisan/geocode?q=" + encodeURIComponent($("geocode-q").value));
    const items = data.items || [];
    $("geocode-list").innerHTML = items.map((it, i) =>
      '<li><button type="button" class="ghost pick" data-i="' + i + '">' +
        esc(it.display_name) + " (" + it.lat + ", " + it.lon + ")</button></li>"
    ).join("");
    $("geocode-list").dataset.items = JSON.stringify(items);
    setStatus("address-status", items.length + " 件");
  } catch (e) {
    setStatus("address-status", e.message, "err");
  }
}

async function doRegister() {
  const isEdit = Boolean(editingId);
  setStatus("register-status", isEdit ? "更新しています…" : "登録しています…");
  try {
    const body = {
      name: $("name").value,
      artisan_name: $("artisan_name").value || undefined,
      name_kana: $("name_kana").value || undefined,
      hp_url: $("hp_url").value || undefined,
      tags: $("tags").value.split(",").map((s) => s.trim()).filter(Boolean),
      region: $("region").value || undefined,
      address: $("address").value || undefined,
    };

    // 編集時、説明文（英訳）を触っていなければ送らない。既存の値を消さないため
    // （PUTはbodyに無いキーには触れない）。
    const ja = $("ja").value.split("\\n").filter(Boolean).join("");
    if (ja || !isEdit) body.description = ja;
    const en = $("en").value.split("\\n").filter(Boolean).join(" ");
    if (en) body.description_en = en;

    const lat = parseFloat($("lat").value), lng = parseFloat($("lng").value);
    if (!isNaN(lat) && !isNaN(lng)) { body.lat = lat; body.lng = lng; body.geo_source = "map_click"; }

    if (!isEdit) body.image_keys = imageKeys;

    const data = isEdit
      ? await api("/api/introduce/artisan/" + encodeURIComponent(editingId), {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        })
      : await api("/api/introduce/artisan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });

    if (isEdit) {
      setStatus("register-status", "更新しました", "ok");
    } else {
      setStatus("register-status", "登録しました", "ok");
      $("created-id").textContent = data.id;
      $("search-link").href = "/dev/search?q=" + encodeURIComponent($("name").value);
      $("register-result").hidden = false;
    }
    await loadMine();
  } catch (e) {
    setStatus("register-status", e.message, "err");
  }
}

function boot() {
  renderQuestions();
  $("login").addEventListener("click", doLogin);
  $("signup").addEventListener("click", doSignup);
  $("compose").addEventListener("click", () => { collectFollowupIfAny(); doCompose(); });
  $("upload-image").addEventListener("click", doUploadImage);
  $("postal-go").addEventListener("click", doPostal);
  $("geocode-go").addEventListener("click", doGeocode);
  $("geocode-list").addEventListener("click", (e) => {
    const btn = e.target.closest(".pick");
    if (!btn) return;
    const items = JSON.parse($("geocode-list").dataset.items || "[]");
    const it = items[Number(btn.dataset.i)];
    if (!it) return;
    $("lat").value = it.lat;
    $("lng").value = it.lon;
  });
  $("register").addEventListener("click", doRegister);
  $("cancel-edit").addEventListener("click", resetForm);
  $("mine-list").addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) { startEdit(editBtn.dataset.id); return; }
    const delBtn = e.target.closest(".delete-btn");
    if (delBtn) doDelete(delBtn.dataset.id);
  });
}

boot();
</script>
</body>
</html>`;
}
