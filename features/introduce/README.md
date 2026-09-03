# 紹介機能

**作業ディレクトリ：`features/introduce/`**

**旧README（このリポジトリに実装が無かった時点のもの）は実態と大きくずれていたため書き直した。**
当時の前提「実装は別リポジトリにある」「501を返すスタブ」はもう成り立たない。
実装計画書のステップ1〜8に沿って、このリポジトリの中に直接実装してある。

## いまの状態

実装計画書のステップ1〜8まで完了。ステップ9（通し確認）は未着手。

```
features/introduce/
├ index.js      ルーティング
├ db.js         D1 アクセス（cards の書き込み・card_geo/card_images/card_i18n）
├ compose.js    5問 → Gemini → 3文＋英訳（掘り下げ判定込み）
├ prompt.js     質問定義とGeminiプロンプト
└ address.js    郵便番号・屋号検索・逆ジオコーディングの外部API中継
```

## 実装済みのパス

```
POST   /api/introduce/artisan/compose        カード作成の中核（5問→AI）
GET    /api/introduce/artisan/mine           自分のカード一覧
GET    /api/introduce/artisan/postal         郵便番号→住所（zipcloud中継）
GET    /api/introduce/artisan/geocode        屋号・住所→候補＋緯度経度（Nominatim中継）
GET    /api/introduce/artisan/reverse        緯度経度→住所（Nominatim逆引き）
POST   /api/introduce/artisan/upload-image   画像を1枚アップロード → { key }
POST   /api/introduce/artisan                新規登録 → { ok, id, tags }
PUT    /api/introduce/artisan/:id            修正
DELETE /api/introduce/artisan/:id            削除
GET    /api/introduce/artisan/:id            1件取得（修正フォーム用）
GET    /api/introduce/image/:key             画像を返す（未ログインOK）
GET    /api/introduce/user/liked             いいね一覧（要ログイン）
GET    /api/introduce/user/next              カードを1枚（未ログインOK）
POST   /api/introduce/user/:id/like          いいねトグル（要ログイン）
GET    /api/introduce/user/:id               記事詳細（未ログインOK）
```

`/api/introduce/artisan/*` は職人ロールのみ（`requireArtisan`）。
閲覧系（`/next`, `/:id`）は未ログインでも通す。いいね関連だけ要ログイン。
`GET /api/introduce/image/:key` は `/api/introduce/artisan/*` の外にあり、認証を掛けていない。

**画面（`GET /user`, `GET /artisan` など）はまだ無い。** フロントエンド担当の実装待ち。

## カードの単位

**品単位。伝統名でのグループ化はしない**（要件定義書3-2で確定）。
`GET /api/introduce/user/next` は品を1件ランダムに返す。

## 所有するテーブル

```
cards            紹介機能が所有。仕様書どおりの列。列を足していない
card_images      画像（KVのキーとsort_orderを持つ）
card_geo         住所検索で得た緯度経度（cards に列を足さないための外出し）
card_i18n        カードの英語版（同上）
likes            記事単位のいいね
```

`swipes` `reviews` `tag_categories` / `tags` は作っていない
（伝統名グループ化をやめたため swipes は不要、reviews はスコープ外、
タグは `cards.tags` のカンマ区切りで足りている）。

`card_embedding` `synonym` は検索機能の所有物。書き込みは
`features/search/embed.js` `db.js` の公開関数を経由し、直接SQLは書いていない。

## バインディング

```
teame_taka_introduce   D1 Database（DB と同じ database_id を指す。wrangler.jsonc で解決済み）
teame_images           KV Namespace（画像。生バイトで保存）
AI                     Workers AI（検索の埋め込み。cf/baai/bge-m3）
GEMINI_API_KEY         Secret（.dev.vars。compose の文章生成に使う）
ASSETS                 未使用（フロントエンドの実装待ち）
```

## 画像

**KV に生バイトで保存する。base64 は経由しない。**

旧README・仕様書には「base64 で保存」とあったが、5MBの画像は
base64にすると約6.7MBになり、Workers無料プランのCPU上限（1リクエスト10ms）に
デコードのコストが当たる可能性があるため、生バイト保存に変更した
（設計書6章）。KVは生のバイト列をそのまま保存できるので、base64にする必要がない。

`content_type` は KV の `metadata` に入れている。入れないと取り出すときに
何の画像か分からず `content-type` を付けて返せない。

上限は1枚5MB・1カード3枚まで。サーバー側でも強制している。

## カード作成（compose）の契約

```
POST /api/introduce/artisan/compose
{ "name": "...", "answers": [5個], "followups": [] }
```

判定は2段に分かれる：

```
空欄            → コード側。元の質問をそのまま出し直す（GEMINI_API_KEY 無しでも動く）
薄いかどうか+文言 → Gemini側。分野の観点（工程の具体名・回数年数・材料・失敗条件）は
                   プロンプトのヒントとしてのみ渡し、本文には使わせない
```

掘り下げは1周だけ。`followups` が空でないリクエストには必ず3文を返す。
Gemini が落ちても、`GEMINI_API_KEY` が無くても、答えを連結した文でカードを作れる
（レスポンスの `ai` が `false` になる）。

**文章生成に使っているモデルは `gemini-flash-lite-latest`。**
設計書記載の Gemini 2.5 Flash は実行時に404（新規キーでは利用不可）だったため、
`gemini-flash-latest`（liteでない方）と比較したうえで、6回連続503だった
`gemini-flash-latest` ではなく安定して成功した `gemini-flash-lite-latest` を採用した。

## 認証

`features/auth/` のセッションをそのまま使う（`readSessionCookie` / `userBySessionToken`）。
`artisan_id` はセッションから取る。クエリ・bodyでは受け取らない。

## 未決事項

- タグの選択UI（`cards.tags` に入れる形は決まっているが、選ばせ方は未決）
- `/dev/introduce` の見た目（フロントエンド担当。バックエンドは確認用のみ）
- KVの無料枠（書き込み1,000/日。デモなら足りるが未確認）
- 英語クエリでの段3ヒット精度（未検証寄り。"quiet atmosphere" は当たったが
  "lacquer bowl" は当たらなかった実測あり。直すかは未定）
- 髙橋さん・飯室さんとは連絡が取れないままで、2026-09-03、もう戻ってこない
  想定になった。コードは入手できなかったため、仕様書を見て同じAPIを
  立て直した。仕様書は実在の資料であり、そこに合わせて設計した判断には
  根拠がある
