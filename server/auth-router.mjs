import { authenticateAccount, normalizeEmail, registerVerifiedAccount, validNewPassword } from "./auth-accounts.mjs";
import { createSession, readSession, revokeSession } from "./auth-session.mjs";
import { completePasswordReset, issueRecoveryCode } from "./auth-recovery.mjs";
import { countAuthAttempt } from "./auth-rate-limit.mjs";
import { sendRecoveryEmail } from "./auth-email.mjs";

function reply(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", ...headers
  } });
}

async function bodyOf(request) {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) return null;
  if (Number(request.headers.get("Content-Length") || 0) > 4096) return null;
  const text = await request.text();
  if (text.length > 4096) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch { return null; }
}

async function limited(request, env, scope, email, max = 5, windowMs = 15 * 60_000) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const secret = env.HOURRISE_AUTH_SECRET;
  const network = await countAuthAttempt(env.DB, { secret, scope: `${scope}_ip`, identity: ip, limit: max * 6, windowMs });
  const account = email ? await countAuthAttempt(env.DB, { secret, scope: `${scope}_email`, identity: email, limit: max, windowMs }) : { allowed: true };
  return network.allowed && account.allowed;
}

export async function handleAuth(request, env, path, accessUser, isAccessAdmin) {
  if (!env?.DB || !env?.HOURRISE_AUTH_SECRET) return reply({ error: "not_configured" }, 503);
  if (path === "/api/auth/session" && request.method === "GET") {
    const account = await readSession(env.DB, request);
    return reply({ authenticated: Boolean(account), user: account });
  }
  if (request.method !== "POST") return reply({ error: "method_not_allowed" }, 405, { Allow: "POST" });
  if (request.headers.get("Origin") !== new URL(request.url).origin) return reply({ error: "invalid_request" }, 403);
  const body = await bodyOf(request);
  if (!body) return reply({ error: "invalid_request" }, 400);

  if (path === "/api/auth/bootstrap") {
    // Registration stays closed. The existing Access identity may create only
    // its own verified administrator account. No e-mail is accepted from JSON.
    if (!accessUser?.email || !isAccessAdmin || env.TIMEFLOW_CLOUDFLARE_ACCESS_ENABLED !== "true") return reply({ error: "admin_required" }, 403);
    if (!validNewPassword(body.password)) return reply({ error: "password_policy" }, 400);
    const email = normalizeEmail(accessUser.email);
    if (!await limited(request, env, "bootstrap", email, 3, 60 * 60_000)) return reply({ error: "rate_limited" }, 429);
    const account = await registerVerifiedAccount(env.DB, email, body.password);
    if (!account) return reply({ error: "already_registered" }, 409);
    return reply({ ok: true }, 200, { "Set-Cookie": await createSession(env.DB, account.id) });
  }

  if (path === "/api/auth/login") {
    const email = normalizeEmail(body.email);
    if (!email || typeof body.password !== "string" || body.password.length > 1024) return reply({ error: "invalid_credentials" }, 401);
    if (!await limited(request, env, "login", email, 10)) return reply({ error: "rate_limited" }, 429);
    const account = await authenticateAccount(env.DB, email, body.password);
    if (!account) return reply({ error: "invalid_credentials" }, 401);
    return reply({ ok: true }, 200, { "Set-Cookie": await createSession(env.DB, account.id) });
  }

  if (path === "/api/auth/forgot") {
    const email = normalizeEmail(body.email);
    if (!email) return reply({ error: "invalid_request" }, 400);
    if (!await limited(request, env, "forgot", email, 3, 60 * 60_000)) return reply({ error: "rate_limited" }, 429);
    const row = await env.DB.prepare("SELECT id, email FROM hourrise_auth_accounts WHERE email = ? COLLATE NOCASE AND email_verified_at IS NOT NULL AND disabled_at IS NULL").bind(email).first();
    let challengeId = crypto.randomUUID();
    if (row && env.RESEND_API_KEY) {
      const challenge = await issueRecoveryCode(env.DB, row.id, env.HOURRISE_AUTH_SECRET);
      challengeId = challenge.challengeId;
      try { await sendRecoveryEmail({ apiKey: env.RESEND_API_KEY, recipient: row.email, code: challenge.code }); }
      catch { /* Identical public response prevents account enumeration. */ }
    }
    return reply({ ok: true, challengeId });
  }

  if (path === "/api/auth/reset") {
    const email = normalizeEmail(body.email);
    if (!email || !validNewPassword(body.password) || !/^\d{8}$/.test(String(body.code || ""))) return reply({ error: "invalid_request" }, 400);
    if (!await limited(request, env, "reset", email, 5)) return reply({ error: "rate_limited" }, 429);
    const row = await env.DB.prepare("SELECT id FROM hourrise_auth_accounts WHERE email = ? COLLATE NOCASE AND email_verified_at IS NOT NULL AND disabled_at IS NULL").bind(email).first();
    const ok = row && await completePasswordReset(env.DB, row.id, body.challengeId, body.code, body.password, env.HOURRISE_AUTH_SECRET);
    return ok ? reply({ ok: true }) : reply({ error: "invalid_code" }, 400);
  }

  if (path === "/api/auth/logout") {
    return reply({ ok: true }, 200, { "Set-Cookie": await revokeSession(env.DB, request) });
  }
  return reply({ error: "not_found" }, 404);
}
