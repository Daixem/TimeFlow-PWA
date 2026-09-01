import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

const root = new URL("../", import.meta.url);
const output = new URL("../dist/server/", import.meta.url);
const publicEntries = ["index.html", "manifest.webmanifest", "sw.js"];
const publicDirectories = ["assets", "css", "js"];
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

async function collect(directory) {
  const absolute = new URL(`${directory}/`, root);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(child));
    else files.push(child);
  }
  return files;
}

const files = [
  ...publicEntries,
  ...(await Promise.all(publicDirectories.map(collect))).flat()
];
const payload = {};

for (const file of files) {
  const normalized = file.split(sep).join("/");
  payload[normalized] = {
    type: contentTypes[extname(file)] || "application/octet-stream",
    body: (await readFile(new URL(normalized, root))).toString("base64")
  };
}

const worker = `const FILES = ${JSON.stringify(payload)};
const SYNC_KEYS = ["timeflow-profile-v1", "timeflow-settings-v1", "timeflow-profile-preferences-v1", "timeflow-private-schedule-v1", "timeflow-private-schedule-learning-v1", "timeflow-private-account-v1", "timeflow-worktime-audit-v1", "timeflow-monthly-targets-v1", "timeflow-beta-consent-v1", "timeflow-workday-v2", "timeflow-notifications-v1", "timeflow-quick-actions-v1"];

function decode(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders }
  });
}

function authenticatedUser(request) {
  const id = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const nameEncoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  let name = "";
  if (encodedName && nameEncoding === "percent-encoded-utf-8") {
    try { name = decodeURIComponent(encodedName); } catch { name = ""; }
  }
  if (!name && email) name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/(^|\\s)\\S/g, (letter) => letter.toUpperCase());
  return { authenticated: Boolean(id || email), id, email, name };
}

async function ensureSyncTable(database) {
  await database.prepare("CREATE TABLE IF NOT EXISTS timeflow_user_sync (user_id TEXT PRIMARY KEY NOT NULL, payload_json TEXT NOT NULL DEFAULT '{}', revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0), updated_at TEXT NOT NULL)").run();
}

function validatedSnapshot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = {};
  for (const key of SYNC_KEYS) {
    const item = value[key];
    if (item && typeof item === "object") snapshot[key] = item;
  }
  return snapshot;
}

async function ensureTeamTables(database) {
  await database.prepare("CREATE TABLE IF NOT EXISTS timeflow_organizations (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL)").run();
  await database.prepare("CREATE TABLE IF NOT EXISTS timeflow_organization_invites (id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, accepted_at TEXT)").run();
  await database.prepare("CREATE TABLE IF NOT EXISTS timeflow_organization_members (organization_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', joined_at TEXT NOT NULL, PRIMARY KEY (organization_id, user_id))").run();
}

async function ensureBetaTables(database) {
  await database.prepare("CREATE TABLE IF NOT EXISTS timeflow_beta_invites (id TEXT PRIMARY KEY NOT NULL, token_hash TEXT UNIQUE NOT NULL, label TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, claimed_by TEXT, claimed_at TEXT, status TEXT NOT NULL DEFAULT 'pending')").run();
  await database.prepare("CREATE INDEX IF NOT EXISTS idx_timeflow_beta_invites_token_status ON timeflow_beta_invites(token_hash, status)").run();
  await database.prepare("CREATE TABLE IF NOT EXISTS timeflow_beta_access (user_id TEXT PRIMARY KEY NOT NULL, invite_id TEXT, granted_at TEXT NOT NULL, revoked_at TEXT)").run();
}

const betaAdmin = (user, env) => Boolean(user?.id && env?.TIMEFLOW_BETA_ADMIN_USER_ID && user.id === env.TIMEFLOW_BETA_ADMIN_USER_ID);
async function tokenHash(token) { const bytes = new TextEncoder().encode(token); const digest = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join(""); }
function randomToken() { const bytes = new Uint8Array(24); crypto.getRandomValues(bytes); let token = btoa(String.fromCharCode(...bytes)).split("+").join("-").split("/").join("_"); while (token.endsWith("=")) token = token.slice(0, -1); return token; }

async function betaAccess(user, env) {
  if (!user.authenticated || !user.id || !env?.DB) return { allowed: false, admin: false };
  await ensureBetaTables(env.DB); if (betaAdmin(user, env)) return { allowed: true, admin: true };
  const row = await env.DB.prepare("SELECT user_id FROM timeflow_beta_access WHERE user_id = ? AND revoked_at IS NULL").bind(user.id).first();
  return { allowed: Boolean(row), admin: false };
}

async function handleBetaAccess(request, env) {
  const user = authenticatedUser(request); if (!user.authenticated) return jsonResponse({ authenticated: false, allowed: false, admin: false }, 401);
  return jsonResponse({ authenticated: true, ...(await betaAccess(user, env)), user: { id: user.id, email: user.email, name: user.name } });
}

async function handleBetaInvite(request, env, url) {
  const user = authenticatedUser(request); if (!user.authenticated || !user.id) return jsonResponse({ error: "authentication_required" }, 401);
  if (!env?.DB) return jsonResponse({ error: "storage_unavailable" }, 503); await ensureBetaTables(env.DB);
  const token = url.searchParams.get("token") || ""; if (token.length < 20) return jsonResponse({ error: "invalid_invitation" }, 400);
  const hash = await tokenHash(token); const invite = await env.DB.prepare("SELECT id, label, expires_at, claimed_by, status FROM timeflow_beta_invites WHERE token_hash = ?").bind(hash).first();
  const valid = Boolean(invite && invite.status === "pending" && !invite.claimed_by && new Date(invite.expires_at) > new Date());
  if (request.method === "GET") return jsonResponse({ valid, invitation: valid ? { id: invite.id, label: invite.label, expiresAt: invite.expires_at } : null });
  if (request.method === "POST") {
    const origin = request.headers.get("Origin"); if (origin && origin !== url.origin) return jsonResponse({ error: "origin_not_allowed" }, 403); if (!valid) return jsonResponse({ error: "invitation_unavailable" }, 409);
    const claimedAt = new Date().toISOString();
    const result = await env.DB.prepare("UPDATE timeflow_beta_invites SET claimed_by = ?, claimed_at = ?, status = 'claimed' WHERE id = ? AND status = 'pending' AND claimed_by IS NULL").bind(user.id, claimedAt, invite.id).run();
    if (!result?.meta?.changes) return jsonResponse({ error: "invitation_already_claimed" }, 409);
    await env.DB.prepare("INSERT INTO timeflow_beta_access (user_id, invite_id, granted_at, revoked_at) VALUES (?, ?, ?, NULL) ON CONFLICT(user_id) DO UPDATE SET invite_id = excluded.invite_id, granted_at = excluded.granted_at, revoked_at = NULL").bind(user.id, invite.id, claimedAt).run();
    return jsonResponse({ claimed: true, allowed: true });
  }
  return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "GET, POST" });
}

async function handleBetaInvites(request, env, url) {
  const user = authenticatedUser(request); if (!user.authenticated || !user.id) return jsonResponse({ error: "authentication_required" }, 401);
  if (!env?.DB || !betaAdmin(user, env)) return jsonResponse({ error: "admin_required" }, 403); await ensureBetaTables(env.DB);
  if (request.method === "GET") { const rows = await env.DB.prepare("SELECT id, label, created_at, expires_at, claimed_at, status FROM timeflow_beta_invites ORDER BY created_at DESC LIMIT 100").all(); return jsonResponse({ invitations: rows?.results || [] }); }
  if (request.method === "POST") {
    const origin = request.headers.get("Origin"); if (origin && origin !== url.origin) return jsonResponse({ error: "origin_not_allowed" }, 403);
    let body; try { body = await request.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }
    const label = String(body?.label || "").trim().slice(0, 80); const days = Math.min(30, Math.max(1, Number(body?.expiresDays || 7))); if (!label) return jsonResponse({ error: "label_required" }, 400);
    const token = randomToken(); const now = new Date(); const expires = new Date(now.getTime() + days * 86400000); const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO timeflow_beta_invites (id, token_hash, label, created_by, created_at, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')").bind(id, await tokenHash(token), label, user.id, now.toISOString(), expires.toISOString()).run();
    return jsonResponse({ invitation: { id, label, expiresAt: expires.toISOString(), url: url.origin + "/?invite=" + token } }, 201);
  }
  return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "GET, POST" });
}

async function handleTeamAccess(request, env, url) {
  const user = authenticatedUser(request);
  if (!user.authenticated || !user.id) return jsonResponse({ error: "authentication_required" }, 401);
  if (!(await betaAccess(user, env)).allowed) return jsonResponse({ error: "beta_access_required" }, 403);
  if (!env?.DB) return jsonResponse({ error: "storage_unavailable" }, 503);
  await ensureTeamTables(env.DB);
  const member = await env.DB.prepare("SELECT m.organization_id, m.role, o.name FROM timeflow_organization_members m JOIN timeflow_organizations o ON o.id = m.organization_id WHERE m.user_id = ? LIMIT 1").bind(user.id).first();
  const invite = user.email ? await env.DB.prepare("SELECT i.id, i.organization_id, i.role, o.name FROM timeflow_organization_invites i JOIN timeflow_organizations o ON o.id = i.organization_id WHERE lower(i.email) = lower(?) AND i.status = 'pending' ORDER BY i.created_at DESC LIMIT 1").bind(user.email).first() : null;
  if (request.method === "GET") return jsonResponse({ allowed: Boolean(member), membership: member || null, invitation: invite || null });
  if (request.method === "POST") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return jsonResponse({ error: "origin_not_allowed" }, 403);
    let body; try { body = await request.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }
    if (body?.action !== "accept" || !invite || body.invitationId !== invite.id) return jsonResponse({ error: "valid_invitation_required" }, 403);
    const joinedAt = new Date().toISOString();
    await env.DB.prepare("INSERT OR IGNORE INTO timeflow_organization_members (organization_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)").bind(invite.organization_id, user.id, invite.role, joinedAt).run();
    await env.DB.prepare("UPDATE timeflow_organization_invites SET status = 'accepted', accepted_at = ? WHERE id = ? AND status = 'pending'").bind(joinedAt, invite.id).run();
    return jsonResponse({ allowed: true, membership: { organization_id: invite.organization_id, role: invite.role, name: invite.name }, invitation: null });
  }
  return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "GET, POST" });
}

async function handleAccountData(request, env, url) {
  const user = authenticatedUser(request);
  if (!user.authenticated || !user.id) return jsonResponse({ error: "authentication_required" }, 401);
  if (!(await betaAccess(user, env)).allowed) return jsonResponse({ error: "beta_access_required" }, 403);
  if (request.method !== "DELETE") return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "DELETE" });
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return jsonResponse({ error: "origin_not_allowed" }, 403);
  if (!env?.DB) return jsonResponse({ error: "storage_unavailable" }, 503);
  await ensureSyncTable(env.DB); await ensureTeamTables(env.DB);
  await env.DB.prepare("DELETE FROM timeflow_user_sync WHERE user_id = ?").bind(user.id).run();
  await env.DB.prepare("DELETE FROM timeflow_organization_members WHERE user_id = ?").bind(user.id).run();
  return jsonResponse({ deleted: true });
}

async function handleSync(request, env, url) {
  const user = authenticatedUser(request);
  if (!user.authenticated || !user.id) return jsonResponse({ error: "authentication_required" }, 401);
  if (!(await betaAccess(user, env)).allowed) return jsonResponse({ error: "beta_access_required" }, 403);
  if (!env?.DB) return jsonResponse({ error: "storage_unavailable" }, 503);
  await ensureSyncTable(env.DB);

  if (request.method === "GET") {
    const row = await env.DB.prepare("SELECT payload_json, revision, updated_at FROM timeflow_user_sync WHERE user_id = ?").bind(user.id).first();
    if (!row) return jsonResponse({ snapshot: null, revision: 0, updatedAt: null });
    try {
      return jsonResponse({ snapshot: JSON.parse(row.payload_json), revision: row.revision, updatedAt: row.updated_at });
    } catch {
      return jsonResponse({ error: "stored_data_invalid" }, 500);
    }
  }

  if (request.method === "PUT") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return jsonResponse({ error: "origin_not_allowed" }, 403);
    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > 65536) return jsonResponse({ error: "payload_too_large" }, 413);
    let body;
    try { body = await request.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }
    const snapshot = validatedSnapshot(body?.snapshot);
    if (!snapshot) return jsonResponse({ error: "invalid_snapshot" }, 400);
    const payloadJson = JSON.stringify(snapshot);
    if (payloadJson.length > 50000) return jsonResponse({ error: "payload_too_large" }, 413);
    const updatedAt = new Date().toISOString();
    await env.DB.prepare("INSERT INTO timeflow_user_sync (user_id, payload_json, revision, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO UPDATE SET payload_json = excluded.payload_json, revision = timeflow_user_sync.revision + 1, updated_at = excluded.updated_at").bind(user.id, payloadJson, updatedAt).run();
    const row = await env.DB.prepare("SELECT revision, updated_at FROM timeflow_user_sync WHERE user_id = ?").bind(user.id).first();
    return jsonResponse({ saved: true, revision: row?.revision || 1, updatedAt: row?.updated_at || updatedAt });
  }

  return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "GET, PUT" });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/session") {
      const user = authenticatedUser(request);
      return jsonResponse({ authenticated: user.authenticated, user: user.authenticated ? { id: user.id, email: user.email, name: user.name } : null });
    }
    if (url.pathname === "/api/sync") return handleSync(request, env, url);
    if (url.pathname === "/api/team-access") return handleTeamAccess(request, env, url);
    if (url.pathname === "/api/account-data") return handleAccountData(request, env, url);
    if (url.pathname === "/api/beta/access") return handleBetaAccess(request, env);
    if (url.pathname === "/api/beta/invite") return handleBetaInvite(request, env, url);
    if (url.pathname === "/api/beta/invites") return handleBetaInvites(request, env, url);
    let path;
    try {
      path = decodeURIComponent(url.pathname).replace(/^\\/+/, "") || "index.html";
    } catch {
      return new Response("Ungültige Adresse", { status: 400 });
    }
    if (path.endsWith("/")) path += "index.html";
    const file = FILES[path];
    if (!file) return new Response("Nicht gefunden", { status: 404 });
    const immutable = /\\.(?:png|svg)$/.test(path);
    const headers = {
      "Content-Type": file.type,
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Cache-Control": path === "sw.js" || path === "index.html"
        ? "no-cache"
        : immutable ? "public, max-age=86400" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff"
    };
    return new Response(request.method === "HEAD" ? null : decode(file.body), { status: 200, headers });
  }
};
`;

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await writeFile(new URL("index.js", output), worker, "utf8");
console.log(`Sites-Build enthält ${files.length} PWA-Dateien.`);
