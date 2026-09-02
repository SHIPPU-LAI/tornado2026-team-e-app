# CLAUDE.md

**このプロジェクトの作業ルールは [AGENTS.md](./AGENTS.md) にあります。まずそちらを読んでください。**

要点だけ再掲します。

- **動かすのは `npm install` → `npm run setup` → `npm run dev`。**
  ブラウザで http://127.0.0.1:8787
- **自分の担当ディレクトリの中だけを変更する。** `src/index.js` と `migrations/` は共有
- **他の機能が所有するテーブルに列を足さない。** 必要なものは自分の新テーブルに外出しする
- **既存のマイグレーションを書き換えない。** 新規追加のみ。
  ファイル名は `YYYYMMDDHHMM_<機能>_<内容>.sql`（連番だと4人で衝突する）
- **`dev-schema/` と `seeds/` を `migrations/` に移さない。**
  `seeds/local_seed.sql` には `delete from cards;` が入っていて、
  `--remote` で流すと本番のカードが消える
- **決まっていないことを勝手に決めない。** README.md の「未決事項」を確認し、
  埋めたくなったら人間に聞く
- **Google Maps API は使わない**（チーム方針）。地図は OpenStreetMap
- 実装の手本は `features/search/`
