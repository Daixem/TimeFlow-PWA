import { scryptSync, timingSafeEqual } from "node:crypto";

// OWASP's scrypt setting for environments without Argon2id. The production
// Worker was checked with these exact parameters before this was enabled.
const COST = { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 };
const PASSWORD_MAX_BYTES = 1024;

function passwordBytes(password) {
  if (typeof password !== "string") throw new Error("invalid password");
  const bytes = new TextEncoder().encode(password);
  if (!bytes.length || bytes.length > PASSWORD_MAX_BYTES) throw new Error("invalid password length");
  return bytes;
}

function toHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = scryptSync(passwordBytes(password), salt, 32, COST);
  return `scrypt$${COST.N}$${COST.r}$${COST.p}$${toHex(salt)}$${toHex(digest)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const parts = String(stored).split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt" || Number(parts[1]) !== COST.N || Number(parts[2]) !== COST.r || Number(parts[3]) !== COST.p) return false;
    if (!/^[0-9a-f]{32}$/i.test(parts[4]) || !/^[0-9a-f]{64}$/i.test(parts[5])) return false;
    const expected = Buffer.from(parts[5], "hex");
    const actual = scryptSync(passwordBytes(password), Buffer.from(parts[4], "hex"), 32, COST);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createRandomToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashToken(token) {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) throw new Error("invalid token");
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
}
