#!/usr/bin/env node
// bunx astrarunner connect <code> — claim-code pairing CLI.
//
// Redeems a claim code from the AstraRunner dashboard, writes the bearer
// token to the user-level token store, merges webhook config into the repo's
// .claude/loop.json, and fires a client.handshake envelope.
//
// Exit codes:
//   0 — success
//   1 — claim expired or invalid (410 from redeem endpoint)
//   2 — network failure (non-2xx other than 410, or fetch threw)
//   3 — filesystem write failure
//   4 — profile missing (--env or resolved env not found in profiles.json)
//
// Design: run(opts) returns a numeric exit code; tests call run() directly
// with mocked IO. process.exit() is only called from the top-level main().
//
// Pattern B: bearer is written to tokens.<env>.json ONLY — never to loop.json.
// loop.json carries identifiers (url, tenantId, appId) so it is safe to commit.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

import { ensureBunRuntime } from "../lib/node-bun-guard.mjs";

// Must run before any import of this file's other internal .mjs-specifier
// modules — see node-bun-guard.mjs header. No-ops under Bun; exits under Node.
ensureBunRuntime(import.meta.url, process.argv.slice(2));

// Loaded lazily, inside the functions that need them, instead of via a
// module-scope top-level `await import(...)`. ensureBunRuntime() above already
// guarantees Bun by the time any function below actually runs, so front-loading
// at module-evaluation time bought nothing — and it cost us this: a module-scope
// top-level await pushes every binding declared below it (including the
// test-injectable `_internals` export) behind an async boundary. Bun 1.3.14 has
// a confirmed ESM-evaluator bug where such bindings can be read before
// initialization under `bun test --parallel`, even when the importer fully
// `await`s a dynamic `import()` (oven-sh/bun#30634, fix in flight:
// oven-sh/bun#30656). Keeping this module's top level synchronous end-to-end
// sidesteps the bug entirely.
let envProfilesModPromise: Promise<typeof import("../lib/env-profiles.mjs")> | null = null;
function loadEnvProfiles(): Promise<typeof import("../lib/env-profiles.mjs")> {
  envProfilesModPromise ??= import("../lib/env-profiles.mjs");
  return envProfilesModPromise;
}

let webhookSenderModPromise: Promise<typeof import("../lib/webhook-sender.mjs")> | null = null;
function loadWebhookSender(): Promise<typeof import("../lib/webhook-sender.mjs")> {
  webhookSenderModPromise ??= import("../lib/webhook-sender.mjs");
  return webhookSenderModPromise;
}

// ─── Overridable internals (test injection) ──────────────────────────────────

export const _internals = {
  /** Directory that holds profiles.json + tokens.*.json files. */
  profilesDir: (): string => path.join(os.homedir(), ".astrarunner"),

  /** Process environment — overridable in tests. */
  env: (): NodeJS.ProcessEnv => process.env,

  /** Current working directory — overridable in tests. */
  cwd: (): string => process.cwd(),

  /** fetch function — overridable in tests. */
  fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),

  /** Whether stdin is a TTY — overridable in tests. */
  isTTY: (): boolean => Boolean(process.stdin.isTTY),

  /** Prompt via readline; only called when isTTY() is true. */
  prompt: async (question: string): Promise<string> => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RunOptions {
  argv: string[];
  stderr: { write: (s: string) => void };
  stdout: { write: (s: string) => void };
}

interface ClaimRedeemResponse {
  ingestUrl: string;
  appId: string;
  tenantId: string;
  bearer: string;
}

interface TokenStoreFile {
  version: number;
  tokens: Record<string, { bearer: string; label: string; repoPath: string }>;
}

// ─── Arg parser ──────────────────────────────────────────────────────────────

interface ParsedArgs {
  code: string | null;
  env: string | null;
  url: string | null;
  help: boolean;
}

function applyFlagArg(result: ParsedArgs, flag: string, value: string | undefined): void {
  if (flag === "--env" || flag === "-e") {
    result.env = value ?? null;
  } else if (flag === "--url" || flag === "-u") {
    result.url = value ?? null;
  }
}

function applyPrefixArg(result: ParsedArgs, arg: string): void {
  if (arg.startsWith("--env=")) {
    result.env = arg.slice("--env=".length) || null;
  } else if (arg.startsWith("--url=")) {
    result.url = arg.slice("--url=".length) || null;
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = { code: null, env: null, url: null, help: false };
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--env" || arg === "-e" || arg === "--url" || arg === "-u") {
      applyFlagArg(result, arg, argv[i + 1] as string | undefined);
      i++;
    } else if (arg.startsWith("--env=") || arg.startsWith("--url=")) {
      applyPrefixArg(result, arg);
    } else if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }

  result.code = (positional[0] as string | undefined) ?? null;
  return result;
}

const USAGE = `Usage: bunx astrarunner connect <code> [--env <local|staging|prod>] [--url <override>]

  <code>          Claim code from the AstraRunner dashboard (e.g. ABCD-1234)
  --env <name>    Target tier: local | staging | prod  [default: auto-detect or prod]
  --url <url>     Override the ingest URL (skips profiles.json lookup)
  --help, -h      Show this help

Exit codes:
  0  success
  1  claim expired or invalid
  2  network failure
  3  filesystem write failure
  4  profile not found in ~/.astrarunner/profiles.json
`;

// ─── Env resolution ──────────────────────────────────────────────────────────

async function readSingleEnvFromProfiles(): Promise<string | null> {
  const profilesPath = path.join(_internals.profilesDir(), "profiles.json");
  try {
    const raw = await fs.readFile(profilesPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: number; envs?: Record<string, unknown> };
    if (parsed?.envs && typeof parsed.envs === "object") {
      const keys = Object.keys(parsed.envs);
      if (keys.length === 1 && keys[0]) return keys[0];
    }
  } catch {
    // fall through
  }
  return null;
}

async function resolveEnv(flagEnv: string | null): Promise<string> {
  if (flagEnv) return flagEnv;
  const envVar = _internals.env().ASTRARUNNER_ENV;
  if (envVar) return envVar;
  const single = await readSingleEnvFromProfiles();
  if (single) return single;
  if (_internals.isTTY()) {
    const answer = await _internals.prompt("Tier (local|staging|prod) [prod]: ");
    return answer.length > 0 ? answer : "prod";
  }
  return "prod";
}

// ─── Token-store write ───────────────────────────────────────────────────────

async function readExistingStore(filePath: string): Promise<TokenStoreFile> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as TokenStoreFile;
    if (parsed && typeof parsed === "object" && parsed.tokens) return parsed;
  } catch {
    // Missing or malformed — scaffold empty
  }
  return { version: 1, tokens: {} };
}

async function appendToken(opts: {
  tokensFile: string;
  appId: string;
  bearer: string;
  label: string;
  repoPath: string;
}): Promise<void> {
  const filePath = path.join(_internals.profilesDir(), opts.tokensFile);
  const store = await readExistingStore(filePath);

  // Merge: preserve existing entries (AC6)
  store.tokens[opts.appId] = {
    bearer: opts.bearer,
    label: opts.label,
    repoPath: opts.repoPath
  };

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

// ─── loop.json merge ─────────────────────────────────────────────────────────

async function readExistingLoopJson(loopJsonPath: string): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(loopJsonPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Missing or invalid — scaffold fresh
  }
  return {};
}

async function mergeLoopJson(opts: {
  repoPath: string;
  ingestUrl: string;
  tenantId: string;
  appId: string;
}): Promise<void> {
  const loopJsonPath = path.join(opts.repoPath, ".claude", "loop.json");
  const existing = await readExistingLoopJson(loopJsonPath);

  // Deep-merge the webhook config under loop.notifications (AC7: preserve all other keys)
  const loop = (existing.loop ?? {}) as Record<string, unknown>;
  const notifications = (loop.notifications ?? {}) as Record<string, unknown>;

  notifications.enabled = true;
  notifications.mode = "webhook";
  notifications.webhook = {
    url: opts.ingestUrl,
    tenantId: opts.tenantId,
    appId: opts.appId
    // bearer intentionally omitted — Pattern B
  };

  loop.notifications = notifications;
  existing.loop = loop;

  await fs.mkdir(path.dirname(loopJsonPath), { recursive: true });
  await fs.writeFile(loopJsonPath, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
}

// ─── Handshake ───────────────────────────────────────────────────────────────

async function fireHandshake(opts: {
  ingestUrl: string;
  tenantId: string;
  appId: string;
  bearer: string;
  repoPath: string;
  stderr: { write: (s: string) => void };
}): Promise<void> {
  const url = `${opts.ingestUrl}/api/v2/ingest/loop-events`;
  const now = new Date().toISOString();
  const envelope = {
    kind: "client.handshake",
    emittedAt: now,
    payload: { repoPath: opts.repoPath, ts: now }
  };

  const fetchFn = _internals.fetch as unknown as (
    url: string | URL | Request,
    init?: RequestInit
  ) => Promise<Response>;

  const { createWebhookSender } = await loadWebhookSender();
  const sender = createWebhookSender(
    { url, tenantId: opts.tenantId, appId: opts.appId, bearer: opts.bearer },
    { fetchFn }
  );

  try {
    const result = await sender.send({ ...envelope, tenantId: opts.tenantId, appId: opts.appId });
    if (!result.ok) {
      opts.stderr.write(
        `[connect] warning: handshake POST returned ${result.status ?? result.error ?? "unknown"} — continuing\n`
      );
    }
  } catch (err) {
    opts.stderr.write(
      `[connect] warning: handshake POST threw: ${err instanceof Error ? err.message : String(err)} — continuing\n`
    );
  }
}

// ─── URL + profile resolution ─────────────────────────────────────────────────

interface ResolvedTarget {
  ingestUrl: string;
  tokensFile: string;
}

async function resolveTarget(
  flagUrl: string | null,
  resolvedEnv: string,
  stderr: { write: (s: string) => void }
): Promise<ResolvedTarget | null> {
  if (flagUrl) {
    return { ingestUrl: flagUrl, tokensFile: `tokens.${resolvedEnv}.json` };
  }

  const { readProfile, _internals: profilesInternals } = await loadEnvProfiles();
  const savedProfilesDir = profilesInternals.profilesDir;
  profilesInternals.profilesDir = _internals.profilesDir;
  let profile: Awaited<ReturnType<typeof readProfile>>;
  try {
    profile = await readProfile(resolvedEnv);
  } finally {
    profilesInternals.profilesDir = savedProfilesDir;
  }

  if (!profile) {
    stderr.write(
      `error: profile '${resolvedEnv}' not found in ${path.join(_internals.profilesDir(), "profiles.json")}\n`
    );
    stderr.write(
      "Hint: seed ~/.astrarunner/profiles.json or pass --url <ingestUrl> to override.\n"
    );
    return null;
  }

  return { ingestUrl: profile.ingestUrl, tokensFile: profile.tokensFile };
}

// ─── Redeem call ──────────────────────────────────────────────────────────────

async function redeemClaim(
  ingestUrl: string,
  code: string,
  stderr: { write: (s: string) => void }
): Promise<{ data: ClaimRedeemResponse; exitCode: null } | { data: null; exitCode: number }> {
  const redeemUrl = `${ingestUrl}/api/v2/claims/${encodeURIComponent(code)}/redeem`;
  let resp: Response;
  try {
    resp = await (_internals.fetch as unknown as typeof fetch)(redeemUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    });
  } catch (err) {
    stderr.write(
      `error: network failure reaching ${redeemUrl}: ${err instanceof Error ? err.message : String(err)}\n`
    );
    return { data: null, exitCode: 2 };
  }

  if (resp.status === 410) {
    stderr.write("error: claim expired or invalid (410)\n");
    return { data: null, exitCode: 1 };
  }

  if (resp.status < 200 || resp.status >= 300) {
    let body = "";
    try {
      body = await resp.text();
    } catch {
      // ignore
    }
    stderr.write(`error: redeem returned ${resp.status}: ${body.slice(0, 200)}\n`);
    return { data: null, exitCode: 2 };
  }

  try {
    const data = (await resp.json()) as ClaimRedeemResponse;
    return { data, exitCode: null };
  } catch (err) {
    stderr.write(
      `error: failed to parse redeem response: ${err instanceof Error ? err.message : String(err)}\n`
    );
    return { data: null, exitCode: 2 };
  }
}

// ─── Main run() ──────────────────────────────────────────────────────────────

export async function run(opts: RunOptions): Promise<number> {
  const { argv, stderr, stdout } = opts;
  const args = parseArgs(argv);

  if (args.help) {
    stdout.write(USAGE);
    return 0;
  }

  if (!args.code) {
    stderr.write("error: <code> argument is required\n\n");
    stderr.write(USAGE);
    return 1;
  }

  const resolvedEnv = await resolveEnv(args.env);

  const target = await resolveTarget(args.url, resolvedEnv, stderr);
  if (!target) return 4;

  const { ingestUrl, tokensFile } = target;

  const redeemResult = await redeemClaim(ingestUrl, args.code, stderr);
  if (redeemResult.exitCode !== null) return redeemResult.exitCode;

  const { appId, tenantId, bearer } = redeemResult.data;
  const effectiveIngestUrl = redeemResult.data.ingestUrl || ingestUrl;

  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, "").slice(0, 14); // yyyymmddhhmmss
  const label = `claim-${ts}`;
  const repoPath = _internals.cwd();

  try {
    await appendToken({ tokensFile, appId, bearer, label, repoPath });
  } catch (err) {
    stderr.write(
      `error: failed to write token store: ${err instanceof Error ? err.message : String(err)}\n`
    );
    return 3;
  }

  try {
    await mergeLoopJson({ repoPath, ingestUrl: effectiveIngestUrl, tenantId, appId });
  } catch (err) {
    stderr.write(
      `error: failed to write .claude/loop.json: ${err instanceof Error ? err.message : String(err)}\n`
    );
    return 3;
  }

  await fireHandshake({ ingestUrl: effectiveIngestUrl, tenantId, appId, bearer, repoPath, stderr });

  stdout.write(`✓ Connected app ${appId} via ${resolvedEnv} tier. Open dashboard to confirm.\n`);
  return 0;
}

// ─── Entry point (process.exit only here) ────────────────────────────────────

if (import.meta.main) {
  run({
    argv: process.argv.slice(2),
    stderr: { write: (s) => process.stderr.write(s) },
    stdout: { write: (s) => process.stdout.write(s) }
  }).then((code) => process.exit(code));
}
