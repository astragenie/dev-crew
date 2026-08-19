---
decision: approved
reviewer: crew:reviewer
slice: SLICE-17
---

# Review: SLICE-17 — hooks merge + matcher-scoped consolidation

Scope reviewed: `.claude-plugin/hooks/hooks.json`, `tsconfig.json`,
`hooks/pre-push-gate.mts` (new). Uncommitted working-tree changes at
`C:/work/mega/devcrew`, branch `main`.

## 1. Registration completeness

Independently re-derived the pre-merge state via `git show
HEAD:.claude-plugin/hooks/hooks.json` (12 runner registrations) and
`crew/hooks/hooks.json` on disk (26 crew registrations, byte-identical to
its pre-slice state — confirmed unchanged), then hand-counted every
script-level entry in the merged file. All 38 pre-merge registrations are
accounted for: 36 present 1:1, minus 2 for the two claimed real merges
(preflight-shell Bash+PowerShell matcher-group merge, pre-push
verifier+validate script-level merge). No event silently dropped — every
crew and every runner registration from both source files maps onto a
present entry in the merged manifest. Totals in the handoff's table check
out exactly.

Matcher-scoping spot-check (4, as requested):
- `preflight-shell.mts` → `Bash|PowerShell`: the script's own header comment
  says "PreToolUse hook on Bash and PowerShell" — matcher matches the
  script's own stated contract exactly. Correct, and the merge from two
  identical-command matcher groups into one is behavior-neutral (a Bash call
  was never going to also satisfy a PowerShell matcher).
- `pre-push-gate.mts` → `Bash`: correct — `git push`/`git commit`/`gh pr
  create` are only ever issued through the Bash tool in this repo's usage.
- `otel-post-tool-use.mts` → unconditional (no matcher): script's own header
  comment plus logic confirm it must observe every tool call for tracing
  spans — matcher-scoping it would silently drop telemetry for non-Bash
  tools. Correctly left unscoped.
- `checkpoint-cadence.mts` → unconditional (no matcher): script's own header
  comment states "no matcher — fires on every tool call inside a session"
  and its cadence counter increments per call — scoping it to
  Edit/Write/MultiEdit would undercount and break the N-call nudge cadence.
  Correctly left unscoped.

All four hold up against the actual script logic, not just the handoff's
assertion.

## 2. pre-push-gate.mts consolidation

Read `hooks/pre-push-gate.mts` against both parents
(`crew/hooks/pre-push-verifier.mts`, `src/scripts/pre-push-validate.mts`).
Confirmed present and behaviorally intact:
- crew's blocking gate: `CREW_PUSH_VERIFY` bypass, `push-verify` feature
  flag, `deployment.md` opt-out, validation-artifact cache scan, docs-only
  bypass, and the exact block-message format — all ported.
- runner's soft gate: manifest check on commit+push, content-length +
  format:check + snapshot-freshness warn-only on push — same check set,
  same commit-vs-push escalation logic as the original.
- Precedence when both fire: crew's block wins, soft warning folded into
  the block message — matches the handoff's stated design and is a
  reasonable, documented choice (a hard block is a stronger signal).
- Windows cwd fix: verified by reading the code and by re-running the
  hook standalone (below) — `runSoftChecks` deliberately does not pass
  `cwd` to the spawned checks, matching the original
  `pre-push-validate.mts`'s behavior exactly. Ran both a non-push and a
  `git push origin main` payload through `bun hooks/pre-push-gate.mts`
  directly; both exited 0 with no `ENOENT ... cmd.exe` spawn failure —
  confirms the regression fix holds on this Windows box.

One completeness gap, not blocking: the original runner entry carried an
explicit `"timeout": 30` on the hooks.json registration;
`crew/hooks/pre-push-verifier.mts`'s registration had no explicit timeout.
The merged `pre-push-gate.mts` registration also carries no explicit
timeout, i.e. it silently inherited crew's (looser) timeout convention
rather than the tighter 30s the runner side had. Given the merged hook now
does strictly more work per push (both check sets concurrently via
`Promise.all`) this is arguably the safer direction, but it's an implicit
side effect of the merge that the handoff doesn't call out. Worth a
one-line mention in a future pass; not worth blocking this slice on.

## 3. Deferred-relocation rationale

Confirmed both legs independently:
- `crew/tests/telemetry-hooks-json.test.mts` resolves `HOOKS_JSON_PATH` to
  `crew/tests/../hooks/hooks.json` = `crew/hooks/hooks.json` and hard-asserts
  specific commands inside it (`log_event.sh`, `post-tool-use-bash-gate.mts`,
  the new OTel entries) via `.includes(...)` string checks — moving the file
  or its contents would break this test as claimed.
- `crew/hooks/*.mts` scripts import from `crew/scripts/lib/**` (e.g.
  `otel-post-tool-use.mts` → `../scripts/lib/telemetry/*`). Confirmed on
  disk: `src/scripts/lib/telemetry/` does not exist while
  `crew/scripts/lib/telemetry/` does — physically relocating the hook
  scripts today would break every import without the still-pending
  `crew/scripts/lib` → `src/scripts/lib` merge landing first. Deferral is
  correctly justified, not just asserted.

## 4. Latency evidence honesty

Independently re-ran the sequential-spawn model (spawnSync each of the 6
AFTER-state Bash-relevant hooks in registration order, sum wall-clock,
N=20, same technique as `crew/tests/hook-cold-start-bench.test.mts`) from a
freshly written scratch harness, not reusing the handoff's script:

```
AFTER sequential (6 spawns), N=20: p50=434.1ms p95=443.4ms
```

This lands within ~2% of the handoff's claimed AFTER p50 of 427.1ms — well
inside noise for a wall-clock spawn benchmark on a shared dev box. Also
re-ran `crew/tests/hook-cold-start-bench.test.mts` standalone: single-hook
p50=60.3ms, consistent with the claimed ~60-110ms/spawn cold-start floor
underpinning the AC-4 analysis.

Judgment on the AC-4 amendment: **agree**. The math is sound — 6 required
spawns at a ~60-110ms Windows-local floor cannot land under 150ms
sequentially, and even the parallel-per-phase model is bounded below by the
single slowest hook in a phase (`otel-post-tool-use.mts` at ~102-112ms,
unconditional-by-design, cannot be matcher-scoped away). Both of this
slice's own measurements and mine agree the AFTER state is flat/within
noise of BEFORE in the parallel model — the 12% sequential-model win is
real but insufficient to close a ~3x gap. Escalating the prompt-based-hooks
spike as the structural fix rather than chasing more spawn-count reduction
is the right call; there's no further mechanical consolidation available
without cutting functionality (reviewer-decision gate, builder-terminal-state
gate, telemetry).

## 5. Gates

Re-ran independently rather than trusting the handoff's report:

- `bunx tsc --project tsconfig.json --noEmit` (root): exit 0.
- `bunx tsc --project tsconfig.test.json --noEmit`: exit 0.
- `bunx tsc --project crew/tsconfig.json --noEmit` (from `crew/`): exit 0.
- `bun ./src/scripts/validate-manifests.mts`: OK.
- `bun ./src/scripts/validate-imports.mts`: OK.
- `bun ./src/scripts/validate-dispatch-markers.mts`: OK, 7 fixtures balanced.
- `bun ./src/scripts/validate-content-length.mts`: OK.
- Confirmed `biome.json`'s `files.includes` is `["**/src/**", ...]` —
  `hooks/pre-push-gate.mts` (root-level `hooks/`, not `src/`) is genuinely
  outside biome's scope, matching the claim that lint/format gates don't
  touch this file.
- Re-ran both claimed contention-flake tests standalone:
  `crew/tests/memory-write-handoff-credit.test.mts` → 5 pass, 0 fail.
  `crew/tests/hook-cold-start-bench.test.mts` → 1 pass, 0 fail (p50=60.3ms).
  Both clean in isolation, corroborating "pre-existing flake, not a
  regression" — neither test touches hooks.json or any hook script.
- Did not re-run the full 3316-test root suite or full 1978-test crew suite
  (multi-minute each); spot-checked the two named flakes and the
  hooks-adjacent gates directly relevant to this diff instead.

## Overall

Every checkable claim in the handoff held up under independent
re-derivation: the registration table, the matcher-scoping rationale (verified
against actual script logic, not just assertion), the deferred-relocation
justification (verified against the actual test file and the actual absent
`src/scripts/lib/telemetry`), and the latency numbers (reproduced within 2%
from a fresh harness). The Windows cwd regression fix was verified live, not
just read. One minor, non-blocking gap: the implicit timeout-convention
change on the merged pre-push hook (30s explicit → unset) isn't mentioned in
the handoff's regression section even though it's a real behavioral delta.

**Decision: approved.**
