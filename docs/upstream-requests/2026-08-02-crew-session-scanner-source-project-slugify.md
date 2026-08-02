# Upstream request — dev-team: session-scanner source-project defense-in-depth + native session_id frontmatter field

- **Date:** 2026-08-02
- **From:** runner-plugin (loop layer)
- **To:** dev-team (crew plugin) — `scripts/lib/session-cost.ts` /
  `scripts/lib/session-cost-scanner.ts` (session scanner), `scripts/lib/
  cost-hygiene/render-frontmatter.ts` (cost-report frontmatter writer)
- **Status:** open
- **Design record:** runner-plugin
  `docs/research/2026-08-02-citylive-zero-cost-telemetry.md` (source-project
  ask) and `docs/research/2026-08-02-cost-window-freeze-root-cause-spike.md`
  (session_id ask, scoping note for SLICE-162)

This request bundles two independent crew-side asks discovered by sibling
FEAT-273/FEAT-268 spikes. Both are defense-in-depth for gaps loop can only
work around, not fix, from its side.

## Ask 1 — normalize or auto-detect-recover an explicit `sourceProject`

### Problem

All 11 clean cost reports in the `citylive` consumer repo showed `usd: 0`,
`Sessions Scanned: 0`, `Auto-detected: no` — the scan found zero session
transcripts. Root cause (full trail in the design record above):
`session-cost.ts:200-203` / `session-cost-scanner.ts:191,206` (byte-identical
in both the `dev-team` source checkout and the installed `crew@0.67.0`
plugin cache) trust any caller-supplied `sourceProject` string verbatim as a
`~/.claude/projects/<value>/` directory name — never passed through the
scanner's own `slugifyRepoPath` (`session-cost.ts:11-13`). Worse, the
auto-detect safety net that exists specifically to recover from "no session
files found" is gated on `if (!sourceProject && autoDetect)` — an explicit
but *wrong* `sourceProject` is truthy, so auto-detect never runs. The
mismatch renders silently: no error, no warning, just a `usd: 0` report that
looks like a legitimately quiet slice.

`AstraGenie.CityLive` (a human-readable product name, not a slugified path)
was passed as `--source-project` and matched none of the historical
`~/.claude/projects/` entries — the correctly-slugified
`C--work-mega-AstraGenie-CityLive` does exist, but was never tried because
the wrong value bypassed both the direct lookup and the auto-detect
fallback.

Loop has already applied its own fix (SLICE-175, this repo): `crew-
bridge.mts` now runs `config.loop.costProject` and each
`costProjectAliases` entry through the same slugify regex before emitting
`--source-project`. That closes the loop-caller half of the bug. It does
**not** close it for any other caller of crew's scanner that passes a raw
`--source-project` value directly (crew's own CLI callers, other consumer
plugins, manual invocations) — only crew can fix that.

### Ask

Either (or both, they're complementary):

1. Run any caller-supplied `sourceProject` through `slugifyRepoPath` before
   using it as a directory name (`session-cost.ts:200` /
   `session-cost-scanner.ts:191`) — idempotent on already-slugified values,
   so no existing correct caller regresses.
2. Change the auto-detect guard from `if (!sourceProject && autoDetect)` to
   also fire when the resolved directory has zero in-window session files,
   regardless of whether `sourceProject` was explicitly supplied — the
   safety net's whole purpose is "recover from finding nothing," and an
   explicit-but-wrong value is exactly the case it currently refuses to
   handle.

### Acceptance signal

A fixture `--source-project` value that is a human-readable, non-slugified
string (e.g. `"My.Product.Name"`) either (a) resolves to the same session
directory a correctly-slugified equivalent would, or (b) falls through to
auto-detect and finds real in-window activity — never silently returns a
zero-session report with `Auto-detected: no`.

## Ask 2 — native `session_id` / transcript-id field in cost-report frontmatter

### Problem

Crew's cost-report frontmatter writer (`scripts/lib/cost-hygiene/render-
frontmatter.ts`) emits `kind/phase/feature/slice/run_title/usd/duration_ms/
total_tokens/cache_hit_pct/grade_avg/review_decision/validation_decision/
source_project/auto_detected/aggregate_all/source_count/created_at` — no
session or transcript identity field. `session-cost-scanner.ts` already
iterates individual `.jsonl` transcript files per project directory to
compute the report, so a natural session identifier is available mid-scan;
it is just never threaded out to the artifact.

This gap was flagged during FEAT-268/SLICE-162 (loop-side cost-scan-window
fix): AC-3 needed dedup to be able to corroborate reports by session/
transcript id rather than token-count equality alone. Lacking a crew-side
field, SLICE-162 shipped a **best-effort loop-side substitute**
(`stampCostReportSessionId` in `crew-bridge.mts`, sourcing
`CLAUDE_SESSION_ID` or `workflow-state.currentRun.sessionId` and patching it
into the report file's frontmatter after crew writes it) — a post-write
patch, not a native field, and it cannot see the actual transcript file the
scanner read. This request is the crew-side follow-up SLICE-164 was scoped
to file; SLICE-161's spike found the window-freeze bug itself was loop-side
(no upstream ask needed for that half), but flagged this session_id gap as
separate, still-open scoping information for a future crew-side change —
see FEAT-273's body for the cross-reference.

### Ask

Add a native `session_id` (or `transcript_id`) field to the cost-report
frontmatter schema in `render-frontmatter.ts`, sourced from the `.jsonl`
filename (or its parsed contents) the scanner is already iterating in
`session-cost-scanner.ts`. When a scan spans multiple transcript files,
either emit the most-recent one or a list — either shape is an improvement
over today's absence.

### Acceptance signal

A cost report's frontmatter carries a `session_id` value that traces back to
a real `.jsonl` file under the scanned project directory, without any
loop-side post-write patch required.

## Constraints (both asks)

- Backward compatible: existing callers/consumers that don't read the new
  field, or don't supply `sourceProject` at all, see no behavior change.
- No change to the dedup fingerprint contract
  (`resolveCostReportUsd`/`sliceKeyOf` in runner-plugin's
  `memory-snapshot.mts`) — these asks add corroborating signal, they do not
  replace the existing exact-match dedup key.
