#!/usr/bin/env node
// PreToolUse:Agent guard shipped by the runner plugin. Blocks Agent
// dispatches that work on FEAT-NNN items via ad-hoc / general-purpose
// subagents, forcing the runner slice ceremony + specialist ladder.
//
// Why: devcrew:auto and the Autonomous-Loop HARD RULES require slice
// ceremony for any FEAT implementation work. Going around it with a
// general-purpose subagent breaks cost attribution, grading, run-brief,
// the slice-progress dashboard, and the audit trail downstream tools
// rely on. `general-purpose` is deliberately NEVER allowlisted here —
// it's the exact bypass this hook exists to close.
//
// Ceremony specialists (architect, uxdesigner, per-stack builders,
// inspector, verifier, document-writer, dev-lite for trivial scope,
// investigator for read-only lookups) are legitimate FEAT participants
// and stay allowlisted, as do the devcrew methodology agents (devcrew:
// architect, devcrew:pm, devcrew:document-writer, devcrew:researcher —
// renamed from crew:*/runner:* in the devcrew unification) and Explore
// (read-only).
//
// Legacy aliases: the pre-unification ids (`crew:builder*`, `crew:
// reviewer`, `crew:reviewer-validator`, `crew:validator`, `crew:deployer`,
// `crew:copywriter`, `loop:*`) are retired — agents/*.md no longer defines
// builder/reviewer/reviewer-validator/validator/deployer/copywriter as
// standalone roles, and the devcrew:* stack-specific names (devcrew:
// fullstack-dev etc.) are current. They were kept allowlisted for one
// release after the devcrew 1.0.0 cutover so in-flight dispatches using
// the old names didn't false-block. That grace period elapsed at v1.1.0
// (FEAT-017 / SLICE-45): the allowlist below no longer includes them, so
// any dispatch still using a `crew:*`/`loop:*` id now hard-fails via the
// LEGACY_SUCCESSORS lookup below instead of silently passing through.
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

// Current ceremony participants — verified against agents/*.md and what
// dispatch.mts's variantToAgent / buildDispatchInstruction actually emit
// (devcrew:frontend-dev, devcrew:backend-dev, devcrew:fullstack-dev,
// devcrew:architect for contract pre-flight, devcrew:inspector +
// devcrew:verifier for the post-builder gates).
const allowed = [
  "devcrew:fullstack-dev",
  "devcrew:frontend-dev",
  "devcrew:backend-dev",
  "devcrew:build",
  "devcrew:researcher",
  "devcrew:architect",
  "devcrew:uxdesigner",
  "devcrew:document-writer",
  "devcrew:inspector",
  "devcrew:verifier",
  "devcrew:integrator",
  "devcrew:dev-lite",
  "devcrew:investigator",
  // read-only review gate fan-out (runner#404): stack + design reviewers are
  // legitimate FEAT participants; blocking them stalled parallel review.
  "devcrew:architect-reviewer",
  "devcrew:csharp-reviewer",
  "devcrew:typescript-reviewer",
  "devcrew:reviewer-lite",
  "devcrew:pm",
  "Explore"
];

// FEAT-017 / SLICE-45: the pre-unification ids removed from `allowed` above
// hard-fail as of v1.1.0. Where a 1:1 devcrew rename exists (the `loop:*`
// ids), name it directly. The `crew:builder*`/`crew:reviewer*`/
// `crew:validator`/`crew:deployer`/`crew:copywriter` ids named a role that
// agents/*.md no longer defines standalone — those get closest-fit guidance
// instead of a mechanical rename.
const legacySuccessors = {
  "crew:builder":
    "devcrew:fullstack-dev (or devcrew:frontend-dev / devcrew:backend-dev for a stack-specific slice, devcrew:dev-lite for trivial scope) — 'builder' is no longer a standalone role",
  "crew:builder-be": "devcrew:backend-dev",
  "crew:builder-fe": "devcrew:frontend-dev",
  "crew:reviewer":
    "devcrew:reviewer-lite (light-tier) or the stack reviewers devcrew:architect-reviewer / devcrew:csharp-reviewer / devcrew:typescript-reviewer — 'reviewer' is no longer a standalone role",
  "crew:reviewer-validator":
    "devcrew:reviewer-lite for review plus devcrew:verifier for validation — the combined role no longer exists",
  "crew:validator": "devcrew:verifier",
  "crew:deployer": "devcrew:release-engineer",
  "crew:copywriter": "devcrew:document-writer",
  "loop:architect": "devcrew:architect",
  "loop:document-writer": "devcrew:document-writer",
  "loop:pm": "devcrew:pm",
  "loop:researcher": "devcrew:researcher"
};

if (allowed.includes(subagent)) process.exit(0);

const uniqueFeats = [...new Set(featMatches)].join(", ");
const repoCwd = payload?.cwd || process.cwd();
const blockEnabled = isFeatureEnabledLite("dispatch-guard-block", repoCwd);
const legacyNote = legacySuccessors[subagent]
  ? [`Legacy token '${subagent}' is retired as of devcrew v1.1.0 — use ${legacySuccessors[subagent]}.`]
  : [];
process.stderr.write(
  [
    `${blockEnabled ? "BLOCKED" : "WARN (features.dispatch-guard-block disabled — not blocking)"}: Agent dispatch with subagent_type='${subagent}' on FEAT work (${uniqueFeats}).`,
    ...legacyNote,
    `Devcrew ceremony required:`,
    `  1. /devcrew:start --id <FEAT-ID or SLICE-NN>`,
    `  2. Dispatch the tag-routed devcrew builder (slice-build mode) returned by /devcrew:start`,
    `  3. /devcrew:close --id SLICE-NN`,
    `If /devcrew:auto halted on warn alerts, address alerts or escalate — do NOT bypass.`,
    `Override: change subagent_type to a ceremony specialist (${allowed.join(", ")}).`
  ].join("\n")
);
process.exit(blockEnabled ? 2 : 0);
