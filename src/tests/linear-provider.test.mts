// @ts-nocheck
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { LinearProvider } from "../scripts/lib/task-store/providers/linear-provider.mjs";
import { _internals } from "../scripts/lib/token-store.mjs";
import type {
  LinearGraphQLResult,
  LinearTransport
} from "../scripts/lib/task-store/linear-graphql.mjs";

/**
 * Dedicated success-path coverage for LinearProvider methods not yet
 * exercised in linear-provider-config.test.mts (PR #443 MINOR follow-up):
 * postSliceComment/createComment happy path, closeSlice's delegation to
 * updateStatus("done"), and updateStatus's zero-workflow-states-found
 * branch. AC-1..AC-5 mock-transport coverage for publishFeature/
 * publishSlice/soft-fail/default-stateMap already lives in
 * linear-provider-config.test.mts — not duplicated here.
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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "linear-provider-"));
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

// ---------------------------------------------------------------------------
// postSliceComment — commentCreate happy path
// ---------------------------------------------------------------------------
describe("LinearProvider.postSliceComment — commentCreate happy path", () => {
  test("issues commentCreate with issueId and body, resolves without warning", async () => {
    const { transport, calls } = makeMockTransport(() => ({
      ok: true,
      status: 200,
      errors: null,
      data: { commentCreate: { success: true, comment: { id: "comment-uuid" } } }
    }));
    const p = new LinearProvider(REPO, {
      taskStore: { linear: VALID_LINEAR },
      linearTransport: transport
    });

    const result = await p.postSliceComment("AST-42", "Slice closed — all AC PASS.");

    expect(result).toBeUndefined();
    expect(calls.length).toBe(1);
    expect(calls[0].query).toContain("commentCreate");
    expect(calls[0].variables.input.issueId).toBe("AST-42");
    expect(calls[0].variables.input.body).toBe("Slice closed — all AC PASS.");
    expect(warns.some((w) => w.includes("postSliceComment"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// closeSlice — delegates to updateStatus("done")
// ---------------------------------------------------------------------------
describe('LinearProvider.closeSlice — delegates to updateStatus("done")', () => {
  test('looks up the "Done" workflow state, then issues issueUpdate with its id', async () => {
    const { transport, calls } = makeMockTransport((call) => {
      if (call.query.includes("WorkflowStateByName")) {
        return {
          ok: true,
          status: 200,
          errors: null,
          data: { workflowStates: { nodes: [{ id: "done-state-uuid", name: "Done" }] } }
        };
      }
      return { ok: true, status: 200, errors: null, data: { issueUpdate: { success: true } } };
    });
    const p = new LinearProvider(REPO, {
      taskStore: { linear: VALID_LINEAR },
      linearTransport: transport
    });

    await p.closeSlice("AST-42", "closed via slice ceremony");

    expect(calls.length).toBe(2);
    const lookupCall = calls.find((c) => c.query.includes("WorkflowStateByName"));
    expect(lookupCall?.query).toContain("$teamId: ID!");
    expect(lookupCall?.variables.name).toBe("Done");
    const updateCall = calls.find((c) => c.query.includes("issueUpdate"));
    expect(updateCall?.variables.id).toBe("AST-42");
    expect(updateCall?.variables.input.stateId).toBe("done-state-uuid");
  });
});

// ---------------------------------------------------------------------------
// Regression: WorkflowStateByName's $teamId must be declared ID!, not
// String! — a live smoke test against the real Linear API failed with
// 'Variable "$teamId" of type "String!" used in position expecting type
// "ID"' because $teamId feeds TeamFilter.id (an IDComparator, whose `eq`
// field is typed ID). Mock-transport tests can't catch a variable-type
// mismatch on their own since Linear's schema is never validated against
// the mock — so this asserts the query TEXT itself, to fail loudly if the
// declaration ever regresses back to String!.
// ---------------------------------------------------------------------------
describe("LinearProvider — WorkflowStateByName query declares $teamId: ID! (live-API regression)", () => {
  test("the workflow-state lookup query text declares $teamId as ID!", async () => {
    const { transport, calls } = makeMockTransport((call) => {
      if (call.query.includes("WorkflowStateByName")) {
        return {
          ok: true,
          status: 200,
          errors: null,
          data: { workflowStates: { nodes: [{ id: "state-uuid", name: "Backlog" }] } }
        };
      }
      return { ok: true, status: 200, errors: null, data: { issueUpdate: { success: true } } };
    });
    const p = new LinearProvider(REPO, {
      taskStore: { linear: VALID_LINEAR },
      linearTransport: transport
    });

    await p.updateStatus("AST-42", "pending");

    const lookupCall = calls.find((c) => c.query.includes("WorkflowStateByName"));
    expect(lookupCall?.query).toContain("$teamId: ID!");
    expect(lookupCall?.query).not.toContain("$teamId: String!");
  });
});

// ---------------------------------------------------------------------------
// updateStatus — zero workflow states found for the resolved state name
// ---------------------------------------------------------------------------
describe("LinearProvider.updateStatus — zero-workflow-states-found branch", () => {
  test("warns and returns early without an issueUpdate call when the lookup finds no matching state", async () => {
    const { transport, calls } = makeMockTransport((call) => {
      if (call.query.includes("WorkflowStateByName")) {
        return { ok: true, status: 200, errors: null, data: { workflowStates: { nodes: [] } } };
      }
      return { ok: true, status: 200, errors: null, data: { issueUpdate: { success: true } } };
    });
    const p = new LinearProvider(REPO, {
      taskStore: { linear: VALID_LINEAR },
      linearTransport: transport
    });

    await p.updateStatus("AST-42", "done");

    expect(calls.length).toBe(1);
    expect(calls[0].query).toContain("WorkflowStateByName");
    expect(calls[0].query).toContain("$teamId: ID!");
    expect(
      warns.some(
        (w) =>
          w.includes("updateStatus") &&
          w.includes("no workflow state named") &&
          w.includes('"Done"')
      )
    ).toBe(true);
  });
});
