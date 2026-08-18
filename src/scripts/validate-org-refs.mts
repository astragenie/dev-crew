#!/usr/bin/env node
// validate-org-refs.mts — stale-org-name sweep.
//
// The marketplace registry + plugin repos were transferred from the
// pre-transfer `sergeymilashico` GitHub owner to `astragenie`. GitHub
// redirects the old owner path, so a stale `sergeymilashico/...` reference
// keeps WORKING — which is exactly why it rots undetected: nothing breaks,
// so nobody notices the install command / doc points users at the old owner
// (runner-plugin#474 fixed the first batch: README install cmd,
// bump-version.mts, validate-manifests.mts).
//
// This gate fails when the banned owner token appears in this plugin's
// AUTHORED surfaces — the files a human or a consumer's installed
// methodology actually reads. It deliberately does NOT scan frozen
// historical records (CHANGELOG.md past entries, `.claude/artifacts/**`
// completed-slice/synthesis/bundle files, `.claude/logs/**` hook payloads):
// those were accurate for their era and still resolve via the redirect;
// rewriting history is worse than leaving it.
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The banned pre-transfer owner. Matched as a whole GitHub owner token
// (`sergeymilashico/` or bare `sergeymilashico` at a word boundary) so an
// unrelated substring can't false-positive.
const BANNED_OWNER = "sergeymilashico";
const BANNED_RE = /sergeymilashico(?=[/\s"'`)\]]|$)/;

// Authored surfaces to scan, relative to repo root. Files or directories.
// Runtime/generated state (`.claude/`), deps, and git internals are out.
const SCAN_TARGETS = [
  "README.md",
  "ADOPTION.md",
  "src",
  "docs",
  "commands",
  "skills",
  "agents",
  ".claude-plugin"
];

// Within a scanned dir, skip these (vendored / generated / frozen).
const SKIP_DIR_NAMES = new Set(["node_modules", "3rdparty", ".git"]);
const SCAN_EXTENSIONS = new Set([".md", ".mts", ".mjs", ".json", ".ts", ".js", ".yml", ".yaml"]);

// Files that MUST name the banned token to do their job — this guard's own
// source (the literal it bans) and its test (fixtures + assertions). Named
// allowlist with rationale, mirroring validate-backlog-writes.mts's pattern.
const ALLOWLIST = new Set([
  path.join("src", "scripts", "validate-org-refs.mts"),
  path.join("src", "tests", "marketplace-drift-guards.test.mts")
]);

export interface OrgRefFinding {
  file: string;
  line: number;
  text: string;
}

async function collectFiles(absPath: string): Promise<string[]> {
  let s: import("node:fs").Stats;
  try {
    s = await stat(absPath);
  } catch {
    return []; // a target that doesn't exist (e.g. ADOPTION.md absent) is fine
  }
  if (s.isFile()) return [absPath];
  const out: string[] = [];
  const entries = await readdir(absPath, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_DIR_NAMES.has(e.name)) continue;
    const full = path.join(absPath, e.name);
    if (e.isDirectory()) out.push(...(await collectFiles(full)));
    else if (SCAN_EXTENSIONS.has(path.extname(e.name))) out.push(full);
  }
  return out;
}

export async function validateOrgRefs(repoRoot: string): Promise<{
  ok: boolean;
  findings: OrgRefFinding[];
}> {
  const findings: OrgRefFinding[] = [];
  for (const target of SCAN_TARGETS) {
    const files = await collectFiles(path.join(repoRoot, target));
    for (const file of files) {
      if (ALLOWLIST.has(path.relative(repoRoot, file))) continue;
      const content = await readFile(file, "utf8");
      if (!content.includes(BANNED_OWNER)) continue;
      content.split("\n").forEach((line, idx) => {
        if (BANNED_RE.test(line)) {
          findings.push({
            file: path.relative(repoRoot, file),
            line: idx + 1,
            text: line.trim().slice(0, 120)
          });
        }
      });
    }
  }
  return { ok: findings.length === 0, findings };
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainEntry()) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const result = await validateOrgRefs(repoRoot);
  if (!result.ok) {
    console.error(
      `Org-ref validation failed: ${result.findings.length} stale "${BANNED_OWNER}" reference(s) in authored files. ` +
        `The owner is now "astragenie" (github redirects the old path, so these still work but point users at the pre-transfer owner).`
    );
    for (const f of result.findings) {
      console.error(`  - ${f.file}:${f.line}: ${f.text}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Org-ref validation OK: no stale "${BANNED_OWNER}" references in authored files.`);
  }
}
