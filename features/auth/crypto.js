// パスワードハッシュ（設計書4-1）。WebCrypto の PBKDF2-SHA256。外部ライブラリは使わない
// （Workers で動く保証を確かめる時間がないため）。

// 【重要】Workers 無料プランは CPU 10ms/リクエスト。
// 大きくすると本番の signup / login だけが落ちる
// （ローカルの wrangler dev では CPU 制限が効かないので再現しない）。
// OWASP推奨は60万回だが、この制約のため10,000回に確定した（設計書4-1）。
// 上げるとCPU時間を使い切って本番だけ落ちるので、良かれと思って増やさないこと。
const PBKDF2_ITERATIONS = 10000;
const HASH_BITS = 256;
const SALT_BYTES = 16;

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function derive(password, saltBytes) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    HASH_BITS,
  );
  return toHex(bits);
}

export async function hashPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const salt = toHex(saltBytes);
  const hash = await derive(password, saltBytes);
  return { hash, salt };
}

export async function verifyPassword(password, saltHex, hashHex) {
  const computed = await derive(password, fromHex(saltHex));
  return computed === hashHex;
}
