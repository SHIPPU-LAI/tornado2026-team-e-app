export function renderPage() {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>伝統工芸 検索プロトタイプ</title>
<style>
  :root {
    --bg:#faf9f7; --fg:#1c1a17; --muted:#6b6256; --line:#e0dbd2;
    --card:#fff; --accent:#8c4a2f; --accent-soft:#f4ece7;
    --s1:#3d6b33; --s2:#8a6d1f; --s3:#2f5d80;
  }
  * { box-sizing:border-box; }
  body { margin:0; padding:1.5rem 1rem 4rem; background:var(--bg); color:var(--fg);
    font-family:system-ui,-apple-system,"Hiragino Sans","Yu Gothic",sans-serif; line-height:1.7; }
  main { max-width:1150px; margin:0 auto; }
  h1 { font-size:1.35rem; margin:0 0 .2rem; }
  .sub { color:var(--muted); font-size:.88rem; margin:0 0 1rem; }


  .controls { background:var(--card); border:1px solid var(--line); border-radius:12px;
    padding:1rem; margin-bottom:1rem; }
  .row { display:flex; gap:.5rem; margin-bottom:.7rem; }
  input[type=text] { flex:1; padding:.65rem .85rem; font-size:1rem; font-family:inherit;
    border:1px solid var(--line); border-radius:8px; background:var(--bg); color:inherit; }
  input[type=text]:focus { outline:2px solid var(--accent); outline-offset:-1px; }
  button { padding:.65rem 1.1rem; font-size:.95rem; font-family:inherit; border:0;
    border-radius:8px; background:var(--accent); color:#fff; cursor:pointer; white-space:nowrap; }
  button.ghost { background:transparent; color:var(--muted); border:1px solid var(--line); }
  button:disabled { opacity:.5; cursor:default; }

  .filters { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; }
  select { padding:.45rem .6rem; font-size:.88rem; font-family:inherit; color:inherit;
    border:1px solid var(--line); border-radius:7px; background:var(--bg); }
  .tagbox { margin-top:.7rem; }
  .tagbox summary { cursor:pointer; font-size:.83rem; color:var(--muted);
    list-style:none; display:inline-flex; align-items:center; gap:.35rem; }
  .tagbox summary::-webkit-details-marker { display:none; }
  .tagbox summary::before { content:"▸"; font-size:.75rem; }
  .tagbox[open] summary::before { content:"▾"; }
  .mapnote { font-size:.78rem; color:var(--muted); margin-bottom:.35rem; }
  .tags { display:flex; flex-wrap:wrap; gap:.35rem; margin-top:.6rem; }
  .tags button { background:transparent; color:var(--muted); border:1px solid var(--line);
    padding:.22rem .6rem; font-size:.78rem; border-radius:999px; }
  .tags button.on { background:var(--accent); color:#fff; border-color:var(--accent); }

  .examples { display:flex; flex-wrap:wrap; gap:.35rem; margin-bottom:1rem; }
  .examples button { background:transparent; color:var(--muted); border:1px dashed var(--line);
    padding:.25rem .65rem; font-size:.8rem; border-radius:999px; }

  .layout { display:grid; grid-template-columns:1fr 400px; gap:1.2rem; align-items:start; }
  @media (max-width:860px){ .layout{ grid-template-columns:1fr; } #map{ height:280px !important; } }

  .banner { border-radius:9px; padding:.6rem .85rem; font-size:.87rem; margin-bottom:.8rem;
    border:1px solid var(--line); background:var(--card); }
  .banner b { font-weight:600; }
  .pill { display:inline-block; color:#fff; border-radius:5px; padding:.05rem .5rem;
    font-size:.75rem; margin-right:.5rem; }
  .pill.keyword { background:var(--s1); }
  .pill.synonym { background:var(--s2); }
  .pill.vector  { background:var(--s3); }
  .pill.none    { background:var(--muted); }
  .status { font-size:.83rem; color:var(--muted); min-height:1.5em; margin-bottom:.7rem; }
  .status.err { color:#b3261e; }

  .card { background:var(--card); border:1px solid var(--line); border-radius:11px;
    padding:.85rem .95rem; margin-bottom:.65rem; cursor:pointer; }
  .card:hover { border-color:var(--accent); }
  .card .top { display:flex; justify-content:space-between; gap:.5rem; align-items:baseline; }
  .card .name { font-weight:600; }
  .card .cat { font-size:.72rem; color:var(--muted); border:1px solid var(--line);
    border-radius:999px; padding:.05rem .5rem; white-space:nowrap; }
  .card .kana { font-size:.75rem; color:var(--muted); font-weight:400; margin-left:.3rem; }
  .card .meta { font-size:.81rem; color:var(--muted); }
  .card .desc { font-size:.87rem; margin-top:.35rem; }
  .card .score { font-size:.78rem; color:var(--s3); margin-top:.3rem; }
  .card .links { margin-top:.5rem; display:flex; gap:.8rem; font-size:.8rem; }
  .card .links a { color:var(--accent); }
  .badge { font-size:.68rem; padding:.05rem .4rem; border-radius:4px; margin-left:.4rem; }
  .badge.v { background:#e8f0e6; color:var(--s1); }
  .badge.d { background:#f0ece6; color:var(--muted); }
  .empty { color:var(--muted); font-size:.9rem; padding:1rem 0; }
  #map { height:520px; border-radius:11px; border:1px solid var(--line); position:sticky; top:1rem; }
</style>
</head>
<body>
<main>
  <h1>伝統工芸 検索プロトタイプ</h1>

  <div class="controls">
    <div class="row">
      <input type="text" id="q" placeholder="キーワードでも、感覚的な言葉でも" autocomplete="off">
      <button id="go">検索</button>
      <button id="clear" class="ghost">クリア</button>
    </div>
    <div class="filters">
      <select id="block"><option value="">地方：すべて</option></select>
      <select id="prefecture"><option value="">都道府県：すべて</option></select>
      <span style="font-size:.85rem;color:var(--muted)" id="hit"></span>
      <button id="lang-toggle" class="ghost" style="margin-left:auto;font-size:.78rem;padding:.3rem .7rem">English</button>
      <button id="reindex" class="ghost" style="font-size:.78rem;padding:.3rem .7rem">再インデックス</button>
    </div>
    <details class="tagbox">
      <summary>タグで絞り込む <span id="tagcount"></span></summary>
      <div class="tags" id="tags"></div>
    </details>
  </div>

  <div class="examples" id="ex"></div>
  <div id="banner"></div>
  <div class="status" id="status"></div>

  <div class="layout">
    <div id="list"></div>
    <div>
      <div class="mapnote">地図：<b id="mapimpl">読み込み中</b></div>
      <div id="map"></div>
    </div>
  </div>
</main>

<script>
const EXAMPLES = [
  ["漆", "段1で当たる"],
  ["しゃみせん", "段1（ふりがな）"],
  ["涼しげ", "段2（シノニム）"],
  ["おみやげ", "段2（シノニム）"],
  ["竹でできた細長い笛みたいなやつ", "段2（笛→尺八/竹に展開されるので段3まで落ちない）"],
  ["使うほど良くなるもの", "段3（ベクトル）"],
  ["静かな雰囲気のもの", "段3（ベクトル）"],
];

const STAGE_LABEL = {
  keyword: "段1 キーワード一致",
  synonym: "段2 シノニム展開",
  vector:  "段3 ベクトル類似",
  none:    "該当なし",
};

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (m) =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[m]));

// esc() はスキームを見ないので、href に入れる URL は別途これを通す。
// hp_url は職人が自由に入力する値なので javascript: が入りうる。
const safeUrl = (u) => {
  if (!u) return "";
  try {
    const p = new URL(String(u), location.origin).protocol;
    return (p === "http:" || p === "https:") ? String(u) : "";
  } catch { return ""; }
};

let state = { q:"", block:"", prefecture:"", tag:"", lang:"" };
let PREF_BY_BLOCK = {};
let map, markers = [];

// 地方を選ぶと、その地方の都道府県だけに絞る
function fillPrefectures(block) {
  const list = block
    ? (PREF_BY_BLOCK[block] || [])
    : Object.values(PREF_BY_BLOCK).flat().sort();
  $("prefecture").innerHTML =
    '<option value="">都道府県：すべて</option>' +
    list.map((p) => "<option>" + esc(p) + "</option>").join("");
}

// 地図は Leaflet + OpenStreetMap。
//
// 【方針】Google Maps API は使わない。APIキーも課金設定も不要な構成にする。
// タイルは OpenStreetMap から直接読むので、こちらで用意するものは無い。
let infoWin = null;

function loadScript(src) {
  return new Promise((ok, ng) => {
    const el = document.createElement("script");
    el.src = src; el.async = true; el.onload = ok; el.onerror = ng;
    document.head.appendChild(el);
  });
}
function loadCss(href) {
  const el = document.createElement("link");
  el.rel = "stylesheet"; el.href = href;
  document.head.appendChild(el);
}

async function initMap() {
  const el = document.getElementById("map");
  loadCss("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
  await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
  map = L.map(el).setView([36.5, 137.5], 5);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18, attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  $("mapimpl").textContent = "OpenStreetMap";
}

function popupHtml(c) {
  return "<b>" + esc(c.name) + "</b><br>" + esc(c.artisan_name || "") +
    '<br><span style="color:#666">' + esc(c.address || "") + "</span>";
}

function clearMarkers() {
  for (const m of markers) map.removeLayer(m);
  markers = [];
}

function drawMap(cards) {
  if (!map) return;
  clearMarkers();
  const pts = [];

  for (const c of cards) {
    if (typeof c.lat !== "number" || typeof c.lng !== "number") continue;
    pts.push([c.lat, c.lng]);
    const m = L.marker([c.lat, c.lng]).addTo(map);
    m.bindPopup(popupHtml(c));
    markers.push(m);
  }

  if (pts.length === 0) return;
  if (pts.length === 1) map.setView(pts[0], 10);
  else map.fitBounds(pts, { padding: [30, 30] });
}

function focusMap(lat, lng) {
  if (!map) return;
  map.setView([lat, lng], 11);
}

function cardHtml(item) {
  const c = item.card;
  // 外部地図へのリンクも Google を使わず OpenStreetMap に向ける
  const osm = "https://www.openstreetmap.org/search?query=" +
    encodeURIComponent(c.address || c.region || "");
  const badge = c.is_dummy ? '<span class="badge d">ダミー</span>' : "";
  const tags = (c.tags || []).slice(0, 3)
    .map((t) => '<span class="cat">' + esc(t) + "</span>").join(" ");
  return (
    '<div class="card" data-lat="' + (c.lat ?? "") + '" data-lng="' + (c.lng ?? "") + '">' +
      '<div class="top"><span class="name">' + esc(c.name) +
        (c.name_kana ? '<span class="kana">（' + esc(c.name_kana) + "）</span>" : "") +
        badge + "</span>" +
      "<span>" + tags + "</span></div>" +
      '<div class="meta">' + esc(c.artisan_name || "") +
        "（" + esc([c.block, c.region].filter(Boolean).join(" / ")) + "）</div>" +
      '<div class="desc">' + esc(c.description || "") + "</div>" +
      (item.score != null ? '<div class="score">意味の近さ ' + item.score + "</div>" : "") +
      '<div class="links"><a href="' + osm + '" target="_blank" rel="noopener">地図で開く</a>' +
      (safeUrl(c.hp_url)
        ? '<a href="' + esc(safeUrl(c.hp_url)) + '" target="_blank" rel="noopener">公式サイト</a>'
        : "") +
      "</div></div>"
  );
}

function render(data) {
  $("list").innerHTML = data.items.length
    ? data.items.map(cardHtml).join("")
    : '<div class="empty">該当なし</div>';
  $("hit").textContent = data.total + " 件";
  drawMap(data.items.map((i) => i.card));

  let extra = "";
  if (data.stage === "synonym" && data.meta.expanded)
    extra = "「" + esc(data.query) + "」→ タグ " + data.meta.expanded.map(esc).join("・") + " に展開";
  else if (data.stage === "vector")
    extra = "キーワードもシノニムも当たらなかったので、意味の近さで " +
      data.meta.pool + " 件から探しました";
  else if (data.stage === "none" && data.meta.note)
    extra = esc(data.meta.note);
  else if (data.stage === "keyword" && data.query)
    extra = "文字列一致で見つかりました。下の段は動いていません";

  $("banner").innerHTML = data.query
    ? '<span class="pill ' + data.stage + '">' + STAGE_LABEL[data.stage] + "</span>" + extra
    : "";

  const bits = [data.ms + "ms"];
  if (data.meta.embed_ms != null) bits.push("埋め込み " + data.meta.embed_ms + "ms");
  bits.push("外部LLM呼び出し 0 回");
  $("status").className = "status";
  $("status").textContent = data.query ? bits.join(" / ") : "";
}

async function run() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.block) p.set("block", state.block);
  if (state.prefecture) p.set("prefecture", state.prefecture);
  if (state.tag) p.set("tag", state.tag);
  if (state.lang) p.set("lang", state.lang);

  $("go").disabled = true;
  try {
    const res = await fetch("/api/search?" + p.toString());
    const data = await res.json();
    if (!res.ok) throw new Error((data.error && data.error.message) || "検索に失敗しました");
    render(data);
  } catch (e) {
    $("status").className = "status err";
    $("status").textContent = e.message;
  } finally {
    $("go").disabled = false;
  }
}

async function boot() {
  // 地図はCDN依存。落ちても検索は使えるようにする（以前は全機能が死んでいた）
  try {
    await initMap();
  } catch (e) {
    console.error("[map] 読み込みに失敗しました", e);
    $("mapimpl").textContent = "地図を読み込めませんでした（検索は使えます）";
  }

  const f = await (await fetch("/api/search/facets")).json();
  PREF_BY_BLOCK = f.prefectures_by_block || {};
  for (const b of f.blocks)
    $("block").insertAdjacentHTML("beforeend", "<option>" + esc(b) + "</option>");
  fillPrefectures("");
  $("tags").innerHTML = f.tags
    .map((t) => '<button type="button" data-tag="' + esc(t) + '">' + esc(t) + "</button>").join("");
  $("tagcount").textContent = "（" + f.tags.length + "）";

  $("ex").innerHTML = EXAMPLES
    .map(([q, hint]) => '<button type="button" data-q="' + esc(q) + '" title="' + esc(hint) + '">' +
      esc(q) + "</button>").join("");

  let timer;
  $("q").addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = $("q").value; run(); }, 350);
  });
  $("q").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { clearTimeout(timer); state.q = $("q").value; run(); }
  });
  $("go").addEventListener("click", () => { state.q = $("q").value; run(); });
  $("block").addEventListener("change", (e) => {
    state.block = e.target.value;
    state.prefecture = "";
    fillPrefectures(state.block);
    run();
  });
  $("prefecture").addEventListener("change", (e) => { state.prefecture = e.target.value; run(); });
  $("clear").addEventListener("click", () => {
    state = { q:"", block:"", prefecture:"", tag:"" };
    $("q").value = ""; $("block").value = "";
    fillPrefectures("");
    document.querySelectorAll("#tags button").forEach((b) => b.classList.remove("on"));
    run();
  });
  $("tags").addEventListener("click", (e) => {
    const t = e.target.dataset.tag;
    if (!t) return;
    state.tag = state.tag === t ? "" : t;
    document.querySelectorAll("#tags button").forEach((b) =>
      b.classList.toggle("on", b.dataset.tag === state.tag));
    $("tagcount").textContent = state.tag
      ? "（" + state.tag + "）"
      : "（" + document.querySelectorAll("#tags button").length + "）";
    run();
  });
  $("ex").addEventListener("click", (e) => {
    const q = e.target.dataset.q;
    if (!q) return;
    $("q").value = q; state.q = q; run();
  });
  $("list").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card || e.target.tagName === "A") return;
    const lat = parseFloat(card.dataset.lat), lng = parseFloat(card.dataset.lng);
    if (!isNaN(lat) && !isNaN(lng)) focusMap(lat, lng);
  });
  $("lang-toggle").addEventListener("click", () => {
    state.lang = state.lang === "en" ? "" : "en";
    $("lang-toggle").textContent = state.lang === "en" ? "日本語" : "English";
    run();
  });
  $("reindex").addEventListener("click", async () => {
    $("reindex").disabled = true;
    $("status").className = "status";
    $("status").textContent = "埋め込みを生成しています…";
    try {
      const res = await fetch("/api/search/reindex", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error((d.error && d.error.message) || "失敗しました");
      $("status").textContent =
        d.indexed + " 件をインデックスしました（" + d.embedded + "/" + d.total + " 完了）";
    } catch (e) {
      $("status").className = "status err";
      $("status").textContent = e.message;
    } finally {
      $("reindex").disabled = false;
    }
  });

  run();
}

boot().catch((e) => {
  console.error("[boot]", e);
  $("status").className = "status err";
  $("status").textContent = "初期化に失敗しました: " + (e && e.message);
});
</script>
</body>
</html>`;
}
