---
decision: approved_with_notes
---
# Review Result: SLICE-58 review B (correctness): no-source-script-path rule

- Created: 2026-11-09T00:18:04.647Z
- Reviewer: B
- Decision: approved_with_notes
- Summary: SLICE-58 review B (correctness) — decision: approved_with_notes.

Scope: 95cb40b8, 51477013, bf6ffeb9 (76ff29b7 excluded, unrelated CI fix).

AC-4 verified live: reintroducing `bun crew/scripts/crew.mts audit --repo "$PWD"`
(and node/bunx variants of the other four legacy paths) into fixture
agents/, commands/, skills/**/SKILL.md, templates/ files is caught by
findSourceScriptPathFindings / findSourceScriptPathRefFindings, naming
file and line in every case. Live tree scans clean (0 findings) on both
`bun src/scripts/validate-agent-refs.mts` and `bun crew/scripts/validate-agents.mts`.
Confirmed the four documented prose exemptions
(commands/orchestrate-slice.md:145-146, commands/triage.md:60,
commands/watch.md:12, skills/triage/SKILL.md:181) correctly pass — all
are mid-sentence inline-code mentions, not whole-line invocation spans.
Confirmed agents/3rdparty/ is structurally skipped (validateThirdPartyAgents
never calls checkNoSourceScriptPath) and docs/, AGENTS.md, CLAUDE.md,
src/, tests are out of the two checks' scan targets by design.

Two LOW findings from adversarial probing (coverage gaps, not exploitable
via this repo's established authoring style, which always uses ``` fences
or inline-code spans per the rule file's own doc comment):
- [LOW] src/scripts/lib/source-script-path-rule.mts:63 (and the crew/
  twin, identical logic): fence detection only recognizes ``` — a
  `~~~`-fenced invocation of one of the five paths (e.g. `~~~\nbun
  src/scripts/watch-tick.mts tick\n~~~`) is not flagged.
- [LOW] same file: a CommonMark 4-space-indented code block with a bare
  invocation line (no backticks, e.g. `    bun src/scripts/watch-tick.mts
  tick`) is not flagged — not a fence, and not a whole-line inline-code
  span.

Twin modules (src/scripts/lib/source-script-path-rule.mts vs
crew/scripts/lib/source-script-path-rule.mts): logic is byte-identical;
only the duplication-note comment differs (each points at the other as
canonical/duplicate correctly, no drift).

Regression: `bun test src/tests/ --parallel --timeout 60000` → 3514 pass,
1 expected fail (`dist/loop.js dispatch prepare`, the designed-red
consumer-smoke entry per DEC-044/EXPECTED_FAIL), 7 skip — matches
baseline. `cd crew && bun test tests/validate-agents*.test.mts` → 55
pass, 0 fail.

Slice file AC-4/AC-7 ticked with real evidence, In/Out-of-scope filled.
Handoff artifact has no leaked task-scoped markers (fields are placeholder
dashes, not a defect in scope for this review).

Working tree clean at end of review (no edits left, scratch probe scripts
removed).
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: root: 3514 pass / 1 expected fail (dist/loop.js dispatch prepare, designed-red) / 7 skip; crew: validate-agents*.test.mts 55 pass / 0 fail
- Risks: -
- Required Follow-up: -

