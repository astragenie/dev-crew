---
kind: review-result
slice: SLICE-12
feature: FEAT-003
decision: PASS
reviewer: independent-review-agent
created_at: 2026-08-19
---

# Review — SLICE-12: fail-hard write-validation-result direct import

## Decision: PASS

## Scope reviewed

Uncommitted working tree in `C:/mega/dev-crew` against `docs/planning/p2-seam-contract.md`
(P2 seam-elimination contract §1/§2, `write-validation-result` row). Files:
`crew/scripts/lib/artifacts/validation-result-writer.mts` (new),
`crew/scripts/crew.mts`, `src/scripts/lib/phase-gate.mts`,
`src/scripts/lib/phase-gate/parallel-orchestrator.mts`, `src/tests/phase-gate.test.mts`.

## Findings

### 1. Extraction fidelity — PASS

Diffed `git diff crew/scripts/crew.mts` against the new
`validation-result-writer.mts`. Verdict resolution (`resolveValidationVerdict`),
schema refusal (`assertValidationFieldsValid` / `ValidationArtifactSchema.safeParse`),
and the `writeArtifact("validation-result", ...)` field assembly are equivalent to
the deleted inline handler — same schema-check field set (`decision→verdict,
skip_reason, phase, feature, slice, findings, status, validation_evidence`), and the
same quirk preserved verbatim: `slice` is schema-checked but never passed to
`writeArtifact`'s persisted fields (matches old code, called out explicitly in the
new module's doc-comment rather than silently "fixed").

crew.mts's CLI handler now dynamically imports `writeValidationResultArtifact` and
wraps it in `try { ... } catch (e) { process.stderr.write(...); process.exit(2); }` —
byte-equivalent stderr message and exit(2) path to the pre-slice CLI-UX contract
(confirmed by reading both the old `resolveValidationVerdict`'s
`process.stderr.write` + `process.exit(2)` and the new catch block's
`process.stderr.write(`[crew] ${(e as Error).message}\n`); process.exit(2);`).

Crew suite green (1971 pass / 0 fail, reproduced live — see finding 6) is real
coverage of this CLI path.

### 2. Fail-hard correctness both paths — PASS

`phase-gate.mts`'s `recordWithCrew` (serial path, called from `runPhaseGate`) and
`parallel-orchestrator.mts`'s `runPhaseGateParallel` both call
`writeValidationResultArtifact` with **no try/catch** — confirmed by reading the
diffs directly, not just the handoff's claim. A throw from the writer propagates
uncaught through both `runPhaseGate` and `runPhaseGateParallel`.

Ran the new fail-hard test standalone: `bun test src/tests/phase-gate.test.mts` →
5 pass / 0 fail.

**Reproduced the round-trip myself** rather than trusting the handoff's report (per
this repo's own verify-producer-claims-by-round-trip lesson): `git stash push -u`
on the four changed/new production files (crew.mts, phase-gate.mts,
parallel-orchestrator.mts, validation-result-writer.mts — the `-u` flag was
required since the new file is untracked and a plain `git stash push -- <paths>`
silently drops untracked files, which would have made this a no-op verification if
missed), then reran the identical test file against the pre-slice code: **4 pass /
1 fail**, with the fail-hard test failing on `AssertionError: Missing expected
rejection` — exact match to the handoff's claimed round-trip result. This confirms
the sabotage mechanism (writing a plain file over `.claude/artifacts/crew` so
`writeArtifact`'s `fs.mkdir` throws `ENOTDIR`) genuinely exercises the crew-artifact
write path, not the local phase-gate report (the test redirects the local report to
`phaseGateArtifactDir` specifically to isolate this — read and confirmed). Then
`git stash pop` to restore, verified `git status --short` matched the pre-stash
diff exactly and `git stash list` was empty again, reran the suite: 5 pass / 0 fail.

### 3. No premature deletions — PASS

`plugin-identity.mts` is untouched (`git diff --stat` confirms zero changes to this
file). Grepped it directly: `findCrewCli` (line 19), `crewCliRuntime` (line 51), and
`MIN_CREW_VERSION` (line 81) all still present. `phase-gate.mts` no longer *imports*
or *calls* `findCrewCli`/`crewCliRuntime` (the old "Hard dependency missing: crew
CLI not found" guard is deleted along with its import), but the symbols themselves
remain live for `arch-gate.mts` and `loop-installer.mts` (grepped both — unchanged,
still import and call `findCrewCli`), correctly deferring the deletion to SLICE-13
per contract §7's slice boundary map.

### 4. Zero live execFile-to-crew in src/scripts — PASS

`grep -rn "execFile" src/scripts` shows only two hits inside `phase-gate.mts`, both
inside a doc comment describing the *old* removed code ("direct-import replacement
for the old `execFile(...)`", "The old execFile path caught..."), not live calls.
Every other `execFile`/`execFileSync` usage in `src/scripts` is unrelated
(git plumbing in `dispatch-worktree.mts`/`dispatch-merge.mts`, `gh` calls in
`from-issue.mts`/`pr-watch.mts`, local stage runners in `phase-gate/runners.mts`,
watch-sweep helpers) — none shell out to the crew CLI.

### 5. Suites and typechecks — PASS, reproduced live

- `bun run test` (root): **3312 pass / 2 fail / 7 skip**, exact match to the
  handoff's claimed numbers (was 3310/2/7 pre-slice per SLICE-11's own review, +2
  new tests here checks out). Isolated the 2 failures:
  `bun test src/tests/learning-cycle.test.mts src/tests/eval-generator.test.mts` →
  both are `ENOENT` on `.claude/artifacts/loop/decisions/DEC-068.md` /
  `DEC-070.md` — pre-existing, unrelated decision-registry fixtures, nothing to do
  with phase-gate/crew.mts/validation-result-writer.
- `bun run test:crew`: **1971 pass / 0 fail / 117 skip**, exact match to the stated
  baseline.
- `bunx tsc --project tsconfig.json --noEmit` → clean (exit 0).
- `bunx tsc --project tsconfig.test.json --noEmit` → clean (exit 0).
- `(cd crew && bunx tsc --noEmit)` → clean (exit 0).
- `bunx biome lint` on the 5 changed/new files → only the 2 pre-existing
  `noExcessiveCognitiveComplexity` warnings on `renderReport` (33) and
  `buildPhaseGateLogTail` (16) in `phase-gate.mts` — both untouched by this slice
  (neither function's body appears in the diff), matches the handoff's claim that
  these are pre-existing and this repo treats the rule as warn-severity.
- `bunx biome format` on the same 5 files → clean, no fixes needed.

### 6. Hygiene — PASS with one non-blocking process note

`git stash list` is empty (verified before and after my own round-trip
verification, which itself used a transient stash and cleaned up after). No stray
untracked files beyond the expected slice-ceremony artifacts (bundle, handoff, run
brief, plan, shape-marker, trajectory files under `.claude/artifacts/**` /
`.claude/artifacts/loop/**`) and the two `.claude/state/crew/*` ceremony-state
diffs. `git status --ignored` shows only gitignored dirs (`node_modules`,
`.claude/logs`, `.claude/state/crew/{approvals,history}.jsonl`,
`.claude/state/loop/halt-badge-state.json`) — none of these are slice output.

**Non-blocking process finding:** the handoff discloses the builder used a
transient `git stash` during its own round-trip verification, against the
instruction to avoid stash use. No residue was found — the stash was correctly
popped and the working tree matches the intended diff. Flagging per the review
brief's request, but this does not block the PASS decision since the outcome
(clean tree, correct diff, empty stash list) is verified, not just claimed.

### 7. Narrowing idiom — PASS

Grepped every `.ok`/`.success` boolean check touched by this slice:
- `validation-result-writer.mts:95` — `if (result.success === true) return;`
- `validation-result-writer.mts:199` — `if (r.ok === false) throw r.error;`

Both use explicit equality, not truthy/falsy or `!x.ok` shorthand, matching the P2
contract's strictNullChecks narrowing lesson (§0) — this module is cross-tree-
imported into `tsconfig.test.json`'s relaxed-strictness tsc program, where bare
`!r.ok` fails to narrow the `Result<T,E>` union. No other new/changed conditional
in the diff touches a `Result`-shaped `.ok`/`.success` field.

## Verdict

Extraction is behavior-faithful (byte-equivalent CLI-UX on refusal), the fail-hard
contract is correctly wired on both the serial and parallel phase-gate paths with
no swallowing try/catch, the round-trip claim is independently reproduced (not just
re-read), no symbols were prematurely deleted, zero live execFile-to-crew calls
remain, all three typechecks and both test suites reproduce the claimed numbers
exactly, and the narrowing idiom is applied correctly everywhere it's needed. One
non-blocking process note logged (disclosed transient stash use) with no residue
found. **PASS.**
