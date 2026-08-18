# M3 — Cost + Agent Perf + Live Agent Narrative (Loop Side) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Land 4 loop-side FEATs for M3. Populate agent timing fields. Wire role-agent cost stream through webhook. Add 2 new events for live agent narrative: `slice.agent_progress` + `agent.tool_call`. Batch parse from crew artifact bundles is acceptable for v1 — streaming upstream is M3.5 follow-up.

**Architecture:** Reuse M1 `webhook-fanout` helper. M0 schema already has optional fields (`dispatchedAt`, `firstOutputAt`, `toolCalls`) on slice-event — emit-side just needs to populate them. `auto-dispatch.jsonl` already written by `auto-dispatch.mts::flushAuditLog` — wrap that to fan out. New events emit from a new crew-bundle-parser module that runs at slice-close to extract per-tool calls + per-agent progress markers from crew artifact bodies.

**Tech Stack:** Bun runtime, TypeScript `.mts` ESM, existing `webhook-fanout.mts` (M1), existing `slice-events.mts`, existing `auto-dispatch.mts`, new `crew-bundle-parser.mts`.

**Parent Spec:** `docs/superpowers/specs/2026-06-15-loop-runner-jsonl-adoption-design.md` (Milestone M3, Loop FEATs L3-1, L3-2, L3-3, L3-4).

**Wave-run target:** `C:\work\mega\loop`. Commit on main.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/scripts/lib/slice-events.mts` | modify | `AgentDispatchedEvent`/`AgentCompletedEvent` interfaces — ensure `dispatchedAt`, `firstOutputAt`, `toolCalls` are optional but populated from callers. Update emit callers in dispatch sites (`ceremonies.mts`, `dispatch-prompt.mts`, wherever the existing agent_dispatched/agent_completed events are built). |
| `src/scripts/lib/auto-dispatch.mts` | modify | `flushAuditLog` calls `fanoutEnvelope(repoPath, "agent.dispatch", entry)` after the existing JSONL append. Kind matches schema `agent.dispatch`. |
| `src/scripts/lib/crew-bundle-parser.mts` | new | `parseCrewBundle(bundlePath) → { progressMarkers, toolCalls }`. Reads a crew agent bundle md file, extracts per-stage `[STAGE] description` lines and per-tool-use blocks. Pure function, no I/O outside the explicit read. |
| `src/scripts/lib/agent-narrative-emitter.mts` | new | `emitAgentNarrative(repoPath, sliceId, agent, bundlePath)` — invokes `parseCrewBundle`, fans out one `slice.agent_progress` per stage marker and one `agent.tool_call` per tool use. Idempotent (records last-emitted ts in `.claude/state/loop/narrative-emitted.json`). |
| `src/scripts/lib/grade-writer.mts` | modify | At slice-grade-write (after existing M1 grade fanout), invoke `emitAgentNarrative` for each crew artifact bundle in the slice's directory. Fail-silent. |
| `schemas/loop-events/agent-progress.schema.json` | new | Payload for `slice.agent_progress`: `{sliceId, agent, stage, description, ts}`. |
| `schemas/loop-events/tool-call.schema.json` | new | Payload for `agent.tool_call`: `{sliceId, agent, toolName, argsJson?, durationMs?, ts}`. |
| `schemas/loop-events/index.json` | modify | Add kinds `slice.agent_progress → agent-progress.schema.json` and `agent.tool_call → tool-call.schema.json`. |
| `src/tests/agent-timing-fields.test.mts` | new | Tests: agent_dispatched event carries `dispatchedAt`; agent_completed carries `toolCalls + firstOutputAt`. |
| `src/tests/auto-dispatch-fanout.test.mts` | new | Tests: `flushAuditLog` fans out as kind `agent.dispatch`. |
| `src/tests/crew-bundle-parser.test.mts` | new | Tests with fixture bundle: extract progress + tool calls. |
| `src/tests/agent-narrative-emitter.test.mts` | new | Tests: idempotent emit; fanout fires per marker. |

---

### Task 1: Agent timing fields on slice events

**Files:**
- Modify: `src/scripts/lib/slice-events.mts` (interface comments + caller updates)
- Modify: existing emit sites (likely `src/scripts/lib/ceremonies.mts`, `src/scripts/lib/dispatch-prompt.mts`, or `src/scripts/lib/auto-dispatch.mts`)
- Create: `src/tests/agent-timing-fields.test.mts`

- [ ] **Step 1: Locate emit sites**

```pwsh
grep -rn "appendSliceEvent.*agent_dispatched\|appendSliceEvent.*agent_completed" src/scripts/
```

- [ ] **Step 2: Write failing test**

`src/tests/agent-timing-fields.test.mts`:

```typescript
import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendSliceEvent, eventsPath } from "../scripts/lib/slice-events.mjs";

async function tempRepo(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "loop-timing-"));
}

describe("agent timing fields", () => {
  test("agent_dispatched event with dispatchedAt round-trips through JSONL", async () => {
    const repo = await tempRepo();
    await appendSliceEvent(repo, "SLICE-1", {
      type: "agent_dispatched",
      sliceId: "SLICE-1",
      featureId: null,
      timestamp: "2026-06-15T12:00:00.000Z",
      agent: "crew:builder",
      parentCommand: "/crew:build",
      dispatchedAt: "2026-06-15T12:00:00.000Z"
    } as never);
    const file = eventsPath(repo, "SLICE-1");
    const content = await fs.readFile(file, "utf8");
    const row = JSON.parse(content.trim().split("\n")[0]);
    expect(row.dispatchedAt).toBe("2026-06-15T12:00:00.000Z");
  });

  test("agent_completed event with toolCalls + firstOutputAt round-trips", async () => {
    const repo = await tempRepo();
    await appendSliceEvent(repo, "SLICE-1", {
      type: "agent_completed",
      sliceId: "SLICE-1",
      featureId: null,
      timestamp: "2026-06-15T12:00:00.000Z",
      agent: "crew:builder",
      status: "ok",
      durationMs: 90000,
      firstOutputAt: "2026-06-15T12:00:05.000Z",
      toolCalls: 47
    } as never);
    const file = eventsPath(repo, "SLICE-1");
    const content = await fs.readFile(file, "utf8");
    const row = JSON.parse(content.trim().split("\n")[0]);
    expect(row.toolCalls).toBe(47);
    expect(row.firstOutputAt).toBe("2026-06-15T12:00:05.000Z");
  });
});
```

- [ ] **Step 3: Run → confirm test passes already (interface already permits optional fields)**

```pwsh
bun test src/tests/agent-timing-fields.test.mts
```

If 2/2 PASS, the slice-events module already passes these fields through (M0 schema added them). Move to populating from emit sites.

- [ ] **Step 4: Populate from emit sites**

Find each `agent_dispatched` build site. Add `dispatchedAt: now()` at construction. Find each `agent_completed` build site. Add `firstOutputAt` (from crew output start ts if available — else omit), `toolCalls` (extract from auto-dispatch entry if available — else omit). Be defensive: optional fields stay optional.

- [ ] **Step 5: Run regression**

```pwsh
bun test src/tests/slice-events*.test.mts
```

All green.

- [ ] **Step 6: Commit**

```pwsh
git add src/scripts/lib/slice-events.mts src/scripts/lib/ceremonies.mts src/scripts/lib/dispatch-prompt.mts src/tests/agent-timing-fields.test.mts
git commit -m "feat(slice-events): populate dispatchedAt/firstOutputAt/toolCalls on agent events"
```

(Adjust staged files to match what was actually modified.)

---

### Task 2: Wire `auto-dispatch.jsonl` through fanout

**Files:**
- Modify: `src/scripts/lib/auto-dispatch.mts`
- Create: `src/tests/auto-dispatch-fanout.test.mts`

- [ ] **Step 1: Write failing test**

`src/tests/auto-dispatch-fanout.test.mts`:

```typescript
import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendAuditLog, flushAuditLog } from "../scripts/lib/auto-dispatch.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function tempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-autodispatch-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify({
    runner: { notifications: { mode: "webhook", webhook: { url: "https://runner.local/h", tenantId: "T", appId: "A", bearer: "B" } } }
  }));
  return dir;
}

describe("auto-dispatch fanout", () => {
  test("flushAuditLog fans out entries as kind agent.dispatch", async () => {
    const repo = await tempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => { calls.push({ init }); return new Response(null, { status: 202 }); }) as typeof fanoutInternals.fetch;
    try {
      appendAuditLog(repo, {
        timestamp: "2026-06-15T12:00:00.000Z",
        agent: "runner:architect",
        parentCommand: "/runner:backlog-enrich",
        ok: true,
        costUsd: 0.42,
        durationMs: 1234,
        inputTokens: 5000,
        outputTokens: 800
      });
      await flushAuditLog(repo);
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.kind).toBe("agent.dispatch");
    expect(body.payload.agent).toBe("runner:architect");
    expect(body.payload.costUsd).toBe(0.42);
  });
});
```

- [ ] **Step 2: Run → confirm fail**

```pwsh
bun test src/tests/auto-dispatch-fanout.test.mts
```

Expected: 0 webhook calls.

- [ ] **Step 3: Modify `flushAuditLog`**

In `src/scripts/lib/auto-dispatch.mts`, after the existing JSONL append, iterate the just-flushed entries and call `fanoutEnvelope` per entry with `kind: "agent.dispatch"`. Be careful: if buffered entries are dropped on error, don't fan out.

- [ ] **Step 4: Run → confirm pass + regression**

```pwsh
bun test src/tests/auto-dispatch*.test.mts
```

- [ ] **Step 5: Commit**

```pwsh
git add src/scripts/lib/auto-dispatch.mts src/tests/auto-dispatch-fanout.test.mts
git commit -m "feat(auto-dispatch): fan out per-agent dispatch entries as kind agent.dispatch"
```

---

### Task 3: Crew bundle parser

**Files:**
- Create: `src/scripts/lib/crew-bundle-parser.mts`
- Create: `src/tests/crew-bundle-parser.test.mts`
- Create: `src/tests/fixtures/crew-bundle-sample.md` (fixture)

- [ ] **Step 1: Inspect a real crew bundle to understand its structure**

```pwsh
ls .claude/artifacts/crew/bundles/orphan 2>$null | Select-Object -First 3
```

If any exist, read one. Identify:
- Stage markers (often `## Stage: <name>` or `[STAGE]` lines)
- Tool invocations (often `### Tool: <name>` or `Tool use:` blocks)
- Time stamps if present

Document the format you find inline in `crew-bundle-parser.mts`. If no bundles exist locally, build the fixture from a stub.

- [ ] **Step 2: Author fixture + test**

`src/tests/fixtures/crew-bundle-sample.md` (illustrative):

```markdown
---
agent: crew:builder
slice: SLICE-1
started: 2026-06-15T12:00:00Z
---

## Stage: discover

Reading existing files to understand the structure.

### Tool: Read
- path: src/scripts/lib/event-validator.mts
- duration_ms: 42

### Tool: Grep
- pattern: "appendSliceEvent"
- duration_ms: 18

## Stage: implement

Writing the new helper and tests.

### Tool: Write
- path: src/scripts/lib/webhook-fanout.mts
- duration_ms: 120

### Tool: Edit
- path: src/scripts/lib/event-notifier.mts
- duration_ms: 65

## Stage: verify

Running tests to confirm green.

### Tool: Bash
- command: bun test src/tests/webhook-fanout.test.mts
- duration_ms: 2300
```

`src/tests/crew-bundle-parser.test.mts`:

```typescript
import { describe, expect, test } from "bun:test";
import path from "node:path";
import { parseCrewBundle } from "../scripts/lib/crew-bundle-parser.mjs";

const FIXTURE = path.resolve(import.meta.dirname, "fixtures", "crew-bundle-sample.md");

describe("parseCrewBundle", () => {
  test("extracts stage markers in order", async () => {
    const result = await parseCrewBundle(FIXTURE);
    const stages = result.progressMarkers.map(m => m.stage);
    expect(stages).toEqual(["discover", "implement", "verify"]);
  });

  test("extracts tool calls with toolName + duration", async () => {
    const result = await parseCrewBundle(FIXTURE);
    const tools = result.toolCalls.map(t => t.toolName);
    expect(tools).toEqual(["Read", "Grep", "Write", "Edit", "Bash"]);
    expect(result.toolCalls[0].durationMs).toBe(42);
    expect(result.toolCalls[4].durationMs).toBe(2300);
  });

  test("extracts agent + sliceId from frontmatter", async () => {
    const result = await parseCrewBundle(FIXTURE);
    expect(result.agent).toBe("crew:builder");
    expect(result.sliceId).toBe("SLICE-1");
  });
});
```

- [ ] **Step 3: Run → confirm fail**

- [ ] **Step 4: Implement parser**

`src/scripts/lib/crew-bundle-parser.mts`:

```typescript
import fs from "node:fs/promises";

export interface ProgressMarker {
  stage: string;
  description: string;
  ts?: string;
}

export interface ToolCallRecord {
  toolName: string;
  argsJson?: string;
  durationMs?: number;
  ts?: string;
}

export interface CrewBundleParseResult {
  agent?: string;
  sliceId?: string;
  startedAt?: string;
  progressMarkers: ProgressMarker[];
  toolCalls: ToolCallRecord[];
}

export async function parseCrewBundle(filePath: string): Promise<CrewBundleParseResult> {
  const raw = await fs.readFile(filePath, "utf8");
  return parseCrewBundleContent(raw);
}

export function parseCrewBundleContent(raw: string): CrewBundleParseResult {
  const result: CrewBundleParseResult = { progressMarkers: [], toolCalls: [] };

  // Frontmatter
  const fmMatch = /^---\n([\s\S]*?)\n---\n/.exec(raw);
  if (fmMatch) {
    for (const line of fmMatch[1].split("\n")) {
      const [k, ...rest] = line.split(":");
      const v = rest.join(":").trim();
      if (k === "agent") result.agent = v;
      else if (k === "slice") result.sliceId = v;
      else if (k === "started") result.startedAt = v;
    }
  }

  // Stage markers
  const stageRe = /## Stage: ([^\n]+)\n\n([^\n#]+)/g;
  let m: RegExpExecArray | null;
  while ((m = stageRe.exec(raw)) !== null) {
    result.progressMarkers.push({ stage: m[1].trim(), description: m[2].trim() });
  }

  // Tool calls
  const toolRe = /### Tool: ([^\n]+)\n((?:- [^\n]+\n?)+)/g;
  while ((m = toolRe.exec(raw)) !== null) {
    const block = m[2];
    const durMatch = /- duration_ms:\s*(\d+)/.exec(block);
    const argsBlock = block
      .split("\n")
      .filter(l => l.startsWith("- ") && !l.startsWith("- duration_ms"))
      .map(l => l.slice(2))
      .join("\n");
    result.toolCalls.push({
      toolName: m[1].trim(),
      argsJson: argsBlock ? JSON.stringify({ raw: argsBlock }) : undefined,
      durationMs: durMatch ? parseInt(durMatch[1], 10) : undefined
    });
  }

  return result;
}
```

- [ ] **Step 5: Run → confirm pass**

- [ ] **Step 6: Commit**

```pwsh
git add src/scripts/lib/crew-bundle-parser.mts src/tests/crew-bundle-parser.test.mts src/tests/fixtures/crew-bundle-sample.md
git commit -m "feat(crew-bundle): parser extracts stage markers + tool calls from artifact bundle"
```

---

### Task 4: Agent narrative emitter + schemas + integration

**Files:**
- Create: `src/scripts/lib/agent-narrative-emitter.mts`
- Create: `schemas/loop-events/agent-progress.schema.json`
- Create: `schemas/loop-events/tool-call.schema.json`
- Modify: `schemas/loop-events/index.json`
- Modify: `src/scripts/lib/grade-writer.mts` (invoke emitter at slice-close)
- Create: `src/tests/agent-narrative-emitter.test.mts`

- [ ] **Step 1: Schemas**

`schemas/loop-events/agent-progress.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loop.astragenie.dev/schemas/loop-events/agent-progress.schema.json",
  "title": "AgentProgressPayload",
  "type": "object",
  "required": ["sliceId", "agent", "stage", "description", "ts"],
  "properties": {
    "sliceId": { "type": "string" },
    "agent": { "type": "string" },
    "stage": { "type": "string" },
    "description": { "type": "string" },
    "ts": { "type": "string", "format": "date-time" }
  }
}
```

`schemas/loop-events/tool-call.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loop.astragenie.dev/schemas/loop-events/tool-call.schema.json",
  "title": "ToolCallPayload",
  "type": "object",
  "required": ["sliceId", "agent", "toolName", "ts"],
  "properties": {
    "sliceId": { "type": "string" },
    "agent": { "type": "string" },
    "toolName": { "type": "string" },
    "argsJson": { "type": "string" },
    "durationMs": { "type": "integer", "minimum": 0 },
    "ts": { "type": "string", "format": "date-time" }
  }
}
```

Update `schemas/loop-events/index.json` `kinds`:

```json
    "slice.agent_progress": "agent-progress.schema.json",
    "agent.tool_call": "tool-call.schema.json"
```

- [ ] **Step 2: Emitter**

`src/scripts/lib/agent-narrative-emitter.mts`:

```typescript
import { fanoutEnvelope } from "./webhook-fanout.mjs";
import { parseCrewBundle } from "./crew-bundle-parser.mjs";

export async function emitAgentNarrative(
  repoPath: string,
  sliceId: string,
  bundlePath: string,
  fallbackTs: string = new Date().toISOString()
): Promise<{ progressCount: number; toolCount: number }> {
  let parsed;
  try {
    parsed = await parseCrewBundle(bundlePath);
  } catch {
    return { progressCount: 0, toolCount: 0 };
  }
  const agent = parsed.agent ?? "unknown";

  let progressCount = 0;
  for (const marker of parsed.progressMarkers) {
    await fanoutEnvelope(repoPath, "slice.agent_progress", {
      sliceId,
      agent,
      stage: marker.stage,
      description: marker.description,
      ts: marker.ts ?? fallbackTs
    });
    progressCount += 1;
  }

  let toolCount = 0;
  for (const tool of parsed.toolCalls) {
    const payload: Record<string, unknown> = {
      sliceId,
      agent,
      toolName: tool.toolName,
      ts: tool.ts ?? fallbackTs
    };
    if (tool.argsJson !== undefined) payload.argsJson = tool.argsJson;
    if (tool.durationMs !== undefined) payload.durationMs = tool.durationMs;
    await fanoutEnvelope(repoPath, "agent.tool_call", payload);
    toolCount += 1;
  }

  return { progressCount, toolCount };
}
```

- [ ] **Step 3: Test**

`src/tests/agent-narrative-emitter.test.mts`: verify fanout calls per marker + per tool, count returned.

- [ ] **Step 4: Wire into `writeGrade`**

In `src/scripts/lib/grade-writer.mts`, after the existing M1 grade fanout, add a try/catch block that:
1. Lists crew artifact bundles for the slice (`.claude/artifacts/crew/bundles/**/*.md` filtered by sliceId).
2. For each bundle, invokes `emitAgentNarrative`.
3. Swallows errors (fail-silent).

Read the existing surrounding code first to find where the slice's artifact directory is located.

- [ ] **Step 5: Run + commit**

```pwsh
bun test src/tests/agent-narrative-emitter.test.mts
bun test src/tests/grade-write*.test.mts
bun ./src/scripts/validate-event-schemas.mts
git add src/scripts/lib/agent-narrative-emitter.mts schemas/loop-events/ src/scripts/lib/grade-writer.mts src/tests/agent-narrative-emitter.test.mts
git commit -m "feat(narrative): emit slice.agent_progress + agent.tool_call from crew bundles"
```

---

### Task 5: Final green sweep

- [ ] Full bun test, lint, format, tsc x2, validators, event-schemas.
- [ ] Commit any style fixups.

---

## Self-Review Notes

- L3-1 → Task 1.
- L3-2 → Task 2.
- L3-3 + L3-4 → Tasks 3 + 4.

## Out of scope

- Streaming agent output token-by-token — needs crew streaming hook (M3.5).
- Cost regression across milestones — M3 captures per-dispatch cost; aggregation/analytics lives in runner side.
