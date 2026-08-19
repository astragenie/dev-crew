# Task Handoff: SLICE-14 fallout fix pass — devcrew token sweep gaps closed, all gates green

- Created: 2026-08-19T04:07:35.792Z
- From: fullstack-dev
- To: lead
- Objective: SLICE-14 fallout fix pass. All requested gates green.

## tsc (3 projects)
tsconfig.json, tsconfig.test.json, crew/tsconfig.json — all 0 errors on arrival.
post-builder-fanout.mts FanoutTask type + all value sites + its test were
already consistent on devcrew:reviewer (fixed by a concurrent session before
this pass started) — no source change needed here.

## Root suite (src/tests/): 3316 pass / 2 fail / 7 skip (target hit exactly)
Remaining 2 fails are the pre-existing DEC-070/DEC-068 contract-record
assertions (decisions/ files missing since before SLICE-14, out of scope,
already flagged in the SLICE-14 handoff).

Fixed (source updated to emit devcrew:* — product surface was the stale side):
- hooks/guard-feat-dispatch.mjs: allowlist + override message + guidance text
  renamed crew:*/runner:* -> devcrew:* (test already swept, hook wasn't).
  8 tests in guard-feat-dispatch-hook.test.mts fixed.
- hooks/bootstrap-context.mjs: HARD RULES body renamed /runner:start,
  /runner:close, /runner:auto, crew:frontend-dev/backend-dev/fullstack-dev,
  crew:inspector, crew:verifier -> devcrew:* equivalents. 1 test in
  bootstrap-context.test.mts fixed.

Fixed (test assertion updated to match merged reality — source was correct):
- src/tests/deleted-skills-stub.test.mts: backlog-list and spec-list
  replacement pointers corrected from stale `devcrew:status` (that command
  no longer exists — folded into brief.md per the SLICE-14 handoff) to
  `devcrew:brief`, matching src/scripts/loop.mts's DELETED_SKILLS_MAP.
- src/tests/memory-context-profile.test.mts: fetch-URL assertion corrected
  from `/agents/runner%3Apm/profile` to `/agents/devcrew%3Apm/profile` —
  the test's own input already passed agentType: "devcrew:pm"; only the
  URL-encoded assertion was stale.
- src/tests/slice-start.test.mts: ordering check corrected from
  `indexOf("Dispatch crew:")` to `indexOf("Dispatch devcrew:")` — dispatch
  body text is "Dispatch devcrew:fullstack-dev subagent" (consistent with
  the file's other passing assertions), stale literal made indexOf return
  -1 and the ordering comparison vacuously fail.

## Crew suite (crew/tests/): 1971 pass / 0 fail (target hit exactly)
All 26 fail + 1 error traced to two causes from the SLICE-14 structural
move (crew/commands/ deleted, files now live at repo-root commands/):

1. Path drift (crew/commands/*.md no longer exists) — updated relPath/ROOT
   resolution to climb one extra level to repo-root commands/ while leaving
   skills/ and agents/ references under crew/ (those merges are SLICE-16/15,
   not done yet):
   - tests/memory-recall-injection-completeness.test.mts (ASSEMBLY_MODULES)
   - tests/incident-dispatcher.test.mts (readDoc("commands/incident.md"),
     was an unhandled module-load error crashing the whole file)
   - tests/orchestrate-slice.test.mts (COMMAND_PATH)
   - tests/architect-feature.test.mts (CMD)
   - tests/heavy-path-review-refinements.test.mts (readText/readJson helper)
   - tests/validation-gate-delegation.test.mts (readText/readJson helper)

2. Stale crew:/runner: token assertions (content already reads devcrew:,
   only backtick-anchored literals broke — bare-word regexes accidentally
   still matched as a substring of devcrew:*, which is why not every crew:
   assertion in these files failed):
   - tests/incident-dispatcher.test.mts (`crew:investigator` -> `devcrew:investigator`)
   - tests/orchestrate-slice.test.mts (required-agents list crew:* -> devcrew:*)
   - tests/heavy-path-review-refinements.test.mts (crew:csharp-reviewer,
     crew:typescript-reviewer, crew:reviewer -> devcrew:*)
   - tests/validation-gate-delegation.test.mts (crew:verifier, crew:reviewer -> devcrew:*)

No assertions were weakened; no test guarding genuinely-deleted behavior was
found (nothing deleted this pass).

## Other gates
- validate-manifests.mts: OK
- validate-agent-refs.mts: OK — no phantom crew:/runner: dispatch refs
- validate-imports.mts: OK

## Forbidden-scope compliance
No reviewer dispatch, no commits/pushes, no git stash/checkout/restore.
agents/, skills/, hooks/, manifest were touched ONLY where a failing test
strictly required it: hooks/guard-feat-dispatch.mjs and
hooks/bootstrap-context.mjs (both were the direct cause of failing tests
in the fix list — their allowlists/messages were the stale half of the
devcrew token sweep, not source drift I introduced). No agents/, skills/,
or manifest files touched.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - hooks/guard-feat-dispatch.mjs
  - hooks/bootstrap-context.mjs
  - src/tests/deleted-skills-stub.test.mts
  - src/tests/memory-context-profile.test.mts
  - src/tests/slice-start.test.mts
  - crew/tests/memory-recall-injection-completeness.test.mts
  - crew/tests/incident-dispatcher.test.mts
  - crew/tests/orchestrate-slice.test.mts
  - crew/tests/architect-feature.test.mts
  - crew/tests/heavy-path-review-refinements.test.mts
  - crew/tests/validation-gate-delegation.test.mts
- Confidence: high
- Risks: None outstanding for this pass. Pre-existing DEC-070/DEC-068 test failures remain (out of scope, previously flagged in SLICE-14 handoff). SLICE-15/16/17 (agents/skills/hooks/manifest merges) not started.
- Suggested Next Handoff: Proceed to SLICE-15 (agent map merges) or SLICE-16 (skill dedupe + manifest rename to devcrew) per unification-plan.md sec.2.

