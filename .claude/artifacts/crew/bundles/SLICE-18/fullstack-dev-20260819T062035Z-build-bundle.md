---
slice: SLICE-18
builder: fullstack-dev
run_id: 20260819T062035Z
feat: FEAT-004
files_touched: ["crew/evals/lib/model-profile.mts", "crew/tests/model-profile-schema-parity.test.mts"]
files_read: []
diff_stat: { files: 3, additions: 193, deletions: 40 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-18: models.yaml/model-router single-source design merge

- Created: 2026-08-19T06:20:35.183Z
- From: fullstack-dev
- To: lead
- Objective: Scoped-down from the literal task after investigation. crew/models.yaml is already the single source for its two real consumers (apply-model-profile.mts, evals/model-profile.mts) -- no relocation needed; validate-configs.mts already documents (line 44) that models.yaml deliberately stays under crew/ REPO_ROOT, not the monorepo root, per resolve-token.mts's TokenResolverRoots split. The literal keep-in-sync pair the unification-plan bullet actually points at is src/scripts/lib/model-router.mts (runner side) vs crew/scripts/lib/models/resolve-model.mts (crew side) -- both explicitly say keep-in-sync in their comments. A full file merge of that pair is unsafe within this slice: crew/hooks/pre-tool-use-model-enforce.mts and crew/hooks/lib/model-routing-enforce.mts import resolve-model.mjs directly (forbidden hooks/ zone, reserved for SLICE-17), and crew/ is still a fully separate npm/tsc project (own tsconfig.json with a scoped include list, own package.json/deps, own TS 6.0.3 vs root TS 7.0.0, tests run via cd crew) so importing model-router.mts across that boundary risks silently breaking crew's own tsc gate ahead of the larger crew-to-root absorption program other parallel slices are already running. Delivered instead: a real, safe, single-source-of-truth fix within crew/models.yaml's system -- found and fixed an actual undetected divergence where evals/lib/model-profile.mts's hand-rolled validateModelsConfig accepted any string as version while scripts/lib/models/schema.mts's Zod ModelsConfigSchema requires MAJOR.MINOR.PATCH; tightened the hand-rolled check to match, and added crew/tests/model-profile-schema-parity.test.mts (11 fixture cases) asserting the two validators agree on every case, closing the silent-drift gap that model-tiers-parity.test.mts left uncovered (it only guarded the tier-NAME list, not the full validation contract).
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - crew/evals/lib/model-profile.mts
  - crew/tests/model-profile-schema-parity.test.mts
- Confidence: medium
- Risks: The larger model-router.mts/resolve-model.mts merge (the pairing the unification-plan bullet literally names) is still open and remains real drift risk -- recommend a dedicated follow-up slice scoped to run AFTER crew/ is absorbed into the monorepo root (so hooks/ and tsc-project boundaries are no longer split), or alternatively scoped explicitly to include hooks/ edits and assigned after SLICE-17 completes.
- Suggested Next Handoff: Follow-up slice: once crew/hooks/* and crew/scripts/lib/models/resolve-model.mts share a package/tsc project with src/scripts/lib/model-router.mts, delete resolve-model.mts and repoint crew.mts + both hook files at the canonical model-router.mts (generalizing resolveWaveDispatchModel into a resolveDispatchModel(phase, shape, config, routingEnabled) export first, verified against both existing test suites for behavioral equivalence).


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
diff --git a/.claude/state/crew/workflow-state.json b/.claude/state/crew/workflow-state.json
index 7fd36b6a..a7529c24 100644
--- a/.claude/state/crew/workflow-state.json
+++ b/.claude/state/crew/workflow-state.json
@@ -1,14 +1,14 @@
 {
   "version": "1.0",
-  "updatedAt": "2026-08-19T05:57:18.961Z",
+  "updatedAt": "2026-08-19T06:20:35.186Z",
   "currentRun": {
     "title": "FEAT004 SLICE14: Command map application + dispatch-token rewrite",
     "goal": "",
     "mode": "autonomous",
     "status": "active",
     "startedAt": "2026-08-19T03:07:55.529Z",
-    "updatedAt": "2026-08-19T05:57:18.960Z",
-    "next": "Lead: decide disposition of crew:using-crew (routing-table.yaml line 62 -- no matching skill exists anywhere in the repo, likely dead content from the original dev-team subtree import) and crew:brief-me (commands/brief.md references a retired command name in prose). Both are cosmetic/content, not code-path bugs.",
+    "updatedAt": "2026-08-19T06:20:35.186Z",
+    "next": "Follow-up slice: once crew/hooks/* and crew/scripts/lib/models/resolve-model.mts share a package/tsc project with src/scripts/lib/model-router.mts, delete resolve-model.mts and repoint crew.mts + both hook files at the canonical model-router.mts (generalizing resolveWaveDispatchModel into a resolveDispatchModel(phase, shape, config, routingEnabled) export first, verified against both existing test suites for behavioral equivalence).",
     "gates": {
       "review": null,
       "validation": null,
@@ -26,7 +26,8 @@
       "handoffs": [
         "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T032404Z-handoff-slice-14-command-map-application-structural-half.md",
         "C:\\mega\\dev-crew\\.claude\\artifacts\\crew\\handoffs\\20260819T040735Z-handoff-slice-14-fallout-fix-pass-devcrew-token-sweep-gaps-closed-al.md",
-        "C:\\work\\mega\\devcrew\\.claude\\artifacts\\crew\\handoffs\\20260819T055718Z-handoff-token-resolver-root-split-fix-crew-agents-commands-skills-mo.md"
+        "C:\\work\\mega\\devcrew\\.claude\\artifacts\\crew\\handoffs\\20260819T055718Z-handoff-token-resolver-root-split-fix-crew-agents-commands-skills-mo.md",
+        "C:\\work\\mega\\devcrew\\.claude\\artifacts\\crew\\handoffs\\20260819T062035Z-handoff-slice-18-models-yaml-model-router-single-source-design-merge.md"
       ],
       "reviewResult": null,
       "validationPlan": null,
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

```

## Files touched

### crew/evals/lib/model-profile.mts

```
/**
 * evals/lib/model-profile.ts — resolves the live candidate's dispatch model
 * from models.yaml when CREW_MODEL_PROFILE is set.
 * Module boundary: MUST NOT import from agents/, scripts/, src/, hooks/, commands/
 * (mirrors every sibling file in evals/lib/) — this duplicates a small amount
 * of validation that scripts/lib/models/schema.ts also does via Zod; evals/
 * does not depend on zod today, so this file validates by hand instead of
 * importing that schema across the module boundary.
 *
 * FEAT-crew-architecture-review Section 7, Decision 4.
 *
 * No behavior change when CREW_MODEL_PROFILE is unset: resolveCandidateModel
 * falls through to the pre-existing `candidateCfg.model ?? DEFAULT_CANDIDATE_MODEL`
 * path used by evals/lib/run-eval.ts before this file existed.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

/** Matches evals/lib/candidate-dispatch.ts's own DEFAULT_MODEL literal. */
export const DEFAULT_CANDIDATE_MODEL = "claude-sonnet-4-6";

/**
 * Tier list — MUST stay identical to MODEL_TIERS in scripts/lib/models/schema.ts
 * (hand-duplicated across the evals/ package boundary on purpose; parity is
 * enforced by tests/model-tiers-parity.test.ts).
 */
export const TIERS = ["reasoning", "standard", "light"] as const;
export type ModelTier = (typeof TIERS)[number];

export interface ModelProfile {
  reasoning: string;
  standard: string;
  light: string;
}

export interface ModelsConfig {
  version: string;
  default_profile: string;
  profiles: Record<string, ModelProfile>;
}

export class ModelProfileError extends Error {}

function isModelProfile(value: unknown): value is ModelProfile {
  if (typeof value !== "object" || value === null) return false;
  return TIERS.every((tier) => typeof (value as Record<string, unknown>)[tier] === "string");
}

/** Validates raw YAML-decoded models.yaml data. Throws ModelProfileError on shape mismatch. */
export function validateModelsConfig(data: unknown): ModelsConfig {
  if (typeof data !== "object" || data === null) {
    throw new ModelProfileError("models.yaml: root must be an object");
  }
  const cfg = data as Record<string, unknown>;
  // Mirrors scripts/lib/models/schema.ts's ModelsConfigSchema version check
  // (MAJOR.MINOR.PATCH) — enforced identically here so a malformed version
  // string is rejected the same way by both validators. See
  // tests/model-profile-schema-parity.test.mts for the guard.
  if (typeof cfg["version"] !== "string" || !/^\d+\.\d+\.\d+$/.test(cfg["version"])) {
    throw new ModelProfileError(
      "models.yaml: missing or invalid 'version' (expected MAJOR.MINOR.PATCH)"
    );
  }
  if (typeof cfg["default_profile"] !== "string") {
    throw new ModelProfileError("models.yaml: missing or invalid 'default_profile'");
  }
  if (typeof cfg["profiles"] !== "object" || cfg["profiles"] === null) {
    throw new ModelProfileError("models.yaml: missing or invalid 'profiles'");
  }
  const profiles = cfg["profiles"] as Record<string, unknown>;
  for (const [name, profile] of Object.entries(profiles)) {
    if (!isModelProfile(profile)) {
      throw new ModelProfileError(
        `models.yaml: profile "${name}" must define all tiers: ${TIERS.join(", ")}`
      );
    }
  }
  if (!(cfg["default_profile"] in profiles)) {
    throw new ModelProfileError(
      `models.yaml: default_profile "${String(cfg["default_profile"])}" is not present in 'profiles'`
    );
  }
  return {
    version: cfg["version"],
    default_profile: cfg["default_profile"],
    profiles: profiles as Record<string, ModelProfile>
  };
}

const configCache = new Map<string, ModelsConfig>();

export async function loadModelsConfig(repoRoot: string): Promise<ModelsConfig> {
  const key = path.resolve(repoRoot);
  const cached = configCache.get(key);
  if (cached) return cached;
  const raw = await fs.readFile(path.join(repoRoot, "models.yaml"), "utf8");
  const config = validateModelsConfig(parseYaml(raw));
  configCache.set(key, config);
  return config;
}

/** Test seam: drops memoized models.yaml parses (config is immutable per run otherwise). */
export function clearModelsConfigCache(): void {
  configCache.clear();
}

/** Resolves a single tier value for a named profile. Throws ModelProfileError on an unknown profile name. */
export function resolveProfileTier(config: ModelsConfig, profileName: string, tier: ModelTier = "standard"): string {
  const profile = config.profiles[profileName];
  if (!profile) {
    throw new ModelProfileError(
      `Unknown model profile "${profileName}" (CREW_MODEL_PROFILE). Known profiles: ${Object.keys(config.profiles).join(", ")}`
    );
  }
  return profile[tier];
}

/**
 * Resolves the model string for a live candidate dispatch.
 *
 * Resolution order (highest wins):
 * 1. `CREW_CANDIDATE_MODEL` — direct model override, no models.yaml read.
 * 2. `CREW_MODEL_PROFILE` — loads models.yaml (memoized) and resolves that
 *    profile's "standard" tier, OVERRIDING any `candidate.model` in the eval
 *    spec — the point of the env var is swapping every candidate's model from
 *    one place for cross-provider / profile testing without hand-editing
 *    every yaml.
 * 3. Neither set: identical to the pre-Decision-4 behavior —
 *    `candidateCfg.model ?? DEFAULT_CANDIDATE_MODEL`. models.yaml is never
 *    read in this path.
 */
export async function resolveCandidateModel(
  repoRoot: string,
  candidateCfg: { model?: string } | undefined,
  env: NodeJS.ProcessEnv = process.env
): Promise<string> {
  const directOverride = env["CREW_CANDIDATE_MODEL"];
  if (directOverride) return directOverride;
  const profileName = env["CREW_MODEL_PROFILE"];
  if (!profileName) {
    return candidateCfg?.model ?? DEFAULT_CANDIDATE_MODEL;
  }
  const config = await loadModelsConfig(repoRoot);
  return resolveProfileTier(config, profileName, "standard");
}

```

### crew/tests/model-profile-schema-parity.test.mts

```
// tests/model-profile-schema-parity.test.mts — SLICE-18 hardening.
//
// crew/models.yaml is the single source of truth for the tier-profile map
// (Decision 4). It has exactly two real readers: scripts/apply-model-profile.ts
// (via scripts/lib/models/schema.ts's Zod ModelsConfigSchema) and
// evals/lib/model-profile.ts (via a hand-rolled validateModelsConfig — the
// evals/ package boundary forbids importing scripts/lib or adding a zod
// dependency; see model-profile.mts's file-level doc comment).
//
// model-tiers-parity.test.mts already guards that the two files' *tier name
// lists* (MODEL_TIERS vs TIERS) never drift. It does NOT guard that the two
// files' *validation rules* (what counts as a well-formed models.yaml) agree
// — schema.ts's ModelsConfigSchema could grow a new required field or tighten
// a check and evals/lib/model-profile.ts would silently keep accepting the
// old shape, or vice versa. This file closes that gap: one fixture battery,
// asserted accept/reject-identical against both validators. Same enforcement
// pattern as model-tiers-parity.test.mts, extended from "tier names" to "the
// full accept/reject contract" — this is the single-source-of-truth guarantee
// for models.yaml made real, not just documented in a comment.
import { test } from "bun:test";
import assert from "node:assert/strict";
import { ModelsConfigSchema } from "../scripts/lib/models/schema.mjs";
import { validateModelsConfig, ModelProfileError } from "../evals/lib/model-profile.mjs";

function zodAccepts(data: unknown): boolean {
  return ModelsConfigSchema.safeParse(data).success;
}

function handRolledAccepts(data: unknown): boolean {
  try {
    validateModelsConfig(data);
    return true;
  } catch (err) {
    if (err instanceof ModelProfileError) return false;
    throw err;
  }
}

const VALID_ONE_PROFILE = {
  version: "1.0.0",
  default_profile: "claude",
  profiles: {
    claude: { reasoning: "opus", standard: "sonnet", light: "haiku" }
  }
};

const VALID_TWO_PROFILES = {
  version: "2.3.1",
  default_profile: "other",
  profiles: {
    claude: { reasoning: "opus", standard: "sonnet", light: "haiku" },
    other: { reasoning: "reasoning-model", standard: "standard-model", light: "light-model" }
  }
};

const FIXTURES: Array<{ name: string; data: unknown; expectAccept: boolean }> = [
  { name: "well-formed, single profile", data: VALID_ONE_PROFILE, expectAccept: true },
  { name: "well-formed, multiple profiles", data: VALID_TWO_PROFILES, expectAccept: true },
  { name: "non-object root (string)", data: "not an object", expectAccept: false },
  { name: "non-object root (null)", data: null, expectAccept: false },
  {
    name: "missing version",
    data: { default_profile: "claude", profiles: { claude: VALID_ONE_PROFILE.profiles.claude } },
    expectAccept: false
  },
  {
    name: "missing default_profile",
    data: { version: "1.0.0", profiles: { claude: VALID_ONE_PROFILE.profiles.claude } },
    expectAccept: false
  },
  {
    name: "missing profiles",
    data: { version: "1.0.0", default_profile: "claude" },
    expectAccept: false
  },
  {
    name: "default_profile not present in profiles",
    data: {
      version: "1.0.0",
      default_profile: "ghost",
      profiles: { claude: VALID_ONE_PROFILE.profiles.claude }
    },
    expectAccept: false
  },
  {
    name: "profile missing a tier (light)",
    data: {
      version: "1.0.0",
      default_profile: "claude",
      profiles: { claude: { reasoning: "opus", standard: "sonnet" } }
    },
    expectAccept: false
  },
  {
    name: "profile with a non-string tier value",
    data: {
      version: "1.0.0",
      default_profile: "claude",
      profiles: { claude: { reasoning: "opus", standard: "sonnet", light: 42 } }
    },
    expectAccept: false
  },
  {
    name: "non-semver version string",
    data: {
      version: "not-semver",
      default_profile: "claude",
      profiles: { claude: VALID_ONE_PROFILE.profiles.claude }
    },
    expectAccept: false
  }
];

for (const fixture of FIXTURES) {
  test(`schema.ts and model-profile.ts agree: ${fixture.name}`, () => {
    const zod = zodAccepts(fixture.data);
    const handRolled = handRolledAccepts(fixture.data);
    assert.equal(zod, fixture.expectAccept, `ModelsConfigSchema for "${fixture.name}"`);
    assert.equal(handRolled, fixture.expectAccept, `validateModelsConfig for "${fixture.name}"`);
    assert.equal(zod, handRolled, `schema.ts and model-profile.ts diverged on "${fixture.name}"`);
  });
}

```

## Files read

