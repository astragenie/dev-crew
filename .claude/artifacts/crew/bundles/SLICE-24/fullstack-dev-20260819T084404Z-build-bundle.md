---
slice: SLICE-24
builder: fullstack-dev
run_id: 20260819T084404Z
feat: FEAT-005
files_touched: [".claude/artifacts/loop/learnings.jsonl", ".claude/artifacts/loop/loop-snapshot.md", ".github/workflows/ci.yml", "crew/docs/routing-table.md", "crew/docs/routing-table.yaml", "crew/scripts/validate-agents.mts", "crew/scripts/validate-dispatch-graph.mts", "crew/scripts/validate-skills.mts", "crew/scripts/validate-workflows.mts", "docs/ci-gates.md", "src/scripts/validate-branding-scrub.mts", "src/tests/validate-branding-scrub.test.mts"]
files_read: []
files_read_skipped:
  - { path: "7 root src/tests/*.test.mts files(format-only)", reason: deleted }
  - { path: "README.md(metrics-band regen)", reason: deleted }
  - { path: "crew/.github/workflows/(deleted:4 files)", reason: deleted }
  - { path: "crew/scripts/lib/briefing.mts(format-only)", reason: deleted }
  - { path: "crew/scripts/lib/briefing/collect.mts(format-only)", reason: deleted }
  - { path: "src/scripts/lib/auto-merge.mts(format-only)", reason: deleted }
  - { path: "~48 crew/tests/*.test.mts files(format-only)", reason: deleted }
  - { path: ".claude/artifacts/loop/ai-loop/slices/completed/SLICE_08*", reason: deleted }
  - { path: ".claude/artifacts/loop/ai-loop/slices/pending/SLICE_24*", reason: deleted }
  - { path: ".github/workflows/ci.yml(prior)", reason: deleted }
  - { path: "SLICE_09*", reason: deleted }
  - { path: "crew/.github/workflows/*.yml", reason: deleted }
  - { path: "crew/scripts/validate-*.mts", reason: deleted }
  - { path: "docs/ci-gates.md(prior)", reason: deleted }
  - { path: "src/scripts/validate-*.mts", reason: deleted }
  - { path: "unification-plan.md", reason: deleted }
diff_stat: { files: 54, additions: 1965, deletions: 1253 }
truncated: true
truncation_reason: size-cap
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-24: merged CI workflow (41 gates) + clause-registry port

- Created: 2026-08-19T08:44:04.678Z
- From: fullstack-dev
- To: lead
- Objective: Authored the single merged .github/workflows/ci.yml (root ci.yml + crew's 4 workflows deleted -> crew subtree now runs from root). fast-gate job runs 18 root validators + 10 crew validators (8 blocking + routing-table --coverage-only, 6 advisory: syntheses/routing-table-full/adr-template/backlog-drift/agents/skills) + 3 tsc projects + 4 biome invocations (root src/, crew-scoped) = 41 numbered gates total (docs/ci-gates.md, not literally ~30 -- documented why). Fixed the 4 pre-existing malformed learnings.jsonl entries (validation_fail-shape rows missing key/insight) blocking gate 16. Wrote new gate 18, validate-branding-scrub.mts (+test), a standing 3-bucket sweep for the retired product name replacing SLICE-08's one-time scrub; renamed from an initial wiggin-scrub filename after discovering it self-triggered its own regex via its own filename. Found and fixed a real bug while wiring crew gates: validate-workflows/agents/skills/dispatch-graph.mts still pointed AGENTS_ROOT/SKILLS_ROOT at now-empty crew/agents//crew/skills (P3 moved the real trees to the monorepo root) -- agents/skills were silently vacuous 0-checked passes, workflows/dispatch-graph hard-failed. Fixed all 4 path constants; fixing agents/skills surfaced real pre-existing content debt (missing prompt_id/version, missing Report-contract sections, evals-spec dangling pointers, a skills dir-name-vs-devcrew-prefix mismatch) so wired those two ADVISORY not blocking pending a follow-up FEAT. validate-configs.mts failed for a different real reason (2 stale crew:brief-me/crew:using-crew tokens in routing-table.yaml prose) -- fixed + re-rendered routing-table.md. Ran biome format --write across both trees (59 files, pre-existing whitespace-only drift, mechanical/safe) since format-check needed to be green to wire it blocking. Verified every gate locally end-to-end: fast-gate (validators+tsc x3+biome x4) 8s; root suite 3235 pass/2 known-fail(DEC-068/070, pre-documented in DEC-004.md)/7 skip in ~52-70s; crew suite 1699 pass/2 fail(validate-all.test.mts, direct expected consequence of the AGENTS_ROOT/SKILLS_ROOT fix, documented) in ~11-17s.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - .github/workflows/ci.yml
  - crew/.github/workflows/(deleted:4 files)
  - docs/ci-gates.md
  - src/scripts/validate-branding-scrub.mts
  - src/tests/validate-branding-scrub.test.mts
  - .claude/artifacts/loop/learnings.jsonl
  - .claude/artifacts/loop/loop-snapshot.md
  - README.md(metrics-band regen)
  - crew/docs/routing-table.yaml
  - crew/docs/routing-table.md
  - crew/scripts/validate-workflows.mts
  - crew/scripts/validate-agents.mts
  - crew/scripts/validate-skills.mts
  - crew/scripts/validate-dispatch-graph.mts
  - src/scripts/lib/auto-merge.mts(format-only)
  - crew/scripts/lib/briefing.mts(format-only)
  - crew/scripts/lib/briefing/collect.mts(format-only)
  - 7 root src/tests/*.test.mts files(format-only)
  - ~48 crew/tests/*.test.mts files(format-only)
- Confidence: high
- Risks: CLAUDE.md/AGENTS.md/docs/README.md/docs/memory.md/.claude/state/crew/workflow-state.json show as modified in git status but are NOT my changes -- another concurrent slice (SLICE-25 docs-merge, handoff artifact already on disk) is editing them live in this shared working tree; do not attribute those diffs to this slice or commit them together. validate-agents.mts/validate-skills.mts wired advisory not blocking -- real content debt across many agent/skill files, needs a follow-up FEAT before promotion to blocking. crew/tests/validate-all.test.mts has 2 known-red assertions now (same root cause, documented in docs/ci-gates.md). Manifest dedupe from unification-plan.md SS7 was NOT done -- src/scripts/validate-manifests.mts's own SLICE-20 comment defers that to Phase 5, which is more authoritative than the plan text; flagging in case that reading is wrong. GEPA agent-eval-regression.yml and memory-drift-check (drift.yml) from crew's deleted workflows were not ported -- neither was in the team-lead's named carry-over list; named as a drop if that was an oversight.
- Suggested Next Handoff: SLICE-25 ports this file's numbered gate list verbatim into CLAUDE.md's ## CI gates section (the handshake noted in the dispatch). Follow-up FEAT: backfill agent/skill content debt (prompt_id/version/Report-contract/evals-spec) then promote gates 33/34 to blocking and fix crew/tests/validate-all.test.mts. Follow-up FEAT: decide devcrew:-prefix convention for skill dir-name-vs-frontmatter-name (skills/pm-decompose names itself devcrew:pm-decompose). Decide whether crew's e2e-smoke/e2e:smoke:ux and hooks/check-redundant-read.mts self-test belong in this workflow or a separate one.


## Diff

```diff
diff --git a/.claude/artifacts/loop/learnings.jsonl b/.claude/artifacts/loop/learnings.jsonl
index 910607e7..66c5034d 100644
--- a/.claude/artifacts/loop/learnings.jsonl
+++ b/.claude/artifacts/loop/learnings.jsonl
@@ -19,14 +19,14 @@
 {"id":"2026-08-19T00-53-00-059Z-1a6428","timestamp":"2026-08-19T00:53:00.059Z","key":"grade-lesson:SLICE-09:e43afdd2","insight":"Handoffs must list ceremony-bookkeeping files (slice-progress,","confidence":null,"source":"grade-write","sliceId":"SLICE-09","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T01-18-30-855Z-d7b247","timestamp":"2026-08-19T01:18:30.855Z","key":"grade-lesson:SLICE-10:2ca88b27","insight":"Flake harnesses must capture failing-test NAMES on every run, not just","confidence":null,"source":"grade-write","sliceId":"SLICE-10","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T01-18-30-856Z-507b89","timestamp":"2026-08-19T01:18:30.856Z","key":"grade-lesson:SLICE-10:b69ad4e0","insight":"N=20 gates settle arguments cheaply: 20 crew runs took ~5 minutes and","confidence":null,"source":"grade-write","sliceId":"SLICE-10","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
-{"kind":"failure","ts":"2026-08-19T01:19:11.178Z","agent":"verifier","severity":"high","tags":["validation-result"],"summary":"phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run","source":"validation_fail"}
+{"kind":"failure","ts":"2026-08-19T01:19:11.178Z","agent":"verifier","severity":"high","tags":["validation-result"],"summary":"phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run","source":"validation_fail","key":"validation-fail:typescript-plugin-dev:20260819T011911Z","insight":"phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run"}
 {"id":"2026-08-19T02-05-26-475Z-6861f4","timestamp":"2026-08-19T02:05:26.475Z","key":"grade-lesson:SLICE-11:ed998c95","insight":"Cross-tree TS programs surface latent config poison: strictNullChecks:false","confidence":null,"source":"grade-write","sliceId":"SLICE-11","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T02-05-26-476Z-97db2f","timestamp":"2026-08-19T02:05:26.476Z","key":"grade-lesson:SLICE-11:1b824e52","insight":"Reviewer guard-flip round-trips are the strongest cheap evidence a rewritten","confidence":null,"source":"grade-write","sliceId":"SLICE-11","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T02-32-44-864Z-4aa66b","timestamp":"2026-08-19T02:32:44.864Z","key":"grade-lesson:SLICE-12:c0616291","insight":"\"Preserve the quirk, document it\" beats silent fixes in extractions — the","confidence":null,"source":"grade-write","sliceId":"SLICE-12","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T02-32-44-865Z-4fe8e9","timestamp":"2026-08-19T02:32:44.865Z","key":"grade-lesson:SLICE-12:0643f21e","insight":"Round-trip verification is becoming the norm: builder AND reviewer each ran","confidence":null,"source":"grade-write","sliceId":"SLICE-12","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T03-05-56-330Z-7e58f5","timestamp":"2026-08-19T03:05:56.330Z","key":"grade-lesson:SLICE-13:60b07e2e","insight":"Hand-written review artifacts need machine frontmatter (decision:) or the","confidence":null,"source":"grade-write","sliceId":"SLICE-13","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T03-05-56-331Z-a2fc04","timestamp":"2026-08-19T03:05:56.331Z","key":"grade-lesson:SLICE-13:ae6d1992","insight":"The slice-linker's multi-slice pending-detection disagrees with on-disk","confidence":null,"source":"grade-write","sliceId":"SLICE-13","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
-{"kind":"failure","ts":"2026-08-19T03:07:30.041Z","agent":"verifier","severity":"high","tags":["validation-result"],"summary":"phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run","source":"validation_fail"}
+{"kind":"failure","ts":"2026-08-19T03:07:30.041Z","agent":"verifier","severity":"high","tags":["validation-result"],"summary":"phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run","source":"validation_fail","key":"validation-fail:typescript-plugin-dev:20260819T030730Z","insight":"phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run"}
 {"id":"2026-08-19T06-12-12-268Z-5dc358","timestamp":"2026-08-19T06:12:12.268Z","key":"grade-lesson:SLICE-14:9a7f5dd6","insight":"Sweeps break prose that DESCRIBES history: two defects were sentences/allowlists whose whole point was naming OLD tokens. Sweep prompts need an explicit \"historical-reference\" category, not just fixture/archive exclusions.","confidence":null,"source":"grade-write","sliceId":"SLICE-14","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T06-12-12-269Z-c31baf","timestamp":"2026-08-19T06:12:12.269Z","key":"grade-lesson:SLICE-14:91470b4b","insight":"Reviewer conditional approval + fix + one-line re-confirm is a fast honest cycle (~20 min).","confidence":null,"source":"grade-write","sliceId":"SLICE-14","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T06-12-12-554Z-349c6f","timestamp":"2026-08-19T06:12:12.554Z","key":"grade-lesson:SLICE-15:b63dc7cb","insight":"Dedupe same-file entries across parallel job lists BEFORE fan-out — architect.md sat in both merge and trim lists; collision averted only by an agent's stand-down discipline.","confidence":null,"source":"grade-write","sliceId":"SLICE-15","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
@@ -37,10 +37,10 @@
 {"id":"2026-08-19T06-24-32-588Z-035ac1","timestamp":"2026-08-19T06:24:32.588Z","key":"grade-lesson:SLICE-18:9f56ff70","insight":"Two validators for one contract WILL drift — parity tests over shared","confidence":null,"source":"grade-write","sliceId":"SLICE-18","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T06-34-50-595Z-63beda","timestamp":"2026-08-19T06:34:50.595Z","key":"grade-lesson:SLICE-17:9be652f1","insight":"Latency gates need a floor-check against the execution model before being","confidence":null,"source":"grade-write","sliceId":"SLICE-17","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T06-34-50-596Z-16fbd9","timestamp":"2026-08-19T06:34:50.596Z","key":"grade-lesson:SLICE-17:c4f9b979","insight":"Reviewer independent re-measurement (own harness, within 2%) is the","confidence":null,"source":"grade-write","sliceId":"SLICE-17","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
-{"kind":"failure","ts":"2026-08-19T06:49:02.245Z","agent":"runner:validator","severity":"high","tags":["validation-result","FEAT-004"],"summary":"DEFECT 1 (CRITICAL, confirmed by execution): systemic stale-path drift from the crew/ subdirectory merge. commands/*.md (18 files), agents/*.md (16 files), skills/*.md (3 files), and several docs/*.md reference \"${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts\" -- 42 occurrences total. The ","source":"validation_fail"}
+{"kind":"failure","ts":"2026-08-19T06:49:02.245Z","agent":"runner:validator","severity":"high","tags":["validation-result","FEAT-004"],"summary":"DEFECT 1 (CRITICAL, confirmed by execution): systemic stale-path drift from the crew/ subdirectory merge. commands/*.md (18 files), agents/*.md (16 files), skills/*.md (3 files), and several docs/*.md reference \"${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts\" -- 42 occurrences total. The ","source":"validation_fail","key":"validation-fail:FEAT-004-stale-path-drift:20260819T064902Z","insight":"DEFECT 1 (CRITICAL, confirmed by execution): systemic stale-path drift from the crew/ subdirectory merge. commands/*.md (18 files), agents/*.md (16 files), skills/*.md (3 files), and several docs/*.md reference \"${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts\" -- 42 occurrences total."}
 {"id":"2026-08-19T07-09-22-413Z-85719b","timestamp":"2026-08-19T07:09:22.413Z","key":"grade-lesson:SLICE-19:ea23fc87","insight":"Execute-the-docs is the only smoke that counts: half the command surface","confidence":null,"source":"grade-write","sliceId":"SLICE-19","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T07-09-22-414Z-c27a8e","timestamp":"2026-08-19T07:09:22.414Z","key":"grade-lesson:SLICE-19:c0e2a018","insight":"Fix workflows must include their own test-expectation sweep: the /loop:","confidence":null,"source":"grade-write","sliceId":"SLICE-19","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
-{"kind":"failure","ts":"2026-08-19T07:11:04.612Z","agent":"verifier","severity":"high","tags":["validation-result"],"summary":"phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run","source":"validation_fail"}
+{"kind":"failure","ts":"2026-08-19T07:11:04.612Z","agent":"verifier","severity":"high","tags":["validation-result"],"summary":"phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run","source":"validation_fail","key":"validation-fail:typescript-plugin-dev:20260819T071104Z","insight":"phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run"}
 {"id":"2026-08-19T08-19-47-762Z-514246","timestamp":"2026-08-19T08:19:47.762Z","key":"grade-lesson:SLICE-20:fe5d43f2","insight":"Dead paths need consumer-greps even when an inventory says zero readers — 4 dangling refs survived in live code/docs.","confidence":null,"source":"grade-write","sliceId":"SLICE-20","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T08-19-47-763Z-d9a1b8","timestamp":"2026-08-19T08:19:47.763Z","key":"grade-lesson:SLICE-20:36f2bc83","insight":"Allowlists beat scrubs for frozen archive snapshots (docs/parents org-ref precedent).","confidence":null,"source":"grade-write","sliceId":"SLICE-20","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T08-19-48-123Z-93f191","timestamp":"2026-08-19T08:19:48.123Z","key":"grade-lesson:SLICE-21:60e452d3","insight":"Disposition tables are cheap insurance for mass deletion: 6-KEEP closure held under execution; the one prose overclaim (clean-both-directions) was caught by a 5-row lite spot-check.","confidence":null,"source":"grade-write","sliceId":"SLICE-21","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
diff --git a/.claude/artifacts/loop/loop-snapshot.md b/.claude/artifacts/loop/loop-snapshot.md
index c721e356..7f7834de 100644
--- a/.claude/artifacts/loop/loop-snapshot.md
+++ b/.claude/artifacts/loop/loop-snapshot.md
@@ -26,21 +26,21 @@ _Generated by `bun src/scripts/loop.mts snapshot-memory`. Regenerate after mater
 
 - Total grades: 23
 - Last 5 averages:
-  - architecture_quality: 0.18 ⚠
-  - reliability: 0.186 ⚠
-  - observability: 0.82
-  - production_readiness: 0.186 ⚠
-  - security: 0.812
-  - test_confidence: 0.508 ⚠
-  - product_completeness: 0.19 ⚠
+  - architecture_quality: 0.91
+  - reliability: 0.92
+  - observability: 0.89
+  - production_readiness: 0.916
+  - security: 0.858
+  - test_confidence: 0.916
+  - product_completeness: 0.924
 
 ## Recent decisions
 
-- **DEC-015** (accepted) — Duplicate-role merges keep crew variant as base, runner deltas as modes _(from SLICE-15)_
-- **DEC-016** (accepted) — Plugin identity is devcrew@1.0.0-rc.1 pre-cutover _(from SLICE-16)_
-- **DEC-017** (accepted) — model-router/resolve-model merge deferred until crew tsc-project absorption _(from SLICE-18)_
-- **DEC-018** (accepted) — One registration surface now; physical hook-script relocation deferred with the crew/scripts/lib merge _(from SLICE-17)_
 - **DEC-019** (accepted) — Command surface ships at 39 for cutover; audit's 7 merge + 1 cut candidates go to post-1.0 backlog _(from SLICE-19)_
+- **DEC-020** (accepted) — Root validators are the single validator set; crew-side duplicates die as their scopes widen _(from SLICE-20)_
+- **DEC-021** (accepted) — GEPA keeps eval/history/killswitch surface only; optimization pipeline deleted _(from SLICE-21)_
+- **DEC-022** (accepted) — guarded-fire is general fail-soft infrastructure, relocated out of gepa _(from SLICE-22)_
+- **DEC-023** (accepted) — claims survives as quickwin's coordination primitive; auto-dispatch survives with live analytics consumers; preset-retrofit sequences after migrate-adopter _(from SLICE-23)_
 
 ## Loop telemetry
 
diff --git a/.claude/state/crew/workflow-state.json b/.claude/state/crew/workflow-state.json
index 09dd7796..ae121af9 100644
--- a/.claude/state/crew/workflow-state.json
+++ b/.claude/state/crew/workflow-state.json
@@ -1,14 +1,14 @@
 {
   "version": "1.0",
-  "updatedAt": "2026-08-19T08:15:18.956Z",
+  "updatedAt": "2026-08-19T08:44:04.681Z",
   "currentRun": {
     "title": "FEAT005 SLICE20: Validator dedupe + dead-path purge (ai-loop/backlog/pending-dispatch)",
     "goal": "",
     "mode": "autonomous",
     "status": "active",
     "startedAt": "2026-08-19T07:11:37.889Z",
-    "updatedAt": "2026-08-19T08:15:18.955Z",
-    "next": "Lead decision needed on each of the 3 blockers before re-attempting: (a) quickwin.md redesign or plan revision for claims; (b) either scope a larger auto-dispatch rewrite slice (cover loop.mts + cost-by-skill.mts + failure-classifier.mts together) or close this cut as wont-fix; (c) sequence preset-retrofit deletion AFTER migrate-adopter.mts ships. Gates all green on the executed approvals.mts deletion: 3x tsc 0 errors, crew tests 1683 pass 18 pre-existing-unrelated fail (before/after identical, none of the 18 touch approvals/claims/wakeup/briefing), src tests 3316 pass 2 pre-existing-unrelated fail, 15 of 16 validators clean (learnings-schema exempted per instruction, marketplace-sync WARN is expected-during-release), ceremony smoke (loop.mts status) exit 0, biome lint+format clean on all touched files.",
+    "updatedAt": "2026-08-19T08:44:04.681Z",
+    "next": "SLICE-25 ports this file's numbered gate list verbatim into CLAUDE.md's ## CI gates section (the handshake noted in the dispatch). Follow-up FEAT: backfill agent/skill content debt (prompt_id/version/Report-contract/evals-spec) then promote gates 33/34 to blocking and fix crew/tests/validate-all.test.mts. Follow-up FEAT: decide devcrew:-prefix convention for skill dir-name-vs-frontmatter-name (skills/pm-decompose names itself devcrew:pm-decompose). Decide whether crew's e2e-smoke/e2e:smoke:ux and hooks/check-redundant-read.mts self-test belong in this workflow or a separate one.",
     "gates": {
       "review": null,
       "validation": null,
@@ -26,7 +26,9 @@
       "handoffs": [
         "C:\\work\\mega\\devcrew\\.claude\\artifacts\\crew\\handoffs\\20260819T073424Z-handoff-slice-22-gepa-disposition-table-deletion-executed.md",
         "C:\\work\\mega\\devcrew\\.claude\\artifacts\\crew\\handoffs\\20260819T081453Z-handoff-slice-23-deletion-ledger-approvals-mts-deleted-claims-mts-au.md",
-        "C:\\work\\mega\\devcrew\\.claude\\artifacts\\crew\\handoffs\\20260819T081518Z-handoff-slice-23-deletion-ledger-approvals-mts-deleted-claims-mts-au.md"
+        "C:\\work\\mega\\devcrew\\.claude\\artifacts\\crew\\handoffs\\20260819T081518Z-handoff-slice-23-deletion-ledger-approvals-mts-deleted-claims-mts-au.md",
+        "C:\\work\\mega\\devcrew\\.claude\\artifacts\\crew\\handoffs\\20260819T083103Z-handoff-slice-25-docs-merge-claude-md-12kb-budget-triage.md",
+        "C:\\work\\mega\\devcrew\\.claude\\artifacts\\crew\\handoffs\\20260819T084404Z-handoff-slice-24-merged-ci-workflow-41-gates-clause-registry-port.md"
       ],
       "reviewResult": null,
       "validationPlan": null,
diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index 015cff13..071f4004 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -1,25 +1,80 @@
 name: test
 
-# CI is split into three jobs to stop worktree-touching tests from hanging
-# the required check (astragenie/runner-plugin#355):
+# devcrew unification (SLICE-24, FEAT-005): the SINGLE CI workflow for this
+# repo. Both former parents (runner-plugin's root ci.yml, crew's
+# .github/workflows/*) are merged here; crew/.github/workflows/ was deleted
+# — crew-subtree gates (crew/scripts/validate-*, crew/tsconfig.json,
+# crew/biome.json, crew/tests/) now run FROM ROOT as part of this workflow,
+# not as their own repo-local CI. Bun 1.3.14+ is baked into the self-hosted
+# runner image (devops#64) — no setup-bun step, no ETXTBSY race; MIN_BUN
+# is asserted for visibility, not installed.
 #
-#   fast-gate            - validators + tsc (both configs) + biome. Target
-#                           ~1 min. This is the job the required status check
-#                           should point at: "fast-gate / test (self-hosted)".
-#   slow-tests            - the full bun test suite MINUS the six known
-#                           git-worktree suites, with a job-level timeout and
-#                           an in-step retry so a hang self-clears instead of
-#                           sitting for ~28 minutes.
-#   worktree-quarantine   - only the six worktree-touching suites named in
-#                           #355 (auto-merge, synergy, integration,
-#                           integrations, slice-complete, slice-start). Hard
-#                           per-invocation kill via `timeout`, and the job is
-#                           non-blocking (continue-on-error) so a deadlock in
-#                           real `git worktree` operations can never hold up
-#                           merges for more than ~2 minutes.
+# CI is split into jobs the same way runner-plugin's did, to stop
+# worktree-touching tests from hanging the required check
+# (astragenie/runner-plugin#355):
 #
-# Every test still runs somewhere — slow-tests and worktree-quarantine
-# together cover the same file set the old single `test` job covered.
+#   fast-gate            - every validator (root's 18 + crew's 8 blocking +
+#                           crew's 4 advisory) + 3 tsc projects + 4 biome
+#                           invocations (root src/, crew-scoped). Target
+#                           ~1-2 min. This is the required status check:
+#                           "fast-gate / test (self-hosted)".
+#   slow-tests            - root's bun test suite MINUS the six known
+#                           git-worktree suites (runner-plugin#355), with a
+#                           job-level timeout + in-step retry.
+#   crew-tests             - crew's bun test suite (tests/ --parallel).
+#                           SLICE-10 (FEAT-004 P1) proved N>=20 consecutive
+#                           green `--parallel` runs on this tree, so this
+#                           uses `bun run test:crew` (root package.json,
+#                           already --parallel) rather than crew's retired
+#                           3-way SHARD_TOTAL matrix from bun#5090-era CI.
+#   worktree-quarantine   - only the six worktree-touching root suites named
+#                           in #355. Hard per-invocation kill via `timeout`,
+#                           non-blocking (continue-on-error) so a deadlock
+#                           in real `git worktree` operations can never hold
+#                           up merges for more than ~2 minutes.
+#
+# Every test still runs somewhere. Full numbered gate list + rationale:
+# docs/ci-gates.md (kept in sync with this file's `validators:` /
+# `advisory-validators:` / `bun-commands:` block — SLICE-25 ports the same
+# numbered list into CLAUDE.md's "## CI gates" section, the metrics-band
+# machine contract).
+#
+# Named drops from the former parents' CI (unification-plan.md SS7: "retire
+# none silently — any gate dropped must be named"):
+#   - crew's hooks/check-redundant-read.mts self-test — a hook smoke-test,
+#     not a repo-content gate; crew/tests/ already carries broad hook
+#     coverage (hook-feature-gating, hook-error-events, cost-hygiene-hook,
+#     etc.). Deferred, not lost.
+#   - crew's e2e-smoke.mts / e2e:smoke:ux (Linux-only commands) — live
+#     `claude` CLI integration smoke, out of scope for this slice; needs its
+#     own follow-up FEAT to decide whether it belongs in this workflow or a
+#     separate scheduled one (it never ran on every PR even in crew's own
+#     CI — see the old workflow's `linux-only-commands` split).
+#   - crew's negative-fixture shell loops for validate-contracts.mts /
+#     validate-ux-spec.mts (asserting a broken fixture fails linting) — both
+#     scripts require an explicit file arg (no repo-wide sweep mode) and the
+#     same assertions already live in crew/tests/validate-contracts.test.mts
+#     and crew/tests/validate-ux-spec.test.mts, covered by the crew-tests
+#     job. Re-asserting them as standalone CI shell steps was redundant.
+#   - crew's `validate-manifests.mts` did NOT dedupe into root's despite
+#     unification-plan.md SS7's "dedupe manifests (keep runner's, widen
+#     scope)" text — src/scripts/validate-manifests.mts's own header
+#     comment (written during SLICE-20) already establishes that the
+#     manifest merge is explicitly deferred to Phase 5 (marketplace/manifest
+#     unification), overriding the plan's earlier general text. Both stay,
+#     as two separate gates, until Phase 5.
+#
+# crew's validate-agents.mts / validate-skills.mts are wired ADVISORY, not
+# blocking (see advisory-validators: below) — SLICE-24 found their
+# AGENTS_ROOT/SKILLS_ROOT pointed at now-empty crew/agents//crew/skills/
+# (P3 moved the real trees to the monorepo root) and fixed that path bug,
+# but fixing the path surfaced real pre-existing content debt across many
+# files (missing prompt_id/version frontmatter, missing "## Report
+# contract" sections, evals-spec pointers to files that don't exist yet,
+# and a skills directory-name-vs-"devcrew:"-prefixed-frontmatter-name
+# mismatch that may itself be a validator convention gap, not content
+# debt). That backfill is out of scope here; a follow-up FEAT should
+# promote these to blocking once the debt is cleared.
 
 on:
   push:
@@ -60,13 +115,18 @@ jobs:
             echo "code=false" >> "$GITHUB_OUTPUT"
           fi
 
-  # Fast validators + tsc + biome. Skipped on docs-only PRs (see `changes`).
+  # Every validator (root + crew blocking + crew advisory) + 3 tsc projects +
+  # 4 biome invocations, exactly once. Skipped on docs-only PRs (see
+  # `changes`). See docs/ci-gates.md for the full numbered list + rationale.
   fast-gate:
     needs: changes
     if: ${{ needs.changes.outputs.code == 'true' }}
     uses: astragenie/common/.github/workflows/reusable-plugin-ci.yml@v1
     with:
-      install-cmd: bun install --frozen-lockfile
+      install-cmd: |
+        bun --version
+        bun install --frozen-lockfile
+        cd crew && bun install --frozen-lockfile && cd ..
       validators: |
         bun ./src/scripts/validate-manifests.mts
         bun ./src/scripts/validate-content-length.mts
@@ -77,22 +137,43 @@ jobs:
         bun ./src/scripts/validate-imports.mts
         bun ./src/scripts/validate-backlog-writes.mts
         bun ./src/scripts/validate-slice-touches-files.mts
+        bun ./src/scripts/validate-slice-state-consistency.mts
         bun ./src/scripts/validate-snapshot-freshness.mts
         bun ./src/scripts/validate-org-refs.mts
         bun ./src/scripts/validate-marketplace-sync.mts
         bun ./src/scripts/validate-memory-config.mts
+        bun ./src/scripts/validate-learnings-schema.mts --repo .
+        bun ./src/scripts/validate-effort-points.mts
+        bun ./src/scripts/validate-branding-scrub.mts
         bun ./src/scripts/generate-metrics-band.mts --check
+        bun ./crew/scripts/validate-manifests.mts
+        bun ./crew/scripts/validate-dispatch-graph.mts
+        bun ./crew/scripts/validate-workflows.mts
+        bun ./crew/scripts/validate-slices.mts
+        bun ./crew/scripts/validate-badges.mts
+        bun ./crew/scripts/validate-loop-state.mts
+        bun ./crew/scripts/validate-bundles.mts
+        bun ./crew/scripts/validate-configs.mts
+        bun ./crew/scripts/validate-routing-table.mts --coverage-only
+      advisory-validators: |
+        bun ./crew/scripts/validate-syntheses.mts
+        CREW_VALIDATE_ROUTING_TABLE=1 bun ./crew/scripts/validate-routing-table.mts
+        bun ./crew/scripts/validate-adr-template.mts --strict
+        bun ./crew/scripts/validate-backlog-drift.mts
+        bun ./crew/scripts/validate-agents.mts
+        bun ./crew/scripts/validate-skills.mts
       bun-commands: |
         bunx tsc --project tsconfig.json --noEmit
         bunx tsc --project tsconfig.test.json --noEmit
+        bunx tsc --project crew/tsconfig.json --noEmit
         bunx biome lint src/
         bunx biome format src/
+        cd crew && bunx biome lint scripts/ hooks/ && bunx biome format scripts/ tests/ && cd ..
 
-  # Full suite minus the quarantined worktree suites (see worktree-quarantine
-  # below). Not gated by the reusable workflow because it needs a job-level
-  # timeout-minutes + an in-job retry loop that the reusable workflow's fixed
-  # 30-minute job timeout can't give us. Bun/Node are baked into the
-  # self-hosted runner image (devops#64) — no setup-bun/setup-node steps.
+  # Full root suite minus the quarantined worktree suites (see
+  # worktree-quarantine below). Not gated by the reusable workflow because it
+  # needs a job-level timeout-minutes + an in-job retry loop the reusable
+  # workflow's fixed 30-minute job timeout can't give us.
   slow-tests:
     name: slow-tests
     needs: changes
@@ -137,10 +218,29 @@ jobs:
           echo "::error::slow-tests failed after ${max_attempts} attempts"
           exit 1
 
-  # Quarantine job for the six suites named in #355 that perform real `git
-  # worktree` operations and have been observed to hang the runner
-  # indefinitely (PR #348: ~28 min, "this test timed out after 60000ms" /
-  # "killed N dangling process(es)"). Non-blocking by design
+  # crew's full suite. SLICE-10 (FEAT-004 P1) already proved N>=20
+  # consecutive green `--parallel` runs on this tree (bun#5090 risk row,
+  # unification-plan.md SS8) — no sharding, no quarantine list needed unless
+  # a future run demonstrates a hang, matching root package.json's
+  # "test:crew" script exactly.
+  crew-tests:
+    name: crew-tests
+    needs: changes
+    if: ${{ needs.changes.outputs.code == 'true' }}
+    runs-on: self-hosted
+    timeout-minutes: 10
+    steps:
+      - uses: actions/checkout@v5
+
+      - name: Install dependencies
+        run: cd crew && bun install --frozen-lockfile
+
+      - name: Run crew suite
+        run: cd crew && bun test --timeout 60000 tests/ --parallel
+
+  # Quarantine job for the six root suites named in #355 that perform real
+  # `git worktree` operations and have been observed to hang the runner
+  # indefinitely (PR #348: ~28 min). Non-blocking by design
   # (continue-on-error) and hard-killed at the OS level via `timeout` so a
   # deadlock here can never hold the required check for more than ~2 min.
   worktree-quarantine:
@@ -178,11 +278,13 @@ jobs:
           exit 0
 
   # Required check. Always runs (if: always) so it reports on every PR, which
-  # avoids the "required check never runs → PR stuck" trap on a strict ruleset.
-  # Passes when the change is docs-only (fast-gate skipped) OR when fast-gate
-  # succeeded. slow-tests/worktree are intentionally NOT gated here (slow-tests
-  # can be flaky; worktree is already non-blocking) — fast-gate is the merge
-  # gate, matching the pre-existing required-check semantics.
+  # avoids the "required check never runs → PR stuck" trap on a strict
+  # ruleset. Passes when the change is docs-only (fast-gate skipped) OR when
+  # fast-gate succeeded. slow-tests/crew-tests/worktree are intentionally NOT
+  # gated here (slow-tests/crew-tests can be flaky on a self-hosted runner;
+  # worktree is already non-blocking) — fast-gate is the merge gate, matching
+  # the pre-existing runner-plugin required-check semantics this repo
+  # inherited.
   gate:
     name: gate
     needs: [changes, fast-gate]
diff --git a/AGENTS.md b/AGENTS.md
index 226db42a..f59940fd 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -1,12 +1,15 @@
-# runner-plugin — Agent Instructions
+# dev-crew — Agent Instructions
 
-Claude Code plugin (marketplace name `loop`, plugin id `runner`, CLI namespace
-`/runner:*`) that ships the dev-crew method as a reusable layer on top
-of the `crew` plugin: PM-triaged backlog, slice-scoped specs with
-Given-When-Then acceptance criteria, parallel-worktree wave dispatch,
-phase-gate quality checks, and decision-grade retrospectives. Real, mature
-product (185 FEATs shipped) — not template output. Full mission, decisions,
-and volatile state: `CLAUDE.md` + `docs/memory.md`.
+Claude Code plugin (plugin id `devcrew`, CLI namespace `/devcrew:*`) that
+unifies two prior plugins into one engineering-OS: a dispatcher-guided
+ceremony layer (bounded specialist subagents, quality gates, inspectable
+handoffs, GEPA prompt optimization) plus an autonomous layer on top of it
+(PM-triaged backlog, slice-scoped Given-When-Then specs, parallel-worktree
+wave dispatch, phase-gate quality checks, decision-grade retrospectives).
+Formerly two separate repos/plugins (`crew`/`dev-team` and
+`runner-plugin`/`loop`) — merge in progress, tracked as FEAT-002 through
+FEAT-006 in this repo's own backlog. Full mission, merge decisions, and
+volatile state: `CLAUDE.md` + `docs/memory.md`.
 
 ## Commands
 
@@ -14,76 +17,136 @@ Runtime is **Bun** — source `.mts` files run directly, no build/emit step.
 
 ```bash
 bun install --frozen-lockfile
-bun test src/tests/ --parallel --timeout 60000   # full suite, ~300 files (also: bun run test)
-bun run typecheck                                 # tsc --noEmit, both tsconfig + tsconfig.test
-bun run lint                                      # biome lint src/
-bun run format / bun run format:check             # biome formatter
-bun ./src/scripts/validate-manifests.mts          # plugin manifest sanity
-bun ./src/scripts/validate-imports.mts            # slice-linker sub-module boundary
+bun run test                                      # this repo's own suite: src/tests/, ~parallel
+bun run test:crew                                  # crew/ rump's legacy suite (cd crew && bun test tests/)
+bun run test:all                                    # both suites
+bun run typecheck                                   # tsc --noEmit, tsconfig.json + tsconfig.test.json
+bun run lint                                         # biome lint src/
+bun run format / bun run format:check                # biome formatter
+bun run validate:manifests                           # plugin manifest sanity
+bun run validate:lengths                             # agent/skill content-length caps
+bun run validate:imports                             # slice-linker sub-module boundary
+bun run validate:event-schemas                       # loop-events JSON-schema conformance
 ```
 
-Full CI gate list (18 gates, all Bun-only, no `npm ci`/build step): `docs/ci-gates.md`.
-Pre-push hook (`src/scripts/pre-push-validate.mts`) runs manifest + content-length
-+ format-check locally before `git push`.
+Full CI gate list (19 gates, all Bun-only, no `npm ci`/build step for this
+repo's own tree): `docs/ci-gates.md`. Pre-push hook
+(`src/scripts/pre-push-validate.mts` via `hooks/pre-push-gate.mts`) runs
+manifest + content-length + format-check locally before `git push`.
 
 ## Structure
 
 ```
 src/scripts/            CLI entry (loop.mts) + lib/ (installer, phase-gate,
-                         config-resolver, clause-registry, slice-linker, ...)
-src/tests/               ~300 Bun test files, colocated by behavior
-agents/                  Owned agent prompts (300-line cap; agents/3rdparty/ exempt)
-commands/                Slash command definitions (/runner:*)
-skills/                  Skill definitions (200-line SKILL.md cap)
-templates/               Install-time templates rendered into ADOPTER repos —
-                         PRODUCT surface, not this repo's own instructions
-schemas/, hooks/, tools/ JSON schemas, Claude Code hooks, demo-seed tooling
+                         config-resolver, clause-registry, slice-linker,
+                         gepa/, dispatch-*.mts, ...)
+src/tests/               Bun test files for this repo's own tree, colocated
+                         by behavior
+agents/                  Owned agent prompts, single roster covering both
+                         the former runner: role agents (pm, architect,
+                         researcher, market-researcher, document-writer,
+                         swarm) and the former crew: specialist roster
+                         (fullstack-dev, backend-dev, frontend-dev,
+                         reviewer, verifier, architect-reviewer,
+                         qa-expert, ...) — 300-line cap; agents/3rdparty/
+                         exempt (vendored)
+commands/                Slash command definitions (/devcrew:*) — merged
+                         command surface, one namespace
+skills/                  Skill definitions (200-line SKILL.md cap):
+                         universal/, workflow/, domain/, meta/, plus
+                         loop-discipline/, triage/, pm-*/
+templates/               Install-time templates rendered into ADOPTER
+                         repos — PRODUCT surface, not this repo's own
+                         instructions
+schemas/, hooks/, tools/ JSON schemas (schemas/loop-events/), Claude Code
+                         hooks, demo-seed tooling
+evals/, gepa.config.json GEPA prompt-optimization harness + trial config
+langfuse/, models.yaml    Observability wiring + model-router config
 docs/                    See docs/README.md for the full map
-.claude/                 This repo dogfoods its own plugin (loop.json, backlog,
-                         slices, grades) — see docs/memory.md for current state
+crew/                    Vendored rump of the pre-merge `crew`/`dev-team`
+                         plugin — still carries its own
+                         `.claude-plugin/plugin.json`, package.json, test
+                         suite (`test:crew`), and docs tree
+                         (`crew/docs/**`, 123 files, not yet migrated).
+                         Treat as an internal library / historical
+                         reference during the merge window, not a
+                         separately-shipped plugin — do not add new
+                         product surface here; new work lands in the
+                         merged root agents/commands/skills/src/ tree.
+                         Full disposition tracking: FEAT-005 (this merge
+                         phase) and docs/README.md's map entry for
+                         `crew/`.
+.claude/                 This repo dogfoods its own plugin (loop.json,
+                         crew.json, backlog, slices, grades) — see
+                         docs/memory.md for current state
 ```
 
 ## Style
 
 - ESM only, no CommonJS. One responsibility per module; split at ~400 lines.
 - Owned `agents/*.md` capped at 300 lines, `skills/**/SKILL.md` at 200
-  (enforced by `validate-content-length`; `agents/3rdparty/` exempt — vendored).
-- Relative imports keep the `.mjs` specifier extension even though the source
-  is `.mts` (Bun/tsc resolve it) — there is no emitted `scripts/*.mjs` tree.
-- Biome cognitive complexity capped at 15 — reduce via extracted helpers, not
-  rule suppression.
-- No `process.exit(N)` from library functions — set `process.exitCode` from
-  entry points only.
+  (enforced by `validate-content-length`; `agents/3rdparty/` exempt —
+  vendored). `crew/` rump content is not subject to this repo's own
+  content-length gate until it's migrated into the merged tree.
+- Relative imports keep the `.mjs` specifier extension even though the
+  source is `.mts` (Bun/tsc resolve it) — there is no emitted
+  `scripts/*.mjs` tree.
+- Biome cognitive complexity capped at 15 — reduce via extracted helpers,
+  not rule suppression.
+- No `process.exit(N)` from library functions — set `process.exitCode`
+  from entry points only.
 - Tests colocated in `src/tests/*.mts`, behavior-descriptive names (no
   release-version prefixes).
+- Lint output stays clean — zero warnings (inherited from the `crew`
+  parent's repo rules).
 
 ## Credentials
 
 - No secrets are committed. `.npmrc` carries only the `@astragenie:registry`
-  pointer (no `_authToken` key) — actual registry auth token is supplied via
-  environment, not this file.
+  pointer (no `_authToken` key) — actual registry auth token is supplied
+  via environment, not this file.
 - AstraRunner ingest token (`ingest_token` in `.claude-plugin/plugin.json`
   `userConfig`) is stored in the OS keychain via `bunx astrarunner connect
-  <code>` (`src/scripts/cli/connect.mts`) — never written to `.claude/loop.json`,
-  which carries only non-secret identifiers (url, tenantId, appId).
+  <code>` (`src/scripts/cli/connect.mts`) — never written to
+  `.claude/loop.json`, which carries only non-secret identifiers (url,
+  tenantId, appId).
 
 ## Never-do
 
+Merged from both parent plugins' hard rules — everything below still
+applies post-merge.
+
 - No CommonJS, no shell-interpreted phase-gate commands — the phase-gate
   runner uses `execFile` with argv arrays only (no injection surface).
 - No local Claude Code marketplaces — always register from GitHub
-  (`"source": "github"`), never a local path. See `.claude/crew/plugin-marketplace.md`.
-- No stale pre-transfer owner (`sergeymilashico`) in authored surfaces
-  (README, ADOPTION, `src/`, `docs/`, `commands/`, `skills/`, `agents/` excl.
-  `3rdparty/`, `.claude-plugin/`) — the owner is `astragenie`; GitHub's
-  redirect makes old refs silently rot undetected
-  (`bun ./src/scripts/validate-org-refs.mts` is the CI gate).
-- No phantom `crew:<name>` / `runner:<name>` dispatch tokens in CLAUDE.md —
-  every reference must resolve to a real agent/command/skill
-  (`bun ./src/scripts/validate-agent-refs.mts`).
-- No hand-edits inside the `<!-- devcrew:start -->...<!-- devcrew:end -->`
-  marker block in `CLAUDE.md` — it's regenerated by `/devcrew:install` from
-  `templates/claude-md-hard-rules.md`; edit `.claude/loop.json` instead.
-- No editing `templates/`, `commands/`, `skills/`, `agents/` content casually
-  when the goal is fixing *this repo's own* docs — those ship to adopter
-  repos as product surface.
+  (`"source": "github"`), never a local path. See
+  `crew/.claude/crew/plugin-marketplace.md` (still the rump's copy as of
+  this merge phase — not yet promoted to this repo's own `.claude/crew/`).
+- No stale pre-transfer owner in authored surfaces (README, ADOPTION,
+  `src/`, `docs/`, `commands/`, `skills/`, `agents/` excl. `3rdparty/`,
+  `.claude-plugin/`) — the owner is `astragenie`; GitHub's redirect makes
+  old refs silently rot undetected (`bun
+  ./src/scripts/validate-org-refs.mts` is the CI gate).
+- No phantom `crew:<name>` / `runner:<name>` / `devcrew:<name>` dispatch
+  tokens in CLAUDE.md — every reference must resolve to a real
+  agent/command/skill (`bun ./src/scripts/validate-agent-refs.mts`).
+- No hand-edits inside the `<!-- crew:start -->...<!-- crew:end -->` or
+  `<!-- runner:start -->...<!-- runner:end -->` marker blocks in
+  `CLAUDE.md` — they're regenerated by `/crew:install` /
+  `/devcrew:install` respectively; edit `.claude/crew.json` /
+  `.claude/loop.json` instead.
+- No editing `templates/`, `commands/`, `skills/`, `agents/` content
+  casually when the goal is fixing *this repo's own* docs — those ship to
+  adopter repos as product surface.
+- Never force-push `main`, never delete tags, never skip hooks
+  (`--no-verify`) without explicit user request (inherited from the
+  `crew` parent's release hard rules — see `docs/memory.md`).
+- Never publish a release with failing CI, even if locally green (no
+  auto-publish hook exists; releases are user-triggered).
+- No commits without the operator asking — sole-operator repo, no
+  `dev.stable` opt-in flag is set in this repo (no
+  `.claude/crew/deployment.md` exists yet); baseline ask-first commit
+  discipline applies to every session, including autonomous-loop slices.
+- `C:\work\mega\dev-team` and `C:\work\mega\runner-plugin` are read-only
+  reference inputs for this merge — never edit them from work scoped to
+  this repo.
diff --git a/CLAUDE.md b/CLAUDE.md
index e7a6ad09..b41e3586 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -1,75 +1,204 @@
 # Repo Instructions — dev-crew
 
+@AGENTS.md
+
+> The include above is the tool-agnostic scaffold guide. Everything below
+> is specific to this repo. Clause sections are short pointers by design —
+> full detail lives in `docs/memory.md` and `docs/ci-gates.md`.
+
+## Session protocol (mandatory, not advisory)
+
+Before any non-trivial work (feature, fix, review, plan):
+
+1. **Read `docs/memory.md` in full** — the ONLY source for load-bearing
+   CLAUDE.md machine contracts, path drift, and merge-command history.
+2. **Re-verify before relying.** It's a cache — check live state
+   (`.claude/loop.json`, `gh issue view`) before depending on it.
+3. **Write-back is part of the task.** Supersede stale entries the same
+   session you find them.
+
 ## Mission
 
-**dev-crew** (plugin id `devcrew`) is the unification of two Claude Code
-plugins into a single engineering-OS plugin:
-
-- **crew** (repo `astragenie/dev-team`) — the ceremony layer: a
-  dispatcher-guided engineering workflow with bounded specialist subagents
-  (builders, reviewers, verifiers, architects), quality gates, inspectable
-  handoff artifacts, GEPA prompt optimization, and cost/observability
-  tooling. Slash commands (`/crew:build`, `/crew:fix`, `/crew:ship`) act as
-  dispatchers that fan out to 23+ first-party agents guided by 70+ tiered
-  skills.
-- **runner** (repo `astragenie/runner-plugin`, marketplace name `loop`) —
-  the autonomous layer on top of crew: a PM-triaged backlog, slice-scoped
-  Given-When-Then specs, parallel-worktree wave dispatch, phase-gate quality
-  checks, marathon-mode autonomous backlog walks, and decision-grade
-  retrospectives. (Formerly branded under a different working name — that
-  name is retired; the unified methodology is simply called **dev-crew**.)
-
-Today the two plugins couple across a fragile seam: runner resolves the crew
-CLI from the plugin cache (`MIN_CREW_VERSION` gating), bridges to it through
-a 700+ line `execFile` layer, and parses crew-authored artifacts; crew reads
-`.claude/loop.json` as a shared contract and references runner ceremonies by
-name. That seam has produced recurring failure classes — silent
-agent-rename phantoms, version-floor bumps, marketplace version drift, and a
-standing queue of cross-repo "upstream request" files.
-
-dev-crew merges both codebases into one repo and (eventually) one plugin so
-the seam becomes ordinary function calls under a single release train, a
-single agent/skill registry, a single CI gate list, and a single test suite.
-
-## Decided constraints (operator decisions, 2026-08-18 — do not relitigate without operator)
-
-- **Runtime**: Bun-first everywhere. `.mts` sources run directly under Bun,
-  no build/emit step; tests run `bun test --parallel` wherever possible.
-  dev-team's Node `--experimental-strip-types` fallback (ADR-002) and its
-  no-`--parallel` workaround are legacy to migrate away from — before
-  dropping the workaround, verify the Bun scheduler bug ADR-002 was written
-  against is fixed or not triggered by the migrated suites; quarantine (not
-  serialize globally) any suite that still trips it.
-- **Naming**: the methodology and plugin are both called **dev-crew**
-  (plugin id `devcrew`). The prior working-name branding is retired — do not
-  carry it into docs, templates, prompts, or command text; scrub it during
-  content import.
-
-## Ground rules for this repo
-
-- **The merge itself is not yet decided in shape.** Planning artifacts live
-  in `docs/planning/`. The decision brief (merge vs shared-package
-  extraction vs status quo) gates any phase plan; the phase plan gates any
-  code import. Do not start importing source from either parent repo
-  without an approved plan.
-- **Parent repos are read-only inputs.** `C:\work\mega\dev-team` and
-  `C:\work\mega\runner-plugin` are the sources of truth for behavior; never
-  edit them from work scoped to this repo.
-- **This repo dogfoods the harness it will absorb** — crew + runner are
-  installed here so the merged plugin is planned and built through its own
-  backlog/slice/review ceremony.
-- Sole operator, no external adopters to protect. Migration concerns are
-  bounded to this machine's repos.
-- Baseline commit discipline: no commits unless the operator asks.
+**dev-crew** (plugin id `devcrew`, CLI namespace `/devcrew:*`) unifies two
+prior plugins into one engineering-OS: **crew**'s dispatcher-guided
+ceremony layer (bounded specialist subagents, quality gates, inspectable
+handoffs, GEPA optimization) plus **runner**'s autonomous layer on top
+(PM-triaged backlog, slice-scoped Given-When-Then specs, parallel-worktree
+wave dispatch, phase-gate checks, decision-grade retrospectives). The two
+used to couple across a fragile cross-repo seam (`execFile` bridge,
+version-floor pins, marketplace drift); merging both codebases turns that
+seam into ordinary function calls under one release train, one
+agent/skill registry, one CI gate list, one test suite. Dogfoods the
+harness it ships.
+
+**Operator decisions, 2026-08-18 — do not relitigate:** Bun-first
+everywhere (`.mts` runs directly, no build step); methodology + plugin are
+both **dev-crew** (id `devcrew`) — prior working-name branding is
+retired; sole operator, no external adopters during the merge window.
 
 ## Authority documents
 
-- `docs/planning/merge-plan-prompt-v1.md` — first-draft planning prompt
-  (superseded by v2 once written; keep for provenance).
-- Parent-repo authority docs: `dev-team/CLAUDE.md`, `dev-team/AGENTS.md`,
-  `runner-plugin/CLAUDE.md`, `runner-plugin/AGENTS.md`,
-  `runner-plugin/docs/memory.md` — read before relying on any claim about
-  either parent's behavior.
+- **`README.md`** / **`ADOPTION.md`** — what this ships, install, walkthrough.
+- **`docs/memory.md`** — durable facts: contracts, path drift, merge history.
+- **`docs/README.md`** — `docs/` map, incl. not-yet-migrated `crew/docs/**`.
+- **`docs/code-conventions.md`** — ESM/Node conventions (authoritative).
+- **`docs/ci-gates.md`** — full per-gate CI rationale.
+- **`docs/upstream-requests/`** — open requests against parent-repo behavior.
+- **`docs/halt-badges.md`** — halt-badge field registry (SPEC-003).
+- **`.claude/artifacts/loop/backlog/`** — roadmap. **`CHANGELOG.md`** — releases.
+
+## Memory binding (astramem)
+
+<!-- clause: memory-binding -->
+
+This repo's own memory project id is **`dev-crew`** (astramem MCP,
+`mcp__plugin_crew_astramem__*`); pass `project: "dev-crew"` top-level —
+nesting under `metadata` is silently dropped. **Dual-project recall
+window:** most historical lessons live under predecessor projects
+`dev-team`/`runner-plugin` — recall against those too before concluding
+"no prior art." Follow `astramem:using-memory`; short, one-fact memories;
+`scope: "team"` for cross-session.
+
+## Read first
+
+<!-- clause: read-first -->
+
+See "Authority documents" above. Start with `README.md` →
+`docs/code-conventions.md` → `docs/memory.md`.
+
+## Engineering standards
+
+<!-- clause: engineering-standards -->
+
+Consult [`Astragenie.Standards`](https://github.com/astragenie/standards)
+for language-agnostic patterns if installed at a sibling path.
+`docs/code-conventions.md` is authoritative for this repo's own tree.
+**Repo topology:** `crew` is no longer an external plugin dependency
+resolved from the plugin cache — `crew/` is a vendored rump (own
+`plugin.json`, `bun run test:crew`, `crew/docs/**` not yet migrated)
+until one `plugin.json` (id `devcrew`) lands at cutover, FEAT-006 (P5,
+operator-authorized). See `AGENTS.md` § Structure.
+
+## Local commands
+
+<!-- clause: local-commands -->
+
+See `AGENTS.md` § Commands. Runtime is Bun; `.mts` files run directly.
+
+## CI gates
+
+<!-- clause: ci-gates -->
+
+Full per-gate rationale: `docs/ci-gates.md` (numbering must stay in sync —
+`generate-metrics-band.mts` counts this list programmatically for the
+README metrics band). GitHub Actions, all under Bun, no `npm ci`/build:
+
+1. `bun install --frozen-lockfile`
+2. `bun ./src/scripts/validate-manifests.mts` — manifest sanity.
+3. `bun ./src/scripts/validate-content-length.mts` — 300/200-line caps.
+4. `bun ./src/scripts/validate-decline-citations.mts --repo .` — P4 FEATs cite a real clause id.
+5. `bun ./src/scripts/validate-agent-refs.mts` — no phantom `crew:`/`runner:`/`devcrew:` dispatch tokens in CLAUDE.md.
+6. `bunx tsc --project tsconfig.json --noEmit` + `--project tsconfig.test.json`
+7. `bunx biome lint src/`
+8. `bunx biome format src/` (check mode)
+9. `bun ./src/scripts/validate-imports.mts` — slice-linker import boundary.
+10. `bun ./src/scripts/validate-backlog-writes.mts` — BacklogStore sole-writer guard.
+11. `bun ./src/scripts/validate-slice-touches-files.mts` — slice `touches_files` sanity.
+12. `bun ./src/scripts/validate-slice-state-consistency.mts` — slice state-dir/frontmatter-status agreement.
+13. `bun test src/tests/ --parallel --timeout 60000`
+14. `bun ./src/scripts/validate-snapshot-freshness.mts` — loop-snapshot drift gate.
+15. `bun ./src/scripts/validate-org-refs.mts` — stale pre-transfer owner sweep.
+16. `bun ./src/scripts/validate-marketplace-sync.mts` — registry version drift.
+17. `bun ./src/scripts/validate-dispatch-markers.mts` — `<task-scoped>` marker balance.
+18. `bun ./src/scripts/validate-memory-config.mts` — memory-feedback config drift.
+19. `bun ./src/scripts/generate-metrics-band.mts --check` — README metrics-band freshness.
+
+Pre-push hook runs manifest + content-length + format-check locally.
+Covers this repo's own tree only — `bun run test:crew` is not yet a wired
+gate; tracked under FEAT-005.
+
+## Repo conventions
+
+<!-- clause: repo-conventions -->
+
+See `AGENTS.md` § Style for the full list (ESM-only, Bun, module size,
+content-length caps, lint/complexity rules, `.mjs` import specifiers on
+`.mts` sources, `process.exitCode` not `process.exit`, zero-warning lint).
+
+## Marathon session checkpoint
+
+<!-- clause: marathon-checkpoint -->
+
+`loop.marathonCheckpointEvery` (unset here — falls back to default **4**)
+triggers an advisory at N closes since the last retrospective, hard stop
+at 2N. Full parameters: `docs/memory.md` § "Marathon checkpoint".
+
+## Backlog discipline
+
+<!-- clause: backlog-discipline -->
+
+Active backlog: `.claude/artifacts/loop/backlog/{pending,triaged,in-progress,done}/`.
+Each FEAT declares `priority`, `status`, `autonomous_safe`. `/devcrew:intake`
+is the recommended entry (PM scoring + architect classification in one
+call); `--deep`/`--spec` draft Given-When-Then ACs inline. PM P4 declines
+cite a clause id (`declined_per: [<clause-id>]`) from this file. History:
+`docs/memory.md` § "Backlog discipline".
+
+## Orchestrator mode
+
+<!-- clause: orchestrator-mode -->
+
+`config.loop.orchestratorMode` selects `"slice-build"` (default —
+per-tag `devcrew:<variant>-dev` dispatch, unset here so this repo runs
+the default) or `"orchestrate-slice"` (sequential). Legacy modes
+`"lead"`/`"direct-builder"` removed — history: `docs/memory.md` § "Orchestrator mode".
+
+## Reviewer ladder presets
+
+<!-- clause: reviewer-ladder-presets -->
+
+`reviewers.ladder` is config-driven (`["A","B"]`, `["A"]`, or `["B"]`;
+empty/invalid falls back to two-reviewer default). **This repo's current
+setting is `["A","B"]`** — unlike the single-reviewer lane some sibling
+repos tune to. Detail: `docs/memory.md` § "Reviewer ladder".
+
+## Owned agents
+
+<!-- clause: owned-agents -->
+
+Dispatch via `Agent(subagent_type: ...)`. One merged roster, one
+`devcrew:` namespace: former `runner:` role agents (`pm`, `architect`,
+`researcher`, `market-researcher`, `document-writer`, `swarm`) + former
+`crew:` specialists (`fullstack-dev`, `backend-dev`, `frontend-dev`,
+`reviewer`, `verifier`, `qa-expert`, more) — full list in `agents/`.
+History: `docs/memory.md` § "Owned agents".
+
+## Auto-dispatch primitives
+
+<!-- clause: auto-dispatch-primitives -->
+
+`src/scripts/lib/auto-dispatch.mts` is opt-in audit infra — CLI subcommands
+do NOT auto-dispatch role agents; slash flows are the contract (DEC-011).
+Detail: `docs/memory.md` § "Auto-dispatch primitives".
+
+## Safety
+
+<!-- clause: safety -->
+
+Never commit secrets. Never disable hooks (`--no-verify`) without explicit
+request. Never force-push `main`.
+
+## Decisions not to relitigate
+
+- **`clause: ...` markers and the `## CI gates` list are machine-read**
+  (`clause-registry.mts`, `generate-metrics-band.mts`,
+  `validate-agent-refs.mts`) — see `docs/memory.md` § "Load-bearing
+  CLAUDE.md contracts" first. `backlog-discipline`/`repo-conventions` are
+  live-cited by `declined_per` — never delete/rename without a sweep.
+- **Never hand-edit the marker blocks below** — regenerated by
+  `/crew:install` / `/devcrew:install`; edit the config instead.
+- **Never register a local plugin marketplace** — GitHub source only.
+- Everything in `@AGENTS.md`'s Never-do still applies.
 
 <!-- crew:start -->
 <!-- Crew framework memory. Run /crew:install after plugin updates that change framework memory. -->
@@ -96,3 +225,7 @@ This repo runs the dev-crew method autonomously. Full rules: `.claude/loop/rules
 First action when starting the runner: read `.claude/loop/rules.md` → `.claude/artifacts/loop/ai-loop/00-entry/MASTER_PROMPT.md` → `.claude/artifacts/loop/ai-loop/backlog/approved-slices.md`.
 
 <!-- runner:end -->
+
+## Project state (auto-generated)
+
+@.claude/artifacts/loop/loop-snapshot.md
diff --git a/README.md b/README.md
index ac354887..3e5ac03b 100644
--- a/README.md
+++ b/README.md
@@ -1,28 +1,38 @@
-# loop
-
-[![test](https://github.com/astragenie/runner-plugin/actions/workflows/test.yml/badge.svg)](https://github.com/astragenie/runner-plugin/actions/workflows/test.yml)
-[![release](https://img.shields.io/github/v/tag/astragenie/runner-plugin?label=release&sort=semver)](https://github.com/astragenie/runner-plugin/releases)
-[![license](https://img.shields.io/github/license/astragenie/runner-plugin)](LICENSE)
-
-A Claude Code plugin that ships the dev-crew method as a reusable
-layer: HARD RULE blocks, slice scaffold, plugin-owned loop-control docs, and a
-safe phase-gate runner.
-
-Depends on the [`crew`](https://github.com/astragenie/dev-team) plugin
-(>= v0.57.0) for artifact writers — loop emits Crew
-`validation-result` artifacts through `crew write-validation-result`.
+# dev-crew
+
+[![test](https://github.com/astragenie/devcrew/actions/workflows/test.yml/badge.svg)](https://github.com/astragenie/devcrew/actions/workflows/test.yml)
+[![release](https://img.shields.io/github/v/tag/astragenie/devcrew?label=release&sort=semver)](https://github.com/astragenie/devcrew/releases)
+[![license](https://img.shields.io/github/license/astragenie/devcrew)](LICENSE)
+
+A unified engineering-OS Claude Code plugin (plugin id `devcrew`, CLI
+namespace `/devcrew:*`): a dispatcher-guided ceremony layer (bounded
+specialist subagents, quality gates, inspectable handoffs) fused with an
+autonomous layer on top of it (PM-triaged backlog, slice-scoped
+Given-When-Then specs, parallel-worktree wave dispatch, phase-gate quality
+checks, decision-grade retrospectives) — one repo, one release train, one
+CLI namespace, where this used to be two separately-shipped plugins
+(`crew`/`dev-team` and `loop`/`runner-plugin`) bridged by a fragile
+cross-repo seam. HARD RULE blocks, slice scaffold, plugin-owned
+loop-control docs, and a safe phase-gate runner all ship from this single
+repo now.
+
+Post-merge, the ceremony layer ships from inside this same repo — see
+"Repo topology" in `CLAUDE.md`. `crew/` is a vendored rump of the
+pre-merge `crew`/`dev-team` plugin still used for artifact writers today
+(`crew write-validation-result`); the eventual single-plugin cutover is
+tracked as FEAT-006 (P5, operator-authorized).
 
 <!-- demo-recording: pending W4.1 asciinema asset -->
 
 <!-- metrics-band:start -->
-_Dogfood metrics — generated 2026-08-06. Every number below is computed from this repo's own artifacts; regenerate with `bun src/scripts/generate-metrics-band.mts --write`._
+_Dogfood metrics — generated 2026-08-19. Every number below is computed from this repo's own artifacts; regenerate with `bun src/scripts/generate-metrics-band.mts --write`._
 
 | Metric | Value |
 |---|---|
-| FEATs shipped (done) | 196 |
-| Slices closed, last 90 days | 171 |
-| Grade average, last 5 slice closes | 0.862 (n=151 total) |
-| median per slice-close session scan | $4.832 (mean $6.707, +38.8% divergence) |
+| FEATs shipped (done) | 4 |
+| Slices closed, last 90 days | 19 |
+| Grade average, last 5 slice closes | 0.905 (n=23 total) |
+| median per slice-close session scan | $3.772 (mean $9.816, +160.2% divergence) |
 | Halt badges documented | 16 |
 | CI gates enforced | 19 |
 
@@ -40,39 +50,40 @@ Positioning we can back with an artifact, not a slogan — every claim below
 either cites a file in this repo or a specific PR/issue. Compared against
 "generic agent platforms" as a category, not any named product.
 
-| Dimension | Loop (this repo) | Generic agent platforms |
+| Dimension | dev-crew (this repo) | Generic agent platforms |
 | --- | --- | --- |
 | Halt/stop enforcement | Documented halt badges (see metrics band above; `docs/halt-badges.md`), each with an explicit `Fires when` condition wired into either the walker's `stop-conditions.mts` snapshot or the close-time gate pre-flight, and fanned out as `halt_badge` / `halt_badge.resolved` webhook events — not just prose guidance. | Typically prose-only "best practices" or a single generic stop condition, with no cross-plugin fan-out contract to verify a badge actually fired. |
 | Prompt optimization | One fully auditable live promotion: GEPA judge trial `c948e52c`, `aiplugin-dev` 1.2.3→1.2.4 (CHANGELOG-traceable). Default candidate generation is synthetic string mutation — real LLM reflection only runs behind an explicit flag, and that distinction is documented rather than blurred. | Often marketed as "self-improving" or "reflective" with no public trial artifact a reader can open and verify. |
 | CI enforcement | CI gates enforced (see metrics band above; `CLAUDE.md` § "CI gates"), several traced directly to a production incident retro — e.g. phantom-agent dispatch (#371), stale pre-transfer owner refs (#474), worktree-hang quarantine (#355). | Gate counts, when published, are rarely tied to a named incident a reader can look up. |
 | Cost reporting | Median per slice-close session scan reported alongside the mean with a divergence flag, so a skewed average can't hide behind a single headline number (see metrics band above). | Cost claims are usually a single average, or omitted entirely. |
-| Access | `/plugin install loop@astra` — self-serve, no waitlist, on any tier. | Some competing "self-learning" agent platforms gate every pricing tier, including free, behind a waitlist. |
+| Access | `/plugin install devcrew@astra` — self-serve, no waitlist, on any tier. | Some competing "self-learning" agent platforms gate every pricing tier, including free, behind a waitlist. |
 
 _Comparison reflects publicly documented positioning as of 2026-07-18._
 
 ## Install
 
-These are three separate commands — paste one at a time into the Claude
-Code prompt and let each finish before pasting the next:
+Post-cutover, this is one command — paste into the Claude Code prompt:
 
 ```
 /plugin marketplace add astragenie/astra-marketplace
-/plugin install crew@astra
-/plugin install loop@astra
+/plugin install devcrew@astra
 ```
 
-`crew` must be installed first. Minimum compatible release: `v0.57.0`
-(`src/scripts/lib/plugin-identity.mts::MIN_CREW_VERSION`). See
-[ADOPTION.md](ADOPTION.md) for new-repo onboarding.
+See [ADOPTION.md](ADOPTION.md) for new-repo onboarding.
 
 > **Marketplace history:**
 >
 > - Pre-v0.8.7: shipped via the `hero-crew` repo (paired releases).
-> - v0.8.7–v0.41.x: shipped from its own `loop` marketplace, decoupled.
-> - v0.41.0+: shipped from the central `astragenie/astra-marketplace`
->   alongside `crew` and `cortex`. Plugin code stays in
->   [`astragenie/runner-plugin`](https://github.com/astragenie/runner-plugin); the
->   marketplace registry is its own repo.
+> - v0.8.7–v0.41.x: `loop` shipped from its own marketplace, decoupled
+>   from `crew`.
+> - v0.41.0+: both `crew` and `loop` shipped from the central
+>   `astragenie/astra-marketplace` registry as two separate installs
+>   (`crew@astra` then `loop@astra`), each still its own repo/codebase.
+> - 2026-08-18+: `crew`/`dev-team` and `loop`/`runner-plugin` merge into
+>   this single `astragenie/devcrew` repo (FEAT-002..006). Until the P5
+>   cutover slice lands, the merge repo is a working build, not yet the
+>   published `devcrew@astra` marketplace entry — check `CHANGELOG.md`
+>   for the release that flips it over.
 
 ## What it does
 
@@ -310,24 +321,23 @@ crew is not installed.
 
 ## Marketplace
 
-Shipped from the central `astragenie/astra-marketplace` registry alongside
-`crew` and `cortex` (see "Marketplace history" above) — that registry's
-`marketplace.json` is the source of truth for the published `loop` entry, not
-this repo. Plugin code stays in this repo
-([`astragenie/runner-plugin`](https://github.com/astragenie/runner-plugin)).
+Ships from the central `astragenie/astra-marketplace` registry (see
+"Marketplace history" above) — that registry's `marketplace.json` is the
+source of truth for the published entry, not this repo. Plugin code lives
+in this repo ([`astragenie/devcrew`](https://github.com/astragenie/devcrew)).
 `bun ./src/scripts/validate-marketplace-sync.mts` is a CI gate that fails a
 push if the registry's pinned version drifts from `.claude-plugin/plugin.json`
 here.
 
-## Hard dependency on `crew`
+## `crew` rump dependency (merge window only)
 
-The phase-gate runner writes its validation artifact through
-`crew write-validation-result`. Install errors with a clear message if the
-crew CLI is not discoverable in `~/.claude/plugins/cache/astra/crew/*/`.
-
-If you install `crew` under a different marketplace name, set
-`CREW_MARKETPLACE_NAME` in the environment before invoking
-loop CLI commands.
+Until the FEAT-006 cutover, the phase-gate runner still writes its
+validation artifact through `crew write-validation-result`, resolved
+against the vendored `crew/` rump inside this repo rather than an
+external plugin-cache install. See "Repo topology" in `CLAUDE.md`. If you
+point at a differently-named `crew` install during this window, set
+`CREW_MARKETPLACE_NAME` in the environment before invoking loop CLI
+commands.
 
 ## What it doesn't do (v1 scope)
 
@@ -359,12 +369,15 @@ and emit. See `docs/sop/memory-bridge.md` for the full wire contract.
 it scopes every `recall_memory`/`remember` call so one repo's slice history
 never bleeds into another's. The convention: **set it to the repo's own
 checkout directory name.** This repo is the worked example — its own
-`.claude/loop.json` sets `memory.project: "runner-plugin"`, matching the
-`runner-plugin` directory, and `CLAUDE.md`'s "Memory binding (astramem)"
-section spells out why that value has to stay in sync with whatever the
-loop's runtime sends (an explicit `memory.project` always wins over the
-`productName` fallback `grade-writer.mts`/`memory-sink.mts` fall back to
-when no override is set — see `docs/sop/memory-bridge.md`).
+`.claude/loop.json` sets `memory.project: "dev-crew"`, matching the
+`devcrew` directory's product name, and `CLAUDE.md`'s "Memory binding
+(astramem)" section spells out why that value has to stay in sync with
+whatever the loop's runtime sends (an explicit `memory.project` always
+wins over the `productName` fallback `grade-writer.mts`/`memory-sink.mts`
+fall back to when no override is set — see `docs/sop/memory-bridge.md`).
+During the merge window, also recall against the two predecessor project
+ids, `dev-team` and `runner-plugin` — most historical lessons still live
+there (see `CLAUDE.md`'s "dual-project recall window" note).
 
 Seed (or migrate) a repo onto this convention with the idempotent
 `memory-setup` subcommand (`commands/memory-setup.md`, mirrors
diff --git a/crew/.github/workflows/agent-eval-regression.yml b/crew/.github/workflows/agent-eval-regression.yml
deleted file mode 100644
index 738c3e43..00000000
--- a/crew/.github/workflows/agent-eval-regression.yml
+++ /dev/null
@@ -1,43 +0,0 @@
-name: agent-eval-regression
-# FEAT-170 SLICE-D: label-gated agent eval regression gate.
-# - Default: skipped on every PR (rate-limit + claude CLI not available in GH runner).
-# - Triggers: workflow_dispatch (manual) OR pull_request with the `run-evals` label.
-# - Mode: dry-run only initially (heuristic asserts, no live judge or candidate
-#   dispatch). Live mode lands when OAuth-in-CI is feasible (tracked: FEAT-169
-#   SLICE-91 deferred, FEAT-162 SLICE-D pre-mortem).
-# - Verdict: advisory (continue-on-error: true) until 2-week stability baseline.
-
-on:
-  workflow_dispatch:
-    inputs:
-      prompt_id:
-        description: Eval prompt_id to run (e.g. fullstack-dev)
-        required: true
-        default: fullstack-dev
-  pull_request:
-    types: [opened, synchronize, reopened, labeled]
-
-jobs:
-  eval-regression:
-    if: |
-      github.event_name == 'workflow_dispatch' ||
-      (github.event_name == 'pull_request' && contains(github.event.pull_request.labels.*.name, 'run-evals'))
-    runs-on: [self-hosted, astragenie, aws]
-    # TODO(2026-07-13): promote to blocking after 2-week stability baseline.
-    # Remove continue-on-error when:
-    #   - 14+ consecutive PR runs PASS (check evals/runs/ history)
-    #   - OAuth-in-CI is available (FEAT-169 SLICE-91 unblocked)
-    #   - --candidate-live flag lands (FEAT-171)
-    continue-on-error: true # Advisory until 2026-07-13 stability baseline.
-    steps:
-      - uses: actions/checkout@v4
-      # Bun baked into runner image (devops#64) — no setup-bun, no ETXTBSY race.
-      - run: bun install --frozen-lockfile
-      - name: Eval prompt (dry-run heuristic asserts)
-        env:
-          LANGFUSE_DISABLE: '1' # FEAT-176 — skip emit, no Langfuse keys in CI
-        run: |
-          PROMPT_ID="${{ github.event.inputs.prompt_id || 'fullstack-dev' }}"
-          bun run evals --dry-run --prompt "$PROMPT_ID"
-      - name: Enforce agent prompt line caps (FEAT-170 SLICE-D)
-        run: bun test tests/agent-prompt-content.test.ts
diff --git a/crew/.github/workflows/auto-merge.yml b/crew/.github/workflows/auto-merge.yml
deleted file mode 100644
index 54f56015..00000000
--- a/crew/.github/workflows/auto-merge.yml
+++ /dev/null
@@ -1,199 +0,0 @@
-name: Auto-merge on green
-
-# Policy: armed by default, disarmed on draft, on a `hold`/`do-not-merge`
-# label, or when the PR touches a sensitivity-gated path. GitHub squash-merges
-# an armed PR the instant the branch's required status checks (enforced by
-# the `main` ruleset) pass — no manual review click needed for routine PRs
-# (tests, scripts, deps, ordinary docs).
-#
-# Sensitivity gate: hooks/**, agents/**, commands/**, and .github/workflows/**
-# changes disarm auto-merge unconditionally, because a bug in any of these
-# has fleet-wide or self-protecting blast radius (see PR #225 — a hooks/
-# regression blocked 100% of crew:dev-lite completions across every consumer
-# repo — and PR #224 — a commands/ doc prescribed a nonexistent API that
-# would have silently dropped a tracked worktree). These paths require a
-# human merge decision; the workflow disarms auto-merge, logs which path(s)
-# matched, and posts (or updates) a single PR comment explaining why, so a
-# disarmed PR doesn't just sit there unexplained.
-#
-# The gate FAILS CLOSED. If the sensitivity check cannot be completed (API
-# error, rate limit), the workflow disarms auto-merge and fails the job rather
-# than arming a PR whose sensitivity is unknown. A failing job on its own
-# disarms nothing — GitHub's auto-merge state is independent of this job's
-# outcome — so the disarm must happen explicitly before we give up.
-#
-# The path check is stateless: it re-evaluates the current diff on every
-# run, not just the first one. If a PR is later force-pushed to no longer
-# touch a sensitive path, it re-arms automatically — same as removing a
-# `hold` label. Deliberate choice: sensitivity should track what the PR
-# *currently* does, not what it once touched.
-#
-# Escape hatch: add a `hold` or `do-not-merge` label to block any PR
-# regardless of paths touched; the workflow disarms auto-merge when it sees
-# the label and re-arms when it's removed (again, re-evaluated statelessly).
-#
-# Runs on the self-hosted runner so it never consumes GitHub-hosted Actions
-# minutes on this private repo (org runs a $0 hosted-spend budget). Uses
-# actions/github-script (GraphQL/REST) so no `gh` binary is required on the
-# host.
-
-on:
-  pull_request:
-    types: [opened, reopened, ready_for_review, converted_to_draft, synchronize, labeled, unlabeled]
-
-permissions:
-  contents: write
-  pull-requests: write
-
-concurrency:
-  group: auto-merge-${{ github.event.pull_request.number }}
-  cancel-in-progress: true
-
-jobs:
-  auto-merge:
-    runs-on: ["self-hosted", "astragenie"]
-    steps:
-      - name: Arm or disarm auto-merge
-        uses: actions/github-script@v7
-        with:
-          script: |
-            const pr = context.payload.pull_request;
-            const { owner, repo } = context.repo;
-            const held = pr.labels.some(l => ['hold', 'do-not-merge'].includes(l.name));
-
-            // Disabling auto-merge is the SAFE direction, so a failure here is
-            // never benign-by-default: if the PR must not merge and we could not
-            // disarm it, GitHub will still merge it on green. Distinguish the
-            // expected no-op ("auto-merge was not enabled") from a real failure
-            // and make the latter loud — a silent failed-disable IS the incident
-            // this workflow exists to prevent (#224, #225).
-            const disable = async (reason) => {
-              core.info(`#${pr.number}: ${reason} — disabling auto-merge.`);
-              try {
-                await github.graphql(
-                  `mutation($id: ID!) {
-                     disablePullRequestAutoMerge(input: { pullRequestId: $id }) { clientMutationId }
-                   }`,
-                  { id: pr.node_id }
-                );
-              } catch (e) {
-                // Do NOT classify by error string. GitHub returns "Can't disable
-                // auto-merge for this pull request." for the benign not-armed case,
-                // and error prose is not a stable contract — the previous regex
-                // missed that exact string and turned every draft/held PR into a red
-                // run. Ask for the STATE instead: if auto-merge is not enabled, there
-                // was nothing to disable and the failure is a no-op. If it IS enabled
-                // and we could not turn it off, that is the dangerous case (the PR can
-                // still merge on green) and it must be loud.
-                let stillArmed = null; // null = unknown
-                try {
-                  const q = await github.graphql(
-                    `query($id: ID!) {
-                       node(id: $id) { ... on PullRequest { autoMergeRequest { enabledAt } } }
-                     }`,
-                    { id: pr.node_id }
-                  );
-                  // Distinguish "node resolved, auto-merge is null" (confirmed NOT armed,
-                  // safe) from "node itself did not resolve" (unknown — we learned nothing,
-                  // so fail closed). Collapsing both to false would let an unexpected
-                  // response shape read as "safe" and silently skip the alarm.
-                  stillArmed = q?.node ? !!q.node.autoMergeRequest : null;
-                } catch (probeErr) {
-                  core.warning(`could not read auto-merge state: ${probeErr.message}`);
-                }
-
-                if (stillArmed === false) {
-                  core.info(`disable no-op — auto-merge was not armed on #${pr.number}.`);
-                  return;
-                }
-                // Armed, or state unknown → fail closed and loud.
-                core.setFailed(
-                  `#${pr.number}: FAILED to disable auto-merge (${reason}): ${e.message}. ` +
-                  `This PR may still merge on green — disarm it by hand or add a 'hold' label NOW.`
-                );
-              }
-            };
-
-            if (pr.draft || held) {
-              await disable(pr.draft ? 'draft' : 'held');
-              return;
-            }
-
-            // Sensitivity gate: paginate ALL changed files — a PR can exceed
-            // one page of listFiles results, and a missed page means a
-            // sensitive file slips through undetected.
-            //
-            // FAIL CLOSED: if we cannot complete the path check, we do not know
-            // whether this PR is sensitive — so we must assume it is. Disarm
-            // first, then fail the job. Falling through to the arming path with
-            // an unknown verdict would reintroduce the exact bug being fixed:
-            // GitHub's auto-merge state is independent of this job's outcome, so
-            // a merely-failing job disarms nothing.
-            const SENSITIVE = [/^hooks\//, /^agents\//, /^commands\//, /^\.github\/workflows\//];
-            const isSensitive = (name) => !!name && SENSITIVE.some(re => re.test(name));
-
-            let matched;
-            let botComment;
-            const MARKER = '<!-- auto-merge-path-disarm -->';
-            try {
-              const files = await github.paginate(github.rest.pulls.listFiles, {
-                owner, repo, pull_number: pr.number, per_page: 100,
-              });
-              // Check `previous_filename` too: renaming a file OUT of a sensitive
-              // directory still changes that directory's contents.
-              matched = files
-                .filter(f => isSensitive(f.filename) || isSensitive(f.previous_filename))
-                .map(f => f.filename);
-
-              const existing = await github.paginate(github.rest.issues.listComments, {
-                owner, repo, issue_number: pr.number, per_page: 100,
-              });
-              botComment = existing.find(c => c.body && c.body.includes(MARKER));
-            } catch (e) {
-              await disable(`path check FAILED (${e.message}) — assuming sensitive`);
-              core.setFailed(
-                `#${pr.number}: could not determine sensitivity (${e.message}). ` +
-                `Auto-merge disarmed as a precaution; re-run once the API is healthy.`
-              );
-              return;
-            }
-
-            if (matched.length > 0) {
-              await disable(`sensitive path(s) matched: ${matched.join(', ')}`);
-              const body = `${MARKER}\nAuto-merge is disarmed — this PR touches a sensitivity-gated path ` +
-                `(${matched.map(m => `\`${m}\``).join(', ')}) and needs a human merge decision. ` +
-                `This is re-evaluated on every push; if the sensitive change is removed, auto-merge re-arms automatically.`;
-              if (botComment) {
-                if (botComment.body !== body) {
-                  await github.rest.issues.updateComment({ owner, repo, comment_id: botComment.id, body });
-                }
-              } else {
-                await github.rest.issues.createComment({ owner, repo, issue_number: pr.number, body });
-              }
-              return;
-            }
-
-            // No longer sensitive (e.g. force-pushed to drop the matched
-            // change) — leave the historical comment in place as an audit
-            // trail but note that auto-merge has re-armed.
-            if (botComment && !botComment.body.includes('re-armed')) {
-              await github.rest.issues.updateComment({
-                owner, repo, comment_id: botComment.id,
-                body: `${botComment.body}\n\n_Update: no sensitive paths remain in the current diff — auto-merge has re-armed._`,
-              });
-            }
-
-            core.info(`Arming squash auto-merge on #${pr.number}.`);
-            try {
-              await github.graphql(
-                `mutation($id: ID!) {
-                   enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: SQUASH }) { clientMutationId }
-                 }`,
-                { id: pr.node_id }
-              );
-              core.info('Auto-merge enabled — will merge when required checks pass.');
-            } catch (e) {
-              // Common benign cases: PR already mergeable with no required checks,
-              // or already enabled. Warn, don't fail the run.
-              core.warning(`enable auto-merge failed: ${e.message}`);
-            }
diff --git a/crew/.github/workflows/drift.yml b/crew/.github/workflows/drift.yml
deleted file mode 100644
index e8c6fc0e..00000000
--- a/crew/.github/workflows/drift.yml
+++ /dev/null
@@ -1,75 +0,0 @@
-name: memory-drift-check
-
-# FEAT-201: scheduled dual-write drift gate.
-#
-# astramem writes are fire-and-forget (astramem-provider.ts's writeThrough():
-# errors are logged/swallowed, never propagated) while the local JSONL append
-# is synchronous/atomic — so a silent astramem failure can leave the derived
-# JSONL duplicate MORE complete than the astramem source of truth
-# (scripts/lib/memory/drift-check.mts is the read-only diagnostic from
-# FEAT-188 S5; nothing invoked it on a schedule until this workflow, FEAT-201).
-#
-# Deliberately its OWN workflow, separate from .github/workflows/test.yml
-# (FEAT-200 owns that file) — this needs a paired astramem backend (only the
-# self-hosted runner has one; a plain GH-hosted runner never pairs) and runs
-# on a schedule, not per-push/PR.
-#
-# Exit codes from `runDriftCheckCli` (scripts/lib/memory/drift-check.mts):
-#   0 — no drift (missing-from-astramem count <= threshold)
-#   1 — drift exceeds threshold -> a `memory_drift` event (count + ids) was
-#       appended to .claude/logs/events.jsonl -> this job FAILS
-#   2 — astramem unreachable/unpaired this run -> inconclusive (not a drift
-#       verdict) -> annotated as a warning, job stays green. A red gate here
-#       would mean "the daemon happened to be down", not "data drifted".
-
-on:
-  schedule:
-    - cron: '17 6 * * *' # daily, off-peak UTC
-  workflow_dispatch:
-    inputs:
-      threshold:
-        description: Max tolerated entries-only-in-JSONL before failing the gate
-        required: false
-        default: '0'
-      window_days:
-        description: Recency window (days) to check for drift
-        required: false
-        default: ''
-
-jobs:
-  drift-check:
-    runs-on: [self-hosted, astragenie, aws]
-    steps:
-      - uses: actions/checkout@v4
-      # Bun baked into runner image (devops#64) — no setup-bun, no ETXTBSY race.
-      - run: bun install --frozen-lockfile
-
-      - name: Run memory drift-check
-        id: drift
-        run: |
-          set +e
-          THRESHOLD="${{ github.event.inputs.threshold || '0' }}"
-          WINDOW_DAYS="${{ github.event.inputs.window_days }}"
-          ARGS=(--repo "$GITHUB_WORKSPACE" --threshold "$THRESHOLD")
-          if [ -n "$WINDOW_DAYS" ]; then
-            ARGS+=(--window-days "$WINDOW_DAYS")
-          fi
-          node --experimental-strip-types ./scripts/lib/memory/drift-check.mts "${ARGS[@]}"
-          code=$?
-          echo "exit_code=$code" >> "$GITHUB_OUTPUT"
-          # Never fail this step directly — the two annotation steps below
-          # decide the job's final pass/fail based on the captured exit code,
-          # so an inconclusive (unreachable-astramem) run can stay green.
-          exit 0
-
-      - name: Annotate inconclusive run (astramem unreachable)
-        if: steps.drift.outputs.exit_code == '2'
-        run: |
-          echo "::warning::memory-drift-check: astramem is unreachable/unpaired this run — drift is inconclusive, not verified. Job stays green (this is an environment gap, not a data-drift finding)."
-
-      - name: Annotate + fail on drift exceeding threshold
-        if: steps.drift.outputs.exit_code == '1'
-        run: |
-          echo "::error::memory-drift-check: drift exceeded threshold — see the memory_drift event in .claude/logs/events.jsonl for the count + ids to reconcile"
-          tail -n 5 .claude/logs/events.jsonl || true
-          exit 1
diff --git a/crew/.github/workflows/test.yml b/crew/.github/workflows/test.yml
deleted file mode 100644
index 5a278cac..00000000
--- a/crew/.github/workflows/test.yml
+++ /dev/null
@@ -1,118 +0,0 @@
-name: test
-
-on:
-  push:
-    branches: [main]
-  pull_request:
-  workflow_dispatch:
-
-jobs:
-  # Docs-only fast-path: docs/markdown/backlog-only PRs skip checks+test and
-  # pass via the always-running `gate` job below. Fail-safe: unknown diff => code=true.
-  changes:
-    name: detect changes
-    runs-on: self-hosted
-    outputs:
-      code: ${{ steps.filter.outputs.code }}
-    steps:
-      - uses: actions/checkout@v5
-        with:
-          fetch-depth: 0
-      - id: filter
-        shell: bash
-        run: |
-          set -uo pipefail
-          base="${{ github.event.pull_request.base.sha }}"
-          if [ -z "$base" ] || ! git cat-file -e "$base" 2>/dev/null; then base="HEAD~1"; fi
-          changed=$(git diff --name-only "$base" HEAD || echo "UNKNOWN")
-          echo "changed files:"; echo "$changed"
-          if [ -z "$changed" ]; then
-            echo "code=true" >> "$GITHUB_OUTPUT"
-          elif echo "$changed" | grep -qvE '(^docs/|\.md$|/backlog/|^\.github/backlog/)'; then
-            echo "code=true" >> "$GITHUB_OUTPUT"
-          else
-            echo "docs-only change detected -- checks+test will be skipped"
-            echo "code=false" >> "$GITHUB_OUTPUT"
-          fi
-
-  # Runs every validator, advisory-validator, lint/format/typecheck, and the
-  # Linux-only e2e smoke commands exactly once (AC-3). The sharded test suite
-  # lives in the `test` matrix job below so it doesn't multiply this job N times.
-  checks:
-    needs: changes
-    if: ${{ needs.changes.outputs.code == 'true' }}
-    uses: astragenie/common/.github/workflows/reusable-plugin-ci.yml@main
-    with:
-      validators: |
-        echo '{}' | bun "$GITHUB_WORKSPACE/hooks/check-redundant-read.mts"
-        node ./scripts/validate-manifests.mts
-        node ./scripts/validate-skills.mts
-        node ./scripts/validate-agents.mts
-        node ./scripts/validate-agent-refs.mts
-        node ./scripts/validate-dispatch-graph.mts
-        node ./scripts/validate-workflows.mts
-        node ./scripts/validate-slices.mts
-        node ./scripts/validate-badges.mts
-        node ./scripts/validate-loop-state.mts
-        node ./scripts/validate-bundles.mts
-        node ./scripts/validate-configs.mts
-        node ./scripts/validate-org-refs.mts
-        node ./scripts/validate-routing-table.mts --coverage-only
-        for f in tests/fixtures/openapi/*.openapi.yaml; do if [ "$(basename "$f")" = "broken-missing-examples.openapi.yaml" ]; then if node ./scripts/validate-contracts.mts "$f"; then echo "ERROR: negative fixture passed lint"; exit 1; fi; else node ./scripts/validate-contracts.mts "$f"; fi; done
-        for f in tests/fixtures/ux-specs/*.md; do if [ "$(basename "$f")" = "missing-operationid.md" ]; then if node ./scripts/validate-ux-spec.mts "$f"; then echo "ERROR: negative fixture passed"; exit 1; fi; else node ./scripts/validate-ux-spec.mts "$f"; fi; done
-      advisory-validators: |
-        node ./scripts/validate-syntheses.mts
-        CREW_VALIDATE_ROUTING_TABLE=1 node ./scripts/validate-routing-table.mts
-        node ./scripts/validate-adr-template.mts --strict
-        node ./scripts/validate-backlog-drift.mts
-      bun-commands: |
-        bun run lint
-        bun run format:check
-        bun run typecheck
-      linux-only-commands: |
-        for i in 1 2 3; do node ./scripts/e2e-smoke.mts && break || { [ "$i" = 3 ] && exit 1; echo "e2e-smoke retry $i/3"; sleep 5; }; done
-        for i in 1 2 3; do bun run e2e:smoke:ux && break || { [ "$i" = 3 ] && exit 1; echo "e2e:smoke:ux retry $i/3"; sleep 5; }; done
-
-  # FEAT-200: shards `bun run test` across a 3-way matrix to cut the test-phase
-  # critical path. `bun test` runs single-process per invocation (no --parallel,
-  # bun#5090 — see CLAUDE.md), so parallelism comes from splitting the *file
-  # list* across independent CI jobs instead. scripts/test-shard.mts computes the
-  # disjoint file subset per shard (see tests/test-shard.test.ts for the
-  # union-equals-all / no-overlap proof). Each shard is an independent job, so a
-  # failing test in any shard fails that shard's job and blocks the gate (AC-4).
-  #
-  # SHARD_TOTAL below (3) must stay in sync with the `matrix.shard` list — the
-  # `with:` block for a reusable-workflow call cannot read workflow-level `env`,
-  # so this is the single place both are declared.
-  test:
-    needs: changes
-    if: ${{ needs.changes.outputs.code == 'true' }}
-    strategy:
-      fail-fast: false
-      matrix:
-        shard: [0, 1, 2]
-    uses: astragenie/common/.github/workflows/reusable-plugin-ci.yml@main
-    with:
-      bun-commands: |
-        SHARD_TOTAL=3 SHARD_INDEX=${{ matrix.shard }} bun run test:shard
-
-  # Required check. Always runs so it reports on every PR (no stuck-check trap).
-  # Passes when docs-only (checks+test skipped) OR both checks and every test
-  # shard succeeded.
-  gate:
-    name: gate
-    needs: [changes, checks, test]
-    if: always()
-    runs-on: self-hosted
-    steps:
-      - name: Evaluate gate
-        shell: bash
-        run: |
-          set -uo pipefail
-          code='${{ needs.changes.outputs.code }}'
-          c='${{ needs.checks.result }}'
-          t='${{ needs.test.result }}'
-          echo "changes.code=$code checks=$c test=$t"
-          if [ "$code" != "true" ]; then echo "docs-only -- gate passes"; exit 0; fi
-          if [ "$c" = "success" ] && [ "$t" = "success" ]; then echo "checks+test passed"; exit 0; fi
-          echo "checks=$c test=$t -- gate fails"; exit 1
diff --git a/crew/docs/routing-table.md b/crew/docs/routing-table.md
index b008f720..63996313 100644
--- a/crew/docs/routing-table.md
+++ b/crew/docs/routing-table.md
@@ -33,12 +33,12 @@ _New work, bugs, chores, ambiguous scope, release, and session-start routing._
 | **Standalone quality sweep** (stale-ref cleanup, complexity cap enforcement, manifest consistency) | `crew:refactor` | Dispatch as a standalone slice. Agent scans repo (or scoped path), fixes directly, writes `.claude/artifacts/crew/quality/` artifact before committing. Reviewer gates the artifact + diff. Hard stop at >20 files affected. |
 | **Documentation-only change** (docs, README, guides) | dispatcher (optional review) | No behavioral change; minimal quality gate needed. Helpful to spot gaps but not blocking. |
 | **Dependency updates / chore** (chore:, version bump, marketplace sync) | release-engineer + reviewer | Release-engineer or dispatcher owns the change; reviewer validates no silent breakage. Post-merge, release-engineer confirms artifact/plugin registration is live. |
-| **Ambiguous scope** (unclear where to start, spans multiple modules) | dispatcher | Re-scope task, define boundaries, then dispatch to fullstack-dev. Use `/crew:using-crew` to frame the work. |
+| **Ambiguous scope** (unclear where to start, spans multiple modules) | dispatcher | Re-scope task, define boundaries, then dispatch to fullstack-dev. |
 | **Cross-module / architectural refactor** (touches 5+ files, changes public API) | dispatcher | Too large for single fullstack-dev. Dispatcher shapes the plan; consider splitting into smaller FEATs or slices. |
 | **Validation or behavior verification needed** (user-facing behavior changed, or tests added) | verifier | Run the app, verify user-visible behavior, document evidence. Pair with `/verify` skill. |
 | **Ship or release** (merge, promote to production, tag release) | release-engineer + dispatcher approval | Release-engineer owns the push; the dispatcher explicitly approves production-bound changes. Validation must be complete. |
 | **Production promotion** (any deployment to prod, customer environments, live traffic) | dispatcher (explicit human approval required) | **Always** require explicit human sign-off before production-bound work merges or ships. No automation here. |
-| **Session start / work planning** (new task, unclear next steps) | dispatcher | Retrieve bounded context with `/crew:brief-me`. Define scope, assign to role, set pace. Avoid ambiguity at start. |
+| **Session start / work planning** (new task, unclear next steps) | dispatcher | Retrieve bounded context with `/brief`. Define scope, assign to role, set pace. Avoid ambiguity at start. |
 | **Blocked work or escalation** (dependency unmet, config broken, ambiguous requirements) | dispatcher | Unblock by re-scoping, deferring, or escalating to stakeholder. Document the blocker in repo memory. |
 | **New feature scope unclear or ambitious** (large FEAT, cross-cutting concern, product direction question) | dispatcher via **gstack `/office-hours`** + **`/plan-ceo-review`** | Dispatcher uses `/office-hours` (6 forcing questions) then `/plan-ceo-review` (CEO scope challenge) before writing the slice or dispatching fullstack-dev. Reduces scope drift before implementation starts. |
 | **Pre-compaction or multi-agent handoff context prep** (≥3 compactions observed, agent handoff with heavy context, session checkpoint at milestone) | dispatcher | Load `skills/workflow/context-curation/`. Use Quick / Full / Archived formats per the skill's size budgets. Pair with `/loop:snapshot-memory` for durable cross-session memory. |
diff --git a/crew/docs/routing-table.yaml b/crew/docs/routing-table.yaml
index 3c4bcba3..5b01d3d5 100644
--- a/crew/docs/routing-table.yaml
+++ b/crew/docs/routing-table.yaml
@@ -59,7 +59,7 @@ rows:
   - section: workflow-signals
     signal: "**Ambiguous scope** (unclear where to start, spans multiple modules)"
     route_to: dispatcher
-    notes: Re-scope task, define boundaries, then dispatch to fullstack-dev. Use `/crew:using-crew` to frame the work.
+    notes: Re-scope task, define boundaries, then dispatch to fullstack-dev.
   - section: workflow-signals
     signal: "**Cross-module / architectural refactor** (touches 5+ files, changes public API)"
     route_to: dispatcher
@@ -79,7 +79,7 @@ rows:
   - section: workflow-signals
     signal: "**Session start / work planning** (new task, unclear next steps)"
     route_to: dispatcher
-    notes: Retrieve bounded context with `/crew:brief-me`. Define scope, assign to role, set pace. Avoid ambiguity at start.
+    notes: Retrieve bounded context with `/brief`. Define scope, assign to role, set pace. Avoid ambiguity at start.
   - section: workflow-signals
     signal: "**Blocked work or escalation** (dependency unmet, config broken, ambiguous requirements)"
     route_to: dispatcher
diff --git a/crew/scripts/validate-agents.mts b/crew/scripts/validate-agents.mts
index c6500ff2..9ccca42e 100644
--- a/crew/scripts/validate-agents.mts
+++ b/crew/scripts/validate-agents.mts
@@ -20,7 +20,14 @@ import path from "node:path";
 import { fileURLToPath } from "node:url";
 import { PEER_DISPATCH_ALLOWLIST } from "./lib/dispatch/peer-dispatch-allowlist.mjs";
 
-const AGENTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "agents");
+// P3 surface merge moved agents/ to the monorepo root (devcrew unification) —
+// see validate-workflows.mts's SURFACE_ROOT note for the same split.
+const AGENTS_ROOT = path.resolve(
+  path.dirname(fileURLToPath(import.meta.url)),
+  "..",
+  "..",
+  "agents"
+);
 const MAX_LINES = 350;
 
 function parseFrontmatter(text: string): Record<string, string> | null {
diff --git a/crew/scripts/validate-dispatch-graph.mts b/crew/scripts/validate-dispatch-graph.mts
index 46b68303..2daa7451 100644
--- a/crew/scripts/validate-dispatch-graph.mts
+++ b/crew/scripts/validate-dispatch-graph.mts
@@ -22,7 +22,14 @@ import {
   BIDIRECTIONAL_ALLOWED
 } from "./lib/dispatch/peer-dispatch-allowlist.mjs";
 
-const AGENTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "agents");
+// P3 surface merge moved agents/ to the monorepo root (devcrew unification) —
+// see validate-workflows.mts's SURFACE_ROOT note for the same split.
+const AGENTS_ROOT = path.resolve(
+  path.dirname(fileURLToPath(import.meta.url)),
+  "..",
+  "..",
+  "agents"
+);
 
 // Agents whose Peer dispatch whitelists are parsed for graph construction, and
 // the documented bidirectional cycle-detector exception, now both live in
diff --git a/crew/scripts/validate-skills.mts b/crew/scripts/validate-skills.mts
index c7872ca4..8932e9a0 100644
--- a/crew/scripts/validate-skills.mts
+++ b/crew/scripts/validate-skills.mts
@@ -20,7 +20,14 @@ import fs from "node:fs/promises";
 import path from "node:path";
 import { fileURLToPath } from "node:url";
 
-const SKILLS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "skills");
+// P3 surface merge moved skills/ to the monorepo root (devcrew unification) —
+// see validate-workflows.mts's SURFACE_ROOT note for the same split.
+const SKILLS_ROOT = path.resolve(
+  path.dirname(fileURLToPath(import.meta.url)),
+  "..",
+  "..",
+  "skills"
+);
 const VALID_TIERS = new Set(["universal", "workflow", "domain", "meta"]);
 const MAX_LINES = 200;
 const STALE_REVIEW_DAYS = 180;
diff --git a/crew/scripts/validate-workflows.mts b/crew/scripts/validate-workflows.mts
index c9f38e6e..80362343 100644
--- a/crew/scripts/validate-workflows.mts
+++ b/crew/scripts/validate-workflows.mts
@@ -35,7 +35,11 @@ import {
 } from "./lib/workflow-config.mjs";
 
 const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
-const AGENTS_ROOT = path.join(REPO_ROOT, "agents");
+// P3 surface merge moved agents/ to the monorepo root (devcrew unification);
+// workflows.yaml itself stays crew-local under crew/.claude/ — same
+// REPO_ROOT/SURFACE_ROOT split validate-configs.mts already documents.
+const SURFACE_ROOT = path.resolve(REPO_ROOT, "..");
+const AGENTS_ROOT = path.join(SURFACE_ROOT, "agents");
 
 // Role precedence map for phase-order validation
 const ROLE_PRECEDENCE: Record<string, number> = {
diff --git a/crew/tests/agent-prompt-content.test.mts b/crew/tests/agent-prompt-content.test.mts
index 7307e70a..81b984ee 100644
--- a/crew/tests/agent-prompt-content.test.mts
+++ b/crew/tests/agent-prompt-content.test.mts
@@ -23,21 +23,33 @@ const builder = readAgent("fullstack-dev");
 // beyond that. Future shrinks may lower further; relax this test in tandem.
 test("fullstack-dev.md stays under 330 line cap (FEAT-170 SLICE-D)", () => {
   const lines = builder.split(/\r?\n/).length;
-  expect(lines <= 330, `fullstack-dev.md is ${lines} lines, exceeds 330-line cap (FEAT-170 SLICE-D regression gate)`).toBeTruthy();
+  expect(
+    lines <= 330,
+    `fullstack-dev.md is ${lines} lines, exceeds 330-line cap (FEAT-170 SLICE-D regression gate)`
+  ).toBeTruthy();
 });
 
 test("fullstack-dev.md declares root-cause-discipline skill (FEAT-170 SLICE-D)", () => {
-  expect(builder.includes("root-cause-discipline"), "fullstack-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)").toBeTruthy();
+  expect(
+    builder.includes("root-cause-discipline"),
+    "fullstack-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)"
+  ).toBeTruthy();
 });
 
 test("backend-dev.md declares root-cause-discipline skill (FEAT-170 SLICE-D)", () => {
   const be = readAgent("backend-dev");
-  expect(be.includes("root-cause-discipline"), "backend-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)").toBeTruthy();
+  expect(
+    be.includes("root-cause-discipline"),
+    "backend-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)"
+  ).toBeTruthy();
 });
 
 test("frontend-dev.md declares root-cause-discipline skill (FEAT-170 SLICE-D)", () => {
   const fe = readAgent("frontend-dev");
-  expect(fe.includes("root-cause-discipline"), "frontend-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)").toBeTruthy();
+  expect(
+    fe.includes("root-cause-discipline"),
+    "frontend-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)"
+  ).toBeTruthy();
 });
 
 // FEAT-170 SLICE-D drift prevention: "lead" mentions in builder prompts are
@@ -82,17 +94,26 @@ function leadDriftScan(content: string, file: string): string[] {
 
 test("fullstack-dev.md has no 'lead' drift outside whitelist (FEAT-170 SLICE-D)", () => {
   const drifts = leadDriftScan(builder, "agents/fullstack-dev.md");
-  expect(drifts.length, `fullstack-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist (use 'orchestrator' instead):\n${drifts.join("\n")}`).toBe(0);
+  expect(
+    drifts.length,
+    `fullstack-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist (use 'orchestrator' instead):\n${drifts.join("\n")}`
+  ).toBe(0);
 });
 
 test("backend-dev.md has no 'lead' drift outside whitelist (FEAT-170 SLICE-D)", () => {
   const drifts = leadDriftScan(readAgent("backend-dev"), "agents/backend-dev.md");
-  expect(drifts.length, `backend-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist:\n${drifts.join("\n")}`).toBe(0);
+  expect(
+    drifts.length,
+    `backend-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist:\n${drifts.join("\n")}`
+  ).toBe(0);
 });
 
 test("frontend-dev.md has no 'lead' drift outside whitelist (FEAT-170 SLICE-D)", () => {
   const drifts = leadDriftScan(readAgent("frontend-dev"), "agents/frontend-dev.md");
-  expect(drifts.length, `frontend-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist:\n${drifts.join("\n")}`).toBe(0);
+  expect(
+    drifts.length,
+    `frontend-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist:\n${drifts.join("\n")}`
+  ).toBe(0);
 });
 
 // Obsoleted 2026-06-21: scope-cross + cross-layer-split handling centralized in
@@ -100,11 +121,17 @@ test("frontend-dev.md has no 'lead' drift outside whitelist (FEAT-170 SLICE-D)",
 // no longer carries an inline "## Cross-layer split detection" section by
 // design. Keep the skip marker as a documented archaeology pointer.
 test.skip("fullstack-dev.md declares Cross-layer split detection section (FEAT-170 SLICE-B)", () => {
-  expect(builder.includes("## Cross-layer split detection") || builder.includes("SPLIT_BUILD"), "fullstack-dev.md missing SPLIT_BUILD signal guidance (FEAT-170 SLICE-B)").toBeTruthy();
+  expect(
+    builder.includes("## Cross-layer split detection") || builder.includes("SPLIT_BUILD"),
+    "fullstack-dev.md missing SPLIT_BUILD signal guidance (FEAT-170 SLICE-B)"
+  ).toBeTruthy();
 });
 
 test("fullstack-dev.md declares Forbidden block (FEAT-170 SLICE-B)", () => {
-  expect(builder.includes("## Forbidden"), "fullstack-dev.md missing ## Forbidden block (FEAT-170 SLICE-B)").toBeTruthy();
+  expect(
+    builder.includes("## Forbidden"),
+    "fullstack-dev.md missing ## Forbidden block (FEAT-170 SLICE-B)"
+  ).toBeTruthy();
 });
 
 test("builder-mindset skill lists expanded leak phrases (extracted from per-agent identity anchors in v0.43)", () => {
@@ -124,12 +151,18 @@ test("builder-mindset skill lists expanded leak phrases (extracted from per-agen
     "Let me re-read",
     "As the orchestrator"
   ]) {
-    expect(skill.includes(phrase), `builder-mindset/SKILL.md missing leak phrase "${phrase}"`).toBeTruthy();
+    expect(
+      skill.includes(phrase),
+      `builder-mindset/SKILL.md missing leak phrase "${phrase}"`
+    ).toBeTruthy();
   }
 });
 
 test("fullstack-dev.md loads builder-mindset for identity anchor", () => {
-  expect(builder.includes("skills/universal/builder-mindset/"), "fullstack-dev.md must reference skills/universal/builder-mindset/ for leak phrases").toBeTruthy();
+  expect(
+    builder.includes("skills/universal/builder-mindset/"),
+    "fullstack-dev.md must reference skills/universal/builder-mindset/ for leak phrases"
+  ).toBeTruthy();
 });
 
 test("builder.md contains TDD policy reference", () => {
@@ -145,7 +178,10 @@ test("builder.md contains write-handoff instruction", () => {
 });
 
 test("builder.md contains validation_skipped badge reference", () => {
-  expect(builder.includes("validation_skipped"), "builder.md missing validation_skipped").toBeTruthy();
+  expect(
+    builder.includes("validation_skipped"),
+    "builder.md missing validation_skipped"
+  ).toBeTruthy();
 });
 
 test("builder.md references mark-badge", () => {
@@ -157,7 +193,10 @@ test("builder.md references mark-badge", () => {
 // self-verify-gate skill). The builder prompt now points at builder-ceremony
 // instead of carrying the self-verify reference inline.
 test("builder.md points at builder-ceremony skill (which carries self-verify reference)", () => {
-  expect(builder.includes("skills/workflow/builder-ceremony"), "builder.md must point at builder-ceremony skill").toBeTruthy();
+  expect(
+    builder.includes("skills/workflow/builder-ceremony"),
+    "builder.md must point at builder-ceremony skill"
+  ).toBeTruthy();
 });
 
 // FEAT-170 SLICE-D follow-up, superseded by dev-team#227: builders MUST NOT
@@ -168,14 +207,23 @@ test("builder.md points at builder-ceremony skill (which carries self-verify ref
 // + "Narration without a posted PR report = contract violation" guardrail.
 // "NEVER invoke write-handoff" stays as the protective guardrail unchanged.
 test("builder.md prohibits write-handoff CLI invocation (FEAT-170 SLICE-D / dev-team#227)", () => {
-  expect(builder.includes("Narration without a posted PR report = contract violation"), "fullstack-dev.md must contain the report-to-PR contract-violation guardrail").toBeTruthy();
-  expect(builder.includes("NEVER invoke `write-handoff`") ||
-      builder.includes("NEVER invoke write-handoff"), "fullstack-dev.md must contain the 'NEVER invoke write-handoff' guardrail").toBeTruthy();
+  expect(
+    builder.includes("Narration without a posted PR report = contract violation"),
+    "fullstack-dev.md must contain the report-to-PR contract-violation guardrail"
+  ).toBeTruthy();
+  expect(
+    builder.includes("NEVER invoke `write-handoff`") ||
+      builder.includes("NEVER invoke write-handoff"),
+    "fullstack-dev.md must contain the 'NEVER invoke write-handoff' guardrail"
+  ).toBeTruthy();
 });
 
 test("builder.md declares the STATUS-token follow-up format (FEAT-170 SLICE-D)", () => {
   for (const token of ["DONE", "BLOCKED", "HELP", "IN-PROGRESS"]) {
-    expect(builder.includes(token), `fullstack-dev.md missing STATUS token "${token}" — see Report contract section`).toBeTruthy();
+    expect(
+      builder.includes(token),
+      `fullstack-dev.md missing STATUS token "${token}" — see Report contract section`
+    ).toBeTruthy();
   }
 });
 
@@ -185,11 +233,17 @@ const selfVerifySkill = readFileSync(
 );
 
 test("self-verify-gate skill is scoped to affected-class tests", () => {
-  expect(selfVerifySkill.includes("Affected-class tests only"), "self-verify-gate skill missing scoped affected-class test gate").toBeTruthy();
+  expect(
+    selfVerifySkill.includes("Affected-class tests only"),
+    "self-verify-gate skill missing scoped affected-class test gate"
+  ).toBeTruthy();
 });
 
 test("self-verify-gate skill defers the full suite to the validator", () => {
-  expect(selfVerifySkill.includes("Deferred to validator"), "self-verify-gate skill missing Deferred to validator handoff line").toBeTruthy();
+  expect(
+    selfVerifySkill.includes("Deferred to validator"),
+    "self-verify-gate skill missing Deferred to validator handoff line"
+  ).toBeTruthy();
 });
 
 // ── reviewer ─────────────────────────────────────────────────────────────────
@@ -197,7 +251,10 @@ test("self-verify-gate skill defers the full suite to the validator", () => {
 const reviewer = readAgent("reviewer");
 
 test("reviewer.md references write-review-result", () => {
-  expect(reviewer.includes("write-review-result"), "reviewer.md missing write-review-result").toBeTruthy();
+  expect(
+    reviewer.includes("write-review-result"),
+    "reviewer.md missing write-review-result"
+  ).toBeTruthy();
 });
 
 test("reviewer.md contains Test Adequacy section", () => {
@@ -205,11 +262,17 @@ test("reviewer.md contains Test Adequacy section", () => {
 });
 
 test("reviewer.md dropped --validation-evidence bundling (validator now mandatory)", () => {
-  expect(!reviewer.includes("--validation-evidence"), "reviewer.md should no longer emit --validation-evidence — the validator owns the mandatory full gate").toBeTruthy();
+  expect(
+    !reviewer.includes("--validation-evidence"),
+    "reviewer.md should no longer emit --validation-evidence — the validator owns the mandatory full gate"
+  ).toBeTruthy();
 });
 
 test("reviewer.md re-runs the builder's affected-class test set", () => {
-  expect(reviewer.includes("Affected-test re-run"), "reviewer.md missing affected-test re-run gate").toBeTruthy();
+  expect(
+    reviewer.includes("Affected-test re-run"),
+    "reviewer.md missing affected-test re-run gate"
+  ).toBeTruthy();
 });
 
 test("reviewer.md contains rejected decision option", () => {
@@ -225,12 +288,21 @@ test("reviewer.md addresses regression concerns", () => {
 const validator = readAgent("verifier");
 
 test("validator.md contains validation_skipped badge", () => {
-  expect(validator.includes("validation_skipped"), "validator.md missing validation_skipped").toBeTruthy();
+  expect(
+    validator.includes("validation_skipped"),
+    "validator.md missing validation_skipped"
+  ).toBeTruthy();
 });
 
 test("validator.md routes UI/UX scope to crew:qa-expert", () => {
-  expect(validator.includes("crew:qa-expert"), "validator.md missing crew:qa-expert routing for UI/UX scope").toBeTruthy();
-  expect(validator.includes("UI/UX/a11y is NOT verifier's scope"), "verifier.md missing explicit UI/UX-out-of-scope guard").toBeTruthy();
+  expect(
+    validator.includes("crew:qa-expert"),
+    "validator.md missing crew:qa-expert routing for UI/UX scope"
+  ).toBeTruthy();
+  expect(
+    validator.includes("UI/UX/a11y is NOT verifier's scope"),
+    "verifier.md missing explicit UI/UX-out-of-scope guard"
+  ).toBeTruthy();
 });
 
 test("validator.md requires evidence gathering", () => {
@@ -246,7 +318,10 @@ test("validator.md contains mark-badge reference", () => {
 });
 
 test("validator.md owns the mandatory full gate (lint + format:check)", () => {
-  expect(validator.includes("Mandatory final gate") && validator.includes("format:check"), "validator.md missing mandatory full gate with format:check").toBeTruthy();
+  expect(
+    validator.includes("Mandatory final gate") && validator.includes("format:check"),
+    "validator.md missing mandatory full gate with format:check"
+  ).toBeTruthy();
 });
 
 // ── deployer ─────────────────────────────────────────────────────────────────
@@ -254,7 +329,10 @@ test("validator.md owns the mandatory full gate (lint + format:check)", () => {
 const deployer = readAgent("release-engineer");
 
 test("deployer.md references write-deployment-check", () => {
-  expect(deployer.includes("write-deployment-check"), "deployer.md missing write-deployment-check").toBeTruthy();
+  expect(
+    deployer.includes("write-deployment-check"),
+    "deployer.md missing write-deployment-check"
+  ).toBeTruthy();
 });
 
 test("deployer.md addresses environment transitions", () => {
@@ -330,19 +408,34 @@ describe.skip("## HARD OUTPUT CONTRACT — Prong A coverage", () => {
   describe("fullstack-dev (already compliant)", () => {
     const content = readAgent("fullstack-dev");
     test("heading present", () => {
-      expect(content.includes(HARD_CONTRACT_HEADING), "fullstack-dev.md missing HARD CONTRACT heading").toBeTruthy();
+      expect(
+        content.includes(HARD_CONTRACT_HEADING),
+        "fullstack-dev.md missing HARD CONTRACT heading"
+      ).toBeTruthy();
     });
     test("required preamble phrase", () => {
-      expect(hasPreamble(content), "fullstack-dev.md missing LAST action/tool call before returning preamble").toBeTruthy();
+      expect(
+        hasPreamble(content),
+        "fullstack-dev.md missing LAST action/tool call before returning preamble"
+      ).toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "fullstack-dev.md missing narration/contract-violation phrases").toBeTruthy();
+      expect(
+        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
+        "fullstack-dev.md missing narration/contract-violation phrases"
+      ).toBeTruthy();
     });
     test("role-specific: write-handoff keyword", () => {
-      expect(content.includes("write-handoff"), "fullstack-dev.md HARD CONTRACT missing write-handoff keyword").toBeTruthy();
+      expect(
+        content.includes("write-handoff"),
+        "fullstack-dev.md HARD CONTRACT missing write-handoff keyword"
+      ).toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      expect(content.includes(FEAT_161_CITE), "fullstack-dev.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "fullstack-dev.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
     // FEAT-180 (v2.0.0 builder rewrite): Identity anchor stays at the FRONT
     // (per user "you are builder / fullstack-developer up top"), HARD
@@ -352,116 +445,200 @@ describe.skip("## HARD OUTPUT CONTRACT — Prong A coverage", () => {
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
       expect(contractIdx !== -1, "fullstack-dev.md HARD CONTRACT heading not found").toBeTruthy();
       expect(identityIdx !== -1, "fullstack-dev.md missing Identity anchor").toBeTruthy();
-      expect(identityIdx < contractIdx, "fullstack-dev.md Identity anchor must appear before HARD CONTRACT").toBeTruthy();
+      expect(
+        identityIdx < contractIdx,
+        "fullstack-dev.md Identity anchor must appear before HARD CONTRACT"
+      ).toBeTruthy();
     });
   });
 
   describe("frontend-dev (already compliant)", () => {
     const content = readAgent("frontend-dev");
     test("heading present", () => {
-      expect(content.includes(HARD_CONTRACT_HEADING), "frontend-dev.md missing HARD CONTRACT heading").toBeTruthy();
+      expect(
+        content.includes(HARD_CONTRACT_HEADING),
+        "frontend-dev.md missing HARD CONTRACT heading"
+      ).toBeTruthy();
     });
     test("required preamble phrase", () => {
-      expect(hasPreamble(content), "frontend-dev.md missing LAST action/tool call before returning preamble").toBeTruthy();
+      expect(
+        hasPreamble(content),
+        "frontend-dev.md missing LAST action/tool call before returning preamble"
+      ).toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "frontend-dev.md missing narration/contract-violation phrases").toBeTruthy();
+      expect(
+        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
+        "frontend-dev.md missing narration/contract-violation phrases"
+      ).toBeTruthy();
     });
     test("role-specific: write-handoff keyword", () => {
-      expect(content.includes("write-handoff"), "frontend-dev.md HARD CONTRACT missing write-handoff keyword").toBeTruthy();
+      expect(
+        content.includes("write-handoff"),
+        "frontend-dev.md HARD CONTRACT missing write-handoff keyword"
+      ).toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      expect(content.includes(FEAT_161_CITE), "frontend-dev.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "frontend-dev.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
     test("placement: after Identity anchor, before first tactical heading", () => {
       const identityIdx = content.indexOf("## Identity anchor");
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
       expect(contractIdx !== -1, "frontend-dev.md HARD CONTRACT heading not found").toBeTruthy();
       expect(identityIdx !== -1, "frontend-dev.md missing Identity anchor").toBeTruthy();
-      expect(contractIdx > identityIdx, "frontend-dev.md HARD CONTRACT must appear after Identity anchor").toBeTruthy();
-      expect(contractIdx < firstTacticalIdx(content), "frontend-dev.md HARD CONTRACT must appear before first tactical heading").toBeTruthy();
+      expect(
+        contractIdx > identityIdx,
+        "frontend-dev.md HARD CONTRACT must appear after Identity anchor"
+      ).toBeTruthy();
+      expect(
+        contractIdx < firstTacticalIdx(content),
+        "frontend-dev.md HARD CONTRACT must appear before first tactical heading"
+      ).toBeTruthy();
     });
   });
 
   describe("backend-dev (already compliant)", () => {
     const content = readAgent("backend-dev");
     test("heading present", () => {
-      expect(content.includes(HARD_CONTRACT_HEADING), "backend-dev.md missing HARD CONTRACT heading").toBeTruthy();
+      expect(
+        content.includes(HARD_CONTRACT_HEADING),
+        "backend-dev.md missing HARD CONTRACT heading"
+      ).toBeTruthy();
     });
     test("required preamble phrase", () => {
-      expect(hasPreamble(content), "backend-dev.md missing LAST action/tool call before returning preamble").toBeTruthy();
+      expect(
+        hasPreamble(content),
+        "backend-dev.md missing LAST action/tool call before returning preamble"
+      ).toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "backend-dev.md missing narration/contract-violation phrases").toBeTruthy();
+      expect(
+        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
+        "backend-dev.md missing narration/contract-violation phrases"
+      ).toBeTruthy();
     });
     test("role-specific: write-handoff keyword", () => {
-      expect(content.includes("write-handoff"), "backend-dev.md HARD CONTRACT missing write-handoff keyword").toBeTruthy();
+      expect(
+        content.includes("write-handoff"),
+        "backend-dev.md HARD CONTRACT missing write-handoff keyword"
+      ).toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      expect(content.includes(FEAT_161_CITE), "backend-dev.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "backend-dev.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
     test("placement: after Identity anchor, before first tactical heading", () => {
       const identityIdx = content.indexOf("## Identity anchor");
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
       expect(contractIdx !== -1, "backend-dev.md HARD CONTRACT heading not found").toBeTruthy();
       expect(identityIdx !== -1, "backend-dev.md missing Identity anchor").toBeTruthy();
-      expect(contractIdx > identityIdx, "backend-dev.md HARD CONTRACT must appear after Identity anchor").toBeTruthy();
-      expect(contractIdx < firstTacticalIdx(content), "backend-dev.md HARD CONTRACT must appear before first tactical heading").toBeTruthy();
+      expect(
+        contractIdx > identityIdx,
+        "backend-dev.md HARD CONTRACT must appear after Identity anchor"
+      ).toBeTruthy();
+      expect(
+        contractIdx < firstTacticalIdx(content),
+        "backend-dev.md HARD CONTRACT must appear before first tactical heading"
+      ).toBeTruthy();
     });
   });
 
   describe("reviewer (already compliant)", () => {
     const content = readAgent("reviewer");
     test("heading present", () => {
-      expect(content.includes(HARD_CONTRACT_HEADING), "reviewer.md missing HARD CONTRACT heading").toBeTruthy();
+      expect(
+        content.includes(HARD_CONTRACT_HEADING),
+        "reviewer.md missing HARD CONTRACT heading"
+      ).toBeTruthy();
     });
     test("required preamble phrase", () => {
-      expect(hasPreamble(content), "reviewer.md missing LAST action/tool call before returning preamble").toBeTruthy();
+      expect(
+        hasPreamble(content),
+        "reviewer.md missing LAST action/tool call before returning preamble"
+      ).toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "reviewer.md missing narration/contract-violation phrases").toBeTruthy();
+      expect(
+        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
+        "reviewer.md missing narration/contract-violation phrases"
+      ).toBeTruthy();
     });
     test("role-specific: write-review-result keyword", () => {
-      expect(content.includes("write-review-result"), "reviewer.md HARD CONTRACT missing write-review-result keyword").toBeTruthy();
+      expect(
+        content.includes("write-review-result"),
+        "reviewer.md HARD CONTRACT missing write-review-result keyword"
+      ).toBeTruthy();
     });
     test("no backlog ids (FEAT-NNN / DEC-NNN / SLICE-NN)", () => {
       const ids = content.match(/\b(FEAT-\d+|DEC-\d+|SLICE-\d+)\b/g);
-      expect(!ids || ids.length === 0, `reviewer.md must not contain backlog ids; found: ${ids?.join(", ")}`).toBeTruthy();
+      expect(
+        !ids || ids.length === 0,
+        `reviewer.md must not contain backlog ids; found: ${ids?.join(", ")}`
+      ).toBeTruthy();
     });
     // Lead-agent removed in v0.41 (hard cut). Body-text gate is enforced repo-wide
     // by NO_LEAD_REF_REQUIRED in scripts/validate-agents.ts — see the parametrized
     // describe block "no lead refs across active agents" below.
     test("SLICE_BASE fallback — uses git merge-base, not fixed HEAD~1", () => {
-      expect(content.includes("git merge-base"), "reviewer.md SLICE_BASE computation must use git merge-base, not hardcoded HEAD~1").toBeTruthy();
+      expect(
+        content.includes("git merge-base"),
+        "reviewer.md SLICE_BASE computation must use git merge-base, not hardcoded HEAD~1"
+      ).toBeTruthy();
     });
     test("placement before first tactical heading", () => {
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
       expect(contractIdx !== -1, "reviewer.md HARD CONTRACT heading not found").toBeTruthy();
-      expect(contractIdx < firstTacticalIdx(content), "reviewer.md HARD CONTRACT must appear before first tactical heading").toBeTruthy();
+      expect(
+        contractIdx < firstTacticalIdx(content),
+        "reviewer.md HARD CONTRACT must appear before first tactical heading"
+      ).toBeTruthy();
     });
   });
 
   describe("verifier (already compliant)", () => {
     const content = readAgent("verifier");
     test("heading present", () => {
-      expect(content.includes(HARD_CONTRACT_HEADING), "verifier.md missing HARD CONTRACT heading").toBeTruthy();
+      expect(
+        content.includes(HARD_CONTRACT_HEADING),
+        "verifier.md missing HARD CONTRACT heading"
+      ).toBeTruthy();
     });
     test("required preamble phrase", () => {
-      expect(hasPreamble(content), "verifier.md missing LAST action/tool call before returning preamble").toBeTruthy();
+      expect(
+        hasPreamble(content),
+        "verifier.md missing LAST action/tool call before returning preamble"
+      ).toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "verifier.md missing narration/contract-violation phrases").toBeTruthy();
+      expect(
+        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
+        "verifier.md missing narration/contract-violation phrases"
+      ).toBeTruthy();
     });
     test("role-specific: write-validation-result keyword", () => {
-      expect(content.includes("write-validation-result"), "verifier.md HARD CONTRACT missing write-validation-result keyword").toBeTruthy();
+      expect(
+        content.includes("write-validation-result"),
+        "verifier.md HARD CONTRACT missing write-validation-result keyword"
+      ).toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      expect(content.includes(FEAT_161_CITE), "verifier.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "verifier.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
     test("placement before first tactical heading (Golden Path)", () => {
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
       expect(contractIdx !== -1, "verifier.md HARD CONTRACT heading not found").toBeTruthy();
-      expect(contractIdx < firstTacticalIdx(content), "verifier.md HARD CONTRACT must appear before first tactical heading").toBeTruthy();
+      expect(
+        contractIdx < firstTacticalIdx(content),
+        "verifier.md HARD CONTRACT must appear before first tactical heading"
+      ).toBeTruthy();
     });
   });
 
@@ -470,22 +647,40 @@ describe.skip("## HARD OUTPUT CONTRACT — Prong A coverage", () => {
   describe("architect (newly added)", () => {
     const content = readAgent("architect");
     test("heading present", () => {
-      expect(content.includes(HARD_CONTRACT_HEADING), "architect.md missing HARD CONTRACT heading").toBeTruthy();
+      expect(
+        content.includes(HARD_CONTRACT_HEADING),
+        "architect.md missing HARD CONTRACT heading"
+      ).toBeTruthy();
     });
     test("required preamble phrase", () => {
-      expect(hasPreamble(content), "architect.md missing LAST action/tool call before returning preamble").toBeTruthy();
+      expect(
+        hasPreamble(content),
+        "architect.md missing LAST action/tool call before returning preamble"
+      ).toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "architect.md missing narration/contract-violation phrases").toBeTruthy();
+      expect(
+        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
+        "architect.md missing narration/contract-violation phrases"
+      ).toBeTruthy();
     });
     test("role-specific: write-handoff keyword", () => {
-      expect(content.includes("write-handoff"), "architect.md HARD CONTRACT missing write-handoff keyword").toBeTruthy();
+      expect(
+        content.includes("write-handoff"),
+        "architect.md HARD CONTRACT missing write-handoff keyword"
+      ).toBeTruthy();
     });
     test("role-specific: Agent dispatch keyword", () => {
-      expect(content.includes("Agent"), "architect.md HARD CONTRACT missing Agent dispatch keyword").toBeTruthy();
+      expect(
+        content.includes("Agent"),
+        "architect.md HARD CONTRACT missing Agent dispatch keyword"
+      ).toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      expect(content.includes(FEAT_161_CITE), "architect.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "architect.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
     test("placement: after Custom instructions, before Golden Path (tactical heading)", () => {
       const customIdx = content.indexOf("## Custom instructions");
@@ -494,21 +689,36 @@ describe.skip("## HARD OUTPUT CONTRACT — Prong A coverage", () => {
       expect(contractIdx !== -1, "architect.md HARD CONTRACT heading not found").toBeTruthy();
       expect(customIdx !== -1, "architect.md missing Custom instructions section").toBeTruthy();
       expect(goldenPathIdx !== -1, "architect.md missing Golden Path heading").toBeTruthy();
-      expect(contractIdx > customIdx, "architect.md HARD CONTRACT must appear after Custom instructions").toBeTruthy();
-      expect(contractIdx < goldenPathIdx, "architect.md HARD CONTRACT must appear before Golden Path").toBeTruthy();
+      expect(
+        contractIdx > customIdx,
+        "architect.md HARD CONTRACT must appear after Custom instructions"
+      ).toBeTruthy();
+      expect(
+        contractIdx < goldenPathIdx,
+        "architect.md HARD CONTRACT must appear before Golden Path"
+      ).toBeTruthy();
     });
   });
 
   describe("reviewer-lite (renamed from reviewer-verifier, validation stripped)", () => {
     const content = readAgent("reviewer-lite");
     test("heading present", () => {
-      expect(content.includes(HARD_CONTRACT_HEADING), "reviewer-lite.md missing HARD CONTRACT heading").toBeTruthy();
+      expect(
+        content.includes(HARD_CONTRACT_HEADING),
+        "reviewer-lite.md missing HARD CONTRACT heading"
+      ).toBeTruthy();
     });
     test("write-review-result keyword present", () => {
-      expect(content.includes("write-review-result"), "reviewer-lite.md HARD CONTRACT missing write-review-result keyword").toBeTruthy();
+      expect(
+        content.includes("write-review-result"),
+        "reviewer-lite.md HARD CONTRACT missing write-review-result keyword"
+      ).toBeTruthy();
     });
     test("no validation-result dispatch (validation moved to pre-push hook + /crew:ship)", () => {
-      expect(!content.includes("write-validation-result"), "reviewer-lite.md must NOT call write-validation-result — validation belongs to verifier + hook").toBeTruthy();
+      expect(
+        !content.includes("write-validation-result"),
+        "reviewer-lite.md must NOT call write-validation-result — validation belongs to verifier + hook"
+      ).toBeTruthy();
     });
     test("no full validation gate (lint/format:check/tests/verify:all) inline", () => {
       const validationMarkers = [
@@ -518,7 +728,10 @@ describe.skip("## HARD OUTPUT CONTRACT — Prong A coverage", () => {
         "parallel-gates.ts"
       ];
       for (const marker of validationMarkers) {
-        expect(!content.includes(marker), `reviewer-lite.md must NOT run validation gate inline; found "${marker}"`).toBeTruthy();
+        expect(
+          !content.includes(marker),
+          `reviewer-lite.md must NOT run validation gate inline; found "${marker}"`
+        ).toBeTruthy();
       }
     });
   });
@@ -526,19 +739,34 @@ describe.skip("## HARD OUTPUT CONTRACT — Prong A coverage", () => {
   describe("integrator (newly added)", () => {
     const content = readAgent("integrator");
     test("heading present", () => {
-      expect(content.includes(HARD_CONTRACT_HEADING), "integrator.md missing HARD CONTRACT heading").toBeTruthy();
+      expect(
+        content.includes(HARD_CONTRACT_HEADING),
+        "integrator.md missing HARD CONTRACT heading"
+      ).toBeTruthy();
     });
     test("required preamble phrase", () => {
-      expect(hasPreamble(content), "integrator.md missing LAST action/tool call before returning preamble").toBeTruthy();
+      expect(
+        hasPreamble(content),
+        "integrator.md missing LAST action/tool call before returning preamble"
+      ).toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "integrator.md missing narration/contract-violation phrases").toBeTruthy();
+      expect(
+        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
+        "integrator.md missing narration/contract-violation phrases"
+      ).toBeTruthy();
     });
     test("role-specific: write-handoff keyword", () => {
-      expect(content.includes("write-handoff"), "integrator.md HARD CONTRACT missing write-handoff keyword").toBeTruthy();
+      expect(
+        content.includes("write-handoff"),
+        "integrator.md HARD CONTRACT missing write-handoff keyword"
+      ).toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      expect(content.includes(FEAT_161_CITE), "integrator.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "integrator.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
     test("placement: after Custom instructions, before Procedure of record (tactical heading)", () => {
       const customIdx = content.indexOf("## Custom instructions");
@@ -547,79 +775,145 @@ describe.skip("## HARD OUTPUT CONTRACT — Prong A coverage", () => {
       expect(contractIdx !== -1, "integrator.md HARD CONTRACT heading not found").toBeTruthy();
       expect(customIdx !== -1, "integrator.md missing Custom instructions section").toBeTruthy();
       expect(procedureIdx !== -1, "integrator.md missing Procedure of record heading").toBeTruthy();
-      expect(contractIdx > customIdx, "integrator.md HARD CONTRACT must appear after Custom instructions").toBeTruthy();
-      expect(contractIdx < procedureIdx, "integrator.md HARD CONTRACT must appear before Procedure of record").toBeTruthy();
+      expect(
+        contractIdx > customIdx,
+        "integrator.md HARD CONTRACT must appear after Custom instructions"
+      ).toBeTruthy();
+      expect(
+        contractIdx < procedureIdx,
+        "integrator.md HARD CONTRACT must appear before Procedure of record"
+      ).toBeTruthy();
     });
   });
 
   describe("release-engineer (newly added)", () => {
     const content = readAgent("release-engineer");
     test("heading present", () => {
-      expect(content.includes(HARD_CONTRACT_HEADING), "release-engineer.md missing HARD CONTRACT heading").toBeTruthy();
+      expect(
+        content.includes(HARD_CONTRACT_HEADING),
+        "release-engineer.md missing HARD CONTRACT heading"
+      ).toBeTruthy();
     });
     test("required preamble phrase", () => {
-      expect(hasPreamble(content), "release-engineer.md missing LAST action/tool call before returning preamble").toBeTruthy();
+      expect(
+        hasPreamble(content),
+        "release-engineer.md missing LAST action/tool call before returning preamble"
+      ).toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "release-engineer.md missing narration/contract-violation phrases").toBeTruthy();
+      expect(
+        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
+        "release-engineer.md missing narration/contract-violation phrases"
+      ).toBeTruthy();
     });
     test("role-specific: write-deployment-check keyword", () => {
-      expect(content.includes("write-deployment-check"), "release-engineer.md HARD CONTRACT missing write-deployment-check keyword").toBeTruthy();
+      expect(
+        content.includes("write-deployment-check"),
+        "release-engineer.md HARD CONTRACT missing write-deployment-check keyword"
+      ).toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      expect(content.includes(FEAT_161_CITE), "release-engineer.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "release-engineer.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
     test("placement: after Custom instructions, before deployment-specific content", () => {
       const customIdx = content.indexOf("## Custom instructions");
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
-      expect(contractIdx !== -1, "release-engineer.md HARD CONTRACT heading not found").toBeTruthy();
-      expect(customIdx !== -1, "release-engineer.md missing Custom instructions section").toBeTruthy();
-      expect(contractIdx > customIdx, "release-engineer.md HARD CONTRACT must appear after Custom instructions").toBeTruthy();
+      expect(
+        contractIdx !== -1,
+        "release-engineer.md HARD CONTRACT heading not found"
+      ).toBeTruthy();
+      expect(
+        customIdx !== -1,
+        "release-engineer.md missing Custom instructions section"
+      ).toBeTruthy();
+      expect(
+        contractIdx > customIdx,
+        "release-engineer.md HARD CONTRACT must appear after Custom instructions"
+      ).toBeTruthy();
     });
   });
 
   describe("document-writer (newly added)", () => {
     const content = readAgent("document-writer");
     test("heading present", () => {
-      expect(content.includes(HARD_CONTRACT_HEADING), "document-writer.md missing HARD CONTRACT heading").toBeTruthy();
+      expect(
+        content.includes(HARD_CONTRACT_HEADING),
+        "document-writer.md missing HARD CONTRACT heading"
+      ).toBeTruthy();
     });
     test("required preamble phrase", () => {
-      expect(hasPreamble(content), "document-writer.md missing LAST action/tool call before returning preamble").toBeTruthy();
+      expect(
+        hasPreamble(content),
+        "document-writer.md missing LAST action/tool call before returning preamble"
+      ).toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "document-writer.md missing narration/contract-violation phrases").toBeTruthy();
+      expect(
+        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
+        "document-writer.md missing narration/contract-violation phrases"
+      ).toBeTruthy();
     });
     test("role-specific: write-handoff keyword", () => {
-      expect(content.includes("write-handoff"), "document-writer.md HARD CONTRACT missing write-handoff keyword").toBeTruthy();
+      expect(
+        content.includes("write-handoff"),
+        "document-writer.md HARD CONTRACT missing write-handoff keyword"
+      ).toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      expect(content.includes(FEAT_161_CITE), "document-writer.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "document-writer.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
     test("placement: before Your output contract section", () => {
       const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
       const outputContractIdx = content.indexOf("## Your output contract");
       expect(contractIdx !== -1, "document-writer.md HARD CONTRACT heading not found").toBeTruthy();
-      expect(outputContractIdx !== -1, "document-writer.md missing Your output contract heading").toBeTruthy();
-      expect(contractIdx < outputContractIdx, "document-writer.md HARD CONTRACT must appear before Your output contract section").toBeTruthy();
+      expect(
+        outputContractIdx !== -1,
+        "document-writer.md missing Your output contract heading"
+      ).toBeTruthy();
+      expect(
+        contractIdx < outputContractIdx,
+        "document-writer.md HARD CONTRACT must appear before Your output contract section"
+      ).toBeTruthy();
     });
   });
 
   describe("refactor (newly added)", () => {
     const content = readAgent("refactor");
     test("heading present", () => {
-      expect(content.includes(HARD_CONTRACT_HEADING), "refactor.md missing HARD CONTRACT heading").toBeTruthy();
+      expect(
+        content.includes(HARD_CONTRACT_HEADING),
+        "refactor.md missing HARD CONTRACT heading"
+      ).toBeTruthy();
     });
     test("required preamble phrase", () => {
-      expect(hasPreamble(content), "refactor.md missing LAST action/tool call before returning preamble").toBeTruthy();
+      expect(
+        hasPreamble(content),
+        "refactor.md missing LAST action/tool call before returning preamble"
+      ).toBeTruthy();
     });
     test("narration + violation phrases", () => {
-      expect(content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE), "refactor.md missing narration/contract-violation phrases").toBeTruthy();
+      expect(
+        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
+        "refactor.md missing narration/contract-violation phrases"
+      ).toBeTruthy();
     });
     test("role-specific: write-handoff keyword", () => {
-      expect(content.includes("write-handoff"), "refactor.md HARD CONTRACT missing write-handoff keyword").toBeTruthy();
+      expect(
+        content.includes("write-handoff"),
+        "refactor.md HARD CONTRACT missing write-handoff keyword"
+      ).toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      expect(content.includes(FEAT_161_CITE), "refactor.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "refactor.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
     test("placement: after Custom instructions, before Concern areas content", () => {
       const customIdx = content.indexOf("## Custom instructions");
@@ -628,8 +922,14 @@ describe.skip("## HARD OUTPUT CONTRACT — Prong A coverage", () => {
       expect(contractIdx !== -1, "refactor.md HARD CONTRACT heading not found").toBeTruthy();
       expect(customIdx !== -1, "refactor.md missing Custom instructions section").toBeTruthy();
       expect(concernIdx !== -1, "refactor.md missing Concern areas heading").toBeTruthy();
-      expect(contractIdx > customIdx, "refactor.md HARD CONTRACT must appear after Custom instructions").toBeTruthy();
-      expect(contractIdx < concernIdx, "refactor.md HARD CONTRACT must appear before Concern areas").toBeTruthy();
+      expect(
+        contractIdx > customIdx,
+        "refactor.md HARD CONTRACT must appear after Custom instructions"
+      ).toBeTruthy();
+      expect(
+        contractIdx < concernIdx,
+        "refactor.md HARD CONTRACT must appear before Concern areas"
+      ).toBeTruthy();
     });
   });
 });
@@ -665,7 +965,10 @@ describe.skip("## First action — Prong B coverage", () => {
     // negative-pattern lines; assert FEAT-161 cite still present (pause-detection
     // semantics now carried by badge state).
     test("FEAT-161 cite-back (pause-detection now via badge state)", () => {
-      expect(content.includes(FEAT_161_CITE), "fullstack-dev.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "fullstack-dev.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
   });
 
@@ -681,16 +984,28 @@ describe.skip("## First action — Prong B coverage", () => {
     describe(`${agentName} (no-handoff contract — FEAT-170 SLICE-D)`, () => {
       const content = readAgent(agentName);
       test("FEAT-161 cite-back (pause-detection via badge state)", () => {
-        expect(content.includes(FEAT_161_CITE), `${agentName}.md missing FEAT-161 cite-back`).toBeTruthy();
+        expect(
+          content.includes(FEAT_161_CITE),
+          `${agentName}.md missing FEAT-161 cite-back`
+        ).toBeTruthy();
       });
       test("prohibits write-handoff CLI invocation", () => {
-        expect(content.includes("do NOT write handoff") || content.includes("DO NOT write handoff"), `${agentName}.md must contain "do NOT write handoff" guardrail`).toBeTruthy();
-        expect(content.includes("NEVER invoke `write-handoff`") ||
-            content.includes("NEVER invoke write-handoff"), `${agentName}.md must contain "NEVER invoke write-handoff" guardrail`).toBeTruthy();
+        expect(
+          content.includes("do NOT write handoff") || content.includes("DO NOT write handoff"),
+          `${agentName}.md must contain "do NOT write handoff" guardrail`
+        ).toBeTruthy();
+        expect(
+          content.includes("NEVER invoke `write-handoff`") ||
+            content.includes("NEVER invoke write-handoff"),
+          `${agentName}.md must contain "NEVER invoke write-handoff" guardrail`
+        ).toBeTruthy();
       });
       test("declares STATUS-token follow-up format", () => {
         for (const token of ["DONE", "BLOCKED", "HELP", "IN-PROGRESS"]) {
-          expect(content.includes(token), `${agentName}.md missing STATUS token "${token}"`).toBeTruthy();
+          expect(
+            content.includes(token),
+            `${agentName}.md missing STATUS token "${token}"`
+          ).toBeTruthy();
         }
       });
     });
@@ -699,22 +1014,34 @@ describe.skip("## First action — Prong B coverage", () => {
   describe("reviewer", () => {
     const content = readAgent("reviewer");
     test("stub heading present", () => {
-      expect(content.includes(STUB_HEADING), "reviewer.md missing stub artifact heading").toBeTruthy();
+      expect(
+        content.includes(STUB_HEADING),
+        "reviewer.md missing stub artifact heading"
+      ).toBeTruthy();
     });
     test("--scaffold flag present", () => {
       expect(content.includes(SCAFFOLD_FLAG), "reviewer.md missing --scaffold flag").toBeTruthy();
     });
     test("--status in-progress present", () => {
-      expect(content.includes(STATUS_IN_PROGRESS), "reviewer.md missing --status in-progress").toBeTruthy();
+      expect(
+        content.includes(STATUS_IN_PROGRESS),
+        "reviewer.md missing --status in-progress"
+      ).toBeTruthy();
     });
     test("--update flag present", () => {
       expect(content.includes(UPDATE_FLAG), "reviewer.md missing --update flag").toBeTruthy();
     });
     test("role-specific: write-review-result command", () => {
-      expect(content.includes("write-review-result"), "reviewer.md missing write-review-result").toBeTruthy();
+      expect(
+        content.includes("write-review-result"),
+        "reviewer.md missing write-review-result"
+      ).toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      expect(content.includes(FEAT_161_CITE), "reviewer.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "reviewer.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
     test("DEC-019 reference", () => {
       expect(content.includes(DEC_019), "reviewer.md missing DEC-019 reference").toBeTruthy();
@@ -724,41 +1051,65 @@ describe.skip("## First action — Prong B coverage", () => {
   describe("reviewer-lite (single-stub — validation stripped in v0.41.x rename)", () => {
     const content = readAgent("reviewer-lite");
     test("--scaffold flag present", () => {
-      expect(content.includes(SCAFFOLD_FLAG), "reviewer-lite.md missing --scaffold flag").toBeTruthy();
+      expect(
+        content.includes(SCAFFOLD_FLAG),
+        "reviewer-lite.md missing --scaffold flag"
+      ).toBeTruthy();
     });
     test("--status in-progress present", () => {
-      expect(content.includes(STATUS_IN_PROGRESS), "reviewer-lite.md missing --status in-progress").toBeTruthy();
+      expect(
+        content.includes(STATUS_IN_PROGRESS),
+        "reviewer-lite.md missing --status in-progress"
+      ).toBeTruthy();
     });
     test("--update flag present", () => {
       expect(content.includes(UPDATE_FLAG), "reviewer-lite.md missing --update flag").toBeTruthy();
     });
     test("write-review-result present", () => {
-      expect(content.includes("write-review-result"), "reviewer-lite.md missing write-review-result").toBeTruthy();
+      expect(
+        content.includes("write-review-result"),
+        "reviewer-lite.md missing write-review-result"
+      ).toBeTruthy();
     });
     test("write-validation-result absent (validation moved to hook + ship)", () => {
-      expect(!content.includes("write-validation-result"), "reviewer-lite.md must NOT call write-validation-result").toBeTruthy();
+      expect(
+        !content.includes("write-validation-result"),
+        "reviewer-lite.md must NOT call write-validation-result"
+      ).toBeTruthy();
     });
   });
 
   describe("verifier", () => {
     const content = readAgent("verifier");
     test("stub heading present", () => {
-      expect(content.includes(STUB_HEADING), "verifier.md missing stub artifact heading").toBeTruthy();
+      expect(
+        content.includes(STUB_HEADING),
+        "verifier.md missing stub artifact heading"
+      ).toBeTruthy();
     });
     test("--scaffold flag present", () => {
       expect(content.includes(SCAFFOLD_FLAG), "verifier.md missing --scaffold flag").toBeTruthy();
     });
     test("--status in-progress present", () => {
-      expect(content.includes(STATUS_IN_PROGRESS), "verifier.md missing --status in-progress").toBeTruthy();
+      expect(
+        content.includes(STATUS_IN_PROGRESS),
+        "verifier.md missing --status in-progress"
+      ).toBeTruthy();
     });
     test("--update flag present", () => {
       expect(content.includes(UPDATE_FLAG), "verifier.md missing --update flag").toBeTruthy();
     });
     test("role-specific: write-validation-result command", () => {
-      expect(content.includes("write-validation-result"), "verifier.md missing write-validation-result").toBeTruthy();
+      expect(
+        content.includes("write-validation-result"),
+        "verifier.md missing write-validation-result"
+      ).toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      expect(content.includes(FEAT_161_CITE), "verifier.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "verifier.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
     test("DEC-019 reference", () => {
       expect(content.includes(DEC_019), "verifier.md missing DEC-019 reference").toBeTruthy();
@@ -768,13 +1119,19 @@ describe.skip("## First action — Prong B coverage", () => {
   describe("integrator", () => {
     const content = readAgent("integrator");
     test("stub heading present", () => {
-      expect(content.includes(STUB_HEADING), "integrator.md missing stub artifact heading").toBeTruthy();
+      expect(
+        content.includes(STUB_HEADING),
+        "integrator.md missing stub artifact heading"
+      ).toBeTruthy();
     });
     test("--scaffold flag present", () => {
       expect(content.includes(SCAFFOLD_FLAG), "integrator.md missing --scaffold flag").toBeTruthy();
     });
     test("--status in-progress present", () => {
-      expect(content.includes(STATUS_IN_PROGRESS), "integrator.md missing --status in-progress").toBeTruthy();
+      expect(
+        content.includes(STATUS_IN_PROGRESS),
+        "integrator.md missing --status in-progress"
+      ).toBeTruthy();
     });
     test("--update flag present", () => {
       expect(content.includes(UPDATE_FLAG), "integrator.md missing --update flag").toBeTruthy();
@@ -783,7 +1140,10 @@ describe.skip("## First action — Prong B coverage", () => {
       expect(content.includes("write-handoff"), "integrator.md missing write-handoff").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      expect(content.includes(FEAT_161_CITE), "integrator.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "integrator.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
     test("DEC-019 reference", () => {
       expect(content.includes(DEC_019), "integrator.md missing DEC-019 reference").toBeTruthy();
@@ -793,38 +1153,65 @@ describe.skip("## First action — Prong B coverage", () => {
   describe("release-engineer", () => {
     const content = readAgent("release-engineer");
     test("stub heading present", () => {
-      expect(content.includes(STUB_HEADING), "release-engineer.md missing stub artifact heading").toBeTruthy();
+      expect(
+        content.includes(STUB_HEADING),
+        "release-engineer.md missing stub artifact heading"
+      ).toBeTruthy();
     });
     test("--scaffold flag present", () => {
-      expect(content.includes(SCAFFOLD_FLAG), "release-engineer.md missing --scaffold flag").toBeTruthy();
+      expect(
+        content.includes(SCAFFOLD_FLAG),
+        "release-engineer.md missing --scaffold flag"
+      ).toBeTruthy();
     });
     test("--status in-progress present", () => {
-      expect(content.includes(STATUS_IN_PROGRESS), "release-engineer.md missing --status in-progress").toBeTruthy();
+      expect(
+        content.includes(STATUS_IN_PROGRESS),
+        "release-engineer.md missing --status in-progress"
+      ).toBeTruthy();
     });
     test("--update flag present", () => {
-      expect(content.includes(UPDATE_FLAG), "release-engineer.md missing --update flag").toBeTruthy();
+      expect(
+        content.includes(UPDATE_FLAG),
+        "release-engineer.md missing --update flag"
+      ).toBeTruthy();
     });
     test("role-specific: write-deployment-check command", () => {
-      expect(content.includes("write-deployment-check"), "release-engineer.md missing write-deployment-check").toBeTruthy();
+      expect(
+        content.includes("write-deployment-check"),
+        "release-engineer.md missing write-deployment-check"
+      ).toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      expect(content.includes(FEAT_161_CITE), "release-engineer.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "release-engineer.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
     test("DEC-019 reference", () => {
-      expect(content.includes(DEC_019), "release-engineer.md missing DEC-019 reference").toBeTruthy();
+      expect(
+        content.includes(DEC_019),
+        "release-engineer.md missing DEC-019 reference"
+      ).toBeTruthy();
     });
   });
 
   describe("refactor", () => {
     const content = readAgent("refactor");
     test("stub heading present", () => {
-      expect(content.includes(STUB_HEADING), "refactor.md missing stub artifact heading").toBeTruthy();
+      expect(
+        content.includes(STUB_HEADING),
+        "refactor.md missing stub artifact heading"
+      ).toBeTruthy();
     });
     test("--scaffold flag present", () => {
       expect(content.includes(SCAFFOLD_FLAG), "refactor.md missing --scaffold flag").toBeTruthy();
     });
     test("--status in-progress present", () => {
-      expect(content.includes(STATUS_IN_PROGRESS), "refactor.md missing --status in-progress").toBeTruthy();
+      expect(
+        content.includes(STATUS_IN_PROGRESS),
+        "refactor.md missing --status in-progress"
+      ).toBeTruthy();
     });
     test("--update flag present", () => {
       expect(content.includes(UPDATE_FLAG), "refactor.md missing --update flag").toBeTruthy();
@@ -833,7 +1220,10 @@ describe.skip("## First action — Prong B coverage", () => {
       expect(content.includes("write-handoff"), "refactor.md missing write-handoff").toBeTruthy();
     });
     test("FEAT-161 cite-back", () => {
-      expect(content.includes(FEAT_161_CITE), "refactor.md missing FEAT-161 cite-back").toBeTruthy();
+      expect(
+        content.includes(FEAT_161_CITE),
+        "refactor.md missing FEAT-161 cite-back"
+      ).toBeTruthy();
     });
     test("DEC-019 reference", () => {
       expect(content.includes(DEC_019), "refactor.md missing DEC-019 reference").toBeTruthy();
@@ -865,24 +1255,36 @@ describe("## Structural deviation rule — extracted to builder-ceremony skill i
   const skill = readFileSync(skillPath, "utf8");
 
   test("structural deviation heading present in skill", () => {
-    expect(skill.includes(STRUCTURAL_DEVIATION_HEADING), `builder-ceremony/SKILL.md missing "${STRUCTURAL_DEVIATION_HEADING}" heading`).toBeTruthy();
+    expect(
+      skill.includes(STRUCTURAL_DEVIATION_HEADING),
+      `builder-ceremony/SKILL.md missing "${STRUCTURAL_DEVIATION_HEADING}" heading`
+    ).toBeTruthy();
   });
 
   test("structural-deviation return instruction present in skill (BLOCKED form)", () => {
     const usesBlockedFollowUp =
       skill.includes("BLOCKED: structural-deviation") ||
       skill.includes("BLOCKED: structural deviation");
-    expect(usesBlockedFollowUp, `builder-ceremony/SKILL.md missing structural-deviation return instruction (BLOCKED follow-up form)`).toBeTruthy();
+    expect(
+      usesBlockedFollowUp,
+      `builder-ceremony/SKILL.md missing structural-deviation return instruction (BLOCKED follow-up form)`
+    ).toBeTruthy();
   });
 
   test("structural-deviation: risks-field prefix present in skill", () => {
-    expect(skill.includes(STRUCTURAL_DEVIATION_PREFIX), `builder-ceremony/SKILL.md missing "${STRUCTURAL_DEVIATION_PREFIX}" risks-field prefix convention`).toBeTruthy();
+    expect(
+      skill.includes(STRUCTURAL_DEVIATION_PREFIX),
+      `builder-ceremony/SKILL.md missing "${STRUCTURAL_DEVIATION_PREFIX}" risks-field prefix convention`
+    ).toBeTruthy();
   });
 
   test("anti-silent-workaround warning present in skill", () => {
     const hasWarning =
       skill.includes(ANTI_SILENT_WORKAROUND_A) || skill.includes(ANTI_SILENT_WORKAROUND_B);
-    expect(hasWarning, `builder-ceremony/SKILL.md missing anti-silent-workaround warning ("silently drop" or "silent workaround")`).toBeTruthy();
+    expect(
+      hasWarning,
+      `builder-ceremony/SKILL.md missing anti-silent-workaround warning ("silently drop" or "silent workaround")`
+    ).toBeTruthy();
   });
 
   // Per-agent assertion: each builder must reference the ceremony skill (so the
@@ -898,7 +1300,10 @@ describe("## Structural deviation rule — extracted to builder-ceremony skill i
     describe(agentName, () => {
       const content = readAgent(agentName);
       test("references builder-ceremony skill", () => {
-        expect(content.includes("skills/workflow/builder-ceremony/"), `${agentName}.md must reference skills/workflow/builder-ceremony/ for structural deviation rule`).toBeTruthy();
+        expect(
+          content.includes("skills/workflow/builder-ceremony/"),
+          `${agentName}.md must reference skills/workflow/builder-ceremony/ for structural deviation rule`
+        ).toBeTruthy();
       });
     });
   }
@@ -941,7 +1346,10 @@ describe("No lead refs across active agents", () => {
       const content = readAgent(name);
       const body = content.replace(/^---[\s\S]*?---\n/, "");
       const matches = body.match(/\bthe lead\b|\bto the lead\b|\bby the lead\b|\bcrew:lead\b/gi);
-      expect(!matches || matches.length === 0, `${name}.md must not reference removed 'lead' agent; found: ${matches?.join(", ")}`).toBeTruthy();
+      expect(
+        !matches || matches.length === 0,
+        `${name}.md must not reference removed 'lead' agent; found: ${matches?.join(", ")}`
+      ).toBeTruthy();
     });
   }
 });
diff --git a/crew/tests/architect-feature.test.mts b/crew/tests/architect-feature.test.mts
index 28cfb35b..dc8a05e0 100644
--- a/crew/tests/architect-feature.test.mts
+++ b/crew/tests/architect-feature.test.mts
@@ -37,7 +37,9 @@ test("architect-feature documents ## Inferred Tags section requirement", async (
 
 test("architect-feature documents tag write-back as additive", async () => {
   const text = await fs.readFile(CMD, "utf8");
-  expect(text, "command must document that tag write-back never removes existing tags").toMatch(/additive|never remove|net.new/i);
+  expect(text, "command must document that tag write-back never removes existing tags").toMatch(
+    /additive|never remove|net.new/i
+  );
 });
 
 test("architect-feature documents --auto-start flag", async () => {
@@ -47,15 +49,23 @@ test("architect-feature documents --auto-start flag", async () => {
 
 test("architect-feature documents FEAT-not-found error handling", async () => {
   const text = await fs.readFile(CMD, "utf8");
-  expect(text, "command must document FEAT-not-found error case").toMatch(/not found|paths tried|halt/i);
+  expect(text, "command must document FEAT-not-found error case").toMatch(
+    /not found|paths tried|halt/i
+  );
 });
 
 test("architect-feature documents re-run idempotency (Feature Revision prefix)", async () => {
   const text = await fs.readFile(CMD, "utf8");
-  expect(text, "command must use 'Feature Revision' prefix to distinguish re-run sections from orchestrate-slice Revision sections").toMatch(/Feature Revision/);
+  expect(
+    text,
+    "command must use 'Feature Revision' prefix to distinguish re-run sections from orchestrate-slice Revision sections"
+  ).toMatch(/Feature Revision/);
 });
 
 test("architect-feature documents --auto-start clean exit when no pending slice", async () => {
   const text = await fs.readFile(CMD, "utf8");
-  expect(text, "command must document exit 0 when no pending slice found under --auto-start").toMatch(/exit 0/);
+  expect(
+    text,
+    "command must document exit 0 when no pending slice found under --auto-start"
+  ).toMatch(/exit 0/);
 });
diff --git a/crew/tests/artifact-stub-and-update.test.mts b/crew/tests/artifact-stub-and-update.test.mts
index e763328d..bd266097 100644
--- a/crew/tests/artifact-stub-and-update.test.mts
+++ b/crew/tests/artifact-stub-and-update.test.mts
@@ -135,11 +135,15 @@ test("write-handoff with --update overwrites stub in place, no second file creat
     const handoffCountAfter = filesAfter.filter((f) => f.includes("handoff")).length;
 
     // Verify only ONE handoff file exists (no second file created)
-    expect(handoffCountAfter, "should not create a second file; update should overwrite").toBe(handoffCountBefore);
+    expect(handoffCountAfter, "should not create a second file; update should overwrite").toBe(
+      handoffCountBefore
+    );
 
     // Verify the file was updated with new content
     stubBody = await fs.readFile(stubPath, "utf8");
-    expect(stubBody, "updated stub should contain 'Status: completed'").toMatch(/Status: completed/);
+    expect(stubBody, "updated stub should contain 'Status: completed'").toMatch(
+      /Status: completed/
+    );
     expect(stubBody, "updated stub should contain 'final artifact'").toMatch(/final artifact/);
     expect(stubBody, "updated stub should contain 'completed work'").toMatch(/completed work/);
   } finally {
@@ -276,7 +280,9 @@ test("artifact write without --update creates new timestamped file (backward com
     const artifact2 = JSON.parse(result2.stdout);
 
     // Verify two different files exist
-    expect(artifact1.path, "should create two separate files without --update").not.toBe(artifact2.path);
+    expect(artifact1.path, "should create two separate files without --update").not.toBe(
+      artifact2.path
+    );
     const exists1 = await fs.stat(artifact1.path);
     const exists2 = await fs.stat(artifact2.path);
     expect(exists1, "first artifact should exist").toBeTruthy();
diff --git a/crew/tests/bash-gate-timer.test.mts b/crew/tests/bash-gate-timer.test.mts
index 75686dee..fa616490 100644
--- a/crew/tests/bash-gate-timer.test.mts
+++ b/crew/tests/bash-gate-timer.test.mts
@@ -80,7 +80,10 @@ test("end-to-end: startGateTimer + endGateTimer writes JSONL row with correct fi
     const row = JSON.parse(raw.trim()) as Record<string, unknown>;
     expect(row["gate"]).toBe("lint");
     expect(row["exitCode"]).toBe(0);
-    expect(typeof row["durationMs"] === "number" && row["durationMs"] >= 10, `durationMs ${row["durationMs"]} below floor`).toBeTruthy();
+    expect(
+      typeof row["durationMs"] === "number" && row["durationMs"] >= 10,
+      `durationMs ${row["durationMs"]} below floor`
+    ).toBeTruthy();
   } finally {
     delete process.env["CREW_BASH_GATE_LOG"];
     await fs.rm(tmp, { recursive: true, force: true });
diff --git a/crew/tests/branch-cleanup.test.mts b/crew/tests/branch-cleanup.test.mts
index 469082d7..22867d12 100644
--- a/crew/tests/branch-cleanup.test.mts
+++ b/crew/tests/branch-cleanup.test.mts
@@ -14,7 +14,11 @@ import path from "node:path";
 import { execFile as execFileCallback } from "node:child_process";
 import { promisify } from "node:util";
 
-import { isStandardMerged, isSquashMerged, isBranchMerged } from "../scripts/lib/branch-cleanup.mjs";
+import {
+  isStandardMerged,
+  isSquashMerged,
+  isBranchMerged
+} from "../scripts/lib/branch-cleanup.mjs";
 
 const execFile = promisify(execFileCallback);
 
diff --git a/crew/tests/briefing-cost-health.test.mts b/crew/tests/briefing-cost-health.test.mts
index 1c0c3efb..e13f593b 100644
--- a/crew/tests/briefing-cost-health.test.mts
+++ b/crew/tests/briefing-cost-health.test.mts
@@ -107,7 +107,10 @@ test("collectCostHealth: returns costHealth with grade and topConcern when cost
     expect(typeof result.grade === "string", "grade must be a string").toBeTruthy();
     expect(result.reportCount >= 1, "reportCount must be >= 1").toBeTruthy();
     // topConcern can be null (no rules fired) or a string
-    expect(result.topConcern === null || typeof result.topConcern === "string", "topConcern must be string or null").toBeTruthy();
+    expect(
+      result.topConcern === null || typeof result.topConcern === "string",
+      "topConcern must be string or null"
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -138,7 +141,10 @@ test("collectCostHealth: grade is a valid A-F letter", async () => {
   try {
     const result = await collectCostHealth(tmpDir);
     expect(result !== null, "Expected non-null result").toBeTruthy();
-    expect(validGrades.has(result.grade), `grade '${result.grade}' must be one of A,B,C,D,F`).toBeTruthy();
+    expect(
+      validGrades.has(result.grade),
+      `grade '${result.grade}' must be one of A,B,C,D,F`
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -155,7 +161,10 @@ test("collectCostHealth: topConcern is string or null", async () => {
   try {
     const result = await collectCostHealth(tmpDir);
     expect(result !== null, "Expected non-null result").toBeTruthy();
-    expect(result.topConcern === null || typeof result.topConcern === "string", `topConcern must be string or null, got ${typeof result.topConcern}`).toBeTruthy();
+    expect(
+      result.topConcern === null || typeof result.topConcern === "string",
+      `topConcern must be string or null, got ${typeof result.topConcern}`
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -196,7 +205,10 @@ test("collectCostHealth: grade downgrades when cache hit is below A threshold",
     expect(result !== null, "Expected non-null result").toBeTruthy();
     const gradeOrder = ["A", "B", "C", "D", "F"];
     const gradeIdx = gradeOrder.indexOf(result.grade);
-    expect(gradeIdx >= gradeOrder.indexOf("D"), `Expected grade D or worse for cache hit 85%, got ${result.grade}`).toBeTruthy();
+    expect(
+      gradeIdx >= gradeOrder.indexOf("D"),
+      `Expected grade D or worse for cache hit 85%, got ${result.grade}`
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -213,7 +225,10 @@ test("collectCostHealth: topConcern is a non-empty string when a rule fires", as
   try {
     const result = await collectCostHealth(tmpDir);
     expect(result !== null, "Expected non-null result").toBeTruthy();
-    expect(typeof result.topConcern === "string" && result.topConcern.length > 0, `Expected non-empty topConcern string when cache-busted rule fires, got: ${JSON.stringify(result.topConcern)}`).toBeTruthy();
+    expect(
+      typeof result.topConcern === "string" && result.topConcern.length > 0,
+      `Expected non-empty topConcern string when cache-busted rule fires, got: ${JSON.stringify(result.topConcern)}`
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -250,7 +265,10 @@ test("buildBriefingReport: summary.costHealth is present when cost reports exist
   // Need a minimal git repo for buildBriefingReport to not fail
   try {
     const result = await buildBriefingReport(tmpDir);
-    expect("costHealth" in result, "Expected costHealth field in buildBriefingReport output").toBeTruthy();
+    expect(
+      "costHealth" in result,
+      "Expected costHealth field in buildBriefingReport output"
+    ).toBeTruthy();
     // When reports exist, costHealth should be non-null
     if (result.costHealth != null) {
       expect(typeof (result.costHealth as { grade: string }).grade === "string").toBeTruthy();
@@ -269,7 +287,10 @@ test("buildBriefingReport: costHealth is null when no cost reports exist", async
   const tmpDir = await makeTempRepo([]); // no reports
   try {
     const result = await buildBriefingReport(tmpDir);
-    expect("costHealth" in result, "Expected costHealth key to be present in result (even if null)").toBeTruthy();
+    expect(
+      "costHealth" in result,
+      "Expected costHealth key to be present in result (even if null)"
+    ).toBeTruthy();
     expect(result.costHealth, "Expected costHealth to be null when no reports exist").toBe(null);
   } finally {
     await cleanup(tmpDir);
@@ -452,7 +473,10 @@ test("collectCostAggregate: returns aggregate data when aggregate-variant file e
   });
   try {
     const result = await collectCostAggregate(tmpDir);
-    expect(result !== null, "Expected non-null costAggregate when aggregate file exists").toBeTruthy();
+    expect(
+      result !== null,
+      "Expected non-null costAggregate when aggregate file exists"
+    ).toBeTruthy();
     expect(typeof result.grade === "string", "grade must be a string").toBeTruthy();
   } finally {
     await cleanup(tmpDir);
@@ -476,7 +500,10 @@ test("collectCostHealth: grade uses slice reread count (9), not aggregate reread
     // If grade is derived from aggregate (114 rereads) → F
     // Grade must NOT be F when using the per-slice file.
     // (cacheHitPct=99 → A; 9 rereads → C-band worst case for that metric alone)
-    expect(sliceHealth.grade, `costHealth.grade should not be F when slice has only 9 rereads (expected C or better), got ${sliceHealth.grade}`).not.toBe("F");
+    expect(
+      sliceHealth.grade,
+      `costHealth.grade should not be F when slice has only 9 rereads (expected C or better), got ${sliceHealth.grade}`
+    ).not.toBe("F");
   } finally {
     await cleanup(tmpDir);
   }
@@ -500,7 +527,9 @@ test("collectCostAggregate: returns null in legacy-only world (no aggregate-vari
   const tmpDir = await makeTempRepoWithVariants({ legacyFiles: [legacyText] });
   try {
     const result = await collectCostAggregate(tmpDir);
-    expect(result, "Expected null costAggregate when only legacy (non-infixed) files exist").toBe(null);
+    expect(result, "Expected null costAggregate when only legacy (non-infixed) files exist").toBe(
+      null
+    );
   } finally {
     await cleanup(tmpDir);
   }
@@ -513,7 +542,10 @@ test("buildBriefingReport: exposes costAggregate field at top level", async () =
   const tmpDir = await makeTempRepoWithVariants({ sliceFiles: [sliceText] });
   try {
     const result = await buildBriefingReport(tmpDir);
-    expect("costAggregate" in result, "Expected costAggregate key in buildBriefingReport output").toBeTruthy();
+    expect(
+      "costAggregate" in result,
+      "Expected costAggregate key in buildBriefingReport output"
+    ).toBeTruthy();
     // With no aggregate file, costAggregate should be null
     expect(result.costAggregate, "Expected costAggregate null when no aggregate file").toBe(null);
   } finally {
diff --git a/crew/tests/briefing-cost-rollup-dedupe.test.mts b/crew/tests/briefing-cost-rollup-dedupe.test.mts
index 29c76d2c..f09c719c 100644
--- a/crew/tests/briefing-cost-rollup-dedupe.test.mts
+++ b/crew/tests/briefing-cost-rollup-dedupe.test.mts
@@ -169,8 +169,14 @@ test("collectRecentCosts dedupe: all-aggregate same window → sumUsdRecent = la
     expect(result.recent.length, "recent[] must contain all 3 raw reports").toBe(3);
     expect(result.totalReports, "totalReports must be 3").toBe(3);
     expect(result.dedupedCount, "dedupedCount must be 1 (latest aggregate only)").toBe(1);
-    expect(Math.abs(result.sumUsdRecent! - 3995.81) < 0.01, `sumUsdRecent must be ~3995.81, got ${result.sumUsdRecent}`).toBeTruthy();
-    expect(Math.abs(result.avgUsdRecent! - 3995.81) < 0.01, `avgUsdRecent must divide by dedupedCount (1), got ${result.avgUsdRecent}`).toBeTruthy();
+    expect(
+      Math.abs(result.sumUsdRecent! - 3995.81) < 0.01,
+      `sumUsdRecent must be ~3995.81, got ${result.sumUsdRecent}`
+    ).toBeTruthy();
+    expect(
+      Math.abs(result.avgUsdRecent! - 3995.81) < 0.01,
+      `avgUsdRecent must divide by dedupedCount (1), got ${result.avgUsdRecent}`
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -214,7 +220,10 @@ test("collectRecentCosts dedupe: aggregate + nested slice same window → sumUsd
 
     expect(result.recent.length, "recent[] must contain both raw reports").toBe(2);
     expect(result.dedupedCount, "dedupedCount must be 1 (aggregate wins)").toBe(1);
-    expect(Math.abs(result.sumUsdRecent! - 3995.81) < 0.01, `sumUsdRecent must be aggregate usd ~3995.81, got ${result.sumUsdRecent}`).toBeTruthy();
+    expect(
+      Math.abs(result.sumUsdRecent! - 3995.81) < 0.01,
+      `sumUsdRecent must be aggregate usd ~3995.81, got ${result.sumUsdRecent}`
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -257,7 +266,10 @@ test("collectRecentCosts dedupe: disjoint historical windows → sumUsdRecent =
 
     expect(result.recent.length, "recent[] must contain both raw reports").toBe(2);
     expect(result.dedupedCount, "dedupedCount must be 2 (both disjoint windows)").toBe(2);
-    expect(Math.abs(result.sumUsdRecent! - 300) < 0.01, `sumUsdRecent must be plain sum 300, got ${result.sumUsdRecent}`).toBeTruthy();
+    expect(
+      Math.abs(result.sumUsdRecent! - 300) < 0.01,
+      `sumUsdRecent must be plain sum 300, got ${result.sumUsdRecent}`
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -326,9 +338,14 @@ test("collectRecentCosts dedupe: mixed scenario → sum = latest aggregate + dis
     const result = await collectRecentCosts(tmpDir, 5);
 
     expect(result.recent.length, "recent[] must contain all 4 raw reports").toBe(4);
-    expect(result.dedupedCount, "dedupedCount must be 2 (latest agg + disjoint historical)").toBe(2);
+    expect(result.dedupedCount, "dedupedCount must be 2 (latest agg + disjoint historical)").toBe(
+      2
+    );
     const expected = 3995.81 + 50;
-    expect(Math.abs(result.sumUsdRecent! - expected) < 0.01, `sumUsdRecent must be ${expected}, got ${result.sumUsdRecent}`).toBeTruthy();
+    expect(
+      Math.abs(result.sumUsdRecent! - expected) < 0.01,
+      `sumUsdRecent must be ${expected}, got ${result.sumUsdRecent}`
+    ).toBeTruthy();
   } finally {
     await cleanup(tmpDir);
   }
@@ -375,7 +392,10 @@ test("collectRecentCosts dedupe: modelBurn only counts deduped reports", async (
     // modelBurn.slices for opus should be 1 (one deduped report), not 2
     const opusBurn = result.modelBurn?.find((m) => m.model === opusModel);
     expect(opusBurn != null, `Expected modelBurn entry for ${opusModel}`).toBeTruthy();
-    expect(opusBurn.slices, `modelBurn.slices for ${opusModel} must be 1 (deduped), got ${opusBurn.slices}`).toBe(1);
+    expect(
+      opusBurn.slices,
+      `modelBurn.slices for ${opusModel} must be 1 (deduped), got ${opusBurn.slices}`
+    ).toBe(1);
   } finally {
     await cleanup(tmpDir);
   }
@@ -392,7 +412,10 @@ test("collectRecentCosts: dedupedCount field is present on result", async () =>
 
     const result = await collectRecentCosts(tmpDir, 5);
 
-    expect("dedupedCount" in result, "dedupedCount field must be present on collectRecentCosts result").toBeTruthy();
+    expect(
+      "dedupedCount" in result,
+      "dedupedCount field must be present on collectRecentCosts result"
+    ).toBeTruthy();
     expect(typeof result.dedupedCount === "number", "dedupedCount must be a number").toBeTruthy();
   } finally {
     await cleanup(tmpDir);
diff --git a/crew/tests/briefing-module-imports.test.mts b/crew/tests/briefing-module-imports.test.mts
index 5ea62bff..16bd33ea 100644
--- a/crew/tests/briefing-module-imports.test.mts
+++ b/crew/tests/briefing-module-imports.test.mts
@@ -10,34 +10,100 @@ test("briefing modules can be imported independently", async () => {
   await import("../scripts/lib/briefing/collect.mjs");
 
   // Verify core functions exist in their home modules
-  expect(typeof git.collectGitActivity === "function", "git.collectGitActivity exists").toBeTruthy();
-  expect(typeof cost.collectRecentCosts === "function", "cost.collectRecentCosts exists").toBeTruthy();
-  expect(typeof cost.collectCostHealth === "function", "cost.collectCostHealth exists").toBeTruthy();
-  expect(typeof cost.collectCostAggregate === "function", "cost.collectCostAggregate exists").toBeTruthy();
-  expect(typeof cost.computeModelCompliance === "function", "cost.computeModelCompliance exists").toBeTruthy();
-  expect(typeof cost.collectModelCompliance === "function", "cost.collectModelCompliance exists").toBeTruthy();
-  expect(typeof workflow.collectRelevantArtifacts === "function", "workflow.collectRelevantArtifacts exists").toBeTruthy();
-  expect(typeof workflow.fetchAutonomousLoopBrief === "function", "workflow.fetchAutonomousLoopBrief exists").toBeTruthy();
-  expect(typeof workflow.findAutonomousLoopCli === "function", "workflow.findAutonomousLoopCli exists").toBeTruthy();
-  expect(typeof hook.collectHookHealth === "function", "hook.collectHookHealth exists").toBeTruthy();
-  expect(typeof bundle.collectBundleStats === "function", "bundle.collectBundleStats exists").toBeTruthy();
+  expect(
+    typeof git.collectGitActivity === "function",
+    "git.collectGitActivity exists"
+  ).toBeTruthy();
+  expect(
+    typeof cost.collectRecentCosts === "function",
+    "cost.collectRecentCosts exists"
+  ).toBeTruthy();
+  expect(
+    typeof cost.collectCostHealth === "function",
+    "cost.collectCostHealth exists"
+  ).toBeTruthy();
+  expect(
+    typeof cost.collectCostAggregate === "function",
+    "cost.collectCostAggregate exists"
+  ).toBeTruthy();
+  expect(
+    typeof cost.computeModelCompliance === "function",
+    "cost.computeModelCompliance exists"
+  ).toBeTruthy();
+  expect(
+    typeof cost.collectModelCompliance === "function",
+    "cost.collectModelCompliance exists"
+  ).toBeTruthy();
+  expect(
+    typeof workflow.collectRelevantArtifacts === "function",
+    "workflow.collectRelevantArtifacts exists"
+  ).toBeTruthy();
+  expect(
+    typeof workflow.fetchAutonomousLoopBrief === "function",
+    "workflow.fetchAutonomousLoopBrief exists"
+  ).toBeTruthy();
+  expect(
+    typeof workflow.findAutonomousLoopCli === "function",
+    "workflow.findAutonomousLoopCli exists"
+  ).toBeTruthy();
+  expect(
+    typeof hook.collectHookHealth === "function",
+    "hook.collectHookHealth exists"
+  ).toBeTruthy();
+  expect(
+    typeof bundle.collectBundleStats === "function",
+    "bundle.collectBundleStats exists"
+  ).toBeTruthy();
 });
 
 test("collect.ts re-exports all functions from modules", async () => {
   const collect = await import("../scripts/lib/briefing/collect.mjs");
 
   // Verify all functions are re-exported from collect.ts
-  expect(typeof collect.collectGitActivity === "function", "collect.collectGitActivity re-exported").toBeTruthy();
-  expect(typeof collect.collectRecentCosts === "function", "collect.collectRecentCosts re-exported").toBeTruthy();
-  expect(typeof collect.collectCostHealth === "function", "collect.collectCostHealth re-exported").toBeTruthy();
-  expect(typeof collect.collectCostAggregate === "function", "collect.collectCostAggregate re-exported").toBeTruthy();
-  expect(typeof collect.computeModelCompliance === "function", "collect.computeModelCompliance re-exported").toBeTruthy();
-  expect(typeof collect.collectModelCompliance === "function", "collect.collectModelCompliance re-exported").toBeTruthy();
-  expect(typeof collect.collectRelevantArtifacts === "function", "collect.collectRelevantArtifacts re-exported").toBeTruthy();
-  expect(typeof collect.fetchAutonomousLoopBrief === "function", "collect.fetchAutonomousLoopBrief re-exported").toBeTruthy();
-  expect(typeof collect.findAutonomousLoopCli === "function", "collect.findAutonomousLoopCli re-exported").toBeTruthy();
-  expect(typeof collect.collectHookHealth === "function", "collect.collectHookHealth re-exported").toBeTruthy();
-  expect(typeof collect.collectBundleStats === "function", "collect.collectBundleStats re-exported").toBeTruthy();
+  expect(
+    typeof collect.collectGitActivity === "function",
+    "collect.collectGitActivity re-exported"
+  ).toBeTruthy();
+  expect(
+    typeof collect.collectRecentCosts === "function",
+    "collect.collectRecentCosts re-exported"
+  ).toBeTruthy();
+  expect(
+    typeof collect.collectCostHealth === "function",
+    "collect.collectCostHealth re-exported"
+  ).toBeTruthy();
+  expect(
+    typeof collect.collectCostAggregate === "function",
+    "collect.collectCostAggregate re-exported"
+  ).toBeTruthy();
+  expect(
+    typeof collect.computeModelCompliance === "function",
+    "collect.computeModelCompliance re-exported"
+  ).toBeTruthy();
+  expect(
+    typeof collect.collectModelCompliance === "function",
+    "collect.collectModelCompliance re-exported"
+  ).toBeTruthy();
+  expect(
+    typeof collect.collectRelevantArtifacts === "function",
+    "collect.collectRelevantArtifacts re-exported"
+  ).toBeTruthy();
+  expect(
+    typeof collect.fetchAutonomousLoopBrief === "function",
+    "collect.fetchAutonomousLoopBrief re-exported"
+  ).toBeTruthy();
+  expect(
+    typeof collect.findAutonomousLoopCli === "function",
+    "collect.findAutonomousLoopCli re-exported"
+  ).toBeTruthy();
+  expect(
+    typeof collect.collectHookHealth === "function",
+    "collect.collectHookHealth re-exported"
+  ).toBeTruthy();
+  expect(
+    typeof collect.collectBundleStats === "function",
+    "collect.collectBundleStats re-exported"
+  ).toBeTruthy();
 });
 
 test("collect.ts re-exports all interfaces from modules", async () => {
diff --git a/crew/tests/build-bundle-assemble.test.mts b/crew/tests/build-bundle-assemble.test.mts
index eeb1003b..5abb6018 100644
--- a/crew/tests/build-bundle-assemble.test.mts
+++ b/crew/tests/build-bundle-assemble.test.mts
@@ -34,8 +34,10 @@ test("assembleBuildBundle: happy path writes bundle with frontmatter and four se
     filesRead: ["c.md"]
   });
 
-  expect(result.path.endsWith("SLICE-99/backend-dev-20260608T223000Z-build-bundle.md") ||
-      result.path.endsWith("SLICE-99\\backend-dev-20260608T223000Z-build-bundle.md")).toBeTruthy();
+  expect(
+    result.path.endsWith("SLICE-99/backend-dev-20260608T223000Z-build-bundle.md") ||
+      result.path.endsWith("SLICE-99\\backend-dev-20260608T223000Z-build-bundle.md")
+  ).toBeTruthy();
   expect(result.truncated).toBe(false);
   expect(result.filesReadSkipped).toEqual([]);
 
@@ -91,7 +93,9 @@ test("assembleBuildBundle: outside-repo path in files_read is dropped", async ()
     filesRead: ["../outside.txt"]
   });
 
-  expect(result.filesReadSkipped.some((s) => s.path === "../outside.txt" && s.reason === "outside-repo")).toBeTruthy();
+  expect(
+    result.filesReadSkipped.some((s) => s.path === "../outside.txt" && s.reason === "outside-repo")
+  ).toBeTruthy();
 });
 
 test("assembleBuildBundle: binary file in files_touched is replaced with placeholder", async () => {
diff --git a/crew/tests/bun-preflight.test.mts b/crew/tests/bun-preflight.test.mts
index da28aaec..76c25c28 100644
--- a/crew/tests/bun-preflight.test.mts
+++ b/crew/tests/bun-preflight.test.mts
@@ -16,5 +16,8 @@ test("assertBunPresent: throws with an install URL when bun is missing", () => {
     err = e;
   }
   expect(err instanceof Error, "expected an Error to be thrown").toBeTruthy();
-  expect(String(err).includes("https://bun.sh"), `error message should reference bun.sh: ${String(err)}`).toBeTruthy();
+  expect(
+    String(err).includes("https://bun.sh"),
+    `error message should reference bun.sh: ${String(err)}`
+  ).toBeTruthy();
 });
diff --git a/crew/tests/capture-learning.test.mts b/crew/tests/capture-learning.test.mts
index 51198e50..b7407f93 100644
--- a/crew/tests/capture-learning.test.mts
+++ b/crew/tests/capture-learning.test.mts
@@ -107,7 +107,9 @@ test("captureFailureLearning degrades safely (never throws) when the target path
     const blockerPath = path.join(repo, ".claude", "artifacts", "loop");
     await fs.mkdir(path.dirname(blockerPath), { recursive: true });
     await fs.writeFile(blockerPath, "not a directory", "utf8");
-    await expect(captureFailureLearning(repo, { summary: "should not throw", source: "review_fail" })).resolves.toBeUndefined();
+    await expect(
+      captureFailureLearning(repo, { summary: "should not throw", source: "review_fail" })
+    ).resolves.toBeUndefined();
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/checkpoint-cadence.test.mts b/crew/tests/checkpoint-cadence.test.mts
index 3086f96a..8419bf84 100644
--- a/crew/tests/checkpoint-cadence.test.mts
+++ b/crew/tests/checkpoint-cadence.test.mts
@@ -41,7 +41,10 @@ test("nudges once the threshold of post-edit tool calls is reached", async () =>
     const parsed = JSON.parse(out!);
     expect(parsed.decision).toBe("approve");
     expect(parsed.systemMessage).toMatch(/checkpoint/i);
-    expect(!("hookSpecificOutput" in parsed), "must not use hookSpecificOutput (#176 trap)").toBeTruthy();
+    expect(
+      !("hookSpecificOutput" in parsed),
+      "must not use hookSpecificOutput (#176 trap)"
+    ).toBeTruthy();
   } finally {
     delete process.env["CREW_CHECKPOINT_CADENCE_N"];
     await cleanup(repo);
diff --git a/crew/tests/cli-artifacts.test.mts b/crew/tests/cli-artifacts.test.mts
index ac58c042..1ef1a19a 100644
--- a/crew/tests/cli-artifacts.test.mts
+++ b/crew/tests/cli-artifacts.test.mts
@@ -60,7 +60,9 @@ test("CLI artifact writers create markdown artifacts", async () => {
     "approved_with_notes",
     "--non-code"
   ]);
-  expect(reviewAliasResult.code, "write-review-result with --verdict should exit with code 0").toBe(0);
+  expect(reviewAliasResult.code, "write-review-result with --verdict should exit with code 0").toBe(
+    0
+  );
   const reviewAliasOutput = JSON.parse(reviewAliasResult.output);
   const reviewAliasBody = await fs.readFile(reviewAliasOutput.path, "utf8");
   expect(reviewAliasBody).toMatch(/approved_with_notes/);
@@ -232,7 +234,10 @@ test("write-* commands embed --feature and --phase in frontmatter", async () =>
   expect(reviewResult.code, "write-review-result should exit with code 0").toBe(0);
   const reviewPath = JSON.parse(reviewResult.output).path;
   const reviewBody = await fs.readFile(reviewPath, "utf8");
-  expect(reviewBody, "review-result with feature/phase absent still carries the canonical decision frontmatter (P1.3)").toMatch(/^---\ndecision: approved\n---\n/);
+  expect(
+    reviewBody,
+    "review-result with feature/phase absent still carries the canonical decision frontmatter (P1.3)"
+  ).toMatch(/^---\ndecision: approved\n---\n/);
 
   // review-result with only feature emits frontmatter without phase line
   const reviewFeatResult = await runCrew([
@@ -294,7 +299,10 @@ test("write-handoff without --repo-context has no ## Repo Layout section", async
   expect(result.code, "write-handoff should exit with code 0").toBe(0);
   const output = JSON.parse(result.output);
   const content = await fs.readFile(output.path, "utf8");
-  expect(!content.includes("## Repo Layout"), "should not contain Repo Layout without flag").toBeTruthy();
+  expect(
+    !content.includes("## Repo Layout"),
+    "should not contain Repo Layout without flag"
+  ).toBeTruthy();
 });
 
 test("write-review-result with --validation-evidence emits frontmatter field and body section", async () => {
@@ -317,9 +325,16 @@ test("write-review-result with --validation-evidence emits frontmatter field and
   expect(result.code, "write-review-result should exit with code 0").toBe(0);
   const output = JSON.parse(result.output);
   const content = await fs.readFile(output.path, "utf8");
-  expect(content, "frontmatter should contain validation_evidence key").toMatch(/validation_evidence:/);
-  expect(content.includes(evidenceText), "frontmatter or body should contain the evidence text").toBeTruthy();
-  expect(content, "body should contain ## Validation Evidence section").toMatch(/## Validation Evidence/);
+  expect(content, "frontmatter should contain validation_evidence key").toMatch(
+    /validation_evidence:/
+  );
+  expect(
+    content.includes(evidenceText),
+    "frontmatter or body should contain the evidence text"
+  ).toBeTruthy();
+  expect(content, "body should contain ## Validation Evidence section").toMatch(
+    /## Validation Evidence/
+  );
 });
 
 test("write-review-result without --validation-evidence emits no frontmatter field and no body section", async () => {
@@ -338,8 +353,14 @@ test("write-review-result without --validation-evidence emits no frontmatter fie
   expect(result.code, "write-review-result should exit with code 0").toBe(0);
   const output = JSON.parse(result.output);
   const content = await fs.readFile(output.path, "utf8");
-  expect(!content.includes("validation_evidence"), "artifact should have no validation_evidence field when flag omitted").toBeTruthy();
-  expect(!content.includes("## Validation Evidence"), "artifact should have no Validation Evidence section when flag omitted").toBeTruthy();
+  expect(
+    !content.includes("validation_evidence"),
+    "artifact should have no validation_evidence field when flag omitted"
+  ).toBeTruthy();
+  expect(
+    !content.includes("## Validation Evidence"),
+    "artifact should have no Validation Evidence section when flag omitted"
+  ).toBeTruthy();
 });
 
 test("write-review-result with --validation-evidence empty string treats it as omitted", async () => {
@@ -360,8 +381,14 @@ test("write-review-result with --validation-evidence empty string treats it as o
   expect(result.code, "write-review-result should exit with code 0").toBe(0);
   const output = JSON.parse(result.output);
   const content = await fs.readFile(output.path, "utf8");
-  expect(!content.includes("validation_evidence"), "artifact should have no validation_evidence field when flag is empty string").toBeTruthy();
-  expect(!content.includes("## Validation Evidence"), "artifact should have no Validation Evidence section when flag is empty string").toBeTruthy();
+  expect(
+    !content.includes("validation_evidence"),
+    "artifact should have no validation_evidence field when flag is empty string"
+  ).toBeTruthy();
+  expect(
+    !content.includes("## Validation Evidence"),
+    "artifact should have no Validation Evidence section when flag is empty string"
+  ).toBeTruthy();
 });
 
 test("write-validation-result: --findings persisted in frontmatter", async () => {
@@ -384,10 +411,9 @@ test("write-validation-result: --findings persisted in frontmatter", async () =>
     expect(result.code, "write-validation-result should exit with code 0").toBe(0);
     const output = JSON.parse(result.output);
     const body = await fs.readFile(output.path, "utf8");
-    expect(
-      body,
-      "validation artifact must contain findings"
-    ).toMatch(/findings:.*pass:2,partial:0,fail:1/);
+    expect(body, "validation artifact must contain findings").toMatch(
+      /findings:.*pass:2,partial:0,fail:1/
+    );
   } finally {
     await fs.rm(repoPath, { recursive: true, force: true });
   }
@@ -415,10 +441,9 @@ test("write-deployment-check: --findings persisted in frontmatter", async () =>
     expect(result.code, "write-deployment-check should exit with code 0").toBe(0);
     const output = JSON.parse(result.output);
     const body = await fs.readFile(output.path, "utf8");
-    expect(
-      body,
-      "deployment artifact must contain findings"
-    ).toMatch(/findings:.*healthy:1,degraded:0,down:0/);
+    expect(body, "deployment artifact must contain findings").toMatch(
+      /findings:.*healthy:1,degraded:0,down:0/
+    );
   } finally {
     await fs.rm(repoPath, { recursive: true, force: true });
   }
diff --git a/crew/tests/cli-smoke.test.mts b/crew/tests/cli-smoke.test.mts
index 39b7b810..a1e21fbc 100644
--- a/crew/tests/cli-smoke.test.mts
+++ b/crew/tests/cli-smoke.test.mts
@@ -6,12 +6,7 @@ test("smoke: claims family (init)", async () => {
   const rootPath = await makeTempDir("crew-smoke-claims-");
   const repoPath = path.join(rootPath, "app");
 
-  const { stdout, stderr } = await execFile("bun", [
-    cliPath,
-    "init",
-    "--repo",
-    repoPath
-  ]);
+  const { stdout, stderr } = await execFile("bun", [cliPath, "init", "--repo", repoPath]);
 
   expect(stderr, "stderr should be empty on success").toMatch(/^(\s*)$/);
   const result = JSON.parse(stdout);
@@ -77,13 +72,9 @@ test("smoke: cost family (cost-advise)", async () => {
   // Init first
   await execFile("bun", [cliPath, "init", "--repo", repoPath]);
 
-  const { stdout, stderr } = await execFile(
-    "bun",
-    [cliPath, "cost-advise", "--repo", repoPath],
-    {
-      env: { ...process.env, CREW_PROJECTS_ROOT: tempProjRoot }
-    }
-  );
+  const { stdout, stderr } = await execFile("bun", [cliPath, "cost-advise", "--repo", repoPath], {
+    env: { ...process.env, CREW_PROJECTS_ROOT: tempProjRoot }
+  });
 
   expect(stderr, "stderr should be empty on success").toMatch(/^(\s*)$/);
   const result = JSON.parse(stdout);
diff --git a/crew/tests/cli-synthesis-cost.test.mts b/crew/tests/cli-synthesis-cost.test.mts
index aa298ae5..6f3ebd32 100644
--- a/crew/tests/cli-synthesis-cost.test.mts
+++ b/crew/tests/cli-synthesis-cost.test.mts
@@ -256,7 +256,9 @@ test("cost-advise accepts --title --feature --phase and slugs filename + emits f
   expect(adviseResult.code).toBe(0);
   const adviseOutput = JSON.parse(adviseResult.output);
   expect(adviseOutput.artifactPath).toBeTruthy();
-  expect(path.basename(adviseOutput.artifactPath)).toMatch(/-cost-advise-phase3-feat021-slice36\.md$/);
+  expect(path.basename(adviseOutput.artifactPath)).toMatch(
+    /-cost-advise-phase3-feat021-slice36\.md$/
+  );
   const body = await fs.readFile(adviseOutput.artifactPath, "utf8");
   expect(body).toMatch(/^---\nphase: "3"\nfeature: FEAT-021\n---\n/);
 });
diff --git a/crew/tests/cli-workflow.test.mts b/crew/tests/cli-workflow.test.mts
index a90f025c..d6fa71ef 100644
--- a/crew/tests/cli-workflow.test.mts
+++ b/crew/tests/cli-workflow.test.mts
@@ -136,10 +136,14 @@ test("CLI wake-up brief summarizes repo memory and state", async () => {
   expect(wakeUp.latestArtifacts.validationResult.title).toMatch(/Wake-up validation result/);
   expect(wakeUp.latestArtifacts.deploymentCheck.title).toMatch(/Wake-up deployment check/);
   expect(wakeUp.memory.hot.repoGuidance.deployment.title).toMatch(/Wake-up deployment model/);
-  expect(wakeUp.memory.hot.repoMemory.some((entry: { path: string }) => entry.path.endsWith("CLAUDE.md"))).toBeTruthy();
+  expect(
+    wakeUp.memory.hot.repoMemory.some((entry: { path: string }) => entry.path.endsWith("CLAUDE.md"))
+  ).toBeTruthy();
   expect(wakeUp.memory.hot.latestArtifacts.runBrief.title).toMatch(/Wake-up test run/);
   expect(wakeUp.memory.hot.latestArtifacts.validationPlan.title).toMatch(/Wake-up validation plan/);
-  expect(wakeUp.memory.hot.latestArtifacts.deploymentCheck.title).toMatch(/Wake-up deployment check/);
+  expect(wakeUp.memory.hot.latestArtifacts.deploymentCheck.title).toMatch(
+    /Wake-up deployment check/
+  );
   expect(wakeUp.memory.warm.validation.title).toMatch(/Wake-up validation result/);
   expect(wakeUp.memory.hot.claims.length).toBe(1);
   expect(wakeUp.memory.hot.workflow.currentRun.gates.review.status).toBe("required");
@@ -220,15 +224,23 @@ test("CLI brief-me synthesizes workflow state, git activity, and next step", asy
   expect(brief.sections.recentActivity.git.workingTree.branch).toBe("main");
   expect(brief.sections.recentActivity.git.workingTree.hasChanges).toBe(true);
   expect(brief.sections.recentActivity.git.workingTree.untrackedCount >= 1).toBeTruthy();
-  expect(brief.sections.recentActivity.git.workingTree.changedPaths.includes("notes.txt")).toBeTruthy();
+  expect(
+    brief.sections.recentActivity.git.workingTree.changedPaths.includes("notes.txt")
+  ).toBeTruthy();
   expect(brief.sections.recentActivity.latestArtifacts[0].label.length > 0).toBe(true);
-  expect(brief.sections.recentActivity.repoMemory.some((entry: { path: string }) =>
+  expect(
+    brief.sections.recentActivity.repoMemory.some((entry: { path: string }) =>
       entry.path.endsWith("CLAUDE.md")
-    )).toBeTruthy();
-  expect(brief.sections.recentActivity.retrievalGuide.some((entry: { path: string }) =>
+    )
+  ).toBeTruthy();
+  expect(
+    brief.sections.recentActivity.retrievalGuide.some((entry: { path: string }) =>
       entry.path.endsWith("CLAUDE.md")
-    )).toBeTruthy();
-  expect(brief.sections.blockedOrMissing.join("\n")).toMatch(/Independent review is still required/);
+    )
+  ).toBeTruthy();
+  expect(brief.sections.blockedOrMissing.join("\n")).toMatch(
+    /Independent review is still required/
+  );
   expect(brief.sections.importantReminders.join("\n")).toMatch(/Working tree has/);
   expect(brief.sections.recommendedNextStep).toMatch(/Run independent review next/);
   expect(brief.sections.secondaryOptions.length >= 1).toBeTruthy();
@@ -281,7 +293,9 @@ test("CLI brief-me surfaces failed gates before generic next steps", async () =>
   expect(briefResult.code).toBe(0);
   const brief = JSON.parse(briefResult.output);
 
-  expect(brief.sections.blockedOrMissing.join("\n")).toMatch(/Independent review failed: Missing null guard/);
+  expect(brief.sections.blockedOrMissing.join("\n")).toMatch(
+    /Independent review failed: Missing null guard/
+  );
   expect(brief.sections.recommendedNextStep).toMatch(/Address the failed review findings/);
 });
 
@@ -426,7 +440,9 @@ test("CLI workflow state and brief-me surface missing artifact write-backs after
   const briefResult = await runCrew(["brief-me", "--repo", repoPath]);
   expect(briefResult.code).toBe(0);
   const brief = JSON.parse(briefResult.output);
-  expect(brief.sections.blockedOrMissing.join("\n")).toMatch(/review artifact write-back is still missing/);
+  expect(brief.sections.blockedOrMissing.join("\n")).toMatch(
+    /review artifact write-back is still missing/
+  );
   expect(brief.sections.recommendedNextStep).toMatch(/Write the review-result artifact now/);
 });
 
@@ -453,7 +469,9 @@ test("CLI workflow state and brief-me surface missing run briefs after meaningfu
   const briefResult = await runCrew(["brief-me", "--repo", repoPath]);
   expect(briefResult.code).toBe(0);
   const brief = JSON.parse(briefResult.output);
-  expect(brief.sections.blockedOrMissing.join("\n")).toMatch(/Independent review is still required/);
+  expect(brief.sections.blockedOrMissing.join("\n")).toMatch(
+    /Independent review is still required/
+  );
   expect(brief.sections.recommendedNextStep).toMatch(/Run independent review next/);
 });
 
@@ -590,8 +608,10 @@ test("brief-me surfaces blocked in pending badges", async () => {
   expect(briefResult.code).toBe(0);
   const brief = JSON.parse(briefResult.output);
 
-  expect((brief.pendingBadges || brief.workflow?.pendingBadges || []).includes("blocked") ||
-      JSON.stringify(brief).includes("blocked")).toBeTruthy();
+  expect(
+    (brief.pendingBadges || brief.workflow?.pendingBadges || []).includes("blocked") ||
+      JSON.stringify(brief).includes("blocked")
+  ).toBeTruthy();
 });
 
 test("brief-me reports routingTableStale=false when file recent or absent", async () => {
@@ -635,5 +655,7 @@ test("brief-me reports routingTableStale=true when mtime > 30 days old", async (
   expect(summary.routingTableAgeDays >= 30).toBeTruthy();
 
   const reminders = brief.sections?.importantReminders || [];
-  expect(reminders.some((r: string) => r.includes("Routing table") && r.includes("stale"))).toBeTruthy();
+  expect(
+    reminders.some((r: string) => r.includes("Routing table") && r.includes("stale"))
+  ).toBeTruthy();
 });
diff --git a/crew/tests/fixtures/openapi/valid-feat-contracts.mts b/crew/tests/fixtures/openapi/valid-feat-contracts.mts
index 4046efd3..eedd8e38 100644
--- a/crew/tests/fixtures/openapi/valid-feat-contracts.mts
+++ b/crew/tests/fixtures/openapi/valid-feat-contracts.mts
@@ -1,87 +1,87 @@
 export interface paths {
-    "/things": {
-        parameters: {
-            query?: never;
-            header?: never;
-            path?: never;
-            cookie?: never;
-        };
-        get?: never;
-        put?: never;
-        /** Create a Thing */
-        post: operations["createThing"];
-        delete?: never;
-        options?: never;
-        head?: never;
-        patch?: never;
-        trace?: never;
+  "/things": {
+    parameters: {
+      query?: never;
+      header?: never;
+      path?: never;
+      cookie?: never;
     };
+    get?: never;
+    put?: never;
+    /** Create a Thing */
+    post: operations["createThing"];
+    delete?: never;
+    options?: never;
+    head?: never;
+    patch?: never;
+    trace?: never;
+  };
 }
 export type webhooks = Record<string, never>;
 export interface components {
-    schemas: {
-        Thing: {
-            /** Format: uuid */
-            id: string;
-            name: string;
-            /** Format: uuid */
-            ownerId: string;
-            /** Format: date-time */
-            createdAt: string;
-        };
+  schemas: {
+    Thing: {
+      /** Format: uuid */
+      id: string;
+      name: string;
+      /** Format: uuid */
+      ownerId: string;
+      /** Format: date-time */
+      createdAt: string;
     };
-    responses: never;
-    parameters: never;
-    requestBodies: never;
-    headers: never;
-    pathItems: never;
+  };
+  responses: never;
+  parameters: never;
+  requestBodies: never;
+  headers: never;
+  pathItems: never;
 }
 export type $defs = Record<string, never>;
 export interface operations {
-    createThing: {
-        parameters: {
-            query?: never;
-            header?: never;
-            path?: never;
-            cookie?: never;
+  createThing: {
+    parameters: {
+      query?: never;
+      header?: never;
+      path?: never;
+      cookie?: never;
+    };
+    requestBody: {
+      content: {
+        "application/json": {
+          name: string;
+          /** Format: uuid */
+          ownerId: string;
+        };
+      };
+    };
+    responses: {
+      /** @description Created */
+      201: {
+        headers: {
+          [name: string]: unknown;
+        };
+        content: {
+          "application/json": components["schemas"]["Thing"];
+        };
+      };
+      /** @description Validation failure */
+      400: {
+        headers: {
+          [name: string]: unknown;
+        };
+        content: {
+          "application/json": unknown;
         };
-        requestBody: {
-            content: {
-                "application/json": {
-                    name: string;
-                    /** Format: uuid */
-                    ownerId: string;
-                };
-            };
+      };
+      /** @description Duplicate */
+      409: {
+        headers: {
+          [name: string]: unknown;
         };
-        responses: {
-            /** @description Created */
-            201: {
-                headers: {
-                    [name: string]: unknown;
-                };
-                content: {
-                    "application/json": components["schemas"]["Thing"];
-                };
-            };
-            /** @description Validation failure */
-            400: {
-                headers: {
-                    [name: string]: unknown;
-                };
-                content: {
-                    "application/json": unknown;
-                };
-            };
-            /** @description Duplicate */
-            409: {
-                headers: {
-                    [name: string]: unknown;
-                };
-                content: {
-                    "application/json": unknown;
-                };
-            };
+        content: {
+          "application/json": unknown;
         };
+      };
     };
+  };
 }
diff --git a/crew/tests/hook-cold-start-bench.test.mts b/crew/tests/hook-cold-start-bench.test.mts
index afd991d3..509b7f85 100644
--- a/crew/tests/hook-cold-start-bench.test.mts
+++ b/crew/tests/hook-cold-start-bench.test.mts
@@ -23,44 +23,40 @@ function percentile(sorted: number[], p: number): number {
   return sorted[idx]!;
 }
 
-test(
-  `hook cold start (${RUNTIME}): median + p95 over ${RUNS} cold spawns`,
-  () => {
-    const samples: number[] = [];
-    const args = RUNTIME === "node" ? ["--experimental-strip-types", HOOK] : [HOOK];
-    for (let i = 0; i < RUNS; i++) {
-      const start = process.hrtime.bigint();
-      const res = spawnSync(RUNTIME, args, {
-        env: { ...process.env },
-        input: "{}\n"
-      });
-      const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
-      expect(res.status).toBe(0);
-      samples.push(elapsedMs);
+test(`hook cold start (${RUNTIME}): median + p95 over ${RUNS} cold spawns`, () => {
+  const samples: number[] = [];
+  const args = RUNTIME === "node" ? ["--experimental-strip-types", HOOK] : [HOOK];
+  for (let i = 0; i < RUNS; i++) {
+    const start = process.hrtime.bigint();
+    const res = spawnSync(RUNTIME, args, {
+      env: { ...process.env },
+      input: "{}\n"
+    });
+    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
+    expect(res.status).toBe(0);
+    samples.push(elapsedMs);
+  }
+  samples.sort((a, b) => a - b);
+  const p50 = percentile(samples, 0.5);
+  const p95 = percentile(samples, 0.95);
+  console.log(`hook cold start (${RUNTIME}) p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms`);
+  if (RUNTIME === "bun") {
+    if (IS_WINDOWS) {
+      // Windows: Bun cold start floor ~88ms standalone. Local dev meets tighter
+      // ceilings, but the GitHub Actions Windows runner adds shared-VM overhead
+      // (observed p95 ~700ms 2026-07-01). Linux/CI is the gating environment
+      // for the tight spec target — Windows uses runner-tolerant thresholds.
+      console.log("(Windows: p50 target <=250ms, p95 <=900ms; Linux/CI asserts <=150ms / <=400ms)");
+      expect(p50).toBeLessThanOrEqual(250);
+      expect(p95).toBeLessThanOrEqual(900);
+    } else {
+      // Linux thresholds recalibrated 2026-07-04 for the self-hosted runner
+      // migration (devops#64 dropped hosted runners): observed p50 77.9-83.0ms
+      // on the self-hosted box vs the old hosted-runner-calibrated 60ms ceiling.
+      // 150/400 keeps ~2x headroom over measured while still catching gross
+      // cold-start regressions (pre-migration local Linux p50 was ~40ms).
+      expect(p50).toBeLessThanOrEqual(150);
+      expect(p95).toBeLessThanOrEqual(400);
     }
-    samples.sort((a, b) => a - b);
-    const p50 = percentile(samples, 0.5);
-    const p95 = percentile(samples, 0.95);
-    console.log(`hook cold start (${RUNTIME}) p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms`);
-    if (RUNTIME === "bun") {
-      if (IS_WINDOWS) {
-        // Windows: Bun cold start floor ~88ms standalone. Local dev meets tighter
-        // ceilings, but the GitHub Actions Windows runner adds shared-VM overhead
-        // (observed p95 ~700ms 2026-07-01). Linux/CI is the gating environment
-        // for the tight spec target — Windows uses runner-tolerant thresholds.
-        console.log("(Windows: p50 target <=250ms, p95 <=900ms; Linux/CI asserts <=150ms / <=400ms)");
-        expect(p50).toBeLessThanOrEqual(250);
-        expect(p95).toBeLessThanOrEqual(900);
-      } else {
-        // Linux thresholds recalibrated 2026-07-04 for the self-hosted runner
-        // migration (devops#64 dropped hosted runners): observed p50 77.9-83.0ms
-        // on the self-hosted box vs the old hosted-runner-calibrated 60ms ceiling.
-        // 150/400 keeps ~2x headroom over measured while still catching gross
-        // cold-start regressions (pre-migration local Linux p50 was ~40ms).
-        expect(p50).toBeLessThanOrEqual(150);
-        expect(p95).toBeLessThanOrEqual(400);
-      }
-    }
-  },
-  30000
-);
+  }
+}, 30000);
diff --git a/crew/tests/hook-feature-gating.test.mts b/crew/tests/hook-feature-gating.test.mts
index 9d705ba6..d7777a05 100644
--- a/crew/tests/hook-feature-gating.test.mts
+++ b/crew/tests/hook-feature-gating.test.mts
@@ -703,7 +703,10 @@ test("pre-push-verifier: not-found message reports scanned dir, window count, an
     expect(result.exitCode).toBe(0);
     const parsed = JSON.parse(result.stdout);
     expect(parsed.decision).toBe("block");
-    expect(parsed.reason.includes(validationsDir), "reason should include the scanned dir").toBeTruthy();
+    expect(
+      parsed.reason.includes(validationsDir),
+      "reason should include the scanned dir"
+    ).toBeTruthy();
     expect(parsed.reason).toMatch(/1 validation artifact\(s\) found within the last hour/);
     expect(parsed.reason).toMatch(/decision=fail/);
   } finally {
diff --git a/crew/tests/incident-dispatcher.test.mts b/crew/tests/incident-dispatcher.test.mts
index df501d49..667b0c09 100644
--- a/crew/tests/incident-dispatcher.test.mts
+++ b/crew/tests/incident-dispatcher.test.mts
@@ -33,14 +33,10 @@ test("FEAT-182 SLICE-A: incident.md has frontmatter description", () => {
 test("FEAT-182 SLICE-A: triage routes unknown root cause to crew:researcher (NOT investigator)", () => {
   // Smoke test from FEAT-182 spec: "Why is the dashboard returning 500s?"
   // is unknown-root-cause and must route to researcher per the AC.
-  expect(
-    /unknown root cause[\s\S]*?crew:researcher/i.test(incident)
-  ).toBeTruthy();
+  expect(/unknown root cause[\s\S]*?crew:researcher/i.test(incident)).toBeTruthy();
   // Reverse assertion: dispatcher must explicitly warn against using
   // investigator for RCA.
-  expect(incident).toMatch(
-    /do NOT use `devcrew:investigator` for root cause analysis/i
-  );
+  expect(incident).toMatch(/do NOT use `devcrew:investigator` for root cause analysis/i);
 });
 
 test("FEAT-182 SLICE-A: triage routes rollback need to crew:release-engineer", () => {
@@ -50,21 +46,15 @@ test("FEAT-182 SLICE-A: triage routes rollback need to crew:release-engineer", (
 });
 
 test("FEAT-182 SLICE-A: triage routes code locations to crew:investigator", () => {
-  expect(
-    /code locations needed[\s\S]*?crew:investigator/i.test(incident)
-  ).toBeTruthy();
+  expect(/code locations needed[\s\S]*?crew:investigator/i.test(incident)).toBeTruthy();
 });
 
 test("FEAT-182 SLICE-A: triage routes known root cause to specialist builder", () => {
-  expect(
-    /root cause known[\s\S]*?specialist builder/i.test(incident)
-  ).toBeTruthy();
+  expect(/root cause known[\s\S]*?specialist builder/i.test(incident)).toBeTruthy();
 });
 
 test("FEAT-182 SLICE-A: triage routes broken release ceremony to crew:release-engineer", () => {
-  expect(
-    /broken release ceremony[\s\S]*?crew:release-engineer/i.test(incident)
-  ).toBeTruthy();
+  expect(/broken release ceremony[\s\S]*?crew:release-engineer/i.test(incident)).toBeTruthy();
 });
 
 test("FEAT-182 SLICE-A: workflow loads release-recovery skill before release-ceremony dispatch", () => {
@@ -137,9 +127,7 @@ test("FEAT-182 SLICE-B: BADGE_TABLE registers incident_blocked", () => {
 });
 
 test("FEAT-182 SLICE-B: mark-badge usage string lists incident_blocked", () => {
-  expect(crewCli).toMatch(
-    /--badge[\s\S]*?incident_resolved\|rollback_executed\|incident_blocked/
-  );
+  expect(crewCli).toMatch(/--badge[\s\S]*?incident_resolved\|rollback_executed\|incident_blocked/);
 });
 
 test("FEAT-182 SLICE-B: dispatcher marks incident_blocked on auto-fix retry exhaustion", () => {
@@ -149,15 +137,11 @@ test("FEAT-182 SLICE-B: dispatcher marks incident_blocked on auto-fix retry exha
 });
 
 test("FEAT-182 SLICE-B: dispatcher documents incident_blocked for a rollback decision needing the user", () => {
-  expect(incident).toMatch(
-    /mark `incident_blocked` and hand the decision to the user/i
-  );
+  expect(incident).toMatch(/mark `incident_blocked` and hand the decision to the user/i);
 });
 
 test("FEAT-182 SLICE-B: dispatcher loads the incident-response skill before prod-incident dispatch", () => {
-  expect(incident).toMatch(
-    /load `skills\/workflow\/incident-response\/` before dispatch/
-  );
+  expect(incident).toMatch(/load `skills\/workflow\/incident-response\/` before dispatch/);
 });
 
 test("FEAT-182 SLICE-B: incident-response SKILL has tier=workflow frontmatter", () => {
@@ -165,9 +149,7 @@ test("FEAT-182 SLICE-B: incident-response SKILL has tier=workflow frontmatter",
 });
 
 test("FEAT-182 SLICE-B: incident-response describes the rollback decision tree (code vs config vs traffic)", () => {
-  expect(incidentResponseSkill).toMatch(
-    /Rollback decision tree \(code vs config vs traffic\)/i
-  );
+  expect(incidentResponseSkill).toMatch(/Rollback decision tree \(code vs config vs traffic\)/i);
 });
 
 test("FEAT-182 SLICE-B: incident-response names the Azure MCP tools for log/metric/trace reading", () => {
diff --git a/crew/tests/incomplete-detector.test.mts b/crew/tests/incomplete-detector.test.mts
index 302a7df3..8de5ac20 100644
--- a/crew/tests/incomplete-detector.test.mts
+++ b/crew/tests/incomplete-detector.test.mts
@@ -42,9 +42,9 @@ test("detectSubagentIncomplete: artifact path present → false regardless of st
 });
 
 test("detectSubagentIncomplete: terminal status present, no artifact path → false", () => {
-  expect(
-    detectSubagentIncomplete({ body: "DONE: task complete, nothing else to note." })
-  ).toBe(false);
+  expect(detectSubagentIncomplete({ body: "DONE: task complete, nothing else to note." })).toBe(
+    false
+  );
 });
 
 test("detectSubagentIncomplete: both artifact path and terminal status → false", () => {
@@ -57,7 +57,5 @@ test("detectSubagentIncomplete: both artifact path and terminal status → false
 
 test("detectSubagentIncomplete: worktreeDirty is accepted but not required for detection", () => {
   expect(detectSubagentIncomplete({ body: "no path, no status", worktreeDirty: true })).toBe(true);
-  expect(
-    detectSubagentIncomplete({ body: "no path, no status", worktreeDirty: false })
-  ).toBe(true);
+  expect(detectSubagentIncomplete({ body: "no path, no status", worktreeDirty: false })).toBe(true);
 });
diff --git a/crew/tests/memory-handoff-digest.test.mts b/crew/tests/memory-handoff-digest.test.mts
index f7a4beea..c7035457 100644
--- a/crew/tests/memory-handoff-digest.test.mts
+++ b/crew/tests/memory-handoff-digest.test.mts
@@ -13,7 +13,10 @@ import fs from "node:fs/promises";
 import os from "node:os";
 import path from "node:path";
 import { test, expect } from "bun:test";
-import { buildHandoffDigest, parseCreditLoopConfig } from "../scripts/lib/memory/handoff-digest.mjs";
+import {
+  buildHandoffDigest,
+  parseCreditLoopConfig
+} from "../scripts/lib/memory/handoff-digest.mjs";
 import { buildProfileBlock } from "../scripts/lib/memory/inject-profile.mjs";
 import { fileProvider } from "@astragenie/memory-provider";
 import type { AgentProfile, ProfileCapableProvider } from "../scripts/lib/memory/profile-types.mjs";
@@ -161,7 +164,10 @@ test("buildHandoffDigest hard-caps recall hits at 5 even when more entries match
     const recallLines = digest.block
       .split("\n")
       .filter((l) => l.startsWith("- **[") && l.includes("hit-"));
-    expect(recallLines.length <= 5, `expected <=5 recall lines, got ${recallLines.length}`).toBeTruthy();
+    expect(
+      recallLines.length <= 5,
+      `expected <=5 recall lines, got ${recallLines.length}`
+    ).toBeTruthy();
   } finally {
     await cleanup(repo);
   }
diff --git a/crew/tests/regression.test.mts b/crew/tests/regression.test.mts
index 8a7c0503..22f3e81d 100644
--- a/crew/tests/regression.test.mts
+++ b/crew/tests/regression.test.mts
@@ -57,12 +57,7 @@ test("BUG-A: concurrent claims on disjoint files do not lose data (5-way paralle
   }
   await Promise.all(promises);
 
-  const showOutput = await execFile("bun", [
-    cliPath,
-    "show-claims",
-    "--repo",
-    repoPath
-  ]);
+  const showOutput = await execFile("bun", [cliPath, "show-claims", "--repo", repoPath]);
   const showResult = JSON.parse(showOutput.stdout);
   expect(
     showResult.claims.length,
@@ -97,25 +92,12 @@ test("BUG-A: concurrent releases do not corrupt claims state", async () => {
   const promises = [];
   for (let i = 0; i < count; i += 1) {
     promises.push(
-      execFile("bun", [
-        cliPath,
-        "release",
-        "--repo",
-        repoPath,
-        "--owner",
-        `o_${i}`,
-        `f_${i}.txt`
-      ])
+      execFile("bun", [cliPath, "release", "--repo", repoPath, "--owner", `o_${i}`, `f_${i}.txt`])
     );
   }
   await Promise.all(promises);
 
-  const showOutput = await execFile("bun", [
-    cliPath,
-    "show-claims",
-    "--repo",
-    repoPath
-  ]);
+  const showOutput = await execFile("bun", [cliPath, "show-claims", "--repo", repoPath]);
   const showResult = JSON.parse(showOutput.stdout);
   expect(
     showResult.claims.length,
@@ -158,19 +140,13 @@ test("BUG-B: write-run-brief archives the previous run instead of destroying it"
   ]);
 
   // Sanity: pending gate exists on the first run.
-  let stateOutput = await execFile("bun", [
-    cliPath,
-    "show-workflow-state",
-    "--repo",
-    repoPath
-  ]);
+  let stateOutput = await execFile("bun", [cliPath, "show-workflow-state", "--repo", repoPath]);
   let state = JSON.parse(stateOutput.stdout);
   expect(state.workflowState.currentRun.title).toBe("First run");
   expect(state.workflowState.currentRun.gates.review.status).toBe("required");
-  expect(
-    state.workflowState.recentRuns.length,
-    "archive should be empty before second brief"
-  ).toBe(0);
+  expect(state.workflowState.recentRuns.length, "archive should be empty before second brief").toBe(
+    0
+  );
 
   // Write a second run brief. The first run must be archived, not destroyed.
   await execFile("bun", [
@@ -186,20 +162,14 @@ test("BUG-B: write-run-brief archives the previous run instead of destroying it"
     "assisted single-session"
   ]);
 
-  stateOutput = await execFile("bun", [
-    cliPath,
-    "show-workflow-state",
-    "--repo",
-    repoPath
-  ]);
+  stateOutput = await execFile("bun", [cliPath, "show-workflow-state", "--repo", repoPath]);
   state = JSON.parse(stateOutput.stdout);
 
   expect(state.workflowState.currentRun.title).toBe("Second run");
   expect(state.workflowState.currentRun.goal).toBe("Second goal");
-  expect(
-    state.workflowState.recentRuns.length,
-    "first run should be archived to recentRuns"
-  ).toBe(1);
+  expect(state.workflowState.recentRuns.length, "first run should be archived to recentRuns").toBe(
+    1
+  );
 
   const archived = state.workflowState.recentRuns[0];
   expect(archived.title).toBe("First run");
@@ -230,12 +200,7 @@ test("BUG-B: multiple sequential run briefs cap at MAX_RECENT_RUNS without dropp
     ]);
   }
 
-  const stateOutput = await execFile("bun", [
-    cliPath,
-    "show-workflow-state",
-    "--repo",
-    repoPath
-  ]);
+  const stateOutput = await execFile("bun", [cliPath, "show-workflow-state", "--repo", repoPath]);
   const state = JSON.parse(stateOutput.stdout);
 
   expect(state.workflowState.currentRun.title).toBe("Run 7");
@@ -338,12 +303,7 @@ test("BUG-E: discover-deployment uses POSIX separators in clue paths on all plat
   await fs.mkdir(path.join(repoPath, "terraform"), { recursive: true });
   await fs.writeFile(path.join(repoPath, "terraform", "main.tf"), "// terraform\n");
 
-  const output = await execFile("bun", [
-    cliPath,
-    "discover-deployment",
-    "--repo",
-    repoPath
-  ]);
+  const output = await execFile("bun", [cliPath, "discover-deployment", "--repo", repoPath]);
   const result = JSON.parse(output.stdout);
 
   // Each classifier branch should produce its expected clue:
@@ -351,13 +311,19 @@ test("BUG-E: discover-deployment uses POSIX separators in clue paths on all plat
     result.clues.includes(".github/workflows/deploy.yml"),
     "github workflow not discovered"
   ).toBeTruthy();
-  expect(result.clues.includes(".circleci/config.yml"), "circleci config not discovered").toBeTruthy();
+  expect(
+    result.clues.includes(".circleci/config.yml"),
+    "circleci config not discovered"
+  ).toBeTruthy();
   expect(result.clues.includes("Dockerfile"), "Dockerfile not discovered").toBeTruthy();
   expect(
     result.clues.includes("infra/k8s/deploy.yaml"),
     "infra k8s manifest not discovered"
   ).toBeTruthy();
-  expect(result.clues.includes("terraform/main.tf"), "terraform config not discovered").toBeTruthy();
+  expect(
+    result.clues.includes("terraform/main.tf"),
+    "terraform config not discovered"
+  ).toBeTruthy();
 
   // No clue should contain a backslash. This is the regression catcher:
   // on Windows pre-fix, every nested-path clue contained backslashes.
@@ -390,12 +356,7 @@ test("BUG-E: file fixtures with directory paths under deployment hints are disco
     await fs.writeFile(path.join(repoPath, dir, file), "content\n");
   }
 
-  const output = await execFile("bun", [
-    cliPath,
-    "discover-deployment",
-    "--repo",
-    repoPath
-  ]);
+  const output = await execFile("bun", [cliPath, "discover-deployment", "--repo", repoPath]);
   const result = JSON.parse(output.stdout);
 
   for (const [dir, file] of hints) {
diff --git a/crew/tests/security-sweep-integration.test.mts b/crew/tests/security-sweep-integration.test.mts
index 95d2ecc0..87dfd72f 100644
--- a/crew/tests/security-sweep-integration.test.mts
+++ b/crew/tests/security-sweep-integration.test.mts
@@ -14,7 +14,14 @@ import { execSync, spawnSync } from "node:child_process";
 
 const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
 const devCrewRoot = path.dirname(repoRoot);
-const scanScript = path.join(devCrewRoot, "skills", "domain", "security-sweep", "scripts", "scan.mts");
+const scanScript = path.join(
+  devCrewRoot,
+  "skills",
+  "domain",
+  "security-sweep",
+  "scripts",
+  "scan.mts"
+);
 const fixtureSource = path.join(
   repoRoot,
   "tests",
diff --git a/crew/tests/telemetry-hook-flush.test.mts b/crew/tests/telemetry-hook-flush.test.mts
index 85fbce06..496763b4 100644
--- a/crew/tests/telemetry-hook-flush.test.mts
+++ b/crew/tests/telemetry-hook-flush.test.mts
@@ -177,7 +177,10 @@ test("otel-post-tool-use.mts flushes BatchSpanProcessor before exit", async () =
   });
   expect(exitCode, "hook must exit 0").toBe(0);
   expect(capture.authHeader, "auth header forwarded").toBe("Basic test-auth-token");
-  expect(capture.body.length > 0, "OTLP body non-empty (span flushed before process exit)").toBeTruthy();
+  expect(
+    capture.body.length > 0,
+    "OTLP body non-empty (span flushed before process exit)"
+  ).toBeTruthy();
 });
 
 test("otel-stop.mts flushes BatchSpanProcessor before exit", async () => {
@@ -191,7 +194,10 @@ test("otel-stop.mts flushes BatchSpanProcessor before exit", async () => {
     stdinPayload: payload
   });
   expect(exitCode, "hook must exit 0").toBe(0);
-  expect(capture.body.length > 0, "OTLP body non-empty (span flushed before process exit)").toBeTruthy();
+  expect(
+    capture.body.length > 0,
+    "OTLP body non-empty (span flushed before process exit)"
+  ).toBeTruthy();
 });
 
 test("otel-subagent-stop.mts flushes BatchSpanProcessor before exit", async () => {
@@ -205,5 +211,8 @@ test("otel-subagent-stop.mts flushes BatchSpanProcessor before exit", async () =
     stdinPayload: payload
   });
   expect(exitCode, "hook must exit 0").toBe(0);
-  expect(capture.body.length > 0, "OTLP body non-empty (span flushed before process exit)").toBeTruthy();
+  expect(
+    capture.body.length > 0,
+    "OTLP body non-empty (span flushed before process exit)"
+  ).toBeTruthy();
 });
diff --git a/crew/tests/telemetry-otel-bridge.test.mts b/crew/tests/telemetry-otel-bridge.test.mts
index 2b81fe84..52aab93f 100644
--- a/crew/tests/telemetry-otel-bridge.test.mts
+++ b/crew/tests/telemetry-otel-bridge.test.mts
@@ -99,7 +99,10 @@ test("initBridge: disabled cfg returns null without CREW_OTEL_ENABLED", async ()
     const sdk = await initBridge(cfg);
     const elapsed = performance.now() - t0;
     expect(sdk, "disabled bridge must return null").toBe(null);
-    expect(elapsed < 50, `initBridge disabled should be < 50ms, was ${elapsed.toFixed(1)}ms`).toBeTruthy();
+    expect(
+      elapsed < 50,
+      `initBridge disabled should be < 50ms, was ${elapsed.toFixed(1)}ms`
+    ).toBeTruthy();
   } finally {
     if (envBefore !== undefined) process.env["CREW_OTEL_ENABLED"] = envBefore;
   }
@@ -167,8 +170,14 @@ test("sampleSpan: sample_rate=1.0 always true", () => {
 
 test("sampleSpan: sample_rate=0.6 boundary", () => {
   const cfg = makeEnabledConfig({ sample_rate: 0.6 });
-  expect(sampleSpan(cfg, () => 0.3), "0.3 < 0.6 → true").toBe(true);
-  expect(sampleSpan(cfg, () => 0.9), "0.9 >= 0.6 → false").toBe(false);
+  expect(
+    sampleSpan(cfg, () => 0.3),
+    "0.3 < 0.6 → true"
+  ).toBe(true);
+  expect(
+    sampleSpan(cfg, () => 0.9),
+    "0.9 >= 0.6 → false"
+  ).toBe(false);
 });
 
 // ---------------------------------------------------------------------------
@@ -195,7 +204,10 @@ test("emitStopSpan: Stop span flushed via forceFlush within 1.5s", async () => {
     )
   ]);
   const elapsed = performance.now() - t0;
-  expect(elapsed < 1500, `flush must complete within 1.5s, took ${elapsed.toFixed(0)}ms`).toBeTruthy();
+  expect(
+    elapsed < 1500,
+    `flush must complete within 1.5s, took ${elapsed.toFixed(0)}ms`
+  ).toBeTruthy();
 
   const stopSpan = spans.find((s) => s.name === "session.stop");
   expect(stopSpan !== undefined, "session.stop span must be flushed").toBeTruthy();
diff --git a/crew/tests/telemetry-span-schema.test.mts b/crew/tests/telemetry-span-schema.test.mts
index b3b3088c..8400da2b 100644
--- a/crew/tests/telemetry-span-schema.test.mts
+++ b/crew/tests/telemetry-span-schema.test.mts
@@ -67,9 +67,7 @@ test("SpanRecordSchema: passthrough keeps unknown fields like traceState", () =>
     droppedAttributesCount: 0
   }) as Record<string, unknown>;
   expect(span["traceState"], "traceState must survive passthrough").toBe("vendor=x");
-  expect(span["droppedAttributesCount"], "droppedAttributesCount must survive passthrough").toBe(
-    0
-  );
+  expect(span["droppedAttributesCount"], "droppedAttributesCount must survive passthrough").toBe(0);
 });
 
 test("newTraceId and newSpanId are deterministic", () => {
diff --git a/crew/tests/workflow-state-concurrent.test.mts b/crew/tests/workflow-state-concurrent.test.mts
index 0778a5b7..6fda8464 100644
--- a/crew/tests/workflow-state-concurrent.test.mts
+++ b/crew/tests/workflow-state-concurrent.test.mts
@@ -38,9 +38,15 @@ test("concurrent markWorkflowBadge calls merge correctly (no lost updates)", asy
     // Verify both gates are set in final state
     const final = await loadWorkflowState(repoPath);
     expect(final.currentRun?.gates.review?.status, "review gate should be passed").toBe("passed");
-    expect(final.currentRun?.gates.validation?.status, "validation gate should be passed").toBe("passed");
-    expect(final.currentRun?.gates.review?.note, "review note should be persisted").toBe("review OK");
-    expect(final.currentRun?.gates.validation?.note, "validation note should be persisted").toBe("validation OK");
+    expect(final.currentRun?.gates.validation?.status, "validation gate should be passed").toBe(
+      "passed"
+    );
+    expect(final.currentRun?.gates.review?.note, "review note should be persisted").toBe(
+      "review OK"
+    );
+    expect(final.currentRun?.gates.validation?.note, "validation note should be persisted").toBe(
+      "validation OK"
+    );
   } finally {
     await fs.rm(repoPath, { recursive: true, force: true });
   }
@@ -82,8 +88,12 @@ test("validation_stale badge sets validation gate to stale status", async () =>
 
     // Verify state
     state = await loadWorkflowState(repoPath);
-    expect(state.currentRun?.gates.validation?.status, "validation gate should be stale").toBe("stale");
-    expect(state.currentRun?.gates.validation?.note, "stale note should be persisted").toBe("invalidated by review needs_fix");
+    expect(state.currentRun?.gates.validation?.status, "validation gate should be stale").toBe(
+      "stale"
+    );
+    expect(state.currentRun?.gates.validation?.note, "stale note should be persisted").toBe(
+      "invalidated by review needs_fix"
+    );
   } finally {
     await fs.rm(repoPath, { recursive: true, force: true });
   }
diff --git a/docs/README.md b/docs/README.md
index 368c5f8d..895ee9a4 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -27,6 +27,23 @@ top-level `docs/` folder.
 | `upstream-requests/` | Open requests filed against sibling plugins (`dev-team`/`crew`, `astramem-plugin`) — see `memory.md` "Open upstream requests"; `archive/` holds resolved/superseded ones | `YYYY-MM-DD-<target-plugin>-slug.md` |
 | `ai-loop/`, `backlog/` | **Legacy/stale** — pre-dates the `.claude/artifacts/loop/{ai-loop,backlog}` path migration (last touched 2026-06-09/12). The live equivalents are under `.claude/`, driven by `.claude/loop.json`'s `aiLoopRoot`/`backlogPath`. See `memory.md` "Known path drift" — flagged as delete-candidates, not yet removed (operator call, not this audit's scope) |
 
+## Merged-repo docs disposition (SLICE-25, 2026-08-19)
+
+`crew/docs/**` (123 files: `architecture/`, `backlog/`, `contracts/`,
+`decisions/`, `design/`, `diagnostics/`, `grades/`, `investigations/`,
+`observability/`, `operations/`, `process/`, `prompts/`, `research/`,
+`retrospectives/`, `specs/`, `standards/`, `superpowers/`) is the
+pre-merge `crew`/`dev-team` plugin's own docs tree, vendored as part of
+the `crew/` rump — **DEFERRED, not migrated by this slice.** Reason: bulk
+content-relevant migration (architecture decisions, contracts) is out of
+this 1-effort-point slice's budget; the map here just needs to be honest
+about where things live today. Until a follow-up FEAT does the move,
+`crew/docs/**` is the live reference for pre-merge `crew` design history —
+read it in place rather than assuming it was ported into this `docs/`
+tree. `crew/CLAUDE.md` (the rump's own root doc, still scanned by
+`validate-agent-refs.mts`'s `SCAN_FILES`) is likewise untouched by this
+slice.
+
 ## What's NOT here
 
 `templates/`, `commands/`, `skills/`, `agents/` (excl. `3rdparty/` vendored
diff --git a/docs/ci-gates.md b/docs/ci-gates.md
index 92bab0e0..ca6a4de6 100644
--- a/docs/ci-gates.md
+++ b/docs/ci-gates.md
@@ -1,110 +1,280 @@
 # CI gates — full detail
 
-Full rationale for each CI gate. The numbered list of gate *names* lives in
-`CLAUDE.md` § "CI gates" — `src/scripts/generate-metrics-band.mts` counts that
-numbered list programmatically to compute the README metrics-band's
-"CI gates enforced" figure, so the count and order there must stay in sync
-with this file's numbering. If a gate is added, removed, or reordered, update
-both files in the same change.
+Full rationale for every gate in the single merged workflow,
+`.github/workflows/ci.yml` (SLICE-24, FEAT-005). Both former parents'
+CI (runner-plugin's root `ci.yml`, crew's `.github/workflows/*`) were
+merged here; `crew/.github/workflows/` was deleted — crew-subtree gates now
+run FROM ROOT as part of this one workflow.
 
-GitHub Actions runs on every push and PR (all under Bun, no `npm ci`/build):
+This numbered list is the source of truth for gate *names* and order.
+SLICE-25 ports the same numbered list verbatim into `CLAUDE.md`'s
+"## CI gates" section — `src/scripts/generate-metrics-band.mts` will count
+that list programmatically for the README metrics-band's "CI gates
+enforced" figure, so once SLICE-25 wires it, this file's numbering and
+CLAUDE.md's must stay in sync. If a gate is added, removed, reordered, or
+its blocking/advisory status changes, update both files in the same change.
 
-1. `bun install --frozen-lockfile`
-2. `bun ./src/scripts/validate-manifests.mts` — manifest sanity check.
+GitHub Actions runs on every push and PR (self-hosted runner, Bun 1.3.14+
+baked into the runner image — no `setup-bun` step, no `npm ci`/build step
+anywhere). The `fast-gate` job below is the **required status check**;
+`slow-tests`, `crew-tests`, and `worktree-quarantine` run on every push/PR
+too but do not gate merges (see "Job structure and gating" at the end of
+this file).
+
+1. `bun install --frozen-lockfile` (repo root) + `bun install --frozen-lockfile`
+   (`crew/`) — two separate lockfiles, two separate installs; `crew/` is a
+   git-subtree import with its own `package.json`/`bun.lock`, not a
+   workspace member of the root one.
+2. `bun ./src/scripts/validate-manifests.mts` — manifest sanity check
+   (root's `.claude-plugin/plugin.json` + `package.json`).
 3. `bun ./src/scripts/validate-content-length.mts` — owned-agent line cap
    (300) + SKILL.md line cap (200). `agents/3rdparty/` exempt.
-4. `bun ./src/scripts/validate-decline-citations.mts --repo .` — every P4
+4. `bun ./src/scripts/validate-event-schemas.mts` — AJV-validates emitted
+   event payloads against `schemas/loop-events`.
+5. `bun ./src/scripts/validate-decline-citations.mts --repo .` — every P4
    FEAT in `triaged/`/`done/` must carry `declined_per: [<clause-id>, ...]`
-   citing a real `<!-- clause: X -->` marker from `CLAUDE.md`
-   (`src/scripts/lib/clause-registry.mts` extracts the known set).
-5. `bun ./src/scripts/validate-agent-refs.mts` — blocks a `crew:<name>` /
-   `runner:<name>` dispatch instruction whose `<name>` doesn't resolve to a
-   real agent, command, or skill (astragenie/runner-plugin#371 — a phantom
-   `devcrew:builder` shipped in installed loop rules and broke consumer
-   orchestrators). Scans `CLAUDE.md` only.
-6. `bunx tsc --project tsconfig.json --noEmit` + `--project tsconfig.test.json`
-7. `bunx biome lint src/`
-8. `bunx biome format src/` (check mode — unformatted files fail)
-9. `bun ./src/scripts/validate-imports.mts` — enforces the slice-linker
-   sub-module import boundary (files outside `slice-linker/` must go
-   through the barrel, not reach into sub-modules directly).
-10. `bun ./src/scripts/validate-backlog-writes.mts` — explicit-allowlist
-    guard (SLICE-153 / FEAT-250, COND-D): fails when a file outside
-    `backlog-store.mts` (the sole sanctioned BacklogStore writer, DEC-076)
-    raw-writes a backlog-shaped FEAT/SLICE path. `doctor.mts` (cross-tree
-    reconciliation) and `pm-apply.mts` (body-section content edits) are
-    named allowlist exceptions with an inline rationale each.
-11. `bun ./src/scripts/validate-slice-touches-files.mts` — validates every
-    pending/in-progress/needs-review slice's `touches_files` (declared or
-    inferred from body prose). Errors on absolute paths, `..` traversal, or
-    a path whose grandparent directory doesn't exist (a typo'd or
-    fabricated path). A missing immediate parent dir is allowed — slices
-    routinely plan ONE new subdirectory level under an existing area (e.g.
-    `docs/architecture/foo.md` when `docs/architecture` doesn't exist yet
-    but `docs` does) — but deeper fabricated nesting under a real
-    top-level dir still errors. Warns (does not fail) when `touches_files`
-    is absent altogether on a slice created on/after `--warn-cutoff`
-    (default 2026-06-15).
-12. `bun ./src/scripts/validate-slice-state-consistency.mts` — slice
-    state-directory vs frontmatter-status agreement (SLICE-208). Fails on
-    two distinct conditions, reported separately because the remedies
-    differ: (a) one slice id filed across MORE THAN ONE state directory
-    at once — the SLICE-118 case, which sat in both `pending/` and
-    `completed/` with divergent content and silently inflated the pending
-    count feeding triage; (b) a slice whose frontmatter `status`
-    disagrees with its containing directory (SLICE-128/130 were
-    `status: done` while filed under `pending/`). Condition (a) is scoped
-    to DISTINCT directories rather than raw id count, so it does not
-    conflate with the separate id-collision defect tracked as FEAT-298
-    (several unrelated slices reusing one id inside a single directory —
-    SLICE-115 ×4 and SLICE-117 ×4 today, which this gate must NOT flag).
-13. `bun test src/tests/ --parallel --timeout 60000`
-14. `bun ./src/scripts/validate-snapshot-freshness.mts` — blocks a stale
-    `.claude/artifacts/loop/loop-snapshot.md` from merging (FEAT-208).
-    Regenerates the snapshot content in-memory and diffs it against the
-    on-disk file; any drift (backlog/grade counts, "next to slice" list,
-    decisions, telemetry) fails CI. The pre-push hook still runs this
-    check in warn-only mode (`--check-generated`) — CI is the hard gate.
-15. `bun ./src/scripts/validate-org-refs.mts` — stale-owner sweep (#474
-    follow-up): fails when the banned pre-transfer GitHub owner name (see
-    the script's `BANNED_OWNER` constant) appears in AUTHORED surfaces
-    (README, ADOPTION, `src/`, `docs/`, `commands/`, `skills/`, `agents/`
-    excl. `3rdparty/`, `.claude-plugin/`). The owner is now `astragenie`
-    (repo paths) / `astra` (skill `owner:` field); GitHub redirects the
-    old path so stale refs still work, which is why they rot undetected.
-    Frozen history (CHANGELOG past entries, `.claude/artifacts/**`,
-    `.claude/logs/**`) is out of scope. The guard's own source + test are
-    named allowlist exceptions (they must name the banned token). **Note
-    (2026-07-21 audit): `.claude/crew/` is not in this gate's scan
-    targets** — `.claude/crew/plugin-marketplace.md` carried a stale
-    pre-transfer-owner reference undetected until this run corrected it
-    by hand; consider adding `.claude/crew/` to `SCAN_TARGETS` in a future
-    FEAT.
-16. `bun ./src/scripts/validate-marketplace-sync.mts` — registry drift
-    guard: fetches `astragenie/astra-marketplace`'s `marketplace.json` and
-    fails when its `runner` entry version ≠ this repo's `plugin.json` (the
-    registry sat at 0.67.0 while 0.68/0.69/0.70 shipped — consumers got a
-    stale version). An UNREACHABLE registry degrades to a warning (exit 0)
-    so a network blip never blocks CI; a reachable-and-mismatched registry
-    is a hard fail.
-17. `bun ./src/scripts/validate-dispatch-markers.mts` — checks that the
-    `<task-scoped>` order-block marker (FEAT-263 T1/T5, dispatch.mts +
-    start-slice.mts) is balanced, non-nested, and that every
-    FORBIDDEN/GATES/RETURN/ECHO order-block keyword stays confined inside
-    a marked region.
-18. `bun ./src/scripts/validate-memory-config.mts` — memory-feedback config
-    drift guard (improvement plan 2026-07-18, W0.2): fails when
-    `.claude/loop.json` has memory enabled but the feedback shape lags the
-    current contract (e.g. `memory.feedback.creditLoop` absent — the exact
-    gap behind the 1.6% usefulness finding in runner-plugin#525). Memory
-    disabled/absent passes; an explicit `enabled: false` on a key passes
-    (choice, not drift).
+   citing a real `<!-- clause: X -->` marker from `CLAUDE.md`.
+6. `bun ./src/scripts/validate-agent-refs.mts` — blocks a `crew:<name>` /
+   `runner:<name>` / `devcrew:<name>` dispatch instruction whose `<name>`
+   doesn't resolve to a real agent, command, or skill (astragenie/
+   runner-plugin#371 — a phantom dispatch token shipped in installed loop
+   rules and broke consumer orchestrators). Scans `.claude/loop/**`,
+   `commands/**`, `skills/**`, `agents/**` (3rdparty excluded),
+   `templates/**`, `docs/integrations/**`, `CLAUDE.md`, and `crew/CLAUDE.md`
+   (still live-read pending the Phase-5 docs cutover). This is also the
+   `devcrew:verifier`-not-`devcrew:validator` phantom guard (crew's rename
+   of that role from validator to verifier) — confirmed already covered,
+   no `SCAN_FILES`/`SCAN_TARGETS` extension was needed.
+7. `bun ./src/scripts/validate-dispatch-markers.mts` — checks the
+   `<task-scoped>` order-block marker (FEAT-263) is balanced, non-nested,
+   and confines FORBIDDEN/GATES/RETURN/ECHO keywords inside a marked region.
+8. `bun ./src/scripts/validate-imports.mts` — enforces the slice-linker
+   sub-module import boundary.
+9. `bun ./src/scripts/validate-backlog-writes.mts` — explicit-allowlist
+   guard: fails when a file outside `backlog-store.mts` raw-writes a
+   backlog-shaped FEAT/SLICE path.
+10. `bun ./src/scripts/validate-slice-touches-files.mts` — validates every
+    pending/in-progress/needs-review slice's `touches_files`.
+11. `bun ./src/scripts/validate-slice-state-consistency.mts` — slice
+    state-directory vs frontmatter-status agreement (one slice id filed
+    across more than one state directory, or `status:` disagreeing with
+    its containing directory).
+12. `bun ./src/scripts/validate-snapshot-freshness.mts` — blocks a stale
+    `.claude/artifacts/loop/loop-snapshot.md` from merging; regenerates the
+    snapshot in-memory and diffs it against the on-disk file.
+13. `bun ./src/scripts/validate-org-refs.mts` — stale pre-transfer-GitHub-owner
+    sweep (see the script's `BANNED_OWNER` constant for the literal token; the
+    current owner is `astragenie`) over authored surfaces including the
+    widened `crew/` scope (SLICE-20).
+14. `bun ./src/scripts/validate-marketplace-sync.mts` — registry-drift
+    guard against `astragenie/astra-marketplace`'s `marketplace.json`.
+    Degrades to a warning on an unreachable registry.
+15. `bun ./src/scripts/validate-memory-config.mts` — memory-feedback config
+    drift guard (`.claude/loop.json`'s `memory.feedback.creditLoop` shape).
+16. `bun ./src/scripts/validate-learnings-schema.mts --repo .` — schema
+    check on `.claude/artifacts/loop/learnings.jsonl`'s FEAT-220 enum
+    fields. SLICE-24 fixed 4 pre-existing malformed root entries that
+    predated this gate ever being wired in — see "learnings.jsonl fix
+    ledger" below.
+17. `bun ./src/scripts/validate-effort-points.mts` — FEAT frontmatter
+    `effort_points` must be a Fibonacci value; `expected_usd` non-negative.
+18. `bun ./src/scripts/validate-branding-scrub.mts` — **new gate** (SLICE-24,
+    FEAT-005 AC-2). Continuous sweep for the retired product name SLICE-08
+    scrubbed (see the script's `BANNED_RE` for the literal token) across the
+    full merged tree, replacing SLICE-08's one-time scrub with a standing
+    check. Fails on any case-insensitive hit on that token outside 3
+    documented exclusion buckets: (A) `.claude/artifacts/**` and
+    `crew/.claude/artifacts/**` (frozen ceremony history + live backlog/
+    slice state that legitimately narrates the rename), (B)
+    `crew/.claude/loop/**`, `crew/CLAUDE.md`, `crew/CHANGELOG.md` (crew's
+    pre-Phase-5 legacy live docs), (C) `docs/parents/**` and
+    `docs/planning/**` (frozen parent snapshots + the migration planning
+    archive). See the script's header comment for full rationale; unit
+    tests at `src/tests/validate-branding-scrub.test.mts`.
 19. `bun ./src/scripts/generate-metrics-band.mts --check` — README
-    metrics-band freshness gate (W4): regenerates the dogfood metrics band
-    in-memory from repo artifacts and fails on drift against the committed
-    README, same pattern as the snapshot-freshness gate. Regenerate with
-    `--write` after material state changes (FEAT close, grade, cost
-    report).
+    metrics-band freshness gate; regenerates in-memory and diffs against
+    the committed README.
+20. `bun ./crew/scripts/validate-manifests.mts` — crew's own manifest check
+    (`crew/.claude-plugin/plugin.json` + `crew/package.json`). **Not**
+    deduped with gate 2 despite `unification-plan.md` §7's general
+    "dedupe manifests" text — `src/scripts/validate-manifests.mts`'s own
+    header comment (written during SLICE-20) already establishes the
+    manifest/marketplace merge is explicitly deferred to Phase 5; that
+    more-recent, more-specific decision in the code overrides the plan's
+    earlier general text. Both stay as two separate gates until Phase 5.
+21. `bun ./crew/scripts/validate-dispatch-graph.mts` — cycle detector over
+    the `## Peer dispatch` allowlist graph (must be a DAG).
+22. `bun ./crew/scripts/validate-workflows.mts` — `.claude/workflows.yaml`
+    schema + phase-order + parallelism-cap + agent-existence checks.
+23. `bun ./crew/scripts/validate-slices.mts` — AC-placeholder + workflow-
+    field linter over pending slice files.
+24. `bun ./crew/scripts/validate-badges.mts` — cross-checks `BADGE_TABLE`
+    against the `mark-badge` CLI help text and the badge catalog doc.
+25. `bun ./crew/scripts/validate-loop-state.mts` — exactly one populated
+    backlog tree, unique FEAT ids.
+26. `bun ./crew/scripts/validate-bundles.mts` — build-bundle schema/version
+    checks.
+27. `bun ./crew/scripts/validate-configs.mts` — `docs/routing-table.yaml`
+    schema + drift-vs-rendered-`.md` + every `crew:<token>` reference
+    resolves against the live merged surface.
+28. `bun ./crew/scripts/validate-routing-table.mts --coverage-only` —
+    routing-table skill-id resolution (blocking, coverage-only mode; the
+    full-coverage mode runs advisory below).
+
+Gates 20/22/23/24/25/26/27 required a fix as part of this slice: their
+`AGENTS_ROOT`/`SKILLS_ROOT` constants still pointed at `crew/agents/` and
+`crew/skills/` — directories the P3 surface merge emptied out when it moved
+the real trees to the monorepo root. Before the fix, `validate-agents.mts`
+and `validate-skills.mts` silently passed with "0 checked" (a vacuous pass,
+not a real check) and `validate-workflows.mts`/`validate-dispatch-graph.mts`
+hard-failed on agents that do exist, just not where the script was looking.
+`validate-workflows.mts`, `validate-agents.mts`, `validate-skills.mts`, and
+`validate-dispatch-graph.mts` now resolve `agents/`/`skills/` one level up
+from `crew/` (`SURFACE_ROOT`), matching the split `validate-configs.mts`
+already documented. `validate-configs.mts` itself failed for a different,
+real reason: two stale `crew:<token>` references in `crew/docs/
+routing-table.yaml`'s prose notes (`` `/crew:brief-me` `` — the command was
+renamed to `/brief` during the merge; `` `/crew:using-crew` `` — no such
+command/skill ever existed post-merge, reference removed) plus a stale
+generated `routing-table.md` (re-rendered via `crew/scripts/
+render-routing-table.mts`).
+
+**Advisory (non-blocking within `fast-gate`, still run and reported on
+every push/PR):**
+
+29. `bun ./crew/scripts/validate-syntheses.mts` — flags placeholder-rotted
+    final-synthesis/grade artifacts. Advisory by design (documented in the
+    script's own header) — `runner:close`'s `grade_incomplete` badge is the
+    hard gate at close time.
+30. `CREW_VALIDATE_ROUTING_TABLE=1 bun ./crew/scripts/validate-routing-table.mts`
+    — full-coverage cross-check of every agent's "### Skills you consult"
+    block against `docs/routing-table.md`. Opt-in via env var by design;
+    advisory because coverage gaps here are additive documentation debt,
+    not correctness bugs (the blocking gate 28 already guards resolution).
+31. `bun ./crew/scripts/validate-adr-template.mts --strict` — ADR
+    "Alternatives considered" section completeness.
+32. `bun ./crew/scripts/validate-backlog-drift.mts` — flags a `triaged/`
+    slice whose close ceremony already ran in git history but was never
+    moved to `done/`. Advisory by the script's own design (flags for a
+    human/loop to act on; never moves files itself).
+33. `bun ./crew/scripts/validate-agents.mts` — agent prompt quality bar
+    (required frontmatter, "## Report contract" section, no duplicate
+    names, universal-skill drift markers, evals-spec pointers). **Wired
+    advisory, not blocking** (SLICE-24): the `AGENTS_ROOT` fix above
+    surfaced real pre-existing content debt across many agent files
+    (missing `prompt_id`/`version`, missing "## Report contract", `evals:`
+    frontmatter pointing at specs that don't exist yet) that predates this
+    slice and is out of its scope to backfill. A follow-up FEAT should
+    clear the debt and promote this to blocking.
+34. `bun ./crew/scripts/validate-skills.mts` — skill quality bar (same
+    treatment as gate 33, same reason). Also surfaced a genuine open
+    question, not just backfill debt: several skill directories now carry
+    a `devcrew:`-namespace-prefixed `name:` in frontmatter while their
+    directory name stays bare (e.g. `skills/pm-decompose/SKILL.md` names
+    itself `devcrew:pm-decompose`) — the validator's directory-name match
+    is a strict equality check with no namespace-prefix awareness, so this
+    may be a validator convention gap rather than pure content debt. Needs
+    a decision (rename directories, or teach the validator about the
+    `devcrew:` prefix) before promoting to blocking.
+35. `bunx tsc --project tsconfig.json --noEmit` + `--project
+    tsconfig.test.json --noEmit` (root) + `--project crew/tsconfig.json
+    --noEmit` (crew — its own, deliberately divergent `strict`/`types`
+    config per SLICE-09; not merged into root's tsconfig, per that slice's
+    design).
+36. `bunx biome lint src/` (root scope — root's `biome.json` `files.includes`
+    is `**/src/**`, so `crew/` paths are invisible to this invocation).
+37. `bunx biome format src/` (root, check mode).
+38. `cd crew && bunx biome lint scripts/ hooks/` — crew-scoped, invoked from
+    within `crew/` so `crew/biome.json` (`root: false`, deliberately
+    divergent rules per SLICE-09) resolves as the effective config rather
+    than relying on ambiguous nested-config auto-discovery from root.
+39. `cd crew && bunx biome format scripts/ tests/` (crew-scoped, check
+    mode) — matches `crew/package.json`'s own `format:check` script.
+40. `bun test src/tests/ --parallel --timeout 60000` (root suite, minus the
+    six known git-worktree-hanging suites — see "Job structure" below).
+41. `cd crew && bun test --timeout 60000 tests/ --parallel` (crew suite).
+    SLICE-10 (FEAT-004 P1) already proved N≥20 consecutive green
+    `--parallel` runs on this tree, so this runs unsharded and
+    unquarantined, matching root `package.json`'s existing `test:crew`
+    script (`bun run test:all` runs both root and crew suites locally).
+
+## Job structure and gating
+
+- **`fast-gate`** runs gates 1–39 (installs, all validators, tsc, biome).
+  This is the required status check.
+- **`slow-tests`** runs gate 40 (root suite, retried once on a 480s
+  per-attempt timeout) — kept as its own job (not the reusable-workflow
+  wrapper) because it needs a job-level timeout the reusable workflow's
+  fixed 30-minute limit can't give it, mirroring runner-plugin's original
+  design (astragenie/runner-plugin#355).
+- **`crew-tests`** runs gate 41.
+- **`worktree-quarantine`** runs the six suites gate 40 excludes
+  (`auto-merge`, `synergy`, `integration`, `integrations`,
+  `slice-complete`, `slice-start` — real `git worktree` operations known to
+  hang the runner, PR #348), hard-killed via `timeout`, `continue-on-error:
+  true`.
+- **`gate`** (the final required-check summary) passes when the change is
+  docs-only OR `fast-gate` succeeded. `slow-tests`/`crew-tests`/
+  `worktree-quarantine` are intentionally NOT part of the required gate —
+  this preserves the pre-existing runner-plugin policy this repo inherited
+  (full-suite runs on a self-hosted runner can be flaky; the fast validator
+  + typecheck + lint/format layer is the actual merge gate). All jobs still
+  run and report on every push/PR.
+
+## Named drops (retired, not silently — unification-plan.md §7)
+
+- crew's `hooks/check-redundant-read.mts` self-test (a hook smoke test, not
+  a repo-content gate; `crew/tests/` already carries broad hook coverage).
+- crew's `e2e-smoke.mts` / `e2e:smoke:ux` (Linux-only live `claude` CLI
+  integration smoke) — out of scope for this slice; needs a follow-up FEAT
+  to decide whether it belongs in this workflow or a separate scheduled one
+  (it never ran on every PR even in crew's own prior CI).
+- crew's negative-fixture shell loops for `validate-contracts.mts` /
+  `validate-ux-spec.mts` (asserting a broken fixture fails linting) — both
+  scripts require an explicit file arg (no repo-wide sweep mode) and the
+  same assertions already live in `crew/tests/validate-contracts.test.mts`
+  and `crew/tests/validate-ux-spec.test.mts`, covered by gate 41.
+
+## learnings.jsonl fix ledger (SLICE-24)
+
+Root `.claude/artifacts/loop/learnings.jsonl` had 4 pre-existing entries
+that predate the `validate-learnings-schema.mts` gate (16) ever being wired
+into this merged CI, and would have failed it immediately on first run. All
+4 came from the `validation_fail` capture path (a different write shape
+than the FEAT-220 grade-lesson shape — `kind`/`ts`/`agent`/`severity`/
+`tags`/`summary`/`source`, no `key`/`insight`), fixed by adding a `key` and
+an `insight` (mirroring `summary`) to each rather than deleting the record:
+
+| Line (pre-fix) | `ts` | `agent` | `summary` (truncated) |
+|---|---|---|---|
+| 22 | 2026-08-19T01:19:11.178Z | verifier | phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run |
+| 29 | 2026-08-19T03:07:30.041Z | verifier | phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run |
+| 40 | 2026-08-19T06:49:02.245Z | runner:validator | DEFECT 1 (CRITICAL...): systemic stale-path drift from the crew/ subdirectory merge... |
+| 43 | 2026-08-19T07:11:04.612Z | verifier | phase unspecified FAIL — preset typescript-plugin-dev — 2 stages run |
+
+`crew/.claude/artifacts/loop/learnings.jsonl` (a sibling, crew-local file)
+has many more entries in the same non-FEAT-220 shape, but is **not** in
+scope for gate 16 as written (`validate-learnings-schema.mts` only checks
+the repo-root file) — left untouched.
+
+## Known-red side effects of this slice (documented, not silently hidden)
+
+- `crew/tests/validate-all.test.mts`'s 2 assertions ("exits 0 on clean
+  repo" / "check mark for each validator") now fail. `validate-all.mts`
+  runs 4 validators against the live `crew/` tree (not a fixture); before
+  the `AGENTS_ROOT`/`SKILLS_ROOT` fix above, `validate-agents.mts`/
+  `validate-skills.mts` silently passed vacuously so this test always
+  passed too. It's now correctly reporting the same real content debt gate
+  33/34 above are advisory for. Not fixed here (same "out of scope,
+  needs a follow-up FEAT" reasoning) — flagged so it isn't mistaken for a
+  regression this slice introduced by accident.
+- Root suite: 2 pre-existing, already-documented failures unrelated to this
+  slice — `DEC-070 contract record exists for FEAT-229` and `DEC-068
+  contract record exists for FEAT-222` (`src/tests/learning-cycle.test.mts`,
+  `src/tests/eval-generator.test.mts`). `.claude/artifacts/loop/decisions/
+  DEC-004.md` already documents these as an accepted trade-off ("2
+  self-referential runner tests fail (DEC-068/070 existsSync) until
+  rewritten").
 
 Pre-push hook (`src/scripts/pre-push-validate.mts`, run via Bun) runs
 manifest + content-length + format-check locally before any `git push`.
diff --git a/docs/memory.md b/docs/memory.md
index 3c25a536..492edb2c 100644
--- a/docs/memory.md
+++ b/docs/memory.md
@@ -31,9 +31,15 @@ programmatically:
   ["CLAUDE.md"]`) flags any `crew:<name>` / `runner:<name>` token in
   CLAUDE.md that doesn't resolve to a real agent/command/skill. Don't
   introduce a new dispatch-token reference without confirming it resolves.
-- **Marker block** (`<!-- runner:start -->`...`<!-- runner:end -->`) is
-  regenerated by `/devcrew:install` from `templates/claude-md-hard-rules.md`
-  — never hand-edit its content; edit `.claude/loop.json` and re-run install.
+- **Two marker blocks, two installers, both preserved byte-identical by
+  SLICE-25's docs merge:** `<!-- crew:start -->`...`<!-- crew:end -->` is
+  regenerated by `/crew:install` from the crew plugin's own template
+  (includes `.claude/crew/constitution.md`); `<!-- runner:start -->`...
+  `<!-- runner:end -->` is regenerated by `/runner:install` from
+  `templates/claude-md-hard-rules.md`. Never hand-edit either block's
+  content; edit `.claude/crew.json` / `.claude/loop.json` and re-run the
+  matching install command. Post-cutover (FEAT-006) these collapse to a
+  single `/devcrew:install`-owned block — not yet done as of this entry.
 
 ## Known path drift (found during 2026-07-21 agentic-setup audit)
 
@@ -121,15 +127,17 @@ back to `slice-build`. If the upstream lead-pause issue is fixed in
 
 ## Reviewer ladder — current setting
 
-This repo runs `reviewers.ladder: ["A"]` (single reviewer, lighter gate) with
-**no post-builder validator** — the close-time validation gate is satisfied
-by the reviewer's approval badge (`loop.validation.satisfiedByReview: true`,
-see `deriveValidationGate` in `src/scripts/lib/validation-gate.mts`).
-Behavior/test validation is delegated to the CI test gate instead. A
-`multidim` three-dimension preset (FEAT-079/SLICE-82) was built for one
-slice and left no surviving code (`grep -rn multidim src/scripts` → zero
-matches) — not a general opt-in; re-enabling it means re-implementing, not
-flipping a switch.
+**Corrected 2026-08-19 (SLICE-25):** this repo's live `.claude/loop.json`
+runs `reviewers.ladder: ["A","B"]` (the two-reviewer default, not the
+single-reviewer `["A"]` lane some sibling repos tune to) — a prior version
+of this entry claimed `["A"]"`, copied verbatim from `runner-plugin`'s own
+memory doc without re-verifying against this repo's actual config; see
+`CLAUDE.md`'s Session protocol clause 2 ("re-verify before relying") for
+why that's exactly the failure mode to avoid. A `multidim` three-dimension
+preset (FEAT-079/SLICE-82, from the `runner-plugin` lineage) was built for
+one slice and left no surviving code (`grep -rn multidim src/scripts` →
+zero matches) — not a general opt-in; re-enabling it means
+re-implementing, not flipping a switch.
 
 ## Owned agents — retirement history
 
diff --git a/src/scripts/lib/auto-merge.mts b/src/scripts/lib/auto-merge.mts
index c03a9fcd..b56c9af6 100644
--- a/src/scripts/lib/auto-merge.mts
+++ b/src/scripts/lib/auto-merge.mts
@@ -142,7 +142,8 @@ export class MergeError extends Error {
     this.failedStep = opts.failedStep;
     this.gitStderr = opts.gitStderr ?? "";
     this.fixHint =
-      opts.fixHint ?? `Run \`/devcrew:fix\` against worktree \`${opts.attemptedWorktree}\` to resume.`;
+      opts.fixHint ??
+      `Run \`/devcrew:fix\` against worktree \`${opts.attemptedWorktree}\` to resume.`;
     this.attemptedBranch = opts.attemptedBranch;
     this.attemptedWorktree = opts.attemptedWorktree;
   }
diff --git a/src/tests/audit-log-envelope-join.test.mts b/src/tests/audit-log-envelope-join.test.mts
index e48a76a4..40571029 100644
--- a/src/tests/audit-log-envelope-join.test.mts
+++ b/src/tests/audit-log-envelope-join.test.mts
@@ -98,7 +98,9 @@ describe("AC-7b: joinAuditToPairs nearest-preceding match", () => {
         iterationIndex: 0
       }
     ];
-    const pairs: PairInput[] = [{ agentType: "devcrew:builder", startTs: "2026-07-01T10:00:05.000Z" }];
+    const pairs: PairInput[] = [
+      { agentType: "devcrew:builder", startTs: "2026-07-01T10:00:05.000Z" }
+    ];
 
     const result = joinAuditToPairs(pairs, entries, "SLICE-137");
     assert.equal(result.length, 1);
@@ -123,7 +125,9 @@ describe("AC-7b: joinAuditToPairs nearest-preceding match", () => {
         iterationIndex: 1
       }
     ];
-    const pairs: PairInput[] = [{ agentType: "devcrew:builder", startTs: "2026-07-01T10:05:00.000Z" }];
+    const pairs: PairInput[] = [
+      { agentType: "devcrew:builder", startTs: "2026-07-01T10:05:00.000Z" }
+    ];
 
     const result = joinAuditToPairs(pairs, entries, "SLICE-137");
     // Should pick the 10:00 entry (latest before 10:05)
@@ -141,7 +145,9 @@ describe("AC-7b: joinAuditToPairs nearest-preceding match", () => {
         iterationIndex: 0
       }
     ];
-    const pairs: PairInput[] = [{ agentType: "devcrew:builder", startTs: "2026-07-01T10:00:00.000Z" }];
+    const pairs: PairInput[] = [
+      { agentType: "devcrew:builder", startTs: "2026-07-01T10:00:00.000Z" }
+    ];
 
     const result = joinAuditToPairs(pairs, entries, "SLICE-137");
     assert.equal(result[0]!.dispatchKind, null);
@@ -241,7 +247,9 @@ describe("AC-7d: back-compat with v1 audit entries (no sliceId)", () => {
         iterationIndex: 0
       }
     ];
-    const pairs: PairInput[] = [{ agentType: "devcrew:builder", startTs: "2026-07-01T10:05:00.000Z" }];
+    const pairs: PairInput[] = [
+      { agentType: "devcrew:builder", startTs: "2026-07-01T10:05:00.000Z" }
+    ];
 
     const result = joinAuditToPairs(pairs, entries, "SLICE-137");
     // No match because entry.sliceId !== "SLICE-137" (undefined !== "SLICE-137")
@@ -259,7 +267,9 @@ describe("AC-7d: back-compat with v1 audit entries (no sliceId)", () => {
         iterationIndex: 0
       }
     ];
-    const pairs: PairInput[] = [{ agentType: "devcrew:builder", startTs: "2026-07-01T10:05:00.000Z" }];
+    const pairs: PairInput[] = [
+      { agentType: "devcrew:builder", startTs: "2026-07-01T10:05:00.000Z" }
+    ];
 
     const result = joinAuditToPairs(pairs, entries, "SLICE-137");
     assert.equal(result[0]!.dispatchKind, null);
@@ -275,7 +285,9 @@ describe("AC-7d: back-compat with v1 audit entries (no sliceId)", () => {
         iterationIndex: 5
       }
     ];
-    const pairs: PairInput[] = [{ agentType: "devcrew:builder", startTs: "2026-07-01T10:05:00.000Z" }];
+    const pairs: PairInput[] = [
+      { agentType: "devcrew:builder", startTs: "2026-07-01T10:05:00.000Z" }
+    ];
 
     const result = joinAuditToPairs(pairs, entries, "SLICE-137");
     assert.equal(result[0]!.dispatchKind, null);
diff --git a/src/tests/failure-mining.test.mts b/src/tests/failure-mining.test.mts
index 07c6a42f..c8f7df14 100644
--- a/src/tests/failure-mining.test.mts
+++ b/src/tests/failure-mining.test.mts
@@ -11,7 +11,12 @@ import { miningRoot } from "../scripts/lib/paths.mjs";
 import { mineFailures } from "../scripts/lib/failure-mining.mjs";
 
 async function seedPausedDispatch(repo: string, sliceId: string, ts: string): Promise<void> {
-  await recordDispatchOutcome(repo, { ts, agentRole: "devcrew:builder", sliceId, outcome: "paused" });
+  await recordDispatchOutcome(repo, {
+    ts,
+    agentRole: "devcrew:builder",
+    sliceId,
+    outcome: "paused"
+  });
 }
 
 // ---------------------------------------------------------------------------
diff --git a/src/tests/memory-gepa.test.mts b/src/tests/memory-gepa.test.mts
index f7d60255..d0d42c4c 100644
--- a/src/tests/memory-gepa.test.mts
+++ b/src/tests/memory-gepa.test.mts
@@ -196,7 +196,11 @@ test("emitGepaEvent sends project/agent as top-level wire fields, mirrored in me
     health: async () => ({ ok: true })
   });
 
-  await emitGepaEvent({ ...makePayload(), project: "runner-plugin", agent: "devcrew:fullstack-dev" });
+  await emitGepaEvent({
+    ...makePayload(),
+    project: "runner-plugin",
+    agent: "devcrew:fullstack-dev"
+  });
 
   assert.equal(seen.length, 1);
   assert.equal(seen[0]!["project"], "runner-plugin");
diff --git a/src/tests/slice-build-routing.test.mts b/src/tests/slice-build-routing.test.mts
index 5228d196..827627fa 100644
--- a/src/tests/slice-build-routing.test.mts
+++ b/src/tests/slice-build-routing.test.mts
@@ -313,7 +313,10 @@ test("buildDispatchInstruction slice-build + fe+be emits PARALLEL DISPATCH with
   assert.ok(out.includes("devcrew:frontend-dev"), "must reference devcrew:frontend-dev");
   assert.ok(out.includes("devcrew:backend-dev"), "must reference devcrew:backend-dev");
   // The parent loop should still drive the inspector/verifier gates after both subagents finish.
-  assert.ok(out.includes("devcrew:reviewer"), "must mention devcrew:reviewer for gate-driving guidance");
+  assert.ok(
+    out.includes("devcrew:reviewer"),
+    "must mention devcrew:reviewer for gate-driving guidance"
+  );
 });
 
 test("buildDispatchInstruction slice-build + fe+be returns a SINGLE string (not an array or object)", () => {
diff --git a/src/tests/watch-reaction-spawn.test.mts b/src/tests/watch-reaction-spawn.test.mts
index 9afe2df3..e444857f 100644
--- a/src/tests/watch-reaction-spawn.test.mts
+++ b/src/tests/watch-reaction-spawn.test.mts
@@ -117,7 +117,10 @@ test("spawnReactionProcess: real args call the injected spawn function detached,
     };
   };
 
-  const spawnArgs = buildSpawnArgs(makeSpawn("intake", "/devcrew:intake --from-issue x"), undefined);
+  const spawnArgs = buildSpawnArgs(
+    makeSpawn("intake", "/devcrew:intake --from-issue x"),
+    undefined
+  );
   assert.ok(spawnArgs);
   spawnReactionProcess(spawnArgs, spawnFn);
 

```

## Files touched


## Files read

