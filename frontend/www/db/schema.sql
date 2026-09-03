-- ============================================
-- schema.sql
-- Cloudflare D1（SQLite）用スキーマ
-- 実行例:
--   wrangler d1 execute crafts-db --local --file=db/schema.sql
--   wrangler d1 execute crafts-db --remote --file=db/schema.sql
-- ============================================

CREATE TABLE IF NOT EXISTS crafts (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT NOT NULL,
  region             TEXT NOT NULL,
  category           TEXT NOT NULL,
  era                TEXT NOT NULL,
  teaser             TEXT NOT NULL,
  description        TEXT NOT NULL,
  tags               TEXT NOT NULL DEFAULT '[]',   -- JSON配列文字列 例: '["伝統工芸品指定"]'
  image_url          TEXT,                          -- 実写画像URL。未設定ならフロント側でCSSグラデーションにフォールバック
  likes              INTEGER NOT NULL DEFAULT 0,
  craftsmen_count    INTEGER NOT NULL DEFAULT 0,
  duration           TEXT NOT NULL DEFAULT '',
  craftsman_name     TEXT NOT NULL DEFAULT '',
  craftsman_workshop TEXT NOT NULL DEFAULT '',
  sort_order         INTEGER NOT NULL DEFAULT 0
);

INSERT INTO crafts
  (name, region, category, era, teaser, description, tags, likes, craftsmen_count, duration, craftsman_name, craftsman_workshop, sort_order)
VALUES
  ('南部鉄器 鉄瓶', '岩手県', '金工', '江戸時代',
   '職人が一つ一つ手作業で仕上げる、丈夫で長く使える鉄瓶です。',
   '南部鉄器は、砂と粘土を混ぜた鋳型に鉄を流し込んでかたちづくる伝統的な鋳物です。表面に浮かぶ細やかな「霰（あられ）」模様は、ひとつひとつ職人の手作業で型に打ち込まれています。',
   '["伝統工芸品指定","経年変化を楽しむ"]', 128, 3, '約3週間', '佐藤 一輝', '江刺鋳造工房', 1),

  ('有田焼 染付皿', '佐賀県', '陶磁器', '江戸時代',
   '透明感のある白磁に、繊細な絵付けが映える器です。',
   '有田焼は、透き通るように白い磁肌に呉須で絵付けをした焼き物です。図案の一筆一筆に職人の呼吸が宿り、同じ柄でも一枚ごとに表情が変わります。',
   '["伝統工芸品指定","手描き絵付け"]', 96, 5, '約1ヶ月', '中村 陶子', '有田窯元 中村工房', 2),

  ('京友禅 反物', '京都府', '染織', '平安時代',
   '幾重にも色を重ねる、華やかな染めの技法です。',
   '京友禅は、糊で防染しながら何色もの染料を重ねていく染色技法です。花鳥風月をあらわした図柄は、下絵から仕上げまで多くの工程を経てようやく一反の反物になります。',
   '["伝統工芸品指定","多工程の分業"]', 84, 4, '約2ヶ月', '西村 紅葉', '西村染工', 3),

  ('江戸切子 グラス', '東京都', 'ガラス工芸', '江戸時代',
   '光を受けてきらめく、精緻なカットが魅力のガラスです。',
   '江戸切子は、色を被せたガラスに刃を当てて模様を彫り出す切子細工です。光の入り方によって表情を変える文様は、熟練の職人の手加減ひとつで美しさが決まります。',
   '["伝統工芸品指定","光を纏うガラス細工"]', 112, 2, '約2週間', '小林 硝子', '小林切子工房', 4),

  ('讃岐漆器 盆', '香川県', '漆芸', '江戸時代',
   '塗り重ねるほどに艶を増す、暮らしになじむ漆器です。',
   '讃岐漆器は、木地に何度も漆を塗り重ねて仕上げる漆芸です。使うほどに艶を増していく質感は、日々の暮らしの道具として長く付き合えるようつくられています。',
   '["伝統工芸品指定","塗り重ねの艶"]', 70, 3, '約1ヶ月半', '山田 漆', '讃岐漆器 山田工房', 5);