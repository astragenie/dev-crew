---
title: Evidence-Before-Claims Verification Gate
date: 2026-05-28
status: draft
owner: lead
type: feature-spec
feat: FEAT-014
---

# Evidence-Before-Claims Verification Gate

## Goal

Add `skills/verification-before-completion/SKILL.md` to this repo -- a
named loop skill that agents load before making any "DONE / PASS /
complete" claim mid-task. The skill contains an `<IRON-LAW>` block and
an evidence table that maps every common claim type to the concrete
command or artifact required to back it up.

The existing validation gate in `scripts/lib/validation-gate.mjs` blocks
the **slice-close ceremony** if no validation artifact is present. This
skill adds an earlier, mid-task enforcement layer: before the agent types
any success word, it must have run the relevant verification command in
the same message turn and pasted the output inline or written it to an
artifact. The two mechanisms are complementary -- the skill prevents false
claims from accumulating; the gate prevents false closes from landing.

## Non-Goals

- No runtime code changes. This is a pure Markdown convention addition.
- No changes to `validation-gate.mjs`, loop ceremonies, or crew commands.
- No new CI steps. The skill is read by agents, not executed by CI.
- No changes to existing `skills/loop-discipline/SKILL.md` or other skills
  (each skill stays single-responsibility).
- No coverage of deployment evidence (that is handled by the deployer role
  and `crew write-validation-result`; this skill covers mid-task agent claims).

## Skill Design

### File placement

    skills/verification-before-completion/SKILL.md

This is consistent with every other skill in this repo (`skills/<slug>/SKILL.md`).

### Skill frontmatter

    ---
    name: loop:verification-before-completion
    description: >
      Load before claiming any task, acceptance criterion, or slice is done,
      passing, fixed, or complete. Contains the Iron Law and evidence table
      that maps each claim type to its required command evidence. Trigger
      automatically whenever the agent is about to write DONE, PASS, complete,
      fixed, works, clean, or any synonym.
    ---

### Trigger condition

The skill should be invoked by the harness Skill tool (or read by the agent
as a standing rule) whenever the agent is about to produce output containing
any of the following terms (or their synonyms) in a success context:

- DONE, done, complete, completed, finished
- PASS, passes, passing
- fixed, resolved, works, working
- clean, no errors, no warnings, no failures
- all tests pass, lint clean, type-check passes

### What counts as evidence

Evidence is **one of**:

1. **Command output pasted inline** in the same message turn where the claim
   is made. Must include the full terminal output (not a summary) and show
   exit code, pass/fail counts, or zero-error output.
2. **Artifact file written** -- a validation artifact under
   `.claude/artifacts/crew/validations/` (written via `crew write-validation-result`)
   that is referenced by path in the claim message.

Evidence is **not**:

- "I believe the tests pass"
- "Should be clean now"
- "I ran it earlier and it was fine"
- "The logic is correct so it should work"
- A partial check (e.g. one test file instead of the full suite)
- A lint check substituted for a test check
- A prior turn's output (output must be from this turn)

## Evidence Table

| Claim type | Required evidence command | What to check in output |
|---|---|---|
| "tests pass" | `npm test` | Exit 0; zero failing tests (`0 failing` or `pass N/N`) |
| "lint clean" | `npm run lint` | Exit 0; zero warnings, zero errors |
| "format clean" | `npm run format:check` | Exit 0; no files listed as needing reformatting |
| "type-check passes" | `npm run typecheck` (if script exists; skip row if absent) | Exit 0; zero type errors |
| "manifests valid" | `node ./scripts/validate-manifests.mjs` | Exit 0; no validation errors |
| "feature works / observable behavior" | Describe concrete observable behavior + write validation artifact at `.claude/artifacts/crew/validations/<slug>.md` via `crew write-validation-result` | Artifact path returned; status `passed` in frontmatter |
| "no regressions" | `npm test` before and after change, both in same session | Before: N passing; after: same N passing, 0 new failures |
| "bug is fixed" | Re-run the specific test that reproduces the bug | Test was failing before fix (RED); passes after fix (GREEN); full suite still passes |
| "CI would pass" | `npm ci && node ./scripts/validate-manifests.mjs && npm run lint && npm run format:check && node --test tests/*.test.mjs` | All steps exit 0 |
| "slice acceptance criteria met" | Each criterion individually verified above + validation artifact written | Artifact path present; all criteria show inline or artifact evidence |

## Iron Law Block

The following block is the literal text that must appear in the skill file,
wrapped in `<IRON-LAW>` tags consistent with the FEAT-013 Iron Law hard-gate
tag convention:

    <IRON-LAW>
    NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.

    Verification evidence means: the command was run IN THIS MESSAGE TURN,
    the full output is pasted inline or written to a validation artifact,
    and the output confirms the claim.

    "I believe", "should work", "I ran it earlier", and "looks correct"
    are NOT evidence. They are guesses dressed as facts.

    Violating the letter of this rule is violating the spirit of this rule.
    No exceptions. No "just this once".
    </IRON-LAW>

### Rationalization table

The following table must appear in the skill file immediately after the Iron Law
block. Its purpose is to close the common escape routes agents use to skip
verification:

| Rationalization | Why it does not count |
|---|---|
| "Should work now" | Run the command. "Should" is not evidence. |
| "I'm confident" | Confidence is not a substitute for output. |
| "Just this once" | There are no exceptions. The rule applies to every claim. |
| "Lint passed" | Lint passing does not imply tests pass. |
| "Agent reported success" | Verify independently -- agent self-reports are not evidence. |
| "I'm in a hurry" | Urgency does not change what constitutes evidence. |
| "Partial check is enough" | Partial proves nothing about the full suite. |
| "Different words, same meaning" | Spirit over letter. Any success claim requires evidence. |
| "The logic is obviously correct" | Obvious correctness has shipped many bugs. Run the command. |

## Integration with Existing Gates

### Layer model

    mid-task  (this skill)
        |
        v
    slice-close ceremony  (validation-gate.mjs + /loop:slice complete)
        |
        v
    phase-gate  (/loop:phase-gate)

Each layer is independent and enforces at a different granularity:

| Layer | Trigger | What it blocks | Enforcer |
|---|---|---|---|
| Skill (mid-task) | Agent about to claim success | The claim itself, in the current turn | Agent reading skill + Iron Law |
| Slice-close gate | `/loop:slice complete` | Slice close ceremony proceeding | `validation-gate.mjs` (programmatic) |
| Phase gate | `/loop:phase-gate` | Phase transition / next phase start | `loop.json` stage config (programmatic) |

The skill does not replace or modify either programmatic gate. It adds an
**earlier signal** -- a standing rule the agent reads before any success
word, not a runtime check at ceremony time.

### How they compose in practice

1. Agent finishes implementation of an acceptance criterion.
2. Agent reads `skills/verification-before-completion/SKILL.md` (loaded via
   `loop:start` or a SessionStart hook -- wiring is a follow-on task).
3. Before typing "AC-1: PASS", agent checks the evidence table for claim
   type "tests pass" -> runs `npm test` -> pastes output inline -> only then
   writes "AC-1: PASS (npm test output above, exit 0, 34/34 pass)".
4. At slice close, `validation-gate.mjs` confirms a validation artifact is
   present. Because the agent ran verification mid-task and wrote the
   artifact, the gate passes without extra work.
5. At phase boundary, `/loop:phase-gate` runs the full configured suite.
   Consistent mid-task verification throughout the phase means the
   phase-gate rarely surfaces surprises.

### Skill loading convention

The skill must exist before it can be wired. After this spec ships, a
follow-on slice should add this skill to the mandatory reading list in
`loop:start` or `CLAUDE.md`'s loop rules summary block. That wiring is
explicitly out of scope here.

## Implementation

Single task -- write the skill file.

**File:** `skills/verification-before-completion/SKILL.md`

**Structure (in order):**

1. YAML frontmatter (`name`, `description`).
2. `# Verification Before Completion` heading.
3. One-sentence overview: "Evidence before claims, always."
4. `<IRON-LAW>` block (exact text from the Iron Law Block section above).
5. `## The Gate Function` -- the 5-step checklist (IDENTIFY -> RUN -> READ ->
   VERIFY -> CLAIM). Each step is a one-line imperative. A "Skip any step =
   lying, not verifying" line closes the block.
6. `## Evidence Table` -- the full table from the Evidence Table section above.
7. `## What Counts as Evidence / What Does Not Count` -- the prose definitions
   from the Skill Design section above.
8. `## Rationalization Table` -- exact table from the Iron Law Block section.
9. `## Red Flags -- Stop` -- bullet list of warning signs the agent must
   recognize as triggers to pause and verify before proceeding:
   - Using "should", "probably", "seems to"
   - Expressing satisfaction before verification ("Great!", "Perfect!", "Done!")
   - Claiming PASS without having run the evidence command in this turn
   - Trusting a subagent's self-reported success without independent verification
   - Relying on a partial verification (one file, one test, one linter only)
   - "Just this once" thinking
10. `## Integration` -- one paragraph pointing to `validation-gate.mjs` and
    explaining this skill is the mid-task layer; the gate is the ceremony layer.

**No runtime code. No tests. No manifest changes.** The file is pure Markdown
read by agents.

**Estimated effort:** 1-2 hours (documentation only).

## Out of Scope

- Changes to `scripts/lib/validation-gate.mjs`.
- Changes to `/loop:slice complete`, `/loop:phase-gate`, or any ceremony.
- A SessionStart hook that auto-injects this skill (that is the GAP-2
  candidate from the competitor audit, a separate FEAT).
- Wiring the skill into `loop:start` mandatory reading (follow-on slice
  after this skill file is stable and reviewed).
- Changes to `CLAUDE.md` loop rules block (follow-on after wiring slice).
- Adding `npm run typecheck` as a new npm script (if absent, the evidence
  table row already notes "skip if script absent").
- Any new CI gate, lint rule, or automated enforcement.
- Any changes to the crew plugin.
