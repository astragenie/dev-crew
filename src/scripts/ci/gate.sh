#!/usr/bin/env bash
# gate.sh — fail-closed evaluation of the required `gate` CI job
# (FEAT-023, SLICE-48).
#
# Usage: gate.sh CODE FASTGATE_RESULT
#
# Exits 0 only when:
#   - CODE == "false" (docs-only change, fast-gate was skipped by design), OR
#   - CODE == "true" AND FASTGATE_RESULT == "success"
#
# Every other combination — including a blank/unresolved CODE from a failed
# or skipped `changes` job — exits 1. This closes the prior bug where an
# empty `needs.changes.outputs.code` (CODE != "true") made the gate pass
# without running fast-gate at all.
set -euo pipefail

CODE="${1:-}"
FASTGATE_RESULT="${2:-}"

if [ "$CODE" = "false" ]; then
  echo "docs-only change — gate passes without tests" >&2
  exit 0
fi

if [ "$CODE" = "true" ] && [ "$FASTGATE_RESULT" = "success" ]; then
  echo "fast-gate passed" >&2
  exit 0
fi

echo "gate failed: code='$CODE' fast-gate.result='$FASTGATE_RESULT'" >&2
exit 1
