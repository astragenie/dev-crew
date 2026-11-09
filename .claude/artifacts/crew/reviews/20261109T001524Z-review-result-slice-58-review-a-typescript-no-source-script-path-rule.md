---
decision: approved_with_notes
---
# Review Result: SLICE-58 review A (typescript): no-source-script-path rule

- Created: 2026-11-09T00:15:24.237Z
- Reviewer: A
- Decision: approved_with_notes
- Summary: Decision: approved_with_notes

All checked gates pass clean: `crew/scripts/validate-agents.mts`, `src/scripts/validate-agent-refs.mts`, `validate-imports.mts`, `validate-repo-boundary.mts`, `build-dist.mts --check`, tsc (3 projects), biome lint/format (root + crew) all rc=0, zero new warnings on the touched files. Both new test files pass (8+5 tests) and cover positive (standalone + fenced invocation, file:line named), prose-negative, dist-form-negative, and skills/templates-scoped cases. The 4 known live prose hits (orchestrate-slice.md, triage.md, watch.md, skills/triage/SKILL.md) pass as required; no false positive on the live tree.

Twin check: `crew/scripts/lib/source-script-path-rule.mts` vs `src/scripts/lib/source-script-path-rule.mts` differ only in the header comment identifying which copy is canonical — content identical. Duplication is justified: `validate-repo-boundary.mts`'s crew-to-root import allowlist forbids crew/ from importing root lib files directly, and a single shared module isn't possible without widening that boundary (out of scope here). Comment correctly instructs mirroring future edits.

Scope is correct: agents/*.md (excl. 3rdparty) via crew's validate-agents.mts; commands/**, templates/**, and skills/**/SKILL.md only (not other skills/ docs) via validate-agent-refs.mts. docs/, AGENTS.md, CLAUDE.md, src/, crew/scripts, tests, dist/ are not scanned, as intended.

Findings (non-blocking, synthetic — none manifest on the live tree today):
[MEDIUM] src/scripts/lib/source-script-path-rule.mts:94: fence detector `/^\s*```/` only recognizes triple-backtick fences; a `~~~`-fenced invocation of one of the five paths is a false negative (verified against the live lib function). Worth a follow-up since GFM permits `~~~` fences.
[LOW] src/scripts/lib/source-script-path-rule.mts:60: `RUNNER_PREFIX_RE` requires `bun|node|bunx` followed by whitespace, so `bun.exe crew/scripts/crew.mts ...` is not flagged (verified). Low likelihood in this repo's docs but a real gap in the runner-prefix matcher.
[INFO] src/scripts/lib/source-script-path-rule.mts:20-36: the documented design choice to pass a mid-sentence inline-backtick invocation (e.g. "run `bun crew/scripts/crew.mts audit --repo $PWD` to check") that isn't the whole line's content is intentional and matches the file's own stated rationale and the 4 required prose-hit cases — reasonable tradeoff, not a bug, flagging only because the review brief asked for an explicit call.

Artifact: .claude/artifacts/crew/reviews/ (written via write-review-result CLI).
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: bun test src/tests/validate-source-script-path-refs.test.mts: 8 pass; cd crew && bun test tests/validate-agents-no-source-script-path.test.mts: 5 pass; both rc=0
- Risks: -
- Required Follow-up: -

