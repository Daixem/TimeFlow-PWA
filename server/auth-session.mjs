import { createRandomToken, hashToken } from "./auth-crypto.mjs";

const COOKIE = "__Host-hourrise_session";
const SESSION_SECONDS = 30 * 24 * 60 * 60;

function tokenFromRequest(request) {
  const values = (request.headers.get("Cookie") || "").split(";").map(part => part.trim());
  const matches = values.filter(part => part.startsWith(COOKIE + "="));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(COOKIE.length + 1);
  return /^[0-9a-f]{64}$/.test(token) ? token : null;
}

export async function createSession(db, accountId, now = Date.now()) {
  if (!accountId || !Number.isSafeInteger(now)) throw new Error("Invalid session request");
  const token = createRandomToken();
  const tokenHash = await hashToken(token);
  const created = new Date(now).toISOString();
  const expires = new Date(now + SESSION_SECONDS * 1000).toISOString();
  const result = await db.prepare("INSERT INTO hourrise_auth_sessions (token_hash, account_id, created_at, expires_at) SELECT ?, id, ?, ? FROM hourrise_auth_accounts WHERE id = ? AND email_verified_at IS NOT NULL AND disabled_at IS NULL")
    .bind(tokenHash, created, expires, accountId).run();
  if (result?.meta?.changes !== 1) throw new Error("Account cannot sign in");
  return `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; Secure; HttpOnly; SameSite=Strict`;
}

export async function readSession(db, request, now = Date.now()) {
  const token = tokenFromRequest(request);
  if (!token || !Number.isSafeInteger(now)) return null;
  const tokenHash = await hashToken(token);
  const row = await db.prepare("SELECT a.id, a.email FROM hourrise_auth_sessions s JOIN hourrise_auth_accounts a ON a.id = s.account_id WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ? AND a.email_verified_at IS NOT NULL AND a.disabled_at IS NULL")
    .bind(tokenHash, new Date(now).toISOString()).first();
  return row ? { id: row.id, email: row.email } : null;
}

export async function revokeSession(db, request, now = Date.now()) {
  const token = tokenFromRequest(request);
  if (token) await db.prepare("UPDATE hourrise_auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL").bind(new Date(now).toISOString(), await hashToken(token)).run();
  return `${COOKIE}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`;
}

export async function revokeAllSessions(db, accountId, now = Date.now()) {
  await db.prepare("UPDATE hourrise_auth_sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL").bind(new Date(now).toISOString(), accountId).run();
}
