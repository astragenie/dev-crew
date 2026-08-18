import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  DEFAULT_MEMORY_ENABLED,
  DEFAULT_PROFILE_ENABLED,
  DEFAULT_TOP_LESSONS,
  DEFAULT_PROFILE_TIMEOUT_MS,
  DEFAULT_FEEDBACK_ENABLED,
  DEFAULT_FEEDBACK_TIMEOUT_MS,
  DEFAULT_CREDIT_LOOP_ENABLED,
  DEFAULT_CREDIT_LOOP_K,
  parseMemoryOverrides,
  runMemorySetup
} from "../scripts/lib/memory-setup.mjs";
import { checkMemoryConfig } from "../scripts/validate-memory-config.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}
async function readConfig(repo: string): Promise<Record<string, any>> {
  return JSON.parse(await fs.readFile(path.join(repo, ".claude", "loop.json"), "utf8"));
}

// ─── parseMemoryOverrides ─────────────────────────────────────────────────

test("parseMemoryOverrides: empty / null / undefined returns empty object", () => {
  assert.deepEqual(parseMemoryOverrides(null), {});
  assert.deepEqual(parseMemoryOverrides(""), {});
  assert.deepEqual(parseMemoryOverrides(undefined), {});
});

test("parseMemoryOverrides: parses project + numeric keys", () => {
  const out = parseMemoryOverrides("project=my-repo,topLessons=15,creditLoopK=7");
  assert.deepEqual(out, {
    project: "my-repo",
    topLessons: 15,
    creditLoopK: 7
  });
});

test("parseMemoryOverrides: parses boolean + enabled=auto", () => {
  const out = parseMemoryOverrides("feedbackEnabled=false,creditLoopEnabled=true,enabled=auto");
  assert.deepEqual(out, {
    feedbackEnabled: false,
    creditLoopEnabled: true,
    enabled: "auto"
  });
});

test("parseMemoryOverrides: enabled=false parses to boolean false", () => {
  assert.deepEqual(parseMemoryOverrides("enabled=false"), { enabled: false });
});

test("parseMemoryOverrides: unknown key throws", () => {
  assert.throws(() => parseMemoryOverrides("notARealKey=1"), /Unknown override/);
});

test("parseMemoryOverrides: invalid enabled value throws", () => {
  assert.throws(() => parseMemoryOverrides("enabled=banana"), /must be "true", "false", or "auto"/);
});

test("parseMemoryOverrides: invalid boolean value throws", () => {
  assert.throws(() => parseMemoryOverrides("feedbackEnabled=banana"), /must be "true" or "false"/);
});

test("parseMemoryOverrides: missing = throws", () => {
  assert.throws(() => parseMemoryOverrides("topLessons"), /Expected KEY=VALUE/);
});

// ─── runMemorySetup ───────────────────────────────────────────────────────

test("runMemorySetup: fresh repo -> writes full default shape", async () => {
  const repo = await tmpRepo("loop-memory-setup-fresh-");
  try {
    const result = await runMemorySetup(repo);
    assert.equal(result.written, true);
    assert.equal(result.effective.enabled, DEFAULT_MEMORY_ENABLED);
    assert.equal(result.effective.project, path.basename(repo));
    assert.equal(result.effective.profile.enabled, DEFAULT_PROFILE_ENABLED);
    assert.equal(result.effective.profile.topLessons, DEFAULT_TOP_LESSONS);
    assert.equal(result.effective.profile.timeoutMs, DEFAULT_PROFILE_TIMEOUT_MS);
    assert.equal(result.effective.feedback.enabled, DEFAULT_FEEDBACK_ENABLED);
    assert.equal(result.effective.feedback.timeoutMs, DEFAULT_FEEDBACK_TIMEOUT_MS);
    assert.equal(result.effective.feedback.creditLoop.enabled, DEFAULT_CREDIT_LOOP_ENABLED);
    assert.equal(result.effective.feedback.creditLoop.k, DEFAULT_CREDIT_LOOP_K);

    const cfg = await readConfig(repo);
    assert.equal(cfg.memory.enabled, true);
    assert.equal(cfg.memory.project, path.basename(repo));
    assert.equal(cfg.memory.profile.topLessons, DEFAULT_TOP_LESSONS);
    assert.equal(cfg.memory.feedback.creditLoop.k, DEFAULT_CREDIT_LOOP_K);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("runMemorySetup: idempotent -- second run writes nothing", async () => {
  const repo = await tmpRepo("loop-memory-setup-idem-");
  try {
    const first = await runMemorySetup(repo);
    assert.equal(first.written, true);
    const second = await runMemorySetup(repo);
    assert.equal(second.written, false, "second invocation must detect no change");
    assert.deepEqual(second.effective, first.effective);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("runMemorySetup: existing partial block is merged, not clobbered", async () => {
  const repo = await tmpRepo("loop-memory-setup-partial-");
  try {
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({
        preset: "typescript-plugin-dev",
        memory: {
          project: "custom-project-name",
          profile: { topLessons: 25 },
          customField: "keep-me"
        }
      })
    );

    const result = await runMemorySetup(repo);
    assert.equal(result.written, true);
    // Existing custom values survive.
    assert.equal(result.effective.project, "custom-project-name");
    assert.equal(result.effective.profile.topLessons, 25);
    // Missing fields filled in with defaults.
    assert.equal(result.effective.enabled, DEFAULT_MEMORY_ENABLED);
    assert.equal(result.effective.feedback.creditLoop.enabled, DEFAULT_CREDIT_LOOP_ENABLED);
    assert.equal(result.effective.feedback.creditLoop.k, DEFAULT_CREDIT_LOOP_K);

    const cfg = await readConfig(repo);
    assert.equal(cfg.memory.project, "custom-project-name");
    assert.equal(cfg.memory.profile.topLessons, 25);
    assert.equal(cfg.memory.customField, "keep-me");
    assert.equal(cfg.preset, "typescript-plugin-dev");

    // Re-running against the now-complete block is a no-op.
    const second = await runMemorySetup(repo);
    assert.equal(second.written, false);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("runMemorySetup: explicit enabled:false is preserved, not overwritten", async () => {
  const repo = await tmpRepo("loop-memory-setup-disabled-");
  try {
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({ memory: { enabled: false, project: "opted-out-repo" } })
    );

    const result = await runMemorySetup(repo);
    assert.equal(result.effective.enabled, false);

    const cfg = await readConfig(repo);
    assert.equal(cfg.memory.enabled, false);

    // Re-run does not flip it back on.
    const second = await runMemorySetup(repo);
    assert.equal(second.effective.enabled, false);
    assert.equal(second.written, false);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("runMemorySetup: explicit feedback.creditLoop.enabled:false is preserved", async () => {
  const repo = await tmpRepo("loop-memory-setup-creditloop-off-");
  try {
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({
        memory: {
          project: "p",
          feedback: { creditLoop: { enabled: false, k: 3 } }
        }
      })
    );

    const result = await runMemorySetup(repo);
    assert.equal(result.effective.feedback.creditLoop.enabled, false);
    assert.equal(result.effective.feedback.creditLoop.k, 3);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("runMemorySetup: overrides take precedence over both existing + default", async () => {
  const repo = await tmpRepo("loop-memory-setup-override-");
  try {
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({ memory: { project: "existing", profile: { topLessons: 10 } } })
    );
    const result = await runMemorySetup(repo, { project: "override-wins", topLessons: 99 });
    assert.equal(result.effective.project, "override-wins");
    assert.equal(result.effective.profile.topLessons, 99);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("runMemorySetup: preserves non-memory top-level keys", async () => {
  const repo = await tmpRepo("loop-memory-setup-preserve-");
  try {
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({ preset: "p", loop: { cost: { ceilingUsd: 75 } } })
    );
    await runMemorySetup(repo);
    const cfg = await readConfig(repo);
    assert.equal(cfg.preset, "p");
    assert.equal(cfg.loop.cost.ceilingUsd, 75);
    assert.equal(cfg.memory.enabled, true);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ─── AC-3: seeded config passes the validate-memory-config.mts gate ───────

test("runMemorySetup: seeded fresh-repo config passes checkMemoryConfig", async () => {
  const repo = await tmpRepo("loop-memory-setup-gate-fresh-");
  try {
    await runMemorySetup(repo);
    const cfg = await readConfig(repo);
    assert.equal(checkMemoryConfig(cfg).status, "ok");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("runMemorySetup: seeded merged-partial config passes checkMemoryConfig", async () => {
  const repo = await tmpRepo("loop-memory-setup-gate-partial-");
  try {
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({ memory: { project: "custom" } })
    );
    await runMemorySetup(repo);
    const cfg = await readConfig(repo);
    assert.equal(checkMemoryConfig(cfg).status, "ok");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
