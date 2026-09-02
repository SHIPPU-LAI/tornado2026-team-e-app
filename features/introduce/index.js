// 紹介機能。
//
// この feature が持つパス（実装済み分のみ。残りは実装計画書のステップ順で足す）:
//   POST /api/introduce/artisan/compose   カード作成の中核（設計書3章）
//
// 未実装の /api/introduce/artisan/*, /api/introduce/user/* は 501 を返す。

import { Hono } from "hono";

import { readSessionCookie, userBySessionToken } from "../auth/session.js";
import { QUESTIONS } from "./prompt.js";
import { composeCard } from "./compose.js";

const app = new Hono();

const fail = (c, code, message, status) =>
  c.json({ error: { code, message } }, status);

// バインディング名は AGENTS.md のとおり teame_taka_introduce。
// DB と同じ database_id を指しているので、features/auth が作ったセッションも読める。
const db = (c) => c.env.teame_taka_introduce;

const notImplemented = (c) =>
  fail(c, "NOT_IMPLEMENTED", "紹介機能はまだこのパスを実装していません", 501);

// 【重要】"*" では登録しない。自分の接頭辞に限定する（AGENTS.md 2-c）。
// 職人側APIは role === 'artisan' も確認する。artisan_id はクエリではなく
// セッションから取る（設計書4-3。仕様書の簡易実装はなりすませてしまう）。
async function requireArtisan(c, next) {
  const token = readSessionCookie(c);
  const user = await userBySessionToken(db(c), token);
  if (!user) return fail(c, "UNAUTHORIZED", "ログインが必要です", 401);
  if (user.role !== "artisan") {
    return fail(c, "UNAUTHORIZED", "職人アカウントでログインしてください", 401);
  }
  c.set("user", user);
  await next();
}

app.use("/api/introduce/artisan/*", requireArtisan);

app.post("/api/introduce/artisan/compose", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const answers = Array.isArray(body.answers)
    ? body.answers.map((a) => String(a ?? ""))
    : [];
  while (answers.length < QUESTIONS.length) answers.push("");

  const followups = Array.isArray(body.followups) ? body.followups : [];

  if (!name) {
    return fail(c, "VALIDATION_ERROR", "name は必須です", 400);
  }

  // artisan_id はここでセッションから取れる状態にしてある。
  // compose 自体はまだ何も保存しないので今は使わない（ステップ4のカード登録で使う）。
  void c.get("user").id;

  const result = await composeCard(c.env, { name, answers, followups });
  return c.json(result);
});

// ここより下は未実装のスタブ。実装計画書のステップに沿って上から実装していく。
app.all("/api/introduce/artisan/*", notImplemented);
app.all("/api/introduce/user/*", notImplemented);

export default app;
