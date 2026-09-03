# フロントエンド向け API

**バックエンド（検索・紹介・認証）から、画面を作る側へ。**
2026-09-03 時点。実装済みのものだけを書いてあります。

---

## 0. 最初に知っておくこと

### 同じ Worker に載ります

フロントエンドはこのリポジトリの `frontend/` と `public/` に置き、
**バックエンドと同じ1つの Worker として動きます。**つまり**同一オリジン**です。

そのため `fetch` はふつうに書けます。

```js
const res = await fetch("/api/introduce/user/next");
```

**別のポートやサービスから叩く予定があるなら、先に言ってください。**
ログインの Cookie が `SameSite=Lax` なので、**別オリジンだと送られず全部401になります。**
その場合は設定を変える必要があります。**発表当日に気づくと詰みます。**

### ログインは Cookie です

トークンをヘッダに付ける必要はありません。ログインすると `Set-Cookie` が返り、
以後の `fetch` に自動で付きます。**JS から Cookie は読めません**（`HttpOnly`）。

ログイン状態を知りたいときは `GET /api/auth/me` を叩いてください。

### エラーの形

```json
{ "error": { "code": "NOT_FOUND", "message": "カードが見つかりません" } }
```

| code | HTTP | いつ |
|---|---|---|
| `VALIDATION_ERROR` | 400 | 入力が不正 |
| `UNAUTHORIZED` | 401 | 未ログイン、または権限がない |
| `NOT_FOUND` | 404 | 無い |
| `UPSTREAM_ERROR` | 502 | 外部API（住所検索など）の失敗 |
| `INTERNAL_ERROR` | 500 | その他 |

### 日時

すべて**ミリ秒の数値**（`Date.now()`）です。ISO文字列ではありません。

```js
new Date(card.updated_at)
```

---

## 1. カードの形（いちばん使うもの）

`GET /api/introduce/user/next` と `/user/:id` が返す `card` の中身です。

```json
{
  "id": "9f2c…",
  "artisan_id": "…",
  "name": "輪島塗",
  "name_kana": "わじまぬり",
  "artisan_name": "（架空）輪島塗 山本工房",
  "workshop_name": "山本工房",
  "description": "下地の漆を、20回以上重ねる。…",
  "hp_url": "https://…",
  "region": "石川県",
  "address": "石川県輪島市河井町…",
  "history": "…",
  "tags": ["漆器", "食器"],
  "lang": "ja",
  "created_at": 1788363396590,
  "updated_at": 1788363453515,

  "like_count": 3,
  "liked": false,
  "lat": 37.39,
  "lng": 136.89,
  "images": ["card-image:abc…", "card-image:def…"],
  "is_dummy": true
}
```

### 必ず守ってほしいこと

**`is_dummy: true` のカードには「架空」と分かる表示を付けてください。**

発表で審査員に見せます。**架空のカードを実在の工房だと誤解させてはいけません。**
サーバーが必ずこの旗を返すので、画面側で必ず出してください。

### 画像の出し方

`images` は**キーの配列**です。そのままURLにはなりません。

```html
<img src="/api/introduce/image/card-image:abc…">
```

**認証は要りません。**未ログインでも表示できます。

### `workshop_name`（工房名）

`artisan_name`（職人名）とは別の項目です。**表示専用**で、AIの5問には使われず、
埋め込み・検索結果にも影響しません。任意入力のため、既存カードは `null` のことがあります。
`null` のときのフォールバック（例：職人名だけ出す）は画面側で用意してください。

### `tags` は配列です

DBではカンマ区切りですが、**APIは配列にして返します。**画面側で分解しないでください。

### 地図

`lat` / `lng` は**入っていないことがあります**（`null`）。
住所を登録していないカードです。**null のときに落ちないようにしてください。**

**地図は OpenStreetMap（Leaflet）を使ってください。Google Maps は使いません（チーム方針）。**
実装例が `features/search/ui.js` にあります。

---

## 2. 画面ごとに使うAPI

フロントエンドの優先順（8/28確定）に合わせて並べてあります。

### ホーム画面 / カード閲覧

```
GET /api/introduce/user/next            → { card: {…} }  カードを1枚
GET /api/introduce/user/next?lang=en    → 英語版
```

- **未ログインでも見られます。**ログインを要求しないでください
- カードが無いときは `{ "card": null }` が返ります（404ではありません）
- **同じカードが連続で出ることがあります。**見たものを覚える仕組みを持っていません。
  気になる場合は言ってください。フロントが見たIDを送る形にできます

### カード詳細

```
GET /api/introduce/user/:id             → { card: {…} }
GET /api/introduce/user/:id?lang=en     → 英語版
```

未ログインでも見られます。無い id は 404 です。

### 検索結果

```
GET /api/search?q=涼しげ
GET /api/search?q=涼しげ&lang=en        → 英語版（カードの英訳があれば差し替え、無ければ日本語のまま）
GET /api/search?block=中部&prefecture=石川県&tag=漆器&name=輪島
GET /api/search/facets                  → 地方・都道府県・タグの一覧（絞り込みUI用）
```

返る形

```json
{
  "query": "涼しげ",
  "stage": "synonym",
  "items": [ { "card": { …上記のカード… }, "score": 0.48 } ]
}
```

`stage` は **`keyword` / `synonym` / `vector`** のどれかです。

| stage | 意味 |
|---|---|
| `keyword` | 名前・ふりがな・タグに直接当たった |
| `synonym` | 言い換え辞書で広げて当たった（例：涼しげ→ガラス・夏・竹） |
| `vector` | 意味で当たった（あいまい検索） |

### 【お願い】`stage: "vector"` のときは見せ方を変えてください

段1・段2は**確実に当たったもの**ですが、**段3は「意味が近そうなもの」**です。
確実な一致ではありません。

```
keyword / synonym   「〇〇の検索結果」
vector              「もしかして、こういうものですか」など、断定しない見出し
```

**実測で、無関係なクエリでも何かが返ることが分かっています。**
たとえば「ラーメンが食べたい」で弁当箱が返ります。
これはモデルが「食べ物を入れる器」という関連を拾っているためで、
**間違いではありませんが、一致でもありません。**

しきい値で弾こうとしましたが、**本物と無関係のスコアが重なっていて分離できませんでした。**
そのため、**弾かずに見せ方で扱う**方針にしています。

確実な一致のふりをすると嘘になるので、ここだけ協力してください。

**それ以外で `stage` を画面に出すかは任せます。**出すと「なぜこれが出たか」が伝わります。

**クエリと表示言語は別の話です。**

```
クエリ      日本語が有利です（英語クエリも一部通りますが、ヒットしにくい・改善作業中）
表示言語    lang=en を付けると、カードの英訳があれば差し替えて返します（無ければ日本語のまま）
```

### ログイン / サインアップ

```
POST /api/auth/signup   { email, password, role, display_name }
POST /api/auth/login    { email, password }
POST /api/auth/logout
GET  /api/auth/me       → { user: {…} } / 401
```

`role` は **`"artisan"`（職人）か `"user"`（一般）** です。

**パスワードの条件**

```
12文字以上
大文字・数字・記号の強制なし（入れても構いません）
前後の空白も文字として扱う（trim しないでください）
よくあるパスワード、メールアドレスと同じ文字列は 400
```

**画面側で「大文字と記号を入れてください」と要求しないでください。**
長さだけ案内してください。

### いいね閲覧

```
POST /api/introduce/user/:id/like   → { liked: true, like_count: 4 }   要ログイン
GET  /api/introduce/user/liked      → いいねした一覧               要ログイン
```

`POST` は**トグル**です。同じものを2回叩くと外れます。
未ログインだと 401 なので、**ログインを促す導線**を用意してください。

### カード登録（職人向け）

**ここがこのアプリの中核です。**流れが決まっています。

```
1. POST /api/introduce/artisan/compose        5問に答える → 3文＋英訳
2. POST /api/introduce/artisan/upload-image   画像を1枚ずつ（最大3枚）
3. GET  /api/introduce/artisan/postal|geocode 住所を引く
4. POST /api/introduce/artisan                カードを登録
```

**すべて職人ロール（`role: "artisan"`）のログインが要ります。**

#### 1. compose（5問→AI）

```json
POST /api/introduce/artisan/compose
{
  "name": "輪島塗",
  "answers": ["椀と箸", "下地の漆を塗って研ぐところ", "10年", "下地を20回以上重ねる", "縁の薄さ"],
  "followups": []
}
```

質問は5つです。**画面にはこの順で出してください。**

```
1. 何を作って（演じて）いますか。ひとことで。
2. その中で、いちばん手間がかかるのはどこですか。
3. そこは、ひとりでできるまでどれくらいかかりましたか。
4. よそと違うと思うのは、どんなところですか。
5. はじめて見る人に、どこを見てほしいですか。
```

**答えが薄いと、掘り下げの質問が返ってきます。**

```json
{ "ja": null, "en": null, "ai": true,
  "followup": { "index": 2, "question": "ひとり立ちするまでに何年かかりましたか。" } }
```

このときは**その質問を画面に出して、答えを `followups` に足して同じAPIを呼び直してください。**

```json
"followups": [ { "index": 2, "question": "ひとり立ち…", "answer": "10年" } ]
```

**掘り下げは1周だけです。**2回目には必ず3文が返ります。

完成すると

```json
{ "ja": ["文1", "文2", "文3"], "en": ["s1", "s2", "s3"], "ai": true, "followup": null }
```

**`ai: false` が返ることがあります。**AIが落ちているときです。
文章は返るので**そのまま進めて構いません。**エラー表示にしないでください。

**生成された文章は、職人が手で直せるようにしてください。**
直した内容がそのまま登録データになります。

#### 4. 登録

```json
POST /api/introduce/artisan
{
  "name": "輪島塗",
  "name_kana": "わじまぬり",
  "artisan_name": "山本 太郎",
  "workshop_name": "山本工房",
  "description": "（composeの3文を「」で連結したもの。職人が直した後の文）",
  "description_en": "（英訳。任意）",
  "hp_url": "https://…",
  "region": "石川県",
  "address": "石川県輪島市…",
  "history": "…",
  "tags": ["漆器", "食器"],
  "image_keys": ["card-image:abc…"],
  "lat": 37.39,
  "lng": 136.89
}
```

→ `{ "ok": true, "id": "…", "tags": ["漆器","食器"] }`

**`tags` は最大5個です。**6個以上送ると**黙って5個に切られます。**
レスポンスの `tags` を見て、画面の表示を合わせてください。

**`artisan_id` は送らないでください。**ログイン情報から決まります。

#### 住所

```
GET /api/introduce/artisan/postal?code=9280001    郵便番号（ハイフン可）
GET /api/introduce/artisan/geocode?q=輪島塗会館    屋号・住所から候補3件＋緯度経度
GET /api/introduce/artisan/reverse?lat=&lng=      緯度経度→住所（地図クリック用）
```

**個人の小さな工房は `geocode` でヒットしないことが多いです。**
そのときは「郵便番号で大まかに → 地図をクリックして正確な位置」の導線を用意してください。

**外部サービスを使っているので、失敗することがあります。**502 が返ったら
「取れませんでした」と出して、**住所を手入力でも登録できるように**してください。

#### 画像

```
POST /api/introduce/artisan/upload-image   multipart/form-data の file
→ { "key": "card-image:abc…" }
```

**1枚ずつ**送ってください。返ってきた `key` を集めて、登録時に `image_keys` で渡します。

```
1枚 5MB まで
1カード 3枚まで
画像ファイルのみ
```

### 職人プロフィール / 自分のカード管理

```
GET    /api/introduce/artisan/mine    自分のカード一覧
GET    /api/introduce/artisan/:id     1件（修正フォーム用）
PUT    /api/introduce/artisan/:id     修正
DELETE /api/introduce/artisan/:id     削除
```

**他人のカードは 404 になります。**403 ではありません。

---

## 3. まだ無いもの

**画面（HTML）はバックエンド側で作っていません。**
`/user` `/artisan` `/login` `/register` などのパスは**空けてあります。**

`/dev/search` に検索の確認用画面がありますが、**これは動作確認用で成果物ではありません。**
見た目を参考にする必要はありません。**デザインはそちらの担当です。**

以下は今回作っていません。
```
評価・レビュー
スワイプのアニメーション（画面側の担当）
工房見学・体験の申し込み
```

---

## 4. 困ったときに最初に見るところ

**全部401になる**
→ ログインしていないか、別オリジンから叩いています。`GET /api/auth/me` で確認。

**あいまい検索が0件**
→ 埋め込みが作られていない可能性。`GET /api/search/status` で
`embedded` が `total` と同じか確認（バックエンド側の作業）。

**日本語が化ける**
→ `Content-Type: application/json` を付けているか確認。

**カードが1枚も出ない**
→ `GET /api/search/status` の `total` が 0 ならDBが空です。

---

## 5. 要望があれば言ってください

**レスポンスに足りない項目があれば足します。**画面を作ってみて
「この情報が無いと組めない」が出たら、遠慮なく言ってください。

いま特に決めきれていないのは次の2つです。

- `/next` で同じカードが連続で出る件 → **`exclude` パラメータが既にあります。**

```
GET /api/introduce/user/next?exclude=id1,id2,...   最大500件まで
```

見たカードのIDをJS側で貯めて、カンマ区切りで渡してください（除外後の候補が
0件になった場合だけ、フォールバックで全体から選び直します）。バックエンド側の
追加実装は不要です。

実測（ローカル、カード30枚弱）：
```
exclude 無し・8回連続   → 同じカードが1回重複（想定通り）
exclude あり・6回連続   → 重複ゼロ
```
- 検索クエリが日本語のみの件（表示言語は `lang=en` で対応済み。クエリそのものの英語対応は作業中）
