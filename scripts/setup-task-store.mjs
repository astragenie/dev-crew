// One-shot setup: configure taskStore provider in a target repo.
// Usage: node scripts/setup-task-store.mjs <repoPath> [--provider github|noop|linear]
import { writeTaskStoreConfig, VALID_PROVIDERS } from "../src/scripts/lib/task-store/setup-writer.mts";

// Parse flags and positionals. Each known flag that takes a value consumes
// the next argument so it isn't mistaken for repoPath.
const VALUE_FLAGS = new Set(["--provider"]);
const args = process.argv.slice(2);
const flags = {};
const positionals = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.includes("=") && arg.startsWith("--")) {
    const eq = arg.indexOf("=");
    flags[arg.slice(0, eq)] = arg.slice(eq + 1);
  } else if (VALUE_FLAGS.has(arg)) {
    flags[arg] = args[++i];
  } else if (arg.startsWith("--")) {
    flags[arg] = true;
  } else {
    positionals.push(arg);
  }
}

const repoPath = positionals[0];
const provider = flags["--provider"] || "github";

if (!repoPath) {
  console.error(
    `Usage: node scripts/setup-task-store.mjs <repoPath> [--provider ${VALID_PROVIDERS.join("|")}]`
  );
  process.exitCode = 1;
  process.exit();
}

const result = await writeTaskStoreConfig(repoPath, provider);
console.log(`✓ loop.json updated (taskStore.provider = ${result.provider})`);
console.log(`✓ ${result.featCount} FEATs phased (done→1, triaged/in-progress→2, pending→3)`);
console.log("\nNext steps:");
if (provider === "github") {
  console.log(
    '  node --input-type=module --eval \'import { publishAll } from "./scripts/lib/github-sync.mjs"; console.log(await publishAll("<repoPath>"));\''
  );
}
