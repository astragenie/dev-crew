// src/tests/wave/dispatch-prompt.test.mts
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildDispatchPrompt,
  buildDispatchPromptWithMemory
} from "../../scripts/lib/wave/dispatch-prompt.mjs";
import { logLearning } from "../../scripts/lib/learnings.mjs";
import { _resetCliCache } from "../../scripts/lib/memory-bridge.mjs";

describe("buildDispatchPrompt", () => {
  test("normal mode contains slice command + slice id + worktree path", () => {
    const p = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "normal"
    });
    expect(p).toContain("/crew:orchestrate-slice --id SLICE-117");
    expect(p).toContain("/tmp/wt/SLICE-117");
    expect(p).toContain("JSON marker");
  });

  test("fix mode includes failure artifact path and /crew:fix invocation", () => {
    const p = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "fix",
      failureArtifactPath: ".claude/artifacts/crew/handoffs/SLICE-117-fail.md"
    });
    expect(p).toContain("/crew:fix --slice SLICE-117");
    expect(p).toContain(".claude/artifacts/crew/handoffs/SLICE-117-fail.md");
    expect(p).toContain("fix mode");
  });

  test("fix mode without failure artifact uses no-artifact phrasing", () => {
    const p = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "fix"
    });
    expect(p).toContain("no failure artifact was captured");
  });
});

// FEAT-188 S3b residual (#368) golden test — mirrors post-builder-fanout.test.mts's
// "FEAT-219 golden: memory off/absent is byte-identical; memory on prepends
// without garbling the contract wording". Neutralizes astramem CLI resolution
// the same way (deliberately-broken binary pinned via CLAUDE_PLUGIN_ROOT_MEMORY)
// so recallPrior's fallback path is deterministic regardless of host PATH state.
describe("buildDispatchPromptWithMemory", () => {
  let repo: string | null = null;
  let brokenCliRoot: string | null = null;
  let origPluginRoot: string | undefined;

  beforeEach(async () => {
    _resetCliCache();
    origPluginRoot = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wave-memctx-cli-"));
    const binDir = path.join(dir, "bin");
    await fs.mkdir(binDir, { recursive: true });
    await fs.writeFile(path.join(binDir, "astramem"), "#!/bin/sh\nexit 1\n");
    await fs.chmod(path.join(binDir, "astramem"), 0o755).catch(() => undefined);
    brokenCliRoot = dir;
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = dir;
    repo = await fs.mkdtemp(path.join(os.tmpdir(), "wave-memctx-repo-"));
  });

  afterEach(async () => {
    if (origPluginRoot !== undefined) {
      process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = origPluginRoot;
    } else {
      delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    }
    if (brokenCliRoot)
      await fs.rm(brokenCliRoot, { recursive: true, force: true }).catch(() => undefined);
    if (repo) await fs.rm(repo, { recursive: true, force: true }).catch(() => undefined);
    brokenCliRoot = null;
    repo = null;
    _resetCliCache();
  });

  test("memory off/absent is byte-identical to buildDispatchPrompt", async () => {
    const base = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "normal"
    });
    const withMemory = await buildDispatchPromptWithMemory({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "normal",
      repoPath: repo as string,
      featureId: "FEAT-368",
      config: null
    });
    expect(withMemory).toBe(base);
    expect(withMemory.includes("## Recent context")).toBe(false);
  });

  test("memory on prepends a Recent-context block without disturbing the base prompt", async () => {
    await logLearning(repo as string, {
      key: "wave-flaky-worktree",
      insight: "Retry worktree creation once before failing the wave.",
      agentType: "builder"
    });
    const base = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "normal"
    });
    const withMemory = await buildDispatchPromptWithMemory({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "normal",
      repoPath: repo as string,
      featureId: "FEAT-368",
      config: { memory: { enabled: true } }
    });
    expect(withMemory.startsWith("## Recent context")).toBe(true);
    expect(withMemory.endsWith(base)).toBe(true);
  });

  test("fails open: a corrupt learnings.jsonl never breaks the dispatch prompt", async () => {
    await fs.mkdir(path.join(repo as string, ".claude", "artifacts", "loop"), { recursive: true });
    await fs.writeFile(
      path.join(repo as string, ".claude", "artifacts", "loop", "learnings.jsonl"),
      "{not valid json\n"
    );
    const base = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "normal"
    });
    const withMemory = await buildDispatchPromptWithMemory({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "normal",
      repoPath: repo as string,
      featureId: "FEAT-368",
      config: { memory: { enabled: true } }
    });
    // No learnings/lessons/decisions/recall entries exist -> renderBlock returns
    // "" -> byte-identical to base, proving the malformed line was swallowed.
    expect(withMemory).toBe(base);
  });
});
