#!/usr/bin/env node
// validate-agent-refs.mts — phantom crew:/runner: dispatch-token sweep.
//
// Issue astragenie/runner-plugin#371: installed loop rules instructed
// orchestrators to "Dispatch `crew:builder` subagent" — no such agent
// exists in the crew plugin (real builders are crew:fullstack-dev /
// crew:backend-dev / crew:frontend-dev / crew:dev-lite; "builder" is a
// ROLE, not an agent id). Consumer repos that ran /runner:install inherited
// the phantom instruction and broke the first time an orchestrator tried
// to dispatch it.
//
// This scans this plugin's OWN authored surfaces — the ones an
// orchestrator, or a consumer's installed methodology, actually reads —
// for `crew:<name>` / `runner:<name>` tokens that appear in
// DISPATCH-INSTRUCTION context (near "Dispatch" / "hand ... to" /
// "delegate", or immediately followed by "subagent"/"agent") and fails if
// <name> does not resolve to a real dispatch target. Prose that merely
// MENTIONS a token (an illustrative example, a "there is no crew:X step"
// negation, a `/crew:write-review-result` CLI reference) is intentionally
// not in scope — only lines that read as an instruction to dispatch it.
//
// Namespace resolution:
//   - `runner:<name>` (this plugin's own namespace) resolves against the
//     live repo tree: agents/<name>.md (agents/3rdparty/ excluded —
//     vendored, out of scope), commands/<name>.md, or a skills/**/<name>/
//     directory containing SKILL.md. `runner:3rdparty:<name>` resolves
//     against agents/3rdparty/<name>.md.
//   - `devcrew:<name>` (SLICE-20, devcrew unification) is the emerging
//     UNIFIED namespace post SLICE-14..17 merge — commands/, skills/, and
//     agents/ at the repo root now house both the former runner: surface
//     AND the former crew: surface in one tree. It resolves exactly like
//     `runner:<name>` (same live-tree lookup, same 3rdparty carve-out).
//     Kept as a distinct namespace token (not silently aliased to runner:
//     in the regex) so a future rename of the resolution rule itself stays
//     a one-line change here rather than a semantic guess at match time.
//   - `crew:<name>` (a SIBLING plugin's namespace — crew/dev-team lives in
//     a different repo, not available at CI runtime here) resolves against
//     a hardcoded allowlist curated from crew's current agents/ + commands/
//     manifests, pinned the same way MIN_CREW_VERSION pins the crew
//     dependency in src/scripts/lib/plugin-identity.mts. The allowlist
//     deliberately tolerates a few naming-drift aliases already in ACTIVE
//     use across this repo's methodology docs (validator/verifier,
//     deployer/release-engineer) — reconciling that drift is a separate
//     concern from #371. NOTE: `inspector` was removed from the tolerated
//     set (FEAT-240) — crew renamed that agent to `reviewer`, so a
//     `crew:inspector` dispatch is a phantom and is now flagged. The
//     remaining local-allowlist approach is itself the cross-plugin gap
//     FEAT-240 documents; the durable fix is a shared agent registry in
//     plugins-common. `builder` / `builder-be` /
//     `builder-fe` are deliberately OMITTED: that is the exact phantom
//     family this validator exists to catch, and the CHANGELOG's v0.24-era
//     "allowlisted one more release" grace period for it is long over.
//
// Scan scope is deliberately narrower than "all markdown in the repo": it
// covers `.claude/loop/**` (the durable HARD RULE methodology consumers
// read verbatim), `commands/**`, `skills/**`, `agents/**` (3rdparty
// excluded), `templates/**` (the /runner:install source templates — the
// actual propagation vector for #371), `docs/integrations/**` (the one
// docs/ subtree with a confirmed live dispatch example), and root
// `CLAUDE.md`. The rest of docs/ (audits/, backlog/, prompts/, research/,
// sop/, superpowers/, upstream-requests/, ai-loop/) is point-in-time
// planning/historical material, not live-read methodology — scanning it
// would require allowlisting dozens of unrelated retired names
// (crew:lead, crew:copywriter, crew:parallel-runner, ...) that are outside
// this fix's scope. Follow-up: widen coverage once that archive is either
// pruned or given its own allowlist.
import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  findSourceScriptPathFindings,
  type SourceScriptPathFinding
} from "./lib/source-script-path-rule.mjs";

export interface AgentRefFinding {
  file: string;
  line: number;
  token: string;
  detail: string;
}

// Real crew (dev-team) agents + commands as of the currently-pinned
// MIN_CREW_VERSION, plus documented in-repo naming-drift aliases.
// Deliberately excludes builder / builder-be / builder-fe (issue #371).
const CREW_KNOWN_TOKENS = new Set([
  // agents (agents/*.md in the crew plugin, excluding agents/3rdparty/)
  "aiplugin-dev",
  "architect",
  "architect-reviewer",
  "backend-dev",
  "cloud-architect",
  "csharp-reviewer",
  "dev-lite",
  "document-writer",
  "frontend-dev",
  "fullstack-dev",
  "integrator",
  "investigator",
  "performance-engineer",
  "qa-expert",
  "refactor",
  "release-engineer",
  "researcher",
  "reviewer",
  "reviewer-lite",
  "test-automator",
  "typescript-reviewer",
  "uxdesigner",
  "verifier",
  // commands (commands/*.md in the crew plugin, excluding commands/3rdparty/)
  "adopt",
  "architect-feature",
  "audit-repo",
  "brief-me",
  "build",
  "claim-files",
  "cost-setup",
  "design",
  "fix",
  "gepa-eval",
  "gepa-history",
  "gepa-invalidate",
  "gepa-optimize",
  "gepa-resume",
  "gepa-revert",
  "gepa-thaw",
  "incident",
  "init",
  "install",
  "orchestrate-slice",
  "parallel",
  "parallel-review",
  "prune-artifacts",
  "release-files",
  "review",
  "ship",
  "show-claims",
  "show-conflicts",
  "validate",
  "wake-up-brief",
  // tolerated naming-drift aliases already in active use (see file header).
  // `inspector` was REMOVED (FEAT-240): crew renamed it to `reviewer`
  // (dev-team 2026-06-30-reviewer-rename-design.md), so a stale `crew:inspector`
  // dispatch is now a phantom and MUST be flagged, not tolerated.
  "validator",
  "deployer"
]);

const CREW_3RDPARTY_KNOWN_TOKENS = new Set([
  "critical-thinking",
  "database-architect",
  "expert-react-frontend-engineer",
  "flutter-ui-developer",
  "frontend-developer",
  "mobile-developer",
  "playwright-tester",
  "refactoring-specialist",
  "ui-ux-designer"
]);

const SCAN_TARGETS = [
  path.join(".claude", "loop"),
  "commands",
  "skills",
  "agents",
  "templates",
  path.join("docs", "integrations")
] as const;

// crew/CLAUDE.md is the pre-Phase-5 legacy crew doc — still live-read
// (references `/crew:build`, `/crew:install`, etc.) until the Phase-5
// docs cutover, so it stays in scope here too (SLICE-20).
const SCAN_FILES = ["CLAUDE.md", "crew/CLAUDE.md"] as const;

const TOKEN_RE = /\b(crew|runner|devcrew):(3rdparty:)?([A-Za-z][\w-]*)\b/g;
// Prefix/suffix signals are intentionally narrow and proximity-bounded (not
// whole-line) so that: (a) a fix's own explanatory aside on the same line
// ("... subagent — `crew:fullstack-dev` ... there is no agent literally
// named `crew:builder`") doesn't re-flag the negated mention; (b) unrelated
// compound words ("hand-score") or noun-phrase descriptions ("the deleted
// X agent") don't false-trigger. "hand ... to" is deliberately NOT a prefix
// signal — every real dispatch site in this repo also says "Dispatch" (or
// "delegate") in the same breath, so "dispatch\w*|delegat\w*" alone is
// sufficient and far more precise.
const PREFIX_SIGNAL_RE = /\b(dispatch\w*|delegat\w*)\b/i;
const SUFFIX_SIGNAL_RE = /^[`\s]*sub-?agent\b/i;
const PREFIX_WINDOW = 40;
const SUFFIX_WINDOW = 24;

/** A token only counts if it sits near an actual dispatch instruction — not an illustrative mention, negation, or description. */
function isDispatchContext(line: string, matchIndex: number, matchLength: number): boolean {
  const before = line.slice(Math.max(0, matchIndex - PREFIX_WINDOW), matchIndex);
  if (PREFIX_SIGNAL_RE.test(before)) return true;
  const after = line.slice(matchIndex + matchLength, matchIndex + matchLength + SUFFIX_WINDOW);
  return SUFFIX_SIGNAL_RE.test(after);
}

async function listMdBasenames(dir: string): Promise<Set<string>> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return new Set(
      entries
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => path.basename(e.name, ".md"))
    );
  } catch {
    return new Set();
  }
}

async function collectSkillDirNames(dir: string, out: Set<string>): Promise<void> {
  let entries: Dirent<string>[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    try {
      await fs.access(path.join(full, "SKILL.md"));
      out.add(entry.name);
    } catch {
      // not a skill dir — keep walking
    }
    await collectSkillDirNames(full, out);
  }
}

async function walkMarkdown(dir: string): Promise<string[]> {
  let entries: Dirent<string>[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "3rdparty") continue; // vendored — owned surfaces only
      out.push(...(await walkMarkdown(full)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

// FEAT-037 SLICE-58 — sibling of validate-agents.mts's `no-source-script-path`
// rule (which owns agents/*.md, excluding agents/3rdparty/). This covers the
// rest of this plugin's shipped product surface: commands/*.md,
// skills/**/SKILL.md (ONLY the skill manifest itself — skills/ also carries
// many unrelated reference docs under references/ that are out of scope),
// and templates/**. Matcher is shared with crew/scripts/validate-agents.mts
// via src/scripts/lib/source-script-path-rule.mts — see that file for the
// "invocation form" definition (fenced code block, or a line that is
// entirely one inline-code span starting with bun/node/bunx or wrapping
// `${CLAUDE_PLUGIN_ROOT}/`) and the crew/ duplication note.
export interface SourceScriptPathRefFinding extends SourceScriptPathFinding {
  file: string;
}

const SOURCE_SCRIPT_PATH_SCAN_TARGETS = ["commands", "templates"] as const;

export async function findSourceScriptPathRefFindings(
  repoRoot: string
): Promise<SourceScriptPathRefFinding[]> {
  const files: string[] = [];
  for (const target of SOURCE_SCRIPT_PATH_SCAN_TARGETS) {
    files.push(...(await walkMarkdown(path.join(repoRoot, target))));
  }
  const skillMarkdown = await walkMarkdown(path.join(repoRoot, "skills"));
  files.push(...skillMarkdown.filter((f) => path.basename(f) === "SKILL.md"));

  const findings: SourceScriptPathRefFinding[] = [];
  for (const filePath of files) {
    const label = path.relative(repoRoot, filePath).replace(/\\/g, "/");
    const content = await fs.readFile(filePath, "utf8");
    for (const finding of findSourceScriptPathFindings(content)) {
      findings.push({ file: label, ...finding });
    }
  }
  return findings;
}

interface KnownNames {
  runnerAgentNames: Set<string>;
  runnerCommandNames: Set<string>;
  runnerSkillNames: Set<string>;
  runnerAgent3rdpartyNames: Set<string>;
}

/** Resolves a single `crew:`/`runner:` token. Returns a detail string on failure, or null when it resolves. */
function resolveToken(
  namespace: string,
  is3rdparty: boolean,
  name: string,
  known: KnownNames
): string | null {
  if (namespace === "crew") {
    if (is3rdparty) {
      return CREW_3RDPARTY_KNOWN_TOKENS.has(name)
        ? null
        : `no known crew:3rdparty:${name} agent (not in the curated crew allowlist)`;
    }
    return CREW_KNOWN_TOKENS.has(name)
      ? null
      : `no known crew:${name} agent or command — not in the curated crew allowlist ` +
          "(see this file's header for the real dispatch ids; if crew shipped a new one, add it here)";
  }
  // namespace === "runner" or "devcrew" — both resolve against this repo's
  // own live tree (devcrew is the unified post-merge namespace; see this
  // file's header "Namespace resolution" note).
  if (is3rdparty) {
    return known.runnerAgent3rdpartyNames.has(name)
      ? null
      : `no agents/3rdparty/${name}.md on disk`;
  }
  if (
    known.runnerAgentNames.has(name) ||
    known.runnerCommandNames.has(name) ||
    known.runnerSkillNames.has(name)
  ) {
    return null;
  }
  return `no agents/${name}.md, commands/${name}.md, or skills/**/${name}/SKILL.md on disk`;
}

/** Scans one line of one file for phantom dispatch tokens. */
function scanLineForFindings(
  label: string,
  line: string,
  lineNumber: number,
  known: KnownNames
): AgentRefFinding[] {
  const findings: AgentRefFinding[] = [];
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null = null;
  while ((match = TOKEN_RE.exec(line)) !== null) {
    if (!isDispatchContext(line, match.index, match[0].length)) continue;
    const namespace = match[1] as string;
    const is3rdparty = Boolean(match[2]);
    const name = match[3] as string;
    const detail = resolveToken(namespace, is3rdparty, name, known);
    if (!detail) continue;
    findings.push({
      file: label,
      line: lineNumber,
      token: `${namespace}:${is3rdparty ? "3rdparty:" : ""}${name}`,
      detail
    });
  }
  return findings;
}

export async function validateAgentRefs(
  repoRoot: string
): Promise<{ ok: boolean; findings: AgentRefFinding[] }> {
  const skillNames = new Set<string>();
  await collectSkillDirNames(path.join(repoRoot, "skills"), skillNames);

  const known: KnownNames = {
    runnerAgentNames: await listMdBasenames(path.join(repoRoot, "agents")),
    runnerCommandNames: await listMdBasenames(path.join(repoRoot, "commands")),
    runnerSkillNames: skillNames,
    runnerAgent3rdpartyNames: await listMdBasenames(path.join(repoRoot, "agents", "3rdparty"))
  };

  const files: string[] = [];
  for (const target of SCAN_TARGETS) {
    files.push(...(await walkMarkdown(path.join(repoRoot, target))));
  }
  for (const relFile of SCAN_FILES) {
    const full = path.join(repoRoot, relFile);
    try {
      await fs.access(full);
      files.push(full);
    } catch {
      // optional file missing — skip
    }
  }

  const findings: AgentRefFinding[] = [];
  for (const filePath of files) {
    const label = path.relative(repoRoot, filePath).replace(/\\/g, "/");
    const content = await fs.readFile(filePath, "utf8");
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      findings.push(...scanLineForFindings(label, line, idx + 1, known));
    });
  }

  return { ok: findings.length === 0, findings };
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainEntry()) {
  // This script lives at src/scripts/ — repo root is two levels up.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const result = await validateAgentRefs(repoRoot);
  const sourceScriptPathFindings = await findSourceScriptPathRefFindings(repoRoot);
  let failed = false;
  if (!result.ok) {
    failed = true;
    console.error(
      `Agent-ref validation failed: ${result.findings.length} phantom dispatch reference(s)`
    );
    for (const f of result.findings) {
      console.error(`  - ${f.file}:${f.line}: "${f.token}" — ${f.detail}`);
    }
  }
  if (sourceScriptPathFindings.length > 0) {
    failed = true;
    console.error(
      `no-source-script-path validation failed: ${sourceScriptPathFindings.length} ` +
        "source-path invocation(s) in commands/skills/templates"
    );
    for (const f of sourceScriptPathFindings) {
      console.error(
        `  - ${f.file}:${f.line}: source-path invocation of "${f.path}" — use ` +
          `bun "\${CLAUDE_PLUGIN_ROOT}/dist/<bundle>.js" instead (no-source-script-path)`
      );
    }
  }
  if (failed) {
    process.exitCode = 1;
  } else {
    console.log(
      "Agent-ref validation OK: no phantom crew:/runner: dispatch references, " +
        "no source-script-path regressions."
    );
  }
}
