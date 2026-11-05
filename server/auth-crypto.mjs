// Cryptographic primitives for the upcoming HourRise account system.
// These functions are not connected to the production login yet. The live
// Workers runtime may reject this work factor even if Node/local tests pass.
// Verify on the actual target before enabling; never lower it silently.
const ITERATIONS = 600_000;
const encoder = new TextEncoder();
const PASSWORD_MAX_BYTES = 1024;

function toHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function fromHex(value) {
  if (typeof value !== "string" || value.length % 2 || !/^[0-9a-f]+$/i.test(value)) throw new Error("invalid encoding");
  return Uint8Array.from(value.match(/../g), (part) => Number.parseInt(part, 16));
}

function passwordBytes(password) {
  if (typeof password !== "string") throw new Error("invalid password");
  const bytes = encoder.encode(password);
  if (bytes.length === 0 || bytes.length > PASSWORD_MAX_BYTES) throw new Error("invalid password length");
  return bytes;
}

async function derivePassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", passwordBytes(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await derivePassword(password, salt, ITERATIONS);
  return `pbkdf2-sha256$${ITERATIONS}$${toHex(salt)}$${toHex(digest)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [algorithm, rounds, saltHex, digestHex, extra] = String(stored).split("$");
    const iterations = Number(rounds);
    if (algorithm !== "pbkdf2-sha256" || extra !== undefined || !Number.isSafeInteger(iterations) || iterations < ITERATIONS || iterations > 1_000_000) return false;
    const salt = fromHex(saltHex);
    const expected = fromHex(digestHex);
    if (salt.length !== 16 || expected.length !== 32) return false;
    const actual = await derivePassword(password, salt, iterations);
    // HMAC verification is provided by Web Crypto and avoids a direct string comparison.
    const key = await crypto.subtle.importKey("raw", actual, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
    const signature = await crypto.subtle.sign("HMAC", key, expected);
    return await crypto.subtle.verify("HMAC", key, signature, actual);
  } catch {
    return false;
  }
}

export function createRandomToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashToken(token) {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) throw new Error("invalid token");
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token))));
}
