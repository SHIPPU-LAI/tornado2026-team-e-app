// ログイン機能 ── まだ着手されていないスタブ
//
// 【未確認】担当者が決まっていない。誰が作っているかも把握できていない。
// 「作る予定がある」ことだけが分かっている状態。
//
// パス・所有テーブル・認証方式はすべて未定。想像で埋めないこと。
//
// このファイルは「枠がここにある」ことを示すためだけのもの。

import { Hono } from "hono";

const app = new Hono();

const notImplemented = (c) =>
  c.json(
    {
      error: {
        code: "NOT_IMPLEMENTED",
        message:
          "ログイン機能は未着手です。features/auth/README.md を参照してください",
      },
    },
    501,
  );

// パスは仮。担当が決まったら実態に合わせて変更する。
app.all("/api/auth/*", notImplemented);
app.get("/login", notImplemented);

export default app;
