#!/usr/bin/env bash
# read-guard.sh — Claude Code PreToolUse hook for the loop plugin.
#
# Detects post-Edit re-reads: the pattern where an agent runs Read on a
# file whose immediately prior tool call (on that same path) was an
# Edit or Write. Re-reading a file you just edited is always a defect
# (Edit/Write succeeds atomically — the file on disk is the new
# content), and each redundant Read injects fresh tool output that
# busts the prompt cache.
#
# Behavior:
#   - Reads CLAUDE_TOOL_INPUT from environment (Claude Code provides
#     it as JSON for PreToolUse hooks).
#   - Extracts `tool_name` + `tool_input.file_path` (or `file_path`).
#   - Maintains a per-session JSONL log at
#     .claude/state/crew/read-guard.jsonl recording every observed
#     Read/Edit/Write call: {ts, tool, path, offset, limit, sid}.
#   - When the incoming call is Read and the most recent prior entry
#     for that same path was Edit or Write, exits with code 1 and a
#     human-readable warning on stderr.
#   - Paging reads (same path, prior Read with a different offset, no
#     intervening Edit/Write) pass through.
#   - On first invocation per Claude Code session (detected via
#     $CLAUDE_SESSION_ID), the log is rotated so previous sessions do
#     not poison this session's checks.
#   - Any unparseable / missing fields fail open (exit 0).
#
# Log schema (JSONL, one record per line):
#   { "ts": <unix-ms>, "tool": "Read|Edit|Write", "path": "<abs>",
#     "offset": <num|null>, "limit": <num|null>, "sid": "<session>" }
#
# Reset trigger: when the first record's `sid` does not match the
# current $CLAUDE_SESSION_ID, the log file is truncated before append.

set -u

GUARD_LOG_DIR=".claude/state/crew"
GUARD_LOG_FILE="${GUARD_LOG_DIR}/read-guard.jsonl"
SESSION_ID="${CLAUDE_SESSION_ID:-unknown}"

# Fail-open helpers — any parser/IO error must not block the agent.
fail_open() {
  exit 0
}

# Read CLAUDE_TOOL_INPUT; bail out (fail-open) if absent or unparseable.
INPUT="${CLAUDE_TOOL_INPUT:-}"
if [ -z "$INPUT" ]; then
  fail_open
fi

# Prefer jq when available — it's the only reliable JSON parser for
# arbitrary nesting. When jq is absent, regex-extract the two fields
# we need; that path handles the common Claude Code shape:
#   {"tool_name":"Read","tool_input":{"file_path":"...","offset":0}}
if command -v jq >/dev/null 2>&1; then
  TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)"
  FILE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null || true)"
  OFFSET="$(printf '%s' "$INPUT" | jq -r '.tool_input.offset // empty' 2>/dev/null || true)"
  LIMIT="$(printf '%s' "$INPUT" | jq -r '.tool_input.limit // empty' 2>/dev/null || true)"
else
  TOOL_NAME="$(printf '%s' "$INPUT" | sed -n 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
  FILE_PATH="$(printf '%s' "$INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
  OFFSET="$(printf '%s' "$INPUT" | sed -n 's/.*"offset"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')"
  LIMIT="$(printf '%s' "$INPUT" | sed -n 's/.*"limit"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')"
fi

if [ -z "$TOOL_NAME" ] || [ -z "$FILE_PATH" ]; then
  fail_open
fi

# Only Read / Edit / Write participate in the post-Edit re-read check.
case "$TOOL_NAME" in
  Read|Edit|Write) ;;
  *) fail_open ;;
esac

mkdir -p "$GUARD_LOG_DIR" 2>/dev/null || fail_open

# Session reset: if the first line of the log is from a different
# session, truncate. New session → fresh history.
if [ -s "$GUARD_LOG_FILE" ]; then
  FIRST_SID="$(head -n1 "$GUARD_LOG_FILE" 2>/dev/null | sed -n 's/.*"sid"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
  if [ -n "$FIRST_SID" ] && [ "$FIRST_SID" != "$SESSION_ID" ]; then
    : > "$GUARD_LOG_FILE"
  fi
fi

# Find the most recent prior log entry for the same path. We only need
# tail-50 since post-Edit re-reads happen within a short window —
# anything further back is almost certainly a legitimate fresh look.
PRIOR_TOOL=""
PRIOR_OFFSET=""
if [ -s "$GUARD_LOG_FILE" ]; then
  # Pure-shell parse: walk lines backward, find the first match for path.
  ESCAPED_PATH="$(printf '%s' "$FILE_PATH" | sed 's/[][\/.*^$]/\\&/g')"
  PRIOR_LINE="$(tail -n 50 "$GUARD_LOG_FILE" 2>/dev/null | grep -F "\"path\":\"$FILE_PATH\"" | tail -n1)"
  if [ -n "$PRIOR_LINE" ]; then
    PRIOR_TOOL="$(printf '%s' "$PRIOR_LINE" | sed -n 's/.*"tool"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
    PRIOR_OFFSET="$(printf '%s' "$PRIOR_LINE" | sed -n 's/.*"offset"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')"
  fi
fi

# Append the incoming call to the log BEFORE the verdict — so a future
# hook invocation sees this call as prior history regardless of
# whether we block or allow this one.
TS="$(date +%s 2>/dev/null || echo 0)000"
JSON_ENTRY="{\"ts\":${TS},\"tool\":\"${TOOL_NAME}\",\"path\":\"${FILE_PATH}\",\"offset\":${OFFSET:-null},\"limit\":${LIMIT:-null},\"sid\":\"${SESSION_ID}\"}"
printf '%s\n' "$JSON_ENTRY" >> "$GUARD_LOG_FILE" 2>/dev/null || fail_open

# Verdict:
#   - Incoming Read + prior on same path was Edit/Write → BLOCK
#   - Incoming Read + prior Read with same/null offset → BLOCK (same-range re-read)
#   - Otherwise → pass through
if [ "$TOOL_NAME" = "Read" ] && [ -n "$PRIOR_TOOL" ]; then
  case "$PRIOR_TOOL" in
    Edit|Write)
      printf '[read-guard] BLOCKED: Read of "%s" immediately after %s on the same path.\n' "$FILE_PATH" "$PRIOR_TOOL" >&2
      printf '[read-guard] Edit/Write succeeded atomically — the file on disk already contains your changes. Re-reading busts the prompt cache and burns Opus tokens.\n' >&2
      printf '[read-guard] If you genuinely need to verify, use Grep to confirm a specific line; do not re-Read the whole file.\n' >&2
      exit 1
      ;;
    Read)
      # Same-range re-read: same path, same/null offset, no Edit between.
      if [ "${OFFSET:-null}" = "${PRIOR_OFFSET:-null}" ]; then
        printf '[read-guard] BLOCKED: Re-Read of "%s" at the same offset (%s).\n' "$FILE_PATH" "${OFFSET:-default}" >&2
        printf '[read-guard] You already have this content in context. Use Grep with a narrower pattern, or rely on the prior Read.\n' >&2
        exit 1
      fi
      ;;
  esac
fi

exit 0
