// src/tests/wave/dispatch-prompt.test.mts
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { _resetResolveCache, _setWireProvider } from "@astragenie/astramem-client";
import {
  buildDispatchPrompt,
  buildDispatchPromptWithMemory
} from "../../scripts/lib/wave/dispatch-prompt.mjs";
import { logLearning } from "../../scripts/lib/learnings.mjs";

describe("buildDispatchPrompt", () => {
  test("normal mode contains slice command + slice id + worktree path", () => {
    const p = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/devcrew:orchestrate-slice",
      mode: "normal"
    });
    expect(p).toContain("/devcrew:orchestrate-slice --id SLICE-117");
    expect(p).toContain("/tmp/wt/SLICE-117");
    expect(p).toContain("JSON marker");
  });

  test("fix mode includes failure artifact path and /devcrew:fix invocation", () => {
    const p = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/devcrew:orchestrate-slice",
      mode: "fix",
      failureArtifactPath: ".claude/artifacts/crew/handoffs/SLICE-117-fail.md"
    });
    expect(p).toContain("/devcrew:fix --slice SLICE-117");
    expect(p).toContain(".claude/artifacts/crew/handoffs/SLICE-117-fail.md");
    expect(p).toContain("fix mode");
  });

  test("fix mode without failure artifact uses no-artifact phrasing", () => {
    const p = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/devcrew:orchestrate-slice",
      mode: "fix"
    });
    expect(p).toContain("no failure artifact was captured");
  });
});

// FEAT-188 S3b residual (#368) golden test — mirrors post-builder-fanout.test.mts's
// "FEAT-219 golden: memory off/absent is byte-identical; memory on prepends
// without garbling the contract wording". Neutralizes astramem provider
// resolution via @astragenie/astramem-client's own test seam (FEAT-235 —
// recallSilent's underlying resolveWireProvider(), not a CLI fixture) so the
// test is deterministic regardless of host provider state.
describe("buildDispatchPromptWithMemory", () => {
  let repo: string | null = null;

  beforeEach(async () => {
    _setWireProvider(null);
    _resetResolveCache();
    repo = await fs.mkdtemp(path.join(os.tmpdir(), "wave-memctx-repo-"));
  });

  afterEach(async () => {
    if (repo) await fs.rm(repo, { recursive: true, force: true }).catch(() => undefined);
    repo = null;
    _setWireProvider(null);
    _resetResolveCache();
  });

  test("memory off/absent is byte-identical to buildDispatchPrompt", async () => {
    const base = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/devcrew:orchestrate-slice",
      mode: "normal"
    });
    const withMemory = await buildDispatchPromptWithMemory({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/devcrew:orchestrate-slice",
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
      sliceCommand: "/devcrew:orchestrate-slice",
      mode: "normal"
    });
    const withMemory = await buildDispatchPromptWithMemory({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/devcrew:orchestrate-slice",
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
      sliceCommand: "/devcrew:orchestrate-slice",
      mode: "normal"
    });
    const withMemory = await buildDispatchPromptWithMemory({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/devcrew:orchestrate-slice",
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
