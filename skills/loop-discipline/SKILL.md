---
name: loop-discipline
prompt_id: loop-discipline
version: 1.0.0
tier: workflow
description: Use at the start of substantive engineering work in any repo that has the loop plugin installed. Loads the three HARD RULE blocks (Autonomous Loop, Cross-Slice Continuation, Phase Completion Gate) and reminds the agent not to pause for user confirmation mid-slice. Trigger automatically when starting a session in a repo whose CLAUDE.md contains `<!-- runner:start -->`.
---

# Autonomous Loop Discipline

This skill keeps the agent honest about the three HARD RULE blocks in the
repo's CLAUDE.md.

## Read the rules

The repo's CLAUDE.md contains a `<!-- runner:start -->...<!-- runner:end -->`
block. Read it now. The three HARD RULE statements there govern this session.

## The three rules summarized

<HARD-GATE>
1. **Autonomous Loop Instruction** — Do NOT ask the user mid-slice. Run
   review → fix → validation → artifacts → push without pausing. Stop only
   when every acceptance criterion is PASS with evidence OR the work is
   externally blocked.
2. **Cross-Slice Continuation** — When a slice closes, auto-pick the next
   PENDING slice from `approved-slices.md`. If the list is empty but
   `product-backlog.md` has unmet requirements, derive a new slice
   (`/devcrew:derive-slice`) and proceed.
3. **Phase Completion Gate** — At phase boundaries, invoke
   `/devcrew:phase-gate`. Do NOT hand-author the validation
   artifact — let the plugin own it.
</HARD-GATE>

## Disallowed stop reasons

<HARD-GATE>
The agent must NOT stop because:

- a slice "looks complete enough"
- "the user might want to confirm this approach"
- a test is "too hard to write right now"
- a build warning was "probably already there"
- the next slice "isn't clearly defined" (derive it)
- the iteration counter hit the cap (advisory only under auto mode — `loop.marathonMode: true` in `.claude/loop.json`, which is the default)
- a crew soft `blocked` badge is set (advisory under auto mode — usually clears the next iteration; only `escalated_to_dispatcher` (alias `escalated_to_lead`) is a hard external block)
</HARD-GATE>

## When stopping IS allowed

- All gate sets in `<aiLoopRoot>/02-acceptance-gates/` are PASS (rare in
  practice; most product work is incomplete)
- An external blocker exists (missing credential, unavailable service,
  unresolved third-party dependency). Document the blocker explicitly.

## Evidence quality

Use `<aiLoopRoot>/01-loop-control/EVIDENCE_RULES.md` to mark each acceptance
criterion. Acceptable evidence: file paths changed, tests added, build/test
commands run with exit 0, endpoints implemented, migrations added.
Unacceptable: "implemented conceptually", "should work", "TODO added",
"mock exists only".

## Operational learnings recall

<HARD-GATE>
When `startSlice` returns a non-null `learningsDigest`, read it before dispatching the builder.
These are session-to-session operational observations that improve implementation accuracy.
Skipping this step risks repeating known mistakes from prior sessions.
</HARD-GATE>

## Verification before completion

<HARD-GATE>
Before marking any acceptance criterion PASS or writing a completion
report, load and apply the `superpowers:verification-before-completion`
skill (invoke via the `Skill` tool — this repo has no local
`verification-before-completion` skill of its own). No completion claim
("tests pass", "lint clean", "bug fixed", etc.) may be made without
fresh command output from the current turn. See the claim→evidence
table in that skill for the required evidence form per claim type.
</HARD-GATE>

## Artifact discipline

Every meaningful action emits a Crew artifact:

- run brief at the start of a substantial slice → `crew write-run-brief`
- review pass → `crew write-review-result`
- validation → `crew write-validation-result` (or `/devcrew:phase-gate`)
- final synthesis when the slice closes → `crew write-final-synthesis`
