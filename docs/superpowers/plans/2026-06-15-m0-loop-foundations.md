# M0 — Foundations (Loop Side) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the loop-side foundations for JSONL-based runner ingestion: a Bearer-auth webhook transport, configuration surface, versioned event schemas, and a CI validator. No new events are emitted yet — M1 wires the existing JSONL streams through this transport.

**Architecture:** Reuse the existing `src/scripts/lib/event-notifier.mts` (which already supports `mode: "webhook"`) and extract a focused `webhook-sender.mts` module that handles Bearer authentication, payload envelope shape, and retry policy. Add a versioned JSON Schema directory `schemas/loop-events/` consumed by both repos. A pre-emit CI validator catches schema drift before code reaches the runner.

**Tech Stack:** Bun runtime, TypeScript (`.mts` ESM), JSON Schema 2020-12 (validated via `ajv`).

**Parent Spec:** `docs/superpowers/specs/2026-06-15-loop-runner-jsonl-adoption-design.md` (Milestone M0, Loop FEATs L0-1, L0-2, L0-3).

**Wave-run target:** This plan = one wave-run in `C:\work\mega\loop`.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/scripts/lib/webhook-sender.mts` | new | Bearer transport: builds envelope, signs header, performs fetch, retries on 5xx, disables on 401/403 for session, backs off on 429. Pure transport — no business logic. |
| `src/scripts/lib/event-notifier.mts` | modify | Delegate the webhook branch to `webhook-sender.ts`. Keep `osNotification` + `customCommand` branches unchanged. |
| `src/scripts/lib/loop-config.mts` | modify | Extend `loop.notifications.webhook` shape: add `tenantId`, `appId`, `bearer`, `url`, `disabled`. |
| `schemas/loop-events/envelope.schema.json` | new | Outer payload schema: `{tenantId, appId, kind, payload, sourcePath, lineOffset, emittedAt}`. |
| `schemas/loop-events/slice-event.schema.json` | new | Schema for slice-events.jsonl entries. (M1 will reference; M0 provides the structure.) |
| `schemas/loop-events/wave-event.schema.json` | new | Schema for wave events. |
| `schemas/loop-events/grade-event.schema.json` | new | Schema for grades.jsonl entries. |
| `schemas/loop-events/agent-dispatch.schema.json` | new | Schema for auto-dispatch.jsonl entries. |
| `schemas/loop-events/halt-badge.schema.json` | new | Schema for stop-check snapshot payloads. |
| `schemas/loop-events/index.json` | new | `{ "schemaVersion": "1.0.0", "kinds": { "slice.workflow_state_changed": "slice-event.schema.json", ... } }` — maps every `kind` value to its schema file. |
| `src/scripts/validate-event-schemas.mts` | new | CI validator: walks every schema file, type-checks JSON Schema validity, ensures every `kind` listed in `index.json` resolves to a present schema file. |
| `src/scripts/lib/event-validator.mts` | new | Runtime validator: ajv-backed function `validateEvent(envelope) → { ok, errors }`. Used by webhook-sender to fail fast on bad emit. |
| `src/tests/webhook-sender.test.mts` | new | Tests for transport: header construction, retry, disable-on-401, backoff. |
| `src/tests/event-validator.test.mts` | new | Tests for schema validation. |
| `src/tests/loop-config-webhook.test.mts` | new | Tests for new `loop.notifications.webhook.*` config fields. |
| `package.json` | modify | Add `ajv` + `ajv-formats` runtime deps. Add `"validate:event-schemas"` script. |
| `.github/workflows/ci.yml` | modify | Add `bun ./src/scripts/validate-event-schemas.mts` to the gates list. |

---

### Task 1: Add `ajv` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the dependency**

Run:
```pwsh
bun add ajv@^8.17 ajv-formats@^3.0
```

Expected: `package.json` and `bun.lockb` updated. `node_modules/ajv` present.

- [ ] **Step 2: Verify install**

Run:
```pwsh
bun -e "import Ajv from 'ajv'; console.log(typeof Ajv);"
```

Expected output: `function`

- [ ] **Step 3: Commit**

```pwsh
git add package.json bun.lockb
git commit -m "build(deps): add ajv + ajv-formats for event-schema validation"
```

---

### Task 2: Author the event envelope schema

**Files:**
- Create: `schemas/loop-events/envelope.schema.json`
- Create: `schemas/loop-events/index.json`

- [ ] **Step 1: Write the envelope schema**

`schemas/loop-events/envelope.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loop.astragenie.dev/schemas/loop-events/envelope.schema.json",
  "title": "LoopEventEnvelope",
  "type": "object",
  "required": ["tenantId", "appId", "kind", "payload", "emittedAt"],
  "additionalProperties": false,
  "properties": {
    "tenantId": { "type": "string", "minLength": 1 },
    "appId": { "type": "string", "minLength": 1 },
    "kind": { "type": "string", "minLength": 1 },
    "payload": { "type": "object" },
    "sourcePath": { "type": "string" },
    "lineOffset": { "type": "integer", "minimum": 0 },
    "emittedAt": { "type": "string", "format": "date-time" },
    "schemaVersion": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" }
  }
}
```

- [ ] **Step 2: Write the index**

`schemas/loop-events/index.json`:

```json
{
  "schemaVersion": "1.0.0",
  "envelope": "envelope.schema.json",
  "kinds": {}
}
```

- [ ] **Step 3: Commit**

```pwsh
git add schemas/loop-events/envelope.schema.json schemas/loop-events/index.json
git commit -m "feat(schemas): add loop event envelope schema + index baseline"
```

---

### Task 3: Author per-stream schemas (slice, wave, grade, agent-dispatch, halt-badge)

**Files:**
- Create: `schemas/loop-events/slice-event.schema.json`
- Create: `schemas/loop-events/wave-event.schema.json`
- Create: `schemas/loop-events/grade-event.schema.json`
- Create: `schemas/loop-events/agent-dispatch.schema.json`
- Create: `schemas/loop-events/halt-badge.schema.json`
- Modify: `schemas/loop-events/index.json`

- [ ] **Step 1: Write slice-event schema**

`schemas/loop-events/slice-event.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loop.astragenie.dev/schemas/loop-events/slice-event.schema.json",
  "title": "SliceEventPayload",
  "type": "object",
  "required": ["sliceId", "ts"],
  "properties": {
    "sliceId": { "type": "string" },
    "featureId": { "type": "string" },
    "ts": { "type": "string", "format": "date-time" },
    "from": { "type": "string" },
    "to": { "type": "string" },
    "gate": { "type": "string" },
    "agent": { "type": "string" },
    "status": { "type": "string" },
    "reason": { "type": "string" },
    "durationMs": { "type": "integer", "minimum": 0 },
    "dispatchedAt": { "type": "string", "format": "date-time" },
    "firstOutputAt": { "type": "string", "format": "date-time" },
    "toolCalls": { "type": "integer", "minimum": 0 }
  }
}
```

- [ ] **Step 2: Write wave-event schema**

`schemas/loop-events/wave-event.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loop.astragenie.dev/schemas/loop-events/wave-event.schema.json",
  "title": "WaveEventPayload",
  "type": "object",
  "required": ["waveId", "ts"],
  "properties": {
    "waveId": { "type": "string" },
    "ts": { "type": "string", "format": "date-time" },
    "size": { "type": "integer", "minimum": 0 },
    "rejectedCount": { "type": "integer", "minimum": 0 },
    "runId": { "type": "string" },
    "sliceIds": { "type": "array", "items": { "type": "string" } },
    "merged": { "type": "array", "items": { "type": "string" } },
    "conflicts": { "type": "array", "items": { "type": "string" } },
    "failed": { "type": "array", "items": { "type": "string" } },
    "status": { "type": "string", "enum": ["PASS", "FAIL", "skipped"] },
    "pivots": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["sliceId", "kind"],
        "properties": {
          "sliceId": { "type": "string" },
          "kind": { "type": "string" }
        }
      }
    },
    "haltReason": { "type": ["string", "null"] },
    "durationMs": { "type": "integer", "minimum": 0 },
    "passCount": { "type": "integer", "minimum": 0 },
    "failCount": { "type": "integer", "minimum": 0 }
  }
}
```

- [ ] **Step 3: Write grade-event schema**

`schemas/loop-events/grade-event.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loop.astragenie.dev/schemas/loop-events/grade-event.schema.json",
  "title": "GradeEventPayload",
  "type": "object",
  "required": ["sliceId", "recordedAt", "scores"],
  "properties": {
    "sliceId": { "type": "string" },
    "featureId": { "type": "string" },
    "spec": { "type": "string" },
    "recordedAt": { "type": "string", "format": "date-time" },
    "scores": {
      "type": "object",
      "additionalProperties": { "type": "number", "minimum": 0, "maximum": 1 }
    },
    "decisions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "status"],
        "properties": {
          "id": { "type": "string" },
          "status": { "type": "string" },
          "body": { "type": "string" }
        }
      }
    },
    "timing": { "type": "object" },
    "shape": { "type": "object" }
  }
}
```

- [ ] **Step 4: Write agent-dispatch schema**

`schemas/loop-events/agent-dispatch.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loop.astragenie.dev/schemas/loop-events/agent-dispatch.schema.json",
  "title": "AgentDispatchPayload",
  "type": "object",
  "required": ["timestamp", "agent", "ok"],
  "properties": {
    "timestamp": { "type": "string", "format": "date-time" },
    "agent": { "type": "string" },
    "parentCommand": { "type": "string" },
    "ok": { "type": "boolean" },
    "skipped": { "type": "boolean" },
    "skipReason": { "type": "string" },
    "costUsd": { "type": "number", "minimum": 0 },
    "durationMs": { "type": "integer", "minimum": 0 },
    "inputTokens": { "type": "integer", "minimum": 0 },
    "outputTokens": { "type": "integer", "minimum": 0 },
    "stepType": { "type": "string" }
  }
}
```

- [ ] **Step 5: Write halt-badge schema**

`schemas/loop-events/halt-badge.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loop.astragenie.dev/schemas/loop-events/halt-badge.schema.json",
  "title": "HaltBadgePayload",
  "type": "object",
  "required": ["badgeKind", "ts"],
  "properties": {
    "badgeKind": { "type": "string" },
    "ts": { "type": "string", "format": "date-time" },
    "sliceId": { "type": "string" },
    "waveId": { "type": "string" },
    "details": { "type": "object" }
  }
}
```

- [ ] **Step 6: Update index.json with kind → schema map**

Replace `schemas/loop-events/index.json` with:

```json
{
  "schemaVersion": "1.0.0",
  "envelope": "envelope.schema.json",
  "kinds": {
    "slice.workflow_state_changed": "slice-event.schema.json",
    "slice.gate_transition": "slice-event.schema.json",
    "slice.agent_dispatched": "slice-event.schema.json",
    "slice.agent_completed": "slice-event.schema.json",
    "slice.agent_error": "slice-event.schema.json",
    "wave.started": "wave-event.schema.json",
    "wave.plan_built": "wave-event.schema.json",
    "wave.dispatched": "wave-event.schema.json",
    "wave.finalized": "wave-event.schema.json",
    "wave.post_merge_test": "wave-event.schema.json",
    "wave.pivoted": "wave-event.schema.json",
    "wave.completed": "wave-event.schema.json",
    "grade.recorded": "grade-event.schema.json",
    "agent.dispatch": "agent-dispatch.schema.json",
    "halt_badge": "halt-badge.schema.json"
  }
}
```

- [ ] **Step 7: Commit**

```pwsh
git add schemas/loop-events/
git commit -m "feat(schemas): add per-stream loop event schemas (slice, wave, grade, dispatch, halt)"
```

---

### Task 4: Build the schema-validator CI script

**Files:**
- Create: `src/scripts/validate-event-schemas.mts`
- Modify: `package.json` (add `validate:event-schemas` script)
- Modify: `.github/workflows/ci.yml` (add gate)

- [ ] **Step 1: Write the failing test**

Create `src/tests/validate-event-schemas.test.mts`:

```typescript
import { describe, expect, test } from "bun:test";
import { validateEventSchemas } from "../scripts/validate-event-schemas.mjs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..");

describe("validate-event-schemas", () => {
  test("loads the schema directory without errors", async () => {
    const result = await validateEventSchemas(repoRoot);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("returns error when index references a missing schema file", async () => {
    const result = await validateEventSchemas(repoRoot, {
      indexOverride: { schemaVersion: "1.0.0", envelope: "envelope.schema.json", kinds: { "bogus": "missing.schema.json" } }
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes("missing.schema.json"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to confirm fail**

```pwsh
bun test src/tests/validate-event-schemas.test.mts
```

Expected: FAIL (`Cannot find module '../scripts/validate-event-schemas.mjs'`).

- [ ] **Step 3: Implement the validator**

Create `src/scripts/validate-event-schemas.mts`:

```typescript
import fs from "node:fs/promises";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

interface IndexShape {
  schemaVersion: string;
  envelope: string;
  kinds: Record<string, string>;
}

interface ValidatorOptions {
  indexOverride?: IndexShape;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export async function validateEventSchemas(
  repoRoot: string,
  opts: ValidatorOptions = {}
): Promise<ValidationResult> {
  const errors: string[] = [];
  const schemasDir = path.join(repoRoot, "schemas", "loop-events");

  let index: IndexShape;
  if (opts.indexOverride) {
    index = opts.indexOverride;
  } else {
    try {
      const raw = await fs.readFile(path.join(schemasDir, "index.json"), "utf8");
      index = JSON.parse(raw) as IndexShape;
    } catch (err) {
      return { ok: false, errors: [`Failed to read index.json: ${(err as Error).message}`] };
    }
  }

  if (!/^\d+\.\d+\.\d+$/.test(index.schemaVersion ?? "")) {
    errors.push(`index.json schemaVersion must be semver, got: ${index.schemaVersion}`);
  }

  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);

  const filesToCheck = new Set<string>([index.envelope, ...Object.values(index.kinds)]);
  for (const filename of filesToCheck) {
    const filePath = path.join(schemasDir, filename);
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const schema = JSON.parse(raw);
      try {
        ajv.compile(schema);
      } catch (compileErr) {
        errors.push(`Invalid JSON Schema in ${filename}: ${(compileErr as Error).message}`);
      }
    } catch (err) {
      errors.push(`Missing or unreadable schema file ${filename}: ${(err as Error).message}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

if (import.meta.main) {
  const repoRoot = process.cwd();
  const result = await validateEventSchemas(repoRoot);
  if (!result.ok) {
    console.error("Event schema validation failed:");
    for (const e of result.errors) console.error(`  - ${e}`);
    process.exitCode = 1;
  } else {
    console.log("Event schemas OK");
  }
}
```

- [ ] **Step 4: Run test to confirm pass**

```pwsh
bun test src/tests/validate-event-schemas.test.mts
```

Expected: PASS for both cases.

- [ ] **Step 5: Add npm script**

Add to `package.json` scripts block:

```json
{
  "scripts": {
    "validate:event-schemas": "bun ./src/scripts/validate-event-schemas.mts"
  }
}
```

- [ ] **Step 6: Wire into CI**

Read `.github/workflows/ci.yml` and add a step after the existing `validate:content-length` step. Pattern matches the existing validator steps:

```yaml
      - name: Validate event schemas
        run: bun ./src/scripts/validate-event-schemas.mts
```

- [ ] **Step 7: Run locally**

```pwsh
bun ./src/scripts/validate-event-schemas.mts
```

Expected output: `Event schemas OK`

- [ ] **Step 8: Commit**

```pwsh
git add src/scripts/validate-event-schemas.mts src/tests/validate-event-schemas.test.mts package.json .github/workflows/ci.yml
git commit -m "feat(schemas): CI validator for loop event schemas"
```

---

### Task 5: Build the runtime event validator helper

**Files:**
- Create: `src/scripts/lib/event-validator.mts`
- Create: `src/tests/event-validator.test.mts`

- [ ] **Step 1: Write the failing test**

`src/tests/event-validator.test.mts`:

```typescript
import { describe, expect, test, beforeAll } from "bun:test";
import { createEventValidator, type EventValidator } from "../scripts/lib/event-validator.mjs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..");
let validator: EventValidator;

beforeAll(async () => {
  validator = await createEventValidator(path.join(repoRoot, "schemas", "loop-events"));
});

describe("createEventValidator", () => {
  test("accepts a well-formed slice event envelope", () => {
    const result = validator({
      tenantId: "t1",
      appId: "a1",
      kind: "slice.workflow_state_changed",
      payload: { sliceId: "SLICE-1", ts: "2026-06-15T12:00:00.000Z", from: "building", to: "reviewing" },
      emittedAt: "2026-06-15T12:00:00.000Z"
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("rejects envelope with unknown kind", () => {
    const result = validator({
      tenantId: "t1",
      appId: "a1",
      kind: "bogus.kind",
      payload: {},
      emittedAt: "2026-06-15T12:00:00.000Z"
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes("Unknown kind"))).toBe(true);
  });

  test("rejects envelope with payload that does not match kind schema", () => {
    const result = validator({
      tenantId: "t1",
      appId: "a1",
      kind: "grade.recorded",
      payload: { sliceId: "SLICE-1" },
      emittedAt: "2026-06-15T12:00:00.000Z"
    });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to confirm fail**

```pwsh
bun test src/tests/event-validator.test.mts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement the validator**

`src/scripts/lib/event-validator.mts`:

```typescript
import fs from "node:fs/promises";
import path from "node:path";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export interface EventEnvelope {
  tenantId: string;
  appId: string;
  kind: string;
  payload: Record<string, unknown>;
  sourcePath?: string;
  lineOffset?: number;
  emittedAt: string;
  schemaVersion?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export type EventValidator = (envelope: EventEnvelope) => ValidationResult;

interface IndexShape {
  schemaVersion: string;
  envelope: string;
  kinds: Record<string, string>;
}

async function loadJson(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function createEventValidator(schemasDir: string): Promise<EventValidator> {
  const index = (await loadJson(path.join(schemasDir, "index.json"))) as IndexShape;
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);

  const envelopeSchema = await loadJson(path.join(schemasDir, index.envelope));
  const envelopeValidator = ajv.compile(envelopeSchema);

  const kindValidators = new Map<string, ValidateFunction>();
  for (const [kind, filename] of Object.entries(index.kinds)) {
    const schema = await loadJson(path.join(schemasDir, filename));
    kindValidators.set(kind, ajv.compile(schema));
  }

  return (envelope: EventEnvelope): ValidationResult => {
    const errors: string[] = [];

    if (!envelopeValidator(envelope)) {
      for (const err of envelopeValidator.errors ?? []) {
        errors.push(`envelope${err.instancePath}: ${err.message}`);
      }
      return { ok: false, errors };
    }

    const kindValidator = kindValidators.get(envelope.kind);
    if (!kindValidator) {
      errors.push(`Unknown kind: ${envelope.kind}`);
      return { ok: false, errors };
    }

    if (!kindValidator(envelope.payload)) {
      for (const err of kindValidator.errors ?? []) {
        errors.push(`payload${err.instancePath}: ${err.message}`);
      }
      return { ok: false, errors };
    }

    return { ok: true, errors: [] };
  };
}
```

- [ ] **Step 4: Run test to confirm pass**

```pwsh
bun test src/tests/event-validator.test.mts
```

Expected: 3/3 PASS.

- [ ] **Step 5: Commit**

```pwsh
git add src/scripts/lib/event-validator.mts src/tests/event-validator.test.mts
git commit -m "feat(events): runtime event-validator backed by JSON Schema"
```

---

### Task 6: Implement `webhook-sender.mts` — bearer + retry transport

**Files:**
- Create: `src/scripts/lib/webhook-sender.mts`
- Create: `src/tests/webhook-sender.test.mts`

- [ ] **Step 1: Write the failing tests**

`src/tests/webhook-sender.test.mts`:

```typescript
import { describe, expect, test } from "bun:test";
import { createWebhookSender, type WebhookSenderConfig, type FetchFn } from "../scripts/lib/webhook-sender.mjs";

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): FetchFn {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = async (url: string | URL | Request, init?: RequestInit) => {
    const u = typeof url === "string" ? url : url.toString();
    calls.push({ url: u, init });
    return await handler(u, init);
  };
  (fn as unknown as { calls: typeof calls }).calls = calls;
  return fn as unknown as FetchFn;
}

const baseConfig: WebhookSenderConfig = {
  url: "https://runner.local/api/v2/ingest/loop-events",
  tenantId: "t1",
  appId: "a1",
  bearer: "secret-token"
};

const envelope = {
  tenantId: "t1",
  appId: "a1",
  kind: "slice.workflow_state_changed",
  payload: { sliceId: "SLICE-1", ts: "2026-06-15T12:00:00.000Z" },
  emittedAt: "2026-06-15T12:00:00.000Z"
};

describe("webhook-sender", () => {
  test("sends Bearer header + JSON body on success", async () => {
    const fetchFn = mockFetch(() => new Response(null, { status: 202 }));
    const sender = createWebhookSender(baseConfig, { fetchFn });
    const result = await sender.send(envelope);
    expect(result.ok).toBe(true);
    const calls = (fetchFn as unknown as { calls: { url: string; init?: RequestInit }[] }).calls;
    expect(calls[0].init?.headers).toMatchObject({
      Authorization: "Bearer secret-token",
      "Content-Type": "application/json"
    });
    expect(calls[0].init?.method).toBe("POST");
  });

  test("retries once on 5xx then succeeds", async () => {
    let attempts = 0;
    const fetchFn = mockFetch(() => {
      attempts += 1;
      return new Response(null, { status: attempts === 1 ? 503 : 202 });
    });
    const sender = createWebhookSender(baseConfig, { fetchFn, retryDelayMs: 0 });
    const result = await sender.send(envelope);
    expect(result.ok).toBe(true);
    expect(attempts).toBe(2);
  });

  test("does not retry on 401 and disables sender for session", async () => {
    let attempts = 0;
    const fetchFn = mockFetch(() => {
      attempts += 1;
      return new Response(null, { status: 401 });
    });
    const sender = createWebhookSender(baseConfig, { fetchFn });
    const r1 = await sender.send(envelope);
    const r2 = await sender.send(envelope);
    expect(r1.ok).toBe(false);
    expect(r1.disabled).toBe(true);
    expect(r2.ok).toBe(false);
    expect(r2.disabled).toBe(true);
    expect(attempts).toBe(1); // second call short-circuits
  });

  test("backoff on 429 up to 3 attempts then gives up", async () => {
    let attempts = 0;
    const fetchFn = mockFetch(() => {
      attempts += 1;
      return new Response(null, { status: 429 });
    });
    const sender = createWebhookSender(baseConfig, { fetchFn, retryDelayMs: 0 });
    const result = await sender.send(envelope);
    expect(result.ok).toBe(false);
    expect(attempts).toBe(3);
  });

  test("respects disabled flag from config", async () => {
    const fetchFn = mockFetch(() => new Response(null, { status: 202 }));
    const sender = createWebhookSender({ ...baseConfig, disabled: true }, { fetchFn });
    const result = await sender.send(envelope);
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(true);
    const calls = (fetchFn as unknown as { calls: unknown[] }).calls;
    expect(calls.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

```pwsh
bun test src/tests/webhook-sender.test.mts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement webhook-sender**

`src/scripts/lib/webhook-sender.mts`:

```typescript
export interface WebhookSenderConfig {
  url: string;
  tenantId: string;
  appId: string;
  bearer: string;
  disabled?: boolean;
}

export type FetchFn = (url: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface WebhookSenderDeps {
  fetchFn?: FetchFn;
  retryDelayMs?: number;
  now?: () => number;
}

export interface SendResult {
  ok: boolean;
  status?: number;
  disabled?: boolean;
  skipped?: boolean;
  error?: string;
  attempts: number;
}

interface Envelope {
  tenantId: string;
  appId: string;
  kind: string;
  payload: Record<string, unknown>;
  sourcePath?: string;
  lineOffset?: number;
  emittedAt: string;
}

export interface WebhookSender {
  send(envelope: Envelope): Promise<SendResult>;
}

const MAX_ATTEMPTS_5XX = 2; // initial + 1 retry
const MAX_ATTEMPTS_429 = 3;
const BACKOFF_MS_429 = [1000, 2000, 4000];

export function createWebhookSender(
  config: WebhookSenderConfig,
  deps: WebhookSenderDeps = {}
): WebhookSender {
  const fetchFn = deps.fetchFn ?? ((url, init) => globalThis.fetch(url, init));
  const retryDelayMs = deps.retryDelayMs ?? 250;
  let sessionDisabled = false;

  async function sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function attempt(envelope: Envelope): Promise<Response> {
    return await fetchFn(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.bearer}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(envelope)
    });
  }

  async function send(envelope: Envelope): Promise<SendResult> {
    if (sessionDisabled) {
      return { ok: false, disabled: true, attempts: 0, error: "session-disabled" };
    }
    if (config.disabled) {
      return { ok: false, skipped: true, attempts: 0 };
    }

    let attempts = 0;
    let lastStatus: number | undefined;

    while (true) {
      attempts += 1;
      let response: Response;
      try {
        response = await attempt(envelope);
      } catch (err) {
        return { ok: false, attempts, error: (err as Error).message };
      }

      lastStatus = response.status;

      if (response.status >= 200 && response.status < 300) {
        return { ok: true, status: response.status, attempts };
      }
      if (response.status === 401 || response.status === 403) {
        sessionDisabled = true;
        return { ok: false, disabled: true, status: response.status, attempts };
      }
      if (response.status === 429) {
        if (attempts >= MAX_ATTEMPTS_429) {
          return { ok: false, status: response.status, attempts };
        }
        await sleep(retryDelayMs > 0 ? retryDelayMs : BACKOFF_MS_429[attempts - 1] ?? 0);
        continue;
      }
      if (response.status >= 500) {
        if (attempts >= MAX_ATTEMPTS_5XX) {
          return { ok: false, status: response.status, attempts };
        }
        await sleep(retryDelayMs);
        continue;
      }
      // 4xx other than 401/403/429 — no retry
      return { ok: false, status: response.status, attempts };
    }
  }

  return { send };
}
```

- [ ] **Step 4: Run tests to confirm pass**

```pwsh
bun test src/tests/webhook-sender.test.mts
```

Expected: 5/5 PASS.

- [ ] **Step 5: Commit**

```pwsh
git add src/scripts/lib/webhook-sender.mts src/tests/webhook-sender.test.mts
git commit -m "feat(transport): webhook-sender with Bearer auth, retry, and session-disable"
```

---

### Task 7: Extend `loop.json` notification config with webhook fields

**Files:**
- Modify: `src/scripts/lib/loop-config.mts` (if it exists; otherwise modify `event-notifier.mts`)
- Create: `src/tests/loop-config-webhook.test.mts`

- [ ] **Step 1: Identify the config reader**

Run:
```pwsh
bun -e "import('./src/scripts/lib/event-notifier.mjs').then(m => console.log(Object.keys(m)))"
```

Expected: includes `readNotifyConfig`.

- [ ] **Step 2: Write the failing test**

`src/tests/loop-config-webhook.test.mts`:

```typescript
import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readNotifyConfig } from "../scripts/lib/event-notifier.mjs";

async function withTempRepo(loopJson: object): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-webhook-cfg-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify(loopJson));
  return dir;
}

describe("readNotifyConfig — webhook fields", () => {
  test("reads tenantId / appId / bearer / url / disabled when present", async () => {
    const repo = await withTempRepo({
      runner: {
        notifications: {
          enabled: true,
          mode: "webhook",
          webhook: {
            url: "https://runner.local/api/v2/ingest/loop-events",
            tenantId: "tenant-x",
            appId: "app-y",
            bearer: "tok-123",
            disabled: false
          }
        }
      }
    });
    const cfg = await readNotifyConfig(repo);
    expect(cfg.mode).toBe("webhook");
    expect(cfg.webhook).toMatchObject({
      url: "https://runner.local/api/v2/ingest/loop-events",
      tenantId: "tenant-x",
      appId: "app-y",
      bearer: "tok-123",
      disabled: false
    });
  });

  test("falls back to legacy webhookUrl when no webhook block present", async () => {
    const repo = await withTempRepo({
      runner: { notifications: { mode: "webhook", webhookUrl: "https://legacy.local/hook" } }
    });
    const cfg = await readNotifyConfig(repo);
    expect(cfg.webhookUrl).toBe("https://legacy.local/hook");
    expect(cfg.webhook).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to confirm fail**

```pwsh
bun test src/tests/loop-config-webhook.test.mts
```

Expected: FAIL on the first test (`cfg.webhook` undefined).

- [ ] **Step 4: Extend `NotifyConfig` interface and reader**

Edit `src/scripts/lib/event-notifier.mts`. Add new field to `NotifyConfig`:

```typescript
export interface NotifyWebhookConfig {
  url: string;
  tenantId: string;
  appId: string;
  bearer: string;
  disabled?: boolean;
}

export interface NotifyConfig {
  enabled?: boolean;
  mode?: NotificationMode;
  events?: LoopEventType[];
  webhookUrl?: string;    // legacy
  webhook?: NotifyWebhookConfig;
  command?: string;
}
```

No code changes to `readNotifyConfig` are required — it already passes the whole `notifications` object through. The new `webhook` field is preserved automatically.

- [ ] **Step 5: Run test to confirm pass**

```pwsh
bun test src/tests/loop-config-webhook.test.mts
```

Expected: 2/2 PASS.

- [ ] **Step 6: Commit**

```pwsh
git add src/scripts/lib/event-notifier.mts src/tests/loop-config-webhook.test.mts
git commit -m "feat(config): loop.notifications.webhook block (tenantId/appId/bearer/url/disabled)"
```

---

### Task 8: Wire `event-notifier` webhook branch through `webhook-sender`

**Files:**
- Modify: `src/scripts/lib/event-notifier.mts`
- Create: `src/tests/event-notifier-webhook.test.mts`

- [ ] **Step 1: Write the failing integration test**

`src/tests/event-notifier-webhook.test.mts`:

```typescript
import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { notifyEvent, _internals } from "../scripts/lib/event-notifier.mjs";

async function withTempRepo(loopJson: object): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-notify-int-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify(loopJson));
  return dir;
}

describe("notifyEvent — webhook delegation", () => {
  test("posts envelope to configured webhook with Bearer + tenant/app", async () => {
    const repo = await withTempRepo({
      runner: {
        notifications: {
          enabled: true,
          mode: "webhook",
          events: ["slice-complete"],
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
    const originalFetch = _internals.fetch;
    _internals.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url: typeof url === "string" ? url : url.toString(), init });
      return new Response(null, { status: 202 });
    }) as typeof _internals.fetch;

    try {
      await notifyEvent(repo, {
        type: "slice-complete",
        sliceId: "SLICE-1",
        featureId: "FEAT-9",
        timestamp: "2026-06-15T12:00:00.000Z"
      });
    } finally {
      _internals.fetch = originalFetch;
    }

    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe("https://runner.local/ingest");
    expect(calls[0].init?.headers).toMatchObject({
      Authorization: "Bearer B",
      "Content-Type": "application/json"
    });
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.tenantId).toBe("T");
    expect(body.appId).toBe("A");
    expect(body.kind).toBe("slice-complete");
    expect(body.payload).toMatchObject({ sliceId: "SLICE-1", featureId: "FEAT-9" });
  });
});
```

- [ ] **Step 2: Run test to confirm fail**

```pwsh
bun test src/tests/event-notifier-webhook.test.mts
```

Expected: FAIL (no call made, or auth header missing).

- [ ] **Step 3: Update event-notifier webhook branch**

Locate the existing webhook handler in `event-notifier.mts` (it currently uses `webhookUrl`). Replace it with the new `webhook` block path, falling back to legacy `webhookUrl` when absent.

Add helper at top of the file (after existing imports):

```typescript
import { createWebhookSender } from "./webhook-sender.mjs";
```

Find the existing webhook branch (look for `mode === "webhook"`). Replace its body with:

```typescript
async function fireWebhook(cfg: NotifyConfig, event: LoopEvent): Promise<void> {
  if (cfg.webhook?.url) {
    const sender = createWebhookSender(
      {
        url: cfg.webhook.url,
        tenantId: cfg.webhook.tenantId,
        appId: cfg.webhook.appId,
        bearer: cfg.webhook.bearer,
        disabled: cfg.webhook.disabled
      },
      { fetchFn: _internals.fetch as unknown as typeof fetch }
    );
    const envelope = {
      tenantId: cfg.webhook.tenantId,
      appId: cfg.webhook.appId,
      kind: event.type,
      payload: {
        sliceId: event.sliceId,
        featureId: event.featureId,
        details: event.details,
        ts: event.timestamp
      },
      emittedAt: event.timestamp
    };
    await sender.send(envelope);
    return;
  }

  // Legacy path: webhookUrl + no auth, no envelope shape
  if (cfg.webhookUrl) {
    try {
      await _internals.fetch(cfg.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event)
      });
    } catch {
      /* fail-silent */
    }
  }
}
```

Then in the existing `notifyEvent` switch, replace the current webhook branch with `await fireWebhook(cfg, event);` (keep the surrounding try/catch).

- [ ] **Step 4: Run test to confirm pass**

```pwsh
bun test src/tests/event-notifier-webhook.test.mts
```

Expected: PASS.

- [ ] **Step 5: Run full notifier test file to check no regression**

```pwsh
bun test src/tests/event-notifier-*.test.mts
```

Expected: all green.

- [ ] **Step 6: Commit**

```pwsh
git add src/scripts/lib/event-notifier.mts src/tests/event-notifier-webhook.test.mts
git commit -m "feat(notifier): delegate webhook mode to webhook-sender (Bearer + envelope)"
```

---

### Task 9: Final full-suite green check

**Files:** none

- [ ] **Step 1: Run all tests**

```pwsh
bun test src/tests/ --parallel --timeout 60000
```

Expected: all suites PASS, no failures.

- [ ] **Step 2: Run lint + format**

```pwsh
bun run lint
bun run format:check
```

Expected: clean.

- [ ] **Step 3: Run typecheck**

```pwsh
bunx tsc --project tsconfig.json --noEmit
bunx tsc --project tsconfig.test.json --noEmit
```

Expected: no diagnostics.

- [ ] **Step 4: Run schema validator end-to-end**

```pwsh
bun ./src/scripts/validate-event-schemas.mts
```

Expected: `Event schemas OK`.

- [ ] **Step 5: Commit any formatter / lint fixes if needed; otherwise no-op**

If formatter touched anything, commit:

```pwsh
git add -p
git commit -m "style: prettier fixups for m0-loop-foundations"
```

---

## Self-Review Notes

- Spec coverage: L0-1 → Tasks 6 + 8. L0-2 → Tasks 1 + 7. L0-3 → Tasks 2 + 3 + 4 + 5.
- No placeholders remain — every step contains either complete code, exact commands, or expected output text.
- Type consistency: `EventEnvelope` shape used in webhook-sender, event-validator, and event-notifier delegation all carry the same field names (`tenantId, appId, kind, payload, sourcePath?, lineOffset?, emittedAt`).
- Test file naming follows repo convention (behavior-descriptive, no version prefixes).
- All commits use conventional-commit style matching recent loop history.

## Out of scope (next milestone)

- Wiring slice-events.jsonl / wave-events.jsonl through webhook-sender — M1 + M2.
- Emitting any new event kind (specialist_pause, shape_classified, etc.) — M1–M5.
- Webhook payload signing with HMAC — Bearer alone is the chosen auth (per spec).
- Persistent queue / retry-on-disk — covered by filesystem-resync on runner side, no loop changes.
