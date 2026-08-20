import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "bun:test";
import assert from "node:assert/strict";

// Tests for hooks/guard-feat-dispatch.mjs. Covers the P1.0 feature-flag
// envelope around the exit-2 block path (features.dispatch-guard-block.
// enabled), the P1.8 allowlist rename (current devcrew:* ids pass), and the
// FEAT-017/SLICE-45 hard-fail: the `crew:*`/`loop:*` legacy aliases that
// were kept allowlisted for one release after the devcrew 1.0.0 cutover
// now block like any other unrecognized subagent_type, with an actionable
// successor pointer in the stderr message. general-purpose stays blocked
// regardless (that's the entire point of this hook).

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

test("guard-feat-dispatch: legacy alias crew:builder hard-fails as of v1.1.0 (FEAT-017/SLICE-45)", async () => {
  const repo = await tmpRepo("gfd-allowlist-");
  const result = runHook(repo, {
    tool_name: "Agent",
    tool_input: { subagent_type: "crew:builder", prompt: "implement FEAT-999" }
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^BLOCKED/);
  assert.match(result.stderr, /Legacy token 'crew:builder' is retired as of devcrew v1\.1\.0/);
  assert.match(result.stderr, /devcrew:fullstack-dev/);
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

test("guard-feat-dispatch: old loop:architect hard-fails as of v1.1.0, names devcrew:architect as successor", async () => {
  const repo = await tmpRepo("gfd-legacy-loop-architect-");
  const result = runHook(repo, {
    tool_name: "Agent",
    tool_input: { subagent_type: "loop:architect", prompt: "implement FEAT-999" }
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^BLOCKED/);
  assert.match(result.stderr, /Legacy token 'loop:architect' is retired as of devcrew v1\.1\.0 — use devcrew:architect\./);
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

test("guard-feat-dispatch: retired crew:reviewer-validator and crew:validator hard-fail as of v1.1.0", async () => {
  const repoRV = await tmpRepo("gfd-reviewer-validator-");
  const rvResult = runHook(repoRV, {
    tool_name: "Agent",
    tool_input: { subagent_type: "crew:reviewer-validator", prompt: "implement FEAT-999" }
  });
  assert.equal(rvResult.status, 2);
  assert.match(rvResult.stderr, /^BLOCKED/);
  assert.match(rvResult.stderr, /Legacy token 'crew:reviewer-validator' is retired as of devcrew v1\.1\.0/);
  assert.match(rvResult.stderr, /devcrew:verifier/);

  const repoValidator = await tmpRepo("gfd-validator-");
  const validatorResult = runHook(repoValidator, {
    tool_name: "Agent",
    tool_input: { subagent_type: "crew:validator", prompt: "implement FEAT-999" }
  });
  assert.equal(validatorResult.status, 2);
  assert.match(validatorResult.stderr, /^BLOCKED/);
  assert.match(validatorResult.stderr, /Legacy token 'crew:validator' is retired as of devcrew v1\.1\.0 — use devcrew:verifier\./);
});

test("guard-feat-dispatch: retired crew:reviewer, crew:deployer, crew:copywriter, crew:builder-be/-fe hard-fail with successor guidance", async () => {
  const cases: Array<[string, RegExp]> = [
    ["crew:reviewer", /devcrew:reviewer-lite/],
    ["crew:deployer", /devcrew:release-engineer/],
    ["crew:copywriter", /devcrew:document-writer/],
    ["crew:builder-be", /devcrew:backend-dev/],
    ["crew:builder-fe", /devcrew:frontend-dev/]
  ];
  for (const [token, successorPattern] of cases) {
    const repo = await tmpRepo("gfd-legacy-crew-");
    const result = runHook(repo, {
      tool_name: "Agent",
      tool_input: { subagent_type: token, prompt: "implement FEAT-999" }
    });
    assert.equal(result.status, 2, `${token} should hard-fail`);
    assert.match(result.stderr, new RegExp(`Legacy token '${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}' is retired`));
    assert.match(result.stderr, successorPattern, `${token} message should name its successor`);
  }
});

test("guard-feat-dispatch: retired loop:document-writer, loop:pm, loop:researcher hard-fail, naming their 1:1 devcrew rename", async () => {
  const cases: Array<[string, string]> = [
    ["loop:document-writer", "devcrew:document-writer"],
    ["loop:pm", "devcrew:pm"],
    ["loop:researcher", "devcrew:researcher"]
  ];
  for (const [token, successor] of cases) {
    const repo = await tmpRepo("gfd-legacy-loop-");
    const result = runHook(repo, {
      tool_name: "Agent",
      tool_input: { subagent_type: token, prompt: "implement FEAT-999" }
    });
    assert.equal(result.status, 2, `${token} should hard-fail`);
    assert.match(
      result.stderr,
      new RegExp(`Legacy token '${token}' is retired as of devcrew v1\\.1\\.0 — use ${successor}\\.`)
    );
  }
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
