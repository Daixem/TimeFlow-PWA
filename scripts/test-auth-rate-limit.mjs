import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { countAuthAttempt } from "../server/auth-rate-limit.mjs";

const sqlite = new DatabaseSync(":memory:");
sqlite.exec(readFileSync(new URL("../drizzle/0011_hourrise_auth.sql", import.meta.url), "utf8"));
const db = { prepare(sql) { return { bind(...args) { return { first: async () => sqlite.prepare(sql).get(...args) }; } }; } };
const options = { secret: "a sufficiently long secret for tests only", scope: "login_email", identity: "person@example.test", limit: 2, windowMs: 60_000, now: 100_000 };
assert.equal((await countAuthAttempt(db, options)).allowed, true);
assert.equal((await countAuthAttempt(db, options)).allowed, true);
assert.equal((await countAuthAttempt(db, options)).allowed, false);
assert.equal((await countAuthAttempt(db, { ...options, now: 99_999 })).allowed, false, "clock skew must not reset the limit");
assert.equal((await countAuthAttempt(db, { ...options, scope: "login_ip" })).allowed, true);
assert.equal((await countAuthAttempt(db, { ...options, now: 160_000 })).allowed, true);
assert.equal(sqlite.prepare("SELECT count(*) AS n FROM hourrise_auth_rate_limits WHERE bucket_hash = ?").get(options.identity).n, 0);
await assert.rejects(() => countAuthAttempt(db, { ...options, secret: "short" }));
await assert.rejects(() => countAuthAttempt({ prepare() { throw new Error("offline"); } }, options));
console.log("HourRise persistent authentication rate limits: passed");
