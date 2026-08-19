---
decision: approved
reviewer: crew:reviewer
slice: SLICE-43
reviewed_commits: [cbb6b80b, 0abe8f09]
---

# Review — SLICE-43 (FEAT-008 core): AgentReceipt schema + SubagentStop-based lane table

## Summary

Implements the amended FEAT-008 contract's slices 1-2 (receipt schema +
SubagentStop-based detection), honestly deferring slices 3-4
(TeammateIdle spike + suppression hook) per the same-day amendment that
found `TeammateIdle` never fires in this harness. Every adversarial check
requested — including the lead's top concern, drift between the two
independent receipt validators — was exercised against the **real code
paths** (both the bun-side `agent-receipt.mts` and the actual `node
hooks/report-gate.mjs` process via synthetic SubagentStop payloads), not
inferred from reading. Zero divergence found. **Decision: approved.**

## 1. Drift risk — field-by-field parity, verified by real execution of both validators

Constructed the 4 requested edge receipts and ran them through **both**
independent implementations for real:
- Bun side: called `validateAgentReceipt()` directly from
  `src/scripts/lib/agent-receipt.mts`.
- Node side: built synthetic transcript JSONL fixtures (one `SendMessage`
  `tool_use` per case, receipt embedded in the message text) and piped
  real `SubagentStop` payloads through `node hooks/report-gate.mjs`,
  observing whether a lane-table entry was written.

| Case | `agent-receipt.mts` | `report-gate.mjs` (real process) |
|---|---|---|
| Extra unknown field | ACCEPT | ACCEPT (lane entry written) |
| `status: "done"` (lowercase) | REJECT | REJECT (no lane entry) |
| `items: []` (empty array) | ACCEPT | ACCEPT (lane entry written) |
| `schema_version: 2` | REJECT | REJECT (no lane entry) |

**Exact parity on all 4 cases**, confirmed via genuine execution of both
code paths (not eyeball-diffing the two function bodies) — no divergence,
no explicit tolerance needed. (Debugging note for reproducibility: the
synthetic-payload harness initially failed silently because `node.exe` on
Windows doesn't resolve Git-Bash-style `/tmp/...` paths — fixed by using
`cygpath -m` for Windows-style forward-slash paths in the JSON payloads.)

## 2. Fail-soft honesty — verified against the real hook process

Ran three more synthetic `SubagentStop` payloads through the real hook,
snapshotting the lane table before and after:
- **Corrupt transcript** (garbage non-JSON lines): exit 0, no crash.
- **No-receipt transcript** (valid JSONL, no `SendMessage` at all): exit 0.
- **Missing transcript file**: exit 0.

`diff` on the lane-table file before vs. after all three: **byte-identical
— genuinely untouched**, not just "no error printed."

## 3. Existing gate untouched — confirmed by diff, not just by reading

`git diff ff1c6d9a cbb6b80b -- hooks/report-gate.mjs`: **198 lines added,
zero lines removed** (checked explicitly for any `-`-prefixed line outside
the diff header — none exist). This is a pure additive change; the
pre-existing block/approve gate's functions
(`reportGateEnabled`, `scanTranscript`, `REPORT_BACK_CONTRACT_RE`,
`block()`) are byte-for-byte untouched. `bun test src/tests/report-gate.test.mts`:
**25 pass, 0 fail** (pre-existing + new describe blocks together).

## 4. Lane table — upsert semantics + gitignore

- A valid receipt writes `{receiptSeen: true, transcriptPath, ts}` keyed by
  `agent_id`, matching the contract's shape exactly.
- **Second sighting, same `agent_id`, different transcript**: fired a
  second synthetic payload for an already-recorded agent — the table
  stayed at 2 keys (not 3), and that agent's entry was genuinely
  **updated in place** (new `transcriptPath`, new `ts`), not duplicated.
- `git check-ignore -v .claude/state/loop/receipt-lane-table.json` →
  matches the anchored `**/.claude/state/` rule in `.gitignore` — confirmed
  genuinely gitignored (state, not artifact), as expected.

## 5. Judgment call — pm.md receipt requirement vs. `pm-apply`'s parser

Read `pm.md`'s full "Report contract" + "Final act" section and traced
`pm-apply.mts`'s actual consumption mechanism. **Finding: there is no
shape-collision risk, for a reason more fundamental than careful text
placement** — `pm-apply.mts` never parses PM's `SendMessage` text at all.
Its own header comment is explicit: PM writes its scoring results to a
**file** (`.claude/artifacts/loop/pm-reviews/`, via PM's own `Write` tool
grant — confirmed `disallowedTools: Edit, NotebookEdit` in `pm.md`'s
frontmatter does *not* forbid `Write`), and the `pm-apply --file <path>`
CLI subcommand reads *that file*, never the transcript. Separately,
`report-gate.mjs`'s `extractReceipt()` scans for a receipt-shaped object
anywhere in the `SendMessage` text and explicitly tolerates unrelated
JSON substrings nearby (already exercised in §1's "extra unknown field"
case, and structurally the same skip-and-continue logic that would skip
over PM's own domain-scoring JSON block if it doesn't match the receipt
shape). So whether PM's `SendMessage` text ends up carrying two
side-by-side JSON objects or one merged object, neither consumer
(`pm-apply` via file, `report-gate.mjs` via shape-scan) is threatened by
the other's content. One pre-existing, **not-this-slice's** imprecision
worth a mental note: `pm.md`'s "Report contract" paragraph (added in
SLICE-33, untouched by this diff) says "`pm-apply` reads the JSON directly
from your response," which reads as slightly loose against
`pm-apply.mts`'s own file-based description — not a defect this slice
introduced or needs to resolve, since SLICE-43 only edited the "Final act"
sentence appending the receipt fields, not the "Report contract"
paragraph.

**Sanity checks**: `bun crew/scripts/validate-agents.mts` → OK (26 + 14
3rdparty). `bun src/scripts/validate-content-length.mts` → OK (28
enforced, cap 300). Confirmed `backend-dev.md` is genuinely **299 lines**
(`wc -l`) — the claimed tight margin is real, not rounded.

## 6. Deferred ACs — genuinely unchecked, not falsely marked done

Read the slice file directly: `AC-1` and `AC-3` are both `- [ ]`
(unchecked), each annotated **"DEFERRED per 2026-08-19 contract
amendment"** with a clear dependency chain back to the un-spiked
`TeammateIdle` event. `AC-2` and `AC-4` are `- [x]` with concrete evidence
pointers (7 templates enumerated by name; the specific `report-gate.test.mts`
describe block cited by name). No false-checking.

## Targeted suites

- `bun test src/tests/agent-receipt.test.mts` + `src/tests/report-gate.test.mts`:
  covered above (25/25 on report-gate; ran agent-receipt separately —
  clean).
- `bun src/scripts/validate-repo-boundary.mts`: OK (unaffected — this
  slice adds no cross-`crew/` imports).
- `bun src/scripts/validate-content-length.mts`: OK.
- `bun crew/scripts/validate-agents.mts`: OK.

## Decision rationale

`approved`. The lead's top concern — drift between the two independently
maintained receipt validators — was tested against real execution of both
code paths on 4 adversarial cases and showed exact parity, not just a
close reading of near-identical function bodies. Fail-soft behavior is
confirmed genuine (lane table byte-identical across three failure modes),
the pre-existing block/approve gate is provably untouched (zero removed
lines in the diff), lane-table upsert semantics are correct, and the one
judgment call flagged for scrutiny (pm.md's receipt requirement vs.
pm-apply's parser) resolves cleanly once traced to the actual mechanism —
`pm-apply` never reads the transcript at all. Deferred ACs are honestly
left unchecked with clear reasoning, matching the amendment's own scope
cut.
