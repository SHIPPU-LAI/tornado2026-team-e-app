// 英訳が無いカードをまとめて翻訳する（POST /api/introduce/translate-missing）。
//
// compose.js とは別の作業。compose は「答えから文章を作る」が、
// ここは「既にある日本語の文章をそのまま英訳する」だけ。翻訳の捏造を
// 避けるため、禁止事項をプロンプトに明示する。

import { GEMINI_MODEL } from "./compose.js";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TRANSLATE_TIMEOUT_MS = 15000;

function buildTranslatePrompt(name, description) {
  return `あなたは日本語から英語への翻訳者です。
以下は伝統工芸・伝統芸能のカードの、確定済みの日本語です。これを英訳してください。

name: ${name}
description: ${description}

厳守事項:
- 翻訳だけをする。日本語に書かれていないことを英語で足さない
- 意訳して情報を増やさない、減らさない
- description が3文なら、英訳も3文のまま（文を増減させない）
- 誇張しない、大げさな宣伝文にしない

出力は次のJSON形式のみ。説明や前置きは書かない。
{"name": "...", "description": "..."}`;
}

async function callGeminiTranslate(apiKey, name, description) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TRANSLATE_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildTranslatePrompt(name, description) }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: ctl.signal,
    });
  } finally {
    clearTimeout(t);
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Gemini API が ${res.status} を返しました: ${bodyText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Geminiの応答にテキストがありません");

  const parsed = JSON.parse(text);
  if (typeof parsed.name !== "string" || typeof parsed.description !== "string") {
    throw new Error("Geminiの応答形式が想定外です");
  }
  return parsed;
}

export async function translateCard(apiKey, card) {
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません");
  return callGeminiTranslate(apiKey, card.name, card.description);
}
