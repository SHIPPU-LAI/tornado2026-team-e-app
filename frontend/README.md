# フロントエンド

**画面（見た目）はここが担当します。**

バックエンドの `features/*` は API を提供するだけで、
`/dev/*` にある画面はバックエンドの動作確認用です。成果物ではありません。

実装は `frontend/www/` に入っています（2026-09-03、PR #1 でマージ）。

```
frontend/www/index.html          ジャンル選択（のれん演出）
frontend/www/html/home.html      カードのスワイプ
frontend/www/html/favorites.html お気に入り
frontend/www/js/                 genre.js / home.js / card-modal.js / favorites.js
frontend/www/css/                画面ごとのCSS
frontend/www/images/             のれん・雲・和柄・アイコン
```

## パスの状況

| パス | 用途 | 現状 |
|---|---|---|
| `/` | — | **バックエンドが使っています**（統合状況ページ）。差し替えるなら要相談 |
| `/search` | 検索結果画面 | **空き** |
| `/user` | マッチング画面 | **空き**（501スタブは削除済み） |
| `/login` | ログイン画面 | **空き**（501スタブは削除済み） |
| `/artisan` | 職人向け画面 | **空き** |

`/dev/search` はバックエンドの確認用なので、そのまま残しても消しても構いません。

## いまの状態（2026-09-03、実際にコードを読んで確認）

### 動いているもの

```
のれんの演出（揺れ・強風・開く・ズーム）
ジャンル選択の横スクロール
カードのスワイプ（左右・タップで詳細ポップアップ）
ハンバーガーメニュー
お気に入り画面のレイアウト
```

**見た目の作りはかなり進んでいます。**

### バックエンドに繋がっていないもの

```
home.js         GET /api/cards を叩いているが、このAPIは存在しない
favorites.js    FAVORITE_ITEMS をハードコード
genre.js        TAG_LABELS / GENRES をハードコード
card-modal.js   ハートボタンが見た目だけ（いいねAPIを叩いていない）
```

**原因はバックエンドのAPI仕様が共有されていなかったことです。**
仕様書は `docs/フロントエンド向けAPI.md` にあります（2026-09-03 に push 済み）。

### 置き換え先

```
home.js のデッキ取得   → GET /api/introduce/user/next
                         または GET /api/search/cards（まとめて取る場合）
commitSwipe の like    → POST /api/introduce/user/:id/like   要ログイン
favorites.js のデータ  → GET /api/introduce/user/liked       要ログイン
genre.js のタグ一覧    → GET /api/search/facets
```

`home.js` の `commitSwipe` にコメントアウトで書かれている
`/api/cards/:id/swipe` が、`POST /api/introduce/user/:id/like` に相当します。

### フィールド名の対応

```
フロントの想定            実際
card.imageUrl             card.image_url（一覧APIには含まれない）
card.stats.likes          card.like_count（stats の入れ子ではない）
card.craftsmanName        card.artisan_name
card.category             無い（近いのは card.tags[0]）
card.era                  無い
card.teaser               無い（card.description の先頭で代用）
card.stats.craftsmen      無い
card.stats.duration       無い
card.craftsmanWorkshop    無い
```

`card-modal.js` は `FALLBACK_INFO` を持っているので、無い項目でも壊れません。
**ただし `teaser` `category` `region` はフォールバック対象外**で、
カード表面に `undefined` と出ます。

### 先に直したほうがいい1点

`home.js` と `card-modal.js` の両方に

```js
(card.id - 1) % 5
```

があります。**`card.id` は文字列**（`"c002"` やUUID）なので `NaN` になり、
画像のパレット振り分けが効きません。連番が要るなら配列のindexが早いです。

## 未決事項

| 項目 | 状況 |
|---|---|
| **配信方法** | **未定**。`wrangler.jsonc` に `assets` の設定が無く、`frontend/www/` はURLで開けない。Workerに足すか、Pagesに別置きか |
| **ログイン画面** | `genre.js` が `html/login.html` に飛ばしているが、**そのファイルが無い**。いいね・お気に入りは要ログインなので、これが無いと動かない |
| スワイプの供給 | `/next` は1枚ずつ返す。3枚重ねて見せるので、まとめて取る口が要るか未定 |
| ジャンルでの絞り込み | `?genre=` を付けて遷移しているが `home.js` が読んでいない。タグの粒度もバックエンドと違う |
| `frontend/www/db/schema.sql` | 独自の `crafts` テーブル定義。バックエンドは `cards` を使う。残すか消すか未定 |
| 色（HEXコード） | 未確定 |

## 架空データの扱い

**カードに `is_dummy` というフラグが返ります。**

2026-09-03 時点で本番21件のうち17件が `is_dummy: true` です（動作確認用のダミー）。
**職人名も架空のもの**が入っているので、このフラグが立っているカードには
架空と分かる表示を付けてください。仕様書の1章に書いてあります。

`frontend/www/db/schema.sql` のサンプルデータ（南部鉄器 鉄瓶 など）も
職人名が架空です。画面に出す場合は同じ扱いが必要です。

## 地図について

**Google Maps API は使わない方針です。**APIキーも課金設定も要らない構成にしています。

```
バックエンドの検証用画面    Leaflet + OpenStreetMap
外部地図へのリンク          OpenStreetMap
```

地図を画面に載せる場合も、この方針に合わせてください。

## バックエンドのAPIを叩くとき

**セッションはCookieです。**`fetch` に `credentials: "include"` が要ります。

エラーは全機能共通でこの形です。

```json
{ "error": { "code": "UNAUTHORIZED", "message": "ログインが必要です" } }
```

`message` はそのまま画面に出せる日本語です。
他人のカードを取ると 403 ではなく **404** が返ります。

**`501` はもう返りません。**検索・紹介・ログインの3つとも実装済みです。
以前この文書に「501 なら未統合」と書いてありましたが、古い記載です。

使えるAPIの一覧は `docs/フロントエンド向けAPI.md` を見てください。
