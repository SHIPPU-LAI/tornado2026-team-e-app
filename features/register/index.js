// ユーザー登録機能 ── まだ持ち込まれていないスタブ
//
// 【未確認】現在の進捗・実装場所・所有するテーブルは把握できていない。
// 分かり次第 README.md に追記する。想像で埋めないこと。
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
          "登録機能はまだ統合されていません。features/register/README.md を参照してください",
      },
    },
    501,
  );

app.all("/api/register/*", notImplemented);
app.get("/register", notImplemented);

export default app;
