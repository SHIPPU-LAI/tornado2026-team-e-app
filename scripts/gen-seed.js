// scripts/seed-data.js と features/search/synonyms.js から
// seeds/local_seed.sql を生成する。
// 手でSQLに書き写すと必ずずれるので、機械的に作る。
//
//   node scripts/gen-seed.js
//
// 【重要】これはローカル開発専用。中身に `delete from cards;` が入っている。
// migrations/ には絶対に置かない（--remote で流すと本番データが消える）。
// 適用は `npm run seed:apply` から。

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { cards } from "./seed-data.js";
import { SYNONYMS } from "../features/search/synonyms.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const q = (v) =>
  v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`;

// 固定値。Date.now() だと再生成のたび全行が差分になり、毎回コンフリクトする。
const now = 1788346810738;

const lines = [
  "-- 自動生成。手で編集しないこと。",
  "-- 再生成: node scripts/gen-seed.js",
  "--",
  "-- ローカル開発用のシード。本番では適用しない（cards は紹介機能が持つ）。",
  "",
  "delete from synonym;",
  "delete from card_embedding;",
  "delete from cards;",
  "",
];

const COLS =
  "id, artisan_id, name, name_kana, artisan_name, description, " +
  "hp_url, region, address, history, tags, lang, created_at, updated_at";

for (const c of cards) {
  lines.push(
    `insert into cards (${COLS}) values (` +
      [
        q(c.id),
        q(c.artisan_id),
        q(c.name),
        q(c.name_kana),
        q(c.artisan_name),
        q(c.description),
        q(c.hp_url),
        q(c.region),
        q(c.address),
        q(c.history),
        q(c.tags),
        q(c.lang || "ja"),
        now,
        now,
      ].join(", ") +
      ");",
  );
}
lines.push("");

lines.push("-- シノニム辞書（検索機能が使う）");
for (const [term, targets] of Object.entries(SYNONYMS)) {
  for (const t of targets) {
    lines.push(`insert into synonym (term, maps_to) values (${q(term)}, ${q(t)});`);
  }
}
lines.push("");

const out = join(__dirname, "..", "seeds", "local_seed.sql");
writeFileSync(out, lines.join("\n"), "utf-8");

const synCount = Object.values(SYNONYMS).reduce((a, v) => a + v.length, 0);
console.log(`生成しました: ${out}\n  cards ${cards.length} 件 / synonym ${synCount} 件`);
