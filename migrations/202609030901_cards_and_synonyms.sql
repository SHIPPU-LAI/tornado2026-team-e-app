-- Migration number: 202609030901 	 2026-09-03T03:48:43.637Z
--
-- デプロイ前に見つかった穴を埋める（設計書1-1-b）。
--
-- 1. cards が本番に無かった。dev-schema/cards.sql は「流さない」扱いだった
--    ため、--remote で migrations を流しても紹介機能のテーブルが
--    存在せず全APIが500になる。dev-schema/cards.sql の定義をそのまま移す
-- 2. シノニム辞書78語が seeds/local_seed.sql の中にしかなかった。
--    その seed には delete from cards; が入っており本番には流せないため、
--    シノニムだけをここに独立して持ち込む

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

-- シノニム辞書78語（features/search/synonyms.js の SYNONYMS と同じ内容）。
-- synonym は primary key (term, maps_to) なので、insert or ignore にすることで
-- 既にローカルの seed を流し込み済みの環境に適用しても主キー衝突で落ちない。
insert or ignore into synonym (term, maps_to) values ('涼しげ', '夏');
insert or ignore into synonym (term, maps_to) values ('涼しげ', 'ガラス');
insert or ignore into synonym (term, maps_to) values ('涼しげ', '竹');
insert or ignore into synonym (term, maps_to) values ('涼しい', '夏');
insert or ignore into synonym (term, maps_to) values ('涼しい', 'ガラス');
insert or ignore into synonym (term, maps_to) values ('涼しい', '竹');
insert or ignore into synonym (term, maps_to) values ('夏向き', '夏');
insert or ignore into synonym (term, maps_to) values ('暑い', '夏');
insert or ignore into synonym (term, maps_to) values ('ひんやり', 'ガラス');
insert or ignore into synonym (term, maps_to) values ('ひんやり', '夏');
insert or ignore into synonym (term, maps_to) values ('おみやげ', '贈り物');
insert or ignore into synonym (term, maps_to) values ('おみやげ', '小物');
insert or ignore into synonym (term, maps_to) values ('お土産', '贈り物');
insert or ignore into synonym (term, maps_to) values ('お土産', '小物');
insert or ignore into synonym (term, maps_to) values ('ギフト', '贈り物');
insert or ignore into synonym (term, maps_to) values ('プレゼント', '贈り物');
insert or ignore into synonym (term, maps_to) values ('記念品', '贈り物');
insert or ignore into synonym (term, maps_to) values ('普段使い', '食器');
insert or ignore into synonym (term, maps_to) values ('普段使い', '器');
insert or ignore into synonym (term, maps_to) values ('毎日使う', '食器');
insert or ignore into synonym (term, maps_to) values ('毎日使う', '器');
insert or ignore into synonym (term, maps_to) values ('音', '音が鳴る');
insert or ignore into synonym (term, maps_to) values ('音', '楽器');
insert or ignore into synonym (term, maps_to) values ('音が出る', '音が鳴る');
insert or ignore into synonym (term, maps_to) values ('音が出る', '楽器');
insert or ignore into synonym (term, maps_to) values ('鳴る', '音が鳴る');
insert or ignore into synonym (term, maps_to) values ('演奏', '楽器');
insert or ignore into synonym (term, maps_to) values ('笛', '尺八');
insert or ignore into synonym (term, maps_to) values ('笛', '竹');
insert or ignore into synonym (term, maps_to) values ('笛', '楽器');
insert or ignore into synonym (term, maps_to) values ('弦', '三味線');
insert or ignore into synonym (term, maps_to) values ('弦', '楽器');
insert or ignore into synonym (term, maps_to) values ('打楽器', '太鼓');
insert or ignore into synonym (term, maps_to) values ('打楽器', '楽器');
insert or ignore into synonym (term, maps_to) values ('黒い', '漆器');
insert or ignore into synonym (term, maps_to) values ('黒い', '沈金');
insert or ignore into synonym (term, maps_to) values ('つやつや', '漆器');
insert or ignore into synonym (term, maps_to) values ('つやつや', 'ガラス');
insert or ignore into synonym (term, maps_to) values ('光る', 'ガラス');
insert or ignore into synonym (term, maps_to) values ('光る', '金工');
insert or ignore into synonym (term, maps_to) values ('光る', '絹');
insert or ignore into synonym (term, maps_to) values ('透明', 'ガラス');
insert or ignore into synonym (term, maps_to) values ('重い', '金工');
insert or ignore into synonym (term, maps_to) values ('重い', '鉄');
insert or ignore into synonym (term, maps_to) values ('重い', '銅');
insert or ignore into synonym (term, maps_to) values ('ざらざら', '陶器');
insert or ignore into synonym (term, maps_to) values ('うつわ', '器');
insert or ignore into synonym (term, maps_to) values ('うつわ', '食器');
insert or ignore into synonym (term, maps_to) values ('うつわ', '陶器');
insert or ignore into synonym (term, maps_to) values ('お皿', '食器');
insert or ignore into synonym (term, maps_to) values ('お皿', '器');
insert or ignore into synonym (term, maps_to) values ('コップ', '器');
insert or ignore into synonym (term, maps_to) values ('コップ', '食器');
insert or ignore into synonym (term, maps_to) values ('コップ', 'ガラス');
insert or ignore into synonym (term, maps_to) values ('グラス', 'ガラス');
insert or ignore into synonym (term, maps_to) values ('グラス', '器');
insert or ignore into synonym (term, maps_to) values ('お酒', '酒器');
insert or ignore into synonym (term, maps_to) values ('酒', '酒器');
insert or ignore into synonym (term, maps_to) values ('お茶', '茶道具');
insert or ignore into synonym (term, maps_to) values ('お茶', '急須');
insert or ignore into synonym (term, maps_to) values ('紙', '和紙');
insert or ignore into synonym (term, maps_to) values ('紙', '文具');
insert or ignore into synonym (term, maps_to) values ('布', '織物');
insert or ignore into synonym (term, maps_to) values ('布', '染物');
insert or ignore into synonym (term, maps_to) values ('布', '絹');
insert or ignore into synonym (term, maps_to) values ('着物', '織物');
insert or ignore into synonym (term, maps_to) values ('着物', '帯');
insert or ignore into synonym (term, maps_to) values ('着物', '絹');
insert or ignore into synonym (term, maps_to) values ('家具', '家具');
insert or ignore into synonym (term, maps_to) values ('家具', '木工');
insert or ignore into synonym (term, maps_to) values ('かご', '竹工');
insert or ignore into synonym (term, maps_to) values ('かご', '小物');
insert or ignore into synonym (term, maps_to) values ('体験', '体験できる');
insert or ignore into synonym (term, maps_to) values ('体験', '実演');
insert or ignore into synonym (term, maps_to) values ('見学', '見学できる');
insert or ignore into synonym (term, maps_to) values ('見学', '実演');
insert or ignore into synonym (term, maps_to) values ('作ってみたい', '体験できる');
insert or ignore into synonym (term, maps_to) values ('やってみたい', '体験できる');
