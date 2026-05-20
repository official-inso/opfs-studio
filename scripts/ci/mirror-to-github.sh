#!/usr/bin/env bash
# Mirror GitLab main → GitHub main via HTTPS PAT.
# Required environment:
#   MIRROR_GH_TOKEN  — GitHub fine-grained PAT with Contents:write on the target repo
# Optional environment:
#   MIRROR_GH_REPO   — defaults to "official-inso/opfs-studio"
#   MIRROR_BRANCH    — defaults to "main"
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

: "${MIRROR_GH_TOKEN:?MIRROR_GH_TOKEN required (set as GitLab CI variable, protected & masked)}"
: "${MIRROR_GH_REPO:=official-inso/opfs-studio}"
: "${MIRROR_BRANCH:=main}"

# Hygiene check first — any failure here aborts the mirror.
bash scripts/ci/check-no-leak.sh

git config --global user.email "ci@opfs-studio.local"
git config --global user.name  "opfs-mirror"
git config --global --add safe.directory "*"

# CI often does a shallow clone; we need full history for an honest push.
git fetch --unshallow --tags 2>/dev/null || git fetch --tags

REMOTE_URL="https://x-access-token:${MIRROR_GH_TOKEN}@github.com/${MIRROR_GH_REPO}.git"

if git remote get-url github >/dev/null 2>&1; then
  git remote set-url github "$REMOTE_URL"
else
  git remote add github "$REMOTE_URL"
fi

git push github "HEAD:${MIRROR_BRANCH}"

echo "✅ mirrored ${CI_COMMIT_SHA:-HEAD} → github.com/${MIRROR_GH_REPO}@${MIRROR_BRANCH}"
