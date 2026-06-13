// gh-reply-formatter.mts
// Formats a structured reply for posting back to a GitHub PR comment.
//
// The reply is a compact Markdown block:
//   - verdict tag (PASS / FAIL / needs-info)
//   - first 200 chars of the summary
//   - relative GitHub link to the artifact
//
// Total reply length ≤ 1000 chars (enforced by truncation + link budget).
//
// Export surface:
//   formatReply(verdict, summary, artifactPath): string

export type Verdict = "PASS" | "FAIL" | "needs-info";

const SUMMARY_MAX = 200;
const REPLY_MAX = 1000;

const VERDICT_EMOJI: Record<Verdict, string> = {
  PASS: "✅",
  FAIL: "❌",
  "needs-info": "❓"
};

/**
 * Format a review reply for posting to a GitHub PR comment thread.
 *
 * @param verdict      — PASS | FAIL | needs-info
 * @param summary      — human-readable summary (truncated to 200 chars)
 * @param artifactPath — repo-relative path to the artifact (e.g. ".claude/artifacts/...")
 * @returns            — Markdown reply ≤ 1000 chars
 */
export function formatReply(verdict: Verdict, summary: string, artifactPath: string): string {
  const icon = VERDICT_EMOJI[verdict];
  const verdictLine = `**${icon} ${verdict}**`;

  const truncatedSummary = typeof summary === "string" ? summary.slice(0, SUMMARY_MAX) : "";
  const summaryLine = truncatedSummary.length > 0 ? truncatedSummary : "(no summary provided)";

  // Relative GitHub link: blob/HEAD/<artifactPath>
  const linkPath = sanitizeArtifactPath(artifactPath);
  const link = `[View artifact](.../${linkPath})`;

  const body = [verdictLine, "", summaryLine, "", link].join("\n");

  // Hard cap at REPLY_MAX — trim from summary if needed.
  if (body.length <= REPLY_MAX) return body;
  return trimToMax(verdictLine, truncatedSummary, link);
}

function sanitizeArtifactPath(raw: string): string {
  if (typeof raw !== "string") return "";
  // Normalise backslashes → forward slashes, strip leading slash.
  return raw.replace(/\\/g, "/").replace(/^\/+/, "");
}

function trimToMax(verdictLine: string, summary: string, link: string): string {
  // Budget: verdictLine + newlines + link + separators
  const overhead = verdictLine.length + "\n\n".length + "\n\n".length + link.length;
  const budget = Math.max(0, REPLY_MAX - overhead);
  const trimmed = summary.slice(0, budget);
  return [verdictLine, "", trimmed, "", link].join("\n");
}
