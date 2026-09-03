# AGENTS.md ── AIコーディング支援への指示

このファイルは Claude Code / Cursor / Copilot などの AI が最初に読む前提で書かれています。
**人間が読んでも構いませんが、まず AI 向けの作業ルールです。**

---

## このリポジトリは何か

伝統工芸のマッチングアプリを、チーム4〜5人で分担開発するための**統合リポジトリ**です。
Cloudflare Workers 上で 1つの Worker として動きます。

技術構成:

```
実行環境   Cloudflare Workers
FW         Hono
DB         Cloudflare D1（SQLite）
AI         Cloudflare Workers AI（埋め込み生成）
言語       JavaScript（ES Modules）
```

---

## 担当ごとの詳しい指示

**自分の担当ディレクトリの AGENTS.md も必ず読んでください。**

```
features/search/AGENTS.md      検索
features/introduce/AGENTS.md   紹介（カード作成・マッチング・記事）
features/auth/AGENTS.md        ログイン・ユーザー登録
frontend/AGENTS.md             画面
```

---

## 最重要：作業ディレクトリの境界を越えない

**あなたが担当する機能のディレクトリの中だけを変更してください。**

| ディレクトリ | 担当機能 |
|---|---|
| `features/search/` | 検索 |
| `features/introduce/` | 紹介（カード作成・マッチング・記事） |
| `features/auth/` | ログイン・ユーザー登録 |
| `frontend/` | 画面（見た目） |
| `public/` | CSS・画像素材 |

### 共有ファイル（勝手に変えない）

```
src/index.js       機能を1つ追加するとき以外は触らない
migrations/        既存ファイルは絶対に書き換えない。新規追加のみ
wrangler.jsonc     バインディングを足すときは人間に確認する
AGENTS.md          このファイル
README.md
```

**他の担当のディレクトリのファイルは、読むのは自由ですが変更しないでください。**
必要が生じたら、変更せずに「ここを変える必要がある」と報告してください。

---

## 絶対に守ること

### 1. 他の機能が所有するテーブルに列を足さない

D1 のテーブルには所有者がいます。

| テーブル | 所有 |
|---|---|
| `cards` | 紹介機能 |
| `card_images` / `swipes` / `likes` / `reviews` | 紹介機能 |
| `card_embedding` / `synonym` | 検索機能 |

**他人のテーブルに `ALTER TABLE` しないでください。**
自分に必要なデータは、自分の新しいテーブルに外出しします。

実例：検索機能はベクトルが必要でしたが、`cards` に `embedding` 列を足さず
`card_embedding` テーブルを新設しました。これが正しいやり方です。

### 2. 既存のマイグレーションを書き換えない

```bash
# 正しい：新規追加
npx wrangler d1 migrations create teame <名前>
```

書き換えると、既に適用済みの人の環境と食い違います。

**ファイル名は `YYYYMMDDHHMM_<機能>_<内容>.sql` にしてください。**
連番だと4人が同じ番号を振ります。時刻ベースなら衝突せず、
適用順＝作成順が一致し、接頭辞で所有者が分かります。

### 2-b. `migrations/` に入れてはいけないもの

```
seeds/local_seed.sql    ダミーデータ。中に delete from cards; が入っている
```

**これを `migrations/` に置くと、`--remote` で流した瞬間に本番データが消えます。**
適用は `npm run setup` から行ってください。

（`dev-schema/cards.sql` はデプロイ前に廃止した。`cards` は
`migrations/202609030901_cards_and_synonyms.sql` に入っている。詳細は設計書1-1-b）

### 2-c. サブアプリで `app.use("*")` を使わない

Hono では、サブアプリのミドルウェアが**他の機能にも漏れます。**

```js
// ダメ：全機能に効いてしまう
app.use("*", 認証ガード);

// 正しい：自分の接頭辞で限定する
app.use("/api/<自分の機能>/*", 認証ガード);
```

`app.use("*", jwt())` は Hono で最も一般的な書き方ですが、
**この構成では mount 順を変えただけで全機能が 401 になります。**

### 3. 同じパスを2つの機能が持たない

Hono は**先に mount された方が勝ち、警告もエラーも出ません。**
パスを足す前に、他の機能の AGENTS.md でパス一覧を確認してください。

`:param` は後から来た静的パスも飲み込みます。
`/user/tradition/:name` があると `/user/tradition/favorites` はそちらにマッチします。

### 4. 決まっていないことを勝手に決めない

README.md の「未決事項」に挙がっている項目は、**まだ決まっていません。**
実装の都合で埋めたくなっても、勝手に決めずに人間へ確認してください。

空欄を埋めた実装を出すより、「ここが決まっていないので進められません」と
言ってもらうほうが助かります。

### 5. Google Maps API を使わない

**チームの方針です。**地図が必要なら Leaflet + OpenStreetMap を使ってください。
APIキーも課金設定も不要です。実装例は `features/search/ui.js` にあります。

---

## コードの書き方

### 機能の追加

各機能は Hono のサブアプリで、**自分の絶対パスを自分で持ちます。**

```js
// features/<名前>/index.js
import { Hono } from "hono";
const app = new Hono();

app.get("/api/<名前>/...", handler);
app.get("/<名前>", handler);

export default app;
```

`src/index.js` には `import` と `app.route("/", 機能)` を1行ずつ足すだけです。

### API規約

```
JSON のキーは snake_case
日時は ISO8601 UTC 文字列
値が無いときは null（キーを省略しない。空配列は [] ）
エラーは { "error": { "code", "message" } } の形で統一
```

| code | HTTP | いつ |
|---|---|---|
| `VALIDATION_ERROR` | 400 | 入力が不正 |
| `UNAUTHORIZED` | 401 | 認証が通らない |
| `NOT_FOUND` | 404 | リソースが無い |
| `NOT_IMPLEMENTED` | 501 | 未実装のスタブ |
| `EMBED_ERROR` | 502 | Workers AI 側の失敗 |
| `INTERNAL_ERROR` | 500 | その他 |

### パスの使い分け

```
/api/<機能>/...   API。バックエンドの成果物
/dev/...          バックエンドの動作確認用。成果物ではない
/<画面名>         フロントエンドが本番の画面を置く場所。バックエンドは占有しない
```

**画面（見た目）はフロントエンドの担当です。**
バックエンドの機能を作るとき、確認用の画面が要るなら `/dev/` 以下に置いてください。

---

## 動かし方・確認方法

```bash
npm install
npm run setup     # スキーマ + マイグレーション + シード（全部ローカル）
npm run dev
```

`npm run setup` の中身:

```
migrate        migrations/            cards・検索機能のテーブル・シノニム辞書
seed:apply     seeds/local_seed.sql   ダミー20件（ローカル専用。delete込み）
```

変更したら、**必ず動かして確認してください。**最低限これを見ます。

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8787/
curl -s "http://127.0.0.1:8787/api/<自分の機能>/..." | head -c 300
```

---

## 踏みやすい落とし穴（実測済み）

このプロジェクトで実際に時間を溶かした箇所です。**同じ失敗を繰り返さないでください。**

### Workers AI はローカルで動かない

`env.AI` は常に Cloudflare へリモート接続します。
`npx wrangler login` を済ませていないと **dev サーバー自体が起動しません。**

AI を使わない機能を触るときは、`wrangler.jsonc` の `"ai"` の行を
一時的にコメントアウトすれば認証なしで起動できます（**戻すのを忘れないこと**）。

D1 はローカルで動くので、DB だけなら認証不要です。

### D1 に配列型もベクトル型も無い

SQLite なので、

```
配列       → カンマ区切りの TEXT か JSON文字列。読み出し時に JS で変換
ベクトル   → JSON文字列で TEXT 列に入れる
```

`cards.tags` はカンマ区切りです。`LIKE '%器%'` で絞ると「茶器」「酒器」まで
誤爆するので、**全件読んで JS 側で絞る**ようにしてあります（件数が数千を超えたら要見直し）。

### スキーマを変えたらローカルDBを作り直す

マイグレーションを変更しても、既に適用済みの環境には反映されません。

```bash
npx wrangler d1 migrations apply teame --local
```

それでも古いままなら `.wrangler/state` を消して再実行します。
このとき **dev サーバーを止めてから**でないとファイルがロックされて消せません。

### dev サーバーの止め方（順番を間違えると止まりません）

`workerd.exe` だけを kill しても**親の `node`（wrangler 本体）が即座に生き返らせます。**
プロセス名で探す方法は取りこぼすので（`CommandLine` が読めない場合がある）、
**ポートから辿って親ごと落とす**のが確実です。

```powershell
Get-NetTCPConnection -LocalPort 8787 -State Listen | ForEach-Object {
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)"
  Stop-Process -Id $p.ParentProcessId -Force -ErrorAction SilentlyContinue
  Stop-Process -Id $p.ProcessId       -Force -ErrorAction SilentlyContinue
}
```

止まったかは**ポートを見て確認**します。

```bash
netstat -ano | grep ":8787 " | grep LISTENING
```

**古いサーバーが残ったまま新しいのを起動すると、8787 に2つが LISTENING になり、
古いほうが応答することがあります。**このとき症状は「コードを直したのに反映されない」で、
**アプリのバグにしか見えません。**実際にこれで30分溶かしました。
おかしいと思ったら、まずこのコマンドで**LISTENING が1つだけ**か確認してください。

### `database_id` を変えるとローカルDBが空になる

`wrangler.jsonc` の `database_id` を書き換えると、**ローカルのD1も別物として扱われます。**
miniflare がローカルの状態を database_id ごとに保存しているためです。

```
症状: no such table: users （テーブルが全部無い）
```

**アプリのバグではありません。**`git pull` で設定が更新された直後にも起きます。

```bash
npm run setup
```

これで作り直せば直ります。**ローカルだけの操作なので、本番には影響しません。**

### wrangler dev が落ちることがある

応答が全部 `000` や `500` になったら、まずアプリを疑う前に
**dev サーバーが生きているか確認**してください。プロキシ制御のエラーで落ちることがあります。
再起動で直ります。

### D1 は1クエリのバインドパラメータが100個まで

```js
// ダメ：件数が101を超えると本番だけ落ちる
where id in (?,?,?, ... )

// ローカルの SQLite は上限が桁違いなので、ローカルでは通ってしまう
```

**「ローカルで動くのに本番で落ちる」の典型です。**
件数に比例して `?` が増える書き方をしていないか確認してください。

### 外部CDNへの依存は try/catch で包む

会場のネットワークで unpkg などが弾かれることがあります。
`await` したまま例外が飛ぶと、**それ以降の初期化が全部止まります**
（イベントリスナの登録も含む）。地図が出ないだけのはずが、画面全体が無反応になります。

---

## 参考にすべき実装

**`features/search/` が完成している唯一の機能です。**
迷ったらここのコードを読んで、同じ書き方に揃えてください。

```
features/search/index.js      ルーティングとエラー処理の書き方
features/search/db.js         D1 アクセスの書き方（所有権の分離が分かる）
features/search/README.md     機能ごとの README の書き方
```

---

## 決まっていないこと

**README.md の「未決事項」を必ず読んでください。**特にこの2つは実装に直接影響します。

- **D1 のバインディング名** — 紹介機能は `teame_taka_introduce`、検索機能は `DB`。
  **`wrangler.jsonc` で同じ `database_id` を2つの名前で公開して解決済み**です。
  リモートDBを作るときは**両方の行の `database_id` を書き換えてください。**
  片方だけ変えるとDBが分裂し、エラーを出さずに検索結果が常に0件になります
- **カードの単位** — 伝統名（種類）単位か、記事（品）単位かが議論中です

---

## セットアップの提案（人間向け）

Cloudflare の公式スキルを入れると、AI が Workers / D1 / wrangler の
最新の書き方を参照できるようになります。

```bash
npx wrangler dev
# → 「Cloudflare skills をインストールしますか」と聞かれたら Y
```

このプロジェクトで踏んだ落とし穴のいくつかは、これで防げます。
