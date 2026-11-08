---
decision: approved
---
# Review Result: SLICE-56 review A (typescript): agents repointed to dist/ bundles; EXPECTED_FAIL drain

- Created: 2026-11-08T23:36:21.259Z
- Reviewer: A
- Decision: approved
- Summary: SLICE-56 / FEAT-037 review A (typescript/stack lens), commits 461bf617 + 5b186335.

**Decision: approved**

Findings: none that change consumer behavior, weaken the ratchet, or break a gate.

Verification performed:
- `bunx tsc --noEmit -p tsconfig.test.json` — clean, rc=0. No implicit-any on the flagged `line` parameters; both occurrences (`crashAudit`/`argErrorAudit` loop, `commits` filter) resolve from typed `string[]` locals.
- EXPECTED_FAIL drain: 6 stale agents-origin labels removed, 1 new genuine label (`dist/loop.js dispatch prepare`) added with a root-cause comment. Confirmed against `src/scripts/loop.mts:916-926` — `dispatch` spawns a child resolved via `path.join(path.dirname(thisFile), "dispatch.mts")` relative to `import.meta.url`, and `src/scripts/build-dist.mts`'s five-entry bundle list (crew.mts, loop.mts, report-to-pr.mts, prune-artifacts.mts, watch-tick.mts) has no `dispatch.mts`/`dispatch.js` sibling — comment is accurate.
- `newlyBroken`/`nowPassing`/floor-guard logic untouched; only the EXPECTED_FAIL contents and two dependent count/membership assertions (bun distinct-file count 30→29, `crew/scripts/crew.mts` membership flipped to absent) changed, both are legitimate consequences of the drain, not a weakened ratchet. Ran the test directly: 4 pass / 1 fail, failure is exactly the documented "(c) stay red" assertion with `['dist/loop.js dispatch prepare']` — matches handoff claim precisely.
- `agents/*.md`: diffed all 21 changed lines across 19 files — every rewrite is a path-token-only substitution (crew/scripts/crew.mts → dist/crew.js, src/scripts/loop.mts → dist/loop.js); args/flags/quoting preserved exactly. `agents/swarm.md`'s two `dispatch prepare`/`dispatch finalize` lines additionally gained the `"${CLAUDE_PLUGIN_ROOT}/..."` quoting form (previously bare/unquoted) — correctly called out as what made the new crash visible.
- Confirmed every rewritten subcommand resolves in `bun dist/crew.js`/`dist/loop.js`: write-handoff, write-review-result, write-validation-result, write-deployment-check, write-final-synthesis, mark-badge, scope-estimate, `slice complete`/`slice grade` (loop.mts:2097-2109 SLICE_HANDLERS), `lessons recent` (loop.mts:330-340).
- `grep -rnE "crew/scripts/crew\.mts|src/scripts/loop\.mts|report-to-pr\.mts|prune-artifacts\.mts|watch-tick\.mts" agents/ --exclude-dir=3rdparty` → no matches.
- Gates all rc=0: validate-agents, validate-agent-refs, validate-content-length, validate-dispatch-markers, build-dist --check, biome format.
- `agents/pm.md` (344 lines) / `agents/verifier.md` (339 lines): NOT a validator gap. `src/scripts/validate-content-length.mts:30-33` declares an explicit, documented `AGENT_LINE_OVERRIDES` bumping both to 345, predating this slice (FEAT-015/SLICE-33). Correctly unflagged.
- Slice file ACs: ticked boxes carry honest evidence, including AC-1's partial-pass framing (agents-origin portion done, full empty-EXPECTED_FAIL out of scope) which matches actual test output. In/Out-of-scope sections filled, no template placeholders (Reviewer A/B lines are the expected open slots for this ladder step).
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: tsc --noEmit -p tsconfig.test.json clean (rc=0); bun test src/tests/install/consumer-smoke.test.mts: 4 pass / 1 fail (documented 'stay red' assertion, single entry dist/loop.js dispatch prepare, matches handoff); validate-agents/validate-agent-refs/validate-content-length/validate-dispatch-markers/build-dist --check/biome format all rc=0
- Risks: -
- Required Follow-up: -

