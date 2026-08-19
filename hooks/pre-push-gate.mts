#!/usr/bin/env bun
// PreToolUse hook on Bash. SLICE-17 merge of two independently-spawned
// push/commit gates that both fired on EVERY Bash call before this change:
//   - crew's pre-push-verifier.mts: blocking gate — requires a recent PASS
//     validation artifact before `git push`/`gh pr create` (default-OFF via
//     crew.json features["push-verify"]; docs-only pushes bypass).
//   - runner's src/scripts/pre-push-validate.mts: soft/non-blocking gate —
//     runs manifest + content-length + format:check + snapshot-freshness
//     warnings on `git commit`/`git push` (always-on, never blocks; CI is
//     the hard gate for these checks).
// Both scripts parsed the same stdin payload and independently no-op on
// every non-push/non-commit Bash call — i.e. two process spawns paid on
// EVERY Bash call to answer "is this a push?" twice. Merging into one
// process removes one spawn from the Bash PreToolUse chain (contributes to
// the SLICE-17 AC-4 <=150ms/Bash-call gate) with no behavior change: same
// two independent effects (soft warning + optional hard block) still fire
// off of the same command, just from a single process.
//
// Precedence when both would fire: crew's blocking decision wins (a hard
// block is a stronger signal than a soft warning) — matches what a human
// reading two simultaneous hook outputs would act on first. The soft
// warning is not swallowed: it is folded into the block's stderr message
// list, or emitted alone via the same systemMessage envelope the runner
// side used, when nothing blocks.
//
// Always exits 0 — failures never block Claude except the deliberate
// crew push-verify block decision below, which is opt-in itself.

import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { logHookError } from "../crew/hooks/hook-error.mjs";
import { readCrewConfig, isEnabled } from "../crew/scripts/lib/features-service.mjs";
import { parseFrontmatterBlock } from "../crew/scripts/lib/briefing/collect-cost-parser.mjs";
import { isDocsOnlyPush } from "../crew/scripts/lib/docs-only.mjs";
import { validateSnapshotFreshness } from "../src/scripts/validate-snapshot-freshness.mjs";

const CACHE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const srcScriptsDir = path.join(scriptDir, "..", "src", "scripts");

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

interface ParsedCommand {
  sessionId: string;
  command: string;
  cwd: string;
}

function parseInput(raw: string): ParsedCommand | null {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof obj["session_id"] === "string" &&
      typeof obj["cwd"] === "string" &&
      typeof obj["tool_input"] === "object" &&
      obj["tool_input"] !== null &&
      typeof (obj["tool_input"] as Record<string, unknown>)["command"] === "string"
    ) {
      return {
        sessionId: obj["session_id"] as string,
        command: (obj["tool_input"] as Record<string, unknown>)["command"] as string,
        cwd: obj["cwd"] as string
      };
    }
    return null;
  } catch {
    return null;
  }
}

function isPushCommand(command: string): boolean {
  const trimmed = command.trim();
  return /\bgit\s+push\b/.test(trimmed) || /\bgh\s+pr\s+create\b/.test(trimmed);
}

function isCommitCommand(command: string): boolean {
  return /\bgit\s+commit\b/.test(command.trim());
}

// Defect #1 fix (crew issue #164, carried over unchanged): PreToolUse's `cwd`
// field is the session's tracked working dir, which is the MAIN checkout even
// when the actual command changes into a git worktree first
// (`cd <worktree> && git push`). Parse a leading `cd <path>` segment off the
// command so path resolution below targets the directory the push actually
// runs from.
function resolveCommandCwd(command: string, sessionCwd: string): string {
  const cdMatch = command.match(/^\s*cd\s+("[^"]+"|'[^']+'|\S+)\s*(?:&&|;)/);
  if (!cdMatch) return sessionCwd;
  const rawTarget = (cdMatch[1] ?? "").replace(/^["']|["']$/g, "");
  if (rawTarget === "") return sessionCwd;
  return path.isAbsolute(rawTarget) ? rawTarget : path.resolve(sessionCwd, rawTarget);
}

function resolveGitWorktreeRoot(dir: string): string {
  try {
    const result = spawnSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      windowsHide: true
    });
    if (result.status === 0 && result.stdout.trim() !== "") {
      return result.stdout.trim();
    }
  } catch {
    // git not on PATH, or dir doesn't exist — fall back below
  }
  return dir;
}

function resolveTargetRepoRoot(command: string, sessionCwd: string): string {
  return resolveGitWorktreeRoot(resolveCommandCwd(command, sessionCwd));
}

async function isVerifyDisabledInDeployment(repoPath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(
      path.join(repoPath, ".claude", "crew", "deployment.md"),
      "utf8"
    );
    return /push\.verify:\s*false\b/i.test(content);
  } catch {
    return false;
  }
}

interface ValidationScan {
  hasPassed: boolean;
  scannedDir: string;
  windowFileCount: number;
  newestArtifactPath: string | null;
  newestDecision: string | null;
}

function resolveDecisionFromArtifactContent(content: string): {
  decision: string | null;
  isPass: boolean;
} {
  const fm = parseFrontmatterBlock(content);
  if (fm["decision"]) {
    const decision = fm["decision"].toLowerCase();
    return { decision, isPass: decision === "pass" };
  }
  const decisionMatch = content.match(/^[-\s]*Decision:\s*(\w+)/im);
  const decision = (decisionMatch?.[1] ?? "").toLowerCase() || null;
  return { decision, isPass: decision === "passed" || decision === "approved" };
}

async function scanValidationArtifacts(repoPath: string): Promise<ValidationScan> {
  const validationsDir = path.join(repoPath, ".claude", "artifacts", "crew", "validations");
  const cutoffMs = Date.now() - CACHE_WINDOW_MS;

  let entries: Dirent[];
  try {
    entries = await fs.readdir(validationsDir, { withFileTypes: true });
  } catch {
    return {
      hasPassed: false,
      scannedDir: validationsDir,
      windowFileCount: 0,
      newestArtifactPath: null,
      newestDecision: null
    };
  }

  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => path.join(validationsDir, e.name));
  mdFiles.sort((a, b) => b.localeCompare(a));

  let windowFileCount = 0;
  let newestArtifactPath: string | null = null;
  let newestDecision: string | null = null;

  for (const filePath of mdFiles) {
    let stat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stat = await fs.stat(filePath);
    } catch {
      continue;
    }
    if (stat.mtimeMs < cutoffMs) continue;
    windowFileCount++;

    let content: string;
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    const { decision, isPass } = resolveDecisionFromArtifactContent(content);
    if (newestArtifactPath === null) {
      newestArtifactPath = filePath;
      newestDecision = decision;
    }
    if (isPass) {
      return {
        hasPassed: true,
        scannedDir: validationsDir,
        windowFileCount,
        newestArtifactPath: filePath,
        newestDecision: decision
      };
    }
    continue;
  }

  return {
    hasPassed: false,
    scannedDir: validationsDir,
    windowFileCount,
    newestArtifactPath,
    newestDecision
  };
}

// runner side: soft manifest/content-length/format checks. Returns a warning
// string when a check fails, or null when everything passed (or nothing
// applicable ran). Never throws — mirrors pre-push-validate.mts's
// always-exit-0 contract.
//
// Deliberately does NOT pass `cwd` to the spawned checks below — matches
// pre-push-validate.mts's original behavior exactly (inherits the hook
// process's own cwd rather than the git-resolved `repoRoot`). Passing
// `repoRoot` here regressed on Windows: `git rev-parse --show-toplevel`
// under git-bash returns a POSIX-style path (`/c/work/...`), and handing
// that to execFileSync's `cwd` broke the win32 `cmd.exe` shell spawn
// (`ENOENT ... cmd.exe`) — caught during the SLICE-17 standalone hook
// smoke test. `repoRoot` is still used below for the git-resolved
// process.cwd() passed to validateSnapshotFreshness, which takes a path
// argument directly rather than a spawn `cwd` option.
async function runSoftChecks(command: string, repoRoot: string): Promise<string | null> {
  const isPush = isPushCommand(command);
  const isCommit = isCommitCommand(command);
  if (!isPush && !isCommit) return null;

  try {
    execFileSync("bun", [path.join(srcScriptsDir, "validate-manifests.mts")], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32"
    });

    if (isPush) {
      execFileSync("bun", [path.join(srcScriptsDir, "validate-content-length.mts")], {
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32"
      });
      execFileSync("bun", ["run", "format:check"], {
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32"
      });
      const freshness = await validateSnapshotFreshness(repoRoot).catch(() => ({
        ok: true,
        errors: [] as string[]
      }));
      if (!freshness.ok) {
        return `snapshot-freshness drift:\n${freshness.errors.map((e) => `  ${e}`).join("\n")}`;
      }
    }
    return null;
  } catch (e) {
    const err = e as { stderr?: string; message?: string };
    const detail = (err.stderr || err.message || "unknown").toString().trim();
    return detail;
  }
}

// crew side: blocking push-verify gate. Returns a block-reason string when
// the push should be blocked, or null when it's allowed (feature disabled,
// cache hit, docs-only bypass, or opt-out).
async function runBlockingPushVerify(command: string, repoRoot: string): Promise<string | null> {
  if (process.env["CREW_PUSH_VERIFY"] === "0") return null;
  if (!isPushCommand(command)) return null;

  const config = await readCrewConfig(repoRoot);
  if (!isEnabled("push-verify", config)) return null;
  if (await isVerifyDisabledInDeployment(repoRoot)) return null;

  const scan = await scanValidationArtifacts(repoRoot);
  if (scan.hasPassed) return null;

  if (await isDocsOnlyPush(repoRoot)) {
    process.stderr.write(
      "[devcrew:pre-push-gate] docs-only push — validation skipped " +
        "(no runtime surface; #163 quick-win lane).\n"
    );
    return null;
  }

  const artifactHint =
    scan.windowFileCount === 0
      ? `\n  Scanned: ${scan.scannedDir}` +
        `\n  No validation artifacts (*.md) found within the last hour.`
      : `\n  Scanned: ${scan.scannedDir}` +
        `\n  ${scan.windowFileCount} validation artifact(s) found within the last hour.` +
        `\n  Newest artifact (decision=${scan.newestDecision ?? "unparsed"}): ${scan.newestArtifactPath}`;

  return (
    `[devcrew:pre-push-gate] Push blocked — no PASS validation within the last hour.` +
    artifactHint +
    `\n  Note: this blocks the ENTIRE command as submitted, including any` +
    `\n  non-push steps chained before/after it (e.g. \`cp x && git push\` blocks the cp too).` +
    `\n  Run /devcrew:ship (dispatches devcrew:verifier + QA before pushing) or` +
    `\n  dispatch devcrew:verifier manually, then retry the push.` +
    `\n  To disable this gate: set features["push-verify"].enabled=false in .claude/crew.json` +
    `\n  or run \`! CREW_PUSH_VERIFY=0 git push\` directly in your terminal.`
  );
}

async function main(): Promise<void> {
  const raw = await readStdin();
  const input = parseInput(raw);
  if (input === null) return;
  if (!isPushCommand(input.command) && !isCommitCommand(input.command)) return;

  const repoRoot = resolveTargetRepoRoot(input.command, input.cwd);

  const [softWarning, blockReason] = await Promise.all([
    runSoftChecks(input.command, repoRoot),
    runBlockingPushVerify(input.command, repoRoot)
  ]);

  if (blockReason !== null) {
    const message = softWarning
      ? `${blockReason}\n\n  Additional (non-blocking) check output:\n${softWarning}`
      : blockReason;
    process.stderr.write(message + "\n");
    process.stdout.write(JSON.stringify({ decision: "block", reason: message }) + "\n");
    return;
  }

  if (softWarning !== null) {
    const systemMessage = `devcrew pre-push validation warning (soft block — command proceeds, CI will enforce):\n${softWarning}`;
    process.stdout.write(
      JSON.stringify({ continue: true, suppressOutput: true, systemMessage }) + "\n"
    );
  }
}

main().catch(async (err) => {
  await logHookError(process.cwd(), "pre-push-gate", err);
  process.exit(0);
});
