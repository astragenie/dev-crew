import { defaultGhExec } from "./gh.mjs";

const LABEL_DEFS = [
  { name: "priority:P0", color: "b60205", description: "Highest priority" },
  { name: "priority:P1", color: "d93f0b", description: "High priority" },
  { name: "priority:P2", color: "e4e669", description: "Medium priority" },
  { name: "priority:P3", color: "fef2c0", description: "Low priority" },
  { name: "status:pending", color: "cccccc", description: "Not yet started" },
  { name: "status:in-progress", color: "0075ca", description: "Currently in progress" },
  { name: "status:done", color: "0e8a16", description: "Feature complete" },
  { name: "status:completed", color: "0e8a16", description: "Slice completed" },
  { name: "category:tech-debt", color: "e4e669", description: "" },
  { name: "category:integration", color: "7057ff", description: "" },
  { name: "category:telemetry", color: "008672", description: "" },
  { name: "autonomous-safe", color: "006b75", description: "Safe for autonomous loop" },
  { name: "slice", color: "bfd4f2", description: "Slice sub-issue" }
];

export function ensureLabels(repo, { ghExec = defaultGhExec } = {}) {
  const existing = JSON.parse(
    ghExec(["label", "list", "--repo", repo, "--json", "name", "--limit", "100"])
  );
  const existingNames = new Set(existing.map((l) => l.name));
  for (const { name, color, description } of LABEL_DEFS) {
    if (existingNames.has(name)) continue;
    ghExec([
      "label",
      "create",
      name,
      "--repo",
      repo,
      "--color",
      color,
      "--description",
      description
    ]);
  }
}

function buildLabels(frontmatter) {
  const labels = [];
  if (frontmatter.priority) labels.push(`priority:${frontmatter.priority}`);
  labels.push("status:pending");
  if (frontmatter.category) labels.push(`category:${frontmatter.category}`);
  if (frontmatter.autonomous_safe) labels.push("autonomous-safe");
  return labels;
}

// GitHub rejects issue titles longer than 256 characters (GraphQL createIssue).
const MAX_TITLE_LENGTH = 256;

export function truncateTitle(title) {
  if (title.length <= MAX_TITLE_LENGTH) return title;
  return `${title.slice(0, MAX_TITLE_LENGTH - 1)}…`;
}

function extractFirstDescriptionLine(body) {
  const section = body.split("## Description")[1] || "";
  const line = section.split("\n").find((l) => l.trim().length > 0);
  return (line || "").trim();
}

function issueNumberFromUrl(url) {
  return parseInt(url.trim().split("/").pop(), 10);
}

function ensureLabelExists(repo, name, ghExec) {
  try {
    const existing = JSON.parse(
      ghExec(["label", "list", "--repo", repo, "--json", "name", "--limit", "200"])
    );
    if (!existing.some((l) => l.name === name)) {
      ghExec(["label", "create", name, "--repo", repo, "--color", "ededed", "--description", ""]);
    }
  } catch {
    // best-effort
  }
}

export function createFeatureIssue(repo, feat, milestoneTitle, { ghExec = defaultGhExec } = {}) {
  if (feat.frontmatter?.github_issue) return feat.frontmatter.github_issue;
  ensureLabels(repo, { ghExec });
  const labels = buildLabels(feat.frontmatter || {});
  const knownNames = new Set(LABEL_DEFS.map((l) => l.name));
  labels.filter((l) => !knownNames.has(l)).forEach((l) => ensureLabelExists(repo, l, ghExec));
  const title = truncateTitle(`${feat.id}: ${extractFirstDescriptionLine(feat.body)}`);
  const args = [
    "issue",
    "create",
    "--repo",
    repo,
    "--title",
    title,
    "--body",
    feat.body || "",
    "--label",
    labels.join(",")
  ];
  if (milestoneTitle) args.push("--milestone", String(milestoneTitle));
  const url = ghExec(args);
  return issueNumberFromUrl(url);
}

export function updateIssueStatus(repo, issueNumber, newStatus, { ghExec = defaultGhExec } = {}) {
  const statusLabels = ["status:pending", "status:in-progress", "status:done", "status:completed"];
  const removeArgs = statusLabels.flatMap((l) => ["--remove-label", l]);
  ghExec([
    "issue",
    "edit",
    String(issueNumber),
    "--repo",
    repo,
    "--add-label",
    `status:${newStatus}`,
    ...removeArgs
  ]);
}

export function closeIssue(repo, issueNumber, { ghExec = defaultGhExec } = {}) {
  ghExec(["issue", "close", String(issueNumber), "--repo", repo]);
}
