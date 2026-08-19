import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "bun:test";
import assert from "node:assert/strict";

// Tests for hooks/guard-feat-dispatch.mjs. Covers the P1.0 feature-flag
// envelope around the exit-2 block path (features.dispatch-guard-block.
// enabled) plus the P1.8 allowlist rename: current runner:* ids pass,
// retired loop:*/devcrew:builder* ids still pass this release as legacy
// aliases, and general-purpose stays blocked (that's the entire point of
// this hook).

// Dual-layout resolution: Bun runs .mts directly from src/tests/, Node's
// compiled runner would resolve from tests/.
let hookPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1")),
  "..",
  "hooks",
  "guard-feat-dispatch.mjs"
);
try {
  await fs.stat(hookPath);
} catch {
  hookPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1")),
    "../..",
    "hooks",
    "guard-feat-dispatch.mjs"
  );
}

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeLoopConfig(repo: string, config: unknown): Promise<void> {
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(path.join(repo, ".claude", "loop.json"), JSON.stringify(config, null, 2));
}

function runHook(
  repo: string,
  payload: Record<string, unknown>
): { status: number | null; stderr: string } {
  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify({ cwd: repo, ...payload }),
    encoding: "utf8"
  });
  return { status: result.status, stderr: result.stderr || "" };
}

test("guard-feat-dispatch: exists as a file", async () => {
  const stat = await fs.stat(hookPath);
  assert.ok(stat.isFile());
});

test("guard-feat-dispatch: blocks (exit 2) by default — no .claude/loop.json present", async () => {
  const repo = await tmpRepo("gfd-default-block-");
  const result = runHook(repo, {
    tool_name: "Agent",
    tool_input: { subagent_type: "general-purpose", prompt: "implement FEAT-999" }
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^BLOCKED/);
});

test("guard-feat-dispatch: warn-only (exit 0) when features.dispatch-guard-block.enabled=false", async () => {
  const repo = await tmpRepo("gfd-warn-mode-");
  await writeLoopConfig(repo, { features: { "dispatch-guard-block": { enabled: false } } });
  const result = runHook(repo, {
    tool_name: "Agent",
    tool_input: { subagent_type: "general-purpose", prompt: "implement FEAT-999" }
  });
  assert.equal(result.status, 0, "warn mode must not block");
  assert.match(result.stderr, /WARN/, "warning message must still print");
  assert.match(result.stderr, /FEAT-999/);
});

test("guard-feat-dispatch: explicit enabled=true behaves like default (blocks)", async () => {
  const repo = await tmpRepo("gfd-explicit-true-");
  await writeLoopConfig(repo, { features: { "dispatch-guard-block": { enabled: true } } });
  const result = runHook(repo, {
    tool_name: "Agent",
    tool_input: { subagent_type: "general-purpose", prompt: "implement FEAT-999" }
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^BLOCKED/);
});

test("guard-feat-dispatch: legacy alias crew:builder still passes this release (exit 0)", async () => {
  const repo = await tmpRepo("gfd-allowlist-");
  const result = runHook(repo, {
    tool_name: "Agent",
    tool_input: { subagent_type: "crew:builder", prompt: "implement FEAT-999" }
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
});

// P1.8 allowlist rename coverage.

test("guard-feat-dispatch: devcrew:architect (renamed from loop:architect) passes", async () => {
  const repo = await tmpRepo("gfd-runner-architect-");
  const result = runHook(repo, {
    tool_name: "Agent",
    tool_input: { subagent_type: "devcrew:architect", prompt: "implement FEAT-999" }
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
});

test("guard-feat-dispatch: devcrew:document-writer (renamed from loop:document-writer) passes", async () => {
  const repo = await tmpRepo("gfd-runner-docwriter-");
  const result = runHook(repo, {
    tool_name: "Agent",
    tool_input: { subagent_type: "devcrew:document-writer", prompt: "implement FEAT-999" }
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
});

test("guard-feat-dispatch: devcrew:pm and devcrew:researcher (renamed from loop:pm / loop:researcher) pass", async () => {
  const repoPm = await tmpRepo("gfd-runner-pm-");
  const pmResult = runHook(repoPm, {
    tool_name: "Agent",
    tool_input: { subagent_type: "devcrew:pm", prompt: "implement FEAT-999" }
  });
  assert.equal(pmResult.status, 0);

  const repoResearcher = await tmpRepo("gfd-runner-researcher-");
  const researcherResult = runHook(repoResearcher, {
    tool_name: "Agent",
    tool_input: { subagent_type: "devcrew:researcher", prompt: "implement FEAT-999" }
  });
  assert.equal(researcherResult.status, 0);
});

test("guard-feat-dispatch: old loop:architect still passes this release as a legacy alias", async () => {
  const repo = await tmpRepo("gfd-legacy-loop-architect-");
  const result = runHook(repo, {
    tool_name: "Agent",
    tool_input: { subagent_type: "loop:architect", prompt: "implement FEAT-999" }
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
});

test("guard-feat-dispatch: devcrew:dev-lite and devcrew:investigator pass (newly added ceremony participants)", async () => {
  const repoDevLite = await tmpRepo("gfd-dev-lite-");
  const devLiteResult = runHook(repoDevLite, {
    tool_name: "Agent",
    tool_input: { subagent_type: "devcrew:dev-lite", prompt: "implement FEAT-999" }
  });
  assert.equal(devLiteResult.status, 0);

  const repoInvestigator = await tmpRepo("gfd-investigator-");
  const investigatorResult = runHook(repoInvestigator, {
    tool_name: "Agent",
    tool_input: { subagent_type: "devcrew:investigator", prompt: "implement FEAT-999" }
  });
  assert.equal(investigatorResult.status, 0);
});

test("guard-feat-dispatch: read-only review-gate reviewers pass (runner#404)", async () => {
  for (const reviewer of [
    "devcrew:architect-reviewer",
    "devcrew:csharp-reviewer",
    "devcrew:typescript-reviewer",
    "devcrew:reviewer-lite"
  ]) {
    const repo = await tmpRepo("gfd-reviewer-fanout-");
    const result = runHook(repo, {
      tool_name: "Agent",
      tool_input: { subagent_type: reviewer, prompt: "review FEAT-999 diff" }
    });
    assert.equal(result.status, 0, `${reviewer} should pass the FEAT-dispatch guard`);
  }
});

test("guard-feat-dispatch: general-purpose stays blocked — never allowlisted, that's the point of the hook", async () => {
  const repo = await tmpRepo("gfd-general-purpose-still-blocked-");
  const result = runHook(repo, {
    tool_name: "Agent",
    tool_input: { subagent_type: "general-purpose", prompt: "implement FEAT-999" }
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^BLOCKED/);
});

test("guard-feat-dispatch: retired crew:reviewer-validator and crew:validator still pass this release", async () => {
  const repoRV = await tmpRepo("gfd-reviewer-validator-");
  const rvResult = runHook(repoRV, {
    tool_name: "Agent",
    tool_input: { subagent_type: "crew:reviewer-validator", prompt: "implement FEAT-999" }
  });
  assert.equal(rvResult.status, 0);

  const repoValidator = await tmpRepo("gfd-validator-");
  const validatorResult = runHook(repoValidator, {
    tool_name: "Agent",
    tool_input: { subagent_type: "crew:validator", prompt: "implement FEAT-999" }
  });
  assert.equal(validatorResult.status, 0);
});

test("guard-feat-dispatch: override guidance text lists the current runner:* ids, not stale loop:* only", async () => {
  const repo = await tmpRepo("gfd-override-text-");
  const result = runHook(repo, {
    tool_name: "Agent",
    tool_input: { subagent_type: "general-purpose", prompt: "implement FEAT-999" }
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /devcrew:architect/);
  assert.match(result.stderr, /devcrew:document-writer/);
  assert.match(result.stderr, /\/devcrew:start/);
  assert.match(result.stderr, /\/devcrew:close/);
});

test("guard-feat-dispatch: non-FEAT prompts pass through regardless of flag state", async () => {
  const repo = await tmpRepo("gfd-no-feat-");
  await writeLoopConfig(repo, { features: { "dispatch-guard-block": { enabled: false } } });
  const result = runHook(repo, {
    tool_name: "Agent",
    tool_input: { subagent_type: "general-purpose", prompt: "no feature id here" }
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
});
