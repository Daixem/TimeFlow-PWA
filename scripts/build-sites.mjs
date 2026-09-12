import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import { assertCleanWorkingTree, createBuildMetadata, replaceBuildPlaceholders } from "./build-metadata.mjs";

const root = new URL("../", import.meta.url);
const output = new URL("../dist/server/", import.meta.url);
const releaseBuild = process.argv.includes("--release");
if (releaseBuild) assertCleanWorkingTree(root);
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
const buildMetadata = createBuildMetadata(root);
const buildVersion = buildMetadata.build;

for (const file of files) {
  const normalized = file.split(sep).join("/");
  const source = await readFile(new URL(normalized, root));
  const body = [".html", ".js", ".webmanifest"].includes(extname(file))
    ? Buffer.from(replaceBuildPlaceholders(source.toString("utf8"), buildMetadata))
    : source;
  payload[normalized] = {
    type: contentTypes[extname(file)] || "application/octet-stream",
    body: body.toString("base64")
  };
}

const worker = `const FILES = ${JSON.stringify(payload)};
const BUILD_METADATA = ${JSON.stringify(buildMetadata)};
const BUILD_VERSION = ${JSON.stringify(buildVersion)};
const MAIN_RELEASE_ORIGIN = "https://daixem.github.io/TimeFlow-PWA";
const SYNC_KEYS = ["timeflow-profile-v1", "timeflow-settings-v1", "timeflow-profile-preferences-v1", "timeflow-custom-background-v1", "timeflow-private-schedule-v1", "timeflow-private-schedule-learning-v1", "timeflow-private-account-v1", "timeflow-worktime-audit-v1", "timeflow-monthly-targets-v1", "timeflow-private-setup-v1", "timeflow-beta-consent-v1", "timeflow-workday-v2", "timeflow-notifications-v1", "timeflow-notification-read-v1", "timeflow-quick-actions-v1"];

function decode(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

const RATE_WINDOWS = new Map();
const SECURITY_CSP = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: blob:; connect-src 'self' https://cdn.jsdelivr.net; worker-src 'self' blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; manifest-src 'self'";

function securityHeaders(initial = {}) {
  const headers = new Headers(initial);
  headers.set("Content-Security-Policy", SECURITY_CSP);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return headers;
}

function allowRate(user, scope, limit, intervalMs) {
  const key = scope + ":" + user.id;
  const now = Date.now();
  const entries = (RATE_WINDOWS.get(key) || []).filter((timestamp) => timestamp > now - intervalMs);
  if (entries.length >= limit) return false;
  entries.push(now);
  RATE_WINDOWS.set(key, entries);
  return true;
}

function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: securityHeaders({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders })
  });
}

async function latestMainAsset(request, url) {
  if (!["GET", "HEAD"].includes(request.method) || url.pathname.startsWith("/api/") || url.pathname === "/version.json") return null;
  try {
    const upstreamUrl = new URL(url.pathname + url.search, MAIN_RELEASE_ORIGIN);
    if (["/", "/index.html", "/sw.js"].includes(url.pathname)) upstreamUrl.searchParams.set("timeflow_release", String(Math.floor(Date.now() / 60000)));
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: { Accept: request.headers.get("Accept") || "*/*", "Cache-Control": "no-cache" },
      redirect: "follow"
    });
    if (!upstream.ok) return null;
    const headers = securityHeaders(upstream.headers);
    headers.set("X-TimeFlow-Release", "main");
    headers.set("Cache-Control", url.pathname === "/sw.js" || url.pathname === "/index.html" || url.pathname === "/version.json" ? "no-cache" : "public, max-age=300");
    return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
  } catch {
    return null;
  }
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

const WORK_TIME_EVENT_TYPES = new Set(["CLOCK_IN", "CLOCK_OUT", "PAUSE_START", "PAUSE_END", "TIME_CORRECTION", "ADMIN_CORRECTION", "MANUAL_ENTRY"]);

function validExpectedRevision(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parsedWorkTimeState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = { ...value };
  // Audit and authorization fields have no place in a client-controlled state.
  for (const key of ["actor_user_id", "server_timestamp", "server_updated_at", "revision", "user_id", "admin"]) delete state[key];
  const json = JSON.stringify(state);
  return json.length <= 32768 ? state : null;
}

function storedWorkTimeState(row) {
  try {
    const value = JSON.parse(row?.state_json || "null");
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function workTimeSource(eventType, adminCorrection) {
  if (adminCorrection) return "admin_correction";
  if (eventType === "CLOCK_IN" || eventType === "CLOCK_OUT") return "clock";
  if (eventType === "PAUSE_START" || eventType === "PAUSE_END") return "manual_pause";
  return "manual_entry";
}

function workTimeServerEnabled(env) {
  return env?.TIMEFLOW_WORK_TIME_SERVER_ENABLED === "true";
}

function serverWorkTimeState(eventType, currentState, requestedState, now) {
  if (eventType === "CLOCK_IN") {
    if (currentState?.isWorking) return null;
    return { isWorking: true, workStart: now, workEnd: null, isPaused: false, pauseStartedAt: null, pauseAccumulatedMs: 0, hasManualPause: false };
  }
  if (eventType === "CLOCK_OUT") {
    if (!currentState?.isWorking) return null;
    const pausedFor = currentState.isPaused && currentState.pauseStartedAt ? Math.max(0, Date.parse(now) - Date.parse(currentState.pauseStartedAt)) : 0;
    return { ...currentState, isWorking: false, workEnd: now, isPaused: false, pauseStartedAt: null, pauseAccumulatedMs: Math.max(0, Number(currentState.pauseAccumulatedMs || 0)) + pausedFor };
  }
  if (eventType === "PAUSE_START") {
    if (!currentState?.isWorking || currentState.isPaused) return null;
    return { ...currentState, isPaused: true, pauseStartedAt: now, hasManualPause: true };
  }
  if (eventType === "PAUSE_END") {
    if (!currentState?.isWorking || !currentState.isPaused || !currentState.pauseStartedAt) return null;
    return { ...currentState, isPaused: false, pauseStartedAt: null, pauseAccumulatedMs: Math.max(0, Number(currentState.pauseAccumulatedMs || 0)) + Math.max(0, Date.parse(now) - Date.parse(currentState.pauseStartedAt)) };
  }
  return parsedWorkTimeState(requestedState);
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

async function ensureSupportTables(database) {
  await database.prepare("CREATE TABLE IF NOT EXISTS timeflow_support_tickets (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, user_email TEXT, user_name TEXT, category TEXT NOT NULL, area TEXT NOT NULL, urgency TEXT NOT NULL, description TEXT NOT NULL, screenshot_data TEXT, device_json TEXT, status TEXT NOT NULL DEFAULT 'received', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  await database.prepare("CREATE INDEX IF NOT EXISTS idx_timeflow_support_user_updated ON timeflow_support_tickets(user_id, updated_at DESC)").run();
  await database.prepare("CREATE TABLE IF NOT EXISTS timeflow_support_messages (id TEXT PRIMARY KEY NOT NULL, ticket_id TEXT NOT NULL, author_id TEXT NOT NULL, author_role TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL)").run();
}

async function userIdentityFingerprint(userId) {
  const bytes = new TextEncoder().encode(userId || "");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function betaAdmin(user, env) {
  if (!user?.id || !env?.TIMEFLOW_BETA_ADMIN_USER_FINGERPRINT) return false;
  return (await userIdentityFingerprint(user.id)) === env.TIMEFLOW_BETA_ADMIN_USER_FINGERPRINT;
}
async function tokenHash(token) { const bytes = new TextEncoder().encode(token); const digest = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join(""); }
function randomToken() { const bytes = new Uint8Array(24); crypto.getRandomValues(bytes); let token = btoa(String.fromCharCode(...bytes)).split("+").join("-").split("/").join("_"); while (token.endsWith("=")) token = token.slice(0, -1); return token; }

async function betaAccess(user, env) {
  if (!user.authenticated || !user.id || !env?.DB) return { allowed: false, admin: false };
  await ensureBetaTables(env.DB); if (await betaAdmin(user, env)) return { allowed: true, admin: true };
  const row = await env.DB.prepare("SELECT user_id FROM timeflow_beta_access WHERE user_id = ? AND revoked_at IS NULL").bind(user.id).first();
  return { allowed: Boolean(row), admin: false };
}

async function handleBetaAccess(request, env) {
  const user = authenticatedUser(request); if (!user.authenticated) return jsonResponse({ authenticated: false, allowed: false, admin: false }, 401);
  return jsonResponse({ authenticated: true, ...(await betaAccess(user, env)), user: { id: user.id, email: user.email, name: user.name } });
}

async function handleBetaIdentityFingerprint(request) {
  const user = authenticatedUser(request);
  if (!user.authenticated || !user.id) return jsonResponse({ error: "authentication_required" }, 401);
  return jsonResponse({ fingerprint: await userIdentityFingerprint(user.id) });
}

async function handleBetaInvite(request, env, url) {
  const user = authenticatedUser(request); if (!user.authenticated || !user.id) return jsonResponse({ error: "authentication_required" }, 401);
  if (!env?.DB) return jsonResponse({ error: "storage_unavailable" }, 503); await ensureBetaTables(env.DB);
  const token = url.searchParams.get("token") || ""; if (token.length < 20) return jsonResponse({ error: "invalid_invitation" }, 400);
  const hash = await tokenHash(token); const invite = await env.DB.prepare("SELECT id, label, expires_at, claimed_by, status FROM timeflow_beta_invites WHERE token_hash = ?").bind(hash).first();
  const valid = Boolean(invite && invite.status === "pending" && !invite.claimed_by && new Date(invite.expires_at) > new Date());
  if (request.method === "GET") return jsonResponse({ valid, invitation: valid ? { id: invite.id, label: invite.label, expiresAt: invite.expires_at } : null });
  if (request.method === "POST") {
    const origin = request.headers.get("Origin"); if (origin !== url.origin) return jsonResponse({ error: "origin_not_allowed" }, 403); if (!valid) return jsonResponse({ error: "invitation_unavailable" }, 409);
    if (!allowRate(user, "beta-invite-claim", 10, 60 * 60 * 1000)) return jsonResponse({ error: "rate_limited" }, 429, { "Retry-After": "3600" });
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
  if (!env?.DB || !(await betaAdmin(user, env))) return jsonResponse({ error: "admin_required" }, 403); await ensureBetaTables(env.DB);
  if (request.method === "GET") { const rows = await env.DB.prepare("SELECT id, label, created_at, expires_at, claimed_at, status FROM timeflow_beta_invites ORDER BY created_at DESC LIMIT 100").all(); return jsonResponse({ invitations: rows?.results || [] }); }
  if (request.method === "POST") {
    const origin = request.headers.get("Origin"); if (origin !== url.origin) return jsonResponse({ error: "origin_not_allowed" }, 403);
    if (!allowRate(user, "beta-invite-create", 20, 60 * 60 * 1000)) return jsonResponse({ error: "rate_limited" }, 429, { "Retry-After": "3600" });
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
  const access = await betaAccess(user, env);
  if (!access.allowed) return jsonResponse({ error: "beta_access_required" }, 403);
  // Die Teamoberfläche und alle zugehörigen Verwaltungsaktionen gehören in der
  // Einzel-Beta ausschließlich zum fest serverseitig hinterlegten Beta-Admin.
  // Eine Unternehmensmitgliedschaft oder ein manipuliertes Frontend genügt nie.
  if (!access.admin) return jsonResponse({ error: "team_admin_required" }, 403);
  if (!env?.DB) return jsonResponse({ error: "storage_unavailable" }, 503);
  await ensureTeamTables(env.DB);
  const member = await env.DB.prepare("SELECT m.organization_id, m.role, o.name FROM timeflow_organization_members m JOIN timeflow_organizations o ON o.id = m.organization_id WHERE m.user_id = ? LIMIT 1").bind(user.id).first();
  const invite = user.email ? await env.DB.prepare("SELECT i.id, i.organization_id, i.role, o.name FROM timeflow_organization_invites i JOIN timeflow_organizations o ON o.id = i.organization_id WHERE lower(i.email) = lower(?) AND i.status = 'pending' ORDER BY i.created_at DESC LIMIT 1").bind(user.email).first() : null;
  if (request.method === "GET") return jsonResponse({ allowed: true, membership: member || { organization_id: null, role: "admin", name: "TimeFlow" }, invitation: invite || null });
  if (request.method === "POST") {
    const origin = request.headers.get("Origin");
    if (origin !== url.origin) return jsonResponse({ error: "origin_not_allowed" }, 403);
    if (!allowRate(user, "team-invitation-accept", 10, 60 * 60 * 1000)) return jsonResponse({ error: "rate_limited" }, 429, { "Retry-After": "3600" });
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
  await ensureSyncTable(env.DB); await ensureTeamTables(env.DB); await ensureSupportTables(env.DB);
  const tickets = await env.DB.prepare("SELECT id FROM timeflow_support_tickets WHERE user_id = ?").bind(user.id).all();
  for (const ticket of tickets?.results || []) await env.DB.prepare("DELETE FROM timeflow_support_messages WHERE ticket_id = ?").bind(ticket.id).run();
  await env.DB.prepare("DELETE FROM timeflow_support_tickets WHERE user_id = ?").bind(user.id).run();
  await env.DB.prepare("DELETE FROM timeflow_user_sync WHERE user_id = ?").bind(user.id).run();
  await env.DB.prepare("DELETE FROM timeflow_organization_members WHERE user_id = ?").bind(user.id).run();
  return jsonResponse({ deleted: true });
}

async function supportTicketWithMessages(database, ticket) {
  const messages = await database.prepare("SELECT id, author_role, message, created_at FROM timeflow_support_messages WHERE ticket_id = ? ORDER BY created_at ASC").bind(ticket.id).all();
  return { ...ticket, messages: messages?.results || [] };
}

async function handleSupport(request, env, url) {
  const user = authenticatedUser(request);
  if (!user.authenticated || !user.id) return jsonResponse({ error: "authentication_required" }, 401);
  const access = await betaAccess(user, env); if (!access.allowed) return jsonResponse({ error: "beta_access_required" }, 403);
  if (!env?.DB) return jsonResponse({ error: "storage_unavailable" }, 503); await ensureSupportTables(env.DB);
  if (request.method === "GET") {
    const screenshotId = String(url.searchParams.get("screenshot") || "");
    if (screenshotId) {
      const ticket = await env.DB.prepare("SELECT user_id, screenshot_data FROM timeflow_support_tickets WHERE id = ?").bind(screenshotId).first();
      if (!ticket || (!access.admin && ticket.user_id !== user.id)) return jsonResponse({ error: "ticket_not_found" }, 404);
      if (!ticket.screenshot_data) return jsonResponse({ error: "screenshot_not_found" }, 404);
      return jsonResponse({ screenshot: ticket.screenshot_data });
    }
    const adminView = access.admin && url.searchParams.get("admin") === "1";
    const rows = adminView
      ? await env.DB.prepare("SELECT id, user_id, user_email, user_name, category, area, urgency, description, device_json, status, created_at, updated_at, CASE WHEN screenshot_data IS NULL THEN 0 ELSE 1 END AS has_screenshot FROM timeflow_support_tickets ORDER BY updated_at DESC LIMIT 100").all()
      : await env.DB.prepare("SELECT id, user_id, user_email, user_name, category, area, urgency, description, device_json, status, created_at, updated_at, CASE WHEN screenshot_data IS NULL THEN 0 ELSE 1 END AS has_screenshot FROM timeflow_support_tickets WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100").bind(user.id).all();
    const tickets = []; for (const row of rows?.results || []) tickets.push(await supportTicketWithMessages(env.DB, row));
    return jsonResponse({ tickets, admin: access.admin });
  }
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "GET, POST" });
  const origin = request.headers.get("Origin"); if (origin !== url.origin) return jsonResponse({ error: "origin_not_allowed" }, 403);
  if (!allowRate(user, "support-write", 60, 60 * 60 * 1000)) return jsonResponse({ error: "rate_limited" }, 429, { "Retry-After": "3600" });
  if (Number(request.headers.get("Content-Length") || 0) > 950000) return jsonResponse({ error: "payload_too_large" }, 413);
  let body; try { body = await request.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }
  const action = String(body?.action || "create"); const now = new Date().toISOString();
  if (action === "create") {
    const category = String(body?.category || "").slice(0, 30), area = String(body?.area || "").trim().slice(0, 80), urgency = String(body?.urgency || "normal").slice(0, 20), description = String(body?.description || "").trim().slice(0, 5000);
    const screenshot = String(body?.screenshot || ""); const device = body?.includeDevice && body?.device && typeof body.device === "object" ? JSON.stringify(body.device).slice(0, 3000) : null;
    if (!category || !area || description.length < 10) return jsonResponse({ error: "required_fields_missing" }, 400);
    if (screenshot && (!screenshot.startsWith("data:image/jpeg;base64,") || screenshot.length > 750000)) return jsonResponse({ error: "invalid_screenshot" }, 400);
    const recent = await env.DB.prepare("SELECT description, created_at FROM timeflow_support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").bind(user.id).first();
    if (recent && Date.now() - new Date(recent.created_at).getTime() < 15000) return jsonResponse({ error: "please_wait_before_resubmitting" }, 429);
    if (recent && recent.description === description && Date.now() - new Date(recent.created_at).getTime() < 300000) return jsonResponse({ error: "duplicate_ticket" }, 409);
    const id = crypto.randomUUID(); await env.DB.prepare("INSERT INTO timeflow_support_tickets (id, user_id, user_email, user_name, category, area, urgency, description, screenshot_data, device_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)").bind(id, user.id, user.email || null, user.name || null, category, area, urgency, description, screenshot || null, device, now, now).run();
    return jsonResponse({ ticket: await supportTicketWithMessages(env.DB, await env.DB.prepare("SELECT * FROM timeflow_support_tickets WHERE id = ?").bind(id).first()) }, 201);
  }
  const ticketId = String(body?.ticketId || ""); const ticket = await env.DB.prepare("SELECT * FROM timeflow_support_tickets WHERE id = ?").bind(ticketId).first();
  if (!ticket || (!access.admin && ticket.user_id !== user.id)) return jsonResponse({ error: "ticket_not_found" }, 404);
  if (action === "reply") {
    const message = String(body?.message || "").trim().slice(0, 3000); if (!message) return jsonResponse({ error: "message_required" }, 400);
    await env.DB.prepare("INSERT INTO timeflow_support_messages (id, ticket_id, author_id, author_role, message, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), ticketId, user.id, access.admin ? "admin" : "user", message, now).run();
    await env.DB.prepare("UPDATE timeflow_support_tickets SET updated_at = ? WHERE id = ?").bind(now, ticketId).run();
  } else if (action === "status" && access.admin) {
    const status = String(body?.status || ""); if (!["received", "reviewing", "planned", "resolved"].includes(status)) return jsonResponse({ error: "invalid_status" }, 400);
    await env.DB.prepare("UPDATE timeflow_support_tickets SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, ticketId).run();
  } else return jsonResponse({ error: "action_not_allowed" }, 403);
  return jsonResponse({ ticket: await supportTicketWithMessages(env.DB, await env.DB.prepare("SELECT * FROM timeflow_support_tickets WHERE id = ?").bind(ticketId).first()) });
}

async function workTimeTarget(user, access, value) {
  const requested = typeof value === "string" ? value.trim() : "";
  if (!requested || requested === user.id) return { userId: user.id, adminCorrection: false };
  if (!access.admin) return null;
  return { userId: requested, adminCorrection: true };
}

async function handleWorkTime(request, env, url) {
  const user = authenticatedUser(request);
  if (!user.authenticated || !user.id) return jsonResponse({ error: "authentication_required" }, 401);
  if (!workTimeServerEnabled(env)) return jsonResponse({ error: "work_time_feature_disabled" }, 503);
  const access = await betaAccess(user, env);
  if (!access.allowed) return jsonResponse({ error: "beta_access_required" }, 403);
  if (!env?.DB) return jsonResponse({ error: "storage_unavailable" }, 503);

  if (request.method === "GET") {
    const target = await workTimeTarget(user, access, url.searchParams.get("userId"));
    if (!target) return jsonResponse({ error: "work_time_forbidden" }, 403);
    const row = await env.DB.prepare("SELECT state_json, revision, server_updated_at FROM timeflow_work_time_current WHERE user_id = ?").bind(target.userId).first();
    if (!row) return jsonResponse({ state: null, revision: 0, updatedAt: null });
    const state = storedWorkTimeState(row);
    if (!state) return jsonResponse({ error: "stored_work_time_invalid" }, 500);
    return jsonResponse({ state, revision: row.revision, updatedAt: row.server_updated_at });
  }

  if (request.method !== "PUT") return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "GET, PUT" });
  if (request.headers.get("Origin") !== url.origin) return jsonResponse({ error: "origin_not_allowed" }, 403);
  if (!allowRate(user, "work-time-write", 60, 60 * 1000)) return jsonResponse({ error: "rate_limited" }, 429, { "Retry-After": "60" });
  if (Number(request.headers.get("Content-Length") || 0) > 65536) return jsonResponse({ error: "payload_too_large" }, 413);
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }
  if (!validExpectedRevision(body?.expectedRevision)) return jsonResponse({ error: "invalid_expected_revision" }, 400);
  const target = await workTimeTarget(user, access, body?.userId);
  if (!target) return jsonResponse({ error: "work_time_forbidden" }, 403);
  let eventType = typeof body?.eventType === "string" ? body.eventType : "";
  if (!WORK_TIME_EVENT_TYPES.has(eventType)) return jsonResponse({ error: "invalid_work_time_event" }, 400);
  if (target.adminCorrection && eventType !== "ADMIN_CORRECTION") return jsonResponse({ error: "admin_correction_event_required" }, 400);
  if (!target.adminCorrection && eventType === "ADMIN_CORRECTION") return jsonResponse({ error: "admin_required" }, 403);
  if (["TIME_CORRECTION", "ADMIN_CORRECTION", "MANUAL_ENTRY"].includes(eventType) && !parsedWorkTimeState(body?.state)) return jsonResponse({ error: "invalid_work_time_state" }, 400);
  const effectiveTimestamp = typeof body?.effectiveTimestamp === "string" && body.effectiveTimestamp.length <= 64 ? body.effectiveTimestamp : null;
  const now = new Date().toISOString();
  const row = await env.DB.prepare("SELECT state_json, revision, server_updated_at FROM timeflow_work_time_current WHERE user_id = ?").bind(target.userId).first();
  const currentState = row ? storedWorkTimeState(row) : null;
  if (row && !currentState) return jsonResponse({ error: "stored_work_time_invalid" }, 500);
  const nextState = serverWorkTimeState(eventType, currentState, body?.state, now);
  if (!nextState) return jsonResponse({ error: "invalid_work_time_transition" }, 409);
  const stateJson = JSON.stringify(nextState);
  const source = workTimeSource(eventType, target.adminCorrection);
  const actorUserId = user.id;

  try {
    if (!row) {
      if (body.expectedRevision !== 0) return jsonResponse({ error: "work_time_conflict", revision: 0, state: null, updatedAt: null }, 409);
      const statement = env.DB.prepare("INSERT INTO timeflow_work_time_current (user_id, state_json, revision, last_actor_user_id, last_event_type, last_source, effective_timestamp, server_updated_at, created_at) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO NOTHING").bind(target.userId, stateJson, actorUserId, eventType, source, effectiveTimestamp, now, now);
      const result = await env.DB.batch([statement]);
      if ((result?.[0]?.meta?.changes || 0) === 1) return jsonResponse({ saved: true, revision: 1, state: nextState, updatedAt: now }, 201);
    } else {
      const statement = env.DB.prepare("UPDATE timeflow_work_time_current SET state_json = ?, revision = revision + 1, last_actor_user_id = ?, last_event_type = ?, last_source = ?, effective_timestamp = ?, server_updated_at = ? WHERE user_id = ? AND revision = ?").bind(stateJson, actorUserId, eventType, source, effectiveTimestamp, now, target.userId, body.expectedRevision);
      const result = await env.DB.batch([statement]);
      if ((result?.[0]?.meta?.changes || 0) === 1) return jsonResponse({ saved: true, revision: body.expectedRevision + 1, state: nextState, updatedAt: now });
    }
  } catch {
    return jsonResponse({ error: "work_time_write_failed" }, 500);
  }

  const current = await env.DB.prepare("SELECT state_json, revision, server_updated_at FROM timeflow_work_time_current WHERE user_id = ?").bind(target.userId).first();
  const state = storedWorkTimeState(current);
  return jsonResponse({ error: "work_time_conflict", revision: current?.revision || 0, state, updatedAt: current?.server_updated_at || null }, 409);
}

async function handleWorkTimeJournal(request, env, url) {
  const user = authenticatedUser(request);
  if (!user.authenticated || !user.id) return jsonResponse({ error: "authentication_required" }, 401);
  if (!workTimeServerEnabled(env)) return jsonResponse({ error: "work_time_feature_disabled" }, 503);
  const access = await betaAccess(user, env);
  if (!access.allowed) return jsonResponse({ error: "beta_access_required" }, 403);
  if (!env?.DB) return jsonResponse({ error: "storage_unavailable" }, 503);
  if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "GET" });
  const target = await workTimeTarget(user, access, url.searchParams.get("userId"));
  if (!target) return jsonResponse({ error: "work_time_forbidden" }, 403);
  const rows = await env.DB.prepare("SELECT id, user_id, actor_user_id, event_type, source, revision, effective_timestamp, server_timestamp, previous_state_json, new_state_json FROM timeflow_work_time_journal WHERE user_id = ? ORDER BY revision DESC LIMIT 200").bind(target.userId).all();
  return jsonResponse({ events: rows?.results || [] });
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
    if (origin !== url.origin) return jsonResponse({ error: "origin_not_allowed" }, 403);
    if (!allowRate(user, "sync-write", 60, 60 * 1000)) return jsonResponse({ error: "rate_limited" }, 429, { "Retry-After": "60" });
    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > 1048576) return jsonResponse({ error: "payload_too_large" }, 413);
    let body;
    try { body = await request.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }
    const snapshot = validatedSnapshot(body?.snapshot);
    if (!snapshot) return jsonResponse({ error: "invalid_snapshot" }, 400);
    const expectedRevision = Number(body?.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) return jsonResponse({ error: "invalid_expected_revision" }, 400);
    const payloadJson = JSON.stringify(snapshot);
    if (payloadJson.length > 786432) return jsonResponse({ error: "payload_too_large" }, 413);
    const updatedAt = new Date().toISOString();
    if (expectedRevision === 0) {
      const created = await env.DB.prepare("INSERT INTO timeflow_user_sync (user_id, payload_json, revision, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO NOTHING").bind(user.id, payloadJson, updatedAt).run();
      if ((created?.meta?.changes || 0) === 1) return jsonResponse({ saved: true, revision: 1, updatedAt });
    }
    const updated = await env.DB.prepare("UPDATE timeflow_user_sync SET payload_json = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?").bind(payloadJson, updatedAt, user.id, expectedRevision).run();
    if ((updated?.meta?.changes || 0) === 1) return jsonResponse({ saved: true, revision: expectedRevision + 1, updatedAt });
    const current = await env.DB.prepare("SELECT payload_json, revision, updated_at FROM timeflow_user_sync WHERE user_id = ?").bind(user.id).first();
    let data = null; try { data = current ? JSON.parse(current.payload_json) : null; } catch {}
    return jsonResponse({ error: "sync_conflict", revision: current?.revision || 0, data, updatedAt: current?.updated_at || null }, 409);
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
    if (url.pathname === "/api/work-time") return handleWorkTime(request, env, url);
    if (url.pathname === "/api/work-time/journal") return handleWorkTimeJournal(request, env, url);
    if (url.pathname === "/api/team-access") return handleTeamAccess(request, env, url);
    if (url.pathname === "/api/account-data") return handleAccountData(request, env, url);
    if (url.pathname === "/api/beta/access") return handleBetaAccess(request, env);
    if (url.pathname === "/api/beta/identity-fingerprint") return handleBetaIdentityFingerprint(request);
    if (url.pathname === "/api/beta/invite") return handleBetaInvite(request, env, url);
    if (url.pathname === "/api/beta/invites") return handleBetaInvites(request, env, url);
    if (url.pathname === "/api/support") return handleSupport(request, env, url);
    const currentMainAsset = await latestMainAsset(request, url);
    if (currentMainAsset) return currentMainAsset;
    if (url.pathname === "/version.json") return jsonResponse(BUILD_METADATA);
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
    const headers = securityHeaders({
      "Content-Type": file.type,
      "Referrer-Policy": "no-referrer",
      "Cache-Control": path === "sw.js" || path === "index.html"
        ? "no-cache"
        : immutable ? "public, max-age=86400" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff"
    });
    return new Response(request.method === "HEAD" ? null : decode(file.body), { status: 200, headers });
  }
};
`;

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await writeFile(new URL("index.js", output), worker, "utf8");
await mkdir(new URL("../.openai/", output), { recursive: true });
await copyFile(new URL(".openai/hosting.json", root), new URL("../.openai/hosting.json", output));
console.log(`Sites-Build enthält ${files.length} PWA-Dateien.`);
