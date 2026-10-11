import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { assertCleanWorkingTree, createBuildMetadata, replaceBuildPlaceholders } from "./build-metadata.mjs";

const root = new URL("../", import.meta.url);
const output = new URL("../_site/", import.meta.url);
// GitHub Pages must publish the same locally hosted OCR runtime as the main
// Sites build. Without these files screenshot imports fail while creating the
// Tesseract worker (worker, wasm core, or German language data cannot load).
const entries = ["index.html", "manifest.webmanifest", "sw.js", "assets", "css", "js", "vendor"];
assertCleanWorkingTree(root);
const metadata = createBuildMetadata(root);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of entries) await cp(new URL(entry, root), new URL(entry, output), { recursive: true });

async function stampBuild(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) await stampBuild(target);
    else if (/\.(?:html|css|js|json|webmanifest|svg)$/.test(entry.name)) {
      const source = await readFile(target, "utf8");
      await writeFile(target, replaceBuildPlaceholders(source, metadata), "utf8");
    }
  }
}
await stampBuild(output);
await writeFile(new URL("version.json", output), `${JSON.stringify(metadata)}\n`, "utf8");
await writeFile(new URL(".nojekyll", output), "", "utf8");
console.log(`GitHub-Pages-Build ${metadata.build} wurde erstellt.`);
