import fs from "node:fs/promises";
import path from "node:path";
import { mergeFrontmatter } from "../frontmatter.mjs";

export const VALID_PROVIDERS = ["github", "noop", "linear"] as const;
export type ProviderName = (typeof VALID_PROVIDERS)[number];

/**
 * Write taskStore.provider to .claude/loop.json and bulk-set FEAT phases.
 *
 * When provider is "github", also writes the back-compat github.enabled block
 * so existing configs that check github.enabled keep working.
 *
 * @param repoPath - absolute path to the repo root
 * @param provider - provider name to configure
 * @returns { configPath, provider, featCount }
 */
export async function writeTaskStoreConfig(
  repoPath: string,
  provider: string
): Promise<{ configPath: string; provider: string; featCount: number }> {
  if (!VALID_PROVIDERS.includes(provider as ProviderName)) {
    throw new Error(`Unknown provider "${provider}". Valid values: ${VALID_PROVIDERS.join(", ")}`);
  }

  const configPath = path.join(repoPath, ".claude/loop.json");
  const raw = await fs.readFile(configPath, "utf8");
  const cfg = JSON.parse(raw);

  cfg.taskStore = { provider };

  // Back-compat: keep github.enabled for callers that still check it.
  // TODO(2026-09-11): remove after one release cycle of taskStore.provider
  // as sole source. Audit callers via `grep -rn "github.enabled" src/` before
  // dropping — task-store.provider should be the only read path then.
  if (provider === "github" && !cfg.github) {
    cfg.github = { enabled: true, repo: null };
  }

  await fs.writeFile(configPath, `${JSON.stringify(cfg, null, 2)}\n`);

  const featCount = await bulkPhaseFeats(repoPath, cfg);

  return { configPath, provider, featCount };
}

async function bulkPhaseFeats(repoPath: string, cfg: any): Promise<number> {
  const backlogRoot = cfg.loop?.backlogRoot
    ? path.join(repoPath, cfg.loop.backlogRoot)
    : path.join(repoPath, ".claude/artifacts/loop/backlog");

  const stateToPhase: Record<string, string> = {
    done: "1",
    triaged: "2",
    "in-progress": "2",
    pending: "3"
  };

  let count = 0;
  for (const [state, phase] of Object.entries(stateToPhase)) {
    const dir = path.join(backlogRoot, state);
    let files: string[];
    try {
      files = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const f of files.filter((f) => f.endsWith(".md") && f.startsWith("FEAT-"))) {
      const fp = path.join(dir, f);
      const content = await fs.readFile(fp, "utf8");
      await fs.writeFile(fp, mergeFrontmatter(content, { phase }));
      count++;
    }
  }
  return count;
}
