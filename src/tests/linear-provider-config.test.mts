// @ts-nocheck
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resolveLinearConfig } from "../scripts/lib/task-store/linear-config.mjs";
import { LinearProvider } from "../scripts/lib/task-store/providers/linear-provider.mjs";
import { _internals } from "../scripts/lib/token-store.mjs";
import type {
  LinearGraphQLResult,
  LinearTransport
} from "../scripts/lib/task-store/linear-graphql.mjs";

const REPO = "/tmp/test-repo";
const VALID_LINEAR = { teamKey: "AST", teamId: "81cea472-33a9-4fbe-a797-147e17c6ca05" };

let tmpDir: string;
let originalStorePath: () => string;
let originalProfilesDir: () => string;
let originalApiKey: string | undefined;
let warns: string[];
let origWarn: typeof console.warn;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "linear-config-"));
  originalStorePath = _internals.storePath;
  originalProfilesDir = _internals.profilesDir;
  _internals.storePath = () => path.join(tmpDir, "tokens.json");
  _internals.profilesDir = () => tmpDir;

  originalApiKey = process.env.LINEAR_API_KEY;
  delete process.env.LINEAR_API_KEY;

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

// ---------------------------------------------------------------------------
// resolveLinearConfig — env-key resolution
// ---------------------------------------------------------------------------
describe("resolveLinearConfig — apiKey resolution", () => {
  test("resolves apiKey from LINEAR_API_KEY when present", async () => {
    process.env.LINEAR_API_KEY = "lin_api_secretvalue";
    const cfg = await resolveLinearConfig({ taskStore: { linear: VALID_LINEAR } });
    expect(cfg.enabled).toBe(true);
    expect(cfg.apiKey).toBe("lin_api_secretvalue");
    expect(cfg.reason).toBeNull();
  });

  test("falls back to token-store when LINEAR_API_KEY is absent", async () => {
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({ version: 1, tokens: { linear: { bearer: "lin_api_fromstore" } } })
    );
    const cfg = await resolveLinearConfig({ taskStore: { linear: VALID_LINEAR } });
    expect(cfg.enabled).toBe(true);
    expect(cfg.apiKey).toBe("lin_api_fromstore");
  });

  test("env var takes precedence over token-store fallback", async () => {
    process.env.LINEAR_API_KEY = "lin_api_fromenv";
    await fs.writeFile(
      path.join(tmpDir, "tokens.json"),
      JSON.stringify({ version: 1, tokens: { linear: { bearer: "lin_api_fromstore" } } })
    );
    const cfg = await resolveLinearConfig({ taskStore: { linear: VALID_LINEAR } });
    expect(cfg.apiKey).toBe("lin_api_fromenv");
  });

  test("disabled with reason missing_api_key when neither env nor token-store has a key", async () => {
    const cfg = await resolveLinearConfig({ taskStore: { linear: VALID_LINEAR } });
    expect(cfg.enabled).toBe(false);
    expect(cfg.apiKey).toBeNull();
    expect(cfg.reason).toBe("missing_api_key");
    expect(warns.some((w) => w.includes("LINEAR_API_KEY"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resolveLinearConfig — config-file apiKey rejection
// ---------------------------------------------------------------------------
describe("resolveLinearConfig — apiKey in config is rejected", () => {
  test("warns and ignores taskStore.linear.apiKey when present in config", async () => {
    process.env.LINEAR_API_KEY = "lin_api_fromenv";
    const cfg = await resolveLinearConfig({
      taskStore: { linear: { ...VALID_LINEAR, apiKey: "lin_api_shouldnotbeused" } }
    });
    expect(cfg.apiKey).toBe("lin_api_fromenv");
    expect(warns.some((w) => w.includes("taskStore.linear.apiKey") && w.includes("ignoring"))).toBe(
      true
    );
  });
});

// ---------------------------------------------------------------------------
// resolveLinearConfig — schema defaults absent -> clear error
// ---------------------------------------------------------------------------
describe("resolveLinearConfig — missing taskStore.linear config", () => {
  test("disabled with reason missing_config and no hardcoded AST/teamId fallback", async () => {
    process.env.LINEAR_API_KEY = "lin_api_fromenv";
    const cfg = await resolveLinearConfig({});
    expect(cfg.enabled).toBe(false);
    expect(cfg.reason).toBe("missing_config");
    expect(cfg.teamKey).toBeNull();
    expect(cfg.teamId).toBeNull();
  });

  test("error message lists what to set (teamKey and teamId)", async () => {
    await resolveLinearConfig({});
    const msg = warns.find((w) => w.includes("taskStore.linear"));
    expect(msg).toBeTruthy();
    expect(msg).toContain("teamKey");
    expect(msg).toContain("teamId");
  });

  test("disabled with reason missing_config when only teamKey is set (partial config)", async () => {
    process.env.LINEAR_API_KEY = "lin_api_fromenv";
    const cfg = await resolveLinearConfig({ taskStore: { linear: { teamKey: "AST" } } });
    expect(cfg.enabled).toBe(false);
    expect(cfg.reason).toBe("missing_config");
  });
});

// ---------------------------------------------------------------------------
// Security — never log the key value
// ---------------------------------------------------------------------------
describe("resolveLinearConfig — never logs key material", () => {
  test("no warn message contains the resolved apiKey value", async () => {
    process.env.LINEAR_API_KEY = "lin_api_verysecretvalue123";
    await resolveLinearConfig({
      taskStore: { linear: { ...VALID_LINEAR, apiKey: "lin_api_configvalue" } }
    });
    for (const w of warns) {
      expect(w.includes("lin_api_verysecretvalue123")).toBe(false);
      expect(w.includes("lin_api_configvalue")).toBe(false);
    }
  });

  test("missing-key warning does not contain any lin_api_ prefixed content", async () => {
    await resolveLinearConfig({ taskStore: { linear: VALID_LINEAR } });
    for (const w of warns) {
      expect(w.includes("lin_api_")).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// LinearProvider — disabled-state / never-throw contract
// ---------------------------------------------------------------------------
describe("LinearProvider — disabled state (missing key)", () => {
  test("isEnabled() is false when LINEAR_API_KEY is unset", async () => {
    const p = new LinearProvider(REPO, { taskStore: { linear: VALID_LINEAR } });
    expect(await p.isEnabled()).toBe(false);
  });

  test("isEnabled() is true when LINEAR_API_KEY is set and config is complete", async () => {
    process.env.LINEAR_API_KEY = "lin_api_fromenv";
    const p = new LinearProvider(REPO, { taskStore: { linear: VALID_LINEAR } });
    expect(await p.isEnabled()).toBe(true);
  });

  test("every mirror method resolves without throwing in disabled state", async () => {
    const p = new LinearProvider(REPO, { taskStore: { linear: VALID_LINEAR } });
    const calls: [string, () => Promise<any>][] = [
      ["publishFeature", () => p.publishFeature({})],
      ["publishSlice", () => p.publishSlice({}, null)],
      ["closeSlice", () => p.closeSlice(1, "done")],
      ["postSliceComment", () => p.postSliceComment(1, "body")],
      ["updateStatus", () => p.updateStatus(1, "done")],
      ["syncPull", () => p.syncPull(REPO)],
      ["bootstrap", () => p.bootstrap(REPO)]
    ];
    for (const [_name, call] of calls) {
      let threw = false;
      try {
        await call();
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);
    }
  });

  test("mirror methods still warn-and-skip when config is missing entirely", async () => {
    const p = new LinearProvider(REPO, {});
    const result = await p.publishFeature({});
    expect(result).toBeNull();
    expect(warns.some((w) => w.includes("not configured"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mock transport helper — records every call, returns a scripted response.
// ---------------------------------------------------------------------------
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
// AC-1: publishFeature -> issueCreate scoped to teamId, returns identifier
// ---------------------------------------------------------------------------
describe("LinearProvider.publishFeature — AC-1", () => {
  test("issues issueCreate scoped to teamId and returns the created issue identifier", async () => {
    process.env.LINEAR_API_KEY = "lin_api_fromenv";
    const { transport, calls } = makeMockTransport(() => OK_ISSUE_CREATE("AST-42"));
    const p = new LinearProvider(REPO, {
      taskStore: { linear: VALID_LINEAR },
      linearTransport: transport
    });

    const result = await p.publishFeature({
      id: "FEAT-999",
      frontmatter: {},
      body: "## Description\nDo the thing"
    });

    expect(result).toBe("AST-42");
    expect(calls.length).toBe(1);
    expect(calls[0].query).toContain("issueCreate");
    expect(calls[0].variables.input.teamId).toBe(VALID_LINEAR.teamId);
    expect(calls[0].variables.input.title).toBe("FEAT-999");
    expect(calls[0].apiKey).toBe("lin_api_fromenv");
  });
});

// ---------------------------------------------------------------------------
// AC-2: publishSlice(slice, parentExternalId) -> issueCreate with parentId
// ---------------------------------------------------------------------------
describe("LinearProvider.publishSlice — AC-2", () => {
  test("issues issueCreate with parentId set to the parent feature's external id", async () => {
    process.env.LINEAR_API_KEY = "lin_api_fromenv";
    const { transport, calls } = makeMockTransport(() => OK_ISSUE_CREATE("AST-43"));
    const p = new LinearProvider(REPO, {
      taskStore: { linear: VALID_LINEAR },
      linearTransport: transport
    });

    const result = await p.publishSlice(
      { id: "SLICE-999", frontmatter: {}, body: "slice body" },
      "AST-42"
    );

    expect(result).toBe("AST-43");
    expect(calls.length).toBe(1);
    expect(calls[0].variables.input.parentId).toBe("AST-42");
  });

  test("omits parentId when parentExternalId is null", async () => {
    process.env.LINEAR_API_KEY = "lin_api_fromenv";
    const { transport, calls } = makeMockTransport(() => OK_ISSUE_CREATE("AST-44"));
    const p = new LinearProvider(REPO, {
      taskStore: { linear: VALID_LINEAR },
      linearTransport: transport
    });

    await p.publishSlice({ id: "SLICE-998", frontmatter: {}, body: "" }, null);

    expect(calls[0].variables.input.parentId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AC-3: soft-fail contract — missing key, HTTP error, GraphQL error payload
// ---------------------------------------------------------------------------
describe("LinearProvider soft-fail contract — AC-3", () => {
  test("missing-key: resolves null and warns 'not configured' without calling transport", async () => {
    const { transport, calls } = makeMockTransport(() => OK_ISSUE_CREATE("unused"));
    const p = new LinearProvider(REPO, {
      taskStore: { linear: VALID_LINEAR },
      linearTransport: transport
    });

    const result = await p.publishFeature({ id: "FEAT-1", frontmatter: {}, body: "" });

    expect(result).toBeNull();
    expect(calls.length).toBe(0);
    expect(warns.some((w) => w.includes("publishFeature") && w.includes("not configured"))).toBe(
      true
    );
  });

  test("HTTP-error: resolves null and warns 'call failed' without throwing", async () => {
    process.env.LINEAR_API_KEY = "lin_api_fromenv";
    const { transport } = makeMockTransport(() => ({
      ok: false,
      status: 401,
      data: null,
      errors: null
    }));
    const p = new LinearProvider(REPO, {
      taskStore: { linear: VALID_LINEAR },
      linearTransport: transport
    });

    let threw = false;
    let result: any;
    try {
      result = await p.publishFeature({ id: "FEAT-2", frontmatter: {}, body: "" });
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBeNull();
    expect(warns.some((w) => w.includes("publishFeature") && w.includes("call failed"))).toBe(true);
  });

  test("GraphQL-error-payload: resolves null and warns 'call failed' without throwing", async () => {
    process.env.LINEAR_API_KEY = "lin_api_fromenv";
    const { transport } = makeMockTransport(() => ({
      ok: false,
      status: 200,
      data: null,
      errors: [{ message: "Team not found" }]
    }));
    const p = new LinearProvider(REPO, {
      taskStore: { linear: VALID_LINEAR },
      linearTransport: transport
    });

    let threw = false;
    let result: any;
    try {
      result = await p.publishSlice({ id: "SLICE-2", frontmatter: {}, body: "" }, null);
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).toBeNull();
    expect(
      warns.some(
        (w) =>
          w.includes("publishSlice") && w.includes("call failed") && w.includes("Team not found")
      )
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-4: updateStatus applies default stateMap when unset
// ---------------------------------------------------------------------------
describe("LinearProvider.updateStatus — AC-4 default stateMap", () => {
  const EXPECTED = [
    ["pending", "Backlog"],
    ["triaged", "Todo"],
    ["in-progress", "In Progress"],
    ["done", "Done"]
  ] as const;

  for (const [status, expectedStateName] of EXPECTED) {
    test(`maps "${status}" -> "${expectedStateName}"`, async () => {
      process.env.LINEAR_API_KEY = "lin_api_fromenv";
      const { transport, calls } = makeMockTransport((call) => {
        if (call.query.includes("WorkflowStateByName")) {
          return {
            ok: true,
            status: 200,
            errors: null,
            data: { workflowStates: { nodes: [{ id: "state-uuid", name: expectedStateName }] } }
          };
        }
        return { ok: true, status: 200, errors: null, data: { issueUpdate: { success: true } } };
      });
      const p = new LinearProvider(REPO, {
        taskStore: { linear: VALID_LINEAR },
        linearTransport: transport
      });

      await p.updateStatus("AST-42", status);

      const lookupCall = calls.find((c) => c.query.includes("WorkflowStateByName"));
      expect(lookupCall?.variables.name).toBe(expectedStateName);
      const updateCall = calls.find(
        (c) => c.query.includes("IssueUpdateState") || c.query.includes("issueUpdate")
      );
      expect(updateCall?.variables.input.stateId).toBe("state-uuid");
    });
  }

  test("taskStore.linear.stateMap overrides one status without disturbing the rest", async () => {
    process.env.LINEAR_API_KEY = "lin_api_fromenv";
    const { transport, calls } = makeMockTransport((call) => {
      if (call.query.includes("WorkflowStateByName")) {
        return {
          ok: true,
          status: 200,
          errors: null,
          data: { workflowStates: { nodes: [{ id: "custom-state", name: call.variables.name }] } }
        };
      }
      return { ok: true, status: 200, errors: null, data: {} };
    });
    const p = new LinearProvider(REPO, {
      taskStore: { linear: { ...VALID_LINEAR, stateMap: { done: "Shipped" } } },
      linearTransport: transport
    });

    await p.updateStatus("AST-42", "done");

    const lookupCall = calls.find((c) => c.query.includes("WorkflowStateByName"));
    expect(lookupCall?.variables.name).toBe("Shipped");
  });
});

// AC-5 (syncPull/bootstrap COND-C descope stubs) and getProvider("linear")
// resolution coverage moved to linear-provider-stubs.test.mts (SLICE-158).
