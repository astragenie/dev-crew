import { execFile as execFileCb } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFileCb);

async function readJson(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
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
// step to pause mid-write. The aiplugin-dev anti-pause contract extension
// (dev-team PR #150) SHIPPED in crew 0.48.0 ("GEPA cluster + aiplugin-dev
// anti-pause contract + capture canary") — agents/aiplugin-dev.md carries
// the full HARD OUTPUT CONTRACT there. Floor raised to 0.48.0 so the
// contract is guaranteed present (docs/upstream-requests/archive/2026-06-10-
// hero-crew-specialist-pause-completion-enforcement.md).
//
// Raised to 0.57.0 (FEAT-180): the reviewer prompt now instructs reviewers to
// run `crew write-review-result --not-checked "<a,b>"`, whose flag + the
// not_checked[]/author_id/judge_id/self_approval review-artifact fields ship in
// crew 0.57.0 (dev-team PR #196). Below that floor the prompt would tell
// reviewers to pass a flag the CLI rejects.
export const MIN_CREW_VERSION = "0.57.0";

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
