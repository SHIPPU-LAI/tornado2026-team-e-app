-- 設計書 1-2, 1-3 のとおり。
-- cards / card_embedding / synonym には触らない（既存所有テーブル）。

-- 記事単位のいいね
create table if not exists likes (
  id         integer primary key autoincrement,
  user_id    text not null,
  card_id    text not null,
  created_at integer not null,
  unique(user_id, card_id)          -- 二重いいねを DB で防ぐ
);
create index if not exists idx_likes_user on likes(user_id);
create index if not exists idx_likes_card on likes(card_id);

-- 利用者・職人
create table if not exists users (
  id            text primary key,          -- uuid
  email         text not null unique,
  password_hash text not null,             -- PBKDF2-SHA256
  password_salt text not null,
  role          text not null,             -- 'artisan' | 'user'
  display_name  text,
  created_at    integer not null
);

-- ログインセッション
create table if not exists sessions (
  token      text primary key,             -- 乱数32バイトのhex
  user_id    text not null,
  expires_at integer not null
);
create index if not exists idx_sessions_user on sessions(user_id);

-- 住所の緯度経度（cards に列を足さないための外出し）
create table if not exists card_geo (
  card_id    text primary key,
  lat        real not null,
  lng        real not null,
  source     text,                          -- 'zipcloud' | 'nominatim' | 'map_click'
  updated_at integer not null
);

-- 画像（KV に実体、D1 にキーだけ）
create table if not exists card_images (
  id         integer primary key autoincrement,
  card_id    text not null,
  image_key  text not null,                 -- KV上のキー card-image:{uuid}
  sort_order integer not null,              -- 0..2
  created_at integer not null
);
create index if not exists idx_card_images on card_images(card_id, sort_order);

-- カードの多言語版（cards に列を足さないための外出し）
create table if not exists card_i18n (
  card_id     text not null,
  lang        text not null,               -- 'en' など。'ja' は cards 本体
  name        text,
  description text,
  updated_at  integer not null,
  primary key (card_id, lang)
);
