// Memory recall shim (runner-plugin#291).
//
// Online learning consumer of the GEPA-shaped capture. Before agent dispatch,
// queries astramem for prior failures + decisions on the same FEAT /
// touches_files pattern, returning typed results for injection into the
// dispatch instruction.
//
// Fail-silent contract: recallPrior() NEVER throws and NEVER blocks > 5s.
// CLI absent → []. Provider failure → []. Malformed JSON → [].
//
// The cortex project MUST come from the caller (derived from productName /
// memory.project per DEC-065) — never the featId. Passing featId as --project
// (the pre-DEC-066 bug) queried a per-feature project that never exists, so
// recall always returned []. When no project is supplied, --project is omitted
// and astramem uses its own default.

import { spawn } from "node:child_process";
import path from "node:path";
import { resolveCli } from "./memory-bridge.mjs";

/** A single recalled memory entry returned by astramem recall. */
export interface RecallResult {
  /** Memory type: "decision" | "lesson" | "fact" | "insight" | (unknown). */
  type: string;
  /** Distilled memory text. Mapped from the real CLI's RecallHit `text` field
   * (astramem RecallHitSchema) — kept as `content` here to match this
   * module's existing consumers (recall-injector.mts, memory-context.mts). */
  content: string;
  /** Relevance score in range 0..1, if astramem provides. */
  importance?: number;
  /** ISO 8601 timestamp, if present. */
  ts?: string;
  /** Originating slice id, if present. */
  slice_id?: string;
  /** Originating feat id, if present. */
  feat_id?: string;
  /** GEPA score for this memory, if present. */
  score?: number;
}

/** Options for recallPrior(). */
export interface RecallOptions {
  featId: string;
  sliceId: string;
  touchesFiles?: string[];
  /** Number of results to retrieve. Default: 5. */
  k?: number;
  /** Wallclock timeout in ms. Default: 5000. */
  timeoutMs?: number;
  /** Cortex project to query (derived from productName / memory.project per
   * DEC-065). When absent, `--project` is omitted and astramem uses its default.
   * MUST NOT be the featId. */
  project?: string | undefined;
  /** Agent role to scope recall to (astramem --agent, #309). When absent,
   * `--agent` is omitted (unscoped by role). Note: astramem treats `--agent`
   * as a HARD filter — excludes non-matching atoms. */
  agent?: string | undefined;
}

/**
 * Derive the git repo's nameWithOwner via `gh repo view`. Falls back to
 * path.basename(cwd) on any failure (error, timeout, gh absent).
 */
async function resolveRepoName(timeoutMs = 2000): Promise<string> {
  return new Promise<string>((resolve) => {
    let settled = false;
    const fallback = path.basename(process.cwd());
    const done = (val: string): void => {
      if (settled) return;
      settled = true;
      resolve(val);
    };

    const timer = setTimeout(() => done(fallback), timeoutMs);

    try {
      const proc = spawn(
        "gh",
        ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
        { stdio: ["ignore", "pipe", "ignore"] }
      );
      let out = "";
      proc.stdout?.on("data", (chunk: Buffer) => {
        out += chunk.toString();
      });
      proc.on("close", (code) => {
        clearTimeout(timer);
        const name = out.trim();
        done(code === 0 && name.length > 0 ? name : fallback);
      });
      proc.on("error", () => {
        clearTimeout(timer);
        done(fallback);
      });
    } catch {
      clearTimeout(timer);
      done(fallback);
    }
  });
}

/** Build a semantic query string from slice metadata. */
function buildQuery(featId: string, sliceId: string, touchesFiles: string[]): string {
  const filePart = touchesFiles.length > 0 ? ` files:${touchesFiles.slice(0, 5).join(",")}` : "";
  return `${featId} ${sliceId}${filePart} prior failures decisions lessons`;
}

/**
 * Query astramem for prior memories related to this slice.
 * Returns [] on CLI absent / timeout / malformed JSON / non-zero exit.
 * Never throws.
 */
export async function recallPrior(opts: RecallOptions): Promise<RecallResult[]> {
  const { featId, sliceId, touchesFiles = [], k = 5, timeoutMs = 5000 } = opts;

  try {
    const cli = await resolveCli();
    if (!cli) return [];

    const repo = await resolveRepoName();
    const query = buildQuery(featId, sliceId, touchesFiles);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const project = opts.project ?? "";
      const agent = opts.agent ?? "";
      const raw = await spawnRecall(cli.path, query, k, project, agent, repo, controller.signal);
      return parseRecallOutput(raw);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return [];
  }
}

/** Spawn `astramem recall` and collect stdout. Returns raw string or throws on timeout/error. */
function spawnRecall(
  cliPath: string,
  query: string,
  k: number,
  project: string,
  agent: string,
  repo: string,
  signal: AbortSignal
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let out = "";

    const done = (val: string): void => {
      if (settled) return;
      settled = true;
      resolve(val);
    };
    const fail = (err: unknown): void => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    // Listen for AbortSignal before spawning so abort after signal fires rejects.
    signal.addEventListener("abort", () => fail(new Error("recall timeout")), { once: true });

    try {
      const args = [
        "recall",
        "--query",
        query,
        "--k",
        String(k),
        ...(project ? ["--project", project] : []),
        ...(agent ? ["--agent", agent] : []),
        "--repo",
        repo,
        "--format",
        "json"
      ];
      const proc = spawn(cliPath, args, { stdio: ["ignore", "pipe", "ignore"], signal });

      proc.stdout?.on("data", (chunk: Buffer) => {
        out += chunk.toString();
      });
      proc.on("close", (code) => {
        if (code === 0) {
          done(out);
        } else {
          fail(new Error(`astramem recall exited ${code}`));
        }
      });
      proc.on("error", fail);
    } catch (err) {
      fail(err);
    }
  });
}

/** Parse JSON output from astramem recall. Returns [] on any parse failure. */
function parseRecallOutput(raw: string): RecallResult[] {
  try {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    const parsed: unknown = JSON.parse(trimmed);
    return extractHits(parsed).filter(isRawHit).map(toRecallResult);
  } catch {
    return [];
  }
}

/**
 * Real CLI prints `JSON.stringify({ hits, total_searched, provider })`
 * (astramem RecallResponseSchema) — an object, not a bare array. Read
 * `.hits`; also tolerate a bare array defensively. Anything else -> [].
 */
function extractHits(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object" && parsed !== null) {
    const hits = (parsed as Record<string, unknown>)["hits"];
    if (Array.isArray(hits)) return hits;
  }
  return [];
}

/** Type guard for a raw astramem RecallHit (id, type, text, score, ...). */
function isRawHit(val: unknown): val is Record<string, unknown> {
  if (typeof val !== "object" || val === null) return false;
  const obj = val as Record<string, unknown>;
  return typeof obj["type"] === "string" && typeof obj["text"] === "string";
}

/** Map a raw astramem RecallHit onto RecallResult, renaming `text` -> `content`
 * to match this module's existing consumers. */
function toRecallResult(hit: Record<string, unknown>): RecallResult {
  const result: RecallResult = {
    type: hit["type"] as string,
    content: hit["text"] as string
  };
  if (typeof hit["importance"] === "number") result.importance = hit["importance"];
  if (typeof hit["score"] === "number") result.score = hit["score"];
  return result;
}
