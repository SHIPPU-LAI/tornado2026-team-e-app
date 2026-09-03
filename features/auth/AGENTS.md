# ログイン機能 ── AIへの指示

**まずリポジトリ直下の [AGENTS.md](../../AGENTS.md) を読んでください。**

## あなたが触っていい場所

```
features/auth/     ← ここだけ
```

## いまの状態

**実装済みです。**担当者未定・未着手だった時点の記述は実態と合わなくなったため、
このファイルとREADME.mdを書き直した（2026-09-03）。

```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me       ← requireAuth（/api/auth/me だけに限定。"*"では登録しない）
GET  /dev/login          動作確認用の画面（成果物ではない）
```

詳細（テーブル定義、パスワード条件、Cookieの設定など）は
[README.md](./README.md) と `docs/設計書.md` 4章を参照してください。

## 登録機能について

`features/register/` は削除した。登録はこの機能に含まれている
（要件定義書3-4のとおり最小限にするため）。**新たに `features/register/` を
作り直さないこと。**

## 既存の実装への影響

紹介機能の仕様書には、こう書かれていた。

```
認証機構（現状は artisan_id / user_id をクエリ・body で直接受け渡す簡易実装、
USER_ID = 'test' 固定）
```

この機能を実装したことで、`features/introduce/` 側は `artisan_id` を
セッションから取るように変更済み（クエリ・bodyでは受け取らない。なりすまし防止）。
