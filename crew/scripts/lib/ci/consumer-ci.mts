/**
 * FEAT-027 / SLICE-53 (audit T5): detects whether a repo this plugin is
 * installed into ("a consumer") already runs its own CI test gate, so the
 * validation-skip decision in `src/scripts/lib/validation-gate.mts`
 * (`deriveValidationGate`'s `loop.validation.satisfiedByReview` branch) can
 * only delegate to a reviewer's evidenced approval when there is a real CI
 * safety net behind it — never on an assumption that "some CI probably
 * runs somewhere" (Codex #23).
 *
 * `present` requires BOTH:
 *   1. a `.github/workflows/*.yml` (or `.yaml`) file that triggers on
 *      `push` or `pull_request` (a workflow gated to e.g. `workflow_dispatch`
 *      only never runs unattended, so it doesn't count), AND
 *   2. that same file actually runs a test command — either the repo's own
 *      configured `.claude/loop.json` `stack.test[].cmd` (+ args) entries,
 *      or one of the well-known test invocations (`bun test`, `npm test`
 *      / `npm run test`, `dotnet test`, `pytest`, `go test`) for repos that
 *      haven't configured `stack.test` at all.
 *
 * Deliberately NOT `stack.build` — FEAT-027's correction: `stack.build[0]`
 * in this repo's own `.claude/loop.json` is `bun run lint`, which proves
 * nothing about tests running.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export interface ConsumerCiResult {
  present: boolean;
  workflows: string[];
}

interface LoopJsonStackTestEntry {
  cmd?: unknown;
  args?: unknown;
}

const KNOWN_TEST_COMMAND_PATTERNS = [
  /\bbun\s+test\b/,
  /\bnpm\s+(run\s+)?test\b/,
  /\bdotnet\s+test\b/,
  /\bpytest\b/,
  /\bgo\s+test\b/
];

const WORKFLOW_EXTENSIONS = [".yml", ".yaml"];

/**
 * Reads `.claude/loop.json` `stack.test[].cmd`+`args` as flattened command
 * strings (e.g. `{cmd:"bun",args:["test","--parallel"]}` -> `"bun test
 * --parallel"`). Returns `[]` on any read/parse miss — absence of a
 * configured test stack falls back to the known-command patterns rather
 * than failing closed.
 */
async function readConfiguredTestCommands(repoPath: string): Promise<string[]> {
  try {
    const raw = await fs.readFile(path.join(repoPath, ".claude", "loop.json"), "utf8");
    const parsed = JSON.parse(raw) as { stack?: { test?: LoopJsonStackTestEntry[] } };
    const entries = parsed.stack?.test;
    if (!Array.isArray(entries)) return [];
    return entries
      .filter(
        (entry): entry is LoopJsonStackTestEntry => Boolean(entry) && typeof entry.cmd === "string"
      )
      .map((entry) => {
        const args = Array.isArray(entry.args)
          ? entry.args.filter((a) => typeof a === "string")
          : [];
        return [entry.cmd as string, ...args].join(" ").trim();
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Whether a parsed workflow document declares a `push` or `pull_request`
 * trigger. Handles the YAML 1.1 quirk where a bare `on:` key is sometimes
 * folded to the boolean `true` key by lenient parsers — the `yaml` package
 * used here defaults to YAML 1.2 core schema (so `on` stays a string key),
 * but both shapes are checked defensively since workflow YAML is untrusted
 * third-party-shaped input.
 */
function hasPushOrPullRequestTrigger(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") return false;
  const record = doc as Record<string, unknown>;
  const trigger = "on" in record ? record.on : record["true"];
  if (trigger === undefined || trigger === null) return false;
  if (typeof trigger === "string") return trigger === "push" || trigger === "pull_request";
  if (Array.isArray(trigger)) return trigger.includes("push") || trigger.includes("pull_request");
  if (typeof trigger === "object") {
    return (
      "push" in (trigger as Record<string, unknown>) ||
      "pull_request" in (trigger as Record<string, unknown>)
    );
  }
  return false;
}

/** Whether the raw workflow file text runs a configured or known test command. */
function runsTestCommand(content: string, configuredCommands: string[]): boolean {
  for (const cmd of configuredCommands) {
    if (cmd && content.includes(cmd)) return true;
  }
  return KNOWN_TEST_COMMAND_PATTERNS.some((pattern) => pattern.test(content));
}

/**
 * Detects consumer CI for `repoPath`. Pure read — never writes, never
 * throws (a missing `.github/workflows/` directory, an unreadable file, or
 * invalid YAML all resolve to "doesn't count" rather than an error).
 */
export async function hasConsumerCi(repoPath: string): Promise<ConsumerCiResult> {
  const workflowsDir = path.join(repoPath, ".github", "workflows");
  let entries: string[];
  try {
    entries = (await fs.readdir(workflowsDir)).filter((name) =>
      WORKFLOW_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext))
    );
  } catch {
    return { present: false, workflows: [] };
  }
  if (entries.length === 0) return { present: false, workflows: [] };

  const configuredCommands = await readConfiguredTestCommands(repoPath);
  const matched: string[] = [];
  for (const name of entries.sort()) {
    let content: string;
    try {
      content = await fs.readFile(path.join(workflowsDir, name), "utf8");
    } catch {
      continue;
    }
    let doc: unknown;
    try {
      doc = parseYaml(content);
    } catch {
      continue;
    }
    if (!hasPushOrPullRequestTrigger(doc)) continue;
    if (!runsTestCommand(content, configuredCommands)) continue;
    matched.push(name);
  }
  return { present: matched.length > 0, workflows: matched };
}
