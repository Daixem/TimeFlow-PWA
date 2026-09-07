import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertCleanWorkingTree } from "./build-metadata.mjs";

const root = await mkdtemp(join(tmpdir(), "timeflow-release-gate-"));
const run = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" });

try {
  run(["init"]);
  run(["config", "user.email", "timeflow-test@example.invalid"]);
  run(["config", "user.name", "TimeFlow release test"]);
  await writeFile(join(root, "tracked.txt"), "clean\n", "utf8");
  run(["add", "tracked.txt"]);
  run(["commit", "-m", "test: clean release tree"]);

  assertCleanWorkingTree(root);

  await writeFile(join(root, "untracked.txt"), "must block\n", "utf8");
  let blocked = false;
  try { assertCleanWorkingTree(root); } catch (error) {
    blocked = error instanceof Error && error.message === "Production build aborted: working tree contains uncommitted changes.";
  }
  if (!blocked) throw new Error("Dirty production build was not rejected.");
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log("Production build integrity: clean Git tree required for release builds.");
