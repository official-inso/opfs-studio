#!/usr/bin/env bash
# Mirror GitLab main → GitHub main over SSH using a repository deploy key.
# Required environment:
#   MIRROR_SSH_KEY   — GitLab File-type CI variable holding the private deploy key
#                      (the variable value is a path to the key file)
# Optional environment:
#   MIRROR_GH_REPO   — defaults to "official-inso/opfs-studio"
#   MIRROR_BRANCH    — defaults to "main"
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

: "${MIRROR_SSH_KEY:?MIRROR_SSH_KEY required (GitLab File-type CI variable with the deploy key)}"
: "${MIRROR_GH_REPO:=official-inso/opfs-studio}"
: "${MIRROR_BRANCH:=main}"

# Hygiene check first — any failure here aborts the mirror.
bash scripts/ci/check-no-leak.sh

git config --global user.email "ci@opfs-studio.local"
git config --global user.name  "opfs-mirror"
git config --global --add safe.directory "*"

# Install the deploy key. MIRROR_SSH_KEY is a File-type variable, so its value
# is the path to a file that contains the private key.
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cp "$MIRROR_SSH_KEY" ~/.ssh/id_ed25519
chmod 600 ~/.ssh/id_ed25519
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null

export GIT_SSH_COMMAND="ssh -i $HOME/.ssh/id_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes"

# CI often does a shallow clone; we need full history for an honest push.
git fetch --unshallow --tags 2>/dev/null || git fetch --tags

REMOTE_URL="git@github.com:${MIRROR_GH_REPO}.git"

if git remote get-url github >/dev/null 2>&1; then
  git remote set-url github "$REMOTE_URL"
else
  git remote add github "$REMOTE_URL"
fi

git push github "HEAD:${MIRROR_BRANCH}"

echo "✅ mirrored ${CI_COMMIT_SHA:-HEAD} → github.com/${MIRROR_GH_REPO}@${MIRROR_BRANCH}"
