// セッション署名はWeb Crypto API（crypto.subtle）で行う。
// これはNode.jsランタイムとEdgeランタイム（middleware）の両方で動作するため、
// このファイルはNode専用API（node:cryptoのscrypt等）に依存させないこと。
// パスワードハッシュ化は @/lib/password（Node専用）を参照。

export const SESSION_COOKIE_NAME = "miyadai_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180日
export const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS;

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(userId: string): Promise<string> {
  const payload = JSON.stringify({ uid: userId, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 });
  const payloadB64 = base64url(payload);
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${base64url(sig)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  try {
    const key = await hmacKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlDecode(sig).buffer as ArrayBuffer,
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64))) as {
      uid: string;
      exp: number;
    };
    if (payload.exp < Date.now()) return null;
    return payload.uid;
  } catch {
    return null;
  }
}
