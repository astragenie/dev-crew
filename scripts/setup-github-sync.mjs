// One-shot setup: enable GitHub sync + bulk-set phases on a target repo.
// Usage: node scripts/setup-github-sync.mjs <repoPath>
// Example: node scripts/setup-github-sync.mjs /path/to/your-project
import fs from "node:fs/promises";
import path from "node:path";
import { mergeFrontmatter } from "./lib/frontmatter.mjs";

const repoPath = process.argv[2];
if (!repoPath) {
  console.error("Usage: node scripts/setup-github-sync.mjs <repoPath>");
  process.exit(1);
}

// Enable github sync in loop.json
const cfgPath = path.join(repoPath, ".claude/loop.json");
const cfg = JSON.parse(await fs.readFile(cfgPath, "utf8"));
cfg.github = { enabled: true, repo: null };
await fs.writeFile(cfgPath, JSON.stringify(cfg, null, 2) + "\n");
console.log("✓ loop.json updated (github.enabled = true)");

// Resolve backlog root from config
const backlogRoot = cfg.loop?.backlogRoot
  ? path.join(repoPath, cfg.loop.backlogRoot)
  : path.join(repoPath, ".claude/artifacts/loop/backlog");

// Bulk-set phase by state: done=1, in-progress/triaged=2, pending=3
const stateToPhase = { done: "1", triaged: "2", "in-progress": "2", pending: "3" };
let count = 0;
for (const [state, phase] of Object.entries(stateToPhase)) {
  const dir = path.join(backlogRoot, state);
  let files;
  try { files = await fs.readdir(dir); } catch { continue; }
  for (const f of files.filter((f) => f.endsWith(".md") && f.startsWith("FEAT-"))) {
    const fp = path.join(dir, f);
    await fs.writeFile(fp, mergeFrontmatter(await fs.readFile(fp, "utf8"), { phase }));
    count++;
  }
}
console.log(`✓ ${count} FEATs phased (done→1, triaged/in-progress→2, pending→3)`);
console.log("\nNext steps:");
console.log("  node --input-type=module --eval 'import { publishAll } from \"./scripts/lib/github-sync.mjs\"; console.log(await publishAll(\"<repoPath>\"));'");
console.log("  node --input-type=module --eval 'import { syncMilestones } from \"./scripts/lib/github-sync.mjs\"; console.log(await syncMilestones(\"<repoPath>\"));'");
