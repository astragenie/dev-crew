// ARCHITECT GATE (runner side) — pre-slice-1 architect + risk gate for P0/P1
// fullstack FEATs, with a bounded reject loop that DEFERS (never blocks for
// a human). See src/scripts/lib/arch-gate.mts module docstring for the
// architecture decision (devcrew:start emits instructions; it never
// dispatches agents itself).

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  addFeature,
  updateFeatureFrontmatter,
  findFeatureById
} from "../scripts/lib/backlog-writer.mjs";
import {
  resolveFeaturePriority,
  isPositiveFullstackVariant,
  isFirstSliceOfFeature,
  shouldRunArchGate,
  buildArchGatePreflight,
  normalizeVerdict,
  computeArchGateTransition,
  demotePriority,
  MAX_ARCH_GATE_ATTEMPTS,
  resolveArchGateBudgetUsd,
  DEFAULT_ARCH_GATE_BUDGET_USD,
  ARCH_GATE_BUDGET_HARD_CEILING_USD,
  checkArchGateBudget,
  ArchGateBudgetExceededError,
  readFeatureCostSpendUsd,
  applyArchGateVerdict,
  maybeBuildArchGatePreflight
} from "../scripts/lib/arch-gate.mjs";

async function tmpRepo(prefix: string) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(path.join(repo, ".claude/loop.json"), JSON.stringify({}));
  return repo;
}

// ---------------------------------------------------------------------------
// resolveFeaturePriority
// ---------------------------------------------------------------------------

test("resolveFeaturePriority: pm_composite_priority wins over plain priority", () => {
  assert.equal(resolveFeaturePriority({ priority: "P2", pm_composite_priority: "P0" }), "P0");
});

test("resolveFeaturePriority: falls back to plain priority when composite absent", () => {
  assert.equal(resolveFeaturePriority({ priority: "P1" }), "P1");
});

test("resolveFeaturePriority: null when neither field present", () => {
  assert.equal(resolveFeaturePriority({}), null);
  assert.equal(resolveFeaturePriority(null), null);
});

// ---------------------------------------------------------------------------
// isPositiveFullstackVariant
// ---------------------------------------------------------------------------

test("isPositiveFullstackVariant: true only for fullstack/parallel-fe-be", () => {
  assert.equal(isPositiveFullstackVariant("fullstack"), true);
  assert.equal(isPositiveFullstackVariant("parallel-fe-be"), true);
  assert.equal(isPositiveFullstackVariant("frontend"), false);
  assert.equal(isPositiveFullstackVariant("backend"), false);
  assert.equal(isPositiveFullstackVariant("unknown"), false);
  assert.equal(isPositiveFullstackVariant(null), false);
});

// ---------------------------------------------------------------------------
// isFirstSliceOfFeature
// ---------------------------------------------------------------------------

test("isFirstSliceOfFeature: true only when sliceId is slices[0]", () => {
  assert.equal(isFirstSliceOfFeature({ slices: ["SLICE-01", "SLICE-02"] }, "SLICE-01"), true);
  assert.equal(isFirstSliceOfFeature({ slices: ["SLICE-01", "SLICE-02"] }, "SLICE-02"), false);
  assert.equal(isFirstSliceOfFeature({ slices: [] }, "SLICE-01"), false);
  assert.equal(isFirstSliceOfFeature({}, "SLICE-01"), false);
});

// ---------------------------------------------------------------------------
// shouldRunArchGate — condition matrix
// ---------------------------------------------------------------------------

function baseInput(overrides: Partial<Parameters<typeof shouldRunArchGate>[0]> = {}) {
  return {
    priority: "P0",
    variant: "fullstack",
    isFirstSlice: true,
    contractsExist: false,
    archStatus: null,
    ...overrides
  };
}

test("shouldRunArchGate: fires when all conditions hold (P0/P1 + positive fullstack + missing artifact + first slice)", () => {
  assert.equal(shouldRunArchGate(baseInput()), true);
  assert.equal(shouldRunArchGate(baseInput({ priority: "P1" })), true);
  assert.equal(shouldRunArchGate(baseInput({ variant: "parallel-fe-be" })), true);
});

test("shouldRunArchGate: false when not the first slice", () => {
  assert.equal(shouldRunArchGate(baseInput({ isFirstSlice: false })), false);
});

test("shouldRunArchGate: false for P2/P3 priority", () => {
  assert.equal(shouldRunArchGate(baseInput({ priority: "P2" })), false);
  assert.equal(shouldRunArchGate(baseInput({ priority: "P3" })), false);
  assert.equal(shouldRunArchGate(baseInput({ priority: null })), false);
});

test("shouldRunArchGate: false for a non-positive-fullstack variant (frontend/backend/unknown)", () => {
  assert.equal(shouldRunArchGate(baseInput({ variant: "frontend" })), false);
  assert.equal(shouldRunArchGate(baseInput({ variant: "backend" })), false);
  assert.equal(shouldRunArchGate(baseInput({ variant: "unknown" })), false);
});

test("shouldRunArchGate: false when the contracts artifact already exists (first entry, no gate history)", () => {
  assert.equal(shouldRunArchGate(baseInput({ contractsExist: true, archStatus: null })), false);
});

test("shouldRunArchGate: false when arch_status is deferred_design (idempotent — never re-enters)", () => {
  assert.equal(
    shouldRunArchGate(baseInput({ archStatus: "deferred_design", contractsExist: true })),
    false
  );
  assert.equal(
    shouldRunArchGate(baseInput({ archStatus: "deferred_design", contractsExist: false })),
    false
  );
});

test("shouldRunArchGate: false when arch_status is approved (already resolved)", () => {
  assert.equal(shouldRunArchGate(baseInput({ archStatus: "approved" })), false);
});

test("shouldRunArchGate: true on gate_in_progress re-entry even though the contracts artifact already exists from round 1", () => {
  assert.equal(
    shouldRunArchGate(baseInput({ archStatus: "gate_in_progress", contractsExist: true })),
    true
  );
});

// ---------------------------------------------------------------------------
// buildArchGatePreflight
// ---------------------------------------------------------------------------

test("buildArchGatePreflight: mentions the FEAT id, both specialists, and the persist CLI call", () => {
  const block = buildArchGatePreflight("FEAT-500", "Some Feature");
  assert.match(block, /FEAT-500/);
  assert.match(block, /devcrew:architect-feature/);
  assert.match(block, /devcrew:architect-reviewer/);
  assert.match(block, /arch-gate-apply/);
  assert.match(block, /deferred_design/);
  assert.match(block, /budget_exceeded/);
});

// ---------------------------------------------------------------------------
// normalizeVerdict / computeArchGateTransition / demotePriority
// ---------------------------------------------------------------------------

test("normalizeVerdict: maps approved_with_notes and needs_revision to the two normalized outcomes", () => {
  assert.equal(normalizeVerdict("approved"), "approved");
  assert.equal(normalizeVerdict("approved_with_notes"), "approved");
  assert.equal(normalizeVerdict("rejected"), "rejected");
  assert.equal(normalizeVerdict("needs_revision"), "rejected");
  assert.equal(normalizeVerdict("APPROVED"), "approved");
});

test("normalizeVerdict: throws on an unrecognized verdict", () => {
  assert.throws(() => normalizeVerdict("maybe"), /unrecognized verdict/);
});

test("demotePriority: P0->P1->P2, floored at P2", () => {
  assert.equal(demotePriority("P0"), "P1");
  assert.equal(demotePriority("P1"), "P2");
  assert.equal(demotePriority("P2"), "P2");
  assert.equal(demotePriority(null), "P2");
});

test("computeArchGateTransition: approved -> status approved, attempt unchanged, no demote", () => {
  const t = computeArchGateTransition(0, "approved_with_notes");
  assert.deepEqual(t, { status: "approved", attempt: 0, demote: false });
});

test("computeArchGateTransition: first rejection (attempt 0->1) retries — 1 < MAX_ARCH_GATE_ATTEMPTS", () => {
  assert.equal(MAX_ARCH_GATE_ATTEMPTS, 2);
  const t = computeArchGateTransition(0, "rejected");
  assert.deepEqual(t, { status: "gate_in_progress", attempt: 1, demote: false });
});

test("computeArchGateTransition: second rejection (attempt 1->2) defers with priority demotion", () => {
  const t = computeArchGateTransition(1, "needs_revision");
  assert.deepEqual(t, { status: "deferred_design", attempt: 2, demote: true });
});

// ---------------------------------------------------------------------------
// Budget (Part 5)
// ---------------------------------------------------------------------------

test("resolveArchGateBudgetUsd: defaults to 100 when unset", () => {
  assert.equal(resolveArchGateBudgetUsd(null), DEFAULT_ARCH_GATE_BUDGET_USD);
  assert.equal(resolveArchGateBudgetUsd({}), DEFAULT_ARCH_GATE_BUDGET_USD);
});

test("resolveArchGateBudgetUsd: honors a configured value under the hard ceiling", () => {
  assert.equal(resolveArchGateBudgetUsd({ loop: { archGateBudgetUsdPerFeat: 50 } }), 50);
});

test("resolveArchGateBudgetUsd: clamps a configured value above the hard ceiling", () => {
  assert.equal(ARCH_GATE_BUDGET_HARD_CEILING_USD, 160);
  assert.equal(resolveArchGateBudgetUsd({ loop: { archGateBudgetUsdPerFeat: 500 } }), 160);
});

test("resolveArchGateBudgetUsd: ignores a zero/negative configured value", () => {
  assert.equal(resolveArchGateBudgetUsd({ loop: { archGateBudgetUsdPerFeat: 0 } }), 100);
  assert.equal(resolveArchGateBudgetUsd({ loop: { archGateBudgetUsdPerFeat: -5 } }), 100);
});

test("checkArchGateBudget: passes silently under the ceiling", () => {
  const result = checkArchGateBudget("FEAT-100", 42, null);
  assert.deepEqual(result, { ceilingUsd: 100, actualUsd: 42 });
});

test("checkArchGateBudget: throws ArchGateBudgetExceededError over the ceiling — halt-and-escalate, not a silent defer", () => {
  assert.throws(
    () => checkArchGateBudget("FEAT-100", 150, null),
    (err: unknown) => {
      assert.ok(err instanceof ArchGateBudgetExceededError);
      assert.equal(err.halt_reason, "budget_exceeded");
      assert.equal(err.featureId, "FEAT-100");
      assert.equal(err.actualUsd, 150);
      assert.equal(err.ceilingUsd, 100);
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// readFeatureCostSpendUsd
// ---------------------------------------------------------------------------

test("readFeatureCostSpendUsd: sums non-aggregate reports tagged with the FEAT, skips others", async () => {
  const repo = await tmpRepo("arch-gate-cost-");
  const costDir = path.join(repo, ".claude", "artifacts", "crew", "cost");
  await fs.mkdir(costDir, { recursive: true });

  await fs.writeFile(
    path.join(costDir, "20260101T000000Z-cost-report-a.md"),
    "---\nkind: cost-report\nfeature: FEAT-777\nusd: 10.5\naggregate_all: false\n---\n\nbody"
  );
  await fs.writeFile(
    path.join(costDir, "20260101T000001Z-cost-report-b.md"),
    "---\nkind: cost-report\nfeature: FEAT-777\nusd: 20\naggregate_all: false\n---\n\nbody"
  );
  await fs.writeFile(
    path.join(costDir, "20260101T000002Z-cost-report-other-feat.md"),
    "---\nkind: cost-report\nfeature: FEAT-999\nusd: 999\naggregate_all: false\n---\n\nbody"
  );
  await fs.writeFile(
    path.join(costDir, "20260101T000003Z-cost-report-aggregate-x.md"),
    "---\nkind: cost-report\nfeature: FEAT-777\nusd: 5000\naggregate_all: true\n---\n\nbody"
  );

  const total = await readFeatureCostSpendUsd(repo, "FEAT-777");
  assert.equal(total, 30.5);
});

test("readFeatureCostSpendUsd: returns 0 when the cost dir is absent", async () => {
  const repo = await tmpRepo("arch-gate-cost-absent-");
  const total = await readFeatureCostSpendUsd(repo, "FEAT-777");
  assert.equal(total, 0);
});

// ---------------------------------------------------------------------------
// applyArchGateVerdict — integration (Part 3 + Part 4/5 interplay)
// ---------------------------------------------------------------------------

test("applyArchGateVerdict: approved verdict sets arch_status approved, no priority change", async () => {
  const repo = await tmpRepo("arch-gate-approve-");
  const feat = await addFeature(repo, {
    title: "Alpha",
    body: "x",
    category: "feature",
    priority: "P0"
  });

  const result = await applyArchGateVerdict(repo, feat.id, "approved");
  assert.equal(result.arch_status, "approved");
  assert.equal(result.arch_attempt, 0);
  assert.equal(result.noop, false);

  const entry = await findFeatureById(repo, feat.id, null);
  assert.equal(entry!.frontmatter.arch_status, "approved");
  assert.equal(entry!.frontmatter.priority, "P0");
});

// DEC-075 gap-close: the preflight instruction text told the loop this call
// "records arch_review/arch_risk" but applyArchGateVerdict didn't actually
// write either field. Persist both — arch_review is the normalized verdict;
// arch_risk defaults to --objections when --risk-flags/riskFlags isn't
// passed separately.
test("applyArchGateVerdict: persists arch_review (normalized) + arch_risk on an approved_with_notes verdict with explicit riskFlags", async () => {
  const repo = await tmpRepo("arch-gate-review-approve-");
  const feat = await addFeature(repo, {
    title: "India",
    body: "x",
    category: "feature",
    priority: "P0"
  });

  const result = await applyArchGateVerdict(repo, feat.id, "approved_with_notes", {
    riskFlags: ["consider rate limiting on the public endpoint"]
  });
  assert.equal(result.arch_status, "approved");
  assert.equal(result.arch_review, "approved");
  assert.deepEqual(result.arch_risk, ["consider rate limiting on the public endpoint"]);

  const entry = await findFeatureById(repo, feat.id, null);
  assert.equal(entry!.frontmatter.arch_review, "approved");
  assert.deepEqual(entry!.frontmatter.arch_risk, ["consider rate limiting on the public endpoint"]);
});

test("applyArchGateVerdict: persists arch_review (normalized) + arch_risk falling back to objections on a rejected verdict", async () => {
  const repo = await tmpRepo("arch-gate-review-reject-");
  const feat = await addFeature(repo, {
    title: "Juliet",
    body: "x",
    category: "feature",
    priority: "P0"
  });

  const result = await applyArchGateVerdict(repo, feat.id, "rejected", {
    objections: ["no auth boundary defined", "unclear data ownership"]
  });
  assert.equal(result.arch_status, "gate_in_progress");
  assert.equal(result.arch_review, "rejected");
  assert.deepEqual(result.arch_risk, ["no auth boundary defined", "unclear data ownership"]);

  const entry = await findFeatureById(repo, feat.id, null);
  assert.equal(entry!.frontmatter.arch_review, "rejected");
  assert.deepEqual(entry!.frontmatter.arch_risk, [
    "no auth boundary defined",
    "unclear data ownership"
  ]);
});

test("applyArchGateVerdict: explicit riskFlags wins over objections when both are supplied", async () => {
  const repo = await tmpRepo("arch-gate-review-riskwins-");
  const feat = await addFeature(repo, {
    title: "Kilo",
    body: "x",
    category: "feature",
    priority: "P0"
  });

  const result = await applyArchGateVerdict(repo, feat.id, "rejected", {
    objections: ["objection A"],
    riskFlags: ["distinct risk flag B"]
  });
  assert.deepEqual(result.arch_risk, ["distinct risk flag B"]);

  const entry = await findFeatureById(repo, feat.id, null);
  assert.deepEqual(entry!.frontmatter.arch_risk, ["distinct risk flag B"]);
});

test("applyArchGateVerdict: an approved verdict with no objections/riskFlags writes arch_review but no arch_risk key", async () => {
  const repo = await tmpRepo("arch-gate-review-norisk-");
  const feat = await addFeature(repo, {
    title: "Lima",
    body: "x",
    category: "feature",
    priority: "P0"
  });

  const result = await applyArchGateVerdict(repo, feat.id, "approved");
  assert.equal(result.arch_review, "approved");
  assert.equal(result.arch_risk, undefined);

  const entry = await findFeatureById(repo, feat.id, null);
  assert.equal(entry!.frontmatter.arch_risk, undefined);
});

test("applyArchGateVerdict: bounded reject loop — attempt 1 retries, attempt 2 defers with priority step-down + autonomous_safe false", async () => {
  const repo = await tmpRepo("arch-gate-reject-");
  const feat = await addFeature(repo, {
    title: "Bravo",
    body: "x",
    category: "feature",
    priority: "P0"
  });

  const first = await applyArchGateVerdict(repo, feat.id, "rejected", {
    objections: ["service boundary unclear"]
  });
  assert.equal(first.arch_status, "gate_in_progress");
  assert.equal(first.arch_attempt, 1);
  assert.equal(first.noop, false);

  let entry = await findFeatureById(repo, feat.id, null);
  assert.equal(entry!.frontmatter.arch_status, "gate_in_progress");
  assert.equal(entry!.frontmatter.priority, "P0", "not yet demoted — still mid-cycle");

  const second = await applyArchGateVerdict(repo, feat.id, "needs_revision", {
    objections: ["still no auth boundary", "no data ownership plan"]
  });
  assert.equal(second.arch_status, "deferred_design");
  assert.equal(second.arch_attempt, 2);
  assert.equal(second.priority, "P1");
  assert.match(second.arch_defer_reason!, /auth boundary/);

  entry = await findFeatureById(repo, feat.id, null);
  assert.equal(entry!.frontmatter.arch_status, "deferred_design");
  assert.equal(entry!.frontmatter.priority, "P1");
  assert.equal(entry!.frontmatter.autonomous_safe, false);
  assert.ok(typeof entry!.frontmatter.arch_defer_reason === "string");
});

test("applyArchGateVerdict: deferred_design is idempotent — re-entry is a no-op, no further writes", async () => {
  const repo = await tmpRepo("arch-gate-idempotent-");
  const feat = await addFeature(repo, {
    title: "Charlie",
    body: "x",
    category: "feature",
    priority: "P0"
  });

  await applyArchGateVerdict(repo, feat.id, "rejected");
  await applyArchGateVerdict(repo, feat.id, "rejected");
  const entryAfterDefer = await findFeatureById(repo, feat.id, null);
  assert.equal(entryAfterDefer!.frontmatter.arch_status, "deferred_design");
  assert.equal(entryAfterDefer!.frontmatter.priority, "P1");

  const reentry = await applyArchGateVerdict(repo, feat.id, "approved");
  assert.equal(reentry.noop, true);
  assert.equal(reentry.arch_status, "deferred_design");

  const entryAfterReentry = await findFeatureById(repo, feat.id, null);
  assert.equal(entryAfterReentry!.frontmatter.arch_status, "deferred_design");
  assert.equal(entryAfterReentry!.frontmatter.priority, "P1", "re-entry must not demote again");
});

test("applyArchGateVerdict: budget exceeded halts before any write (no silent defer)", async () => {
  const repo = await tmpRepo("arch-gate-budget-");
  const feat = await addFeature(repo, {
    title: "Delta",
    body: "x",
    category: "feature",
    priority: "P0"
  });

  await assert.rejects(
    () =>
      applyArchGateVerdict(repo, feat.id, "rejected", {
        actualUsdSpent: 250,
        config: { loop: { archGateBudgetUsdPerFeat: 100 } }
      }),
    (err: unknown) => {
      assert.ok(err instanceof ArchGateBudgetExceededError);
      return true;
    }
  );

  const entry = await findFeatureById(repo, feat.id, null);
  assert.equal(
    entry!.frontmatter.arch_status,
    undefined,
    "no write happened — halted before persisting"
  );
});

// ---------------------------------------------------------------------------
// maybeBuildArchGatePreflight — async orchestrator (Part 2 wiring)
// ---------------------------------------------------------------------------

async function makeGateFeature(
  repo: string,
  opts: { priority?: string | null; sliceId?: string; archStatus?: string | null } = {}
) {
  const feat = await addFeature(repo, {
    title: "Echo",
    body: "# FEAT-000: Echo Feature\n\n## Description\n\nx\n",
    category: "feature",
    priority: opts.priority ?? "P0"
  });
  const sliceId = opts.sliceId ?? "SLICE-01";
  const updates: Record<string, unknown> = { slices: [sliceId] };
  if (opts.archStatus !== undefined) updates.arch_status = opts.archStatus;
  await updateFeatureFrontmatter(feat.filePath, updates, repo, null);
  return feat;
}

test("maybeBuildArchGatePreflight: non-null when all conditions hold", async () => {
  const repo = await tmpRepo("arch-gate-preflight-fire-");
  const feat = await makeGateFeature(repo);
  const result = await maybeBuildArchGatePreflight({
    repoPath: repo,
    sliceId: "SLICE-01",
    featureId: feat.id,
    variant: "fullstack",
    config: null
  });
  assert.ok(typeof result === "string");
  assert.match(result as string, new RegExp(feat.id));
});

test("maybeBuildArchGatePreflight: null when not the first slice", async () => {
  const repo = await tmpRepo("arch-gate-preflight-notfirst-");
  const feat = await makeGateFeature(repo, { sliceId: "SLICE-01" });
  const result = await maybeBuildArchGatePreflight({
    repoPath: repo,
    sliceId: "SLICE-02",
    featureId: feat.id,
    variant: "fullstack",
    config: null
  });
  assert.equal(result, null);
});

test("maybeBuildArchGatePreflight: null when priority is P2", async () => {
  const repo = await tmpRepo("arch-gate-preflight-p2-");
  const feat = await makeGateFeature(repo, { priority: "P2" });
  const result = await maybeBuildArchGatePreflight({
    repoPath: repo,
    sliceId: "SLICE-01",
    featureId: feat.id,
    variant: "fullstack",
    config: null
  });
  assert.equal(result, null);
});

test("maybeBuildArchGatePreflight: null when variant is not a positive fullstack signal", async () => {
  const repo = await tmpRepo("arch-gate-preflight-variant-");
  const feat = await makeGateFeature(repo);
  const result = await maybeBuildArchGatePreflight({
    repoPath: repo,
    sliceId: "SLICE-01",
    featureId: feat.id,
    variant: "backend",
    config: null
  });
  assert.equal(result, null);
});

test("maybeBuildArchGatePreflight: null when arch_status is deferred_design (idempotent)", async () => {
  const repo = await tmpRepo("arch-gate-preflight-deferred-");
  const feat = await makeGateFeature(repo, { archStatus: "deferred_design" });
  const result = await maybeBuildArchGatePreflight({
    repoPath: repo,
    sliceId: "SLICE-01",
    featureId: feat.id,
    variant: "fullstack",
    config: null
  });
  assert.equal(result, null);
});

test("maybeBuildArchGatePreflight: null when featureId is absent", async () => {
  const repo = await tmpRepo("arch-gate-preflight-nofeat-");
  const result = await maybeBuildArchGatePreflight({
    repoPath: repo,
    sliceId: "SLICE-01",
    featureId: null,
    variant: "fullstack",
    config: null
  });
  assert.equal(result, null);
});

// ---------------------------------------------------------------------------
// CLI: backlog arch-gate-apply (sole caller of applyArchGateVerdict)
// ---------------------------------------------------------------------------

const LOOP_CLI = path.resolve("src/scripts/loop.mts");

test("CLI: backlog arch-gate-apply --verdict approved clears the gate", async () => {
  const repo = await tmpRepo("arch-gate-cli-approve-");
  const feat = await addFeature(repo, {
    title: "Foxtrot",
    body: "x",
    category: "feature",
    priority: "P0"
  });

  const r = spawnSync(
    "bun",
    [
      LOOP_CLI,
      "backlog",
      "arch-gate-apply",
      "--id",
      feat.id,
      "--verdict",
      "approved",
      "--repo",
      repo
    ],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 0, `expected exit 0; stderr=${r.stderr}`);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.arch_status, "approved");
  assert.equal(parsed.halted, false);
  assert.equal(parsed.arch_review, "approved");
});

test("CLI: backlog arch-gate-apply --risk-flags persists arch_risk distinct from --objections", async () => {
  const repo = await tmpRepo("arch-gate-cli-riskflags-");
  const feat = await addFeature(repo, {
    title: "Echo2",
    body: "x",
    category: "feature",
    priority: "P0"
  });
  const objectionsPath = path.join(repo, "objections.json");
  const riskFlagsPath = path.join(repo, "risk-flags.json");
  await fs.writeFile(objectionsPath, JSON.stringify(["objection A"]));
  await fs.writeFile(riskFlagsPath, JSON.stringify(["distinct risk flag B"]));

  const r = spawnSync(
    "bun",
    [
      LOOP_CLI,
      "backlog",
      "arch-gate-apply",
      "--id",
      feat.id,
      "--verdict",
      "rejected",
      "--objections",
      objectionsPath,
      "--risk-flags",
      riskFlagsPath,
      "--repo",
      repo
    ],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 0, `expected exit 0; stderr=${r.stderr}`);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.arch_review, "rejected");
  assert.deepEqual(parsed.arch_risk, ["distinct risk flag B"]);

  const entry = await findFeatureById(repo, feat.id, null);
  assert.deepEqual(entry!.frontmatter.arch_risk, ["distinct risk flag B"]);
});

test("CLI: backlog arch-gate-apply --verdict rejected with --objections file records the rejection + demotes on the 2nd round", async () => {
  const repo = await tmpRepo("arch-gate-cli-reject-");
  const feat = await addFeature(repo, {
    title: "Golf",
    body: "x",
    category: "feature",
    priority: "P0"
  });
  const objectionsPath = path.join(repo, "objections.json");
  await fs.writeFile(objectionsPath, JSON.stringify(["no auth boundary defined"]));

  const first = spawnSync(
    "bun",
    [
      LOOP_CLI,
      "backlog",
      "arch-gate-apply",
      "--id",
      feat.id,
      "--verdict",
      "rejected",
      "--objections",
      objectionsPath,
      "--repo",
      repo
    ],
    { encoding: "utf8" }
  );
  assert.equal(first.status, 0, `expected exit 0; stderr=${first.stderr}`);
  const firstParsed = JSON.parse(first.stdout);
  assert.equal(firstParsed.arch_status, "gate_in_progress");
  assert.equal(firstParsed.arch_attempt, 1);

  const second = spawnSync(
    "bun",
    [
      LOOP_CLI,
      "backlog",
      "arch-gate-apply",
      "--id",
      feat.id,
      "--verdict",
      "needs_revision",
      "--objections",
      objectionsPath,
      "--repo",
      repo
    ],
    { encoding: "utf8" }
  );
  assert.equal(second.status, 0, `expected exit 0; stderr=${second.stderr}`);
  const secondParsed = JSON.parse(second.stdout);
  assert.equal(secondParsed.arch_status, "deferred_design");
  assert.equal(secondParsed.priority, "P1");
});

test("CLI: backlog arch-gate-apply halts (exit 1) when --spent-usd exceeds the configured budget", async () => {
  const repo = await tmpRepo("arch-gate-cli-budget-");
  const feat = await addFeature(repo, {
    title: "Hotel",
    body: "x",
    category: "feature",
    priority: "P0"
  });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({ loop: { archGateBudgetUsdPerFeat: 50 } })
  );

  const r = spawnSync(
    "bun",
    [
      LOOP_CLI,
      "backlog",
      "arch-gate-apply",
      "--id",
      feat.id,
      "--verdict",
      "rejected",
      "--spent-usd",
      "75",
      "--repo",
      repo
    ],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 1, `expected halt exit 1; stderr=${r.stderr}`);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.halted, true);
  assert.equal(parsed.halt_reason, "budget_exceeded");

  const entry = await findFeatureById(repo, feat.id, null);
  assert.equal(entry!.frontmatter.arch_status, undefined, "budget halt must not write any state");
});
