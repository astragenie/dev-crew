#!/usr/bin/env bash
# docs-only.sh — classify a CI diff as docs-only or code (FEAT-023, SLICE-48).
#
# Reads changed file paths on stdin (one per line) and prints exactly
# `code=true` or `code=false` on stdout.
#
# Exempt (docs-only) paths match EXACTLY: `^(docs/|README\.md$|CHANGELOG\.md$)`
# — nothing else is exempt. In particular `.claude/artifacts/loop/backlog/**`
# is CODE, not docs: backlog markdown feeds validate-effort-points,
# validate-decline-citations, validate-loop-state, and validate-backlog-drift,
# so a backlog-only diff must still run the full validator suite (architect
# decision OBJ-16; replaces the prior `.*/backlog/` exemption, which let those
# validators go unexercised on backlog-only PRs).
#
# A change is "code" (prints `code=true`) if ANY changed path does not match
# the exempt pattern, OR if stdin is empty (fail-safe: run the full gate when
# the diff can't be classified, e.g. a failed or unresolved `git diff`).
#
# Portable bash: must run unmodified on GitHub-hosted ubuntu runners and on
# Git Bash (Windows). No GNU-only flags, no process substitution.
set -euo pipefail

EXEMPT_PATTERN='^(docs/|README\.md$|CHANGELOG\.md$)'

changed="$(cat)"

if [ -z "$changed" ]; then
  echo "code=true"
  exit 0
fi

if echo "$changed" | grep -qvE "$EXEMPT_PATTERN"; then
  echo "code=true"
else
  echo "code=false"
fi
