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
  if (result.status === "ok") {
    console.log(
      `Marketplace-sync OK: registry "${PLUGIN_NAME}" entry matches plugin.json (${result.localVersion}).`
    );
  } else if (result.status === "unreachable") {
    // Non-fatal: never block CI on registry/network flakiness.
    console.warn(
      `Marketplace-sync WARN: could not reach the registry (${result.reason}); skipping drift check. ` +
        `Local plugin.json is ${result.localVersion}.`
    );
  } else {
    console.error(
      `Marketplace-sync FAILED: registry "${PLUGIN_NAME}" entry is ` +
        `${result.registryVersion ?? "MISSING"} but plugin.json is ${result.localVersion}. ` +
        `Bump the runner entry in astragenie/astra-marketplace/.claude-plugin/marketplace.json to ${result.localVersion}.`
    );
    process.exitCode = 1;
  }
}
