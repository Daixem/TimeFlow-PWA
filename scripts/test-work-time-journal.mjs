"use strict";

// Runs the isolated SQLite harness. Set TIMEFLOW_PYTHON when Python is not on
// PATH, for example: $env:TIMEFLOW_PYTHON = 'C:\\path\\to\\python.exe'.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const python = process.env.TIMEFLOW_PYTHON || "python";
const result = spawnSync(python, [join(scriptDirectory, "test-work-time-journal.py")], {
  encoding: "utf8",
  stdio: "pipe"
});

if (result.error) {
  console.error(`Unable to start Python SQLite harness (${python}): ${result.error.message}`);
  console.error("Set TIMEFLOW_PYTHON to a Python 3 runtime that includes the standard sqlite3 module.");
  process.exit(1);
}

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
