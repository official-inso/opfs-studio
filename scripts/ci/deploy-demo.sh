#!/usr/bin/env bash
# Build the example OPFS demo and publish it to GitHub Pages under /demo/.
#
# GitHub Pages serves `main` / `docs`, so we drop the built demo into
# `docs/demo/` on `main` and push the same commit to BOTH GitLab and GitHub
# (with [skip ci] to avoid extra pipelines). GitHub Pages then rebuilds and
# serves the demo at https://<owner>.github.io/<repo>/demo/.
#
# Runs from the `master` pipeline on every push (release or not).
#
# Required environment:
#   GITLAB_RELEASE_TOKEN — push the deploy commit back to GitLab `main`
#   MIRROR_SSH_KEY       — File-type CI var: path to the GitHub deploy key
# Optional:
#   MIRROR_GH_REPO       — defaults to "official-inso/opfs-studio"
#   DEMO_BASE            — Vite base path, defaults to "/opfs-studio/demo/"
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

: "${GITLAB_RELEASE_TOKEN:?GITLAB_RELEASE_TOKEN required}"
: "${MIRROR_SSH_KEY:?MIRROR_SSH_KEY required (GitHub deploy key)}"
: "${MIRROR_GH_REPO:=official-inso/opfs-studio}"
: "${DEMO_BASE:=/opfs-studio/demo/}"

# 1. Build the demo with the correct base path.
( cd example && npm ci --no-audit --no-fund && DEMO_BASE="$DEMO_BASE" npm run build )

# 2. Start from the current GitHub Pages source branch (`main`).
git config --global user.email "ci@opfs-studio.local"
git config --global user.name  "opfs-release"
git config --global --add safe.directory "*"
git fetch origin main
git checkout -B pages-deploy origin/main

# 3. Replace docs/demo with the fresh build.
rm -rf docs/demo
mkdir -p docs/demo
cp -r example/dist/. docs/demo/

git add docs/demo
if git diff --cached --quiet; then
  echo "Demo unchanged — nothing to deploy."
  exit 0
fi
git commit -m "chore: deploy demo to github pages [skip ci]"

# 4. Push the SAME commit to GitLab main and GitHub main (no divergence).
git push "https://oauth2:${GITLAB_RELEASE_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git" "HEAD:refs/heads/main"

# GitHub over SSH deploy key.
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cp "$MIRROR_SSH_KEY" ~/.ssh/id_ed25519
chmod 600 ~/.ssh/id_ed25519
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null
export GIT_SSH_COMMAND="ssh -i $HOME/.ssh/id_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes"
git remote add gh "git@github.com:${MIRROR_GH_REPO}.git" 2>/dev/null || git remote set-url gh "git@github.com:${MIRROR_GH_REPO}.git"
git push gh "HEAD:refs/heads/main"

echo "✅ demo deployed to https://${MIRROR_GH_REPO%%/*}.github.io/${MIRROR_GH_REPO#*/}/demo/"
