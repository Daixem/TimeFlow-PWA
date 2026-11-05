import assert from "node:assert/strict";
import { sendRecoveryEmail, sendVerificationEmail } from "../server/auth-email.mjs";

let sent;
const fakeFetch = async (url, options) => { sent = { url, ...options, body: JSON.parse(options.body) }; return new Response(null, { status: 200 }); };
const result = await sendRecoveryEmail({ apiKey: "test-key", recipient: "person@example.test", code: "01234567", fetchImpl: fakeFetch });
assert.equal(result.accepted, true);
assert.equal(sent.url, "https://api.resend.com/emails");
assert.equal(sent.body.from, "HourRise <code@hourrise.de>");
assert.deepEqual(sent.body.to, ["person@example.test"]);
assert.ok(sent.body.text.includes("01234567"));
assert.ok(!sent.body.text.includes("person@example.test"), "message body must not repeat the recipient's address");
await sendVerificationEmail({ apiKey: "test-key", recipient: "person@example.test", code: "01234567", fetchImpl: fakeFetch });
assert.ok(sent.body.text.includes("Registrierung"));
assert.ok(!sent.body.text.includes("person@example.test"));
await assert.rejects(() => sendRecoveryEmail({ apiKey: "test-key", recipient: "invalid", code: "01234567", fetchImpl: fakeFetch }));
await assert.rejects(() => sendRecoveryEmail({ apiKey: "test-key", recipient: "person@example.test", code: "1234", fetchImpl: fakeFetch }));
await assert.rejects(() => sendRecoveryEmail({ apiKey: "test-key", recipient: "person@example.test", code: "01234567", fetchImpl: async () => new Response("private provider response", { status: 429 }) }), error => error.message === "Email service unavailable");
console.log("HourRise recovery email: passed (simulated delivery)");
