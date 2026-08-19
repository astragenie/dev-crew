// Unit tests for src/scripts/lib/agent-receipt.mts (FEAT-008 / SLICE-43).

import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  LANE_TABLE_REL,
  RECEIPT_SCHEMA_VERSION,
  readLaneTable,
  upsertLaneEntry,
  validateAgentReceipt,
  writeLaneTable
} from "../scripts/lib/agent-receipt.mjs";

async function makeTempRepo(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "agent-receipt-"));
}

const VALID_RECEIPT = {
  status: "DONE",
  items: ["did the thing"],
  commit_shas: ["abc1234"],
  evidence_path: ".claude/artifacts/crew/validations/x.md",
  deviations: [],
  schema_version: 1
};

describe("validateAgentReceipt — valid shapes", () => {
  test("full valid receipt passes", () => {
    const result = validateAgentReceipt(VALID_RECEIPT);
    expect(result.ok).toBe(true);
    expect(result.receipt).toEqual(VALID_RECEIPT as never);
    expect(result.errors).toEqual([]);
  });

  test("empty items/commit_shas/deviations arrays are valid (the normal HELP-before-work case)", () => {
    const result = validateAgentReceipt({
      status: "HELP",
      items: [],
      commit_shas: [],
      evidence_path: null,
      deviations: [],
      schema_version: RECEIPT_SCHEMA_VERSION
    });
    expect(result.ok).toBe(true);
  });

  test("every documented status value validates", () => {
    for (const status of ["DONE", "BLOCKED", "HELP", "IN-PROGRESS"]) {
      const result = validateAgentReceipt({ ...VALID_RECEIPT, status });
      expect(result.ok).toBe(true);
    }
  });
});

describe("validateAgentReceipt — invalid shapes", () => {
  test("non-object value is rejected", () => {
    expect(validateAgentReceipt("not an object").ok).toBe(false);
    expect(validateAgentReceipt(null).ok).toBe(false);
    expect(validateAgentReceipt([1, 2, 3]).ok).toBe(false);
  });

  test("unrecognized status value is rejected", () => {
    const result = validateAgentReceipt({ ...VALID_RECEIPT, status: "MAYBE" });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("status"))).toBe(true);
  });

  test("non-array items is rejected", () => {
    const result = validateAgentReceipt({ ...VALID_RECEIPT, items: "did the thing" });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("items"))).toBe(true);
  });

  test("items array containing a non-string is rejected", () => {
    const result = validateAgentReceipt({ ...VALID_RECEIPT, items: ["ok", 5] });
    expect(result.ok).toBe(false);
  });

  test("evidence_path must be string or null, not e.g. undefined-shaped number", () => {
    const result = validateAgentReceipt({ ...VALID_RECEIPT, evidence_path: 42 });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("evidence_path"))).toBe(true);
  });

  test("wrong schema_version is rejected", () => {
    const result = validateAgentReceipt({ ...VALID_RECEIPT, schema_version: 2 });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("schema_version"))).toBe(true);
  });

  test("missing field is rejected with a field-naming error", () => {
    const missingDeviations = {
      status: VALID_RECEIPT.status,
      items: VALID_RECEIPT.items,
      commit_shas: VALID_RECEIPT.commit_shas,
      evidence_path: VALID_RECEIPT.evidence_path,
      schema_version: VALID_RECEIPT.schema_version
    };
    const result = validateAgentReceipt(missingDeviations);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("deviations"))).toBe(true);
  });

  test("multiple violations are all reported, not just the first", () => {
    const result = validateAgentReceipt({ status: "NOPE", items: "x" });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe("lane table — read/write round trip", () => {
  test("readLaneTable on a repo with no table yet returns an empty object", async () => {
    const repo = await makeTempRepo();
    expect(await readLaneTable(repo)).toEqual({});
  });

  test("writeLaneTable then readLaneTable round-trips exactly", async () => {
    const repo = await makeTempRepo();
    const table = {
      "agent-1": {
        receiptSeen: true,
        transcriptPath: "/tmp/a.jsonl",
        ts: "2026-08-19T00:00:00.000Z"
      }
    };
    await writeLaneTable(repo, table);
    expect(await readLaneTable(repo)).toEqual(table);
  });

  test("upsertLaneEntry adds a new agent without clobbering an existing one", async () => {
    const repo = await makeTempRepo();
    await upsertLaneEntry(repo, "agent-1", {
      receiptSeen: true,
      transcriptPath: "/tmp/a.jsonl",
      ts: "2026-08-19T00:00:00.000Z"
    });
    await upsertLaneEntry(repo, "agent-2", {
      receiptSeen: true,
      transcriptPath: "/tmp/b.jsonl",
      ts: "2026-08-19T00:01:00.000Z"
    });
    const table = await readLaneTable(repo);
    expect(Object.keys(table).sort()).toEqual(["agent-1", "agent-2"]);
    expect(table["agent-1"]?.transcriptPath).toBe("/tmp/a.jsonl");
    expect(table["agent-2"]?.transcriptPath).toBe("/tmp/b.jsonl");
  });

  test("upsertLaneEntry on the same agent_id overwrites the prior entry", async () => {
    const repo = await makeTempRepo();
    await upsertLaneEntry(repo, "agent-1", {
      receiptSeen: true,
      transcriptPath: "/tmp/first.jsonl",
      ts: "2026-08-19T00:00:00.000Z"
    });
    await upsertLaneEntry(repo, "agent-1", {
      receiptSeen: true,
      transcriptPath: "/tmp/second.jsonl",
      ts: "2026-08-19T00:05:00.000Z"
    });
    const table = await readLaneTable(repo);
    expect(Object.keys(table)).toEqual(["agent-1"]);
    expect(table["agent-1"]?.transcriptPath).toBe("/tmp/second.jsonl");
  });

  test("malformed on-disk table (e.g. a JSON array) fails open to an empty table", async () => {
    const repo = await makeTempRepo();
    const filePath = path.join(repo, LANE_TABLE_REL);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "[1,2,3]");
    expect(await readLaneTable(repo)).toEqual({});
  });

  test("table is persisted under the documented .claude/state/loop path", async () => {
    const repo = await makeTempRepo();
    await upsertLaneEntry(repo, "agent-1", {
      receiptSeen: true,
      transcriptPath: "/tmp/a.jsonl",
      ts: "2026-08-19T00:00:00.000Z"
    });
    const raw = await fs.readFile(path.join(repo, LANE_TABLE_REL), "utf8");
    expect(JSON.parse(raw)).toHaveProperty("agent-1");
  });
});
