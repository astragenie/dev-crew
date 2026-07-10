// jsonl-append.mts — shared append-only JSONL write helper (FEAT-211).
//
// Consolidates the hand-rolled JSONL-append implementations previously
// duplicated across auto-dispatch.mts, dispatch-trace.mts,
// dispatch-worktree.mts, error-pattern-registry.mts, learnings.mts,
// learnings-citations.mts, and telemetry.mts. Each call site kept its own
// error-handling (throw vs. swallow) and sync-vs-async shape — those are
// exposed as options / dedicated exports here rather than forked back out
// into per-file implementations.

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import {
  append as pluginJsonlAppend,
  appendBatch as pluginJsonlAppendBatch
} from "@astragenie/plugin-std/jsonl";

// ---------------------------------------------------------------------------
// I/O seam — exported for test injection. Mirrors the `_internals` pattern
// already used by learnings-citations.mts and webhook-fanout.mts.
// ---------------------------------------------------------------------------

export const _internals = {
  mkdir: (dir: string): Promise<string | undefined> => fs.mkdir(dir, { recursive: true }),
  appendFile: (filePath: string, data: string): Promise<void> =>
    fs.appendFile(filePath, data, "utf8"),
  mkdirSync: (dir: string): void => {
    fsSync.mkdirSync(dir, { recursive: true });
  },
  appendFileSync: (filePath: string, data: string): void => {
    fsSync.appendFileSync(filePath, data, "utf8");
  }
};

export interface AppendJsonlOptions {
  /** Swallow write failures and resolve silently instead of throwing. Default: false (throw). */
  swallowErrors?: boolean;
  /** Override the mkdir primitive — lets a caller keep its own test seam (e.g. learnings-citations.mts). */
  mkdir?: (dir: string) => Promise<unknown>;
  /** Override the appendFile primitive — see `mkdir`. */
  appendFile?: (filePath: string, data: string) => Promise<void>;
}

export interface AppendJsonlSyncOptions {
  /** Swallow write failures and return silently instead of throwing. Default: false (throw). */
  swallowErrors?: boolean;
}

/** True when the caller injected its own mkdir/appendFile (the test seam) — that path keeps the legacy local orchestration instead of delegating to plugin-std. */
function hasInjectedPrimitives(opts: AppendJsonlOptions): boolean {
  return opts.mkdir !== undefined || opts.appendFile !== undefined;
}

async function writeLinesAsync(
  filePath: string,
  lines: string[],
  mkdir: (dir: string) => Promise<unknown>,
  appendFile: (filePath: string, data: string) => Promise<void>,
  swallowErrors: boolean
): Promise<void> {
  if (lines.length === 0) return;
  try {
    await mkdir(path.dirname(filePath));
    await appendFile(filePath, `${lines.join("\n")}\n`);
  } catch (err) {
    if (swallowErrors) return;
    throw err;
  }
}

/**
 * Append one JSON record as a line to `filePath`. Creates the parent
 * directory when absent. Throws on failure unless `swallowErrors` is set.
 */
export async function appendJsonl(
  filePath: string,
  record: unknown,
  opts: AppendJsonlOptions = {}
): Promise<void> {
  const swallowErrors = opts.swallowErrors ?? false;
  if (!hasInjectedPrimitives(opts)) {
    // Default path (no injected mkdir/appendFile): delegate to plugin-std,
    // which already does mkdir(recursive) + one appendFile call and throws
    // on failure — matches this helper's throw-unless-swallowed contract.
    try {
      await pluginJsonlAppend(filePath, record);
    } catch (err) {
      if (swallowErrors) return;
      throw err;
    }
    return;
  }
  // Injected mkdir/appendFile is the test-injection seam (see _internals
  // above) — keep the legacy local orchestration so overrides still work.
  const mkdir = opts.mkdir ?? _internals.mkdir;
  const appendFile = opts.appendFile ?? _internals.appendFile;
  await writeLinesAsync(filePath, [JSON.stringify(record)], mkdir, appendFile, swallowErrors);
}

/**
 * Append multiple JSON records to `filePath` as a single batched write
 * (one appendFile call for the whole set). No-op for an empty array.
 */
export async function appendJsonlBatch(
  filePath: string,
  records: unknown[],
  opts: AppendJsonlOptions = {}
): Promise<void> {
  const swallowErrors = opts.swallowErrors ?? false;
  if (!hasInjectedPrimitives(opts)) {
    // Default path: delegate to plugin-std's appendBatch, which does the
    // same mkdir(recursive) + single pre-joined appendFile call this helper
    // already did, and is a no-op for an empty array (matches writeLinesAsync).
    try {
      await pluginJsonlAppendBatch(filePath, records);
    } catch (err) {
      if (swallowErrors) return;
      throw err;
    }
    return;
  }
  const mkdir = opts.mkdir ?? _internals.mkdir;
  const appendFile = opts.appendFile ?? _internals.appendFile;
  await writeLinesAsync(
    filePath,
    records.map((r) => JSON.stringify(r)),
    mkdir,
    appendFile,
    swallowErrors
  );
}

/**
 * Synchronous variant of {@link appendJsonl} for call sites that cannot go
 * async without a wider refactor of their (currently sync) public signature.
 * Stays fully local — plugin-std/jsonl has no synchronous variant to delegate to.
 */
export function appendJsonlSync(
  filePath: string,
  record: unknown,
  opts: AppendJsonlSyncOptions = {}
): void {
  try {
    _internals.mkdirSync(path.dirname(filePath));
    _internals.appendFileSync(filePath, `${JSON.stringify(record)}\n`);
  } catch (err) {
    if (opts.swallowErrors) return;
    throw err;
  }
}
