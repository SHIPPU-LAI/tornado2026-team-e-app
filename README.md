# チームE 統合アプリ（骨組み）

各機能を1つの Cloudflare Worker として動かすための受け皿です。

**現時点でこれはチームの決定ではありません。**
統合する場所が無いままだったので、先に枠だけ用意したものです。
使うかどうかはチームで決めてください。

---

## 作業ディレクトリ

**自分のディレクトリの中だけを触ってください。**
他の担当のディレクトリと `src/index.js` は共有です。

| 作業ディレクトリ | 機能 | 状態 |
|---|---|---|
| `features/search/` | 検索 | **実装済み** |
| `features/introduce/` | 紹介（**カード作成**・マッチング・記事） | スタブ（501） |
| `features/register/` | ユーザー登録 | スタブ（501） |
| `features/auth/` | ログイン | スタブ（501）**担当未定** |
| `frontend/` | 画面（見た目） | 枠のみ |
| `public/` | CSS・画像素材 | 枠のみ |

各ディレクトリの `README.md` に、担っている範囲・パス・未決事項を書いてあります。

### AIに実装させる場合

**[AGENTS.md](./AGENTS.md) を読ませてください。**作業ルール・API規約・
実際に踏んだ落とし穴をまとめてあります。

```
AGENTS.md                    リポジトリ全体のルール（AIが最初に読む）
CLAUDE.md                    Claude Code 用。AGENTS.md への案内
features/*/AGENTS.md         その機能に固有のルール
frontend/AGENTS.md
```

Claude Code / Cursor / Copilot などは、これらを自動で読みます。
担当ディレクトリの外を触らないよう、境界も明記してあります。

### 共有していて、勝手に変えないもの

```
src/index.js       統合ルーティング。機能を足すとき以外は触らない
migrations/        既存ファイルは書き換えず、必ず新規追加する
wrangler.jsonc     バインディングを足すときは共有してから
```

---

## 画面はフロントエンドの担当です

**バックエンド側の成果物は API です。**

`/dev/*` は**動作確認用**であって、成果物ではありません。
本番の画面を置けるよう、パスは空けてあります。

```
/dev/search    検索の動作確認用（バックエンド）
/search        検索結果画面を置く場所 → 空き
/user          マッチング画面 → 紹介機能のスタブが 501 を返している
/login         ログイン画面 → ログイン機能のスタブが 501 を返している
/              いまは統合状況の一覧。差し替え可
```

---

## 動かす

```bash
npm install
npm run setup     # ローカルDBを作る（スキーマ + マイグレーション + ダミーデータ）
npm run dev
```

**ブラウザで http://127.0.0.1:8787 を開いてください。**
どの機能が実装済みでどれがスタブかの一覧が出ます。そこから辿れます。

動いているか1行で確かめるなら:

```bash
curl "http://127.0.0.1:8787/api/search?q=漆"
```

`"stage":"keyword"` とカード3件が返れば成功です。

### 段3（あいまい検索）を試すとき

**先に埋め込みを作らないと、段3は1件も返しません。**
`npm run setup` 直後は `card_embedding` が空だからです。

```bash
npx wrangler login                                   # Workers AI に必要
npm run dev
curl -X POST "http://127.0.0.1:8787/api/search/reindex"   # 20件で数秒
curl "http://127.0.0.1:8787/api/search?q=静かな雰囲気のもの"
```

`"stage":"vector"` が返れば成功です。カードを足したら**そのたびに reindex** を叩いてください
（未処理のカードだけを対象にするので、2回目以降は一瞬で終わります）。

### AI を使わない機能を触るとき

`env.AI` は常に Cloudflare へリモート接続するので、`npx wrangler login` していないと
**dev サーバー自体が起動しません。**AI が要らないなら `wrangler.jsonc` の `"ai"` の行を
一時的にコメントアウトしてください（**戻すのを忘れずに**）。段1〜2 とDBはそれで動きます。

### .dev.vars

```bash
cp .dev.vars.example .dev.vars
```

いまローカルで必須のものはありません。`REINDEX_TOKEN` は任意で、
設定すると reindex に認証がかかります（デプロイ時は必須。下記）。

**地図は OpenStreetMap を使います。Google Maps API は使いません。**APIキーも課金設定も不要です。

---

## 機能の足し方

```
1. features/<名前>/index.js を作る（Hono サブアプリを export default）
2. src/index.js に import と app.route("/", 機能) を1行ずつ足す
3. マイグレーションが要るなら migrations/ に新規ファイルを追加する
   （ファイル名は YYYYMMDDHHMM_<機能>_<内容>.sql。連番だと4人で衝突する）
```

**各機能は自分の絶対パスを自分で持ちます。**
`src/index.js` は mount するだけで、パスの割り当てはしません。
紹介機能の仕様書にある「`features/*` を丸ごと持ち込み、`app.route()` を1行追加」に合わせた形です。

### 守ること

- **他の機能が所有するテーブルに列を足さない。** 必要なものは自分のテーブルに外出しする
  （検索機能が `cards` に列を足さず `card_embedding` を作ったのがこの例）
- **既存のマイグレーションファイルは書き換えない。** 必ず新規追加する
- エラーは共通の形で返す（下記）

### API規約

```
JSON は snake_case
日時は ISO8601 UTC 文字列
値なしは null（キー省略しない、空配列は []）
エラーは { "error": { "code", "message" } }
```

| code | HTTP |
|---|---|
| `VALIDATION_ERROR` | 400 |
| `NOT_FOUND` | 404 |
| `NOT_IMPLEMENTED` | 501 |
| `EMBED_ERROR` | 502 |
| `INTERNAL_ERROR` | 500 |

---

## データベース

SQLを置く場所を3つに分けています。**この分け方には理由があります。**

```
migrations/     本番に流れる。検索機能の追加テーブルのみ
dev-schema/     ローカル開発用。本番には流さない
seeds/          ダミーデータ。本番には流さない
```

| ファイル | 中身 | 本番に流す |
|---|---|---|
| `migrations/0002_search.sql` | `card_embedding`, `synonym` | **流す** |
| `dev-schema/cards.sql` | 紹介機能の `cards` の写し | 流さない |
| `seeds/local_seed.sql` | ダミー20件 | 流さない |

**なぜ `cards.sql` を `migrations/` から出したか。**
`cards` は紹介機能が所有します。`migrations/` に `create table if not exists cards`
が入っていると、紹介機能が持ち込んだ本物の `cards` 定義が
**エラーも出さずに無視されます**（`if not exists` なので）。
列が足りないテーブルのまま進んで、原因が分からなくなります。

**なぜ `local_seed.sql` を `migrations/` から出したか。**
中に `delete from cards;` が入っています。誰かが `--remote` を付けて
`wrangler d1 migrations apply` を実行した瞬間に、**本番のカードが全部消えます。**

適用は `npm run setup` から行ってください。中身は3つを順に流すだけです。

```
npm run schema:local   dev-schema/cards.sql
npm run migrate        migrations/
npm run seed:apply     seeds/local_seed.sql
```

`seeds/local_seed.sql` は手で編集しないでください。元データを変えたら再生成します。

```bash
npm run seed
```

---

## 未決事項（勝手に埋めないこと）

| 項目 | 状況 |
|---|---|
| **D1 バインディング名** | 紹介機能 `teame_taka_introduce` / 検索機能 `DB` で食い違い。**`wrangler.jsonc` で同じ `database_id` を2つの名前で公開して解決済み**（下記）。名前をどちらかに寄せるかは未決 |
| **ログイン機能の担当** | **未定。**誰が作るか、着手されているかも不明 |
| **登録機能とログイン機能の境界** | 同じ担当が持つのか分けるのかが未定 |
| **カードの単位** | 種類（伝統名）か、品（記事）か。議論中 |
| **このリポジトリを使うか** | チーム未合意。先行して用意しただけ |
| **reindex を自動で回すか** | Cron Trigger にする案があるが、**デプロイ先が未決なので保留**（下記） |
| 「あいまい検索」の呼び分け | 紹介機能＝登録時の予測変換、検索機能＝意味検索。同じ語で別物 |
| フロントの構成 | SSR / 静的HTML / SPA のいずれか未定 |
| スワイプの出す順・既読管理 | フロントでUIは実装済み。どのAPIが担うか未定 |
| 言語 | 仕様書は TypeScript / JavaScript 併記。現状は JS |
| Worker 名・デプロイ先 | 未決（`wrangler.jsonc` の `name` は仮） |
| 登録機能と紹介機能の項目重複 | 屋号・住所・伝統の歴が両方に出てくる。役割分担が未確認 |
| 画像保存 | 紹介機能は KV に base64。検索機能は未使用 |
| 紹介機能側の地図 | 仕様書では Google Maps embed（APIキー不要）。**方針と整合するか要確認** |
| `public/` の Assets バインディング | 未設定 |

### 埋め込みの再生成（reindex）をどう回すか ── 保留中

紹介機能がカードを1枚足すと、そのカードは `card_embedding` に入っていないので
**段3（ベクトル検索）に出てきません。**誰かが `POST /api/search/reindex` を
叩くまでは段1・段2にしか出ない状態になります。

いまは手で叩く前提です。本来は Cron Trigger で自動化したいところですが、

```
Cron はデプロイ済みの Worker でしか動かない
→ Worker 名・アカウント・そもそもこのリポジトリを使うかが未決
→ いま入れても動かないコードが src/index.js（共有ファイル）に増えるだけ
```

なので**デプロイ先が決まってから**入れます。決まったらこうします。

```jsonc
// wrangler.jsonc
"triggers": { "crons": ["*/10 * * * *"] }
```

```js
// src/index.js  export default を { fetch, scheduled } の形に変える
```

未処理のカードだけを対象にする作りなので、回しても余分なコストは出ません。

### reindex のトークン

`POST /api/search/reindex` は書き込み系で、Workers AI を呼びます。
`REINDEX_TOKEN` を設定すると `x-reindex-token` ヘッダを要求します。

**未設定だと認証なしで通ります。**ローカル開発を止めないための作りなので、
**デプロイするときは必ず設定してください。**

```bash
npx wrangler secret put REINDEX_TOKEN
```

### D1 バインディングの扱い（決定済み・触るときは注意）

紹介機能と検索機能でバインディング名が違うので、`wrangler.jsonc` で
**同じ `database_id` を2つの名前で公開**しています。

```jsonc
{ "binding": "DB",                   "database_id": "..." },
{ "binding": "teame_taka_introduce", "database_id": "..." }
```

どちらの名前で書いても、実体は同じ1つのDBです。両方のコードを無改造で動かせます。

**リモートDBを作ったら、`database_id` は2行とも書き換えてください。**
片方だけ書き換えると、紹介機能と検索機能が別々のDBを見ることになります。
このときエラーは一切出ません。**検索結果が常に0件になるだけ**なので、原因に辿り着けません。
