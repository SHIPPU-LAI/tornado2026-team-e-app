// 5問の答え（+ 掘り下げ）から、日本語3文＋英訳3文を組み立てる（設計書3章、3-4改）。
//
// 判定は2段に分かれる（設計書3-4改）：
//   空欄            → コード側。元の質問をそのまま出し直す（キー無しでも動く）
//   薄いかどうか+文言 → Gemini側。分野の観点はプロンプトのヒントとしてのみ渡し、
//                      本文には一切書かせない
//
// Gemini が落ちても、または GEMINI_API_KEY が無くても、カードは作れる。
// その場合は答えをそのまま連結して description に入れ、ai:false を返す（設計書3-4）。

import { QUESTIONS, buildComposePrompt } from "./prompt.js";

// 設計書3-4は Gemini 2.5 Flash だが、実行時に404
// (「models/gemini-2.5-flash is no longer available to new users」)。
// gemini-flash-latest は6回連続503（高負荷）で実用にならず、
// gemini-flash-lite-latest は安定して成功したためこちらを採用（設計書に反映済み）。
export const GEMINI_MODEL = "gemini-flash-lite-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function isEmpty(answer) {
  return !answer || String(answer).trim().length === 0;
}

// followups で埋まった項目を answers に上書きする。サーバーは状態を持たないので、
// 毎回 answers と followups の全量を受け取って組み立てる（設計書3-4）。
function mergeAnswers(answers, followups) {
  const merged = [...answers];
  for (const f of followups || []) {
    if (typeof f?.index === "number" && !isEmpty(f.answer)) {
      merged[f.index] = f.answer;
    }
  }
  return merged;
}

function firstEmptyIndex(merged) {
  for (let i = 0; i < QUESTIONS.length; i++) {
    if (isEmpty(merged[i])) return i;
  }
  return -1;
}

function fallbackDescription(merged) {
  const joined = merged.filter((a) => !isEmpty(a)).join("。");
  return joined ? `${joined}。` : "";
}

// Gemini は数秒〜十秒程度かかることがあるため、外部中継（address.js）より長めに取る。
// それでも上限を付けないと、応答が返らないまま職人を待たせ続けることになる。
const GEMINI_TIMEOUT_MS = 15000;

async function callGemini(apiKey, prompt) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), GEMINI_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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
  const hasSentences = Array.isArray(parsed.ja) && Array.isArray(parsed.en);
  const hasFollowup =
    parsed.followup && typeof parsed.followup.index === "number" && parsed.followup.question;
  if (!hasSentences && !hasFollowup) {
    throw new Error("Geminiの応答形式が想定外です");
  }
  return parsed;
}

/**
 * @param {*} env  c.env（GEMINI_API_KEY を読む）
 * @param {{name: string, answers: string[], followups: Array<{index:number, question:string, answer:string}>}} input
 */
export async function composeCard(env, { name, answers, followups }) {
  const merged = mergeAnswers(answers, followups);
  const hasFollowupRound = Array.isArray(followups) && followups.length > 0;

  // 空欄はコード側で先に弾く。元の質問をそのまま出し直すだけなので、
  // GEMINI_API_KEY が無くても動く。掘り下げは1周だけなので、
  // followups 付きの再送ではこのチェックをしない（設計書3-4）。
  if (!hasFollowupRound) {
    const emptyIndex = firstEmptyIndex(merged);
    if (emptyIndex !== -1) {
      return {
        ja: null,
        en: null,
        ai: false,
        followup: { index: emptyIndex, question: QUESTIONS[emptyIndex] },
      };
    }
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    // 「薄いかどうか」の判定はGemini側の役割。キーが無ければ判定できないので、
    // そのまま連結してカードを作れることを優先する（設計書3-4：AIが落ちてもカードは作れる）。
    return { ja: [fallbackDescription(merged)], en: [], ai: false, followup: null };
  }

  try {
    const allowFollowup = !hasFollowupRound;
    const prompt = buildComposePrompt(name, merged, { allowFollowup });
    const result = await callGemini(apiKey, prompt);

    if (allowFollowup && result.followup) {
      return { ja: null, en: null, ai: true, followup: result.followup };
    }
    if (!Array.isArray(result.ja) || !Array.isArray(result.en)) {
      throw new Error("Geminiが文章を返しませんでした（followupの1周を使い切った状態）");
    }
    return { ja: result.ja.slice(0, 3), en: result.en.slice(0, 3), ai: true, followup: null };
  } catch (e) {
    console.error("[introduce] compose: Gemini呼び出しに失敗", e);
    return { ja: [fallbackDescription(merged)], en: [], ai: false, followup: null };
  }
}
