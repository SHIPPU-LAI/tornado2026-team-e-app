// ログイン機能。
//
// この feature が持つパス:
//   POST /api/auth/signup
//   POST /api/auth/login
//   POST /api/auth/logout
//   GET  /api/auth/me        ← requireAuth
//
// この feature が書き込むテーブル: users, sessions

import { Hono } from "hono";

import { hashPassword, verifyPassword } from "./crypto.js";
import {
  createSession,
  deleteSession,
  userBySessionToken,
  readSessionCookie,
  setSessionCookie,
  clearSessionCookie,
} from "./session.js";

const app = new Hono();

const fail = (c, code, message, status) =>
  c.json({ error: { code, message } }, status);

const db = (c) => c.env.DB;

const ROLES = ["artisan", "user"];

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    display_name: row.display_name ?? null,
    created_at: row.created_at,
  };
}

// 【重要】"*" では登録しない。/api/auth/me だけに限定する（AGENTS.md 2-c）。
async function requireAuth(c, next) {
  const token = readSessionCookie(c);
  const user = await userBySessionToken(db(c), token);
  if (!user) return fail(c, "UNAUTHORIZED", "ログインが必要です", 401);
  c.set("user", user);
  await next();
}

app.post("/api/auth/signup", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = String(body.role || "");
  const displayName = body.display_name ? String(body.display_name) : null;

  if (!email || !password || !ROLES.includes(role)) {
    return fail(
      c,
      "VALIDATION_ERROR",
      "email, password, role(artisan|user) は必須です",
      400,
    );
  }

  const existing = await db(c)
    .prepare("select id from users where email = ?")
    .bind(email)
    .first();
  if (existing) {
    return fail(c, "VALIDATION_ERROR", "このメールアドレスは既に登録されています", 400);
  }

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  const createdAt = Date.now();

  await db(c)
    .prepare(
      `insert into users (id, email, password_hash, password_salt, role, display_name, created_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, email, hash, salt, role, displayName, createdAt)
    .run();

  const { token } = await createSession(db(c), id);
  setSessionCookie(c, token);

  return c.json({
    user: publicUser({ id, email, role, display_name: displayName, created_at: createdAt }),
  });
});

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return fail(c, "VALIDATION_ERROR", "email, password は必須です", 400);
  }

  const row = await db(c)
    .prepare(
      "select id, email, password_hash, password_salt, role, display_name, created_at from users where email = ?",
    )
    .bind(email)
    .first();

  const ok = row && (await verifyPassword(password, row.password_salt, row.password_hash));
  if (!ok) {
    return fail(c, "UNAUTHORIZED", "メールアドレスまたはパスワードが違います", 401);
  }

  const { token } = await createSession(db(c), row.id);
  setSessionCookie(c, token);

  return c.json({ user: publicUser(row) });
});

app.post("/api/auth/logout", async (c) => {
  const token = readSessionCookie(c);
  await deleteSession(db(c), token);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

app.use("/api/auth/me", requireAuth);
app.get("/api/auth/me", (c) => c.json({ user: publicUser(c.get("user")) }));

export default app;
