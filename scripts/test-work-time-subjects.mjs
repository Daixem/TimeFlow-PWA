"use strict";

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const python = process.env.TIMEFLOW_PYTHON || "python";
const result = spawnSync(python, [join(scriptDirectory, "test-work-time-subjects.py")], {
  encoding: "utf8",
  stdio: "pipe"
});

if (result.error) {
  console.error(`Unable to start Python SQLite harness (${python}): ${result.error.message}`);
  console.error("Set TIMEFLOW_PYTHON to a Python 3 runtime that includes sqlite3.");
  process.exit(1);
}

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);

