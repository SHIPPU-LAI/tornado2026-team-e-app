// 紹介機能 ── まだ持ち込まれていないスタブ
//
// 実装は別リポジトリにある（紹介機能の担当者が管理）。
// 持ち込み方は README.md を参照。
//
// このファイルは「枠がここにある」ことを示すためだけのもの。
// 動くふりはせず、未実装であることを明示して 501 を返す。

import { Hono } from "hono";

const app = new Hono();

const notImplemented = (c) =>
  c.json(
    {
      error: {
        code: "NOT_IMPLEMENTED",
        message:
          "紹介機能はまだ統合されていません。features/introduce/README.md を参照してください",
      },
    },
    501,
  );

// 仕様書に記載のあるパス。中身が入るまでは全部 501。
app.all("/api/introduce/*", notImplemented);

app.get("/user", notImplemented);
app.get("/user/tradition/:name", notImplemented);
app.get("/user/card/:id", notImplemented);
app.get("/artisan", notImplemented);

export default app;
