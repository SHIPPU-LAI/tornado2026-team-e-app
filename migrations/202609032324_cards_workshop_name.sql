-- カードに「工房名」を表示専用の項目として追加する。
-- artisan_name（職人名）とは別の項目。AIの5問には使わない・埋め込みにも混ぜない
-- （フロント担当とのすり合わせで決定。検索結果を変えないため）。
-- 既存カードは null のまま（フロント側でフォールバックする前提）。

alter table cards add column workshop_name TEXT;
