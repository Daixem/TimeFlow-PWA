// Recovery-code building blocks. Not connected to a public endpoint yet.
import { hashPassword } from "./auth-crypto.mjs";
import { validNewPassword } from "./auth-accounts.mjs";
const utf8 = new TextEncoder();
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function randomCode() {
  // Rejection sampling avoids favouring any particular code.
  const max = Math.floor(0x100000000 / 100000000) * 100000000;
  const words = new Uint32Array(1);
  do { crypto.getRandomValues(words); } while (words[0] >= max);
  return String(words[0] % 100000000).padStart(8, "0");
}

async function verifier(pepper, challengeId, purpose, code) {
  if (typeof pepper !== "string" || utf8.encode(pepper).length < 32) throw new Error("Recovery key is not configured");
  const key = await crypto.subtle.importKey("raw", utf8.encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, utf8.encode(JSON.stringify([challengeId, purpose, code])));
  return Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, "0")).join("");
}

async function issueCode(db, accountId, purpose, pepper, now) {
  if (!accountId || !Number.isSafeInteger(now)) throw new Error("Invalid recovery request");
  const challengeId = crypto.randomUUID();
  const code = randomCode();
  const digest = await verifier(pepper, challengeId, purpose, code);
  const created = new Date(now).toISOString();
  const expires = new Date(now + CODE_TTL_MS).toISOString();
  // D1 batch executes sequentially as one transaction.
  await db.batch([
    db.prepare("UPDATE hourrise_auth_challenges SET revoked_at = ? WHERE account_id = ? AND purpose = ? AND used_at IS NULL AND revoked_at IS NULL").bind(created, accountId, purpose),
    db.prepare("INSERT INTO hourrise_auth_challenges (id, account_id, purpose, verifier_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)").bind(challengeId, accountId, purpose, digest, created, expires)
  ]);
  return { challengeId, code, expiresAt: expires };
}

export function issueRecoveryCode(db, accountId, pepper, now = Date.now()) {
  return issueCode(db, accountId, "reset_password", pepper, now);
}

export function issueEmailVerificationCode(db, accountId, pepper, now = Date.now()) {
  return issueCode(db, accountId, "verify_email", pepper, now);
}

// Call only after applying persistent IP and account rate limits.
export async function completeEmailVerification(db, accountId, challengeId, code, pepper, now = Date.now()) {
  if (!accountId || typeof challengeId !== "string" || !/^[0-9a-f-]{36}$/i.test(challengeId) || typeof code !== "string" || !/^\d{8}$/.test(code) || !Number.isSafeInteger(now)) return false;
  const purpose = "verify_email";
  const digest = await verifier(pepper, challengeId, purpose, code);
  const timestamp = new Date(now).toISOString();
  const nonce = crypto.randomUUID();
  const results = await db.batch([
    db.prepare("UPDATE hourrise_auth_challenges SET attempts = attempts + 1, used_at = CASE WHEN verifier_hash = ? THEN ? ELSE NULL END, consumption_nonce = CASE WHEN verifier_hash = ? THEN ? ELSE NULL END WHERE id = ? AND account_id = ? AND purpose = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ? AND attempts < ? AND EXISTS (SELECT 1 FROM hourrise_auth_accounts WHERE id = ? AND email_verified_at IS NULL AND disabled_at IS NULL)")
      .bind(digest, timestamp, digest, nonce, challengeId, accountId, purpose, timestamp, MAX_ATTEMPTS, accountId),
    db.prepare("UPDATE hourrise_auth_accounts SET email_verified_at = ?, updated_at = ? WHERE id = ? AND email_verified_at IS NULL AND EXISTS (SELECT 1 FROM hourrise_auth_challenges WHERE id = ? AND account_id = ? AND consumption_nonce = ?)")
      .bind(timestamp, timestamp, accountId, challengeId, accountId, nonce),
    db.prepare("UPDATE hourrise_auth_challenges SET revoked_at = ? WHERE account_id = ? AND purpose = ? AND used_at IS NULL AND revoked_at IS NULL AND EXISTS (SELECT 1 FROM hourrise_auth_challenges WHERE id = ? AND account_id = ? AND consumption_nonce = ?)")
      .bind(timestamp, accountId, purpose, challengeId, accountId, nonce)
  ]);
  return results?.[1]?.meta?.changes === 1;
}

// Call only after applying persistent IP and account rate limits.
export async function completePasswordReset(db, accountId, challengeId, code, newPassword, pepper, now = Date.now()) {
  if (!accountId || typeof challengeId !== "string" || !/^[0-9a-f-]{36}$/i.test(challengeId) || typeof code !== "string" || !/^\d{8}$/.test(code) || !validNewPassword(newPassword) || !Number.isSafeInteger(now)) return false;
  const purpose = "reset_password";
  const digest = await verifier(pepper, challengeId, purpose, code);
  const timestamp = new Date(now).toISOString();
  const passwordHash = await hashPassword(newPassword);
  const nonce = crypto.randomUUID();
  // The unpredictable nonce prevents another request from reusing a code,
  // including requests arriving in the same millisecond. D1 batch makes the
  // code consumption, password update, and session revocation one transaction.
  const results = await db.batch([
    db.prepare("UPDATE hourrise_auth_challenges SET attempts = attempts + 1, used_at = CASE WHEN verifier_hash = ? THEN ? ELSE NULL END, consumption_nonce = CASE WHEN verifier_hash = ? THEN ? ELSE NULL END WHERE id = ? AND account_id = ? AND purpose = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ? AND attempts < ? AND EXISTS (SELECT 1 FROM hourrise_auth_accounts WHERE id = ? AND email_verified_at IS NOT NULL AND disabled_at IS NULL)")
      .bind(digest, timestamp, digest, nonce, challengeId, accountId, purpose, timestamp, MAX_ATTEMPTS, accountId),
    db.prepare("UPDATE hourrise_auth_accounts SET password_hash = ?, updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM hourrise_auth_challenges WHERE id = ? AND account_id = ? AND consumption_nonce = ?)")
      .bind(passwordHash, timestamp, accountId, challengeId, accountId, nonce),
    db.prepare("UPDATE hourrise_auth_sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL AND EXISTS (SELECT 1 FROM hourrise_auth_challenges WHERE id = ? AND account_id = ? AND consumption_nonce = ?)")
      .bind(timestamp, accountId, challengeId, accountId, nonce),
    db.prepare("UPDATE hourrise_auth_challenges SET revoked_at = ? WHERE account_id = ? AND used_at IS NULL AND revoked_at IS NULL AND EXISTS (SELECT 1 FROM hourrise_auth_challenges WHERE id = ? AND account_id = ? AND consumption_nonce = ?)")
      .bind(timestamp, accountId, challengeId, accountId, nonce)
  ]);
  return results?.[1]?.meta?.changes === 1;
}
