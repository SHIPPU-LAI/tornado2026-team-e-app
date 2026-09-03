# ログイン機能

**旧README（担当者未定・未着手だった時点のもの）は実態と大きくずれていたため書き直した。**
バックエンド3人のうち2人（髙橋さん・飯室さん）と連絡が取れなくなり、
2026-09-03、もう戻ってこない想定になった。ログイン機能の担当も決まらないまま
だったため、このリポジトリの中で紹介機能と合わせて実装した。

## いまの状態

実装済み。

```
features/auth/
├ index.js        signup / login / logout / me
├ crypto.js       PBKDF2-SHA256（反復回数はgemini-flash-lite-latestと同じ
│                  「実測して決める」方針で10,000回に確定。設計書4-1参照）
├ password.js     パスワードの条件（最小12文字、上位パスワード・
│                  メールアドレス同一文字列の拒否）
├ session.js      セッション（Cookie）
└ ui.js           /dev/login（動作確認用。成果物ではない）
```

## 持つパス

```
POST /api/auth/signup    { email, password, role, display_name } → Cookie + { user }
POST /api/auth/login     { email, password }                     → Cookie + { user }
POST /api/auth/logout                                             → Cookie削除
GET  /api/auth/me        ← requireAuth（/api/auth/me だけに限定。"*"では登録しない）
GET  /dev/login           動作確認用の画面
```

`/login` `/register` はフロントエンド担当のために空けてある。占有していない。

## 認証方式

セッション方式（JWTは使わない。失効させられないため）。乱数32バイトのhexを
`sessions` に保存し、`Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax; Path=/`
で返す。詳細は設計書4章。

## 所有するテーブル

```
users       id, email, password_hash, password_salt, role, display_name, created_at
sessions    token, user_id, expires_at
```

## 職人とユーザーの区別

`users.role` が `'artisan'`（職人） / `'user'`（一般）を持つ。分けるのはロールのみで、
テーブルは分けていない。

## 登録機能との統合

**`features/register/` は削除した。**登録は最初からこの機能（`features/auth/`）に
含めている（要件定義書3-4のとおり最小限にするため、分ける意味がなかった）。

`features/register/` のスタブは、担当者が戻ってくる可能性に備えて当初は
残していたが、2026-09-03にその前提が崩れたため削除した。スタブが本番の
`/register`（フロントエンドのサインアップ画面用パス）を塞いでいたことも
削除の理由の一つ。経緯は `docs/設計書.md` 8-3 を参照。

## パスワードの条件

- 最小12文字。最大は制限しない
- 文字種の強制はしない（大文字・数字・記号を必須にしない。NIST現行ガイドライン準拠）
- 前後の空白もパスワードの一部として扱う（trimしない）
- よくあるパスワード・メールアドレスと同一の文字列は拒否する

詳細は `password.js` と設計書4-1-bを参照。

## 紹介機能の仕様書との関係

紹介機能の仕様書には
「認証機構（現状は artisan_id / user_id をクエリ・body で直接受け渡す簡易実装、
USER_ID = 'test' 固定）」と未実装である旨の記載があった。この機能を実装したことで、
`features/introduce/` 側は `artisan_id` をクエリ・bodyではなくセッションから
取るようにしてある（なりすまし防止）。
