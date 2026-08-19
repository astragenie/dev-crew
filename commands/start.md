---
name: start
description: Start a slice — accept a FEAT id or SLICE id, create the slice file if needed, classify shape (populates touches_files for wave planner), rotate workflow-state.currentRun, and return a dispatchInstruction. Subsumes slice-from-feature, derive-slice, next-slice, and the classify-slice-shape internal step.
auto_execute_steps: false
---

# devcrew:start

Single ceremony command for opening a slice. Merges:

- `devcrew:slice-from-feature` (create slice from FEAT)
- `devcrew:slice-start` (rotate currentRun + dispatch instruction)
- `devcrew:derive-slice` (derive next slice from feature)
- `devcrew:next-slice` (auto-pick from backlog)
- internal `classify-slice-shape` step (populate `touches_files`)

This subsumes slice-from-feature, derive-slice, next-slice, and the classify-slice-shape internal step.

## Modes

```
devcrew:start FEAT-NNN
  → create SLICE-NN.md from the FEAT via sliceFromFeature
  → run classify-slice-shape → populate touches_files in result
  → rotate workflow-state.json.currentRun via crew write-run-brief
  → return { slice, dispatchInstruction, touchesFiles }

devcrew:start SLICE-NN
  → slice already exists; just rotate currentRun
  → idempotent on re-run

devcrew:start
  → pick highest-priority triaged FEAT (P0 > P1 > P2 > P3, lowest id wins)
  → behave like devcrew:start FEAT-NNN
```

## Usage

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice start \
  --repo "$PWD" \
  --id FEAT-NNN \
  [--goal "<one-line goal override>"] \
  [--no-dispatch]
```

`--no-dispatch` opts out of the dispatch instruction (used for manual or
debugging invocations). The autonomous loop should always omit this flag so
implementation runs through a `devcrew:fullstack-dev` subagent.

## Returns

```json
{
  "slice": { "id": "SLICE-18", "title": "SLICE-18: ICrewArtifactSource + ObservedApplication source fields" },
  "activePlan": { "source": "superpowers", "path": "docs/superpowers/plans/..." },
  "runBrief": { "artifactPath": ".claude/artifacts/crew/runs/<stamp>-run-brief-slice-18-...md" },
  "sliceProgress": { "path": ".claude/state/crew/slice-progress.md", "completedCount": 17, "totalCount": 19 },
  "touchesFiles": ["src/api/thing.ts", "src/types/dto.ts"],
  "dispatchInstruction": "Dispatch devcrew:fullstack-dev subagent with this prompt:\n\n..."
}
```

`touchesFiles` is populated from the `## Files` section of the slice file via
`classify-slice-shape`. Empty array when the section is absent — wave planner
skips conflict detection for the slice in that case.

`dispatchInstruction` is null when `--no-dispatch` was passed.

## When to run

Per `Slice Start Ceremony — HARD RULE` in `.claude/loop/rules.md`:
at the top of every slice, before any TDD / implementation work. Do
NOT begin a slice without rotating `currentRun` — a stale window makes
the close ceremony's cost auto-emit attribute work to the wrong slice.

## What to do after

The returned `nextAction` is a literal prompt to follow:

1. Dispatch `devcrew:fullstack-dev` subagent for slice implementation. Builder
   owns implementation only and returns a write-handoff artifact path
   when acceptance criteria PASS in its self-verify gates.
2. Dispatch `devcrew:reviewer` subagent for the review gate.
3. If behavior changed, dispatch `devcrew:verifier` subagent for the validation gate.
4. Run `/devcrew:close SLICE-NN` to close.

## Session start (autonomous loop)

To start an autonomous loop session (previously `devcrew:start` pre-v0.53),
use `/devcrew:auto`.

## Marathon runner routing (autonomous loop, session-level)

Before entering the sequential walker, check `.claude/loop.json` for
`loop.marathonRunner`:

```bash
RUNNER=$(bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" config get loop.marathonRunner --repo "$PWD" 2>/dev/null || echo "sequential")
```

If `RUNNER === "wave"`, delegate to `/devcrew:wave loop` and exit.
If `RUNNER === "sequential"` (default), proceed with the sequential workflow.

## Role glossary

| Role | Agent ID | Responsibility |
|---|---|---|
| **builder** | `devcrew:fullstack-dev` / `devcrew:backend-dev` / `devcrew:frontend-dev` | Implements acceptance criteria in bounded scope; owns tests for changed behavior |
| **reviewer A** | stack-specific: `devcrew:csharp-reviewer` (.cs diff) / `devcrew:typescript-reviewer` (.ts diff) / skip when no stack match | Stack idiom, type safety, framework wiring |
| **reviewer B** | `devcrew:reviewer` | Correctness, logic, edge cases, AC coverage, production-readiness |
| **design reviewer** (ADR/contract slices) | `devcrew:architect-reviewer` | Service boundaries, scalability, integration risk |
| **light reviewer** (≤2 files, ≤50 LOC) | `devcrew:reviewer-lite` | Single-pass light-tier review |
| **validator** | `devcrew:verifier` | Behavior validation — runs or inspects the changed behavior against ACs |
| **deployer** | `devcrew:release-engineer` | Deployment and environment evidence; promotion to dev/prod |
| **pm** | `devcrew:pm` | Backlog scoring across 5 dimensions; AC clarity gate; `autonomous_safe` determination |
| **architect** | `devcrew:architect` | Read-only design and ADR authoring for structural changes |
