# Root-cause spike: cost-report scan window never resets (SLICE-161 / FEAT-268)

Status: **CONCLUDED — loop-side.** No crew-side fix or upstream request
required; see "AC-2 disposition" below.

## Summary

The frozen `Window Start` in per-slice cost reports is caused by the loop
side (`runner-plugin`) never telling `crew cost-slice` what window to scan.
Every invocation of `tryWriteCostReport` omits `--started-at` /
`--completed-at`, so the crew CLI falls back to whichever `startedAt` value
happens to be sitting in `workflow-state.json`'s `currentRun` at that
moment — a value that is shared across the whole repo and is only ever
refreshed by `crew write-run-brief`, which loop invokes exclusively at slice
**start**, not at slice **close**. Any close that isn't preceded by a fresh
start for that same slice (retries, out-of-band reconciliation, a slice
whose start ceremony was skipped) silently inherits a stale window that can
be days or weeks old. Crew's own window arithmetic is correct and faithful
to what it's told; it is not the source of the bug.

## Evidence

Five cost reports for the same slice, all still on disk under the main
checkout (`C:\work\mega\runner-plugin`, read-only reference for this spike):

- `.claude/artifacts/crew/cost/20260710T121830Z-cost-report-slice-feat250-slice153.md`
- `.claude/artifacts/crew/cost/20260710T122057Z-cost-report-slice-feat250-slice153.md`
- `.claude/artifacts/crew/cost/20260710T122109Z-cost-report-slice-feat250-slice153.md`
- `.claude/artifacts/crew/cost/20260710T122151Z-cost-report-slice-feat250-slice153.md`
- `.claude/artifacts/crew/cost/20260710T122202Z-cost-report-slice-feat250-slice153.md`

All five were created within a ~4-minute span on 2026-07-10 (12:18:30Z →
12:22:02Z, per each file's own `Created` line and `created_at` frontmatter).
All five carry the **byte-identical** `Window Start: 2026-07-03T10:50:26.134Z`
— a full week before any of them were written — while `Window End` (and the
cumulative token/USD totals) correctly advances report to report:

| Report (Created, UTC) | Window Start | Window End | Total Tokens | USD |
|---|---|---|---|---|
| 12:18:30 | 2026-07-03T10:50:26.134Z | 12:18:29.544Z | 1,823,410,237 | $3230.84 |
| 12:22:02 | 2026-07-03T10:50:26.134Z | 12:22:02.409Z | 1,831,017,313 | $3233.58 |

(Middle three reports omitted from the table — same pattern, `Window Start`
identical, `Window End`/totals monotonically increasing.)

This is the FEAT-268 body's "cumulative re-reports of the same spend"
pattern, reproduced with exact file:line evidence. The original FEAT-268
description says "a day apart" / "frozen for days" — the actual artifacts
show it recurring at minutes-apart granularity too; the mechanism is the
same regardless of the gap length between invocations, so this is a
stronger (not weaker) reproduction than the FEAT description assumed.

## Mechanism (file:line trail)

### Loop side never supplies an explicit window

`src/scripts/lib/slice-linker/crew-bridge.mts:235` builds the `cost-slice`
argv:

```
const reportArgs = [cli, "cost-slice", "--repo", repoPath, "--run-title", runTitle];
```

`appendFeaturePhaseArgs` (`crew-bridge.mts:173-182`) adds `--feature`/
`--phase` at `crew-bridge.mts:243`, but there is no equivalent helper for
`--started-at`/`--completed-at` anywhere in this file. `tryWriteCostReport`
(`crew-bridge.mts:223-278`) never passes either flag on any call path.

### Loop side already HAS the value in scope — and drops it

`src/scripts/lib/slice-linker/complete-slice.mts:490` (`resolveSliceContext`)
already reads the exact value crew would fall back to:

```
const startedAt = workflowState?.currentRun?.startedAt ?? null;
```

That `startedAt` is threaded into `tryWriteAgentReport` two lines later
(`complete-slice.mts:543`) but is **not** passed to `tryWriteCostReport`
(`complete-slice.mts:537`), which only receives `{ sliceId, featureId,
phase }`. This is a real gap but not sufficient by itself to fix the bug —
see "Why threading `startedAt` through is not enough" below.

### currentRun.startedAt is only rotated at slice START

`src/scripts/lib/slice-linker/start-slice.mts:680` calls
`writeCrewRunBrief`, which invokes crew's `write-run-brief` command. On the
crew side (verified in both the `dev-team` source checkout and the actually
-installed `crew@0.67.0` plugin cache at
`C:\Users\serge\.claude\plugins\cache\astra\crew\0.67.0`, byte-identical
logic in both):

- `registerWorkflowArtifact`'s `run-brief` branch
  (`scripts/lib/workflow-state.ts:568-581`, labeled "BUG-B fix" in a prior
  comment) archives the existing `currentRun` and creates a fresh one via
  `createRun(...)`.
- `createRun` (`scripts/lib/workflow-state-gates.ts:146-152`) sets
  `startedAt: nowIso()` — a genuinely fresh timestamp.

So crew's rotation-on-start logic is correct and present in the installed
version. The problem is that **nothing rotates `currentRun` at close time**,
and `write-run-brief` is the *only* thing that rotates it. If a slice close
happens without an immediately-preceding fresh start for that same slice —
a retry, an out-of-band reconciliation pass, or (per this repo's own
memory: "Direct merge strands FEATs in pending — build→PR→merge skips
`/runner:close`; reconcile pending→done manually") a slice whose normal
start ceremony was bypassed entirely — `currentRun.startedAt` is whatever
was left over from the last slice that *did* run the start ceremony,
however old. The 2026-07-10 evidence lines up with this repo's own
"Tracker milestone recovery 2026-07-10" episode (FEAT-250/251/252
reconciled that day), which is exactly the kind of out-of-band
close-without-fresh-start flow this mechanism predicts.

### Crew-side fallback itself is working as designed

`dev-team/scripts/lib/cost-hygiene/cost-slice-handler.ts:85-102`
(`resolveCostSliceParams`, identical in the installed `crew@0.67.0` cache)
prefers an explicit `flags.startedAt` (`--started-at`) and only falls back
to `run?.startedAt` when the caller doesn't supply one. Crew's CLI help
text even documents the flag
(`scripts/crew.ts:445`: `cost-slice ... [--started-at <iso>] ...`) and its
flag parser recognizes it (`scripts/crew.ts:116`:
`"--started-at": { key: "startedAt" }`). Loop simply never uses it.

### Why threading the existing `startedAt` through is not enough

Even if `complete-slice.mts:537` forwarded the `startedAt` it already reads
at line 490 as an explicit `--started-at`, the value passed would be
*exactly the same, already-stale* `currentRun.startedAt` crew would have
fallen back to anyway — same source, no new information. This would make
today's behavior deterministic and inspectable (no more silent fallback)
but would not fix the frozen-window symptom. A real fix needs a window
boundary that is independent of crew's shared, cross-slice, start-only-
rotated `currentRun` — e.g. loop persisting each slice/feature's own last
scanned `Window End` and passing that forward explicitly as the next
scan's `--started-at`, regardless of whether `write-run-brief` happened to
run in between. That design is SLICE-162's job, not this spike's.

## AC-2 disposition (no upstream request filed)

AC-2 only requires a `docs/upstream-requests/` file "when [the
investigation] concludes the bug is crew-side." It does not — crew performs
correctly given what it is told, and its rotation-on-`write-run-brief`
behavior is present, wired, and verified in the actually-installed version.
No upstream request is filed for the window-freeze itself.

One adjacent, non-blocking observation worth a note for SLICE-162's design
discussion (not an upstream ask): crew's cost-report frontmatter carries no
session/transcript identity today (verified against
`scripts/lib/cost-hygiene/render-frontmatter.ts` — the emitted fields are
`kind/phase/feature/slice/run_title/usd/duration_ms/total_tokens/
cache_hit_pct/grade_avg/review_decision/validation_decision/
source_project/auto_detected/aggregate_all/source_count/created_at`, no
session or transcript field). The scanner
(`scripts/lib/session-cost-scanner.ts`) does iterate individual `.jsonl`
transcript files per project dir, so a natural session identifier exists
mid-scan, it's just not threaded out to the artifact. AC-3 (SLICE-162) will
need either a small crew-side addition to surface that id, or a loop-side
substitute (e.g. stamping `workflow-state.currentRun`'s `runId`, which
`cost-slice-handler.ts:166-169`'s `collectDispatchBreakdown` already reads
for dispatch-timing correlation). This is scoping information for
SLICE-162, not a decision made here.

## Scoping guidance for sibling slices

- **SLICE-162 (fix + stamp session/transcript id)**: needs (a) an
  independent per-slice/feature cost-scan cursor that survives across
  close retries and skipped starts — not a re-read of `currentRun`; (b) a
  new `--started-at`/`--completed-at` passthrough on `tryWriteCostReport`'s
  `reportArgs` (mirroring `appendFeaturePhaseArgs`,
  `crew-bridge.mts:173-182`); (c) a decision on how the crew session/
  transcript id reaches the report frontmatter (crew-side field addition
  vs. loop-side `runId` stamp — see disposition note above).
- **SLICE-163 (regression test)**: assert two consecutive scans against a
  fixture/mocked transcript produce a second `Window Start` that is not
  equal to the first invocation's frozen value (the exact failure mode
  reproduced above), AND add an explicit pinning test that
  `resolveCostReportUsd` / `sliceKeyOf`
  (`src/scripts/lib/memory-snapshot.mts:124` and `:157`) still fully
  dedup same-slice-key reports to a single value rather than merging or
  averaging — per AC-4, these must not be loosened to a tolerance band.
- **SLICE-164 (upstream-request if crew-side + docs)**: the "if crew-side"
  branch is moot per the AC-2 disposition above. Recommend PM/architect
  re-scope this slice at next triage to documentation-only (e.g. CHANGELOG
  / halt-badges.md updates once SLICE-162 lands) rather than carrying a
  now-inapplicable upstream-request deliverable.

## Files referenced (read-only, no edits made in this spike)

- `src/scripts/lib/slice-linker/crew-bridge.mts` (runner-plugin)
- `src/scripts/lib/slice-linker/complete-slice.mts` (runner-plugin)
- `src/scripts/lib/slice-linker/start-slice.mts` (runner-plugin)
- `src/scripts/lib/memory-snapshot.mts` (runner-plugin)
- `.claude/artifacts/crew/cost/20260710T*-cost-report-slice-feat250-slice153.md`
  (runner-plugin main checkout, five files)
- `scripts/lib/cost-hygiene/cost-slice-handler.ts` (dev-team, read-only reference)
- `scripts/lib/workflow-state.ts` (dev-team, read-only reference)
- `scripts/lib/workflow-state-gates.ts` (dev-team, read-only reference)
- `scripts/lib/cost-hygiene/render-frontmatter.ts` (dev-team, read-only reference)
- `scripts/lib/session-cost-scanner.ts` (dev-team, read-only reference)
- `scripts/crew.ts` (dev-team, read-only reference)
- Installed plugin cache cross-check:
  `C:\Users\serge\.claude\plugins\cache\astra\crew\0.67.0\scripts\lib\workflow-state.ts`
  and `...\scripts\crew.ts` (confirmed byte-identical rotation/flag-parsing
  logic to the `dev-team` source checkout, so this is not a stale-cache
  artifact)
