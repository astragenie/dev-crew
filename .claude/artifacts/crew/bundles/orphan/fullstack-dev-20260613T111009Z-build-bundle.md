---
slice: unknown
builder: fullstack-dev
run_id: 20260613T111009Z
feat: FEAT-100
files_touched: [".claude-plugin/hooks/hooks.json", "hooks/bootstrap-context.mjs", "src/tests/bootstrap-context.test.mts"]
files_read: []
diff_stat: { files: 1, additions: 0, deletions: 78 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: FEAT-100/SLICE-117: SessionStart bootstrap-context hook

- Created: 2026-06-13T11:10:09.542Z
- From: fullstack-dev
- To: lead
- Objective: Added hooks/bootstrap-context.mjs (30-line static HARD RULES summary) and registered it as second SessionStart entry in hooks.json; 5 tests all pass, TSC clean, no new lint warnings.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - hooks/bootstrap-context.mjs
  - .claude-plugin/hooks/hooks.json
  - src/tests/bootstrap-context.test.mts
- Confidence: high
- Risks: Pre-existing retriage-command.test.mts failure (1 test) is unrelated to this slice — affects commands/retriage.md content assertion, not touched here.
- Suggested Next Handoff: Dispatch crew:inspector (Reviewer A + B) for FEAT-100/SLICE-117; then crew:verifier; then /loop:slice complete --id SLICE-117


## Diff

```diff
diff --git a/.claude/artifacts/loop/backlog/triaged/FEAT-100.md b/.claude/artifacts/loop/backlog/triaged/FEAT-100.md
deleted file mode 100644
index b7d8ede..0000000
--- a/.claude/artifacts/loop/backlog/triaged/FEAT-100.md
+++ /dev/null
@@ -1,78 +0,0 @@
----
-id: FEAT-100
-status: triaged
-priority: P2
-category: competitor-gap
-target_release: null
-created: 2026-06-08
-updated: 2026-06-08
-depends_on: []
-slices: []
-derived_from: null
-composite_score: 6
-source_competitors: [superpowers]
-autonomous_safe: false
-tags: [session-init, hooks, context-injection]
-needs_contract: false
-needs_ux: false
-pm_customer_impact: 0.45
-pm_effort_estimate: 0.4
-pm_strategic_alignment: 0.7
-pm_technical_risk: 0.35
-pm_dependency_depth: 0.1
-triage_notes: "Composite 6. SessionStart hook that injects bootstrap context before any user turn. Near-exact duplicate of FEAT-132. hooks/hooks.json and hooks/session-start already exist in the repo (referenced in FEAT-100). The gap is a loop-specific injection of CLAUDE.md rules at session start. Medium-high strategic alignment — SLICE-81 grade shows context loss risk in long sessions. autonomousSafe: false — modifying hooks/ affects every session; needs architect review for safe injection."
-github_issue: 176
-github_milestone: null
-github_url: "https://github.com/sergeymilashico/loop/issues/176"
----
-# FEAT-100: SessionStart hook that injects bootstrap context before any user turn
-
-## Source
-
-Competitor gap audit (2026-05-28). Surfaced by:
-- superpowers
-
-## Description
-
-Superpowers uses a SessionStart hook to inject the full using-superpowers skill content before the first user message, ensuring rules are present even after context compaction. loop/crew rely on CLAUDE.md being read at session start, which is less reliable in long or compacted sessions.
-
-## PM Scoring
-
-```json
-{
-  "featureId": "FEAT-100",
-  "scores": {
-    "customer_impact": 0.45,
-    "effort_estimate": 0.40,
-    "strategic_alignment": 0.70,
-    "technical_risk": 0.35,
-    "dependency_depth": 0.10
-  },
-  "compositePriority": "P2",
-  "autonomousSafe": false,
-  "demandEvidence": "none — inferred from superpowers audit. Context compaction in long sessions (marathonMode: true) is a real risk; hooks/ directory already exists in the repo.",
-  "scopeNotes": "Near-exact duplicate of FEAT-132. The hooks/ directory already exists. Minimum: add a session-start hook entry to hooks/hooks.json that injects a compact loop rules summary (not the full CLAUDE.md). Must keep injection small to avoid consuming context budget.",
-  "risks": [
-    "Near-exact duplicate of FEAT-132",
-    "Injecting full CLAUDE.md at every session start would consume significant context budget",
-    "hooks/hooks.json changes affect every Claude Code session — blast radius is wide",
-    "Interaction with Claude Code's native MEMORY.md injection needs to be understood"
-  ],
-  "reasoning": "P2: real session-compaction risk in marathonMode; hooks/ infrastructure exists; but full injection risks context budget overconsumption."
-}
-```
-
-## Scoring
-
-- Impact: 2
-- Effort: 2
-- Fit: 3
-- Composite: 6 / 9
-
-## References
-
-- hooks/session-start, hooks/hooks.json
-
-## Consider rejecting because
-
-Near-exact duplicate of FEAT-132. Claude Code already reads CLAUDE.md at session start natively. A redundant injection via hooks could double the context cost of loading project rules. If the concern is long-session context compaction, a more targeted solution would be a compact loop-rules-summary.md (< 200 tokens) rather than the full CLAUDE.md.

```

## Files touched

### .claude-plugin/hooks/hooks.json

```
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PLUGIN_ROOT}/src/scripts/pre-push-validate.mts\"",
            "timeout": 30
          }
        ]
      },
      {
        "matcher": "Agent",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/guard-feat-dispatch.mjs\"",
            "description": "loop:feat-dispatch-guard"
          }
        ]
      }
    ],
    "SessionStart": [
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
      }
    ]
  }
}

```

### hooks/bootstrap-context.mjs

```
#!/usr/bin/env node
// SessionStart hook: inject compact loop HARD RULES bootstrap context.
//
// Purpose: Ensures the six highest-leverage loop HARD RULE reminders
// survive context compaction in long marathonMode: true sessions.
// Content sourced from .claude/loop/rules.md (static copy — no filesystem read).
//
// Fail-open contract: any error exits silently with code 0.
// Never blocks session start.
//
// Token budget: BOOTSTRAP_SUMMARY must not exceed 60 lines / ~150 tokens.
// Format: stdout plaintext block consumed by Claude Code as additionalContext.

const BOOTSTRAP_SUMMARY = `--- loop bootstrap context ---
HARD RULES — read .claude/loop/rules.md for the full set.

1. Run until PASS. Do not stop for confirmation. Stop only when every
   acceptance criterion is PASS with evidence, or the work is externally
   blocked (escalated_to_human, cost cap exceeded, warn-severity alerts).

2. autoMode (marathonMode: true): never raise per-slice approval gates.
   Pick architect recs and proceed. Do not paraphrase the approval gate
   as a chat question.

3. Slice ceremony is mandatory. Every slice MUST use:
     /loop:slice start --id SLICE-NNN
   AND on completion:
     /loop:slice complete --id SLICE-NNN
   No slice may skip either ceremony step.

4. Dispatch discipline. Implementation goes to crew:builder subagent only.
   Never implement inline except trivial single-line fixups.
   Parent loop dispatches crew:inspector then crew:verifier after builder.

5. Stop signals (auto mode): escalated_to_human | cost cap exceeded |
   warn-severity pattern alerts | external blocker. Backlog exhaustion ends
   the walk gracefully. Everything else: continue.

6. First action when starting the loop:
     read .claude/loop/rules.md
     → docs/ai-loop/00-entry/MASTER_PROMPT.md
     → docs/ai-loop/backlog/approved-slices.md
--- end loop bootstrap context ---
`;

try {
  process.stdout.write(BOOTSTRAP_SUMMARY);
  process.exit(0);
} catch {
  process.exit(0);
}

```

### src/tests/bootstrap-context.test.mts

```
import { test } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

// Resolve paths relative to the repo root (two levels up from src/tests/)
const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const HOOK_SCRIPT = path.join(REPO_ROOT, "hooks", "bootstrap-context.mjs");
const HOOKS_JSON = path.join(REPO_ROOT, ".claude-plugin", "hooks", "hooks.json");

// Test 1 — Happy path: exits 0 and writes non-empty stdout containing fencing
test("bootstrap-context hook exits 0 and writes non-empty stdout", () => {
  const result = spawnSync("node", [HOOK_SCRIPT], { encoding: "utf8" });
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}; stderr: ${result.stderr}`);
  assert.ok(result.stdout.length > 0, "stdout must not be empty");
  assert.ok(
    result.stdout.includes("loop bootstrap context"),
    `stdout must include "loop bootstrap context"; got: ${result.stdout.slice(0, 200)}`
  );
});

// Test 2 — Output is within token budget (line count <= 65)
test("bootstrap-context hook output stays within line budget", () => {
  const result = spawnSync("node", [HOOK_SCRIPT], { encoding: "utf8" });
  assert.equal(result.status, 0);
  const lines = result.stdout.split("\n");
  assert.ok(
    lines.length <= 65,
    `line count ${lines.length} exceeds budget of 65`
  );
});

// Test 3 — Output contains all six key HARD RULE reminder topics
test("bootstrap-context hook output covers all six required topics", () => {
  const result = spawnSync("node", [HOOK_SCRIPT], { encoding: "utf8" });
  assert.equal(result.status, 0);
  const stdout = result.stdout;

  assert.ok(stdout.includes("Run until PASS"), 'must include "Run until PASS"');
  assert.ok(
    stdout.toLowerCase().includes("automode") || stdout.includes("auto mode") || stdout.includes("autoMode"),
    'must include "autoMode" or "auto mode"'
  );
  assert.ok(
    stdout.includes("slice start") || stdout.includes("/loop:slice start"),
    'must include "slice start"'
  );
  assert.ok(stdout.includes("crew:builder"), 'must include "crew:builder"');
  assert.ok(stdout.includes("escalated_to_human"), 'must include "escalated_to_human"');
  assert.ok(stdout.includes("rules.md"), 'must include "rules.md"');
});

// Test 4 — Fail-open: exits 0 even when stdout is closed (write fails)
test("bootstrap-context hook exits 0 when stdout is ignored", () => {
  const result = spawnSync("node", [HOOK_SCRIPT], {
    encoding: "utf8",
    stdio: ["pipe", "ignore", "pipe"]
  });
  assert.equal(
    result.status,
    0,
    `expected exit 0 with closed stdout, got ${result.status}; stderr: ${result.stderr}`
  );
});

// Test 5 — hooks.json registers the new hook entry correctly
test("hooks.json has two SessionStart entries with correct bootstrap-context config", () => {
  const raw = readFileSync(HOOKS_JSON, "utf8");
  const config = JSON.parse(raw) as {
    hooks: { SessionStart: Array<{ hooks: Array<{ type: string; command: string; description: string; timeout: number }> }> };
  };

  const sessionStart = config.hooks.SessionStart;
  assert.equal(sessionStart.length, 2, `expected 2 SessionStart entries, got ${sessionStart.length}`);

  const second = sessionStart[1];
  assert.ok(
    second.hooks[0].command.includes("bootstrap-context.mjs"),
    `second entry command must include "bootstrap-context.mjs"; got: ${second.hooks[0].command}`
  );
  assert.equal(second.hooks[0].description, "loop:bootstrap-context");
  assert.equal(second.hooks[0].timeout, 5);
});

```

## Files read

