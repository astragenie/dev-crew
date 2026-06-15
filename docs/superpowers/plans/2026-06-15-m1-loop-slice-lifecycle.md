# M1 — Slice Lifecycle Live (Loop Side) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the loop-side emission for M1: wire every existing slice-event + loop-lifecycle marker through the M0 webhook-sender as envelopes, plus add a new `grades.jsonl` mirror writer invoked after `writeGrade` finishes. Loop will then push live state to the runner as slices progress.

**Architecture:** Re-use the M0 `webhook-sender` transport. Hook into the two existing emit sites: `appendSliceEvent` (per-slice events.jsonl) and `logEvent` (loop.jsonl). Add a third writer `appendGradeEvent` (new module) invoked from `writeGrade` after the md frontmatter is persisted. Each emit site posts to the configured webhook in addition to writing the JSONL row — failures are fail-silent (JSONL on disk stays authoritative; filesystem-resync on the runner side will backfill).

**Tech Stack:** Bun runtime, TypeScript `.mts` ESM, existing `event-notifier.mts` + `webhook-sender.mts` (M0).

**Parent Spec:** `docs/superpowers/specs/2026-06-15-loop-runner-jsonl-adoption-design.md` (Milestone M1, Loop FEATs L1-1, L1-2).

**Wave-run target:** Run in `C:\work\mega\loop`. Single repo, single wave.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/scripts/lib/slice-events.mts` | modify | `appendSliceEvent`: after the JSONL write, fan out to `webhook-sender` if `loop.notifications.webhook` is configured. Fail-silent. |
| `src/scripts/lib/telemetry.mts` | modify | `logEvent`: same fan-out behavior for loop.jsonl lifecycle markers (`slice from-feature`, `slice start`, `slice complete`, `slice grade*`). |
| `src/scripts/lib/grade-jsonl-writer.mts` | new | Append-only writer for `.claude/artifacts/loop/grades.jsonl`. One row per grade event: `{ts, sliceId, feature, spec, recordedAt, scores, decisions, timing, shape}`. |
| `src/scripts/lib/grade-writer.mts` | modify | `writeGrade`: after md persist + existing `logEvent("slice grade-write")`, call `appendGradeEvent` with the same fields it writes into frontmatter. |
| `src/scripts/lib/webhook-fanout.mts` | new | Internal helper: `await fanoutEnvelope(repoPath, kind, payload)`. Reads `loop.notifications.webhook` config, builds envelope, calls `createWebhookSender(...).send(...)`. Single point of duplication-avoidance for slice-events + telemetry + grade. |
| `src/tests/webhook-fanout.test.mts` | new | Tests for the helper: emits when webhook configured; no-op when not; preserves caller path (write-to-disk still happens regardless of webhook outcome). |
| `src/tests/slice-events-fanout.test.mts` | new | Integration test: `appendSliceEvent` writes JSONL AND posts to mocked webhook with `kind: "slice.workflow_state_changed"` etc. |
| `src/tests/telemetry-fanout.test.mts` | new | Integration test: `logEvent({command: "slice start", ...})` posts envelope `kind: "loop.slice.start"` (or similar — see Task 4 for the kind-mapping decision). |
| `src/tests/grade-jsonl-writer.test.mts` | new | Tests: writer appends one row with full grade event shape; idempotent on re-grade (same recordedAt); roundtrip JSON parse. |
| `src/tests/grade-write-fanout.test.mts` | new | Integration test: `writeGrade` writes md (existing) AND appends to grades.jsonl AND posts envelope `kind: "grade.recorded"` to mocked webhook. |

---

### Task 1: Build `webhook-fanout.mts` helper

**Files:**
- Create: `src/scripts/lib/webhook-fanout.mts`
- Create: `src/tests/webhook-fanout.test.mts`

- [ ] **Step 1: Write failing tests**

`src/tests/webhook-fanout.test.mts`:

```typescript
import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fanoutEnvelope, _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function withTempRepo(loopJson: object | null): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-fanout-"));
  if (loopJson) {
    await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
    await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify(loopJson));
  }
  return dir;
}

describe("fanoutEnvelope", () => {
  test("posts envelope when loop.notifications.webhook is configured", async () => {
    const repo = await withTempRepo({
      loop: {
        notifications: {
          enabled: true,
          mode: "webhook",
          webhook: {
            url: "https://runner.local/ingest",
            tenantId: "T",
            appId: "A",
            bearer: "B"
          }
        }
      }
    });
    const calls: { url: string; init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (url, init) => {
      calls.push({ url: typeof url === "string" ? url : url.toString(), init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await fanoutEnvelope(repo, "slice.workflow_state_changed", { sliceId: "SLICE-1", ts: "2026-06-15T12:00:00.000Z" });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.kind).toBe("slice.workflow_state_changed");
    expect(body.tenantId).toBe("T");
    expect(body.payload.sliceId).toBe("SLICE-1");
  });

  test("is a no-op when no loop.notifications.webhook config", async () => {
    const repo = await withTempRepo(null);
    const calls: unknown[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async () => { calls.push(1); return new Response(null, { status: 202 }); }) as typeof fanoutInternals.fetch;
    try {
      await fanoutEnvelope(repo, "slice.workflow_state_changed", { sliceId: "x", ts: "2026-06-15T12:00:00.000Z" });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(0);
  });

  test("swallows fetch errors fail-silent", async () => {
    const repo = await withTempRepo({
      loop: { notifications: { mode: "webhook", webhook: { url: "https://x.local/h", tenantId: "T", appId: "A", bearer: "B" } } }
    });
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async () => { throw new Error("ECONNREFUSED"); }) as typeof fanoutInternals.fetch;
    try {
      await expect(fanoutEnvelope(repo, "slice.workflow_state_changed", { sliceId: "x", ts: "2026-06-15T12:00:00.000Z" })).resolves.toBeUndefined();
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
  });
});
```

- [ ] **Step 2: Run test → confirm fail**

```pwsh
bun test src/tests/webhook-fanout.test.mts
```

Expected: module-not-found.

- [ ] **Step 3: Implement helper**

`src/scripts/lib/webhook-fanout.mts`:

```typescript
import { readNotifyConfig } from "./event-notifier.mjs";
import { createWebhookSender, type FetchFn } from "./webhook-sender.mjs";

export const _internals = {
  fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args)
};

export async function fanoutEnvelope(
  repoPath: string,
  kind: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const cfg = await readNotifyConfig(repoPath);
    if (!cfg.webhook?.url) return;

    const fetchFn = _internals.fetch as unknown as FetchFn;
    const senderConfig: {
      url: string;
      tenantId: string;
      appId: string;
      bearer: string;
      disabled?: boolean;
    } = {
      url: cfg.webhook.url,
      tenantId: cfg.webhook.tenantId,
      appId: cfg.webhook.appId,
      bearer: cfg.webhook.bearer
    };
    if (cfg.webhook.disabled !== undefined) {
      senderConfig.disabled = cfg.webhook.disabled;
    }
    const sender = createWebhookSender(senderConfig, { fetchFn });
    const emittedAt = (payload.ts as string | undefined) ?? (payload.timestamp as string | undefined) ?? new Date().toISOString();
    await sender.send({
      tenantId: cfg.webhook.tenantId,
      appId: cfg.webhook.appId,
      kind,
      payload,
      emittedAt
    });
  } catch {
    // Fail-silent contract: JSONL on disk is authoritative.
  }
}
```

- [ ] **Step 4: Run test → confirm pass**

```pwsh
bun test src/tests/webhook-fanout.test.mts
```

Expected: 3/3 PASS.

- [ ] **Step 5: Lint + typecheck**

```pwsh
bunx tsc --project tsconfig.json --noEmit
bunx tsc --project tsconfig.test.json --noEmit
bunx eslint src/scripts/lib/webhook-fanout.mts src/tests/webhook-fanout.test.mts
```

Expected: clean.

- [ ] **Step 6: Commit**

```pwsh
git add src/scripts/lib/webhook-fanout.mts src/tests/webhook-fanout.test.mts
git commit -m "feat(transport): webhook-fanout helper (envelope + fail-silent)"
```

---

### Task 2: Wire `appendSliceEvent` through the fanout helper

**Files:**
- Modify: `src/scripts/lib/slice-events.mts`
- Create: `src/tests/slice-events-fanout.test.mts`

- [ ] **Step 1: Read `appendSliceEvent` to confirm signature**

Open `src/scripts/lib/slice-events.mts`. Locate `appendSliceEvent(repoPath, event, ...)`. Note its current behavior (writes one JSONL row per call).

- [ ] **Step 2: Write failing integration test**

`src/tests/slice-events-fanout.test.mts`:

```typescript
import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendSliceEvent } from "../scripts/lib/slice-events.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function withTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-slice-fanout-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify({
    loop: { notifications: { mode: "webhook", webhook: { url: "https://runner.local/h", tenantId: "T", appId: "A", bearer: "B" } } }
  }));
  return dir;
}

describe("appendSliceEvent — webhook fanout", () => {
  test("writes JSONL row AND posts envelope with kind slice.workflow_state_changed", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await appendSliceEvent(repo, {
        type: "workflow_state_changed",
        sliceId: "SLICE-1",
        featureId: "FEAT-9",
        timestamp: "2026-06-15T12:00:00.000Z",
        from: "building",
        to: "reviewing"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }

    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.kind).toBe("slice.workflow_state_changed");
    expect(body.payload.sliceId).toBe("SLICE-1");
    expect(body.payload.from).toBe("building");
    expect(body.payload.to).toBe("reviewing");
  });
});
```

- [ ] **Step 3: Run test → confirm fail**

```pwsh
bun test src/tests/slice-events-fanout.test.mts
```

Expected: 0 webhook calls (no fanout yet).

- [ ] **Step 4: Modify `appendSliceEvent`**

Edit `src/scripts/lib/slice-events.mts`. At the top, add:

```typescript
import { fanoutEnvelope } from "./webhook-fanout.mjs";
```

Inside `appendSliceEvent`, AFTER the existing `fs.appendFile(...)` (or equivalent JSONL write), add:

```typescript
  // M1: also fan out to runner via webhook if configured. Fail-silent.
  const kind = `slice.${event.type}`;
  const { type: _t, ...payload } = event;
  await fanoutEnvelope(repoPath, kind, payload as Record<string, unknown>);
```

The `type` field is stripped from the payload because it becomes the `kind` discriminator on the envelope.

- [ ] **Step 5: Run test → confirm pass**

```pwsh
bun test src/tests/slice-events-fanout.test.mts
```

Expected: PASS.

- [ ] **Step 6: Regression — existing slice-events tests**

```pwsh
bun test src/tests/slice-events*.test.mts
```

Expected: all green.

- [ ] **Step 7: Commit**

```pwsh
git add src/scripts/lib/slice-events.mts src/tests/slice-events-fanout.test.mts
git commit -m "feat(slice-events): fan out to runner webhook with slice.<event-type> kind"
```

---

### Task 3: Wire `logEvent` (telemetry.mts) through the fanout helper

**Files:**
- Modify: `src/scripts/lib/telemetry.mts`
- Create: `src/tests/telemetry-fanout.test.mts`

- [ ] **Step 1: Read `logEvent` to confirm signature**

Open `src/scripts/lib/telemetry.mts`. Locate `logEvent(repoPath, payload)`. The payload includes a `command` field (e.g. `"slice start"`, `"slice complete"`, `"slice grade-write"`).

- [ ] **Step 2: Write failing test**

`src/tests/telemetry-fanout.test.mts`:

```typescript
import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { logEvent } from "../scripts/lib/telemetry.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function withTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-tel-fanout-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify({
    loop: { notifications: { mode: "webhook", webhook: { url: "https://runner.local/h", tenantId: "T", appId: "A", bearer: "B" } } }
  }));
  return dir;
}

describe("logEvent — webhook fanout", () => {
  test("posts envelope with kind loop.<command> where command is dot-separated", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await logEvent(repo, {
        command: "slice start",
        slice: "SLICE-1",
        feature: "FEAT-9"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }

    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.kind).toBe("loop.slice.start");
    expect(body.payload.slice).toBe("SLICE-1");
    expect(body.payload.feature).toBe("FEAT-9");
  });
});
```

The kind translation rule: `command` becomes `loop.<command-with-spaces-as-dots>`. So `"slice start"` → `"loop.slice.start"`, `"slice grade-write"` → `"loop.slice.grade-write"` (hyphens preserved).

- [ ] **Step 3: Run test → confirm fail**

```pwsh
bun test src/tests/telemetry-fanout.test.mts
```

- [ ] **Step 4: Modify `logEvent`**

Edit `src/scripts/lib/telemetry.mts`. Add at top:

```typescript
import { fanoutEnvelope } from "./webhook-fanout.mjs";
```

Inside `logEvent`, AFTER the existing `loop.jsonl` append, add:

```typescript
  if (typeof payload.command === "string" && payload.command.length > 0) {
    const kind = `loop.${(payload.command as string).replace(/\s+/g, ".")}`;
    const { command: _c, ...rest } = payload;
    await fanoutEnvelope(repoPath, kind, rest as Record<string, unknown>);
  }
```

- [ ] **Step 5: Run test → confirm pass + regression**

```pwsh
bun test src/tests/telemetry*.test.mts
```

Expected: all green.

- [ ] **Step 6: Commit**

```pwsh
git add src/scripts/lib/telemetry.mts src/tests/telemetry-fanout.test.mts
git commit -m "feat(telemetry): fan out loop.jsonl commands as kind loop.<cmd>"
```

---

### Task 4: Implement `grade-jsonl-writer.mts`

**Files:**
- Create: `src/scripts/lib/grade-jsonl-writer.mts`
- Create: `src/tests/grade-jsonl-writer.test.mts`

- [ ] **Step 1: Write failing test**

`src/tests/grade-jsonl-writer.test.mts`:

```typescript
import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendGradeEvent, GRADE_JSONL_RELATIVE } from "../scripts/lib/grade-jsonl-writer.mjs";

async function withTempRepo(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "loop-grade-jsonl-"));
}

describe("appendGradeEvent", () => {
  test("writes one row with full grade-event shape", async () => {
    const repo = await withTempRepo();
    await appendGradeEvent(repo, {
      sliceId: "SLICE-1",
      featureId: "FEAT-9",
      spec: "SPEC-3",
      recordedAt: "2026-06-15T12:00:00.000Z",
      scores: { architecture_quality: 0.9, reliability: 0.85 },
      decisions: [{ id: "DEC-001", status: "accepted", body: "use X" }],
      timing: { wall_clock_seconds: 12 },
      shape: { classified: "small" }
    });

    const file = path.join(repo, GRADE_JSONL_RELATIVE);
    const content = await fs.readFile(file, "utf8");
    const lines = content.trim().split("\n");
    expect(lines.length).toBe(1);
    const row = JSON.parse(lines[0]);
    expect(row.sliceId).toBe("SLICE-1");
    expect(row.scores.architecture_quality).toBe(0.9);
    expect(row.decisions[0].id).toBe("DEC-001");
    expect(row.recordedAt).toBe("2026-06-15T12:00:00.000Z");
  });

  test("appends a second row without overwriting the first", async () => {
    const repo = await withTempRepo();
    await appendGradeEvent(repo, {
      sliceId: "SLICE-1",
      recordedAt: "2026-06-15T12:00:00.000Z",
      scores: { reliability: 0.8 }
    });
    await appendGradeEvent(repo, {
      sliceId: "SLICE-2",
      recordedAt: "2026-06-15T13:00:00.000Z",
      scores: { reliability: 0.9 }
    });
    const file = path.join(repo, GRADE_JSONL_RELATIVE);
    const lines = (await fs.readFile(file, "utf8")).trim().split("\n");
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0]).sliceId).toBe("SLICE-1");
    expect(JSON.parse(lines[1]).sliceId).toBe("SLICE-2");
  });
});
```

- [ ] **Step 2: Run test → confirm fail**

```pwsh
bun test src/tests/grade-jsonl-writer.test.mts
```

- [ ] **Step 3: Implement**

`src/scripts/lib/grade-jsonl-writer.mts`:

```typescript
import fs from "node:fs/promises";
import path from "node:path";

export const GRADE_JSONL_RELATIVE = path.join(".claude", "artifacts", "loop", "grades.jsonl");

export interface GradeEventPayload {
  sliceId: string;
  featureId?: string;
  spec?: string;
  recordedAt: string;
  scores: Record<string, number>;
  decisions?: Array<{ id: string; status: string; body?: string }>;
  timing?: Record<string, unknown>;
  shape?: Record<string, unknown>;
}

export async function appendGradeEvent(
  repoPath: string,
  event: GradeEventPayload
): Promise<void> {
  const file = path.join(repoPath, GRADE_JSONL_RELATIVE);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const line = JSON.stringify(event) + "\n";
  await fs.appendFile(file, line, "utf8");
}
```

- [ ] **Step 4: Run test → confirm pass**

```pwsh
bun test src/tests/grade-jsonl-writer.test.mts
```

Expected: 2/2 PASS.

- [ ] **Step 5: Commit**

```pwsh
git add src/scripts/lib/grade-jsonl-writer.mts src/tests/grade-jsonl-writer.test.mts
git commit -m "feat(grade): grade-jsonl-writer (one row per grade event)"
```

---

### Task 5: Wire `writeGrade` to call `appendGradeEvent` + fanout

**Files:**
- Modify: `src/scripts/lib/grade-writer.mts`
- Create: `src/tests/grade-write-fanout.test.mts`

- [ ] **Step 1: Write failing test**

`src/tests/grade-write-fanout.test.mts`:

```typescript
import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeGrade } from "../scripts/lib/grade-writer.mjs";
import { GRADE_JSONL_RELATIVE } from "../scripts/lib/grade-jsonl-writer.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

// Helper to scaffold a minimal repo with a grade file ready for writeGrade.
async function withGradeRepo(sliceId: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-grade-fanout-"));
  // (Authentic grade-file scaffolding is non-trivial; reuse helpers from
  // existing grade-writer tests if they expose any. Otherwise see:
  // src/tests/grade-writer-*.test.mts for the established fixture pattern.)
  // Minimal example below — adjust to match repo conventions:
  const gradeDir = path.join(dir, ".claude", "artifacts", "loop", "grades");
  await fs.mkdir(gradeDir, { recursive: true });
  const gradeFile = path.join(gradeDir, `20260615T120000Z-${sliceId}-grade.md`);
  const gradeContent =
    "---\n" +
    `slice: ${sliceId}\n` +
    "feature: FEAT-9\n" +
    "spec: SPEC-3\n" +
    "phase: complete\n" +
    "status: passed\n" +
    "scores: {}\n" +
    "decisions: []\n" +
    "---\n" +
    "\n" +
    "## Scores\n\n" +
    "- architecture_quality: 0.9\n" +
    "- reliability: 0.85\n" +
    "- observability: 0.8\n" +
    "- production_readiness: 0.9\n" +
    "- security: 0.85\n" +
    "- test_confidence: 0.95\n" +
    "- product_completeness: 0.9\n";
  await fs.writeFile(gradeFile, gradeContent);
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify({
    loop: { notifications: { mode: "webhook", webhook: { url: "https://runner.local/h", tenantId: "T", appId: "A", bearer: "B" } } }
  }));
  return dir;
}

describe("writeGrade — grades.jsonl + webhook fanout", () => {
  test("appends grades.jsonl row AND posts envelope kind grade.recorded", async () => {
    const repo = await withGradeRepo("SLICE-1");
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await writeGrade(repo, "SLICE-1");
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    // grades.jsonl exists with at least one row
    const jsonlPath = path.join(repo, GRADE_JSONL_RELATIVE);
    const jsonlContent = await fs.readFile(jsonlPath, "utf8");
    const rows = jsonlContent.trim().split("\n");
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const row = JSON.parse(rows[0]);
    expect(row.sliceId).toBe("SLICE-1");
    expect(row.scores.architecture_quality).toBe(0.9);
    // Webhook fanout — find the grade.recorded post (logEvent will also fire kind loop.slice.grade-write)
    const gradePost = calls.find(c => {
      const body = JSON.parse(String(c.init?.body));
      return body.kind === "grade.recorded";
    });
    expect(gradePost).toBeDefined();
  });
});
```

NOTE: the grade-file fixture above is illustrative. The real `writeGrade` is strict about the md format. Inspect existing tests under `src/tests/grade-writer*.test.mts` and reuse their helper if one exists. Adapt the test to use that helper. If the test setup is too fiddly, BLOCK and ask the controller for a smaller-scope test fixture instead.

- [ ] **Step 2: Run → confirm fail**

```pwsh
bun test src/tests/grade-write-fanout.test.mts
```

Expected: row not written OR no grade.recorded webhook call.

- [ ] **Step 3: Modify `writeGrade`**

Edit `src/scripts/lib/grade-writer.mts`. Add at top:

```typescript
import { appendGradeEvent } from "./grade-jsonl-writer.mjs";
import { fanoutEnvelope } from "./webhook-fanout.mjs";
```

After the existing `logEvent({...command: "slice grade-write"...})` call (around line 296), add:

```typescript
  // M1: mirror grade to grades.jsonl + fan out to runner via webhook.
  const gradeEvent = {
    sliceId,
    featureId: (frontmatter.feature as string | undefined),
    spec: (frontmatter.spec as string | undefined),
    recordedAt: (frontmatter.graded_at as string | undefined) ?? today(),
    scores,
    decisions: allocated.map((d) => ({ id: d.id, status: "accepted" as const, body: d.body ?? "" })),
    timing: (frontmatter.timing as Record<string, unknown>) ?? {},
    shape: (frontmatter.shape as Record<string, unknown>) ?? {}
  };
  await appendGradeEvent(repoPath, gradeEvent);
  await fanoutEnvelope(repoPath, "grade.recorded", gradeEvent as Record<string, unknown>);
```

The actual field names depend on what `writeGrade` already has in scope at the relevant line. Read the function body first and adapt — `frontmatter`, `scores`, `allocated`, `decisions`, `today()` should all be local. If `feature`/`spec` aren't on `frontmatter`, extract them from the md body or accept they'll be undefined for legacy grades.

- [ ] **Step 4: Run → confirm pass + regression**

```pwsh
bun test src/tests/grade-write*.test.mts
```

Expected: all green (the new test passes, existing grade-writer tests are still green).

- [ ] **Step 5: Commit**

```pwsh
git add src/scripts/lib/grade-writer.mts src/tests/grade-write-fanout.test.mts
git commit -m "feat(grade): mirror grade to grades.jsonl + fan out kind grade.recorded"
```

---

### Task 6: Final green sweep

**Files:** none

- [ ] **Step 1: Full test suite**

```pwsh
bun test src/tests/ --parallel --timeout 60000
```

Expected: all PASS.

- [ ] **Step 2: Lint + format**

```pwsh
bun run lint
bun run format:check
```

Expected: clean.

- [ ] **Step 3: Typecheck both projects**

```pwsh
bunx tsc --project tsconfig.json --noEmit
bunx tsc --project tsconfig.test.json --noEmit
```

Expected: clean.

- [ ] **Step 4: Validators**

```pwsh
bun ./src/scripts/validate-manifests.mts
bun ./src/scripts/validate-content-length.mts
bun ./src/scripts/validate-event-schemas.mts
```

Expected: all pass; event-schemas script prints `Event schemas OK`.

- [ ] **Step 5: Commit any formatter fixups**

```pwsh
git status
git add -p
git commit -m "style: prettier fixups for m1-loop-slice-lifecycle"
```

(Skip if nothing to commit.)

- [ ] **Step 6: Summary**

```pwsh
git log main..HEAD --oneline
git diff main..HEAD --stat
```

---

## Self-Review Notes

- L1-1 (wire slice-events + loop.jsonl) → Tasks 1 + 2 + 3.
- L1-2 (grade-jsonl writer at slice-grade-write) → Tasks 4 + 5.
- No new event kinds are emitted in M1 — only existing ones are routed through the webhook fanout.
- Slice events use kind `slice.<event-type>` (e.g. `slice.workflow_state_changed`). Loop lifecycle commands use kind `loop.<command-with-dots>` (e.g. `loop.slice.start`). Grade events use kind `grade.recorded`. All three already exist in the M0 schema index (`schemas/loop-events/index.json`).
- Failure mode: webhook unreachable → `fanoutEnvelope` swallows the error. JSONL on disk is authoritative. Runner side will filesystem-resync.

## Out of scope (next milestone)

- Adding new event kinds (`specialist_pause`, `shape_classified`, `phase_gate_mode_detected`, `wave_member_slice`, `worktree_cleaned`, `merge_conflict_detail`) — M2 + M4 + M5.
- Tool-call count / dispatch latency fields on `agent_completed` — M3.
- Worker-side dispatcher routing `kind` to handlers — runner-side M1.
