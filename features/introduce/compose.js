// 5問の答え（+ 掘り下げ）から、日本語3文＋英訳3文を組み立てる（設計書3章）。
//
// Gemini が落ちても、または GEMINI_API_KEY が無くても、カードは作れる。
// その場合は答えをそのまま連結して description に入れ、ai:false を返す（設計書3-4）。

import { QUESTIONS, buildComposePrompt } from "./prompt.js";

const GEMINI_MODEL = "gemini-2.5-flash";
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

function fallbackFollowupQuestion(index) {
  return `${QUESTIONS[index]}（もう少しだけ詳しく教えてください）`;
}

function fallbackDescription(merged) {
  const joined = merged.filter((a) => !isEmpty(a)).join("。");
  return joined ? `${joined}。` : "";
}

async function callGemini(apiKey, prompt) {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API が ${res.status} を返しました`);

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Geminiの応答にテキストがありません");

  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.ja) || !Array.isArray(parsed.en)) {
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

  // 掘り下げは1周だけ。followups が空のリクエストでだけ空欄チェックする。
  // followups 付きの再送には必ず3文（またはフォールバック文）を返す（設計書3-4）。
  if (!followups || followups.length === 0) {
    const emptyIndex = firstEmptyIndex(merged);
    if (emptyIndex !== -1) {
      return {
        ja: null,
        en: null,
        ai: true,
        followup: { index: emptyIndex, question: fallbackFollowupQuestion(emptyIndex) },
      };
    }
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ja: [fallbackDescription(merged)], en: [], ai: false, followup: null };
  }

  try {
    const prompt = buildComposePrompt(name, merged);
    const { ja, en } = await callGemini(apiKey, prompt);
    return { ja: ja.slice(0, 3), en: en.slice(0, 3), ai: true, followup: null };
  } catch (e) {
    console.error("[introduce] compose: Gemini呼び出しに失敗", e);
    return { ja: [fallbackDescription(merged)], en: [], ai: false, followup: null };
  }
}
