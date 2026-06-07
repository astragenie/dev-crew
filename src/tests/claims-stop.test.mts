import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { syncClaims } from "../scripts/lib/claims-sync.mjs";
import { checkStopConditions } from "../scripts/lib/stop-conditions.mjs";
import { addFeature, moveFeature, findFeatureById } from "../scripts/lib/backlog-writer.mjs";
import { addSpec, updateSpecFrontmatter } from "../scripts/lib/spec-parser.mjs";

async function tmpRepo(prefix: string) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude/state/crew"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
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

async function writeClaims(repo: string, claims: Record<string, any>) {
  const target = path.join(repo, ".claude/state/crew/claims.json");
  await fs.writeFile(
    target,
    JSON.stringify(
      {
        version: "1.0",
        updatedAt: new Date().toISOString(),
        claims,
        warnings: []
      },
      null,
      2
    )
  );
}

test("syncClaims promotes triaged feature to in-progress when claim references its file", async () => {
  const repo = await tmpRepo("al-v111-claims-promote-");
  const f = await addFeature(repo, { title: "claimed" });
  await moveFeature(f.filePath, "triaged");
  await writeClaims(repo, {
    [`.claude/artifacts/loop/backlog/triaged/${f.id}.md`]: {
      owner: "builder-1",
      claimedAt: new Date().toISOString()
    }
  });
  const result = await syncClaims(repo);
  assert.deepEqual(result.claimedFeatureIds, [f.id]);
  const promote = result.actions.find((a) => a.type === "promote-to-in-progress");
  assert.ok(promote);
  assert.equal(promote.featureId, f.id);
  // Feature actually moved
  const after = await findFeatureById(repo, f.id);
  assert.equal(after.state, "in-progress");
});

test("syncClaims warns when in-progress feature has no claim", async () => {
  const repo = await tmpRepo("al-v111-claims-orphan-");
  const f = await addFeature(repo, { title: "orphan" });
  await moveFeature(f.filePath, "in-progress");
  await writeClaims(repo, {});
  const result = await syncClaims(repo);
  const orphan = result.actions.find((a) => a.type === "in-progress-without-claim");
  assert.ok(orphan);
  assert.equal(orphan.featureId, f.id);
  assert.match(orphan.suggestion, /crew claim/);
});

test("syncClaims flags stale claims referencing missing FEAT id", async () => {
  const repo = await tmpRepo("al-v111-claims-stale-");
  await writeClaims(repo, {
    ".claude/artifacts/loop/backlog/in-progress/FEAT-999.md": { owner: "builder-1" }
  });
  const result = await syncClaims(repo);
  const stale = result.actions.find((a) => a.type === "claim-without-feature");
  assert.ok(stale);
  assert.equal(stale.featureId, "FEAT-999");
});

test("syncClaims handles missing claims.json gracefully", async () => {
  const repo = await tmpRepo("al-v111-claims-missing-");
  // Don't write claims.json
  const result = await syncClaims(repo);
  assert.deepEqual(result.actions, []);
  assert.equal(result.claimsTracked, 0);
});

test("syncClaims extracts feature from claim record metadata field", async () => {
  const repo = await tmpRepo("al-v111-claims-meta-");
  const f = await addFeature(repo, { title: "via-meta" });
  await moveFeature(f.filePath, "triaged");
  await writeClaims(repo, {
    "src/auth/middleware.cs": { owner: "builder-1", feature: f.id }
  });
  const result = await syncClaims(repo);
  assert.ok(result.claimedFeatureIds.includes(f.id));
});

test("checkStopConditions: shouldStop=true when backlog empty + no undecomposed specs", async () => {
  const repo = await tmpRepo("al-v111-stop-empty-");
  const out = await checkStopConditions(repo);
  assert.equal(out.shouldStop, true);
  assert.ok(out.reasons.some((r: string) => /backlog empty/.test(r)));
  assert.ok(out.suggestions.length > 0);
});

test("checkStopConditions: shouldStop=false when work exists", async () => {
  const repo = await tmpRepo("al-v111-stop-work-");
  await addFeature(repo, { title: "queued" });
  const out = await checkStopConditions(repo);
  assert.equal(out.shouldStop, false);
  assert.equal(out.snapshot.pendingOrTriaged, 1);
});

test("checkStopConditions: shouldStop=true when warn alerts present", async () => {
  const repo = await tmpRepo("al-v111-stop-alerts-");
  // Trigger orphan alert + keep backlog non-empty
  await addFeature(repo, { title: "queued" });
  const f2 = await addFeature(repo, { title: "orphan" });
  await moveFeature(f2.filePath, "in-progress");
  const out = await checkStopConditions(repo);
  assert.equal(out.shouldStop, true);
  assert.ok(out.blockers.some((b: Record<string, any>) => b.category === "in-progress-orphan"));
});

test("checkStopConditions: ignoreAlerts=true suppresses warn-stop", async () => {
  const repo = await tmpRepo("al-v111-stop-ignore-");
  const f = await addFeature(repo, { title: "orphan" });
  await moveFeature(f.filePath, "in-progress");
  const out = await checkStopConditions(repo, { ignoreAlerts: true });
  // Backlog non-empty + alerts ignored → no stop
  assert.equal(out.shouldStop, false);
});

test("checkStopConditions: approved-undecomposed spec keeps the loop running", async () => {
  const repo = await tmpRepo("al-v111-stop-spec-");
  // Empty backlog but spec needs decomposition → not stop yet
  const s = await addSpec(repo, { type: "prd", title: "decompose me" });
  await updateSpecFrontmatter(s.filePath, { status: "approved" });
  const out = await checkStopConditions(repo, { ignoreAlerts: true });
  assert.equal(out.shouldStop, false);
  assert.equal(out.snapshot.approvedUndecomposed, 1);
});
