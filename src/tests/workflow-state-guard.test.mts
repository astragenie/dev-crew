// Tests for DEC-060 / FEAT-209: workflow-state-guard.
// Covers: missing file (scaffold), corrupt JSON (named error, not raw
// JSON.parse throw), absent schemaVersion (implicit v1, no throw), and
// schemaVersion greater than supported (named mismatch error).

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  LOOP_SUPPORTED_WORKFLOW_STATE_SCHEMA_VERSION,
  WorkflowStateSchemaMismatchError,
  WorkflowStateCorruptError,
  readWorkflowStateForWrite
} from "../scripts/lib/workflow-state-guard.mjs";

async function tmpStatePath(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  return path.join(dir, "workflow-state.json");
}

test("readWorkflowStateForWrite: missing file returns minimal scaffold, existed: false", async () => {
  const statePath = await tmpStatePath("wsg-missing-");
  const result = await readWorkflowStateForWrite(statePath);
  assert.deepEqual(result.state, { version: "1.0", currentRun: {} });
  assert.equal(result.existed, false);
});

test("readWorkflowStateForWrite: absent schemaVersion is treated as implicit v1, proceeds without throw", async () => {
  const statePath = await tmpStatePath("wsg-implicit-v1-");
  await fs.writeFile(
    statePath,
    JSON.stringify({ version: "1.0", currentRun: { sessionId: "abc" } }, null, 2)
  );
  const result = await readWorkflowStateForWrite(statePath);
  assert.equal(result.existed, true);
  assert.equal(result.state.currentRun.sessionId, "abc");
  assert.equal("schemaVersion" in result.state, false, "schemaVersion stays absent, not injected");
});

test("readWorkflowStateForWrite: schemaVersion at supported version proceeds without throw", async () => {
  const statePath = await tmpStatePath("wsg-supported-");
  await fs.writeFile(
    statePath,
    JSON.stringify(
      {
        version: "1.0",
        schemaVersion: LOOP_SUPPORTED_WORKFLOW_STATE_SCHEMA_VERSION,
        currentRun: {}
      },
      null,
      2
    )
  );
  const result = await readWorkflowStateForWrite(statePath);
  assert.equal(result.existed, true);
  assert.equal(result.state.schemaVersion, LOOP_SUPPORTED_WORKFLOW_STATE_SCHEMA_VERSION);
});

test("readWorkflowStateForWrite: schemaVersion greater than supported throws WorkflowStateSchemaMismatchError", async () => {
  const statePath = await tmpStatePath("wsg-mismatch-");
  await fs.writeFile(
    statePath,
    JSON.stringify(
      {
        version: "1.0",
        schemaVersion: LOOP_SUPPORTED_WORKFLOW_STATE_SCHEMA_VERSION + 1,
        currentRun: {}
      },
      null,
      2
    )
  );
  await assert.rejects(
    () => readWorkflowStateForWrite(statePath),
    (err: unknown) => {
      assert.ok(err instanceof WorkflowStateSchemaMismatchError);
      assert.equal((err as Error).name, "WorkflowStateSchemaMismatchError");
      assert.match((err as Error).message, /schemaVersion/);
      assert.match((err as Error).message, new RegExp(statePath.replace(/\\/g, "\\\\")));
      return true;
    }
  );
});

test("readWorkflowStateForWrite: corrupt JSON throws WorkflowStateCorruptError, not a raw JSON.parse throw", async () => {
  const statePath = await tmpStatePath("wsg-corrupt-");
  await fs.writeFile(statePath, "{ this is not valid json ][");
  await assert.rejects(
    () => readWorkflowStateForWrite(statePath),
    (err: unknown) => {
      assert.ok(err instanceof WorkflowStateCorruptError);
      assert.equal((err as Error).name, "WorkflowStateCorruptError");
      assert.ok(!(err instanceof SyntaxError), "must not be the raw JSON.parse SyntaxError");
      assert.match((err as Error).message, /repair|restore/i);
      return true;
    }
  );
});
