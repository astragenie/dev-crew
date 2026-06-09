import fs from "node:fs";
import type { DispatchConfig } from "./dispatch-types.mjs";
import { DispatchConfigError } from "./dispatch-types.mjs";

const DEFAULT_CONFIG: DispatchConfig = {
  maxDepth: 3,
  maxChildrenPerBatch: 8,
  worktreeRoot: null,
  pruneStaleAfterDays: 7,
};

export function readDispatchConfig(configPath: string): DispatchConfig {
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  let raw: string;
  try {
    raw = fs.readFileSync(configPath, "utf8");
  } catch (err) {
    throw new DispatchConfigError(
      `config read failed: ${(err as Error).message}`,
    );
  }
  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new DispatchConfigError(
      `config parse failed: ${(err as Error).message}`,
    );
  }
  const limits = (parsed.dispatchLimits ?? {}) as Record<string, unknown>;
  return {
    maxDepth:
      typeof limits.maxDepth === "number"
        ? limits.maxDepth
        : DEFAULT_CONFIG.maxDepth,
    maxChildrenPerBatch:
      typeof limits.maxChildrenPerBatch === "number"
        ? limits.maxChildrenPerBatch
        : DEFAULT_CONFIG.maxChildrenPerBatch,
    worktreeRoot:
      typeof limits.worktreeRoot === "string"
        ? limits.worktreeRoot
        : DEFAULT_CONFIG.worktreeRoot,
    pruneStaleAfterDays:
      typeof limits.pruneStaleAfterDays === "number"
        ? limits.pruneStaleAfterDays
        : DEFAULT_CONFIG.pruneStaleAfterDays,
  };
}
