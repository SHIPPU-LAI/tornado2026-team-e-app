// セッション（Cookie発行・検証・失効）。
//
// JWT を使わない理由（設計書4-2）：失効させられない。DBに置けば
// delete from sessions で全部切れる。デモ中に困らないようにするため。

import { getCookie, setCookie, deleteCookie } from "hono/cookie";

export const SESSION_COOKIE = "sid";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7日（設計書 Max-Age=604800 と一致）

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(db, userId) {
  const token = randomToken();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await db
    .prepare("insert into sessions (token, user_id, expires_at) values (?, ?, ?)")
    .bind(token, userId, expiresAt)
    .run();
  return { token, expiresAt };
}

export async function deleteSession(db, token) {
  if (!token) return;
  await db.prepare("delete from sessions where token = ?").bind(token).run();
}

// トークンから有効なユーザーを引く。期限切れは無効扱い（掃除はしない。読むだけ）。
export async function userBySessionToken(db, token) {
  if (!token) return null;
  const row = await db
    .prepare(
      `select u.id, u.email, u.role, u.display_name, u.created_at
       from sessions s join users u on u.id = s.user_id
       where s.token = ? and s.expires_at > ?`,
    )
    .bind(token, Date.now())
    .first();
  return row || null;
}

export function readSessionCookie(c) {
  return getCookie(c, SESSION_COOKIE);
}

// 設計書4-2のとおり：HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
export function setSessionCookie(c, token) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie(c) {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}
