import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  claimFinding,
  collectExpiredClaims,
  DEFAULT_CLAIM_TTL_SECONDS,
  findingFromClaimId,
  getActiveClaim,
  isClaimActive
} from "../scripts/lib/watch/claims.mjs";
import { readTickState, tickStatePath } from "../scripts/lib/watch/state.mjs";
import type { ClaimEntry, Finding, TickState } from "../scripts/lib/watch/types.mjs";

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

// ---------------------------------------------------------------------------
// TTL boundary (SLICE-144)

test("isClaimActive TTL boundary: active one ms before expiry, inactive exactly at expiry", () => {
  const claim: ClaimEntry = {
    findingId: "issue:20",
    claimedAt: "2026-07-09T00:00:00.000Z",
    ttlSeconds: 60,
    label: "loop-claimed"
  };
  assert.equal(
    isClaimActive(claim, new Date("2026-07-09T00:00:59.999Z")),
    true,
    "1ms before the TTL boundary is still active"
  );
  assert.equal(
    isClaimActive(claim, new Date("2026-07-09T00:01:00.000Z")),
    false,
    "exactly at the TTL boundary is expired (strict less-than)"
  );
});

test("DEFAULT_CLAIM_TTL_SECONDS is 30 minutes", () => {
  assert.equal(DEFAULT_CLAIM_TTL_SECONDS, 1800);
});

// ---------------------------------------------------------------------------
// COND-1 self-heal primitives: findingFromClaimId + collectExpiredClaims

test("findingFromClaimId reconstructs the finding kind from the findingId prefix", () => {
  assert.deepEqual(findingFromClaimId("issue:42", "org/repo"), {
    kind: "issue",
    findingId: "issue:42",
    ghSlug: "org/repo"
  });
  assert.deepEqual(findingFromClaimId("run:987", "org/repo"), {
    kind: "failed-run",
    findingId: "run:987",
    ghSlug: "org/repo"
  });
  assert.deepEqual(findingFromClaimId("pr:45", "org/repo"), {
    kind: "red-pr",
    findingId: "pr:45",
    ghSlug: "org/repo"
  });
});

test("findingFromClaimId falls back to 'issue' for an unrecognized prefix", () => {
  assert.deepEqual(findingFromClaimId("mystery:1", "org/repo"), {
    kind: "issue",
    findingId: "mystery:1",
    ghSlug: "org/repo"
  });
});

function emptyTickState(): TickState {
  return {
    lastSeenIssue: null,
    lastFailedRunIds: [],
    lastPrShas: {},
    lastTickAt: "",
    claims: {},
    skippedCeiling: []
  };
}

test("collectExpiredClaims returns only claims whose TTL has expired", () => {
  const now = new Date("2026-07-09T01:00:00.000Z");
  const state = emptyTickState();
  state.claims = {
    "issue:1": {
      findingId: "issue:1",
      claimedAt: "2026-07-09T00:59:00.000Z", // 1 min ago, TTL 30 min — active
      ttlSeconds: 1800,
      label: "loop-claimed"
    },
    "issue:2": {
      findingId: "issue:2",
      claimedAt: "2026-07-09T00:00:00.000Z", // 1 hour ago, TTL 30 min — expired
      ttlSeconds: 1800,
      label: "loop-claimed"
    },
    "pr:9": {
      findingId: "pr:9",
      claimedAt: "2026-07-08T00:00:00.000Z", // 1 day ago, TTL 30 min — expired
      ttlSeconds: 1800,
      label: "loop-claimed"
    }
  };

  const expired = collectExpiredClaims(state, "org/repo", now);
  assert.deepEqual(expired.map((f) => f.findingId).sort(), ["issue:2", "pr:9"]);
  assert.ok(expired.every((f) => f.ghSlug === "org/repo"));
});

test("collectExpiredClaims returns an empty array when there are no claims", () => {
  const expired = collectExpiredClaims(emptyTickState(), "org/repo", new Date());
  assert.deepEqual(expired, []);
});
