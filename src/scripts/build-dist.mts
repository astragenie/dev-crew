#!/usr/bin/env bun
/**
 * FEAT-026: self-contained dist bundles so hook/CLI entry points run without
 * node_modules. Claude Code auto-installs a plugin-root `dependencies` block
 * for marketplace installs, but devcrew is ineligible — the root bun.lock
 * declares workspaces and crew/'s own package.json (its zod/yaml deps) is
 * never installed, and @astragenie/* needs registry auth at install time
 * anyway. Bundling (no network, no auth, no install step) is the chosen fix;
 * see docs/memory.md "FEAT-026 alternative rejected" for the record.
 *
 * Entries: every `bun "${CLAUDE_PLUGIN_ROOT}/<path>"` command in
 * hooks/hooks.json, plus the six CLI entries that are not reachable through
 * a hooks.json command (the fifth, `loop.mts`, spawns `dispatch.mts` as a
 * sibling child process for its `dispatch` subcommand — see FEAT-037/
 * SLICE-59 — so `dispatch.mts` must bundle to `dispatch.js` alongside
 * `loop.js`, or the bundled `loop.js` has no sibling to spawn). node/bash
 * entries (the five `.mjs` hooks + log_event.sh) are NOT bundled and NOT
 * copied — they stay in place and run under plain node/bash unchanged.
 *
 * `--check` rebuilds every entry to a temp dir and byte-compares against
 * the committed dist/ (after normalising CRLF -> LF and stripping the
 * `// @bun` banner Bun's bundler stamps on every output file, both of which
 * flake the comparison across Bun versions/platforms without changing
 * behavior). dist/.build-info.json records the Bun version dist/ was last
 * built with; both build and --check fail loudly on a Bun-version mismatch
 * against .bun-version rather than silently producing a bundle nobody asked
 * for.
 */
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HOOKS_JSON_PATH = path.join(REPO_ROOT, "hooks", "hooks.json");
const DIST_DIR = path.join(REPO_ROOT, "dist");
const BUILD_INFO_PATH = path.join(DIST_DIR, ".build-info.json");
const BUN_VERSION_FILE = path.join(REPO_ROOT, ".bun-version");

export interface BundleEntry {
  /** Source path, relative to repo root, forward-slash separated. */
  src: string;
  /** Output path, relative to dist/, forward-slash separated. */
  out: string;
}

const EXTRA_CLI_ENTRIES: ReadonlyArray<string> = [
  "crew/scripts/crew.mts",
  "src/scripts/loop.mts",
  "src/scripts/dispatch.mts",
  "crew/scripts/report-to-pr.mts",
  "crew/scripts/prune-artifacts.mts",
  "src/scripts/watch-tick.mts"
];

const CLI_OUT_NAMES: Readonly<Record<string, string>> = {
  "crew/scripts/crew.mts": "crew.js",
  "src/scripts/loop.mts": "loop.js",
  "src/scripts/dispatch.mts": "dispatch.js",
  "crew/scripts/report-to-pr.mts": "report-to-pr.js",
  "crew/scripts/prune-artifacts.mts": "prune-artifacts.js",
  "src/scripts/watch-tick.mts": "watch-tick.js"
};

interface RawHookGroup {
  hooks?: Array<{ command?: string }>;
}
interface RawHooksFile {
  hooks?: Record<string, RawHookGroup[]>;
}

// Pre-migration form: `bun "${CLAUDE_PLUGIN_ROOT}/<path>.mts"` (source path
// directly). Post-migration form (this FEAT's own output, once applied to
// hooks/hooks.json): `bun "${CLAUDE_PLUGIN_ROOT}/dist/hooks/<base>.js"` —
// the committed-bundle path, not a source path. hooks/hooks.json is the only
// enumeration of hook entries (DEC-040); once every bun command in it points
// at dist/, this script must still recover the .mts source for each so a
// rebuild doesn't drop entries it can no longer see as `.mts` — see
// docs/memory.md "FEAT-026 dist-path entry recovery".
const BUN_LEGACY_HOOK_RE = /^bun\s+"\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+\.mts)"/;
const BUN_DIST_HOOK_RE = /^bun\s+"\$\{CLAUDE_PLUGIN_ROOT\}\/dist\/hooks\/([^"/]+)\.js"/;

// Every directory that has historically held a hook source .mts file,
// checked in order; `resolveDistHookSource` errors loudly on zero or 2+
// matches rather than guessing.
const HOOK_SOURCE_DIRS: ReadonlyArray<string> = ["hooks", "crew/hooks"];

async function pathExists(absPath: string): Promise<boolean> {
  try {
    await stat(absPath);
    return true;
  } catch {
    return false;
  }
}

/** Recover the `.mts` source for a `dist/hooks/<base>.js` bundle output by basename. */
async function resolveDistHookSource(base: string): Promise<string> {
  const candidates = HOOK_SOURCE_DIRS.map((dir) => `${dir}/${base}.mts`);
  const found: string[] = [];
  for (const candidate of candidates) {
    if (await pathExists(path.join(REPO_ROOT, candidate))) found.push(candidate);
  }
  if (found.length === 0) {
    throw new Error(
      `build-dist: no .mts source found for dist/hooks/${base}.js — looked in ${HOOK_SOURCE_DIRS.join(", ")}`
    );
  }
  if (found.length > 1) {
    throw new Error(
      `build-dist: ambiguous source for dist/hooks/${base}.js — found at ${found.join(" and ")}`
    );
  }
  return found[0] as string;
}

/** Every `hooks[event][].hooks[].command` string in a parsed hooks.json, flattened. */
function flattenHookCommands(events: Record<string, RawHookGroup[]>): string[] {
  const commands: string[] = [];
  for (const groups of Object.values(events)) {
    for (const group of groups) {
      for (const hook of group.hooks ?? []) {
        if (typeof hook.command === "string") commands.push(hook.command.trim());
      }
    }
  }
  return commands;
}

type HookCommandMatch =
  | { kind: "legacy"; src: string }
  | { kind: "dist"; base: string }
  | undefined;

/** Classify one hooks.json command as a pre- or post-migration bun-hook reference, or neither. */
function classifyHookCommand(command: string): HookCommandMatch {
  const legacyMatch = BUN_LEGACY_HOOK_RE.exec(command);
  if (legacyMatch?.[1]) return { kind: "legacy", src: legacyMatch[1] };
  const distMatch = BUN_DIST_HOOK_RE.exec(command);
  if (distMatch?.[1]) return { kind: "dist", base: distMatch[1] };
  return undefined;
}

/**
 * Every distinct hook `.mts` source referenced (directly or, once migrated,
 * indirectly via its dist/hooks/*.js output) by a `bun` command in
 * hooks/hooks.json.
 */
export async function collectHookEntries(
  hooksJsonPath: string = HOOKS_JSON_PATH
): Promise<string[]> {
  const raw = await readFile(hooksJsonPath, "utf8");
  const parsed = JSON.parse(raw) as RawHooksFile;
  const commands = flattenHookCommands(parsed.hooks ?? {});
  const seen = new Set<string>();
  const distBases = new Set<string>();
  for (const command of commands) {
    const match = classifyHookCommand(command);
    if (match?.kind === "legacy") seen.add(match.src);
    else if (match?.kind === "dist") distBases.add(match.base);
  }
  for (const base of distBases) {
    seen.add(await resolveDistHookSource(base));
  }
  return [...seen].sort();
}

function hookOutName(src: string): string {
  // crew/hooks/x.mts -> x.js ; hooks/pre-push-gate.mts -> pre-push-gate.js
  const base = path.posix.basename(src);
  return base.replace(/\.mts$/, ".js");
}

export async function resolveEntries(): Promise<BundleEntry[]> {
  const hookSrcs = await collectHookEntries();
  const entries: BundleEntry[] = hookSrcs.map((src) => ({
    src,
    out: `hooks/${hookOutName(src)}`
  }));
  for (const src of EXTRA_CLI_ENTRIES) {
    const out = CLI_OUT_NAMES[src];
    if (!out) throw new Error(`build-dist: no output name registered for CLI entry ${src}`);
    entries.push({ src, out });
  }
  return entries;
}

const EXTERNAL = ["@opentelemetry/*", "@aws-sdk/*"];

// Bun stamps a `// @bun` banner comment as the first line of every bundled
// output file. It is a Bun-internal marker (format/content can shift across
// Bun versions) with no behavioral meaning, and CRLF vs LF is a platform
// artifact of the OS the bundle ran on, not a content difference -- both
// are normalised away before --check's byte-compare so the check doesn't
// flake on either axis.
function normaliseForCompare(content: string): string {
  const lf = content.replace(/\r\n/g, "\n");
  return lf.replace(/^\/\/ @bun[^\n]*\n/, "");
}

async function buildOne(entry: BundleEntry, outDir: string): Promise<void> {
  const result = await Bun.build({
    entrypoints: [path.join(REPO_ROOT, entry.src)],
    outdir: path.dirname(path.join(outDir, entry.out)),
    naming: path.basename(entry.out),
    target: "bun",
    minify: false,
    sourcemap: "none",
    external: EXTERNAL
  });
  if (!result.success) {
    const messages = result.logs.map((log) => log.message).join("\n");
    throw new Error(`build-dist: bundling ${entry.src} failed:\n${messages}`);
  }
}

async function buildAll(outDir: string): Promise<BundleEntry[]> {
  const entries = await resolveEntries();
  await mkdir(path.join(outDir, "hooks"), { recursive: true });
  for (const entry of entries) {
    await buildOne(entry, outDir);
  }
  return entries;
}

async function readBunVersionPin(): Promise<string> {
  try {
    return (await readFile(BUN_VERSION_FILE, "utf8")).trim();
  } catch {
    throw new Error(`build-dist: ${BUN_VERSION_FILE} is missing — pin the Bun version first`);
  }
}

function currentBunVersion(): string {
  return Bun.version;
}

async function assertBunVersionPinned(): Promise<string> {
  const pinned = await readBunVersionPin();
  const current = currentBunVersion();
  if (pinned !== current) {
    throw new Error(
      `build-dist: Bun version mismatch — .bun-version pins ${pinned}, running ${current}. ` +
        "Install the pinned Bun version before building/checking dist/."
    );
  }
  return current;
}

async function writeBuildInfo(bunVersion: string, entries: BundleEntry[]): Promise<void> {
  const info = {
    bunVersion,
    builtAt: new Date().toISOString(),
    entries: entries
      .map((e) => ({ src: e.src, out: e.out }))
      .sort((a, b) => a.out.localeCompare(b.out))
  };
  await writeFile(BUILD_INFO_PATH, `${JSON.stringify(info, null, 2)}\n`, "utf8");
}

export async function build(): Promise<void> {
  const bunVersion = await assertBunVersionPinned();
  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(DIST_DIR, { recursive: true });
  const entries = await buildAll(DIST_DIR);
  await writeBuildInfo(bunVersion, entries);
}

interface CheckResult {
  ok: boolean;
  staleFiles: string[];
  detail?: string;
}

export async function check(): Promise<CheckResult> {
  const bunVersion = await assertBunVersionPinned();

  let onDiskInfo: { bunVersion?: string } | null = null;
  try {
    onDiskInfo = JSON.parse(await readFile(BUILD_INFO_PATH, "utf8"));
  } catch {
    return {
      ok: false,
      staleFiles: [],
      detail: "dist/.build-info.json is missing — run `bun run build:dist`"
    };
  }
  if (onDiskInfo?.bunVersion !== bunVersion) {
    return {
      ok: false,
      staleFiles: [],
      detail:
        `dist/.build-info.json recorded Bun ${onDiskInfo?.bunVersion ?? "unknown"}, ` +
        `running ${bunVersion} — rebuild with \`bun run build:dist\` under the pinned version`
    };
  }

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "devcrew-dist-check-"));
  try {
    const entries = await buildAll(tmpRoot);
    const staleFiles: string[] = [];
    for (const entry of entries) {
      const freshPath = path.join(tmpRoot, entry.out);
      const committedPath = path.join(DIST_DIR, entry.out);
      let fresh: string;
      let committed: string;
      try {
        fresh = normaliseForCompare(await readFile(freshPath, "utf8"));
      } catch {
        staleFiles.push(`${entry.out} (fresh build missing?)`);
        continue;
      }
      try {
        committed = normaliseForCompare(await readFile(committedPath, "utf8"));
      } catch {
        staleFiles.push(`${entry.out} (not present in committed dist/)`);
        continue;
      }
      if (fresh !== committed) staleFiles.push(entry.out);
    }
    return { ok: staleFiles.length === 0, staleFiles };
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainEntry()) {
  const args = process.argv.slice(2);
  const checkMode = args.includes("--check");
  try {
    if (checkMode) {
      const result = await check();
      if (!result.ok) {
        if (result.detail) {
          console.error(`build-dist --check: ${result.detail}`);
        } else {
          console.error(
            `build-dist --check: stale dist/ output for: ${result.staleFiles.join(", ")} — run \`bun run build:dist\``
          );
        }
        process.exitCode = 1;
      } else {
        console.log("build-dist --check: dist/ is up to date");
      }
    } else {
      await build();
      console.log(`build-dist: wrote ${DIST_DIR}`);
    }
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
  }
}
