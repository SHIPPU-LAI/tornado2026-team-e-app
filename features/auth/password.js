// パスワードの条件（設計書4-1-b）。
//
// NIST の現行ガイドラインが composition rules（大文字・数字・記号の強制）を
// 廃止しているため、ここでも強制しない。強制すると「Password1!」のような、
// 規則は満たすが弱いパスワードを誘発する。
//
// 前後の空白は削らない（パスワードの一部として扱う。index.js 側でも trim しないこと）。

export const MIN_PASSWORD_LENGTH = 12;

// よくある英語パスワードと、このプロジェクトで打たれそうな語をまとめた
// 実用上のブロックリスト。「上位100件データセット」そのものの取り込みではなく、
// 代表的なものをまとめたもの。
const COMMON_PASSWORDS = [
  "password", "password1", "password123", "password1234", "passwordpassword", "p@ssw0rd", "passw0rd",
  "123456", "1234567", "12345678", "123456789", "1234567890", "12345678910",
  "111111", "11111111", "22222222", "33333333", "44444444", "55555555",
  "66666666", "77777777", "88888888", "99999999", "000000", "00000000",
  "123123", "121212", "121212121212", "1q2w3e4r", "1qaz2wsx", "qazwsx", "zaq12wsx",
  "qwerty", "qwerty123", "qwerty1234", "qwertyuiop", "asdfghjkl", "asdf1234",
  "asdfasdf", "zxcvbnm", "zxcv1234", "abc123", "abcabcabc",
  "aaaaaaaa", "aaaaaaaaaaaa", "bbbbbbbb",
  "iloveyou", "iloveyou1", "letmein", "letmein123", "welcome", "welcome1",
  "monkey", "dragon", "dragon123", "master", "master123", "login",
  "princess", "princess1", "solo", "starwars", "football", "football1",
  "baseball", "baseball1", "shadow", "michael", "jennifer", "superman",
  "batman", "trustno1", "freedom", "whatever", "sunshine", "hunter2",
  "secret123", "secretsecret", "changeme", "changeme123", "default",
  "guest", "guest1234", "test1234", "testtest", "admin", "admin123",
  "administrator", "root1234",
  "tornado2026", "tornado2025", "teame", "teame2026", "teameapp",
  "teame1234", "teame12345", "teamehackathon", "hackathon2026",
  "wajimanuri", "wajimapass", "traditional123", "artisan1234", "introduce123",
];

const COMMON_PASSWORDS_LOWER = new Set(COMMON_PASSWORDS.map((p) => p.toLowerCase()));

export function validatePassword(password, email) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: `パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてください` };
  }
  if (COMMON_PASSWORDS_LOWER.has(password.toLowerCase())) {
    return { ok: false, reason: "よく使われすぎているパスワードです" };
  }
  if (email && password.toLowerCase() === email.toLowerCase()) {
    return { ok: false, reason: "メールアドレスと同じ文字列は使えません" };
  }
  return { ok: true };
}
