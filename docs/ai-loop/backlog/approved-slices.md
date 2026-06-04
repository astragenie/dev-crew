# Approved Slices — Untitled product

Slices listed here may be implemented. Pick the highest-priority non-completed slice each run.

Rules:
- Every approved slice must have acceptance criteria mapping
- Every approved slice must have defined done conditions
- Slice is complete only when all "Done When" criteria are met with evidence (see `../01-loop-control/EVIDENCE_RULES.md`)
- Future slices must go through: `slices/pending/` → Reviewer A + B → here

**State machine**: Pending → Reviewed → Approved → In Progress → Completed / Blocked

---

## SLICE-03 — Fix agent-report filename (FEAT-002, P1)

**Status:** COMPLETED — 2026-05-28. Spec + quality reviews PASS. Commit: 850b69f.

**Goal:** `writeAgentReport` emits `<TS>-agent-report-<slug>.md` (was `<slug>-agent-report.md`).

**Done When:**
- `writeAgentReport` output path basename matches `\d{8}T\d{6}Z-agent-report-.+\.md`
- `npm test` green
- `npm run lint` clean

**Files:** `scripts/lib/slice-linker/agent-report-writer.mjs`, `tests/agent-report-writer.test.mjs`

---

## SLICE-04 — Add identification headers to artifact bodies (FEAT-003, P1)

**Status:** COMPLETED — 2026-05-28. Spec + quality reviews PASS. Commit: 5c02b2d.

**Goal:** ADD phase→feature→slice identification line to grade-writer and crew-bridge
handoff/final-synthesis bodies (currently absent). agent-report-writer already correct.

**Done When:**
- grade-writer, crew-bridge handoff, crew-bridge final-synthesis all emit identification
- `npm test` green
- `npm run lint` clean

**Files:** `scripts/lib/grade-writer.mjs`, `scripts/lib/slice-linker/crew-bridge.mjs`,
`scripts/lib/slice-linker/agent-report-writer.mjs` (export renderIdentification only),
tests for changed writers.

---

## SLICE-38 — Checkpoint commit primitive (FEAT-012, P2)

**Status:** PENDING

**Goal:** Add `checkpointCommit()` — a structured WIP git commit primitive that writes subject `wip(checkpoint): <sliceId> — <summary>` with optional body sections. No-op when tree is clean. Foundation for continuous auto-commit safety net (FEAT-012 SLICE-A).

**Done When:**
- AC-1: `npm test` + `npm run lint` + typecheck + format-check + validators all pass
- AC-2: `checkpointCommit()` in `scripts/lib/checkpoint-commit.mjs`, returns `{ committed, sha?, reason? }`
- AC-3: clean tree → `{ committed: false, reason: "clean" }`, no commit made
- AC-4: subject truncated to 72 JS string code-units with `…`
- AC-5: empty body sections omitted
- AC-6: re-exported from `src/scripts/lib/slice-linker.mts`

**Files:** `src/scripts/lib/checkpoint-commit.mts`, `scripts/lib/checkpoint-commit.mjs`, `src/tests/checkpoint-commit.test.mts`, `src/scripts/lib/slice-linker.mts`
