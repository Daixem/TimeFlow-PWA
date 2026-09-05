import { execFileSync } from "node:child_process";

const SHA_PATTERN = /^[a-f0-9]{40}$/i;

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

/**
 * Creates the one build identity used by all production artifacts.
 * A CI build must be checked out at the exact GitHub event commit; otherwise
 * building stops instead of accidentally publishing another revision.
 */
export function createBuildMetadata(root) {
  const commit = git(root, ["rev-parse", "--verify", "HEAD"]);
  if (!SHA_PATTERN.test(commit)) throw new Error("HEAD ist keine gültige Git-Commit-ID.");

  const requestedCommit = String(process.env.GITHUB_SHA || "").trim();
  if (requestedCommit && (!SHA_PATTERN.test(requestedCommit) || requestedCommit.toLowerCase() !== commit.toLowerCase())) {
    throw new Error(`Build-Commit stimmt nicht mit HEAD überein (${requestedCommit} != ${commit}).`);
  }

  const requestedTime = String(process.env.TIMEFLOW_BUILD_TIMESTAMP || "").trim();
  const parsedTime = requestedTime ? new Date(requestedTime) : new Date();
  if (Number.isNaN(parsedTime.getTime())) throw new Error("TIMEFLOW_BUILD_TIMESTAMP ist ungültig.");
  const builtAt = parsedTime.toISOString();
  const stamp = builtAt.replace(/[-:.]/g, "").replace("T", "t").replace("Z", "z");

  return Object.freeze({
    commit: commit.toLowerCase(),
    build: `${commit.slice(0, 12).toLowerCase()}-${stamp}`,
    builtAt
  });
}

export function replaceBuildPlaceholders(source, metadata) {
  return source.replaceAll("__TIMEFLOW_BUILD__", metadata.build);
}
