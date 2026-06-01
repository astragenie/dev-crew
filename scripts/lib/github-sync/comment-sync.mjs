import { defaultGhExec } from "./gh.mjs";

export function buildSliceComment({
  sliceId,
  objective,
  validationSatisfied,
  reviewStatus,
  costStr,
  artifactPath
}) {
  const outcome = validationSatisfied ? "✅ Validation passed" : "❌ Validation failed";
  const lines = [
    `## ${sliceId} Complete — ${objective}`,
    "",
    `**Outcome:** ${outcome}`,
    "",
    `**Review:** ${reviewStatus || "N/A"}`
  ];
  if (costStr) lines.push(`**Cost:** ${costStr}`);
  if (artifactPath) lines.push(`**Artifacts:** \`${artifactPath}\``);
  return lines.join("\n");
}

export function postComment(repo, issueNumber, body, { ghExec = defaultGhExec } = {}) {
  ghExec(["issue", "comment", String(issueNumber), "--repo", repo, "--body", body]);
}
