import { hashPassword, verifyPassword } from "./auth-crypto.mjs";

// This placeholder deliberately has the same cost as a real password check.
// It is public test data and must never correspond to a real account.
const DUMMY_HASH = "pbkdf2-sha256$600000$242b35801e4e9fa73617f1ec56a55ced$8cd3d5c7d81ab5b4fb06272ccb02ac14674a5a373b66d43d33e9f46ba974e653";

export function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function validNewPassword(value) {
  return typeof value === "string" && Array.from(value).length >= 12 && new TextEncoder().encode(value).length <= 1024;
}

// These internal helpers must only be called after persistent rate limiting.
// HTTP handlers must return the same public result for duplicate registrations.
export async function registerAccount(db, emailInput, password, now = Date.now()) {
  const email = normalizeEmail(emailInput);
  if (!email || !validNewPassword(password) || !Number.isSafeInteger(now)) throw new Error("Invalid registration");
  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();
  const timestamp = new Date(now).toISOString();
  const result = await db.prepare("INSERT INTO hourrise_auth_accounts (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING")
    .bind(id, email, passwordHash, timestamp, timestamp).run();
  return result?.meta?.changes === 1 ? { id, email } : null;
}

export async function authenticateAccount(db, emailInput, password) {
  const email = normalizeEmail(emailInput);
  const row = email ? await db.prepare("SELECT id, email, password_hash, email_verified_at, disabled_at FROM hourrise_auth_accounts WHERE email = ? COLLATE NOCASE").bind(email).first() : null;
  const matches = await verifyPassword(password, row?.password_hash || DUMMY_HASH);
  if (!matches || !row || !row.email_verified_at || row.disabled_at) return null;
  return { id: row.id, email: row.email };
}
