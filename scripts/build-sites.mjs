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

function decode(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/session") {
      const id = request.headers.get("oai-authenticated-user-id");
      const email = request.headers.get("oai-authenticated-user-email");
      const encodedName = request.headers.get("oai-authenticated-user-full-name");
      const nameEncoding = request.headers.get("oai-authenticated-user-full-name-encoding");
      let name = "";
      if (encodedName && nameEncoding === "percent-encoded-utf-8") {
        try { name = decodeURIComponent(encodedName); } catch { name = ""; }
      }
      if (!name && email) name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/(^|\\s)\\S/g, (letter) => letter.toUpperCase());
      const authenticated = Boolean(id || email);
      return new Response(JSON.stringify({ authenticated, user: authenticated ? { id, email, name } : null }), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
      });
    }
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
