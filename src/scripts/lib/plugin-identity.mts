import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFileCb);

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
