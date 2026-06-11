#!/usr/bin/env node
// PreToolUse:Agent guard shipped by the loop plugin. Blocks Agent
// dispatches that work on FEAT-NNN items via ad-hoc / general-purpose
// subagents, forcing the loop slice ceremony + /crew:orchestrate-slice
// specialist ladder.
//
// Why: loop:auto and the Autonomous-Loop HARD RULES require slice
// ceremony for any FEAT implementation work. Going around it with a
// general-purpose subagent breaks cost attribution, grading, run-brief,
// the slice-progress dashboard, and the audit trail downstream tools
// rely on.
//
// /crew:orchestrate-slice is the source of truth for slice dispatch. The
// ceremony specialists it invokes (architect, uxdesigner, builder,
// reviewer, validator, loop:document-writer) are legitimate FEAT
// participants and stay allowlisted. The loop methodology agents
// (loop:architect, loop:pm, loop:document-writer, loop:researcher) are
// also allowlisted because they participate in the loop ceremony.
// Note: crew:copywriter is deprecated (FEAT-124); loop:document-writer
// is the canonical documentation agent going forward.
//
// Exit codes:
//   0  allow
//   2  block (stderr is fed back to the model)

import { readFileSync } from "node:fs";

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

// Allow crew specialist ceremony agents + lead orchestrator + loop methodology
// agents + Explore (read-only). Only ad-hoc / 3rdparty / general-purpose
// subagents stay blocked — those skip the artifact protocol the ceremony
// depends on.
// crew:lead is the slice orchestrator: it dispatches architect/builder/reviewer/
// validator and synthesizes results. /loop:slice start emits a "Dispatch crew:lead"
// instruction by default (controlled by config.loop.orchestratorMode).
const allowed = [
  "crew:lead",
  "crew:builder",
  "crew:builder-be",
  "crew:builder-fe",
  "crew:build",
  "crew:reviewer",
  "crew:reviewer-validator",
  "crew:validator",
  "crew:deployer",
  "crew:researcher",
  "crew:architect",
  "crew:uxdesigner",
  "crew:copywriter",
  "crew:document-writer",
  "crew:integrator",
  "loop:architect",
  "loop:document-writer",
  "loop:pm",
  "loop:researcher",
  "Explore"
];

if (allowed.includes(subagent)) process.exit(0);

const uniqueFeats = [...new Set(featMatches)].join(", ");
process.stderr.write(
  [
    `BLOCKED: Agent dispatch with subagent_type='${subagent}' on FEAT work (${uniqueFeats}).`,
    `Loop ceremony required:`,
    `  1. /loop:slice-from-feature --id <FEAT-ID>`,
    `  2. /loop:slice-start --id SLICE-NN`,
    `  3. /crew:orchestrate-slice --id SLICE-NN  (dispatches the specialist ladder)`,
    `  4. /loop:slice-complete --id SLICE-NN`,
    `  5. /loop:slice-grade`,
    `If /loop:auto halted on warn alerts, address alerts or escalate — do NOT bypass.`,
    `Override: change subagent_type to crew:lead (slice orchestrator) or a ceremony specialist (crew:builder, crew:builder-be, crew:builder-fe, crew:reviewer, crew:reviewer-validator, crew:validator, crew:deployer, crew:researcher, crew:architect, crew:uxdesigner, crew:copywriter, crew:document-writer, crew:integrator, loop:architect, loop:document-writer, loop:pm, loop:researcher) or Explore.`
  ].join("\n")
);
process.exit(2);
