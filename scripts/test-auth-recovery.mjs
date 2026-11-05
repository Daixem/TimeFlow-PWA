import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { issueRecoveryCode, completePasswordReset, issueEmailVerificationCode, completeEmailVerification } from "../server/auth-recovery.mjs";
import { verifyPassword } from "../server/auth-crypto.mjs";

const sqlite = new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys = ON");
sqlite.exec(readFileSync(new URL("../drizzle/0011_hourrise_auth.sql", import.meta.url), "utf8"));
sqlite.prepare("INSERT INTO hourrise_auth_accounts (id,email,password_hash,email_verified_at,created_at,updated_at) VALUES (?,?,?,?,?,?)").run("test-user", "test@example.test", "not-a-real-password", "2026-01-01", "2026-01-01", "2026-01-01");
sqlite.prepare("INSERT INTO hourrise_auth_accounts (id,email,password_hash,created_at,updated_at) VALUES (?,?,?,?,?)").run("new-user", "new@example.test", "not-a-real-password", "2026-01-01", "2026-01-01");
const db = {
  prepare(sql) {
    return { bind(...params) { return { sql, params, first: async () => sqlite.prepare(sql).get(...params) }; } };
  },
  async batch(statements) {
    sqlite.exec("BEGIN");
    try { const results = statements.map(s => ({ meta: { changes: Number(sqlite.prepare(s.sql).run(...s.params).changes) } })); sqlite.exec("COMMIT"); return results; }
    catch (error) { sqlite.exec("ROLLBACK"); throw error; }
  }
};
const pepper = "A long randomly generated key for testing only.";
const now = Date.parse("2026-11-06T12:00:00.000Z");
const issue = () => issueRecoveryCode(db, "test-user", pepper, now);
const password = "Ein neues sicheres Passwort";
const consume = (item, code = item.code, at = now) => completePasswordReset(db, "test-user", item.challengeId, code, password, pepper, at);
let a = await issue();
assert.match(a.code, /^\d{8}$/);
assert.notEqual(sqlite.prepare("SELECT verifier_hash FROM hourrise_auth_challenges WHERE id = ?").get(a.challengeId).verifier_hash, a.code);
sqlite.prepare("INSERT INTO hourrise_auth_sessions (token_hash,account_id,created_at,expires_at) VALUES (?,?,?,?)").run("session", "test-user", "2026-01-01", "2027-01-01");
assert.equal(await consume(a), true);
assert.equal(await verifyPassword(password, sqlite.prepare("SELECT password_hash FROM hourrise_auth_accounts WHERE id = ?").get("test-user").password_hash), true);
assert.ok(sqlite.prepare("SELECT revoked_at FROM hourrise_auth_sessions WHERE token_hash = ?").get("session").revoked_at);
assert.equal(await consume(a), false, "a used code must not be usable twice");
let b = await issue();
let c = await issue();
assert.equal(await consume(b), false, "a new code revokes the previous one");
assert.equal(await consume(c, c.code, now + 600_000), false, "an expired code must not work");
let d = await issue();
const wrong = d.code === "00000000" ? "11111111" : "00000000";
for (let i = 0; i < 5; i++) assert.equal(await consume(d, wrong), false);
assert.equal(await consume(d), false, "too many incorrect attempts must block the code");
await assert.rejects(() => issueRecoveryCode(db, "test-user", "short", now));
const verification = await issueEmailVerificationCode(db, "new-user", pepper, now);
assert.equal(await completeEmailVerification(db, "new-user", verification.challengeId, "11111111" === verification.code ? "22222222" : "11111111", pepper, now), false);
assert.equal(await completeEmailVerification(db, "new-user", verification.challengeId, verification.code, pepper, now), true);
assert.ok(sqlite.prepare("SELECT email_verified_at FROM hourrise_auth_accounts WHERE id = ?").get("new-user").email_verified_at);
assert.equal(await completeEmailVerification(db, "new-user", verification.challengeId, verification.code, pepper, now), false);
console.log("HourRise recovery codes: passed");
