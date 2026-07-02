import { execFile as execFileCb } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFileCb);

// Single source of truth for the plugin and marketplace name. Mirrors the
// pattern from the crew plugin so generated hook scripts and bridge templates
// pull the identity from the manifests instead of hardcoding strings.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
// Support two execution layouts:
// 1. Emitted (scripts/ tree): scripts/lib/ → repo root
// 2. Direct (src/ tree): src/scripts/lib/ → repo root (fallback)
let pluginRoot = path.resolve(scriptDir, "..", "..");
if (!existsSync(path.join(pluginRoot, ".claude-plugin"))) {
  pluginRoot = path.resolve(scriptDir, "..", "..", "..");
}

let cached: any = null;

async function readJson(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function getPluginIdentity() {
  if (cached) {
    return cached;
  }

  const marketplaceManifestPath = path.join(pluginRoot, ".claude-plugin", "marketplace.json");
  const pluginManifestPath = path.join(pluginRoot, ".claude-plugin", "plugin.json");

  const [marketplace, plugin] = await Promise.all([
    readJson(marketplaceManifestPath),
    readJson(pluginManifestPath)
  ]);

  if (!marketplace?.name) {
    throw new Error(`Missing "name" field in ${marketplaceManifestPath}`);
  }
  if (!plugin?.name) {
    throw new Error(`Missing "name" field in ${pluginManifestPath}`);
  }

  cached = {
    marketplaceName: marketplace.name,
    pluginName: plugin.name,
    pluginVersion: plugin.version || null,
    pluginRoot
  };
  return cached;
}

// Returns the bash glob pattern used to locate the crew CLI inside Claude
// Code's plugin cache. The crew plugin lives in the `astra` marketplace
// (renamed from `crew-dev` in v0.3.0), which we hardcode here because we
// depend on it. If the user installs crew via a different marketplace,
// override CREW_MARKETPLACE_NAME in the environment.
// After the crew Bun migration (>=0.31.0) the entry point is crew.ts; older
// releases ship crew.mjs. The glob covers both.
export function getCrewCliCacheGlob() {
  const marketplaceName = process.env.CREW_MARKETPLACE_NAME || "astra";
  const pluginName = "crew";
  return `$HOME/.claude/plugins/cache/${marketplaceName}/${pluginName}/*/scripts/crew.{ts,mjs}`;
}

// crew entry-point filenames in resolution order. crew.ts ships in the Bun-
// migrated crew (>=0.31.0); crew.mjs is the legacy emit. Prefer the newer one.
const CREW_CLI_FILENAMES = ["crew.ts", "crew.mjs"] as const;

// Find the crew CLI on disk. Returns the path of the newest installed version
// (any supported entry filename) or null if no crew install is found.
export async function findCrewCli() {
  const homedir = process.env.HOME || process.env.USERPROFILE;
  if (!homedir) {
    return null;
  }
  const marketplaceName = process.env.CREW_MARKETPLACE_NAME || "astra";
  const pluginName = "crew";
  const cacheDir = path.join(homedir, ".claude", "plugins", "cache", marketplaceName, pluginName);
  try {
    const versions = (await fs.readdir(cacheDir)).sort((a, b) => compareSemver(b, a));
    for (const v of versions) {
      for (const filename of CREW_CLI_FILENAMES) {
        const candidate = path.join(cacheDir, v, "scripts", filename);
        try {
          await fs.access(candidate);
          return candidate;
        } catch {
          // try next filename / version
        }
      }
    }
  } catch {
    // cache dir missing
  }
  return null;
}

// Pick the runtime for spawning the crew CLI. Crew's Bun migration ships
// `crew.ts` (TypeScript, guarded with "crew install requires Bun >= 1.3"
// when run under node); older releases shipped `crew.mjs` which node runs
// fine. Choosing by extension keeps both eras working — see the
// phase-gate test-failure cluster this fixed (2026-07-02).
export function crewCliRuntime(crewCliPath: string): "bun" | "node" {
  return /\.(ts|mts)$/i.test(crewCliPath) ? "bun" : "node";
}

// Minimum compatible crew plugin version. Bump when this plugin starts to
// depend on a crew capability that older versions don't have.
// v0.47.0: ships the scaffold-first HARD OUTPUT CONTRACT (dev-team FEAT-161)
// in agents/inspector.md and agents/verifier.md — reviewer/validator
// dispatches write a stub artifact (--scaffold --status in-progress) as
// their FIRST tool call and overwrite it (--update ... --status completed)
// as their LAST, so a mid-run pause leaves a detectable stub instead of
// nothing. This is the front-loaded-stub fallback for the specialist-pause
// upstream-request (FEAT-176 / docs/upstream-requests/2026-06-10-hero-crew-specialist-pause-completion-enforcement.md),
// covering the SOP's primary pause victims (inspector/verifier).
// Builder-tier agents (agents/{frontend,backend,fullstack}-dev.md) took a
// DIFFERENT fix in 0.47.0: they were redesigned to never write a handoff
// artifact at all ("Builders do NOT write handoff artifacts ... NEVER
// invoke write-handoff") — inline follow-up only, so there's no artifact
// step to pause mid-write. The aiplugin-dev contract extension (dev-team
// PR #150) is merged to dev-team main but UNRELEASED as of 0.47.0 — it
// will arrive with the next crew release; pause-events.jsonl shows
// aiplugin-dev pausing today (2026-07-02) without the contract. Older
// crew installs may emit unrecognized-flag errors.
export const MIN_CREW_VERSION = "0.47.0";

// Minimum crew version that ships /crew:orchestrate-slice.
// v0.11.0 first shipped commands/orchestrate-slice.md; v0.10.0 shipped only the
// UX-validation gate. When installed crew meets this threshold, slice-start emits
// the orchestrate command instead of the legacy crew:fullstack-dev dispatch.
export const ORCHESTRATE_SLICE_MIN_CREW_VERSION = "0.11.0";

// Read the crew plugin's version from the plugin.json next to a crew CLI path.
// Returns null if the manifest is missing or unreadable.
export async function getCrewVersion(crewCliPath: string | null) {
  if (!crewCliPath) return null;
  const manifestPath = path.resolve(
    path.dirname(crewCliPath),
    "..",
    ".claude-plugin",
    "plugin.json"
  );
  try {
    const manifest = await readJson(manifestPath);
    return manifest?.version || null;
  } catch {
    return null;
  }
}

// Naive semver compare: returns -1/0/1 for a vs b. Treats missing parts as 0.
// Sufficient for the plugin's pre-1.0 version line; does not parse pre-release
// tags. If you ever ship `0.2.0-rc.1`, expand this.
export function compareSemver(a: string | null, b: string | null) {
  const pa = String(a)
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  const pb = String(b)
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

// Returns true when the installed crew version supports /crew:orchestrate-slice.
// Pass versionOverride in tests to avoid filesystem reads.
export async function checkOrchestrateSliceSupport(
  versionOverride?: string | null
): Promise<boolean> {
  const version =
    versionOverride !== undefined ? versionOverride : await getCrewVersion(await findCrewCli());
  if (!version) return false;
  return compareSemver(version, ORCHESTRATE_SLICE_MIN_CREW_VERSION) >= 0;
}

// Minimum Bun version the plugin runs under. Set to the version verified
// green in the Phase-A compat probe; bump only with a CHANGELOG note.
export const MIN_BUN_VERSION = "1.3.14";

export async function getBunVersion(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("bun", ["--version"], {
      windowsHide: true
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function checkBunVersion(versionOverride?: string | null) {
  const version = versionOverride !== undefined ? versionOverride : await getBunVersion();
  return {
    ok: version !== null && compareSemver(version, MIN_BUN_VERSION) >= 0,
    version,
    required: MIN_BUN_VERSION
  };
}

// Test-only helper.
export function _resetCacheForTests() {
  cached = null;
}
