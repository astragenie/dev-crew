// AgentReceipt schema + lane-table persistence (FEAT-008 / SLICE-43).
//
// Canonical shape a dispatched agent's structured report carries, appended
// to the mandatory SendMessage STATUS line so a SubagentStop hook
// (hooks/report-gate.mjs) can mechanically detect delivery instead of
// trusting free text. Design history + the 2026-08-19 amendment that
// demoted TeammateIdle and promoted this lane table from hedge to the
// actual correlation mechanism: docs/planning/feat-008-receipt-schema-contract.md.
//
// hooks/report-gate.mjs runs via plain `node`, no build step, and (per its
// own file header, same constraint already documented there for loop.json
// parsing) cannot import this bun-oriented module — it reimplements a
// dependency-free parity check instead. This module is the source of truth
// for tests and any future bun-side consumer; keep the two shapes in
// lockstep by hand if the schema changes.

import fs from "node:fs/promises";
import path from "node:path";

export const RECEIPT_SCHEMA_VERSION = 1 as const;

export const RECEIPT_STATUSES = ["DONE", "BLOCKED", "HELP", "IN-PROGRESS"] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export interface AgentReceipt {
  status: ReceiptStatus;
  items: string[];
  commit_shas: string[];
  evidence_path: string | null;
  deviations: string[];
  schema_version: typeof RECEIPT_SCHEMA_VERSION;
}

export interface ReceiptValidationResult {
  ok: boolean;
  receipt: AgentReceipt | null;
  errors: string[];
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isReceiptStatus(v: unknown): v is ReceiptStatus {
  return typeof v === "string" && (RECEIPT_STATUSES as readonly string[]).includes(v);
}

/**
 * Structural validation only — does not enforce the target <=15-line
 * serialized budget (AC-2 of FEAT-008); that's a template-authoring
 * convention, not a wire contract this function can see.
 */
export function validateAgentReceipt(value: unknown): ReceiptValidationResult {
  const errors: string[] = [];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, receipt: null, errors: ["receipt must be a JSON object"] };
  }
  const v = value as Record<string, unknown>;

  if (!isReceiptStatus(v.status)) {
    errors.push(`status must be one of ${RECEIPT_STATUSES.join("|")}`);
  }
  if (!isStringArray(v.items)) errors.push("items must be a string array");
  if (!isStringArray(v.commit_shas)) errors.push("commit_shas must be a string array");
  const evidencePath = v.evidence_path;
  if (!(evidencePath === null || typeof evidencePath === "string")) {
    errors.push("evidence_path must be a string or null");
  }
  if (!isStringArray(v.deviations)) errors.push("deviations must be a string array");
  if (v.schema_version !== RECEIPT_SCHEMA_VERSION) {
    errors.push(`schema_version must be ${RECEIPT_SCHEMA_VERSION}`);
  }

  if (errors.length > 0) return { ok: false, receipt: null, errors };
  return { ok: true, receipt: v as unknown as AgentReceipt, errors: [] };
}

// --- Lane table ----------------------------------------------------------
//
// Correlation mechanism promoted from hedge to mechanism by the 2026-08-19
// contract amendment: the SubagentStop hook writes agent_id -> {receiptSeen,
// transcriptPath, ts} the moment it detects a valid receipt in a dispatched
// agent's transcript, so a future idle-suppression consumer can look up
// agent_id here instead of depending on the unverified TeammateIdle payload.
// Fail-open read, same convention as src/scripts/lib/halt-badge-state.mts;
// callers decide how to handle a write failure (the hook wraps this in its
// own guarded-fire try/catch — see recordReceiptSighting there).

export interface LaneTableEntry {
  receiptSeen: boolean;
  transcriptPath: string;
  ts: string;
}

export type LaneTable = Record<string, LaneTableEntry>;

export const LANE_TABLE_REL = path.join(".claude", "state", "loop", "receipt-lane-table.json");

export async function readLaneTable(repoPath: string): Promise<LaneTable> {
  try {
    const raw = await fs.readFile(path.join(repoPath, LANE_TABLE_REL), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as LaneTable;
    }
  } catch {
    // fail-open: absent or malformed file -> empty table
  }
  return {};
}

export async function writeLaneTable(repoPath: string, table: LaneTable): Promise<void> {
  const filePath = path.join(repoPath, LANE_TABLE_REL);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(table, null, 2)}\n`, "utf8");
}

/**
 * Merge one agent's lane entry into the persisted table (read-modify-write,
 * last writer wins — SubagentStop events for distinct agent_ids don't race
 * on the same key). Does not swallow errors itself so tests can assert on
 * failure paths directly; the hook's own call site is responsible for
 * fail-soft behavior.
 */
export async function upsertLaneEntry(
  repoPath: string,
  agentId: string,
  entry: LaneTableEntry
): Promise<LaneTable> {
  const table = await readLaneTable(repoPath);
  table[agentId] = entry;
  await writeLaneTable(repoPath, table);
  return table;
}
