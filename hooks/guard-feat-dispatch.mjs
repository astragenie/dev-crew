#!/usr/bin/env node
// PreToolUse:Agent guard shipped by the runner plugin. Blocks Agent
// dispatches that work on FEAT-NNN items via ad-hoc / general-purpose
// subagents, forcing the runner slice ceremony + specialist ladder.
//
// Why: runner:auto and the Autonomous-Loop HARD RULES require slice
// ceremony for any FEAT implementation work. Going around it with a
// general-purpose subagent breaks cost attribution, grading, run-brief,
// the slice-progress dashboard, and the audit trail downstream tools
// rely on. `general-purpose` is deliberately NEVER allowlisted here —
// it's the exact bypass this hook exists to close.
//
// Ceremony specialists (architect, uxdesigner, per-stack builders,
// inspector, verifier, document-writer, dev-lite for trivial scope,
// investigator for read-only lookups) are legitimate FEAT participants
// and stay allowlisted, as do the runner methodology agents (runner:
// architect, runner:pm, runner:document-writer, runner:researcher —
// renamed from loop:* in P1.8) and Explore (read-only).
//
// Legacy aliases: the pre-rename ids below (`crew:builder*`, `crew:
// reviewer`, `crew:reviewer-validator`, `crew:validator`, `crew:deployer`,
// `crew:copywriter`, `loop:*`) are retired — dev-team/agents/*.md no
// longer defines builder/reviewer/reviewer-validator/validator/deployer/
// copywriter, and runner-plugin/agents/*.md only defines the runner:*
// names. Kept allowlisted ONE more release so in-flight dispatches using
// the old names don't false-block; remove in the next minor.
//
// Exit codes:
//   0  allow (or warn-only mode — see features.dispatch-guard-block below)
//   2  block (stderr is fed back to the model)
//
// features.dispatch-guard-block.enabled (default true = block). Setting it
// to false in .claude/loop.json degrades this hook to warn-only: the same
// stderr message prints, but the process exits 0 instead of 2.

import { readFileSync } from "node:fs";
import { isFeatureEnabledLite } from "./feature-flag-lite.mjs";

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // malformed payload — fail open
}

const toolName = payload?.tool_name;
const input = payload?.tool_input ?? {};

if (toolName !== "Agent") process.exit(0);

const prompt = String(input.prompt ?? "");
const subagent = String(input.subagent_type ?? "");

// Only inspect prompts that mention FEAT-NNN.
const featMatches = prompt.match(/\bFEAT-\d{3}\b/g);
if (!featMatches || featMatches.length === 0) process.exit(0);

// Current ceremony participants — verified against dev-team/agents/*.md,
// runner-plugin/agents/*.md, and what dispatch.mts's variantToAgent /
// buildDispatchInstruction actually emit (crew:frontend-dev, crew:
// backend-dev, crew:fullstack-dev, crew:architect for contract pre-flight,
// crew:inspector + crew:verifier for the post-builder gates).
const allowed = [
  "crew:fullstack-dev",
  "crew:frontend-dev",
  "crew:backend-dev",
  "crew:build",
  "crew:researcher",
  "crew:architect",
  "crew:uxdesigner",
  "crew:document-writer",
  "crew:inspector",
  "crew:verifier",
  "crew:integrator",
  "crew:dev-lite",
  "crew:investigator",
  // read-only review gate fan-out (runner#404): stack + design reviewers are
  // legitimate FEAT participants; blocking them stalled parallel review.
  "crew:architect-reviewer",
  "crew:csharp-reviewer",
  "crew:typescript-reviewer",
  "crew:reviewer-lite",
  "runner:architect",
  "runner:document-writer",
  "runner:pm",
  "runner:researcher",
  "Explore",
  // legacy aliases, remove in next minor
  "crew:builder",
  "crew:builder-be",
  "crew:builder-fe",
  "crew:reviewer",
  "crew:reviewer-validator",
  "crew:validator",
  "crew:deployer",
  "crew:copywriter",
  "loop:architect",
  "loop:document-writer",
  "loop:pm",
  "loop:researcher"
];

if (allowed.includes(subagent)) process.exit(0);

const uniqueFeats = [...new Set(featMatches)].join(", ");
const repoCwd = payload?.cwd || process.cwd();
const blockEnabled = isFeatureEnabledLite("dispatch-guard-block", repoCwd);
process.stderr.write(
  [
    `${blockEnabled ? "BLOCKED" : "WARN (features.dispatch-guard-block disabled — not blocking)"}: Agent dispatch with subagent_type='${subagent}' on FEAT work (${uniqueFeats}).`,
    `Runner ceremony required:`,
    `  1. /runner:start --id <FEAT-ID or SLICE-NN>`,
    `  2. Dispatch the tag-routed crew builder (slice-build mode) returned by /runner:start`,
    `  3. /runner:close --id SLICE-NN`,
    `If /runner:auto halted on warn alerts, address alerts or escalate — do NOT bypass.`,
    `Override: change subagent_type to a ceremony specialist (${allowed.join(", ")}).`
  ].join("\n")
);
process.exit(blockEnabled ? 2 : 0);
