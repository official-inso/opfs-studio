#!/usr/bin/env node
// Sets the given version in package.json and all three browser manifests.
// Usage: node scripts/ci/apply-version.mjs 1.2.0
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid version: "${version}". Expected MAJOR.MINOR.PATCH`);
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const targets = [
  "package.json",
  "manifests/manifest.chrome.json",
  "manifests/manifest.edge.json",
  "manifests/manifest.firefox.json",
];

for (const rel of targets) {
  const path = resolve(root, rel);
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.version = version;
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`✓ ${rel} → ${version}`);
}
