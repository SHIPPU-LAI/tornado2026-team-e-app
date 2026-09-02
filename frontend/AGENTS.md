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

バックエンドは本番用のパスを占有していません。空いています。

| パス | 用途 | 現状 |
|---|---|---|
| `/` | ホーム画面 | いまは統合状況の一覧。差し替え可 |
| `/search` | 検索結果画面 | **空き（404）** |
| `/user` | マッチング画面 | 紹介機能のスタブが 501 |
| `/login` | ログイン画面 | ログイン機能のスタブが 501 |

`/dev/*` は**バックエンドの動作確認用**です。成果物ではないので、
デザインを合わせる必要はありません。参考にする必要もありません。

## 使えるAPI

いま動いているのは**検索だけ**です。

```
GET /api/search?q=&block=&prefecture=&tag=&name=
GET /api/search/cards?block=&prefecture=&tag=&name=
GET /api/search/facets
```

詳しくは `features/search/README.md` を見てください。

他の機能のAPIは `501 NOT_IMPLEMENTED` を返します。
**501 が返ってきたら「まだ実装されていない」という意味です。**エラー処理を書くときの参考に。

```json
{ "error": { "code": "NOT_IMPLEMENTED", "message": "..." } }
```

## 決まっているもの

```
フォント    Zen Kaku Gothic Antique（普通）
            Zen Antique Soft（おしゃれ）
和柄の参考  https://bg-patterns.com/?cat=4&paged=11
```

## 決まっていないもの

**想像で決めないでください。**

| 項目 | 状況 |
|---|---|
| フロントの構成 | **未定**。SSR（Hono JSX）／静的HTML＋JS／SPA のどれか決まっていない |
| ホーム画面 `/` の差し替え時期 | 未定 |
| スワイプの「次に何を出すか」 | UIは実装済みだが、**出す順・既読管理をどのAPIが担うか未定** |
| 画像素材 | のれん・雲・和柄・アイコン類が未用意 |

## この機能に固有の注意

**Google Maps API は使いません。**チームの方針です。
地図が必要なら Leaflet + OpenStreetMap を使ってください。
APIキーも課金設定も不要です。実装例は `features/search/ui.js` にあります。
