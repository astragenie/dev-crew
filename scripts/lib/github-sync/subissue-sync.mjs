import { defaultGhExec } from "./gh.mjs";
import { ensureLabels } from "./issue-sync.mjs";

function objectiveFromBody(body) {
  const section = (body || "").split("## Objective")[1] || "";
  const line = section.split("\n").find((l) => l.trim().length > 0);
  return (line || "").trim();
}

function issueNumberFromUrl(url) {
  return parseInt(url.trim().split("/").pop(), 10);
}

export function createSliceIssue(repo, slice, { ghExec = defaultGhExec } = {}) {
  if (slice.frontmatter?.github_issue) return slice.frontmatter.github_issue;
  ensureLabels(repo, { ghExec });
  const title = `${slice.id}: ${objectiveFromBody(slice.body)}`;
  const acSection = (slice.body || "").split("## Acceptance criteria")[1] || "";
  const bodyText = `## Acceptance criteria\n${acSection.split("##")[0]}`.trim();
  const url = ghExec([
    "issue",
    "create",
    "--repo",
    repo,
    "--title",
    title,
    "--body",
    bodyText,
    "--label",
    "slice,status:pending"
  ]);
  return issueNumberFromUrl(url);
}

export function attachSubIssue(repo, parentNumber, childNumber, { ghExec = defaultGhExec } = {}) {
  // gh issue view --json id returns the node_id (string), not the numeric database id.
  // Use the REST API endpoint to get the numeric id field.
  const { id: childId } = JSON.parse(ghExec(["api", `repos/${repo}/issues/${childNumber}`]));
  ghExec([
    "api",
    `repos/${repo}/issues/${parentNumber}/sub_issues`,
    "--method",
    "POST",
    "-H",
    "X-GitHub-Api-Version: 2026-03-10",
    "-F",
    `sub_issue_id=${childId}`
  ]);
}

export function closeSliceIssue(repo, issueNumber, { ghExec = defaultGhExec } = {}) {
  ghExec(["issue", "close", String(issueNumber), "--repo", repo]);
  ghExec([
    "issue",
    "edit",
    String(issueNumber),
    "--repo",
    repo,
    "--add-label",
    "status:completed",
    "--remove-label",
    "status:pending",
    "--remove-label",
    "status:in-progress"
  ]);
}
