// Memory sink (FEAT-217; transport migrated FEAT-188 S1b / #357; CLI-spawn
// fallback retired FEAT-235 / DEC-072).
//
// Reusable, gated writer that mirrors durable knowledge — decisions, lessons,
// and notes — into astramem. Any close / learn / decision path calls the
// typed helpers; the sink decides whether memory is enabled, then sends via
// the in-process MemoryProvider (memory-transport.mts). Provider-only:
// the `astramem remember` CLI-spawn fallback this module used to keep as a
// rollout hedge was retired per FEAT-235 Decision 1 — astramem-client's
// resolveWireProvider() is a verified strict superset of that discovery
// chain, so no repo loses capture capability it had before. Fire-and-forget,
// fail-silent, and capped at DEFAULT_MEMORY_CAP_MS (2s) unless `memory.capMs`
// overrides it (FEAT-233 / DEC-071 — the single documented cap policy shared
// with recall's `memory.recall.timeoutMs`, see slice-linker/start-slice.mts).
// It NEVER throws and NEVER blocks the caller — memory is non-critical and
// must not affect the grade-write / learn contract.
//
// Enablement (`.claude/loop.json` -> memory.enabled). This sink is OPT-IN:
// an absent `memory` block (or absent `enabled`) is treated as OFF, so a repo
// that never configures memory (and every test temp-repo) is silent. Values:
//   "off" | "never" | "disabled" | false -> disabled (no provider resolution)
//   "on"  | "always" | true               -> enabled (still needs a provider to send)
//   "auto"                                 -> enabled when a provider resolves
//   absent / unknown                       -> OFF (opt-in default)

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { sanitizeArg, sanitizeContent } from "./memory-sanitize.mjs";
import { DEFAULT_MEMORY_CAP_MS, sendViaProvider } from "./memory-transport.mjs";

export type MemoryKind = "decision" | "lesson" | "note" | "failure";

/** Agent role that produced a memory (astramem --agent, FEAT-219 / #309). Used
 * for agent-scoped recall. `crew:*` / `runner:*` dispatch ids, or a bare role. */
export type AgentType = string;

export interface MemoryConfig {
  /** Normalized mode: "off" | "on" | "auto". */
  mode: "off" | "on" | "auto";
  /** Optional cortex project id (astramem --project). */
  project?: string | undefined;
  /** Optional override (ms) for the capture wallclock cap (`memory.capMs`,
   * FEAT-233 / DEC-071). Falls back to `DEFAULT_MEMORY_CAP_MS` when absent
   * or not a positive number — this is the single documented policy shared
   * with recall's `memory.recall.timeoutMs` (see start-slice.mts). */
  capMs?: number | undefined;
}

export interface RecordResult {
  recorded: boolean;
  reason?: "disabled" | "no-cli" | "empty" | "ok" | "error";
}

/**
 * Read the `memory` block from `<repoPath>/.claude/loop.json`. Fail-silent:
 * a missing/unparseable file yields the opt-in default `{ mode: "off" }`. A
 * caller that already parsed loop.json may pass it as `preParsed` to avoid a
 * re-read.
 */
export async function readMemoryConfig(
  repoPath: string,
  preParsed?: Record<string, unknown> | null
): Promise<MemoryConfig> {
  let parsed = preParsed ?? null;
  if (!parsed) {
    try {
      const raw = await fs.readFile(path.join(repoPath, ".claude", "loop.json"), "utf8");
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { mode: "off" };
    }
  }
  const root = parsed as { memory?: unknown; productName?: unknown };
  const mem = root?.memory;
  const memObj = mem && typeof mem === "object" ? (mem as Record<string, unknown>) : {};
  const enabled = memObj.enabled;
  // Project id for traceability: explicit memory.project override wins, else the
  // repo's productName (customer config). Never a hardcoded default.
  const explicitProject =
    typeof memObj.project === "string" && memObj.project ? memObj.project : undefined;
  const productName =
    typeof root?.productName === "string" && root.productName ? root.productName : undefined;
  // Capture cap override (FEAT-233 / DEC-071): a positive memory.capMs wins;
  // anything else (absent, non-numeric, <= 0) leaves it undefined so the
  // caller falls back to DEFAULT_MEMORY_CAP_MS.
  const capMs =
    typeof memObj.capMs === "number" && Number.isFinite(memObj.capMs) && memObj.capMs > 0
      ? memObj.capMs
      : undefined;
  return { mode: normalizeMode(enabled), project: explicitProject ?? productName, capMs };
}

function normalizeMode(enabled: unknown): "off" | "on" | "auto" {
  if (enabled === true) return "on";
  if (typeof enabled === "string") {
    const v = enabled.toLowerCase();
    if (v === "on" || v === "always" || v === "true") return "on";
    if (v === "auto") return "auto";
  }
  // false, "off"/"never"/"disabled", absent, or any unknown value -> OFF (opt-in).
  return "off";
}

/**
 * Core sink. Gate on enablement, resolve the CLI, then spawn
 * `astramem remember`. Fail-silent — resolves a RecordResult, never throws.
 */
export async function recordMemory(
  repoPath: string,
  opts: {
    kind: MemoryKind;
    content: string;
    project?: string | undefined;
    /** Producing agent role (astramem --agent). Persisted for agent-scoped
     * recall (#309). Omitted from argv when absent. */
    agentType?: AgentType | undefined;
    config?: MemoryConfig | undefined;
  }
): Promise<RecordResult> {
  try {
    const content = sanitizeContent(opts.content ?? "");
    if (!content) return { recorded: false, reason: "empty" };

    const cfg = opts.config ?? (await readMemoryConfig(repoPath));
    if (cfg.mode === "off") return { recorded: false, reason: "disabled" };

    // Cap source (FEAT-233 / DEC-071): cfg.capMs (memory.capMs override) else
    // the shared DEFAULT_MEMORY_CAP_MS default — one documented policy,
    // no more locally-hardcoded literal.
    const capMs = cfg.capMs ?? DEFAULT_MEMORY_CAP_MS;
    const deadline = Date.now() + capMs;

    const rawProject = opts.project ?? cfg.project;
    const project = rawProject ? sanitizeArg(rawProject) : "";
    const agent = opts.agentType ? sanitizeArg(opts.agentType) : "";

    // Primary transport (S1b / dev-team#172): in-process MemoryProvider via
    // the installed astramem plugin. project/agent are sent as TOP-LEVEL
    // payload fields (CANARY-REVIEWER-8801) — mirroring the top-level
    // project/agent vocabulary astramem-client's RecallRequest/RememberRequest
    // already use for reads, so a provider that filters on flat request
    // fields (not just metadata) can see the tag. The metadata copy is kept
    // alongside for back-compat with providers that only read metadata.
    const metadata: Record<string, unknown> = {};
    if (project) metadata["project"] = project;
    if (agent) metadata["agent"] = agent;
    const sent = await sendViaProvider(
      {
        id: randomUUID(),
        type: opts.kind,
        text: content,
        ...(project ? { project } : {}),
        ...(agent ? { agent } : {}),
        ...(Object.keys(metadata).length > 0 ? { metadata } : {})
      },
      deadline - Date.now()
    );
    if (sent) return { recorded: true, reason: "ok" };

    return { recorded: false, reason: "no-cli" };
  } catch {
    return { recorded: false, reason: "error" };
  }
}

/** Build a `[FEAT-x/SLICE-y]` trace tag from whichever ids are present. */
function traceTag(featureId?: string, sliceId?: string): string {
  const parts = [featureId, sliceId].filter(
    (p): p is string => typeof p === "string" && p.length > 0
  );
  return parts.length > 0 ? ` [${parts.join("/")}]` : "";
}

/** Record a design decision (DEC-NNN). */
export function recordDecision(
  repoPath: string,
  d: {
    id: string;
    title: string;
    rationale?: string | undefined;
    featureId?: string | undefined;
    sliceId?: string | undefined;
    project?: string | undefined;
    agentType?: AgentType | undefined;
    config?: MemoryConfig | undefined;
  }
): Promise<RecordResult> {
  const rationale = d.rationale ? ` — ${d.rationale}` : "";
  return recordMemory(repoPath, {
    kind: "decision",
    content: `${d.id}: ${d.title}${rationale}${traceTag(d.featureId, d.sliceId)}`,
    project: d.project,
    agentType: d.agentType,
    config: d.config
  });
}

/** Record a lesson / learning. */
export function recordLesson(
  repoPath: string,
  l: {
    lesson: string;
    featureId?: string | undefined;
    sliceId?: string | undefined;
    project?: string | undefined;
    agentType?: AgentType | undefined;
    config?: MemoryConfig | undefined;
  }
): Promise<RecordResult> {
  return recordMemory(repoPath, {
    kind: "lesson",
    content: `${l.lesson}${traceTag(l.featureId, l.sliceId)}`,
    project: l.project,
    agentType: l.agentType,
    config: l.config
  });
}

/** Record an ad-hoc note. */
export function recordNote(
  repoPath: string,
  n: {
    text: string;
    project?: string | undefined;
    agentType?: AgentType | undefined;
    config?: MemoryConfig | undefined;
  }
): Promise<RecordResult> {
  return recordMemory(repoPath, {
    kind: "note",
    content: n.text,
    project: n.project,
    agentType: n.agentType,
    config: n.config
  });
}

/** Record a failure (review-FAIL / validation-FAIL / incident). Distinct
 * `failure` kind so agent-scoped recall can surface prior failures to the role
 * that owns them (FEAT-219 AC-3). */
export function recordFailure(
  repoPath: string,
  f: {
    summary: string;
    featureId?: string | undefined;
    sliceId?: string | undefined;
    project?: string | undefined;
    agentType?: AgentType | undefined;
    config?: MemoryConfig | undefined;
  }
): Promise<RecordResult> {
  return recordMemory(repoPath, {
    kind: "failure",
    content: `${f.summary}${traceTag(f.featureId, f.sliceId)}`,
    project: f.project,
    agentType: f.agentType,
    config: f.config
  });
}
