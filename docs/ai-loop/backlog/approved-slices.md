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

**Status:** COMPLETED — 2026-06-04. All 6 ACs pass. Commit: 8d4c9dd.

**Goal:** Add `checkpointCommit()` — a structured WIP git commit primitive that writes subject `wip(checkpoint): <sliceId> — <summary>` with optional body sections. No-op when tree is clean. Foundation for continuous auto-commit safety net (FEAT-012 SLICE-A).

**Done When:**
- AC-1: `npm test` + `npm run lint` + typecheck + format-check + validators all pass
- AC-2: `checkpointCommit()` in `scripts/lib/checkpoint-commit.mjs`, returns `{ committed, sha?, reason? }`
- AC-3: clean tree → `{ committed: false, reason: "clean" }`, no commit made
- AC-4: subject truncated to 72 JS string code-units with `…`
- AC-5: empty body sections omitted
- AC-6: re-exported from `src/scripts/lib/slice-linker.mts`

**Files:** `src/scripts/lib/checkpoint-commit.mts`, `scripts/lib/checkpoint-commit.mjs`, `src/tests/checkpoint-commit.test.mts`, `src/scripts/lib/slice-linker.mts`

---

## SLICE-39 — Glob-scoped context rules (FEAT-007, P3)

**Status:** COMPLETED — 2026-06-04. All 6 ACs pass. Commit: f11e7e9.

**Goal:** Add `contextRules` array to `.claude/loop.json` config. Installer renders glob-to-docs mappings into `{{contextRulesList}}` token in MASTER_PROMPT, instructing the agent to read matching docs when a slice's `in_scope_globs` overlaps the rule patterns. Remote import (GitHub fetch) explicitly out of scope.

**Done When:**
- AC-1: `npm test` + lint + typecheck + format-check + validators all pass
- AC-2: `contextRules` in `loop.json` → MASTER_PROMPT block contains glob-to-docs mapping
- AC-3: Absent/empty `contextRules` → no "Context rules" heading in MASTER_PROMPT
- AC-4: Rendered section contains `in_scope_globs` instruction prose
- AC-5: Existing `mandatoryDocs` behavior unchanged
- AC-6: Unit tests cover absent, empty, populated + instruction prose cases

**Files:** `src/scripts/lib/loop-installer.mts`, `templates/master-prompt.md`, `src/tests/loop-installer.test.mts`

---

## SLICE-84 — Skill activation triggers (FEAT-134, P1)

**Status:** COMPLETED — 2026-06-09. All 7 ACs pass. Commit: 21c1cf6.

**Goal:** Add `trigger` field (`always_on` | `glob` | `manual`) to SKILL.md frontmatter. New `parseSkillFrontmatter` parser + async `buildSkillActivationBlock` renders conditional invocation instructions into MASTER_PROMPT via `{{skillActivationBlock}}` token. `always_on` (default) emits nothing — backward-compatible. `model_decision` deferred to SLICE-85.

**Done When:**
- AC-1: `npm test` + lint + typecheck + format-check + validators all pass
- AC-2: `parseSkillFrontmatter` reads `trigger` (default `always_on`) and `globs` from SKILL.md string
- AC-3: No conditional skills → empty string, no blank `##` heading in MASTER_PROMPT
- AC-4: `trigger: "manual"` skill → instruction rendered stating explicit-request-only activation
- AC-5: `trigger: "glob"` skill → instruction rendered containing skill name + glob patterns
- AC-6: Unit tests cover absent trigger, `always_on`, `manual`, `glob`, `model_decision` (parsed but not rendered)
- AC-7: `buildTokens` includes `skillActivationBlock` key; template token renders empty when no conditional skills

**Files:** `src/scripts/lib/skill-frontmatter.mts`, `src/scripts/lib/loop-installer-tokens.mts`, `src/scripts/lib/loop-installer.mts`, `templates/master-prompt.md`, `src/tests/skill-frontmatter.test.mts`, `src/tests/loop-installer-tokens.test.mts`

---

## SLICE-85 — Verification skill evidence table gaps (FEAT-089, P2)

**Status:** PENDING

**Goal:** Add `trigger: "always_on"` to `skills/verification-before-completion/SKILL.md` frontmatter and two missing evidence rows (`typecheck` + `function-exists`) to the Claim→Evidence table. Closes FEAT-089 — the SKILL.md existed from SLICE-09 but predates the trigger field and was missing the two rows that address the SLICE-81 fabrication pattern.

**Done When:**
- AC-1: SKILL.md frontmatter has `trigger: "always_on"`
- AC-2: Evidence table has `typecheck` row (claim: "type-checks" → `npm run typecheck` exit 0)
- AC-3: Evidence table has `function-exists` row (claim: "function/module added" → grep/file-read evidence)
- AC-4: Existing Iron Law + checklist blocks preserved verbatim
- AC-5: `npm test` green
- AC-6: `node ./scripts/validate-manifests.mjs` passes

**Files:** `skills/verification-before-completion/SKILL.md`
