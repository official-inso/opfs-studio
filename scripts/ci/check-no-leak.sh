#!/usr/bin/env bash
# Hygiene check: scans tracked files and recent commit messages for forbidden
# substrings before the mirror push. Exits non-zero on any match.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Patterns are searched case-INSENSITIVELY via grep -E -i, with one exception:
# AI co-author trailers are matched verbatim.

FILE_PATTERNS_I=(
  "anthropic"
  "claude\\.ai"
  "claude[- ]code"
  "generated with claude"
  "co[- ]authored[- ]by:[[:space:]]*claude"
  "gitlab\\.dev\\.insoweb\\.ru"
  "\\.insoweb\\.ru"
  "ssh inso1"
  "ssh inso2"
)

# Stand-alone "Claude" is too noisy (English word), so we only match it as a
# signature (with one of: "by", "with", "via", "from").
FILE_PATTERNS_CLAUDE=(
  "(by|with|via|from)[[:space:]]+Claude\\b"
)

COMMIT_PATTERNS=(
  "Co-Authored-By:[[:space:]]*Claude"
  "co-authored-by:[[:space:]]*claude"
  "Generated with Claude"
  "generated with Claude"
  "Anthropic"
)

# Exclude self + docs that *describe* the rules.
EXCLUDES=(
  ":!scripts/ci/check-no-leak.sh"
  ":!docs/ci-mirror.md"
  ":!node_modules"
  ":!dist"
  ":!builds"
  ":!example/node_modules"
  ":!example/dist"
  ":!package-lock.json"
  ":!pnpm-lock.yaml"
  ":!yarn.lock"
)

violations=0

run_grep() {
  local pattern="$1"
  shift
  local flags="$1"
  shift
  if matches=$(git grep -nIE $flags "$pattern" -- "${EXCLUDES[@]}" 2>/dev/null); then
    echo "✗ pattern: $pattern"
    echo "$matches" | sed 's/^/  /'
    return 1
  fi
  return 0
}

echo "→ scanning tracked files…"
for p in "${FILE_PATTERNS_I[@]}"; do
  if ! run_grep "$p" "-i"; then
    violations=$((violations + 1))
  fi
done
for p in "${FILE_PATTERNS_CLAUDE[@]}"; do
  if ! run_grep "$p" ""; then
    violations=$((violations + 1))
  fi
done

echo "→ scanning last 100 commit messages…"
LOG=$(git log -n 100 --pretty=format:"%H %s%n%b" 2>/dev/null || true)
for p in "${COMMIT_PATTERNS[@]}"; do
  if matches=$(printf "%s" "$LOG" | grep -nE "$p" || true); then
    if [[ -n "$matches" ]]; then
      echo "✗ commit-message pattern: $p"
      echo "$matches" | sed 's/^/  /'
      violations=$((violations + 1))
    fi
  fi
done

if (( violations > 0 )); then
  echo ""
  echo "❌ hygiene check failed: $violations violation(s) — mirror aborted"
  exit 1
fi

echo "✅ hygiene check passed"
