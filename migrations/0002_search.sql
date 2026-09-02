-- 検索機能が追加するテーブル。統合時に持ち込むのはこのファイルだけです。
-- 既存の cards テーブルには一切触りません（読むだけ）。

-- 埋め込みベクトル。cards に列を足すと向こうのマイグレーションと衝突するので、
-- 別テーブルに外出しする。登録時に1回だけ生成して入れる。
create table if not exists card_embedding (
  card_id    TEXT primary key,
  vector     TEXT not null,     -- JSON配列（D1にベクトル型が無いため）
  model      TEXT not null,
  updated_at INTEGER not null
);

-- シノニム辞書。検索語をタグへ展開するための対応表。
-- 事前に用意しておくので、検索時のAI呼び出しはゼロ。
create table if not exists synonym (
  term    TEXT not null,   -- 利用者が入れる語（例：涼しげ）
  maps_to TEXT not null,   -- 展開先のタグ（例：夏）
  weight  REAL not null default 1.0,
  primary key (term, maps_to)
);

create index if not exists idx_synonym_term on synonym(term);
