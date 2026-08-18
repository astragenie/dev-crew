#!/usr/bin/env node
// validate-memory-config.mts — memory-feedback config drift guard (W0.2,
// improvement plan 2026-07-18).
//
// The memory feedback contract evolves in the crew plugin (dev-team) while
// each consumer repo opts in via its own `.claude/loop.json` — so a fix
// landing upstream does NOT propagate. That exact gap produced the audit's
// headline number: the orchestrator credit loop
// (`memory.feedback.creditLoop`, dev-team's dispatch-memory-credit-loop-v1
// contract) shipped and was enabled in dev-team, while this repo — the one
// whose snapshot showed served=862/used=14 (1.6% usefulness) — never got the
// key. Nothing in-repo caught it (competitive audit §4.4, runner-plugin#525).
//
// This gate fails when memory is enabled but the feedback config shape lags
// the current contract. A repo with memory disabled/absent passes — opting
// out is legitimate; silently lagging the contract is not.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Bump when the required feedback shape changes; each entry names the key
// that must exist and the contract that introduced it.
const REQUIRED_KEYS: { keyPath: string; contract: string }[] = [
  { keyPath: "memory.project", contract: "astramem project namespace (CLAUDE.md memory binding)" },
  { keyPath: "memory.feedback.enabled", contract: "usefulness feedback (ADR-010)" },
  {
    keyPath: "memory.feedback.creditLoop.enabled",
    contract:
      "dispatch-time orchestrator credit loop (dev-team docs/contracts/dispatch-memory-credit-loop-v1.md)"
  }
];

export type MemoryConfigResult =
  | { status: "ok" }
  | { status: "memory-disabled" }
  | { status: "no-config" }
  | { status: "drift"; missing: { keyPath: string; contract: string }[] };

function readKeyPath(obj: unknown, keyPath: string): unknown {
  let cur: unknown = obj;
  for (const part of keyPath.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

// Pure check — unit-testable without disk.
export function checkMemoryConfig(config: unknown): MemoryConfigResult {
  if (config === null || typeof config !== "object") return { status: "no-config" };
  const memory = (config as Record<string, unknown>).memory;
  if (memory === null || memory === undefined) return { status: "memory-disabled" };
  if (typeof memory !== "object") return { status: "drift", missing: REQUIRED_KEYS };
  const enabled = (memory as Record<string, unknown>).enabled;
  // "auto" counts as enabled (dev-team uses it); only an explicit false opts out.
  if (enabled === false) return { status: "memory-disabled" };

  const missing = REQUIRED_KEYS.filter((k) => readKeyPath(config, k.keyPath) === undefined);
  return missing.length === 0 ? { status: "ok" } : { status: "drift", missing };
}

export async function validateMemoryConfig(repoRoot: string): Promise<MemoryConfigResult> {
  const configPath = path.join(repoRoot, ".claude", "loop.json");
  let raw: string;
  try {
    raw = await readFile(configPath, "utf8");
  } catch {
    return { status: "no-config" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "drift", missing: REQUIRED_KEYS };
  }
  return checkMemoryConfig(parsed);
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const result = await validateMemoryConfig(repoRoot);
  switch (result.status) {
    case "ok":
      console.log("[validate-memory-config] OK — memory feedback config matches current contract");
      return;
    case "memory-disabled":
      console.log("[validate-memory-config] memory disabled/absent — nothing to validate");
      return;
    case "no-config":
      console.log("[validate-memory-config] no .claude/loop.json — nothing to validate");
      return;
    case "drift":
      console.error(
        "[validate-memory-config] FAIL — memory is enabled but the feedback config lags the current contract:"
      );
      for (const m of result.missing) {
        console.error(`  missing ${m.keyPath}  (required by: ${m.contract})`);
      }
      console.error(
        "  Fix: mirror the memory.feedback block from dev-team/.claude/loop.json, or set memory.enabled: false to opt out explicitly."
      );
      process.exitCode = 1;
  }
}

const isDirectRun =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  await main();
}
