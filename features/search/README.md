# 検索機能

**作業ディレクトリ：`features/search/`**

## 成果物は API です

**画面（見た目）はフロントエンドの担当です。**
`/dev/search` にある画面は**バックエンドの動作確認用**であって、成果物ではありません。
本番の検索結果画面を置けるよう、`/search` のパスは空けてあります（`frontend/README.md` 参照）。

## 設計方針：検索のたびに外部APIを叩かない

検索は**段階式**。上の段で見つかれば下の段は動かさない。

| 段 | 中身 | 依存 | コスト | 速度 |
|---|---|---|---|---|
| 段1 | キーワード一致（ふりがな含む） | D1のみ | 0円 | <10ms |
| 段2 | シノニム展開（事前生成の辞書） | D1のみ | 0円 | <10ms |
| 段3 | ベクトル類似 | Workers AI（エッジ） | 無料枠 | ~100ms |

**外部のLLM APIは検索経路に一切登場しません。**

AIを使うのは**登録時に1回だけ**（埋め込み生成）。検索が何回走ってもコストは増えません。

## API

```
GET  /api/search?q=&block=&prefecture=&tag=&name=   検索（段1→段2→段3）
GET  /api/search/cards?block=&prefecture=&tag=&name=  一覧（絞り込みのみ）
GET  /api/search/facets                              地方・都道府県・タグの一覧
POST /api/search/reindex                             埋め込みの生成
GET  /api/search/status                              インデックス済み件数
```

**`reindex` を叩くまで段3は1件も返しません。**`npm run setup` 直後は
`card_embedding` が空だからです。`status` で確認できます。

```bash
curl "http://127.0.0.1:8787/api/search/status"
# {"total":20,"embedded":0}   ← embedded が 0 なら段3は動きません

curl -X POST "http://127.0.0.1:8787/api/search/reindex"
# {"indexed":20,"ms":2446,"total":20,"embedded":20}   ← 20件で数秒
```

`REINDEX_TOKEN` を設定している場合はヘッダが要ります。

```bash
curl -X POST -H "x-reindex-token: <値>" "http://127.0.0.1:8787/api/search/reindex"
```

### `/api/search` のレスポンス

```json
{
  "query": "涼しげ",
  "stage": "synonym",
  "items": [ { "card": { ... }, "score": 0.72 } ],
  "meta": { "expanded": ["ガラス", "夏", "竹"] },
  "total": 5,
  "ms": 9
}
```

- `stage` … `keyword` / `synonym` / `vector` / `none`。どの段で当たったか
- `score` … 段3のときだけ付く（コサイン類似度）
- `card.tags` … 配列に変換済み（DBはカンマ区切り）
- `card.block` … 地方。`region` から導出（DBには列が無い）
- `card.lat` / `card.lng` … 都道府県の代表座標。DBには無いので導出

### 記事一覧の絞り込みに使えます

紹介機能の「伝統名ごとに集約 → 記事一覧 → 記事詳細」という動線で、
記事一覧が増えたときの絞り込みに使えます。

```
GET /api/search?name=三味線&q=涼しげ&block=近畿
```

`name` を渡すと、その伝統名の記事の中だけを検索します。

## この feature が所有するテーブル

```
card_embedding   埋め込みベクトル（登録時に1回だけ書く）
synonym          シノニム辞書
```

**`cards` は紹介機能の持ち物なので、読むだけです。**
`cards` に列を足すと向こうのマイグレーションと衝突するため、
埋め込みは別テーブルに外出ししてあります。

## ファイル

```
index.js      Hono サブアプリ（ルーティング）
search.js     段1→2→3 の制御
db.js         D1 へのアクセス
embed.js      Workers AI 呼び出し + コサイン類似度
synonyms.js   シノニム辞書（41語。増やせる）
regions.js    都道府県 → 地方 の対応表、都道府県の代表座標
ui.js         検証用の画面（成果物ではない）
```

## 未決事項

- **D1 のバインディング名** — 紹介機能は `teame_taka_introduce`、こちらは `DB`。
  暫定で両方を受けるようにしてある（`index.js` の `db()`）。統一が決まったら消す
- **地図** — Google Maps API は使わない方針。OpenStreetMap（Leaflet）で表示している。
  APIキーも課金設定も不要
- **段3のしきい値** — いま `0.45`（`search.js` の `VECTOR_THRESHOLD`）。
  実データでスコアが 0.45〜0.50 に密集したので、**絶対値ではなく相対順位で切るほうが
  安定する可能性がある**。未検証
- **説明文の具体性** — 段3は `description` の意味で判定するので、
  どのカードも似た文章だとベクトルが固まって区別できなくなる。
  **登録時にどう引き出すかが検索精度を決める**
