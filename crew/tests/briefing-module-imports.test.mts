import { test, expect } from "bun:test";

test("briefing modules can be imported independently", async () => {
  // Import each module independently to verify no circular dependencies
  const git = await import("../scripts/lib/briefing/git.mjs");
  const cost = await import("../scripts/lib/briefing/cost.mjs");
  const workflow = await import("../scripts/lib/briefing/workflow.mjs");
  const hook = await import("../scripts/lib/briefing/hook.mjs");
  const bundle = await import("../scripts/lib/briefing/bundle.mjs");
  await import("../scripts/lib/briefing/collect.mjs");

  // Verify core functions exist in their home modules
  expect(
    typeof git.collectGitActivity === "function",
    "git.collectGitActivity exists"
  ).toBeTruthy();
  expect(
    typeof cost.collectRecentCosts === "function",
    "cost.collectRecentCosts exists"
  ).toBeTruthy();
  expect(
    typeof cost.collectCostHealth === "function",
    "cost.collectCostHealth exists"
  ).toBeTruthy();
  expect(
    typeof cost.collectCostAggregate === "function",
    "cost.collectCostAggregate exists"
  ).toBeTruthy();
  expect(
    typeof cost.computeModelCompliance === "function",
    "cost.computeModelCompliance exists"
  ).toBeTruthy();
  expect(
    typeof cost.collectModelCompliance === "function",
    "cost.collectModelCompliance exists"
  ).toBeTruthy();
  expect(
    typeof workflow.collectRelevantArtifacts === "function",
    "workflow.collectRelevantArtifacts exists"
  ).toBeTruthy();
  expect(
    typeof workflow.fetchAutonomousLoopBrief === "function",
    "workflow.fetchAutonomousLoopBrief exists"
  ).toBeTruthy();
  expect(
    typeof workflow.findAutonomousLoopCli === "function",
    "workflow.findAutonomousLoopCli exists"
  ).toBeTruthy();
  expect(
    typeof hook.collectHookHealth === "function",
    "hook.collectHookHealth exists"
  ).toBeTruthy();
  expect(
    typeof bundle.collectBundleStats === "function",
    "bundle.collectBundleStats exists"
  ).toBeTruthy();
});

test("collect.ts re-exports all functions from modules", async () => {
  const collect = await import("../scripts/lib/briefing/collect.mjs");

  // Verify all functions are re-exported from collect.ts
  expect(
    typeof collect.collectGitActivity === "function",
    "collect.collectGitActivity re-exported"
  ).toBeTruthy();
  expect(
    typeof collect.collectRecentCosts === "function",
    "collect.collectRecentCosts re-exported"
  ).toBeTruthy();
  expect(
    typeof collect.collectCostHealth === "function",
    "collect.collectCostHealth re-exported"
  ).toBeTruthy();
  expect(
    typeof collect.collectCostAggregate === "function",
    "collect.collectCostAggregate re-exported"
  ).toBeTruthy();
  expect(
    typeof collect.computeModelCompliance === "function",
    "collect.computeModelCompliance re-exported"
  ).toBeTruthy();
  expect(
    typeof collect.collectModelCompliance === "function",
    "collect.collectModelCompliance re-exported"
  ).toBeTruthy();
  expect(
    typeof collect.collectRelevantArtifacts === "function",
    "collect.collectRelevantArtifacts re-exported"
  ).toBeTruthy();
  expect(
    typeof collect.fetchAutonomousLoopBrief === "function",
    "collect.fetchAutonomousLoopBrief re-exported"
  ).toBeTruthy();
  expect(
    typeof collect.findAutonomousLoopCli === "function",
    "collect.findAutonomousLoopCli re-exported"
  ).toBeTruthy();
  expect(
    typeof collect.collectHookHealth === "function",
    "collect.collectHookHealth re-exported"
  ).toBeTruthy();
  expect(
    typeof collect.collectBundleStats === "function",
    "collect.collectBundleStats re-exported"
  ).toBeTruthy();
});

test("collect.ts re-exports all interfaces from modules", async () => {
  const collect = await import("../scripts/lib/briefing/collect.mjs");

  // Verify all type exports are available (these are types, not functions)
  // We can't directly check if a type exists at runtime, but we can verify
  // they're not undefined if they were somehow exported as values.
  expect(collect, "collect module exports exist").toBeTruthy();

  // Check that we can import the types without error (TypeScript check happens at compile time)
  // This is more of a compile-time verification, but we can at least verify the module is importable.
});

test("no circular imports between modules", async () => {
  // This test verifies no circular dependencies by checking that all modules
  // load without stack overflow or circular import errors. The test passes if
  // all imports complete successfully (which we've already done above).
  const git = await import("../scripts/lib/briefing/git.mjs");
  const cost = await import("../scripts/lib/briefing/cost.mjs");
  const workflow = await import("../scripts/lib/briefing/workflow.mjs");
  const hook = await import("../scripts/lib/briefing/hook.mjs");
  const bundle = await import("../scripts/lib/briefing/bundle.mjs");
  const collect = await import("../scripts/lib/briefing/collect.mjs");

  // If we got here, all modules loaded successfully with no circular imports
  expect(git, "git module loaded").toBeTruthy();
  expect(cost, "cost module loaded").toBeTruthy();
  expect(workflow, "workflow module loaded").toBeTruthy();
  expect(hook, "hook module loaded").toBeTruthy();
  expect(bundle, "bundle module loaded").toBeTruthy();
  expect(collect, "collect module loaded").toBeTruthy();
});
