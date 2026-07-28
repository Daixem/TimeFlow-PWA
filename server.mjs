import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(globalThis.TIMEFLOW_PORT ?? globalThis.process?.env?.PORT ?? 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relative = normalize(pathname).replace(/^[/\\]+/, "") || "index.html";
    let file = join(root, relative);
    if (!file.startsWith(root)) throw new Error("Ungültiger Pfad");
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    response.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Nicht gefunden");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`TimeFlow läuft auf http://127.0.0.1:${port}`);
});
