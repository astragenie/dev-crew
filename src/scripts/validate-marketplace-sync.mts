#!/usr/bin/env node
// validate-marketplace-sync.mts — marketplace registry drift guard.
//
// The `runner` plugin ships from a SEPARATE registry repo
// (astragenie/astra-marketplace, `.claude-plugin/marketplace.json`). The
// release ceremony bumps this repo's plugin.json/package.json but the
// registry lives elsewhere, so it silently fell behind: the registry sat at
// 0.67.0 while 0.68/0.69/0.70 shipped (three releases where consumers who
// `/plugin install`'d got a stale version). Nothing in-repo caught it.
//
// This gate fetches the live registry and fails when its `runner` entry
// version does not match this repo's plugin.json. Because it depends on an
// external network fetch, an UNREACHABLE registry degrades to a warning
// (exit 0) — never block CI on registry/network flakiness — but a
// reachable-and-mismatched registry is a hard failure (exit 1): that is the
// real drift signal we want the release to surface.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REGISTRY_RAW_URL =
  "https://raw.githubusercontent.com/astragenie/astra-marketplace/main/.claude-plugin/marketplace.json";
const PLUGIN_NAME = "runner";
const FETCH_TIMEOUT_MS = 15_000;

export interface MarketplaceEntry {
  name?: string;
  version?: string;
}
export interface MarketplaceDoc {
  plugins?: MarketplaceEntry[];
}

export type SyncResult =
  | { status: "ok"; localVersion: string; registryVersion: string }
  | { status: "drift"; localVersion: string; registryVersion: string | null }
  | { status: "unreachable"; localVersion: string; reason: string };

// Pure comparison — unit-testable without a live network. Given the local
// plugin.json version and the parsed registry doc, decide ok vs drift.
export function compareVersions(localVersion: string, registry: MarketplaceDoc): SyncResult {
  const entry = (registry.plugins ?? []).find((p) => p.name === PLUGIN_NAME);
  const registryVersion = entry?.version ?? null;
  if (registryVersion === localVersion) {
    return { status: "ok", localVersion, registryVersion };
  }
  return { status: "drift", localVersion, registryVersion };
}

// --- Drift severity -------------------------------------------------------
//
// Exact equality alone cannot be the gate. The release ceremony bumps
// plugin.json BEFORE the registry (the registry lives in another repo and is
// bumped as a paired commit once the tag exists), so on a release branch the
// registry is behind by construction — that is the ceremony working, not a
// defect. Failing there made every release PR red and deadlocked the release:
// the gate demanded a registry bump that the ceremony forbids until the tag
// is cut.
//
// The drift this gate was actually written to catch is the registry falling
// behind a release that ALREADY LANDED (the registry sat at 0.67.0 while
// 0.68/0.69/0.70 shipped). That state is only observable on `main`.
//
//   registry behind, on main      -> FAIL. A shipped release consumers can't get.
//   registry behind, off main     -> WARN. Expected mid-release; bump follows the tag.
//   registry ahead, anywhere      -> FAIL. Advertising a version never cut here.
//   registry entry missing        -> FAIL. Consumers cannot install at all.

export type Severity = "ok" | "warn" | "fail";

export interface SeverityDecision {
  severity: Severity;
  reason: string;
}

// Compare dotted numeric versions. Returns <0 if a<b, 0 if equal, >0 if a>b.
// Non-numeric segments sort as 0 — a malformed version is caught by the
// missing/ahead branches rather than silently comparing as newer.
export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((s) => Number.parseInt(s, 10) || 0);
  const pb = b.split(".").map((s) => Number.parseInt(s, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

// True only for a push build of `main`. A pull_request build targeting main is
// NOT main — the release commit has not landed yet, so registry-behind is still
// the expected transient. Absent CI env (local run) is treated as not-main:
// a developer should never be blocked by another repo's state.
export function isMainRef(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.GITHUB_EVENT_NAME === "pull_request") return false;
  return env.GITHUB_REF === "refs/heads/main";
}

export function severityFor(result: SyncResult, onMain: boolean): SeverityDecision {
  if (result.status === "ok") {
    return { severity: "ok", reason: `registry matches plugin.json (${result.localVersion})` };
  }
  if (result.status === "unreachable") {
    return { severity: "warn", reason: `registry unreachable (${result.reason})` };
  }
  const { localVersion, registryVersion } = result;
  if (registryVersion === null) {
    return {
      severity: "fail",
      reason: `registry has no "${PLUGIN_NAME}" entry — consumers cannot install this plugin at all`
    };
  }
  if (compareSemver(registryVersion, localVersion) > 0) {
    return {
      severity: "fail",
      reason:
        `registry advertises ${registryVersion} but this repo's plugin.json is ${localVersion} — ` +
        `the registry points at a version that was never cut here`
    };
  }
  // registry is BEHIND local.
  if (onMain) {
    return {
      severity: "fail",
      reason:
        `registry "${PLUGIN_NAME}" entry is ${registryVersion} but plugin.json is ${localVersion}. ` +
        `A release landed on main that consumers cannot get. Bump the runner entry in ` +
        `astragenie/astra-marketplace/.claude-plugin/marketplace.json to ${localVersion}.`
    };
  }
  return {
    severity: "warn",
    reason:
      `registry is ${registryVersion}, plugin.json is ${localVersion} — expected during a release. ` +
      `Bump the registry as the paired commit once the tag is pushed; main will enforce it.`
  };
}

async function readLocalVersion(repoRoot: string): Promise<string> {
  const raw = await readFile(path.join(repoRoot, ".claude-plugin", "plugin.json"), "utf8");
  const version = JSON.parse(raw).version;
  if (typeof version !== "string") throw new Error("plugin.json has no string version");
  return version;
}

async function fetchRegistry(): Promise<MarketplaceDoc> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(REGISTRY_RAW_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as MarketplaceDoc;
  } finally {
    clearTimeout(timer);
  }
}

export async function validateMarketplaceSync(repoRoot: string): Promise<SyncResult> {
  const localVersion = await readLocalVersion(repoRoot);
  let registry: MarketplaceDoc;
  try {
    registry = await fetchRegistry();
  } catch (err) {
    return {
      status: "unreachable",
      localVersion,
      reason: err instanceof Error ? err.message : String(err)
    };
  }
  return compareVersions(localVersion, registry);
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainEntry()) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const result = await validateMarketplaceSync(repoRoot);
  const { severity, reason } = severityFor(result, isMainRef());
  if (severity === "ok") {
    console.log(`Marketplace-sync OK: ${reason}.`);
  } else if (severity === "warn") {
    console.warn(`Marketplace-sync WARN: ${reason}`);
  } else {
    console.error(`Marketplace-sync FAILED: ${reason}`);
    process.exitCode = 1;
  }
}
