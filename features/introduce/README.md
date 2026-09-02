# 紹介機能 ── 持ち込み待ち

**作業ディレクトリ：`features/introduce/`**

いまは 501 を返すスタブです。**枠があることを示すためだけのもの**で、中身はありません。

実装は**別リポジトリ**にあります。
このリポジトリからはコードを見ていません（仕様書とデプロイ先の画面のみ確認）。

## 持ち込み方

仕様書に「統合時は各 `features/*` フォルダを丸ごと持ち込み、
`src/index.ts` に `app.route()` を1行追加するだけで組み込める設計にしている」とあるので、
基本はそのまま入れられるはずです。

1. `features/introduce/` の中身を、実装側の `features/introduce-artisan/` と
   `features/introduce-user/` で置き換える
2. `src/index.js` の `import introduce from "../features/introduce/index.js"` を実態に合わせる
3. マイグレーションを `migrations/` に追加する（既存ファイルは書き換えない）

## 仕様書から読み取れる範囲（未確認を含む）

**この節は仕様書の記載を写したものです。実装と一致しているかは確認していません。**

### 担っている機能

**カード作成機能を含みます。**これがプロダクトの中核です。

```
職人側   カードの作成・修正（伝統名・ふりがな・職人名・場所・説明文・タグ・画像）
         説明文のAI3文チェック／言い換え提案
         ふりがなの自動生成
         伝統名のあいまい検索（予測変換）
ユーザー側 マッチング（伝統名単位で1枚）／記事一覧／記事詳細／いいね／評価
```

### 持っているパス

```
GET  /user                      マッチング画面
GET  /user/tradition/:name      記事一覧
GET  /user/card/:id             記事詳細
GET  /artisan                   職人向け登録・修正画面
     /api/introduce/user/*      ユーザー側API
     /api/introduce/artisan/*   職人側API
```

### 所有するテーブル

```
cards            伝統・作品カード（記事）★共有。検索機能も読む
card_images      記事画像（最大3枚）
swipes           伝統単位のマッチング
likes            記事単位のいいね
reviews          評価コメント
tag_categories / tags   タグのカテゴリと小ジャンル
```

### バインディング

```
teame_taka_introduce   D1 Database
teame_taka_images      KV Namespace（画像を base64 で保存。R2 は課金設定が必要なため不採用）
AI                     Workers AI
ASSETS                 Assets（./public）
```

## 未決事項

- **D1 のバインディング名** — こちらは `teame_taka_introduce`、検索機能は `DB`。
  1つの Worker にまとめると衝突する。**統合前に決める必要がある**
- **言語** — 仕様書は「TypeScript / JavaScript」併記。このリポジトリは現状 JS
- **カードの単位（種類 / 品）** — 議論中。未決
- **統合リポジトリを使うことの合意** — 未確認。この枠は先行して用意しただけ
- **「あいまい検索」という語が2箇所で別の意味に使われている** —
  こちらは登録時の予測変換（レーベンシュタイン距離）、検索機能は意味検索（ベクトル）。
  呼び分けが必要
