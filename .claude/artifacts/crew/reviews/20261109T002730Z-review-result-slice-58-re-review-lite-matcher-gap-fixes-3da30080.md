---
decision: approved
---
# Review Result: SLICE-58 re-review (lite): matcher gap fixes 3da30080

- Created: 2026-11-09T00:27:30.987Z
- Reviewer: A
- Decision: approved
- Summary: # SLICE-58 lite re-review of commit 3da30080

Scope: verify the three matcher fixes requested by review A and B (fence-char
tracking for ~~~ vs ``` without cross-closing, indented-code-block detection
with the same runner-prefix / plugin-root-wrap guard, bun.exe recognized as a
runner) in both twins, plus mirrored tests, test run, and lint.

## Findings

1. Twin identity: `diff src/scripts/lib/source-script-path-rule.mts
   crew/scripts/lib/source-script-path-rule.mts` shows the two files are
   identical except for the header comment block naming which copy is
   canonical vs duplicate. No logic drift between twins.
2. Fence tracking: `FENCE_RE` keys on fence char (`` ` `` or `~`), requires
   3+ repeats, allows up to 3 leading spaces (CommonMark). `fenceChar` state
   only closes on a matching character; a `~~~` inside an open ``` block
   is treated as ordinary content and does not close the fence (confirmed by
   both new tests "a stray ~~~ inside an open \`\`\` fence does not close it").
3. Indented-code branch (`INDENTED_CODE_RE`, 4+ spaces or tab) routes through
   `scanIndentedCodeLine`, which calls the same `matchedPathInInvocationForm`
   guard as the inline-code-span path — requires a runner prefix
   (`bun`/`bun.exe`/`node`/`bunx` + whitespace) or the
   `${CLAUDE_PLUGIN_ROOT}/` wrap immediately before the path. `bun.exe` is
   now in `RUNNER_PREFIX_RE` (`bun(?:\.exe)?`).
4. False-positive check: because the indented branch reuses the same prefix
   guard, a 4-space-indented list continuation that only mentions a path in
   prose (no runner prefix) does not match — confirmed by inspection, no
   regression test needed since the guard is identical to the pre-existing
   inline-code-span logic already covered by prior tests.
5. Tests mirror 1:1 across `src/tests/validate-source-script-path-refs.test.mts`
   and `crew/tests/validate-agents-no-source-script-path.test.mts` (4 new
   cases each: ~~~ fence, stray ~~~ inside ``` fence, 4-space indented bare
   invocation, bun.exe invocation).

## Verification run

- `bun test src/tests/validate-source-script-path-refs.test.mts
  crew/tests/validate-agents-no-source-script-path.test.mts` → 21 pass, 0
  fail, 16 expect() calls.
- `bunx biome lint` on all four touched files (both directories, each with
  its own biome config) → clean, no fixes applied, no complexity warnings.

## Decision

approved_with_notes is not needed — all requested fixes are present, correct,
tested, and green. Decision: **approved**.
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: bun test src/tests/validate-source-script-path-refs.test.mts crew/tests/validate-agents-no-source-script-path.test.mts -> 21 pass, 0 fail, 16 expect() calls; bunx biome lint clean on all 4 touched files
- Risks: -
- Required Follow-up: -

