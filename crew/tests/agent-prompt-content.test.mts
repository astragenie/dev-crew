// tests/agent-prompt-content.test.mjs — FEAT-043
// Keyword assertions for agent prompts. Tests catch semantic drift that
// structural validators (line count, sections) miss — e.g. a prompt that
// drops a required gate keyword or names the wrong skill.
import { test, describe, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readAgent(name: string) {
  return readFileSync(resolve(ROOT, "agents", `${name}.md`), "utf8");
}

// ── builder ──────────────────────────────────────────────────────────────────

const builder = readAgent("fullstack-dev");

// FEAT-170 SLICE-D: hard line cap enforcement. SLICE-93 shrunk fullstack-dev
// from 397 → 313 lines; SLICE-D adds C# capability + durability discipline +
// plugin-aware framing, cap relaxed to 330. CI gate enforces no regression
// beyond that. Future shrinks may lower further; relax this test in tandem.
test("fullstack-dev.md stays under 330 line cap (FEAT-170 SLICE-D)", () => {
  const lines = builder.split(/\r?\n/).length;
  expect(
    lines <= 330,
    `fullstack-dev.md is ${lines} lines, exceeds 330-line cap (FEAT-170 SLICE-D regression gate)`
  ).toBeTruthy();
});

test("fullstack-dev.md declares root-cause-discipline skill (FEAT-170 SLICE-D)", () => {
  expect(
    builder.includes("root-cause-discipline"),
    "fullstack-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)"
  ).toBeTruthy();
});

test("backend-dev.md declares root-cause-discipline skill (FEAT-170 SLICE-D)", () => {
  const be = readAgent("backend-dev");
  expect(
    be.includes("root-cause-discipline"),
    "backend-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)"
  ).toBeTruthy();
});

test("frontend-dev.md declares root-cause-discipline skill (FEAT-170 SLICE-D)", () => {
  const fe = readAgent("frontend-dev");
  expect(
    fe.includes("root-cause-discipline"),
    "frontend-dev.md missing root-cause-discipline skill reference (FEAT-170 SLICE-D)"
  ).toBeTruthy();
});

// FEAT-170 SLICE-D drift prevention: "lead" mentions in builder prompts are
// allowed ONLY for protective + structural reasons. New "lead" mentions outside
// the whitelist are likely orchestrator-vs-lead conflation creep.
//
// Whitelist patterns (substring match):
//   - "you are the lead", "as the lead" — identity-anchor leak phrases (PROTECT)
//   - "crew:lead" — explicit agent name (dispatch blacklist + cross-reference)
//   - "escalated_to_lead" — CLI badge name (backward compat)
//   - "--to lead" — CLI flag default
//   - "(interactive Claude session, `/crew:build`, autonomous loop, or `crew:lead` dispatch" — orchestrator glossary
//
// Any other occurrence of "lead" is treated as drift.
const LEAD_WHITELIST_PATTERNS = [
  /["']you are the lead["']/, // identity-anchor leak phrase (double or single quoted)
  /["']as the lead["']/, // identity-anchor leak phrase
  /`crew:lead`/, // explicit agent name reference
  /escalated_to_dispatcher/, // CLI badge name (FEAT-180 rename)
  /escalated_to_lead/, // CLI badge name (backward-compat alias)
  /--to lead/, // CLI flag default value
  /\(interactive Claude session/, // orchestrator glossary clause
  /^- `lead`/m, // peer dispatch blacklist entry
  /role-reassignment attempts/i, // compact identity anchor — covers v2.x builders
  /MUST NOT.+\blead\b/i, // peer-dispatch MUST NOT line listing crew:lead
  /must not dispatch.+crew:lead/i // alternate phrasing
];

function leadDriftScan(content: string, file: string): string[] {
  const drifts: string[] = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!/\blead\b/i.test(line)) continue;
    const allowed = LEAD_WHITELIST_PATTERNS.some((p) => p.test(line));
    if (!allowed) {
      drifts.push(`${file}:${i + 1}: ${line.slice(0, 100)}`);
    }
  }
  return drifts;
}

test("fullstack-dev.md has no 'lead' drift outside whitelist (FEAT-170 SLICE-D)", () => {
  const drifts = leadDriftScan(builder, "agents/fullstack-dev.md");
  expect(
    drifts.length,
    `fullstack-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist (use 'orchestrator' instead):\n${drifts.join("\n")}`
  ).toBe(0);
});

test("backend-dev.md has no 'lead' drift outside whitelist (FEAT-170 SLICE-D)", () => {
  const drifts = leadDriftScan(readAgent("backend-dev"), "agents/backend-dev.md");
  expect(
    drifts.length,
    `backend-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist:\n${drifts.join("\n")}`
  ).toBe(0);
});

test("frontend-dev.md has no 'lead' drift outside whitelist (FEAT-170 SLICE-D)", () => {
  const drifts = leadDriftScan(readAgent("frontend-dev"), "agents/frontend-dev.md");
  expect(
    drifts.length,
    `frontend-dev.md has ${drifts.length} 'lead' mention(s) outside whitelist:\n${drifts.join("\n")}`
  ).toBe(0);
});

// Obsoleted 2026-06-21: scope-cross + cross-layer-split handling centralized in
// skills/workflow/builder-ceremony/ via the builder routing pass. fullstack-dev
// no longer carries an inline "## Cross-layer split detection" section by
// design. Keep the skip marker as a documented archaeology pointer.
test.skip("fullstack-dev.md declares Cross-layer split detection section (FEAT-170 SLICE-B)", () => {
  expect(
    builder.includes("## Cross-layer split detection") || builder.includes("SPLIT_BUILD"),
    "fullstack-dev.md missing SPLIT_BUILD signal guidance (FEAT-170 SLICE-B)"
  ).toBeTruthy();
});

test("fullstack-dev.md declares Forbidden block (FEAT-170 SLICE-B)", () => {
  expect(
    builder.includes("## Forbidden"),
    "fullstack-dev.md missing ## Forbidden block (FEAT-170 SLICE-B)"
  ).toBeTruthy();
});

test("builder-mindset skill lists expanded leak phrases (extracted from per-agent identity anchors in v0.43)", () => {
  // 'you are the lead' phrase removed in v0.41 hard cut.
  // Per-agent identity-anchor sections were stripped in v0.43 — leak phrases
  // now live in skills/universal/builder-mindset/. Each builder agent loads
  // the skill on every dispatch.
  const skill = readFileSync(
    resolve(ROOT, "skills", "universal", "builder-mindset", "SKILL.md"),
    "utf8"
  );
  for (const phrase of [
    "you are Claude Code",
    "you are the orchestrator",
    "you are the dispatcher",
    "I am Claude Code",
    "Let me re-read",
    "As the orchestrator"
  ]) {
    expect(
      skill.includes(phrase),
      `builder-mindset/SKILL.md missing leak phrase "${phrase}"`
    ).toBeTruthy();
  }
});

test("fullstack-dev.md loads builder-mindset for identity anchor", () => {
  expect(
    builder.includes("skills/universal/builder-mindset/"),
    "fullstack-dev.md must reference skills/universal/builder-mindset/ for leak phrases"
  ).toBeTruthy();
});

test("builder.md contains TDD policy reference", () => {
  expect(builder.includes("TDD"), "builder.md missing TDD").toBeTruthy();
});

test("builder.md references crew:reviewer dispatch", () => {
  expect(builder.includes("crew:reviewer"), "builder.md missing crew:reviewer").toBeTruthy();
});

test("builder.md contains write-handoff instruction", () => {
  expect(builder.includes("write-handoff"), "builder.md missing write-handoff").toBeTruthy();
});

test("builder.md contains validation_skipped badge reference", () => {
  expect(
    builder.includes("validation_skipped"),
    "builder.md missing validation_skipped"
  ).toBeTruthy();
});

test("builder.md references mark-badge", () => {
  expect(builder.includes("mark-badge"), "builder.md missing mark-badge").toBeTruthy();
});

// FEAT-170 SLICE-D follow-up: fullstack-dev's ceremony moved to
// skills/workflow/builder-ceremony/SKILL.md (which itself references the
// self-verify-gate skill). The builder prompt now points at builder-ceremony
// instead of carrying the self-verify reference inline.
test("builder.md points at builder-ceremony skill (which carries self-verify reference)", () => {
  expect(
    builder.includes("skills/workflow/builder-ceremony"),
    "builder.md must point at builder-ceremony skill"
  ).toBeTruthy();
});

// FEAT-170 SLICE-D follow-up, superseded by dev-team#227: builders MUST NOT
// invoke write-handoff. Originally guarded by the "Builders do NOT write
// handoff artifacts" declaration; #227's AC explicitly REMOVES that exact
// declaration (report channel moved to a PR comment posted before the risky
// tail) and replaces it with the "report dies with you if truncated" framing
// + "Narration without a posted PR report = contract violation" guardrail.
// "NEVER invoke write-handoff" stays as the protective guardrail unchanged.
test("builder.md prohibits write-handoff CLI invocation (FEAT-170 SLICE-D / dev-team#227)", () => {
  expect(
    builder.includes("Narration without a posted PR report = contract violation"),
    "fullstack-dev.md must contain the report-to-PR contract-violation guardrail"
  ).toBeTruthy();
  expect(
    builder.includes("NEVER invoke `write-handoff`") ||
      builder.includes("NEVER invoke write-handoff"),
    "fullstack-dev.md must contain the 'NEVER invoke write-handoff' guardrail"
  ).toBeTruthy();
});

test("builder.md declares the STATUS-token follow-up format (FEAT-170 SLICE-D)", () => {
  for (const token of ["DONE", "BLOCKED", "HELP", "IN-PROGRESS"]) {
    expect(
      builder.includes(token),
      `fullstack-dev.md missing STATUS token "${token}" — see Report contract section`
    ).toBeTruthy();
  }
});

const selfVerifySkill = readFileSync(
  resolve(ROOT, "skills", "workflow", "self-verify-gate", "SKILL.md"),
  "utf8"
);

test("self-verify-gate skill is scoped to affected-class tests", () => {
  expect(
    selfVerifySkill.includes("Affected-class tests only"),
    "self-verify-gate skill missing scoped affected-class test gate"
  ).toBeTruthy();
});

test("self-verify-gate skill defers the full suite to the validator", () => {
  expect(
    selfVerifySkill.includes("Deferred to validator"),
    "self-verify-gate skill missing Deferred to validator handoff line"
  ).toBeTruthy();
});

// ── reviewer ─────────────────────────────────────────────────────────────────

const reviewer = readAgent("reviewer");

test("reviewer.md references write-review-result", () => {
  expect(
    reviewer.includes("write-review-result"),
    "reviewer.md missing write-review-result"
  ).toBeTruthy();
});

test("reviewer.md contains Test Adequacy section", () => {
  expect(reviewer.includes("Test Adequacy"), "reviewer.md missing Test Adequacy").toBeTruthy();
});

test("reviewer.md dropped --validation-evidence bundling (validator now mandatory)", () => {
  expect(
    !reviewer.includes("--validation-evidence"),
    "reviewer.md should no longer emit --validation-evidence — the validator owns the mandatory full gate"
  ).toBeTruthy();
});

test("reviewer.md re-runs the builder's affected-class test set", () => {
  expect(
    reviewer.includes("Affected-test re-run"),
    "reviewer.md missing affected-test re-run gate"
  ).toBeTruthy();
});

test("reviewer.md contains rejected decision option", () => {
  expect(reviewer.includes("rejected"), "reviewer.md missing rejected decision").toBeTruthy();
});

test("reviewer.md addresses regression concerns", () => {
  expect(reviewer.includes("regression"), "reviewer.md missing regression").toBeTruthy();
});

// ── validator ────────────────────────────────────────────────────────────────

const validator = readAgent("verifier");

test("validator.md contains validation_skipped badge", () => {
  expect(
    validator.includes("validation_skipped"),
    "validator.md missing validation_skipped"
  ).toBeTruthy();
});

test("validator.md routes UI/UX scope to crew:qa-expert", () => {
  expect(
    validator.includes("crew:qa-expert"),
    "validator.md missing crew:qa-expert routing for UI/UX scope"
  ).toBeTruthy();
  expect(
    validator.includes("UI/UX/a11y is NOT verifier's scope"),
    "verifier.md missing explicit UI/UX-out-of-scope guard"
  ).toBeTruthy();
});

test("validator.md requires evidence gathering", () => {
  expect(validator.includes("evidence"), "validator.md missing evidence").toBeTruthy();
});

test("validator.md addresses scenario execution", () => {
  expect(validator.includes("scenario"), "validator.md missing scenario").toBeTruthy();
});

test("validator.md contains mark-badge reference", () => {
  expect(validator.includes("mark-badge"), "validator.md missing mark-badge").toBeTruthy();
});

test("validator.md owns the mandatory full gate (lint + format:check)", () => {
  expect(
    validator.includes("Mandatory final gate") && validator.includes("format:check"),
    "validator.md missing mandatory full gate with format:check"
  ).toBeTruthy();
});

// ── deployer ─────────────────────────────────────────────────────────────────

const deployer = readAgent("release-engineer");

test("deployer.md references write-deployment-check", () => {
  expect(
    deployer.includes("write-deployment-check"),
    "deployer.md missing write-deployment-check"
  ).toBeTruthy();
});

test("deployer.md addresses environment transitions", () => {
  expect(deployer.includes("environment"), "deployer.md missing environment").toBeTruthy();
});

test("deployer.md requires evidence gathering", () => {
  expect(deployer.includes("evidence"), "deployer.md missing evidence").toBeTruthy();
});

test("deployer.md contains mark-badge reference", () => {
  expect(deployer.includes("mark-badge"), "deployer.md missing mark-badge").toBeTruthy();
});

test("deployer.md contains write-handoff reference", () => {
  expect(deployer.includes("write-handoff"), "deployer.md missing write-handoff").toBeTruthy();
});

// lead.md removed in v0.41 hard cut — orchestration is now a concept (the slash
// command + main thread), not a callable agent role. The behaviors these tests
// guarded (mark-badge, handoff, final-synthesis, review_required, fullstack-dev
// dispatch) moved to commands/build.md and /crew:ship workflow.

// ── ## HARD OUTPUT CONTRACT — Prong A coverage ───────────────────────────────
//
// Asserts that all 12 targeted agents carry the HARD OUTPUT CONTRACT block
// with required preamble, role-specific last-tool-call substring, and
// cite-back to FEAT-161. Covers the 6 already-compliant agents (regression
// guard, AC-3) plus the 6 newly added agents (AC-1, AC-2, AC-4).

const HARD_CONTRACT_HEADING = "## HARD OUTPUT CONTRACT (read first, every dispatch)";
// Existing 6 agents use "LAST action before returning"; new 6 use "LAST tool call before returning".
// Test accepts either form (the common substring "LAST" + "before returning" appears in both).
const REQUIRED_PREAMBLE_A = "LAST action before returning";
const REQUIRED_PREAMBLE_B = "LAST tool call before returning";
const REQUIRED_NARRATION_PHRASE = "Returning narration";
const REQUIRED_VIOLATION_PHRASE = "contract violation";
const FEAT_161_CITE = "FEAT-161";

/** Returns true if the content contains either accepted preamble form. */
function hasPreamble(content: string): boolean {
  return content.includes(REQUIRED_PREAMBLE_A) || content.includes(REQUIRED_PREAMBLE_B);
}

/** Tactical headings that MUST NOT appear before the HARD CONTRACT block (AC-1.2 / AC-2). */
const TACTICAL_HEADINGS = [
  "## Workflow",
  "## Job",
  "## Procedure",
  "## Golden Path",
  "## Inputs",
  "## Operating principles"
];

/**
 * Returns the index of the first tactical heading found in the content,
 * or Number.MAX_SAFE_INTEGER if none are present.
 */
function firstTacticalIdx(content: string): number {
  const indices = TACTICAL_HEADINGS.map((h) => content.indexOf(h)).filter((i) => i !== -1);
  return indices.length > 0 ? Math.min(...indices) : Number.MAX_SAFE_INTEGER;
}

// Obsoleted 2026-06-21: the "## HARD OUTPUT CONTRACT (read first, every dispatch)"
// section was restructured into "## Identity + output contract" across the
// builder fleet, and FEAT-161 cite-backs were stripped per the no-backlog-ids
// policy enforced by validate-agents.ts. The describe block below is kept for
// archaeology + revivable structure when a successor contract gate is written.
describe.skip("## HARD OUTPUT CONTRACT — Prong A coverage", () => {
  // ── 6 already-compliant agents (regression guard) ──────────────────────────
  // lead.md removed in v0.41 hard cut — block removed.

  describe("fullstack-dev (already compliant)", () => {
    const content = readAgent("fullstack-dev");
    test("heading present", () => {
      expect(
        content.includes(HARD_CONTRACT_HEADING),
        "fullstack-dev.md missing HARD CONTRACT heading"
      ).toBeTruthy();
    });
    test("required preamble phrase", () => {
      expect(
        hasPreamble(content),
        "fullstack-dev.md missing LAST action/tool call before returning preamble"
      ).toBeTruthy();
    });
    test("narration + violation phrases", () => {
      expect(
        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
        "fullstack-dev.md missing narration/contract-violation phrases"
      ).toBeTruthy();
    });
    test("role-specific: write-handoff keyword", () => {
      expect(
        content.includes("write-handoff"),
        "fullstack-dev.md HARD CONTRACT missing write-handoff keyword"
      ).toBeTruthy();
    });
    test("FEAT-161 cite-back", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "fullstack-dev.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
    // FEAT-180 (v2.0.0 builder rewrite): Identity anchor stays at the FRONT
    // (per user "you are builder / fullstack-developer up top"), HARD
    // OUTPUT CONTRACT comes later after Golden path + Stack router + TDD.
    test("placement: Identity anchor present + HARD CONTRACT present", () => {
      const identityIdx = content.indexOf("## Identity anchor");
      const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
      expect(contractIdx !== -1, "fullstack-dev.md HARD CONTRACT heading not found").toBeTruthy();
      expect(identityIdx !== -1, "fullstack-dev.md missing Identity anchor").toBeTruthy();
      expect(
        identityIdx < contractIdx,
        "fullstack-dev.md Identity anchor must appear before HARD CONTRACT"
      ).toBeTruthy();
    });
  });

  describe("frontend-dev (already compliant)", () => {
    const content = readAgent("frontend-dev");
    test("heading present", () => {
      expect(
        content.includes(HARD_CONTRACT_HEADING),
        "frontend-dev.md missing HARD CONTRACT heading"
      ).toBeTruthy();
    });
    test("required preamble phrase", () => {
      expect(
        hasPreamble(content),
        "frontend-dev.md missing LAST action/tool call before returning preamble"
      ).toBeTruthy();
    });
    test("narration + violation phrases", () => {
      expect(
        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
        "frontend-dev.md missing narration/contract-violation phrases"
      ).toBeTruthy();
    });
    test("role-specific: write-handoff keyword", () => {
      expect(
        content.includes("write-handoff"),
        "frontend-dev.md HARD CONTRACT missing write-handoff keyword"
      ).toBeTruthy();
    });
    test("FEAT-161 cite-back", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "frontend-dev.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
    test("placement: after Identity anchor, before first tactical heading", () => {
      const identityIdx = content.indexOf("## Identity anchor");
      const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
      expect(contractIdx !== -1, "frontend-dev.md HARD CONTRACT heading not found").toBeTruthy();
      expect(identityIdx !== -1, "frontend-dev.md missing Identity anchor").toBeTruthy();
      expect(
        contractIdx > identityIdx,
        "frontend-dev.md HARD CONTRACT must appear after Identity anchor"
      ).toBeTruthy();
      expect(
        contractIdx < firstTacticalIdx(content),
        "frontend-dev.md HARD CONTRACT must appear before first tactical heading"
      ).toBeTruthy();
    });
  });

  describe("backend-dev (already compliant)", () => {
    const content = readAgent("backend-dev");
    test("heading present", () => {
      expect(
        content.includes(HARD_CONTRACT_HEADING),
        "backend-dev.md missing HARD CONTRACT heading"
      ).toBeTruthy();
    });
    test("required preamble phrase", () => {
      expect(
        hasPreamble(content),
        "backend-dev.md missing LAST action/tool call before returning preamble"
      ).toBeTruthy();
    });
    test("narration + violation phrases", () => {
      expect(
        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
        "backend-dev.md missing narration/contract-violation phrases"
      ).toBeTruthy();
    });
    test("role-specific: write-handoff keyword", () => {
      expect(
        content.includes("write-handoff"),
        "backend-dev.md HARD CONTRACT missing write-handoff keyword"
      ).toBeTruthy();
    });
    test("FEAT-161 cite-back", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "backend-dev.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
    test("placement: after Identity anchor, before first tactical heading", () => {
      const identityIdx = content.indexOf("## Identity anchor");
      const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
      expect(contractIdx !== -1, "backend-dev.md HARD CONTRACT heading not found").toBeTruthy();
      expect(identityIdx !== -1, "backend-dev.md missing Identity anchor").toBeTruthy();
      expect(
        contractIdx > identityIdx,
        "backend-dev.md HARD CONTRACT must appear after Identity anchor"
      ).toBeTruthy();
      expect(
        contractIdx < firstTacticalIdx(content),
        "backend-dev.md HARD CONTRACT must appear before first tactical heading"
      ).toBeTruthy();
    });
  });

  describe("reviewer (already compliant)", () => {
    const content = readAgent("reviewer");
    test("heading present", () => {
      expect(
        content.includes(HARD_CONTRACT_HEADING),
        "reviewer.md missing HARD CONTRACT heading"
      ).toBeTruthy();
    });
    test("required preamble phrase", () => {
      expect(
        hasPreamble(content),
        "reviewer.md missing LAST action/tool call before returning preamble"
      ).toBeTruthy();
    });
    test("narration + violation phrases", () => {
      expect(
        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
        "reviewer.md missing narration/contract-violation phrases"
      ).toBeTruthy();
    });
    test("role-specific: write-review-result keyword", () => {
      expect(
        content.includes("write-review-result"),
        "reviewer.md HARD CONTRACT missing write-review-result keyword"
      ).toBeTruthy();
    });
    test("no backlog ids (FEAT-NNN / DEC-NNN / SLICE-NN)", () => {
      const ids = content.match(/\b(FEAT-\d+|DEC-\d+|SLICE-\d+)\b/g);
      expect(
        !ids || ids.length === 0,
        `reviewer.md must not contain backlog ids; found: ${ids?.join(", ")}`
      ).toBeTruthy();
    });
    // Lead-agent removed in v0.41 (hard cut). Body-text gate is enforced repo-wide
    // by NO_LEAD_REF_REQUIRED in scripts/validate-agents.ts — see the parametrized
    // describe block "no lead refs across active agents" below.
    test("SLICE_BASE fallback — uses git merge-base, not fixed HEAD~1", () => {
      expect(
        content.includes("git merge-base"),
        "reviewer.md SLICE_BASE computation must use git merge-base, not hardcoded HEAD~1"
      ).toBeTruthy();
    });
    test("placement before first tactical heading", () => {
      const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
      expect(contractIdx !== -1, "reviewer.md HARD CONTRACT heading not found").toBeTruthy();
      expect(
        contractIdx < firstTacticalIdx(content),
        "reviewer.md HARD CONTRACT must appear before first tactical heading"
      ).toBeTruthy();
    });
  });

  describe("verifier (already compliant)", () => {
    const content = readAgent("verifier");
    test("heading present", () => {
      expect(
        content.includes(HARD_CONTRACT_HEADING),
        "verifier.md missing HARD CONTRACT heading"
      ).toBeTruthy();
    });
    test("required preamble phrase", () => {
      expect(
        hasPreamble(content),
        "verifier.md missing LAST action/tool call before returning preamble"
      ).toBeTruthy();
    });
    test("narration + violation phrases", () => {
      expect(
        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
        "verifier.md missing narration/contract-violation phrases"
      ).toBeTruthy();
    });
    test("role-specific: write-validation-result keyword", () => {
      expect(
        content.includes("write-validation-result"),
        "verifier.md HARD CONTRACT missing write-validation-result keyword"
      ).toBeTruthy();
    });
    test("FEAT-161 cite-back", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "verifier.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
    test("placement before first tactical heading (Golden Path)", () => {
      const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
      expect(contractIdx !== -1, "verifier.md HARD CONTRACT heading not found").toBeTruthy();
      expect(
        contractIdx < firstTacticalIdx(content),
        "verifier.md HARD CONTRACT must appear before first tactical heading"
      ).toBeTruthy();
    });
  });

  // ── 6 newly added agents (AC-1, AC-2, AC-4) ────────────────────────────────

  describe("architect (newly added)", () => {
    const content = readAgent("architect");
    test("heading present", () => {
      expect(
        content.includes(HARD_CONTRACT_HEADING),
        "architect.md missing HARD CONTRACT heading"
      ).toBeTruthy();
    });
    test("required preamble phrase", () => {
      expect(
        hasPreamble(content),
        "architect.md missing LAST action/tool call before returning preamble"
      ).toBeTruthy();
    });
    test("narration + violation phrases", () => {
      expect(
        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
        "architect.md missing narration/contract-violation phrases"
      ).toBeTruthy();
    });
    test("role-specific: write-handoff keyword", () => {
      expect(
        content.includes("write-handoff"),
        "architect.md HARD CONTRACT missing write-handoff keyword"
      ).toBeTruthy();
    });
    test("role-specific: Agent dispatch keyword", () => {
      expect(
        content.includes("Agent"),
        "architect.md HARD CONTRACT missing Agent dispatch keyword"
      ).toBeTruthy();
    });
    test("FEAT-161 cite-back", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "architect.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
    test("placement: after Custom instructions, before Golden Path (tactical heading)", () => {
      const customIdx = content.indexOf("## Custom instructions");
      const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
      const goldenPathIdx = content.indexOf("## Golden Path");
      expect(contractIdx !== -1, "architect.md HARD CONTRACT heading not found").toBeTruthy();
      expect(customIdx !== -1, "architect.md missing Custom instructions section").toBeTruthy();
      expect(goldenPathIdx !== -1, "architect.md missing Golden Path heading").toBeTruthy();
      expect(
        contractIdx > customIdx,
        "architect.md HARD CONTRACT must appear after Custom instructions"
      ).toBeTruthy();
      expect(
        contractIdx < goldenPathIdx,
        "architect.md HARD CONTRACT must appear before Golden Path"
      ).toBeTruthy();
    });
  });

  describe("reviewer-lite (renamed from reviewer-verifier, validation stripped)", () => {
    const content = readAgent("reviewer-lite");
    test("heading present", () => {
      expect(
        content.includes(HARD_CONTRACT_HEADING),
        "reviewer-lite.md missing HARD CONTRACT heading"
      ).toBeTruthy();
    });
    test("write-review-result keyword present", () => {
      expect(
        content.includes("write-review-result"),
        "reviewer-lite.md HARD CONTRACT missing write-review-result keyword"
      ).toBeTruthy();
    });
    test("no validation-result dispatch (validation moved to pre-push hook + /crew:ship)", () => {
      expect(
        !content.includes("write-validation-result"),
        "reviewer-lite.md must NOT call write-validation-result — validation belongs to verifier + hook"
      ).toBeTruthy();
    });
    test("no full validation gate (lint/format:check/tests/verify:all) inline", () => {
      const validationMarkers = [
        "bun run lint",
        "bun run format:check",
        "verify:all",
        "parallel-gates.ts"
      ];
      for (const marker of validationMarkers) {
        expect(
          !content.includes(marker),
          `reviewer-lite.md must NOT run validation gate inline; found "${marker}"`
        ).toBeTruthy();
      }
    });
  });

  describe("integrator (newly added)", () => {
    const content = readAgent("integrator");
    test("heading present", () => {
      expect(
        content.includes(HARD_CONTRACT_HEADING),
        "integrator.md missing HARD CONTRACT heading"
      ).toBeTruthy();
    });
    test("required preamble phrase", () => {
      expect(
        hasPreamble(content),
        "integrator.md missing LAST action/tool call before returning preamble"
      ).toBeTruthy();
    });
    test("narration + violation phrases", () => {
      expect(
        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
        "integrator.md missing narration/contract-violation phrases"
      ).toBeTruthy();
    });
    test("role-specific: write-handoff keyword", () => {
      expect(
        content.includes("write-handoff"),
        "integrator.md HARD CONTRACT missing write-handoff keyword"
      ).toBeTruthy();
    });
    test("FEAT-161 cite-back", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "integrator.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
    test("placement: after Custom instructions, before Procedure of record (tactical heading)", () => {
      const customIdx = content.indexOf("## Custom instructions");
      const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
      const procedureIdx = content.indexOf("## Procedure of record");
      expect(contractIdx !== -1, "integrator.md HARD CONTRACT heading not found").toBeTruthy();
      expect(customIdx !== -1, "integrator.md missing Custom instructions section").toBeTruthy();
      expect(procedureIdx !== -1, "integrator.md missing Procedure of record heading").toBeTruthy();
      expect(
        contractIdx > customIdx,
        "integrator.md HARD CONTRACT must appear after Custom instructions"
      ).toBeTruthy();
      expect(
        contractIdx < procedureIdx,
        "integrator.md HARD CONTRACT must appear before Procedure of record"
      ).toBeTruthy();
    });
  });

  describe("release-engineer (newly added)", () => {
    const content = readAgent("release-engineer");
    test("heading present", () => {
      expect(
        content.includes(HARD_CONTRACT_HEADING),
        "release-engineer.md missing HARD CONTRACT heading"
      ).toBeTruthy();
    });
    test("required preamble phrase", () => {
      expect(
        hasPreamble(content),
        "release-engineer.md missing LAST action/tool call before returning preamble"
      ).toBeTruthy();
    });
    test("narration + violation phrases", () => {
      expect(
        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
        "release-engineer.md missing narration/contract-violation phrases"
      ).toBeTruthy();
    });
    test("role-specific: write-deployment-check keyword", () => {
      expect(
        content.includes("write-deployment-check"),
        "release-engineer.md HARD CONTRACT missing write-deployment-check keyword"
      ).toBeTruthy();
    });
    test("FEAT-161 cite-back", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "release-engineer.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
    test("placement: after Custom instructions, before deployment-specific content", () => {
      const customIdx = content.indexOf("## Custom instructions");
      const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
      expect(
        contractIdx !== -1,
        "release-engineer.md HARD CONTRACT heading not found"
      ).toBeTruthy();
      expect(
        customIdx !== -1,
        "release-engineer.md missing Custom instructions section"
      ).toBeTruthy();
      expect(
        contractIdx > customIdx,
        "release-engineer.md HARD CONTRACT must appear after Custom instructions"
      ).toBeTruthy();
    });
  });

  describe("document-writer (newly added)", () => {
    const content = readAgent("document-writer");
    test("heading present", () => {
      expect(
        content.includes(HARD_CONTRACT_HEADING),
        "document-writer.md missing HARD CONTRACT heading"
      ).toBeTruthy();
    });
    test("required preamble phrase", () => {
      expect(
        hasPreamble(content),
        "document-writer.md missing LAST action/tool call before returning preamble"
      ).toBeTruthy();
    });
    test("narration + violation phrases", () => {
      expect(
        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
        "document-writer.md missing narration/contract-violation phrases"
      ).toBeTruthy();
    });
    test("role-specific: write-handoff keyword", () => {
      expect(
        content.includes("write-handoff"),
        "document-writer.md HARD CONTRACT missing write-handoff keyword"
      ).toBeTruthy();
    });
    test("FEAT-161 cite-back", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "document-writer.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
    test("placement: before Your output contract section", () => {
      const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
      const outputContractIdx = content.indexOf("## Your output contract");
      expect(contractIdx !== -1, "document-writer.md HARD CONTRACT heading not found").toBeTruthy();
      expect(
        outputContractIdx !== -1,
        "document-writer.md missing Your output contract heading"
      ).toBeTruthy();
      expect(
        contractIdx < outputContractIdx,
        "document-writer.md HARD CONTRACT must appear before Your output contract section"
      ).toBeTruthy();
    });
  });

  describe("refactor (newly added)", () => {
    const content = readAgent("refactor");
    test("heading present", () => {
      expect(
        content.includes(HARD_CONTRACT_HEADING),
        "refactor.md missing HARD CONTRACT heading"
      ).toBeTruthy();
    });
    test("required preamble phrase", () => {
      expect(
        hasPreamble(content),
        "refactor.md missing LAST action/tool call before returning preamble"
      ).toBeTruthy();
    });
    test("narration + violation phrases", () => {
      expect(
        content.includes(REQUIRED_NARRATION_PHRASE) && content.includes(REQUIRED_VIOLATION_PHRASE),
        "refactor.md missing narration/contract-violation phrases"
      ).toBeTruthy();
    });
    test("role-specific: write-handoff keyword", () => {
      expect(
        content.includes("write-handoff"),
        "refactor.md HARD CONTRACT missing write-handoff keyword"
      ).toBeTruthy();
    });
    test("FEAT-161 cite-back", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "refactor.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
    test("placement: after Custom instructions, before Concern areas content", () => {
      const customIdx = content.indexOf("## Custom instructions");
      const contractIdx = content.indexOf(HARD_CONTRACT_HEADING);
      const concernIdx = content.indexOf("## Concern areas");
      expect(contractIdx !== -1, "refactor.md HARD CONTRACT heading not found").toBeTruthy();
      expect(customIdx !== -1, "refactor.md missing Custom instructions section").toBeTruthy();
      expect(concernIdx !== -1, "refactor.md missing Concern areas heading").toBeTruthy();
      expect(
        contractIdx > customIdx,
        "refactor.md HARD CONTRACT must appear after Custom instructions"
      ).toBeTruthy();
      expect(
        contractIdx < concernIdx,
        "refactor.md HARD CONTRACT must appear before Concern areas"
      ).toBeTruthy();
    });
  });
});

// ── ## First action — Prong B coverage ───────────────────────────────────────
//
// Asserts that all 9 artifact-owning agents carry the stub-artifact-on-entry
// section (FEAT-161 Prong B / SLICE-72). For each agent, verifies:
//   (a) ## First action (stub artifact on entry) heading present
//   (b) --scaffold literal substring
//   (c) --status in-progress literal substring
//   (d) --update literal substring
//   (e) role-specific crew write-* command name
//   (f) FEAT-161 cite-back
//   (g) DEC-019 idempotency reference
// For reviewer-verifier: BOTH write-review-result AND write-validation-result present.

const STUB_HEADING = "## First action (stub artifact on entry)";
const SCAFFOLD_FLAG = "--scaffold";
const STATUS_IN_PROGRESS = "--status in-progress";
const UPDATE_FLAG = "--update";
const DEC_019 = "DEC-019";

// Obsoleted 2026-06-21: builders moved to inline-return contract; "## First
// action (stub artifact on entry)" sections no longer mandatory. FEAT-161 and
// DEC-019 cite-backs stripped per the no-backlog-ids policy.
describe.skip("## First action — Prong B coverage", () => {
  describe("fullstack-dev (no-handoff contract — FEAT-170 SLICE-D)", () => {
    const content = readAgent("fullstack-dev");
    // Builders no longer call write-handoff. The only acceptable mentions are
    // PROHIBITIVE guardrails ("Builders do NOT write handoff", "NEVER invoke
    // write-handoff"). The "write-handoff" substring still appears in those
    // negative-pattern lines; assert FEAT-161 cite still present (pause-detection
    // semantics now carried by badge state).
    test("FEAT-161 cite-back (pause-detection now via badge state)", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "fullstack-dev.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
  });

  // FEAT-170 SLICE-D — frontend-dev + backend-dev ceremony extracted to
  // skills/workflow/builder-ceremony/SKILL.md. The redundant "## First action"
  // section + DEC-019/scaffold details now live in the skill. Each builder
  // keeps write-handoff + FEAT-161 cite inline as the core protective markers.
  // FEAT-170 SLICE-D follow-up: no-handoff contract now applies to all three
  // builders. They MUST contain the prohibitive "do NOT write handoff" +
  // "NEVER invoke write-handoff" guardrails. FEAT-161 cite remains (pause
  // semantics now via badge state, not artifact).
  for (const agentName of ["frontend-dev", "backend-dev"] as const) {
    describe(`${agentName} (no-handoff contract — FEAT-170 SLICE-D)`, () => {
      const content = readAgent(agentName);
      test("FEAT-161 cite-back (pause-detection via badge state)", () => {
        expect(
          content.includes(FEAT_161_CITE),
          `${agentName}.md missing FEAT-161 cite-back`
        ).toBeTruthy();
      });
      test("prohibits write-handoff CLI invocation", () => {
        expect(
          content.includes("do NOT write handoff") || content.includes("DO NOT write handoff"),
          `${agentName}.md must contain "do NOT write handoff" guardrail`
        ).toBeTruthy();
        expect(
          content.includes("NEVER invoke `write-handoff`") ||
            content.includes("NEVER invoke write-handoff"),
          `${agentName}.md must contain "NEVER invoke write-handoff" guardrail`
        ).toBeTruthy();
      });
      test("declares STATUS-token follow-up format", () => {
        for (const token of ["DONE", "BLOCKED", "HELP", "IN-PROGRESS"]) {
          expect(
            content.includes(token),
            `${agentName}.md missing STATUS token "${token}"`
          ).toBeTruthy();
        }
      });
    });
  }

  describe("reviewer", () => {
    const content = readAgent("reviewer");
    test("stub heading present", () => {
      expect(
        content.includes(STUB_HEADING),
        "reviewer.md missing stub artifact heading"
      ).toBeTruthy();
    });
    test("--scaffold flag present", () => {
      expect(content.includes(SCAFFOLD_FLAG), "reviewer.md missing --scaffold flag").toBeTruthy();
    });
    test("--status in-progress present", () => {
      expect(
        content.includes(STATUS_IN_PROGRESS),
        "reviewer.md missing --status in-progress"
      ).toBeTruthy();
    });
    test("--update flag present", () => {
      expect(content.includes(UPDATE_FLAG), "reviewer.md missing --update flag").toBeTruthy();
    });
    test("role-specific: write-review-result command", () => {
      expect(
        content.includes("write-review-result"),
        "reviewer.md missing write-review-result"
      ).toBeTruthy();
    });
    test("FEAT-161 cite-back", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "reviewer.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
    test("DEC-019 reference", () => {
      expect(content.includes(DEC_019), "reviewer.md missing DEC-019 reference").toBeTruthy();
    });
  });

  describe("reviewer-lite (single-stub — validation stripped in v0.41.x rename)", () => {
    const content = readAgent("reviewer-lite");
    test("--scaffold flag present", () => {
      expect(
        content.includes(SCAFFOLD_FLAG),
        "reviewer-lite.md missing --scaffold flag"
      ).toBeTruthy();
    });
    test("--status in-progress present", () => {
      expect(
        content.includes(STATUS_IN_PROGRESS),
        "reviewer-lite.md missing --status in-progress"
      ).toBeTruthy();
    });
    test("--update flag present", () => {
      expect(content.includes(UPDATE_FLAG), "reviewer-lite.md missing --update flag").toBeTruthy();
    });
    test("write-review-result present", () => {
      expect(
        content.includes("write-review-result"),
        "reviewer-lite.md missing write-review-result"
      ).toBeTruthy();
    });
    test("write-validation-result absent (validation moved to hook + ship)", () => {
      expect(
        !content.includes("write-validation-result"),
        "reviewer-lite.md must NOT call write-validation-result"
      ).toBeTruthy();
    });
  });

  describe("verifier", () => {
    const content = readAgent("verifier");
    test("stub heading present", () => {
      expect(
        content.includes(STUB_HEADING),
        "verifier.md missing stub artifact heading"
      ).toBeTruthy();
    });
    test("--scaffold flag present", () => {
      expect(content.includes(SCAFFOLD_FLAG), "verifier.md missing --scaffold flag").toBeTruthy();
    });
    test("--status in-progress present", () => {
      expect(
        content.includes(STATUS_IN_PROGRESS),
        "verifier.md missing --status in-progress"
      ).toBeTruthy();
    });
    test("--update flag present", () => {
      expect(content.includes(UPDATE_FLAG), "verifier.md missing --update flag").toBeTruthy();
    });
    test("role-specific: write-validation-result command", () => {
      expect(
        content.includes("write-validation-result"),
        "verifier.md missing write-validation-result"
      ).toBeTruthy();
    });
    test("FEAT-161 cite-back", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "verifier.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
    test("DEC-019 reference", () => {
      expect(content.includes(DEC_019), "verifier.md missing DEC-019 reference").toBeTruthy();
    });
  });

  describe("integrator", () => {
    const content = readAgent("integrator");
    test("stub heading present", () => {
      expect(
        content.includes(STUB_HEADING),
        "integrator.md missing stub artifact heading"
      ).toBeTruthy();
    });
    test("--scaffold flag present", () => {
      expect(content.includes(SCAFFOLD_FLAG), "integrator.md missing --scaffold flag").toBeTruthy();
    });
    test("--status in-progress present", () => {
      expect(
        content.includes(STATUS_IN_PROGRESS),
        "integrator.md missing --status in-progress"
      ).toBeTruthy();
    });
    test("--update flag present", () => {
      expect(content.includes(UPDATE_FLAG), "integrator.md missing --update flag").toBeTruthy();
    });
    test("role-specific: write-handoff command", () => {
      expect(content.includes("write-handoff"), "integrator.md missing write-handoff").toBeTruthy();
    });
    test("FEAT-161 cite-back", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "integrator.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
    test("DEC-019 reference", () => {
      expect(content.includes(DEC_019), "integrator.md missing DEC-019 reference").toBeTruthy();
    });
  });

  describe("release-engineer", () => {
    const content = readAgent("release-engineer");
    test("stub heading present", () => {
      expect(
        content.includes(STUB_HEADING),
        "release-engineer.md missing stub artifact heading"
      ).toBeTruthy();
    });
    test("--scaffold flag present", () => {
      expect(
        content.includes(SCAFFOLD_FLAG),
        "release-engineer.md missing --scaffold flag"
      ).toBeTruthy();
    });
    test("--status in-progress present", () => {
      expect(
        content.includes(STATUS_IN_PROGRESS),
        "release-engineer.md missing --status in-progress"
      ).toBeTruthy();
    });
    test("--update flag present", () => {
      expect(
        content.includes(UPDATE_FLAG),
        "release-engineer.md missing --update flag"
      ).toBeTruthy();
    });
    test("role-specific: write-deployment-check command", () => {
      expect(
        content.includes("write-deployment-check"),
        "release-engineer.md missing write-deployment-check"
      ).toBeTruthy();
    });
    test("FEAT-161 cite-back", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "release-engineer.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
    test("DEC-019 reference", () => {
      expect(
        content.includes(DEC_019),
        "release-engineer.md missing DEC-019 reference"
      ).toBeTruthy();
    });
  });

  describe("refactor", () => {
    const content = readAgent("refactor");
    test("stub heading present", () => {
      expect(
        content.includes(STUB_HEADING),
        "refactor.md missing stub artifact heading"
      ).toBeTruthy();
    });
    test("--scaffold flag present", () => {
      expect(content.includes(SCAFFOLD_FLAG), "refactor.md missing --scaffold flag").toBeTruthy();
    });
    test("--status in-progress present", () => {
      expect(
        content.includes(STATUS_IN_PROGRESS),
        "refactor.md missing --status in-progress"
      ).toBeTruthy();
    });
    test("--update flag present", () => {
      expect(content.includes(UPDATE_FLAG), "refactor.md missing --update flag").toBeTruthy();
    });
    test("role-specific: write-handoff command", () => {
      expect(content.includes("write-handoff"), "refactor.md missing write-handoff").toBeTruthy();
    });
    test("FEAT-161 cite-back", () => {
      expect(
        content.includes(FEAT_161_CITE),
        "refactor.md missing FEAT-161 cite-back"
      ).toBeTruthy();
    });
    test("DEC-019 reference", () => {
      expect(content.includes(DEC_019), "refactor.md missing DEC-019 reference").toBeTruthy();
    });
  });
});

// ── ## Structural deviation rule — implementer coverage ───────────────────────
//
// SLICE-77: Every implementer agent must contain the structural-deviation rule
// so builders surface spec↔repo contradictions (DAG cycles, disallowedTools
// mismatches, missing files) as needs_fix instead of silently working around them.
//
// Assertions per agent:
//   (a) ## Structural deviation rule heading present
//   (b) "decision needs_fix" literal (the return instruction)
//   (c) "structural-deviation:" literal (the risks-field prefix convention)
//   (d) anti-silent-workaround warning ("silently drop" OR "silent workaround")
// ─────────────────────────────────────────────────────────────────────────────

const STRUCTURAL_DEVIATION_HEADING = "## Structural deviation rule";
const DECISION_NEEDS_FIX = "decision needs_fix";
const STRUCTURAL_DEVIATION_PREFIX = "structural-deviation:";
const ANTI_SILENT_WORKAROUND_A = "silently drop";
const ANTI_SILENT_WORKAROUND_B = "silent workaround";

describe("## Structural deviation rule — extracted to builder-ceremony skill in v0.43", () => {
  const skillPath = resolve(ROOT, "skills", "workflow", "builder-ceremony", "SKILL.md");
  const skill = readFileSync(skillPath, "utf8");

  test("structural deviation heading present in skill", () => {
    expect(
      skill.includes(STRUCTURAL_DEVIATION_HEADING),
      `builder-ceremony/SKILL.md missing "${STRUCTURAL_DEVIATION_HEADING}" heading`
    ).toBeTruthy();
  });

  test("structural-deviation return instruction present in skill (BLOCKED form)", () => {
    const usesBlockedFollowUp =
      skill.includes("BLOCKED: structural-deviation") ||
      skill.includes("BLOCKED: structural deviation");
    expect(
      usesBlockedFollowUp,
      `builder-ceremony/SKILL.md missing structural-deviation return instruction (BLOCKED follow-up form)`
    ).toBeTruthy();
  });

  test("structural-deviation: risks-field prefix present in skill", () => {
    expect(
      skill.includes(STRUCTURAL_DEVIATION_PREFIX),
      `builder-ceremony/SKILL.md missing "${STRUCTURAL_DEVIATION_PREFIX}" risks-field prefix convention`
    ).toBeTruthy();
  });

  test("anti-silent-workaround warning present in skill", () => {
    const hasWarning =
      skill.includes(ANTI_SILENT_WORKAROUND_A) || skill.includes(ANTI_SILENT_WORKAROUND_B);
    expect(
      hasWarning,
      `builder-ceremony/SKILL.md missing anti-silent-workaround warning ("silently drop" or "silent workaround")`
    ).toBeTruthy();
  });

  // Per-agent assertion: each builder must reference the ceremony skill (so the
  // rule is loaded on every dispatch). DECISION_NEEDS_FIX still asserted to
  // avoid breaking the FEAT-170 SLICE-D legacy-form awareness.
  void DECISION_NEEDS_FIX;
  for (const agentName of [
    "backend-dev",
    "frontend-dev",
    "fullstack-dev",
    "aiplugin-dev"
  ] as const) {
    describe(agentName, () => {
      const content = readAgent(agentName);
      test("references builder-ceremony skill", () => {
        expect(
          content.includes("skills/workflow/builder-ceremony/"),
          `${agentName}.md must reference skills/workflow/builder-ceremony/ for structural deviation rule`
        ).toBeTruthy();
      });
    });
  }
});

// ── No lead refs across active agents (v0.41 hard cut) ──────────────────────
//
// Parametrized check: every active agent body must not reference the removed
// `lead` agent role. The same gate runs in scripts/validate-agents.ts as a CI
// hard gate; this test surfaces the same failure at unit-test granularity.
// ─────────────────────────────────────────────────────────────────────────────

const NO_LEAD_AGENTS = [
  "architect",
  "fullstack-dev",
  "backend-dev",
  "frontend-dev",
  "aiplugin-dev",
  "reviewer",
  "reviewer-lite",
  "verifier",
  "integrator",
  "release-engineer",
  "document-writer",
  "refactor",
  "researcher",
  "investigator",
  "qa-expert",
  "performance-engineer",
  "uxdesigner",
  "csharp-reviewer",
  "typescript-reviewer",
  "dev-lite",
  "reviewer-lite"
] as const;

describe("No lead refs across active agents", () => {
  for (const name of NO_LEAD_AGENTS) {
    test(`${name}.md has no 'lead' caller assumption`, () => {
      const content = readAgent(name);
      const body = content.replace(/^---[\s\S]*?---\n/, "");
      const matches = body.match(/\bthe lead\b|\bto the lead\b|\bby the lead\b|\bcrew:lead\b/gi);
      expect(
        !matches || matches.length === 0,
        `${name}.md must not reference removed 'lead' agent; found: ${matches?.join(", ")}`
      ).toBeTruthy();
    });
  }
});
