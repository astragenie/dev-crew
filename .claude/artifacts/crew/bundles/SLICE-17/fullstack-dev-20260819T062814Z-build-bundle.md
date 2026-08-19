---
slice: SLICE-17
builder: fullstack-dev
run_id: 20260819T062814Z
feat: FEAT-004
files_touched: [".claude-plugin/hooks/hooks.json", "hooks/pre-push-gate.mts", "tsconfig.json"]
files_read: []
diff_stat: { files: 12, additions: 219, deletions: 116 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-17: hooks merge + matcher-scoped consolidation

- Created: 2026-08-19T06:28:14.479Z
- From: fullstack-dev
- To: lead
- Objective: Merged devcrew .claude-plugin/hooks/hooks.json (runner's 12 regs) with crew's 26 regs (left physically in crew/hooks/ -- crew's own telemetry-hooks-json.test.mts hard-asserts that file's paths/commands, so relocation was deferred to the not-yet-done crew/scripts/lib migration slice). New hooks/pre-push-gate.mts functionally merges crew's blocking pre-push-verifier.mts with runner's soft pre-push-validate.mts into one process, cutting one spawn/Bash-call. preflight-shell's duplicate Bash+PowerShell registrations merged into one matcher group (Bash|PowerShell). otel-post-tool-use.mts and checkpoint-cadence.mts verified by reading their logic to require unconditional (no-matcher) registration by design -- both must observe every tool call, not just Bash -- so left unscoped. AC-4 (<=150ms/Bash-call) NOT MET on this Windows dev box under two measurement models: sequential-spawn 483.8ms->427.1ms p50 (12% cut, still 2.8x over), parallel-per-phase (matches Claude Code's documented concurrent-hook execution) 189.1ms->195.7ms p50 (flat/noise-bound). Root cause is bun cold-start floor (~60-110ms/spawn on this machine, matches repo's own hook-cold-start-bench.test.mts Windows-local floor) -- one required always-on hook (otel-post-tool-use, ~103-112ms alone) already consumes most of the 150ms budget; spawn-count reduction cannot close that gap. Recommend trusting the Linux/CI gating environment this repo already treats as authoritative for that same bench, and escalating the unification-plan.md Sec-10-A prompt-based-hooks spike as the real structural fix -- spike note included in this handoff body. All other gates green: 3x tsc clean (root+test+crew, added hooks/**/*.mts to root tsconfig include), biome lint/format unaffected (hooks/ is outside biome.json's src/-only scope), validate-manifests/imports/dispatch-markers/content-length green, crew suite 1978 pass/117 skip/2 fail (both reproduced as pre-existing contention flakes, isolated re-run 6/6 pass, neither test touches hooks.json or any hook script), root suite 3316 pass/7 skip/2 fail (matches this repo's documented known baseline exactly). 3 representative hooks (preflight-shell.mts, pre-push-gate.mts, post-tool-use-bash-gate.mts) fired standalone with synthetic stdin payloads, all exit 0.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - .claude-plugin/hooks/hooks.json
  - tsconfig.json
  - hooks/pre-push-gate.mts
- Confidence: medium
- Risks: AC-4 not met on Windows dev hardware under either measurement model (see summary); crew/hooks/hooks.json + crew/hooks/*.mts intentionally left unmoved (physical relocation blocked on the crew/scripts/lib -> src/scripts/lib merge, a different slice's scope) so the devcrew hooks.json still spawns crew scripts from their crew/hooks/ path rather than a single flat hooks/ tree -- 'ONE hooks.json' achieved as a registration surface, not yet as a flat script directory; SessionStart/SubagentStart/SubagentStop/TaskCreated/TaskCompleted were inventoried for dedup but found to have no true duplicates (distinct telemetry destinations or distinct concerns) -- left as-is, not blindly folded.
- Suggested Next Handoff: P3 spike slice (unification-plan.md Sec 10-A): evaluate prompt-based hooks as the structural fix for the cold-start floor this slice's measurements expose. Separately, once the crew/scripts/lib -> src/scripts/lib merge slice lands, revisit physically relocating crew/hooks/*.mts into hooks/ root per the original ask (crew/tests/telemetry-hooks-json.test.mts will need its HOOKS_JSON_PATH updated in that same slice, not before).


## Diff

```diff
diff --git a/.claude-plugin/hooks/hooks.json b/.claude-plugin/hooks/hooks.json
index 5591dc02..1ff3ef67 100644
--- a/.claude-plugin/hooks/hooks.json
+++ b/.claude-plugin/hooks/hooks.json
@@ -1,28 +1,15 @@
 {
   "hooks": {
-    "PreToolUse": [
+    "SessionStart": [
       {
-        "matcher": "Bash",
+        "matcher": "startup|clear|compact",
         "hooks": [
           {
             "type": "command",
-            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/src/scripts/pre-push-validate.mts\"",
-            "timeout": 30
+            "command": "\"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh\" session_start"
           }
         ]
       },
-      {
-        "matcher": "Agent",
-        "hooks": [
-          {
-            "type": "command",
-            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/guard-feat-dispatch.mjs\"",
-            "description": "loop:feat-dispatch-guard"
-          }
-        ]
-      }
-    ],
-    "SessionStart": [
       {
         "hooks": [
           {
@@ -54,9 +41,49 @@
         ]
       }
     ],
+    "TaskCreated": [
+      {
+        "hooks": [
+          {
+            "type": "command",
+            "command": "\"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh\" task_created"
+          },
+          {
+            "type": "command",
+            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/emit-astrarunner-event.mjs\" task_created",
+            "description": "runner:astrarunner-emit-task-created",
+            "timeout": 5
+          }
+        ]
+      }
+    ],
+    "TaskCompleted": [
+      {
+        "hooks": [
+          {
+            "type": "command",
+            "command": "\"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh\" task_completed"
+          },
+          {
+            "type": "command",
+            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/emit-astrarunner-event.mjs\" task_completed",
+            "description": "runner:astrarunner-emit-task-completed",
+            "timeout": 5
+          }
+        ]
+      }
+    ],
     "SubagentStart": [
       {
         "hooks": [
+          {
+            "type": "command",
+            "command": "\"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh\" subagent_start"
+          },
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/subagent-start-profile.mts\""
+          },
           {
             "type": "command",
             "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/emit-astrarunner-event.mjs\" subagent_start",
@@ -69,26 +96,34 @@
     "SubagentStop": [
       {
         "hooks": [
+          {
+            "type": "command",
+            "command": "\"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh\" subagent_stop"
+          },
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/otel-subagent-stop.mts\""
+          },
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/check-reviewer-decision.mts\""
+          },
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/check-builder-terminal-state.mts\""
+          },
           {
             "type": "command",
             "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/emit-astrarunner-event.mjs\" subagent_stop",
             "description": "runner:astrarunner-emit-subagent-stop",
             "timeout": 5
-          }
-        ]
-      },
-      {
-        "hooks": [
+          },
           {
             "type": "command",
             "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/capture-at-close.mjs\"",
             "description": "runner:capture-at-close-subagent-stop",
             "timeout": 8
-          }
-        ]
-      },
-      {
-        "hooks": [
+          },
           {
             "type": "command",
             "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/report-gate.mjs\"",
@@ -110,26 +145,137 @@
         ]
       }
     ],
-    "TaskCreated": [
+    "TeammateIdle": [
       {
         "hooks": [
           {
             "type": "command",
-            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/emit-astrarunner-event.mjs\" task_created",
-            "description": "runner:astrarunner-emit-task-created",
-            "timeout": 5
+            "command": "\"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh\" teammate_idle"
           }
         ]
       }
     ],
-    "TaskCompleted": [
+    "PreToolUse": [
       {
+        "matcher": "Bash|PowerShell",
         "hooks": [
           {
             "type": "command",
-            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/emit-astrarunner-event.mjs\" task_completed",
-            "description": "runner:astrarunner-emit-task-completed",
-            "timeout": 5
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/preflight-shell.mts\""
+          }
+        ]
+      },
+      {
+        "matcher": "Bash",
+        "hooks": [
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/pre-tool-use-bash-gate.mts\""
+          },
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/pre-push-gate.mts\"",
+            "description": "devcrew:pre-push-gate (merges crew pre-push-verifier + runner pre-push-validate)"
+          }
+        ]
+      },
+      {
+        "matcher": "Read",
+        "hooks": [
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/check-redundant-read.mts\""
+          }
+        ]
+      },
+      {
+        "matcher": "Agent",
+        "hooks": [
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/pre-tool-use-agent.mts\""
+          },
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/pre-tool-use-model-enforce.mts\""
+          },
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/pre-tool-use-dispatch-size.mts\""
+          },
+          {
+            "type": "command",
+            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/guard-feat-dispatch.mjs\"",
+            "description": "loop:feat-dispatch-guard"
+          }
+        ]
+      },
+      {
+        "matcher": "TaskUpdate",
+        "hooks": [
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/check-task-update-burst.mts\""
+          }
+        ]
+      }
+    ],
+    "PostToolUse": [
+      {
+        "matcher": "Read",
+        "hooks": [
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/record-read-content.mts\""
+          }
+        ]
+      },
+      {
+        "matcher": "Agent",
+        "hooks": [
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/check-subagent-return.mts\""
+          }
+        ]
+      },
+      {
+        "matcher": "Bash",
+        "hooks": [
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/post-tool-use-bash-gate.mts\""
+          }
+        ]
+      },
+      {
+        "matcher": "Edit|Write|MultiEdit",
+        "hooks": [
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/record-edit.mts\""
+          }
+        ]
+      },
+      {
+        "hooks": [
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/otel-post-tool-use.mts\""
+          },
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/checkpoint-cadence.mts\""
+          }
+        ]
+      }
+    ],
+    "Stop": [
+      {
+        "hooks": [
+          {
+            "type": "command",
+            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/otel-stop.mts\""
           }
         ]
       }
diff --git a/.claude/artifacts/loop/ai-loop/slices/pending/SLICE_18_MODELS-YAML-MODEL-ROUTER-SINGLE-SOURCE-DESIGN-MERGE.md b/.claude/artifacts/loop/ai-loop/slices/pending/SLICE_18_MODELS-YAML-MODEL-ROUTER-SINGLE-SOURCE-DESIGN-MERGE.md
deleted file mode 100644
index a53bdbce..00000000
--- a/.claude/artifacts/loop/ai-loop/slices/pending/SLICE_18_MODELS-YAML-MODEL-ROUTER-SINGLE-SOURCE-DESIGN-MERGE.md
+++ /dev/null
@@ -1,57 +0,0 @@
----
-id: SLICE-18
-title: models.yaml/model-router single-source design merge
-status: pending
-feature: FEAT-004
-phase: null
-priority: P2
-target_release: null
-requires_validation: true
-risk: medium
-created: 2026-08-19
-updated: 2026-08-19
-effort_points: 2
-proposed_slice_id_suffix: -SLICE-5
-estimated_tokens: 100000
-tags: ["stack:typescript"]
----
-# SLICE-18: models.yaml/model-router single-source design merge
-
-Implements FEAT-004. See [feature file](../../../backlog/in-progress/FEAT-004.md) for product context.
-
-## Objective
-
-
-
-## In scope
-
-- bullet 1
-- bullet 2
-
-## Out of scope
-
-- bullet 1
-
-## Acceptance criteria
-
-> WARNING: ACs copied from FEAT-004 and shared across 6 sibling slices — scope per-slice before close
-
-- [ ] AC-1: Given the command map from unification-plan.md section 2 is applied, When `bun ./src/scripts/validate-agent-refs.mts` runs against the merged tree, Then it exits 0.
-- [ ] AC-2: Given the dispatch-token rewrite table (crew:X -> devcrew:X, runner:X -> devcrew:X), When every .md file under commands/, agents/, skills/, CLAUDE.md, and AGENTS.md is grepped for `\bcrew:[a-z-]+\b|\brunner:[a-z-]+\b`, Then every match resolves to an entry in the section-2 map -- zero unmapped tokens.
-- [ ] AC-3: Given 4 dev-team agents exceed the 300-line cap before trimming (architect 346, verifier 343, backend-dev 335, release-engineer 326 lines), When `bun ./src/scripts/validate-content-length.mts` runs after the trim slice, Then it exits 0 and each of the four files is <=300 lines.
-- [ ] AC-4: Given hooks are consolidated to matcher-scoped registrations, When a representative Bash tool call is measured end-to-end through the hook pipeline, Then the measured overhead is <=150ms -- a measurement above 150ms fails this AC (targets the ~540ms/Bash-call regression named in the plan's risk register).
-- [ ] AC-5: Given the merge completes, When one full slice ceremony runs end-to-end under the /devcrew:* namespace, Then it completes with a PASS badge and its artifacts contain zero references to the old /crew: or /runner: command namespaces.
-
-## Done When
-
-- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
-- build / test commands per `.claude/loop.json` pass
-- feature FEAT-004 moved from `in-progress/` to `done/`
-- Crew `final-synthesis` artifact written
-- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
-   above to waive the validation gate — no badge needed at close time)
-
-## Reviewer ladder
-
-- Reviewer A: ...
-- Reviewer B: ...
diff --git a/.claude/artifacts/loop/auto-dispatch.jsonl b/.claude/artifacts/loop/auto-dispatch.jsonl
index 6e33a85a..04411343 100644
--- a/.claude/artifacts/loop/auto-dispatch.jsonl
+++ b/.claude/artifacts/loop/auto-dispatch.jsonl
@@ -19,3 +19,4 @@
 {"timestamp":"2026-08-19T06:11:17.896Z","agent":"crew:document-writer","parentCommand":"slice-complete","ok":true,"skipped":true,"skipReason":"cli-refusal-cli-doc-writer-disabled","durationMs":0}
 {"timestamp":"2026-08-19T06:11:27.536Z","agent":"crew:document-writer","parentCommand":"slice-complete","ok":true,"skipped":true,"skipReason":"cli-refusal-cli-doc-writer-disabled","durationMs":0}
 {"timestamp":"2026-08-19T06:11:37.205Z","agent":"crew:document-writer","parentCommand":"slice-complete","ok":true,"skipped":true,"skipReason":"cli-refusal-cli-doc-writer-disabled","durationMs":0}
+{"timestamp":"2026-08-19T06:24:14.521Z","agent":"crew:document-writer","parentCommand":"slice-complete","ok":true,"skipped":true,"skipReason":"cli-refusal-cli-doc-writer-disabled","durationMs":0}
diff --git a/.claude/artifacts/loop/backlog/in-progress/FEAT-004.md b/.claude/artifacts/loop/backlog/in-progress/FEAT-004.md
index 70d112fc..eaa46f04 100644
--- a/.claude/artifacts/loop/backlog/in-progress/FEAT-004.md
+++ b/.claude/artifacts/loop/backlog/in-progress/FEAT-004.md
@@ -51,7 +51,7 @@ arch_attempt: 0
 arch_status: approved
 arch_review: approved
 started_at: 2026-08-19
-slices_complete: [SLICE-14, SLICE-15, SLICE-16]
+slices_complete: [SLICE-14, SLICE-15, SLICE-16, SLICE-18]
 ---
 ## Description
 
diff --git a/.claude/artifacts/loop/grades.jsonl b/.claude/artifacts/loop/grades.jsonl
index b63f1406..f2228c5e 100644
--- a/.claude/artifacts/loop/grades.jsonl
+++ b/.claude/artifacts/loop/grades.jsonl
@@ -14,3 +14,4 @@
 {"sliceId":"SLICE-14","recordedAt":"2026-08-19","ts":"2026-08-19","scores":{"architecture_quality":0.9,"reliability":0.9,"observability":0.88,"production_readiness":0.9,"security":0.85,"test_confidence":0.9,"product_completeness":0.93},"decisions":[{"id":"DEC-014","status":"accepted","body":""}],"timing":{"wall_clock_seconds":null,"phase_gate_parallel":null,"post_builder_fanout":null,"reviewer_span_ms":null,"serial_reviewer_warning":false},"shape":{"classified":"none","inline_path_used":false},"featureId":"FEAT-004"}
 {"sliceId":"SLICE-15","recordedAt":"2026-08-19","ts":"2026-08-19","scores":{"architecture_quality":0.92,"reliability":0.9,"observability":0.88,"production_readiness":0.9,"security":0.85,"test_confidence":0.88,"product_completeness":0.93},"decisions":[{"id":"DEC-015","status":"accepted","body":""}],"timing":{"wall_clock_seconds":null,"phase_gate_parallel":null,"post_builder_fanout":null,"reviewer_span_ms":null,"serial_reviewer_warning":false},"shape":{"classified":null,"inline_path_used":false},"featureId":"FEAT-004"}
 {"sliceId":"SLICE-16","recordedAt":"2026-08-19","ts":"2026-08-19","scores":{"architecture_quality":0.9,"reliability":0.9,"observability":0.87,"production_readiness":0.9,"security":0.85,"test_confidence":0.88,"product_completeness":0.92},"decisions":[{"id":"DEC-016","status":"accepted","body":""}],"timing":{"wall_clock_seconds":null,"phase_gate_parallel":null,"post_builder_fanout":null,"reviewer_span_ms":null,"serial_reviewer_warning":false},"shape":{"classified":null,"inline_path_used":false},"featureId":"FEAT-004"}
+{"sliceId":"SLICE-18","recordedAt":"2026-08-19","ts":"2026-08-19","scores":{"architecture_quality":0.92,"reliability":0.9,"observability":0.87,"production_readiness":0.9,"security":0.85,"test_confidence":0.93,"product_completeness":0.88},"decisions":[{"id":"DEC-017","status":"accepted","body":""}],"timing":{"wall_clock_seconds":null,"phase_gate_parallel":null,"post_builder_fanout":null,"reviewer_span_ms":null,"serial_reviewer_warning":false},"shape":{"classified":null,"inline_path_used":false},"featureId":"FEAT-004"}
diff --git a/.claude/artifacts/loop/learnings.jsonl b/.claude/artifacts/loop/learnings.jsonl
index a03b1fb8..12d90b69 100644
--- a/.claude/artifacts/loop/learnings.jsonl
+++ b/.claude/artifacts/loop/learnings.jsonl
@@ -33,3 +33,5 @@
 {"id":"2026-08-19T06-12-12-554Z-0f4bf8","timestamp":"2026-08-19T06:12:12.554Z","key":"grade-lesson:SLICE-15:dd099074","insight":"Merge-then-cap in one agent beats merge+trim in two.","confidence":null,"source":"grade-write","sliceId":"SLICE-15","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T06-12-12-828Z-05cc4d","timestamp":"2026-08-19T06:12:12.828Z","key":"grade-lesson:SLICE-16:2dacbc61","insight":"Plan-constant counts (≈82) drift from verdict-driven reality (79): enumerate-live at verify, reconcile in close notes, never chase the constant.","confidence":null,"source":"grade-write","sliceId":"SLICE-16","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
 {"id":"2026-08-19T06-12-12-829Z-562ff1","timestamp":"2026-08-19T06:12:12.829Z","key":"grade-lesson:SLICE-16:47762ad7","insight":"A fold can push a file over cap honestly — density, not duplication; compress at the fold, not after.","confidence":null,"source":"grade-write","sliceId":"SLICE-16","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
+{"id":"2026-08-19T06-24-32-587Z-a471d2","timestamp":"2026-08-19T06:24:32.587Z","key":"grade-lesson:SLICE-18:208326b9","insight":"Investigate before merging: the planned \"single-source merge\" target was","confidence":null,"source":"grade-write","sliceId":"SLICE-18","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
+{"id":"2026-08-19T06-24-32-588Z-035ac1","timestamp":"2026-08-19T06:24:32.588Z","key":"grade-lesson:SLICE-18:9f56ff70","insight":"Two validators for one contract WILL drift — parity tests over shared","confidence":null,"source":"grade-write","sliceId":"SLICE-18","tags":["lesson"],"status":"candidate","scope":"repo","agentType":"unknown"}
diff --git a/.claude/artifacts/loop/loop-snapshot.md b/.claude/artifacts/loop/loop-snapshot.md
index 87e41f36..720d3263 100644
--- a/.claude/artifacts/loop/loop-snapshot.md
+++ b/.claude/artifacts/loop/loop-snapshot.md
@@ -25,28 +25,28 @@ _Generated by `bun src/scripts/loop.mts snapshot-memory`. Regenerate after mater
 
 ## Recent grade signal
 
-- Total grades: 16
+- Total grades: 17
 - Last 5 averages:
-  - architecture_quality: 0.37 ⚠
-  - reliability: 0.376 ⚠
-  - observability: 0.36 ⚠
-  - production_readiness: 0.372 ⚠
-  - security: 0.508 ⚠
-  - test_confidence: 0.38 ⚠
-  - product_completeness: 0.378 ⚠
+  - architecture_quality: 0.728 ⚠
+  - reliability: 0.726 ⚠
+  - observability: 0.706 ⚠
+  - production_readiness: 0.726 ⚠
+  - security: 0.844
+  - test_confidence: 0.72 ⚠
+  - product_completeness: 0.746 ⚠
 
 ## Recent decisions
 
-- **DEC-009** (accepted) — crew biome stays divergent (root:false, no extends) until P3 flattening _(from SLICE-09)_
-- **DEC-010** (accepted) — P1 exit accepted with root-suite ~5% unnamed intermittent on record _(from SLICE-10)_
-- **DEC-011** (accepted) — Rewired tests assert on real return objects, not fake-CLI argv _(from SLICE-11)_
 - **DEC-012** (accepted) — Validation-artifact writes are fail-hard from now on _(from SLICE-12)_
 - **DEC-013** (accepted) — legacy schemaVersion renamed presetSchemaVersion in v2 config _(from SLICE-13)_
+- **DEC-014** (accepted) — Legacy dispatch aliases keep historical names; devcrew:* accepted via primary path _(from SLICE-14)_
+- **DEC-015** (accepted) — Duplicate-role merges keep crew variant as base, runner deltas as modes _(from SLICE-15)_
+- **DEC-016** (accepted) — Plugin identity is devcrew@1.0.0-rc.1 pre-cutover _(from SLICE-16)_
 
 ## Loop telemetry
 
 - Iteration count: 2 / 25
-- In-window cost trajectory: median $2.542 / mean $4.373 per cost-report (13 slice-close session scans)
+- In-window cost trajectory: median $2.720 / mean $6.064 per cost-report (13 slice-close session scans)
 - Last cost-advisor verdict: n/a
 - Memory usefulness (7d): served=44 used=6 rate=13.6%
 
diff --git a/.claude/state/crew/slice-progress.md b/.claude/state/crew/slice-progress.md
index f5f956f0..8e57221f 100644
--- a/.claude/state/crew/slice-progress.md
+++ b/.claude/state/crew/slice-progress.md
@@ -1,6 +1,6 @@
 # Slice Progress
 
-Updated: 2026-08-19T06:11:37.200Z
+Updated: 2026-08-19T06:24:14.516Z
 
 Active plan: _(none detected)_
 
diff --git a/.claude/state/crew/workflow-state.json b/.claude/state/crew/workflow-state.json
index 7fd36b6a..2dfe72dd 100644
--- a/.claude/state/crew/workflow-state.json
+++ b/.claude/state/crew/workflow-state.json
@@ -1,14 +1,14 @@
 {
   "version": "1.0",
-  "updatedAt": "2026-08-19T05:57:18.961Z",
+  "updatedAt": "2026-08-19T06:28:14.482Z",
   "currentRun": {
     "title": "FEAT004 SLICE14: Command map application + dispatch-token rewrite",
     "goal": "",
     "mode": "autonomous",
     "status": "active",
     "startedAt": "2026-08-19T03:07:55.529Z",
-    "updatedAt": "2026-08-19T05:57:18.960Z",
-    "next": "Lead: decide disposition of crew:using-crew (routing-table.yaml line 62 -- no matching skill exists anywhere in the repo, likely dead content from the original dev-team subtree import) and crew:brief-me (commands/brief.md references a retired command name in prose). Both are cosmetic/content, not code-path bugs.",
+    "updatedAt": "2026-08-19T06:28:14.482Z",
+    "next": "P3 spike slice (unification-plan.md Sec 10-A): evaluate prompt-based hooks as the structural fix for the cold-start floor this slice's measurements expose. Separately, once the crew/scripts/lib -> src/scripts/lib merge slice lands, revisit physically relocating crew/hooks/*.mts into hooks/ root per the original ask (crew/tests/telemetry-hooks-json.test.mts will need its HOOKS_JSON_PATH updated in that same slice, not before).",
     "gates": {
       "review": null,
       "validation": null,
@@ -26,7 +26,10 @@
       "handoffs": [
         "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T032404Z-handoff-slice-14-command-map-application-structural-half.md",
         "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T040735Z-handoff-slice-14-fallout-fix-pass-devcrew-token-sweep-gaps-closed-al.md",
-        "C:\\work\\mega\\devcrew\\.claude\\artifacts\\crew\\handoffs\\20260819T055718Z-handoff-token-resolver-root-split-fix-crew-agents-commands-skills-mo.md"
+        "C:\\work\\mega\\devcrew\\.claude\\artifacts\\crew\\handoffs\\20260819T055718Z-handoff-token-resolver-root-split-fix-crew-agents-commands-skills-mo.md",
+        "C:\\work\\mega\\devcrew\\.claude\\artifacts\\crew\\handoffs\\20260819T062035Z-handoff-slice-18-models-yaml-model-router-single-source-design-merge.md",
+        "C:\\work\\mega\\devcrew\\.claude\\artifacts\\crew\\handoffs\\20260819T062758Z-handoff-slice-17-hooks-merge-matcher-scoped-consolidation.md",
+        "C:\\work\\mega\\devcrew\\.claude\\artifacts\\crew\\handoffs\\20260819T062814Z-handoff-slice-17-hooks-merge-matcher-scoped-consolidation.md"
       ],
       "reviewResult": null,
       "validationPlan": null,
diff --git a/.claude/state/grade-trend.json b/.claude/state/grade-trend.json
index df9d97e0..a2740fac 100644
--- a/.claude/state/grade-trend.json
+++ b/.claude/state/grade-trend.json
@@ -1,9 +1,5 @@
 {
   "scores": [
-    {
-      "sliceId": "SLICE-14",
-      "avg": 0.894
-    },
     {
       "sliceId": "SLICE-15",
       "avg": 0.894
@@ -11,6 +7,10 @@
     {
       "sliceId": "SLICE-16",
       "avg": 0.889
+    },
+    {
+      "sliceId": "SLICE-18",
+      "avg": 0.893
     }
   ],
   "consecutiveBelow": 0
diff --git a/crew/evals/lib/model-profile.mts b/crew/evals/lib/model-profile.mts
index 13ac52d1..dc75ba3f 100644
--- a/crew/evals/lib/model-profile.mts
+++ b/crew/evals/lib/model-profile.mts
@@ -54,8 +54,14 @@ export function validateModelsConfig(data: unknown): ModelsConfig {
     throw new ModelProfileError("models.yaml: root must be an object");
   }
   const cfg = data as Record<string, unknown>;
-  if (typeof cfg["version"] !== "string") {
-    throw new ModelProfileError("models.yaml: missing or invalid 'version'");
+  // Mirrors scripts/lib/models/schema.ts's ModelsConfigSchema version check
+  // (MAJOR.MINOR.PATCH) — enforced identically here so a malformed version
+  // string is rejected the same way by both validators. See
+  // tests/model-profile-schema-parity.test.mts for the guard.
+  if (typeof cfg["version"] !== "string" || !/^\d+\.\d+\.\d+$/.test(cfg["version"])) {
+    throw new ModelProfileError(
+      "models.yaml: missing or invalid 'version' (expected MAJOR.MINOR.PATCH)"
+    );
   }
   if (typeof cfg["default_profile"] !== "string") {
     throw new ModelProfileError("models.yaml: missing or invalid 'default_profile'");
diff --git a/tsconfig.json b/tsconfig.json
index dd6cc2db..3dfc18b1 100644
--- a/tsconfig.json
+++ b/tsconfig.json
@@ -22,7 +22,8 @@
     "noUncheckedIndexedAccess": true
   },
   "include": [
-    "src/scripts/**/*.mts"
+    "src/scripts/**/*.mts",
+    "hooks/**/*.mts"
   ],
   "exclude": [
     "node_modules",

```

## Files touched

### .claude-plugin/hooks/hooks.json

```
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh\" session_start"
          }
        ]
      },
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/version-check.mjs\"",
            "description": "loop:version-drift-warning",
            "timeout": 5
          }
        ]
      },
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/bootstrap-context.mjs\"",
            "description": "loop:bootstrap-context",
            "timeout": 5
          }
        ]
      },
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/emit-astrarunner-event.mjs\" session_start",
            "description": "runner:astrarunner-emit-session-start",
            "timeout": 5
          }
        ]
      }
    ],
    "TaskCreated": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh\" task_created"
          },
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/emit-astrarunner-event.mjs\" task_created",
            "description": "runner:astrarunner-emit-task-created",
            "timeout": 5
          }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh\" task_completed"
          },
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/emit-astrarunner-event.mjs\" task_completed",
            "description": "runner:astrarunner-emit-task-completed",
            "timeout": 5
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh\" subagent_start"
          },
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/subagent-start-profile.mts\""
          },
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/emit-astrarunner-event.mjs\" subagent_start",
            "description": "runner:astrarunner-emit-subagent-start",
            "timeout": 5
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh\" subagent_stop"
          },
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/otel-subagent-stop.mts\""
          },
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/check-reviewer-decision.mts\""
          },
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/check-builder-terminal-state.mts\""
          },
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/emit-astrarunner-event.mjs\" subagent_stop",
            "description": "runner:astrarunner-emit-subagent-stop",
            "timeout": 5
          },
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/capture-at-close.mjs\"",
            "description": "runner:capture-at-close-subagent-stop",
            "timeout": 8
          },
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/report-gate.mjs\"",
            "description": "runner:report-gate-subagent-stop",
            "timeout": 10
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/capture-at-close.mjs\"",
            "description": "runner:capture-at-close-session-end",
            "timeout": 8
          }
        ]
      }
    ],
    "TeammateIdle": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh\" teammate_idle"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash|PowerShell",
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/preflight-shell.mts\""
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/pre-tool-use-bash-gate.mts\""
          },
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/hooks/pre-push-gate.mts\"",
            "description": "devcrew:pre-push-gate (merges crew pre-push-verifier + runner pre-push-validate)"
          }
        ]
      },
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/check-redundant-read.mts\""
          }
        ]
      },
      {
        "matcher": "Agent",
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/pre-tool-use-agent.mts\""
          },
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/pre-tool-use-model-enforce.mts\""
          },
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/pre-tool-use-dispatch-size.mts\""
          },
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/guard-feat-dispatch.mjs\"",
            "description": "loop:feat-dispatch-guard"
          }
        ]
      },
      {
        "matcher": "TaskUpdate",
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/check-task-update-burst.mts\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/record-read-content.mts\""
          }
        ]
      },
      {
        "matcher": "Agent",
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/check-subagent-return.mts\""
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/post-tool-use-bash-gate.mts\""
          }
        ]
      },
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/record-edit.mts\""
          }
        ]
      },
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/otel-post-tool-use.mts\""
          },
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/checkpoint-cadence.mts\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/crew/hooks/otel-stop.mts\""
          }
        ]
      }
    ]
  }
}

```

### hooks/pre-push-gate.mts

```
#!/usr/bin/env bun
// PreToolUse hook on Bash. SLICE-17 merge of two independently-spawned
// push/commit gates that both fired on EVERY Bash call before this change:
//   - crew's pre-push-verifier.mts: blocking gate — requires a recent PASS
//     validation artifact before `git push`/`gh pr create` (default-OFF via
//     crew.json features["push-verify"]; docs-only pushes bypass).
//   - runner's src/scripts/pre-push-validate.mts: soft/non-blocking gate —
//     runs manifest + content-length + format:check + snapshot-freshness
//     warnings on `git commit`/`git push` (always-on, never blocks; CI is
//     the hard gate for these checks).
// Both scripts parsed the same stdin payload and independently no-op on
// every non-push/non-commit Bash call — i.e. two process spawns paid on
// EVERY Bash call to answer "is this a push?" twice. Merging into one
// process removes one spawn from the Bash PreToolUse chain (contributes to
// the SLICE-17 AC-4 <=150ms/Bash-call gate) with no behavior change: same
// two independent effects (soft warning + optional hard block) still fire
// off of the same command, just from a single process.
//
// Precedence when both would fire: crew's blocking decision wins (a hard
// block is a stronger signal than a soft warning) — matches what a human
// reading two simultaneous hook outputs would act on first. The soft
// warning is not swallowed: it is folded into the block's stderr message
// list, or emitted alone via the same systemMessage envelope the runner
// side used, when nothing blocks.
//
// Always exits 0 — failures never block Claude except the deliberate
// crew push-verify block decision below, which is opt-in itself.

import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { logHookError } from "../crew/hooks/hook-error.mjs";
import { readCrewConfig, isEnabled } from "../crew/scripts/lib/features-service.mjs";
import { parseFrontmatterBlock } from "../crew/scripts/lib/briefing/collect-cost-parser.mjs";
import { isDocsOnlyPush } from "../crew/scripts/lib/docs-only.mjs";
import { validateSnapshotFreshness } from "../src/scripts/validate-snapshot-freshness.mjs";

const CACHE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const srcScriptsDir = path.join(scriptDir, "..", "src", "scripts");

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

interface ParsedCommand {
  sessionId: string;
  command: string;
  cwd: string;
}

function parseInput(raw: string): ParsedCommand | null {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof obj["session_id"] === "string" &&
      typeof obj["cwd"] === "string" &&
      typeof obj["tool_input"] === "object" &&
      obj["tool_input"] !== null &&
      typeof (obj["tool_input"] as Record<string, unknown>)["command"] === "string"
    ) {
      return {
        sessionId: obj["session_id"] as string,
        command: (obj["tool_input"] as Record<string, unknown>)["command"] as string,
        cwd: obj["cwd"] as string
      };
    }
    return null;
  } catch {
    return null;
  }
}

function isPushCommand(command: string): boolean {
  const trimmed = command.trim();
  return /\bgit\s+push\b/.test(trimmed) || /\bgh\s+pr\s+create\b/.test(trimmed);
}

function isCommitCommand(command: string): boolean {
  return /\bgit\s+commit\b/.test(command.trim());
}

// Defect #1 fix (crew issue #164, carried over unchanged): PreToolUse's `cwd`
// field is the session's tracked working dir, which is the MAIN checkout even
// when the actual command changes into a git worktree first
// (`cd <worktree> && git push`). Parse a leading `cd <path>` segment off the
// command so path resolution below targets the directory the push actually
// runs from.
function resolveCommandCwd(command: string, sessionCwd: string): string {
  const cdMatch = command.match(/^\s*cd\s+("[^"]+"|'[^']+'|\S+)\s*(?:&&|;)/);
  if (!cdMatch) return sessionCwd;
  const rawTarget = (cdMatch[1] ?? "").replace(/^["']|["']$/g, "");
  if (rawTarget === "") return sessionCwd;
  return path.isAbsolute(rawTarget) ? rawTarget : path.resolve(sessionCwd, rawTarget);
}

function resolveGitWorktreeRoot(dir: string): string {
  try {
    const result = spawnSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      windowsHide: true
    });
    if (result.status === 0 && result.stdout.trim() !== "") {
      return result.stdout.trim();
    }
  } catch {
    // git not on PATH, or dir doesn't exist — fall back below
  }
  return dir;
}

function resolveTargetRepoRoot(command: string, sessionCwd: string): string {
  return resolveGitWorktreeRoot(resolveCommandCwd(command, sessionCwd));
}

async function isVerifyDisabledInDeployment(repoPath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(
      path.join(repoPath, ".claude", "crew", "deployment.md"),
      "utf8"
    );
    return /push\.verify:\s*false\b/i.test(content);
  } catch {
    return false;
  }
}

interface ValidationScan {
  hasPassed: boolean;
  scannedDir: string;
  windowFileCount: number;
  newestArtifactPath: string | null;
  newestDecision: string | null;
}

function resolveDecisionFromArtifactContent(content: string): {
  decision: string | null;
  isPass: boolean;
} {
  const fm = parseFrontmatterBlock(content);
  if (fm["decision"]) {
    const decision = fm["decision"].toLowerCase();
    return { decision, isPass: decision === "pass" };
  }
  const decisionMatch = content.match(/^[-\s]*Decision:\s*(\w+)/im);
  const decision = (decisionMatch?.[1] ?? "").toLowerCase() || null;
  return { decision, isPass: decision === "passed" || decision === "approved" };
}

async function scanValidationArtifacts(repoPath: string): Promise<ValidationScan> {
  const validationsDir = path.join(repoPath, ".claude", "artifacts", "crew", "validations");
  const cutoffMs = Date.now() - CACHE_WINDOW_MS;

  let entries: Dirent[];
  try {
    entries = await fs.readdir(validationsDir, { withFileTypes: true });
  } catch {
    return {
      hasPassed: false,
      scannedDir: validationsDir,
      windowFileCount: 0,
      newestArtifactPath: null,
      newestDecision: null
    };
  }

  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => path.join(validationsDir, e.name));
  mdFiles.sort((a, b) => b.localeCompare(a));

  let windowFileCount = 0;
  let newestArtifactPath: string | null = null;
  let newestDecision: string | null = null;

  for (const filePath of mdFiles) {
    let stat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stat = await fs.stat(filePath);
    } catch {
      continue;
    }
    if (stat.mtimeMs < cutoffMs) continue;
    windowFileCount++;

    let content: string;
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    const { decision, isPass } = resolveDecisionFromArtifactContent(content);
    if (newestArtifactPath === null) {
      newestArtifactPath = filePath;
      newestDecision = decision;
    }
    if (isPass) {
      return {
        hasPassed: true,
        scannedDir: validationsDir,
        windowFileCount,
        newestArtifactPath: filePath,
        newestDecision: decision
      };
    }
    continue;
  }

  return {
    hasPassed: false,
    scannedDir: validationsDir,
    windowFileCount,
    newestArtifactPath,
    newestDecision
  };
}

// runner side: soft manifest/content-length/format checks. Returns a warning
// string when a check fails, or null when everything passed (or nothing
// applicable ran). Never throws — mirrors pre-push-validate.mts's
// always-exit-0 contract.
//
// Deliberately does NOT pass `cwd` to the spawned checks below — matches
// pre-push-validate.mts's original behavior exactly (inherits the hook
// process's own cwd rather than the git-resolved `repoRoot`). Passing
// `repoRoot` here regressed on Windows: `git rev-parse --show-toplevel`
// under git-bash returns a POSIX-style path (`/c/work/...`), and handing
// that to execFileSync's `cwd` broke the win32 `cmd.exe` shell spawn
// (`ENOENT ... cmd.exe`) — caught during the SLICE-17 standalone hook
// smoke test. `repoRoot` is still used below for the git-resolved
// process.cwd() passed to validateSnapshotFreshness, which takes a path
// argument directly rather than a spawn `cwd` option.
async function runSoftChecks(command: string, repoRoot: string): Promise<string | null> {
  const isPush = isPushCommand(command);
  const isCommit = isCommitCommand(command);
  if (!isPush && !isCommit) return null;

  try {
    execFileSync("bun", [path.join(srcScriptsDir, "validate-manifests.mts")], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32"
    });

    if (isPush) {
      execFileSync("bun", [path.join(srcScriptsDir, "validate-content-length.mts")], {
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32"
      });
      execFileSync("bun", ["run", "format:check"], {
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32"
      });
      const freshness = await validateSnapshotFreshness(repoRoot).catch(() => ({
        ok: true,
        errors: [] as string[]
      }));
      if (!freshness.ok) {
        return `snapshot-freshness drift:\n${freshness.errors.map((e) => `  ${e}`).join("\n")}`;
      }
    }
    return null;
  } catch (e) {
    const err = e as { stderr?: string; message?: string };
    const detail = (err.stderr || err.message || "unknown").toString().trim();
    return detail;
  }
}

// crew side: blocking push-verify gate. Returns a block-reason string when
// the push should be blocked, or null when it's allowed (feature disabled,
// cache hit, docs-only bypass, or opt-out).
async function runBlockingPushVerify(command: string, repoRoot: string): Promise<string | null> {
  if (process.env["CREW_PUSH_VERIFY"] === "0") return null;
  if (!isPushCommand(command)) return null;

  const config = await readCrewConfig(repoRoot);
  if (!isEnabled("push-verify", config)) return null;
  if (await isVerifyDisabledInDeployment(repoRoot)) return null;

  const scan = await scanValidationArtifacts(repoRoot);
  if (scan.hasPassed) return null;

  if (await isDocsOnlyPush(repoRoot)) {
    process.stderr.write(
      "[devcrew:pre-push-gate] docs-only push — validation skipped " +
        "(no runtime surface; #163 quick-win lane).\n"
    );
    return null;
  }

  const artifactHint =
    scan.windowFileCount === 0
      ? `\n  Scanned: ${scan.scannedDir}` +
        `\n  No validation artifacts (*.md) found within the last hour.`
      : `\n  Scanned: ${scan.scannedDir}` +
        `\n  ${scan.windowFileCount} validation artifact(s) found within the last hour.` +
        `\n  Newest artifact (decision=${scan.newestDecision ?? "unparsed"}): ${scan.newestArtifactPath}`;

  return (
    `[devcrew:pre-push-gate] Push blocked — no PASS validation within the last hour.` +
    artifactHint +
    `\n  Note: this blocks the ENTIRE command as submitted, including any` +
    `\n  non-push steps chained before/after it (e.g. \`cp x && git push\` blocks the cp too).` +
    `\n  Run /devcrew:ship (dispatches devcrew:verifier + QA before pushing) or` +
    `\n  dispatch devcrew:verifier manually, then retry the push.` +
    `\n  To disable this gate: set features["push-verify"].enabled=false in .claude/crew.json` +
    `\n  or run \`! CREW_PUSH_VERIFY=0 git push\` directly in your terminal.`
  );
}

async function main(): Promise<void> {
  const raw = await readStdin();
  const input = parseInput(raw);
  if (input === null) return;
  if (!isPushCommand(input.command) && !isCommitCommand(input.command)) return;

  const repoRoot = resolveTargetRepoRoot(input.command, input.cwd);

  const [softWarning, blockReason] = await Promise.all([
    runSoftChecks(input.command, repoRoot),
    runBlockingPushVerify(input.command, repoRoot)
  ]);

  if (blockReason !== null) {
    const message = softWarning
      ? `${blockReason}\n\n  Additional (non-blocking) check output:\n${softWarning}`
      : blockReason;
    process.stderr.write(message + "\n");
    process.stdout.write(JSON.stringify({ decision: "block", reason: message }) + "\n");
    return;
  }

  if (softWarning !== null) {
    const systemMessage = `devcrew pre-push validation warning (soft block — command proceeds, CI will enforce):\n${softWarning}`;
    process.stdout.write(
      JSON.stringify({ continue: true, suppressOutput: true, systemMessage }) + "\n"
    );
  }
}

main().catch(async (err) => {
  await logHookError(process.cwd(), "pre-push-gate", err);
  process.exit(0);
});

```

### tsconfig.json

```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "declaration": false,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "types": [
      "node"
    ],
    "noImplicitAny": true,
    "useUnknownInCatchVariables": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  },
  "include": [
    "src/scripts/**/*.mts",
    "hooks/**/*.mts"
  ],
  "exclude": [
    "node_modules",
    ".claude",
    "docs",
    "dist",
    "src/tests"
  ]
}
```

## Files read

