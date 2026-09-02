// 住所検索の外部API中継（設計書7章）。
//
// ブラウザから直接叩くと CORS と Nominatim の利用規約（User-Agent必須）を
// 守れないため、サーバー側で中継する。
//
// 【重要】外部が固まるとこちらのリクエストも固まる。必ずタイムアウトを付ける。
// 落ちても住所が取れないだけで、カード登録自体は続けられるようにすること
// （呼び出し側で握りつぶさず、失敗をそのまま返すこと）。

const NOMINATIM_UA = "teame-app/0.1 (tornado2026 hackathon)";
const TIMEOUT_MS = 3000;

async function fetchWithTimeout(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

// zipcloud はキー不要。7桁の数字のみ受け付ける（呼び出し側でハイフンを除去する）。
export async function fetchPostal(code) {
  const res = await fetchWithTimeout(
    `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${code}`,
  );
  if (!res.ok) throw new Error(`zipcloud が ${res.status} を返しました`);
  return res.json();
}

// Nominatim: 1秒1リクエストまで。User-Agent必須。上位3件。
export async function fetchGeocode(q) {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?format=json&limit=3&accept-language=ja&q=${encodeURIComponent(q)}`;
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": NOMINATIM_UA } });
  if (!res.ok) throw new Error(`nominatim が ${res.status} を返しました`);
  return res.json();
}

// Nominatim逆引き。パラメータ名は lon（lng ではない）。
export async function fetchReverse(lat, lon) {
  const url =
    "https://nominatim.openstreetmap.org/reverse" +
    `?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json`;
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": NOMINATIM_UA } });
  if (!res.ok) throw new Error(`nominatim が ${res.status} を返しました`);
  return res.json();
}
