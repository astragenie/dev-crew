// Consumer-install smoke-test support (FEAT-022/SLICE-47). Discovers every
// shipped hook/CLI entrypoint by parsing the real `hooks/hooks.json`
// (FEAT-033/DEC-040 — the only path the plugin loader discovers) plus every
// literal `bun "${CLAUDE_PLUGIN_ROOT}/<path>" <args>` invocation documented
// in the top-level `commands/*.md` and `agents/*.md` files, then stages a
// node_modules-free copy of the plugin tree so
// src/tests/install/consumer-smoke.test.mts can exercise every entry the
// way a real `~/.claude/plugins/cache/...` consumer install actually would.
//
// SLICE-46 lesson applied: the entry list is derived by parsing the real
// files on every call, not hand-curated — it tracks drift (a later dist/
// path rewrite, a newly added hook) automatically.
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFileCb);

export type EntrypointRuntime = "bun" | "node" | "bash";
export type EntrypointKind = "hook" | "cli";

export interface ShippedEntrypoint {
  kind: EntrypointKind;
  runtime: EntrypointRuntime;
  /** Path relative to pluginRoot, forward-slash separated. */
  file: string;
  args: string[];
  /** Absolute path to a JSON fixture to feed on stdin, when applicable. */
  stdinFixture?: string;
}

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
// src/scripts/lib/install -> src/tests/install/fixtures
const FIXTURES_DIR = path.resolve(MODULE_DIR, "..", "..", "..", "tests", "install", "fixtures");

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function fixtureForHookEvent(event: string, file: string): string | undefined {
  const basename = path.posix.basename(toPosixPath(file));
  if (event === "PreToolUse") {
    return basename.includes("pre-push")
      ? path.join(FIXTURES_DIR, "prepush-bash.json")
      : path.join(FIXTURES_DIR, "pretooluse-bash.json");
  }
  if (event === "SubagentStop") return path.join(FIXTURES_DIR, "subagentstop-done.json");
  return undefined;
}

interface RawHookGroup {
  hooks?: Array<{ command?: string }>;
}

interface RawHooksFile {
  hooks?: Record<string, RawHookGroup[]>;
}

// Matches e.g. `bun "${CLAUDE_PLUGIN_ROOT}/crew/hooks/x.mts"`,
// `node "${CLAUDE_PLUGIN_ROOT}/hooks/y.mjs" arg`, or (no runtime word)
// `"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh" session_start`.
const HOOK_COMMAND_RE = /^(?:(bun|node)\s+)?"\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)"(?:\s+(.*))?$/;

function parseHookCommand(event: string, command: string): ShippedEntrypoint | null {
  const match = HOOK_COMMAND_RE.exec(command.trim());
  if (match === null) return null;
  const runtimeWord = match[1];
  const file = match[2];
  const rest = match[3];
  if (file === undefined) return null;
  // No runtime word is only ever observed for the log_event.sh entries today
  // (no `.mjs`/`.mts` entry omits its runtime word) — default to "bash" per
  // FEAT-022's "no runtime word + .sh -> bash" rule.
  const runtime: EntrypointRuntime =
    runtimeWord === "bun" ? "bun" : runtimeWord === "node" ? "node" : "bash";
  const args =
    rest !== undefined
      ? rest
          .trim()
          .split(/\s+/)
          .filter((token) => token.length > 0)
      : [];
  const fixture = fixtureForHookEvent(event, file);
  return {
    kind: "hook",
    runtime,
    file,
    args,
    ...(fixture !== undefined ? { stdinFixture: fixture } : {})
  };
}

function collectGroupEntries(
  event: string,
  group: RawHookGroup,
  seen: Set<string>
): ShippedEntrypoint[] {
  const entries: ShippedEntrypoint[] = [];
  for (const hook of group.hooks ?? []) {
    if (typeof hook.command !== "string") continue;
    const entry = parseHookCommand(event, hook.command);
    if (entry === null) continue;
    const dedupeKey = `${entry.file}::${entry.args.join(" ")}::${event}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    entries.push(entry);
  }
  return entries;
}

/** Parses every `hooks.<Event>[].hooks[].command` in hooks/hooks.json. */
export async function listHookEntrypoints(pluginRoot: string): Promise<ShippedEntrypoint[]> {
  const raw = await readFile(path.join(pluginRoot, "hooks", "hooks.json"), "utf8");
  const parsed = JSON.parse(raw) as RawHooksFile;
  const events = parsed.hooks ?? {};
  const seen = new Set<string>();
  const entries: ShippedEntrypoint[] = [];
  for (const [event, groups] of Object.entries(events)) {
    for (const group of groups) {
      entries.push(...collectGroupEntries(event, group, seen));
    }
  }
  return entries;
}

// Matches a literal `bun "${CLAUDE_PLUGIN_ROOT}/<path>" <rest of line>`
// anywhere on a markdown line (inline code span or fenced code block), up to
// (but not including) a markdown backtick or line break.
const CLI_LINE_RE = /bun\s+"\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)"\s*([^`\r\n]*)/;

function cleanToken(token: string): string {
  return token.replace(/[`\\]+$/u, "");
}

async function listTopLevelMarkdownFiles(dirPath: string): Promise<string[]> {
  let names: string[];
  try {
    names = await readdir(dirPath);
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const name of names) {
    if (!name.endsWith(".md")) continue;
    const full = path.join(dirPath, name);
    const info = await lstat(full);
    if (info.isFile()) files.push(full);
  }
  return files;
}

/**
 * Parses every literal `bun "${CLAUDE_PLUGIN_ROOT}/<path>" <args>` invocation
 * in the TOP-LEVEL `*.md` files of `commands/` and `agents/` (never
 * recursing into `agents/3rdparty/` or similar — matches the literal
 * `commands/*.md` / `agents/*.md` globs from the feature description),
 * deduped by file + its first TWO args so the CLI entry list tracks a future
 * dist/ path rewrite automatically instead of a hand-curated subcommand
 * list. FEAT-037/SLICE-59: a single first arg under-dedupes a subcommand
 * group whose first arg is always the same group name and whose second arg
 * is the real verb — e.g. `dispatch prepare` and `dispatch finalize` both
 * had first arg `"dispatch"` and collapsed onto one label, hiding that
 * `dispatch finalize` crashes exactly like `dispatch prepare` does/did
 * (review B of SLICE-56 flagged this as a scanner gap). Keying on the first
 * two args keeps a single-arg invocation's key unchanged (its second "arg"
 * is just the empty string) while giving two-level subcommands their own
 * entry.
 */
export async function listMarkdownCliEntrypoints(pluginRoot: string): Promise<ShippedEntrypoint[]> {
  const files = [
    ...(await listTopLevelMarkdownFiles(path.join(pluginRoot, "commands"))),
    ...(await listTopLevelMarkdownFiles(path.join(pluginRoot, "agents")))
  ];
  const entries: ShippedEntrypoint[] = [];
  const seen = new Set<string>();
  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    for (const line of content.split("\n")) {
      const match = CLI_LINE_RE.exec(line);
      if (match === null) continue;
      const file = match[1];
      const rawRest = match[2];
      if (file === undefined) continue;
      const args = (rawRest ?? "")
        .trim()
        .split(/\s+/)
        .map(cleanToken)
        .filter((token) => token.length > 0);
      const dedupeKey = `${file}::${args.slice(0, 2).join(" ")}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      entries.push({ kind: "cli", runtime: "bun", file, args });
    }
  }
  return entries;
}

/** Full shipped entrypoint list: every hooks.json hook PLUS every markdown CLI invocation. */
export async function listShippedEntrypoints(pluginRoot: string): Promise<ShippedEntrypoint[]> {
  const hooks = await listHookEntrypoints(pluginRoot);
  const cli = await listMarkdownCliEntrypoints(pluginRoot);
  return [...hooks, ...cli];
}

export interface DistinctFilesByRuntime {
  bun: string[];
  node: string[];
  bash: string[];
}

/** Distinct file set across all entries, grouped by runtime. */
export function groupDistinctFilesByRuntime(entries: ShippedEntrypoint[]): DistinctFilesByRuntime {
  const byRuntime: Record<EntrypointRuntime, Set<string>> = {
    bun: new Set<string>(),
    node: new Set<string>(),
    bash: new Set<string>()
  };
  for (const entry of entries) {
    byRuntime[entry.runtime].add(entry.file);
  }
  return {
    bun: [...byRuntime.bun].sort(),
    node: [...byRuntime.node].sort(),
    bash: [...byRuntime.bash].sort()
  };
}

const EXCLUDED_TOP_LEVEL_DIRS = new Set([".git", ".worktrees"]);

function shouldExcludeFromStaging(pluginRoot: string, candidate: string): boolean {
  const rel = toPosixPath(path.relative(pluginRoot, candidate));
  if (rel === "") return false;
  const segments = rel.split("/");
  if (segments.includes("node_modules")) return true;
  const first = segments[0];
  if (first !== undefined && EXCLUDED_TOP_LEVEL_DIRS.has(first)) return true;
  if (rel === ".claude/worktrees" || rel.startsWith(".claude/worktrees/")) return true;
  return false;
}

export interface ConsumerStage {
  pluginCopy: string;
  consumerRepo: string;
  /** Parent temp dir holding both pluginCopy and consumerRepo — remove this to clean up. */
  baseDir: string;
}

/**
 * Copies pluginRoot to a temp dir excluding `.git`, `.worktrees`,
 * `.claude/worktrees`, and any `node_modules` directory at any depth
 * (junctions included — the filter rejects by path segment, so a junction
 * named `node_modules` is skipped the same as a real directory) so the copy
 * mimics the real node_modules-free marketplace cache a consumer actually
 * installs. Then git-inits a sibling temp "consumer repo" with one commit.
 */
export async function stageConsumerCopy(pluginRoot: string): Promise<ConsumerStage> {
  const base = await mkdtemp(path.join(os.tmpdir(), "devcrew-install-smoke-"));
  const pluginCopy = path.join(base, "plugin");
  const consumerRepo = path.join(base, "consumer");
  await mkdir(pluginCopy, { recursive: true });
  await mkdir(consumerRepo, { recursive: true });

  await cp(pluginRoot, pluginCopy, {
    recursive: true,
    filter: (src: string) => !shouldExcludeFromStaging(pluginRoot, src)
  });

  await execFileAsync("git", ["init", "--quiet"], { cwd: consumerRepo });
  await writeFile(
    path.join(consumerRepo, "README.md"),
    "# devcrew consumer-install smoke test repo\n",
    "utf8"
  );
  await execFileAsync("git", ["add", "-A"], { cwd: consumerRepo });
  await execFileAsync(
    "git",
    [
      "-c",
      "user.email=install-smoke@example.invalid",
      "-c",
      "user.name=install-smoke",
      "commit",
      "--quiet",
      "-m",
      "init consumer repo"
    ],
    { cwd: consumerRepo }
  );

  return { pluginCopy, consumerRepo, baseDir: base };
}
