import type { DispatchConfig, DispatchPlan } from "./dispatch-types.mjs";
import {
  DispatchConfigError,
  DispatchDepthExceeded,
  DispatchFanoutExceeded
} from "./dispatch-types.mjs";

export function checkDepth(depth: number | undefined, cfg: DispatchConfig): void {
  const resolved = typeof depth === "number" ? depth : Number(process.env.LOOP_DISPATCH_DEPTH ?? 0);
  if (!Number.isFinite(resolved) || resolved < 0) {
    throw new DispatchDepthExceeded(`invalid depth: ${depth ?? process.env.LOOP_DISPATCH_DEPTH}`);
  }
  if (resolved >= cfg.maxDepth) {
    throw new DispatchDepthExceeded(`depth ${resolved} >= cap ${cfg.maxDepth}`);
  }
}

export function checkFanout(plans: DispatchPlan[], cfg: DispatchConfig): void {
  if (plans.length === 0) {
    throw new DispatchConfigError("plans[] is empty — nothing to dispatch");
  }
  if (plans.length > cfg.maxChildrenPerBatch) {
    throw new DispatchFanoutExceeded(`${plans.length} > cap ${cfg.maxChildrenPerBatch}`);
  }
}

export function checkUniqueIds(plans: DispatchPlan[]): void {
  const seen = new Set<string>();
  for (const p of plans) {
    if (seen.has(p.id)) {
      throw new DispatchConfigError(`duplicate child id: ${p.id}`);
    }
    seen.add(p.id);
  }
}

// git refs reject control chars + a specific set of shell-special chars.
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — validates git ref names against control characters
const INVALID_REF_CHARS = /[\s~^:?*[\\\x00-\x1f]/;

export function validateBranchName(name: string): void {
  if (!name || INVALID_REF_CHARS.test(name)) {
    throw new DispatchConfigError(`invalid branch name: ${JSON.stringify(name)}`);
  }
  if (name.startsWith("-") || name.endsWith(".") || name.includes("..") || name.includes("@{")) {
    throw new DispatchConfigError(`invalid branch name: ${JSON.stringify(name)}`);
  }
}
