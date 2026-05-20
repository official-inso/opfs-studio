#!/usr/bin/env node
// Computes the next semantic version from conventional commits since the last
// v-tag. Prints the new version to stdout (e.g. "1.2.0").
//
// Bump rules:
//   - "BREAKING CHANGE" in body, or "type!:" in subject → major
//   - any "feat:" → minor
//   - any "fix:" / "perf:" / "refactor:" → patch
//   - otherwise → patch (there are commits, so we still ship)
//
// Exit codes:
//   0 — printed a version
//   3 — no commits since the last tag (nothing to release)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// git() runs git with an explicit argv array (no shell, no injection surface).
function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  }).trim();
}

function lastTag() {
  try {
    return git(["describe", "--tags", "--match", "v*", "--abbrev=0"]);
  } catch {
    return null;
  }
}

function baseVersion(tag) {
  if (tag) return tag.replace(/^v/, "");
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const tag = lastTag();
const range = tag ? `${tag}..HEAD` : "HEAD";

let log = "";
try {
  log = git(["log", range, "--no-merges", "--pretty=format:%s%n%b%n==END=="]);
} catch {
  log = "";
}

const commits = log
  .split("==END==")
  .map((c) => c.trim())
  .filter(Boolean);

if (commits.length === 0) {
  process.stderr.write("no commits since last tag — nothing to release\n");
  process.exit(3);
}

let bump = "patch";
for (const c of commits) {
  const subject = c.split("\n")[0] ?? "";
  const isBreaking =
    /\bBREAKING CHANGE\b/.test(c) || /^[a-z]+(\([^)]*\))?!:/.test(subject);
  if (isBreaking) {
    bump = "major";
    break;
  }
  if (/^feat(\([^)]*\))?:/.test(subject)) bump = "minor";
}

const [maj, min, pat] = baseVersion(tag)
  .split(".")
  .map((n) => parseInt(n, 10) || 0);
let next;
if (bump === "major") next = `${maj + 1}.0.0`;
else if (bump === "minor") next = `${maj}.${min + 1}.0`;
else next = `${maj}.${min}.${pat + 1}`;

process.stdout.write(next + "\n");
