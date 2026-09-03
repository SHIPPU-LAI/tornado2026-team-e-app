# フロントエンド ── AIへの指示

**まずリポジトリ直下の [AGENTS.md](../AGENTS.md) を読んでください。**

## あなたが触っていい場所

```
frontend/     画面
public/       CSS・画像素材
```

バックエンド（`features/*`）のコードは**読むのは自由ですが変更しないでください。**
APIの形を変えてほしいときは、変更せずに報告してください。

## 画面はここの担当です

| パス | 用途 | 現状 |
|---|---|---|
| `/` | — | **バックエンドが使っています**（`src/index.js` の統合状況ページ）。差し替えるなら要相談 |
| `/search` | 検索結果画面 | **空き（404）** |
| `/user` | マッチング画面 | **空き（404）**。501スタブは削除済み |
| `/login` | ログイン画面 | **空き（404）**。501スタブは削除済み |
| `/artisan` | 職人向け画面 | **空き（404）** |

`/dev/*` は**バックエンドの動作確認用**です。成果物ではないので、
デザインを合わせる必要はありません。参考にする必要もありません。

## 使えるAPI

**検索・紹介・ログインの3つとも動いています。**（2026-09-03 時点）

**仕様は [docs/フロントエンド向けAPI.md](../docs/フロントエンド向けAPI.md) を見てください。**
このファイルには一覧だけ書きます。詳しい形はそちらが正です。

```
検索
GET  /api/search?q=&block=&prefecture=&tag=&name=&lang=
GET  /api/search/cards?block=&prefecture=&tag=&name=
GET  /api/search/facets                      絞り込みの選択肢（地方・都道府県・タグ）

カードを見る側
GET  /api/introduce/user/next                カード1枚          未ログインOK
GET  /api/introduce/user/:id                 カード1件          未ログインOK
POST /api/introduce/user/:id/like            いいねトグル       要ログイン
GET  /api/introduce/user/liked               いいね一覧         要ログイン

カードを作る側（職人）
POST /api/introduce/artisan/compose          5問→AIで3文＋英訳
GET  /api/introduce/artisan/mine             自分のカード
POST /api/introduce/artisan/upload-image
     ほか postal / geocode / reverse（住所）

ログイン
POST /api/auth/signup                        role は artisan / user
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

**セッションはCookieです。**トークンをヘッダに付ける方式ではありません。
`fetch` には `credentials: "include"` が要ります。

エラーの形は全機能共通です。

```json
{ "error": { "code": "UNAUTHORIZED", "message": "ログインが必要です" } }
```

`message` はそのまま画面に出せる日本語です。
他人のカードを取ると 403 ではなく **404** が返ります（存在を隠すため）。

**`501 NOT_IMPLEMENTED` はもう返りません。**以前この文書に「検索以外は501」と
書いてありましたが、それは古い記載です。

## 必ず守ってほしいこと

**`is_dummy: true` のカードには、架空と分かる表示を付けてください。**

動作確認用のダミーデータが本番に入っています（2026-09-03 時点で21件中17件）。
**職人名も架空のものが入っている**ので、表示が無いと実在の人に見えます。
サーバーが必ずこの旗を返すので、画面側で必ず出してください。

`frontend/www/db/schema.sql` に入っているサンプルデータも職人名が架空です。
画面に出す場合は同じ扱いが必要です。

## 決まっているもの

```
フロントの構成   静的HTML＋JS（frontend/www/ に実装済み）
フォント        Zen Kaku Gothic Antique（普通）
                Zen Antique Soft（おしゃれ）
和柄の参考      https://bg-patterns.com/?cat=4&paged=11
```

## 決まっていないもの

**想像で決めないでください。**

| 項目 | 状況 |
|---|---|
| **frontend/www/ をどう配信するか** | **未定**。`wrangler.jsonc` に `assets` の設定が無く、いまはURLで開けない。Workerに足すか、Pagesに別置きか |
| ログイン画面 | `genre.js` が `html/login.html` に飛ばしているが、**そのファイルが無い**。誰が作るか未定 |
| スワイプの「次に何を出すか」 | `/api/introduce/user/next` は1枚ずつ返す。3枚重ねて見せるので、まとめて取る口が要るか未定 |
| ジャンル選択の絞り込み | `genre.js` は `?genre=` を付けて遷移するが、`home.js` が読んでいない。タグの粒度もバックエンドと違う（下記） |
| 画像素材 | のれん・雲・和柄・アイコン類は `frontend/www/images/` に入った。色（HEX）は未確定 |

## ジャンルとタグの粒度が違います

`genre.js` の `GENRES` とバックエンドのタグが一致していません。

```
フロントのジャンル    バックエンドのタグ
ガラス工芸            ガラス
染織                  織物 / 染物（2つに分かれている）
竹細工                竹工 / 竹
人形                  該当カードなし
刃物                  該当カードなし
```

**このままだと数個のジャンルが0件になります。**
実際のタグ一覧は `GET /api/search/facets` から取れます。ハードコードしないでください。

## この機能に固有の注意

**Google Maps API は使いません。**チームの方針です。
地図が必要なら Leaflet + OpenStreetMap を使ってください。
APIキーも課金設定も不要です。実装例は `features/search/ui.js` にあります。
