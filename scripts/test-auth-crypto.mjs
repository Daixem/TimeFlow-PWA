import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createRandomToken, hashPassword, hashToken, verifyPassword } from "../server/auth-crypto.mjs";

globalThis.crypto ??= webcrypto;
const password = "Ein langes Beispielpasswort 🔐";
const first = await hashPassword(password);
const second = await hashPassword(password);
assert.notEqual(first, second, "passwords must have independent salts");
assert.equal(await verifyPassword(password, first), true);
assert.equal(await verifyPassword("anderes Passwort", first), false);
assert.equal(await verifyPassword(password, "invalid"), false);
assert.equal(await verifyPassword(password, first.replace("600000", "1")), false);
const token = createRandomToken();
assert.match(token, /^[0-9a-f]{64}$/);
assert.notEqual(token, createRandomToken());
assert.match(await hashToken(token), /^[0-9a-f]{64}$/);
await assert.rejects(() => hashToken("not-a-token"));
const realCrypto = globalThis.crypto;
Object.defineProperty(globalThis, "crypto", { configurable: true, value: {
  getRandomValues: realCrypto.getRandomValues.bind(realCrypto),
  subtle: {
    importKey: realCrypto.subtle.importKey.bind(realCrypto.subtle),
    deriveBits: async () => { throw new Error("runtime rejected password work factor"); }
  }
} });
try {
  await assert.rejects(() => hashPassword(password), /runtime rejected/);
  assert.equal(await verifyPassword(password, first), false, "runtime limits must fail closed without weakening password hashing");
} finally {
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: realCrypto });
}
console.log("HourRise password and token primitives: passed");
