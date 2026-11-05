// Database-backed counters for authentication requests. These are not
// connected to the production Worker until the complete login is ready.
const encoder = new TextEncoder();

async function bucketKey(secret, scope, identity) {
  if (typeof secret !== "string" || encoder.encode(secret).length < 32) throw new Error("Rate-limit key is not configured");
  if (typeof scope !== "string" || !/^[a-z_]{1,40}$/.test(scope)) throw new Error("Invalid rate-limit scope");
  if (typeof identity !== "string" || !identity.length || identity.length > 512) throw new Error("Invalid rate-limit identity");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(JSON.stringify([scope, identity])));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function countAuthAttempt(db, { secret, scope, identity, limit, windowMs, now = Date.now() }) {
  if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowMs) || windowMs < 1000) throw new Error("Invalid rate-limit configuration");
  const bucket = await bucketKey(secret, scope, identity);
  const row = await db.prepare(`INSERT INTO hourrise_auth_rate_limits (bucket_hash, window_started_at, attempts)
    VALUES (?, ?, 1)
    ON CONFLICT(bucket_hash) DO UPDATE SET
      attempts = CASE WHEN window_started_at <= ? THEN 1 ELSE attempts + 1 END,
      window_started_at = CASE WHEN window_started_at <= ? THEN ? ELSE window_started_at END
    RETURNING attempts, window_started_at`)
    .bind(bucket, now, now - windowMs, now - windowMs, now).first();
  if (!row || !Number.isSafeInteger(row.attempts) || !Number.isSafeInteger(row.window_started_at)) throw new Error("Rate-limit storage unavailable");
  return { allowed: row.attempts <= limit, retryAfterSeconds: Math.max(0, Math.ceil((row.window_started_at + windowMs - now) / 1000)) };
}
