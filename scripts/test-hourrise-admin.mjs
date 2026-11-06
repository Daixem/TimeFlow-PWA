import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../dist/server/index.js";

globalThis.crypto ??= webcrypto;
const sqlite = new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys = ON");
sqlite.exec(readFileSync(new URL("../drizzle/0011_hourrise_auth.sql", import.meta.url), "utf8"));
const db = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          first: async () => sqlite.prepare(sql).get(...args) || null,
          run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) } }),
          all: async () => ({ results: sqlite.prepare(sql).all(...args) })
        };
      },
      run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run().changes) } })
    };
  },
  async batch(statements) {
    sqlite.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push({ meta: { changes: Number(sqlite.prepare(statement.sql).run(...statement.args).changes) } });
      sqlite.exec("COMMIT");
      return results;
    } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
  }
};
const email = "admin@example.test";
const fingerprint = createHash("sha256").update(`cf-access:${email}`).digest("hex");
const accessEnv = { DB: db, TIMEFLOW_CLOUDFLARE_ACCESS_ENABLED: "true", HOURRISE_AUTH_SECRET: "test secret at least 32 bytes long for tests only", TIMEFLOW_BETA_ADMIN_USER_FINGERPRINT: fingerprint };
const context = { access: { getIdentity: async () => ({ email }) } };
const password = "Sicheres Testpasswort 123";
const bootstrap = await worker.fetch(new Request("https://hourrise.test/api/auth/bootstrap", {
  method: "POST", headers: { Origin: "https://hourrise.test", "Content-Type": "application/json", "oai-authenticated-user-email": "attacker@example.test" },
  body: JSON.stringify({ email: "attacker@example.test", password })
}), accessEnv, context);
assert.equal(bootstrap.status, 200);
const cookie = bootstrap.headers.get("Set-Cookie").split(";")[0];
assert.equal(sqlite.prepare("SELECT email FROM hourrise_auth_accounts").get().email, email, "trusted Access identity must win over request data");
const newMode = { ...accessEnv, TIMEFLOW_CLOUDFLARE_ACCESS_ENABLED: "false", HOURRISE_AUTH_ENABLED: "true" };
const session = await worker.fetch(new Request("https://hourrise.test/api/session", { headers: { Cookie: cookie } }), newMode);
const identity = await session.json();
assert.equal(identity.authenticated, true);
assert.equal(identity.authProvider, "hourrise");
assert.equal(identity.user.email, email);
const rights = await worker.fetch(new Request("https://hourrise.test/api/beta/access", { headers: { Cookie: cookie } }), newMode);
assert.equal((await rights.json()).admin, true, "verified HourRise account keeps administrator permissions");
const spoofed = await worker.fetch(new Request("https://hourrise.test/api/beta/access", { headers: { "oai-authenticated-user-id": "cf-access:" + email, "oai-authenticated-user-email": email } }), newMode);
assert.equal(spoofed.status, 401, "untrusted identity headers must not grant permissions");
const login = await worker.fetch(new Request("https://hourrise.test/api/auth/login", { method: "POST", headers: { Origin: "https://hourrise.test", "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }), newMode);
assert.equal(login.status, 200, "password login works without Cloudflare Access");
console.log("HourRise admin: confirmed e-mail retains full application rights and spoofed headers are rejected.");
