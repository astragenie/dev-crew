#!/usr/bin/env node
// @bun

// crew/hooks/pre-tool-use-model-enforce.mts
import fs3 from "fs/promises";
import path3 from "path";

// crew/hooks/hook-error.mts
import fs from "fs/promises";
import path from "path";
async function logHookError(repoPath, hookName, error) {
  try {
    const dir = path.join(repoPath, ".claude", "logs");
    await fs.mkdir(dir, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      type: "hook_error",
      hook: hookName,
      error: String(error)
    });
    await fs.appendFile(path.join(dir, "events.jsonl"), line + `
`, "utf8");
  } catch {}
}

// crew/scripts/lib/features-service.mts
import fs2 from "fs/promises";
import path2 from "path";
var FEATURES = {
  "cost-hygiene": {
    version: "2.1.0",
    default: true,
    description: "Umbrella telemetry: read/edit tracking, redundant-read warn, TaskUpdate burst detection.",
    scope: "crew",
    owner: "platform",
    since: "0.38.0"
  },
  "redundant-read-stop": {
    version: "1.1.0",
    default: true,
    description: "Warn the agent when re-reading a file with identical content. Gates the warn-emit only; recording still happens under cost-hygiene.",
    scope: "crew",
    owner: "platform",
    since: "0.33.0"
  },
  "shell-preflight": {
    version: "2.1.0",
    default: true,
    description: "Pre-Bash hook: warn on $env: syntax, redirect anti-patterns, etc.",
    scope: "crew",
    owner: "safety",
    since: "0.33.11"
  },
  "subagent-inline-warn": {
    version: "2.1.0",
    default: true,
    description: "Warn when a subagent returns a large body without an artifact path. Threshold knob: features['subagent-inline-warn'].threshold (bytes, default 512).",
    scope: "crew",
    owner: "platform",
    since: "0.33.0"
  },
  "push-verify": {
    version: "1.0.0",
    default: false,
    description: "Gate git push and gh pr create behind a PASS validation artifact written within the last hour. Opt out per-repo via deployment.md `push.verify: false`. Enable via crew.json features['push-verify'].enabled=true.",
    scope: "crew",
    owner: "safety",
    since: "0.46.1"
  },
  "git-gate-block": {
    version: "1.0.0",
    default: false,
    description: "Enforcement level of the repo-side commit/PR gate hook (check_git_gate.sh). Default false = warn (advisory systemMessage on pending badges); flips to block (decision:block) after a 1-week bake. Guardrail: this flag may only soften block\u2192warn, never silence the gate.",
    scope: "shared",
    owner: "safety",
    since: "0.48.0"
  },
  "otel-telemetry": {
    version: "1.0.0",
    default: true,
    description: "Wraps the otel-post-tool-use / otel-stop / otel-subagent-stop hooks. Independent of the existing telemetry-config opt-in gate (cfg.enabled + CREW_OTEL_ENABLED) \u2014 both must pass for a span to emit.",
    scope: "crew",
    owner: "platform",
    since: "0.48.0"
  },
  "bash-gate-telemetry": {
    version: "1.0.0",
    default: true,
    description: "Wraps pre-tool-use-bash-gate / post-tool-use-bash-gate recording. Independent of the existing CREW_BASH_GATE_LOG=0 escape hatch \u2014 either one disables recording.",
    scope: "crew",
    owner: "platform",
    since: "0.48.0"
  },
  "task-update-burst-warn": {
    version: "1.0.0",
    default: true,
    description: "Wraps the check-task-update-burst hook. Sits alongside the cost-hygiene umbrella check \u2014 both must be enabled for burst detection to record.",
    scope: "crew",
    owner: "platform",
    since: "0.48.0"
  },
  "checkpoint-cadence": {
    version: "1.0.0",
    default: true,
    description: "dev-team#174: PostToolUse child-side hook. After the first Edit/Write in a builder session, every N post-edit tool calls it injects a systemMessage nudging the builder to write a resume scaffold (.claude/state/crew/checkpoint-<slice>.md) so a mid-job death loses no WIP. Cadence knob: features['checkpoint-cadence'].threshold (default 20).",
    scope: "crew",
    owner: "platform",
    since: "0.54.0"
  },
  "event-emit": {
    version: "1.0.0",
    default: true,
    description: "Future P2.2 artifact-event emission at ARTIFACT_HANDLERS (unify-event-stream). Registry entry only \u2014 no consumer wired yet.",
    scope: "shared",
    owner: "platform",
    since: "0.48.0"
  },
  "model-routing": {
    version: "1.0.0",
    default: true,
    description: "Gates model-tier routing for the `crew resolve-model` CLI (interactive /crew:build /crew:fix /crew:orchestrate-slice dispatch) and the pre-tool-use-model-enforce hook. Enabled (default): resolves .claude/loop.json loop.modelRouting as today (build -> sonnet). Disabled: resolve-model prints the sentinel 'inherit' and the hook stands down \u2014 dispatches omit the Agent-tool model: argument so each agent's own model: frontmatter (agents/*.md) governs.",
    scope: "crew",
    owner: "platform",
    since: "0.51.2"
  },
  "reviewer-decision-guard": {
    version: "1.0.0",
    default: true,
    description: "SubagentStop guard (dev-team#199): blocks a reviewer-tier subagent (crew:reviewer, crew:reviewer-lite, crew:typescript-reviewer, crew:csharp-reviewer, crew:architect-reviewer) from going idle with no delivered decision (decision: approved|approved_with_notes|rejected line, or a written review-result artifact path). Mitigates parallel reviewer fan-out idling that stalls the dispatcher's post-review gate.",
    scope: "crew",
    owner: "safety",
    since: "0.59.0"
  },
  "builder-terminal-state-guard": {
    version: "1.0.0",
    default: true,
    description: "SubagentStop guard (dev-team#187, #174 \u2014 Wave 3 Guard 1, 'deliver-before-die'): blocks a STATUS-line builder-tier subagent (crew:fullstack-dev, crew:backend-dev, crew:frontend-dev, crew:aiplugin-dev \u2014 crew:dev-lite is deliberately excluded, its receipt contract uses a different vocabulary, see dev-team#226) from going idle with no delivered terminal state (a DONE|BLOCKED|HELP|IN-PROGRESS Report-contract line, or a written handoff/artifact path). BLOCKED is itself a valid terminal state and is never blocked. One retry only (stop_hook_active re-entry guard). Mitigates a builder clipping its report after risky work (commit/push/PR) but before the STATUS line the dispatcher's gates look for.",
    scope: "crew",
    owner: "safety",
    since: "0.63.0"
  },
  "dispatch-size-gate": {
    version: "1.0.0",
    default: false,
    description: "A3 (8 agent deaths, all from oversized dispatches): enforcement level of the PreToolUse/Agent dispatch-size gate (hooks/pre-tool-use-dispatch-size.ts). The hook estimates a dispatch's token cost from tier + file/dir mentions + wide-scope markers in the prompt against a 150k warn line (deliberate headroom below the 200k hard cap) and always emits an advisory systemMessage on over-threshold dispatches regardless of this flag. Default false = warn-only bake period, mirroring the git-gate-block precedent; flips to true only after warn-phase estimates are joined against real scripts/lib/dispatch-timing.ts telemetry and the threshold is confirmed well-calibrated \u2014 this repo has not run that calibration pass yet (no historical dispatch-timing.jsonl in this checkout to join against). Guardrail: this flag may only soften block->warn, never silence the gate \u2014 the warn nudge fires unconditionally regardless of flag state.",
    scope: "crew",
    owner: "safety",
    since: "0.63.0"
  }
};
function isEnabled(feature, config) {
  const enabled = config && typeof config === "object" && "features" in config && config.features && typeof config.features === "object" && feature in config.features && config.features[feature] && typeof config.features[feature] === "object" && "enabled" in config.features[feature] && typeof config.features[feature].enabled === "boolean" ? config.features[feature].enabled === true : FEATURES[feature]?.default ?? true;
  process.stderr.write(`[features] ${feature}: ${enabled ? "enabled" : "disabled"}
`);
  return enabled;
}
async function readCrewConfig(cwd) {
  const configPath = path2.join(cwd, ".claude", "crew.json");
  try {
    const content = await fs2.readFile(configPath, "utf8");
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    return {};
  }
}

// crew/scripts/lib/models/resolve-model.mts
var FALLBACK_MODEL = "opus";
var TRIVIAL_SHAPE_TIER = Object.freeze({
  "doc-update": "sonnet",
  "config-tweak": "sonnet",
  "test-only": "sonnet",
  "single-module-edit": "sonnet"
});
function isModelRoutingEnabledInConfig(config) {
  return config?.loop?.modelRouting?.["enabled"] !== false;
}
function resolveShapeTier(shape) {
  if (!shape)
    return null;
  return TRIVIAL_SHAPE_TIER[shape] ?? null;
}
function resolveModelForPhase(phase, config) {
  const routing = config?.loop?.modelRouting;
  if (!routing)
    return FALLBACK_MODEL;
  const phaseTier = routing[phase];
  const defaultTier = routing["default"];
  return (typeof phaseTier === "string" ? phaseTier : null) || (typeof defaultTier === "string" ? defaultTier : null) || FALLBACK_MODEL;
}
function resolveDispatchModel(phase, shape, config, modelRoutingEnabled = true) {
  if (!modelRoutingEnabled)
    return null;
  if (!isModelRoutingEnabledInConfig(config))
    return null;
  return resolveShapeTier(shape) ?? resolveModelForPhase(phase, config);
}

// crew/hooks/lib/model-routing-enforce.mts
var BUILDER_TIER_AGENTS = Object.freeze([
  "fullstack-dev",
  "backend-dev",
  "frontend-dev",
  "aiplugin-dev",
  "dev-lite"
]);
function normalizeAgentName(subagentType) {
  return subagentType.includes(":") ? subagentType.split(":").pop() ?? subagentType : subagentType;
}
function isBuilderTierAgent(subagentType) {
  return BUILDER_TIER_AGENTS.includes(normalizeAgentName(subagentType));
}
function parseAgentDispatchInput(raw) {
  try {
    const obj = JSON.parse(raw);
    if (typeof obj["tool_name"] !== "string" || obj["tool_name"] !== "Agent")
      return null;
    const toolInput = obj["tool_input"];
    if (typeof toolInput !== "object" || toolInput === null)
      return null;
    const ti = toolInput;
    const subagentType = typeof ti["subagent_type"] === "string" ? ti["subagent_type"] : "";
    if (subagentType === "")
      return null;
    return { subagentType, toolInput: ti };
  } catch {
    return null;
  }
}
function decideModelEnforcement(dispatch, loopConfig) {
  const { subagentType, toolInput } = dispatch;
  const explicitModel = toolInput["model"];
  if (typeof explicitModel === "string" && explicitModel.length > 0) {
    return { action: "none" };
  }
  if (!isBuilderTierAgent(subagentType)) {
    return { action: "none" };
  }
  if (!loopConfig?.loop?.modelRouting) {
    return { action: "none" };
  }
  const model = resolveDispatchModel("build", null, loopConfig);
  if (model === null)
    return { action: "none" };
  return { action: "inject", model, updatedInput: { ...toolInput, model } };
}
function buildHookOutput(dispatch, decision) {
  if (decision.action !== "inject" || decision.model === undefined || decision.updatedInput === undefined) {
    return null;
  }
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      updatedInput: decision.updatedInput
    },
    systemMessage: `[crew:model-routing] Builder-tier dispatch "${dispatch.subagentType}" had no explicit ` + `model: \u2014 injected model: ${decision.model} (FEAT-194 S2b, resolved from ` + `.claude/loop.json loop.modelRouting). If this hook runtime does not honor ` + `updatedInput for the Agent tool, re-dispatch explicitly with model: ${decision.model}.`
  });
}

// crew/hooks/pre-tool-use-model-enforce.mts
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin)
    chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
function parseCwd(raw) {
  try {
    const obj = JSON.parse(raw);
    return typeof obj["cwd"] === "string" ? obj["cwd"] : process.cwd();
  } catch {
    return process.cwd();
  }
}
async function readLoopConfig(repoPath) {
  try {
    const raw = await fs3.readFile(path3.join(repoPath, ".claude", "loop.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
async function main() {
  if (process.env["CREW_MODEL_ROUTING_ENFORCE"] === "0") {
    process.stdin.resume();
    return;
  }
  const raw = await readStdin();
  const dispatch = parseAgentDispatchInput(raw);
  if (dispatch === null)
    return;
  try {
    const repoPath = parseCwd(raw);
    const crewConfig = await readCrewConfig(repoPath);
    if (!isEnabled("model-routing", crewConfig))
      return;
    const loopConfig = await readLoopConfig(repoPath);
    const decision = decideModelEnforcement(dispatch, loopConfig);
    const out = buildHookOutput(dispatch, decision);
    if (out !== null)
      process.stdout.write(out);
  } catch (err) {
    await logHookError(process.cwd(), "pre-tool-use-model-enforce", err);
  }
}
main().catch(async (err) => {
  await logHookError(process.cwd(), "pre-tool-use-model-enforce", err);
  process.exit(0);
});
