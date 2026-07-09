import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { claimFinding, getActiveClaim, isClaimActive } from "../scripts/lib/watch/claims.mjs";
import { readTickState, tickStatePath } from "../scripts/lib/watch/state.mjs";
import type { ClaimEntry, Finding } from "../scripts/lib/watch/types.mjs";

async function tmpWatchHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "watch-claims-test-"));
}

test("isClaimActive is false for undefined claims", () => {
  assert.equal(isClaimActive(undefined), false);
});

test("isClaimActive is true within the TTL window and false after it expires", () => {
  const claim: ClaimEntry = {
    findingId: "issue:1",
    claimedAt: "2026-07-09T00:00:00.000Z",
    ttlSeconds: 60,
    label: "loop-claimed"
  };
  assert.equal(isClaimActive(claim, new Date("2026-07-09T00:00:30.000Z")), true);
  assert.equal(isClaimActive(claim, new Date("2026-07-09T00:02:00.000Z")), false);
});

test("claimFinding writes the state entry BEFORE the label call resolves, and returns the entry", async () => {
  const watchHome = await tmpWatchHome();
  const finding: Finding = { kind: "issue", findingId: "issue:7", ghSlug: "org/repo" };
  const order: string[] = [];
  let stateAtLabelTime: unknown = null;

  const entry = await claimFinding({
    watchHome,
    ghSlug: "org/repo",
    finding,
    now: () => new Date("2026-07-09T00:00:00.000Z"),
    addClaimLabel: async () => {
      order.push("label");
      // By the time the label call runs, the state write has already
      // resolved (claimFinding awaits it first) — read the file directly
      // off disk to prove happens-before, not just eventual presence.
      const raw = await fs.readFile(tickStatePath(watchHome, "org/repo"), "utf-8");
      stateAtLabelTime = JSON.parse(raw);
    }
  });

  assert.deepEqual(order, ["label"]);
  assert.equal(entry.findingId, "issue:7");
  assert.equal(entry.claimedAt, "2026-07-09T00:00:00.000Z");
  const claims = (stateAtLabelTime as { claims: Record<string, ClaimEntry> }).claims;
  assert.ok(claims["issue:7"]);
  assert.equal(claims["issue:7"]!.findingId, "issue:7");
});

test("getActiveClaim returns undefined when no claim exists, and the claim once written", async () => {
  const watchHome = await tmpWatchHome();
  const finding: Finding = { kind: "issue", findingId: "issue:9", ghSlug: "org/repo" };

  const before = await getActiveClaim(watchHome, "org/repo", "issue:9");
  assert.equal(before, undefined);

  await claimFinding({
    watchHome,
    ghSlug: "org/repo",
    finding,
    addClaimLabel: async () => {}
  });

  const after = await getActiveClaim(watchHome, "org/repo", "issue:9");
  assert.ok(after);
  assert.equal(after!.findingId, "issue:9");
});

test("getActiveClaim returns undefined once the claim's TTL has expired", async () => {
  const watchHome = await tmpWatchHome();
  const finding: Finding = { kind: "issue", findingId: "issue:11", ghSlug: "org/repo" };

  await claimFinding({
    watchHome,
    ghSlug: "org/repo",
    finding,
    ttlSeconds: 60,
    now: () => new Date("2026-07-09T00:00:00.000Z"),
    addClaimLabel: async () => {}
  });

  const stillActive = await getActiveClaim(
    watchHome,
    "org/repo",
    "issue:11",
    new Date("2026-07-09T00:00:30.000Z")
  );
  assert.ok(stillActive);

  const expired = await getActiveClaim(
    watchHome,
    "org/repo",
    "issue:11",
    new Date("2026-07-09T00:05:00.000Z")
  );
  assert.equal(expired, undefined);

  const rawState = await readTickState(watchHome, "org/repo");
  assert.ok(
    rawState.claims["issue:11"],
    "expired claim entry is still on disk — steal is SLICE-144 scope"
  );
});
