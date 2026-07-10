/**
 * linear-graphql — raw Linear GraphQL operation helpers.
 *
 * Deliberately lifecycle-free: no config resolution, no stateMap defaults,
 * no soft-fail warn policy, no task-store imports. This module exists so
 * IssueBroker (FEAT-245) can compose the same low-level Linear ops
 * LinearProvider uses without pulling in task-store lifecycle logic —
 * import this module directly, not linear-provider.mts.
 *
 * All ops take an injectable `LinearTransport` so callers (and tests) can
 * swap in a mock instead of hitting the network. `defaultLinearTransport`
 * is the only function here that actually calls `fetch`.
 */

export const LINEAR_API_URL = "https://api.linear.app/graphql";

export interface LinearGraphQLResult {
  /** true when the HTTP call succeeded (2xx) and the response carried no top-level GraphQL errors. */
  ok: boolean;
  status: number;
  data: any | null;
  errors: any[] | null;
}

export type LinearTransport = (
  query: string,
  variables: Record<string, any>,
  apiKey: string
) => Promise<LinearGraphQLResult>;

/** Real network transport — POSTs to the Linear GraphQL API. Never throws; network failures become a { ok: false } result. */
export const defaultLinearTransport: LinearTransport = async (query, variables, apiKey) => {
  let res: Response;
  try {
    res = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey
      },
      body: JSON.stringify({ query, variables })
    });
  } catch (err: any) {
    return { ok: false, status: 0, data: null, errors: [{ message: err?.message ?? String(err) }] };
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  const errors = json?.errors ?? null;
  return { ok: res.ok && !errors, status: res.status, data: json?.data ?? null, errors };
};

const ISSUE_CREATE_MUTATION = `
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue { id identifier url }
    }
  }
`;

export interface CreateIssueInput {
  teamId: string;
  title: string;
  description?: string;
  parentId?: string | null;
}

/** issueCreate mutation — feature issue when parentId is omitted, sub-issue when set. */
export async function createIssue(
  transport: LinearTransport,
  apiKey: string,
  input: CreateIssueInput
): Promise<LinearGraphQLResult> {
  const variables = {
    input: {
      teamId: input.teamId,
      title: input.title,
      ...(input.description ? { description: input.description } : {}),
      ...(input.parentId ? { parentId: input.parentId } : {})
    }
  };
  return transport(ISSUE_CREATE_MUTATION, variables, apiKey);
}

// $teamId MUST be declared ID! (not String!) — it feeds TeamFilter.id, an
// IDComparator, whose `eq` field is typed ID in Linear's schema. A live
// smoke test against the real API caught this: a String! declaration here
// fails with 'Variable "$teamId" of type "String!" used in position
// expecting type "ID"' (mock-transport tests can't catch a variable-type
// mismatch, since mocks never validate the query against a real schema).
const WORKFLOW_STATE_BY_NAME_QUERY = `
  query WorkflowStateByName($teamId: ID!, $name: String!) {
    workflowStates(filter: { team: { id: { eq: $teamId } }, name: { eq: $name } }) {
      nodes { id name }
    }
  }
`;

/** Look up a team's workflow state id by its display name (e.g. "In Progress"). */
export async function fetchWorkflowStateByName(
  transport: LinearTransport,
  apiKey: string,
  teamId: string,
  name: string
): Promise<LinearGraphQLResult> {
  return transport(WORKFLOW_STATE_BY_NAME_QUERY, { teamId, name }, apiKey);
}

const ISSUE_UPDATE_STATE_MUTATION = `
  mutation IssueUpdateState($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue { id state { id name } }
    }
  }
`;

/** issueUpdate mutation restricted to a workflow-state transition. */
export async function updateIssueState(
  transport: LinearTransport,
  apiKey: string,
  issueId: string,
  stateId: string
): Promise<LinearGraphQLResult> {
  return transport(ISSUE_UPDATE_STATE_MUTATION, { id: issueId, input: { stateId } }, apiKey);
}

const COMMENT_CREATE_MUTATION = `
  mutation CommentCreate($input: CommentCreateInput!) {
    commentCreate(input: $input) {
      success
      comment { id }
    }
  }
`;

/** commentCreate mutation against an existing issue. */
export async function createComment(
  transport: LinearTransport,
  apiKey: string,
  issueId: string,
  body: string
): Promise<LinearGraphQLResult> {
  return transport(COMMENT_CREATE_MUTATION, { input: { issueId, body } }, apiKey);
}

/** Human-readable failure summary for warn logging — never includes the API key. */
export function describeGraphQLFailure(result: LinearGraphQLResult): string {
  if (result.errors && result.errors.length > 0) {
    return result.errors.map((e: any) => e?.message ?? String(e)).join("; ");
  }
  return `HTTP ${result.status}`;
}
