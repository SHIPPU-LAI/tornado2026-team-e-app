-- 【重要】このファイルは紹介機能が作る cards テーブルの写しです。
-- ローカルで検索機能だけを動かすために置いてあります。
--
-- 統合時はこのマイグレーションを持ち込まないでください。
-- cards は introduce-artisan 側が作るものです。
-- 検索側が持ち込むのは 0002_search.sql だけです。

create table if not exists cards (
  id           TEXT primary key,
  artisan_id   TEXT,
  name         TEXT not null,   -- 伝統名（例：三味線）
  name_kana    TEXT,            -- ひらがなの読み（AI自動生成・手動修正可）
  artisan_name TEXT,
  description  TEXT,            -- AIチェック済みの3文
  image_url    TEXT,            -- 未使用
  hp_url       TEXT,
  region       TEXT,            -- 都道府県
  address      TEXT,
  history      TEXT,
  tags         TEXT,            -- カンマ区切り（最大5個）
  lang         TEXT default 'ja',
  created_at   INTEGER,
  updated_at   INTEGER
);

create index if not exists idx_cards_name   on cards(name);
create index if not exists idx_cards_region on cards(region);
