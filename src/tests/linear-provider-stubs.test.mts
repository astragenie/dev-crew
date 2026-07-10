// @ts-nocheck
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { LinearProvider } from "../scripts/lib/task-store/providers/linear-provider.mjs";
import { getProvider } from "../scripts/lib/task-store/index.mjs";
import { _internals } from "../scripts/lib/token-store.mjs";
import type {
  LinearGraphQLResult,
  LinearTransport
} from "../scripts/lib/task-store/linear-graphql.mjs";

/**
 * COND-C descope stub coverage (AC-5) — syncPull/bootstrap stay documented
 * warning-stubs in v1 (no Linear sync engine yet; see the FEAT-252
 * follow-up) — plus getProvider("linear") resolution. Moved out of
 * linear-provider-config.test.mts (SLICE-158's declared touches_files:
 * index.mts + this file) so config-schema/auth coverage and stub/wiring
 * coverage live in separate, single-purpose files.
 */

const REPO = "/tmp/test-repo";
const VALID_LINEAR = { teamKey: "AST", teamId: "81cea472-33a9-4fbe-a797-147e17c6ca05" };

let tmpDir: string;
let originalStorePath: () => string;
let originalProfilesDir: () => string;
let originalApiKey: string | undefined;
let warns: string[];
let origWarn: typeof console.warn;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "linear-stubs-"));
  originalStorePath = _internals.storePath;
  originalProfilesDir = _internals.profilesDir;
  _internals.storePath = () => path.join(tmpDir, "tokens.json");
  _internals.profilesDir = () => tmpDir;

  originalApiKey = process.env.LINEAR_API_KEY;
  process.env.LINEAR_API_KEY = "lin_api_fromenv";

  warns = [];
  origWarn = console.warn;
  console.warn = (...args: any[]) => {
    warns.push(args.join(" "));
  };
});

afterEach(async () => {
  _internals.storePath = originalStorePath;
  _internals.profilesDir = originalProfilesDir;
  if (originalApiKey === undefined) {
    delete process.env.LINEAR_API_KEY;
  } else {
    process.env.LINEAR_API_KEY = originalApiKey;
  }
  console.warn = origWarn;
  await fs.rm(tmpDir, { recursive: true, force: true });
});

interface RecordedCall {
  query: string;
  variables: Record<string, any>;
  apiKey: string;
}

function makeMockTransport(responder: (call: RecordedCall) => LinearGraphQLResult): {
  transport: LinearTransport;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const transport: LinearTransport = async (query, variables, apiKey) => {
    const call = { query, variables, apiKey };
    calls.push(call);
    return responder(call);
  };
  return { transport, calls };
}

const OK_ISSUE_CREATE = (identifier: string): LinearGraphQLResult => ({
  ok: true,
  status: 200,
  errors: null,
  data: {
    issueCreate: {
      success: true,
      issue: { id: "issue-uuid", identifier, url: `https://linear.app/x/${identifier}` }
    }
  }
});

// ---------------------------------------------------------------------------
// AC-5: syncPull / bootstrap stay documented warning-stubs (COND-C descope)
// ---------------------------------------------------------------------------
describe("LinearProvider.syncPull / bootstrap — AC-5 COND-C descope", () => {
  test("syncPull warns naming the descope, returns empty shape, makes zero transport calls", async () => {
    const { transport, calls } = makeMockTransport(() => OK_ISSUE_CREATE("unused"));
    const p = new LinearProvider(REPO, {
      taskStore: { linear: VALID_LINEAR },
      linearTransport: transport
    });

    const result = await p.syncPull(REPO);

    expect(result).toEqual({ features: [], slices: [] });
    expect(calls.length).toBe(0);
    expect(warns.some((w) => w.includes("syncPull") && w.includes("COND-C"))).toBe(true);
  });

  test("bootstrap warns naming the descope, returns empty shape, makes zero transport calls", async () => {
    const { transport, calls } = makeMockTransport(() => OK_ISSUE_CREATE("unused"));
    const p = new LinearProvider(REPO, {
      taskStore: { linear: VALID_LINEAR },
      linearTransport: transport
    });

    const result = await p.bootstrap(REPO);

    expect(result).toEqual({ features: [] });
    expect(calls.length).toBe(0);
    expect(warns.some((w) => w.includes("bootstrap") && w.includes("COND-C"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getProvider("linear") resolution
// ---------------------------------------------------------------------------
describe("getProvider resolves LinearProvider", () => {
  test("taskStore.provider: 'linear' resolves a LinearProvider instance", () => {
    const p = getProvider({ taskStore: { provider: "linear", linear: VALID_LINEAR } }, REPO);
    expect(p instanceof LinearProvider).toBe(true);
    expect(p.repoPath).toBe(REPO);
  });
});
