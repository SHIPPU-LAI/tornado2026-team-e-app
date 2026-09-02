// Workers AI による埋め込み生成とベクトル類似度。
//
// 外部APIは使わない。Cloudflare のエッジで動く。
// 無料・有料プランとも 1日 10,000 Neurons まで無料枠がある。

export const EMBED_MODEL = "@cf/baai/bge-m3";

// Workers AI のレスポンス形は将来変わる可能性があるので、
// よくある形をまとめて吸収する。
function normalize(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.response)) return res.response;
  if (Array.isArray(res.embeddings)) return res.embeddings;
  if (res.result) return normalize(res.result);
  throw new Error(
    "埋め込みの応答形が想定外です: " + JSON.stringify(res).slice(0, 200),
  );
}

/**
 * @param {*} ai   c.env.AI
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export async function embed(ai, texts) {
  if (!ai) throw new Error("AI バインディングがありません（wrangler.jsonc を確認）");
  const list = Array.isArray(texts) ? texts : [texts];
  if (list.length === 0) return [];

  const res = await ai.run(EMBED_MODEL, { text: list });
  const vectors = normalize(res);

  if (vectors.length !== list.length) {
    throw new Error(
      `埋め込みの件数が合いません（要求 ${list.length} / 返却 ${vectors.length}）`,
    );
  }
  return vectors;
}

// カード1件を埋め込み用の文字列にする。
// 検索でヒットさせたい情報を全部入れる。
export function cardToText(card) {
  return [
    card.name,
    card.name_kana,
    card.artisan_name,
    `${card.block || ""} ${card.region || ""}`,
    (card.tags || []).join(" "),
    card.description,
    card.history,
  ]
    .filter(Boolean)
    .join(" / ");
}

export function cosine(a, b) {
  let dot = 0,
    na = 0,
    nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
