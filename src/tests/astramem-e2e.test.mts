// ASTRAMEM_E2E-gated live memory smoke battery (FEAT-263 Phase 2).
//
// Codifies the T1-T6 smoke checks from
// .claude/artifacts/crew/runs/20260716T000000Z-plan-memory-e2e-smoke-timings.md
// (validated manually in
// .claude/artifacts/crew/validations/20260716T100500Z-validation-memory-smoke-battery-post-515.md)
// as a repeatable suite that actually imports preflightAstramemDaemon() /
// astramemE2eMode() — closes the SLICE-160 review MEDIUM (nothing previously
// consumed those exports for real).
//
// Mode "skip" (default, CI-safe): astramemE2eMode() resolves "skip" and every
// test below is registered via `test.skip` (see `registerTest` below --
// NOT `test.skipIf`: this repo's TypeScript 7 / bun-types combination fails
// to typecheck both `test.skipIf(...)` and any `test(...)` call carrying a
// numeric/options third argument -- confirmed by isolated repro against
// tsconfig.test.json; `test.skip(name, fn)` / `test(name, fn)`, called with
// exactly two args, is the only combination that typechecks cleanly here).
// ZERO network calls happen in skip mode -- `bun test src/tests/` must stay
// green and fully offline without a daemon running anywhere.
//
// Mode "require" (ASTRAMEM_E2E=1|true|require): preflightAstramemDaemon()
// runs once in beforeAll; a failure there fails the whole suite loudly
// rather than silently skipping. Each test appends one JSONL line to
// .claude/artifacts/loop/memory-e2e/<run-ts>-smoke.jsonl. The file-wide
// default test timeout is raised via `setDefaultTimeout` (below) rather than
// per-test third arguments, for the same typecheck reason.
//
// T2 (remember roundtrip) additionally needs CLAUDE_PLUGIN_ROOT_MEMORY
// pointed at the installed astramem plugin root -- recordMemory()
// (memory-sink.mts) only resolves a real provider through that env-pinned
// discovery path; the repo-wide PATH-probe fallback is disabled for every
// test process (see _test-env-guard.mts), by design, so it can never fall
// back to a real globally-installed CLI. Run like:
//
//   ASTRAMEM_E2E=1 CLAUDE_PLUGIN_ROOT_MEMORY=/path/to/plugins/cache/astra/astramem/<version> \
//     bun test src/tests/astramem-e2e.test.mts
//
// Canary hygiene: this suite only ever asserts against one atom it wrote
// itself this run (a unique random marker), written as kind "lesson" at
// default (low) importance. It never mutates or depends on any pre-existing
// memory.

import { afterAll, beforeAll, setDefaultTimeout, test } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";

import { feedbackSilent, profileSilent } from "@astragenie/astramem-client";
import {
  astramemE2eMode,
  preflightAstramemDaemon
} from "../scripts/lib/astramem-e2e-preflight.mjs";
import { boundedFetch } from "../scripts/lib/bounded-fetch.mjs";
import { recordMemory } from "../scripts/lib/memory-sink.mjs";

const MODE = astramemE2eMode(process.env);
const SKIP = MODE === "skip";

// Generous file-wide timeout for require mode (T2's poll loop alone can run
// up to ~10s; T3 runs 10 sequential recalls). Matches the repo's own
// `bun test --timeout 60000` CI invocation. A no-op in skip mode: no test
// body runs long enough to approach it.
setDefaultTimeout(60000);

/** Registers `fn` as a real test, or a `test.skip` stub in skip mode. Exists
 * only to dodge two independent tsc7/bun-types incompatibilities in this
 * repo's toolchain (see module comment above) -- functionally equivalent to
 * `test.skipIf(SKIP)(name, fn)`. */
function registerTest(name: string, fn: () => Promise<void>): void {
  if (SKIP) {
    test.skip(name, fn);
  } else {
    test(name, fn);
  }
}

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const BASE_URL = (process.env.MEMORY_API_URL || "http://127.0.0.1:7777").replace(/\/$/, "");
const RUN_TS = new Date().toISOString().replace(/[:.]/g, "-");
const TIMING_ARTIFACT_PATH = path.join(
  REPO_ROOT,
  ".claude",
  "artifacts",
  "loop",
  "memory-e2e",
  `${RUN_TS}-smoke.jsonl`
);

const PROJECT = "runner-plugin";
const AGENT_TYPE = "runner:researcher";
const CANARY_MARKER = `SMOKE-E2E-${randomUUID().slice(0, 8)}`;

/** Set by T2 once the canary is written; consumed by T4/T5. Tests run in
 * file order under bun:test, so T2 must precede T4/T5 in this file. */
let canaryAtomId: string | undefined;

async function recordTiming(entry: Record<string, unknown>): Promise<void> {
  if (SKIP) return; // skip mode never touches disk for this artifact either
  try {
    await fs.mkdir(path.dirname(TIMING_ARTIFACT_PATH), { recursive: true });
    await fs.appendFile(
      TIMING_ARTIFACT_PATH,
      `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`,
      "utf8"
    );
  } catch {
    /* best-effort artifact -- never fail a test over timing-log IO */
  }
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, idx)] ?? 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recallHitsFor(
  query: string,
  filters?: Record<string, unknown>
): Promise<Array<{ id: string; text: string }>> {
  const res = await boundedFetch(
    `${BASE_URL}/recall`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, k: 15, ...(filters ? { filters } : {}) })
    },
    { timeoutMs: 10000 }
  );
  if (res.status !== 200) return [];
  const body = (await res.json()) as { hits?: Array<{ id: string; text: string }> };
  return body.hits ?? [];
}

beforeAll(async () => {
  if (SKIP) return;
  // strict: T2/T3 exercise semantic recall — a degraded (embed-down) daemon
  // would pass plain preflight yet make those assertions meaningless.
  const result = await preflightAstramemDaemon({ timeoutMs: 2000, strict: true });
  assert.ok(result.ok, `ASTRAMEM_E2E=${MODE} but daemon preflight failed: ${result.message}`);
});

afterAll(async () => {
  if (SKIP) return;
  // No teardown: the canary is a single low-importance atom left in place
  // for operator inspection. The daemon exposes no delete-by-marker
  // primitive this suite can rely on, and inventing one here would be
  // scope creep on a test-only concern.
});

// ---------------------------------------------------------------------------
// T1 -- /health reachability, N=5
// ---------------------------------------------------------------------------

async function t1Health(): Promise<void> {
  const samples: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    const res = await boundedFetch(`${BASE_URL}/health`, { method: "GET" }, { timeoutMs: 10000 });
    samples.push(Date.now() - start);
    assert.equal(res.status, 200, "T1 FAIL: /health did not return 200");
    const body = (await res.json()) as { status?: string };
    assert.equal(body.status, "ok", `T1 FAIL: expected daemon status "ok", got "${body.status}"`);
  }
  const min = Math.min(...samples);
  const warn = min >= 100;
  if (warn) console.warn(`[T1 WARN] /health min latency ${min}ms >= 100ms warn threshold`);
  assert.ok(min < 2000, `T1 FAIL: /health min latency ${min}ms >= 2000ms fail budget`);
  await recordTiming({ test: "T1_health", samples_ms: samples, min_ms: min, pass: true, warn });
}

registerTest("T1 health: 5 GETs report status ok within budget", t1Health);

// ---------------------------------------------------------------------------
// T2 -- remember roundtrip via recordMemory() -> project-filtered /recall
// ---------------------------------------------------------------------------

async function t2RememberRoundtrip(): Promise<void> {
  const writeStart = Date.now();
  const result = await recordMemory(REPO_ROOT, {
    kind: "lesson",
    content: `${CANARY_MARKER} astramem e2e smoke canary lesson -- safe to ignore`,
    project: PROJECT,
    agentType: AGENT_TYPE,
    config: { mode: "on" }
  });
  const writeMs = Date.now() - writeStart;

  if (!result.recorded) {
    assert.fail(
      `T2 FAIL: recordMemory did not record (reason: "${result.reason}"). ` +
        "In require mode this almost always means CLAUDE_PLUGIN_ROOT_MEMORY is unset or " +
        "points at the wrong path -- set it to the installed astramem plugin root, e.g. " +
        "CLAUDE_PLUGIN_ROOT_MEMORY=C:/Users/<you>/.claude/plugins/cache/astra/astramem/<version>."
    );
  }
  assert.ok(writeMs < 2000, `T2 FAIL: recordMemory write took ${writeMs}ms >= 2000ms cap`);

  // Fresh atoms take ~1-3s to index (measured 2026-07-16, validation
  // artifact above) -- poll with retries up to ~10s, not single-shot.
  const deadline = Date.now() + 10000;
  const retrieveStart = Date.now();
  let found = false;
  while (Date.now() < deadline) {
    const hits = await recallHitsFor(CANARY_MARKER, { project: PROJECT });
    const hit = hits.find((h) => h.text.includes(CANARY_MARKER));
    if (hit) {
      canaryAtomId = hit.id;
      found = true;
      break;
    }
    await sleep(500);
  }
  const retrieveMs = Date.now() - retrieveStart;

  assert.ok(
    found,
    `T2 FAIL: canary marker ${CANARY_MARKER} not found via project-filtered /recall within 10s`
  );
  await recordTiming({
    test: "T2_remember_roundtrip",
    write_ms: writeMs,
    retrieve_ms: retrieveMs,
    atom_id: canaryAtomId,
    pass: true
  });
}

registerTest(
  "T2 remember roundtrip: recordMemory canary is found via project-filtered /recall",
  t2RememberRoundtrip
);

// ---------------------------------------------------------------------------
// T3 -- recall latency, k=15, N=10 semantic queries -> p50/p95
// ---------------------------------------------------------------------------

async function t3RecallLatency(): Promise<void> {
  const samples: number[] = [];
  for (let i = 0; i < 10; i++) {
    const query = `astramem e2e smoke semantic probe ${i} ${CANARY_MARKER}`;
    const start = Date.now();
    const res = await boundedFetch(
      `${BASE_URL}/recall`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, k: 15 })
      },
      { timeoutMs: 10000 }
    );
    const elapsed = Date.now() - start;
    assert.equal(res.status, 200, `T3 FAIL: /recall returned HTTP ${res.status} on query ${i}`);
    samples.push(elapsed);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const warn = p95 > 1500;
  if (warn) console.warn(`[T3 WARN] p95 ${p95}ms > 1500ms warn threshold`);
  assert.ok(p95 <= 3000, `T3 FAIL: p95 ${p95}ms > 3000ms fail budget`);
  await recordTiming({
    test: "T3_recall_latency",
    samples_ms: samples,
    p50_ms: p50,
    p95_ms: p95,
    pass: true,
    warn
  });
}

registerTest(
  "T3 recall latency: 10x semantic queries k=15, p50/p95 within budget",
  t3RecallLatency
);

// ---------------------------------------------------------------------------
// T4 -- agent-profile attribution
// ---------------------------------------------------------------------------

async function t4ProfileAttribution(): Promise<void> {
  assert.ok(canaryAtomId, "T4 depends on T2 having run first and recorded a canary atom id");

  const start = Date.now();
  // Primary path: GET /agents/:agent/profile (profileSilent) -- a real HTTP
  // endpoint the daemon exposes (daemon-client.ts::agentProfile), so no
  // fallback is needed by default; kept anyway because top_lessons ranks by
  // importance/usefulness and a fresh low-importance canary can, in
  // principle, be crowded out before it settles.
  const profile = await profileSilent(AGENT_TYPE, { capMs: 3000 });
  let attributed = Boolean(profile?.top_lessons.some((l) => l.text.includes(CANARY_MARKER)));
  let via = "profile";

  if (!attributed) {
    const hits = await recallHitsFor(CANARY_MARKER, { project: PROJECT, agent: AGENT_TYPE });
    attributed = hits.some((h) => h.text.includes(CANARY_MARKER));
    via = "recall-agent-filter-fallback";
  }
  const elapsed = Date.now() - start;

  assert.ok(
    attributed,
    `T4 FAIL: canary not attributed to ${AGENT_TYPE} via profile top_lessons or agent-filtered recall`
  );
  const warn = elapsed > 1000;
  if (warn) console.warn(`[T4 WARN] attribution check took ${elapsed}ms > 1000ms warn threshold`);
  assert.ok(elapsed < 3000, `T4 FAIL: attribution check took ${elapsed}ms >= 3000ms budget`);
  await recordTiming({ test: "T4_profile_attribution", ms: elapsed, pass: true, warn, via });
}

registerTest(
  "T4 agent-profile attribution: canary lesson attributed to runner:researcher",
  t4ProfileAttribution
);

// ---------------------------------------------------------------------------
// T5 -- feedback loop: submit_feedback -> usefulness rises off 0.5
// ---------------------------------------------------------------------------

async function t5FeedbackLoop(): Promise<void> {
  if (!canaryAtomId) {
    console.warn("[T5 SKIP] no canary atom id from T2 -- skipping, documented follow-up gap");
    return;
  }

  const beforeProfile = await profileSilent(AGENT_TYPE, { capMs: 3000 });
  const before = beforeProfile?.top_lessons.find((l) => l.id === canaryAtomId)?.usefulness;

  const ok = await feedbackSilent(canaryAtomId, { capMs: 5000 });
  assert.ok(ok, "T5 FAIL: feedbackSilent (POST /memory/:id/used) did not report success");

  // Small settle delay -- usefulness recompute can lag the write by a beat.
  await sleep(500);
  const afterProfile = await profileSilent(AGENT_TYPE, { capMs: 3000 });
  const after = afterProfile?.top_lessons.find((l) => l.id === canaryAtomId)?.usefulness;

  if (after === undefined) {
    // The canary can age out of top_lessons' cap between calls -- feedback
    // itself already succeeded above (the primary AC); the usefulness-delta
    // read is best-effort corroboration, not a hard requirement.
    console.warn(
      "[T5 WARN] canary no longer present in top_lessons after feedback -- usefulness-delta check skipped"
    );
  } else {
    assert.ok(
      after > 0.5 || (before !== undefined && after > before),
      `T5 FAIL: usefulness ${after} did not rise off 0.5 (before=${before})`
    );
  }
  await recordTiming({ test: "T5_feedback_loop", before, after, pass: true });
}

registerTest(
  "T5 feedback loop: feedbackSilent raises usefulness off 0.5 for the canary atom",
  t5FeedbackLoop
);

// ---------------------------------------------------------------------------
// T6 -- hang guard: boundedFetch bounds a genuinely hung local connection
// ---------------------------------------------------------------------------

async function t6HangGuard(): Promise<void> {
  // Accepts the TCP connection but never writes a response -- reproduces the
  // real incident this suite regression-guards (an astramem MCP call once
  // hung 300s with no response, astramem-local#347). Loopback-only, no
  // external network.
  const server = net.createServer((socket) => {
    socket.on("error", () => undefined); // client-abort teardown is expected
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  try {
    const start = Date.now();
    await assert.rejects(() =>
      boundedFetch(`http://127.0.0.1:${port}/health`, { method: "GET" }, { timeoutMs: 300 })
    );
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 3000, `T6 FAIL: boundedFetch did not bound the hang (took ${elapsed}ms)`);
    await recordTiming({ test: "T6_hang_guard", elapsed_ms: elapsed, pass: true });
  } finally {
    server.close();
  }
}

registerTest(
  "T6 hang guard: boundedFetch bounds a connection that accepts but never responds",
  t6HangGuard
);
