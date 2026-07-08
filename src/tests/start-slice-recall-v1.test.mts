// FEAT-188 S3b — golden tests for start-slice.mts's recall injection.
//
// runRecallHook (start-slice.mts) retired its hand-rolled CLI-spawn transport
// (memory-recall.mts's recallPrior) and legacy block format
// (recall-injector.mts's formatRecallBlock) in favor of the frozen
// recall-injection-v1 contract (dev-team docs/contracts/recall-injection-v1.md),
// sourced via the shared @astragenie/astramem-client's recallSilent. This
// suite covers the two invariants the contract calls out as load-bearing:
//   (a) recall OFF -> dispatch text carries no recall block at all.
//   (b) recall ON  -> the injected block matches the frozen
//       `## Prior context (from astramem)` / `- **[<kind> <severity>]** ...`
//       shape byte-for-byte, and the dispatch body underneath it is
//       byte-identical to the OFF-path dispatch body.
import { afterEach, test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _resetResolveCache, _setWireProvider } from "@astragenie/astramem-client";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { sliceFromFeature, startSlice } from "../scripts/lib/slice-linker.mjs";
import { AC_SECTION_BODY } from "./_fixtures.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

// Read back the same loop.json tmpRepo() just wrote, so a per-test `memory`
// override shares every other resolved path/default with the config
// sliceFromFeature() used to create the slice — only `memory` differs.
async function baseConfig(repo: string): Promise<Record<string, any>> {
  const raw = await fs.readFile(path.join(repo, ".claude/loop.json"), "utf8");
  return JSON.parse(raw);
}

async function fillPlaceholderACs(slicePath: string): Promise<void> {
  const content = await fs.readFile(slicePath, "utf8");
  const fixed = content.replace(
    /- \[ \] AC-2: <replace with a concrete, testable acceptance criterion>/g,
    "- [ ] AC-2: Feature behaves as expected per the slice objective"
  );
  await fs.writeFile(slicePath, fixed);
}

async function makeStartedSlice(repo: string, config: Record<string, any>) {
  const feat = await addFeature(repo, { title: "Recall v1 feature", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  return startSlice(repo, slice.id, { config });
}

afterEach(() => {
  _setWireProvider(null);
  _resetResolveCache();
});

test("recall OFF: dispatchInstruction carries no recall block", async () => {
  const repo = await tmpRepo("al-recall-v1-off-");
  const config = await baseConfig(repo);
  config.memory = { enabled: "on", recall: { enabled: false } };

  // Stand a provider by that WOULD answer with hits if ever called — proves
  // the config gate short-circuits before the transport is touched.
  _setWireProvider({
    remember: async () => undefined,
    recall: async () => ({
      hits: [{ id: "x", type: "lesson", text: "should never appear", score: 1, source: "S" }]
    }),
    health: async () => ({ ok: true })
  });

  const result = await makeStartedSlice(repo, config);

  assert.ok(result.dispatchInstruction, "dispatchInstruction should be present");
  assert.doesNotMatch(
    result.dispatchInstruction,
    /## Prior context \(from astramem\)/,
    "no recall block should be injected when memory.recall.enabled is false"
  );
  assert.match(result.dispatchInstruction, /^Dispatch crew:fullstack-dev subagent/);
});

test("recall ON: block matches recall-injection-v1 contract format; dispatch body below it is byte-identical to the OFF path", async () => {
  const repoOff = await tmpRepo("al-recall-v1-baseline-");
  const offConfig = await baseConfig(repoOff);
  offConfig.memory = { enabled: "on", recall: { enabled: false } };
  const offResult = await makeStartedSlice(repoOff, offConfig);
  assert.ok(offResult.dispatchInstruction);

  // Two hits: one with a recognized kind + source (exercises the pass-through
  // branches), one with an unrecognized kind + no source (exercises the
  // kind-fallback -> "lesson" and source-default -> "astramem" branches).
  _setWireProvider({
    remember: async () => undefined,
    recall: async () => ({
      hits: [
        {
          id: "h1",
          type: "lesson",
          text: "Retry the daemon check before marking unreachable.",
          score: 0.9,
          source: "SLICE-77"
        },
        { id: "h2", type: "unknown_kind", text: "Something weird happened.", score: 0.5 }
      ]
    }),
    health: async () => ({ ok: true })
  });

  const repoOn = await tmpRepo("al-recall-v1-on-");
  const onConfig = await baseConfig(repoOn);
  onConfig.memory = { enabled: "on", recall: { enabled: true, k: 5 } };
  const onResult = await makeStartedSlice(repoOn, onConfig);
  assert.ok(onResult.dispatchInstruction);

  const expectedBlock = [
    "## Prior context (from astramem)",
    "- **[lesson medium]** SLICE-77 Retry the daemon check before marking unreachable.",
    "- **[lesson medium]** astramem Something weird happened."
  ].join("\n");

  assert.ok(
    onResult.dispatchInstruction.startsWith(`${expectedBlock}\n\n`),
    "recall block must match the frozen recall-injection-v1 format byte-for-byte"
  );

  const dispatchBodyOn = onResult.dispatchInstruction.slice(expectedBlock.length + 2);
  assert.equal(
    dispatchBodyOn,
    offResult.dispatchInstruction,
    "dispatch body beneath the recall block must be byte-identical to the OFF-path dispatch"
  );
});

test("FEAT-233/DEC-071: memory.capMs is the fallback cap when memory.recall.timeoutMs is unset", async () => {
  const repo = await tmpRepo("al-recall-v1-capms-");
  const config = await baseConfig(repo);
  // No memory.recall.timeoutMs set -> recall should fall back to the shared
  // memory.capMs override instead of its own DEFAULT_RECALL_CAP_MS (5000).
  config.memory = { enabled: "on", capMs: 300, recall: { enabled: true, k: 5 } };

  // Provider that never resolves: proves the cap that actually fired was the
  // small memory.capMs override, not the 5000ms recall default.
  _setWireProvider({
    remember: async () => undefined,
    recall: () => new Promise(() => {}),
    health: async () => ({ ok: true })
  });

  const started = Date.now();
  const result = await makeStartedSlice(repo, config);
  const elapsed = Date.now() - started;

  assert.ok(result.dispatchInstruction);
  assert.ok(
    elapsed < 3000,
    `expected memory.capMs=300 fallback to cap recall well under the 5000ms default (elapsed=${elapsed}ms)`
  );
});
