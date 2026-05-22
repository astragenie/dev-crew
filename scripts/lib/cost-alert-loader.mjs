import fs from "node:fs/promises";
import path from "node:path";

// Load and parse cost reports to detect high-severity alerts.
// Cost reports live in crew artifacts under .claude/artifacts/crew/cost/ and
// .claude/artifacts/crew/runs/ (legacy). Reads frontmatter for severity signals
// or scans body for "high" severity markers in recommendation text.

const COST_DIR_PARTS = [".claude", "artifacts", "crew", "cost"];
const LEGACY_COST_DIR_PARTS = [".claude", "artifacts", "crew", "runs"];

async function parseFrontmatter(text) {
  if (!text.startsWith("---")) return { fm: null, body: text };
  const end = text.indexOf("\n---", 3);
  if (end < 0) return { fm: null, body: text };
  const block = text.slice(3, end).trim();
  const body = text.slice(end + 4);
  const fm = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([\w_]+):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) {
      try {
        v = JSON.parse(v);
      } catch {
        /* keep raw string on parse failure */
      }
    }
    fm[m[1]] = v;
  }
  return { fm, body };
}

// Parse cost report body to extract recommendations with severity indicators.
// Looks for lines with high-severity markers, scanning for patterns like:
// "- cache-busted: ... (high)"
// "- opus-overuse: ... (high)"
// etc.
function extractHighSeverityRecommendations(body) {
  const recommendations = [];
  // Match lines with recommendation IDs followed by severity in parentheses
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    // Match patterns like "- rule-id: message (high)"
    const m = line.match(/^-\s+(\w+(?:-\w+)*):.*\(high\)/i);
    if (m) {
      recommendations.push({
        id: m[1],
        severity: "high"
      });
    }
  }
  return recommendations;
}

// Load the most recent cost reports (up to limit) from cost/ and legacy runs/ dirs.
async function loadCostReports(repoPath, limit = 20) {
  const dirs = [
    path.join(repoPath, ...COST_DIR_PARTS),
    path.join(repoPath, ...LEGACY_COST_DIR_PARTS)
  ];
  const files = [];
  for (const dir of dirs) {
    let entries;
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const e of entries) {
      if (/-cost-report-.+\.md$/.test(e)) files.push({ dir, name: e });
    }
  }
  // Sort by basename desc (newest first via timestamp prefix).
  files.sort((a, b) => b.name.localeCompare(a.name));
  const top = files.slice(0, limit);
  const reports = [];
  for (const { dir, name } of top) {
    const f = path.join(dir, name);
    try {
      const text = await fs.readFile(f, "utf8");
      const { fm, body } = await parseFrontmatter(text);
      reports.push({ path: f, fm: fm || {}, body });
    } catch {
      /* skip unreadable / malformed report files silently */
    }
  }
  return reports;
}

// Get high-severity cost alerts from the most recent N reports.
// Returns array of { id, severity, reportPath, slice } for each high-severity alert found.
export async function getHighSeverityCostAlerts(repoPath, windowSlices = 3) {
  const reports = await loadCostReports(repoPath, windowSlices);
  const alerts = [];
  for (const report of reports) {
    const recs = extractHighSeverityRecommendations(report.body);
    for (const rec of recs) {
      alerts.push({
        id: rec.id,
        severity: rec.severity,
        reportPath: report.path,
        slice: report.fm.slice || null
      });
    }
  }
  return alerts;
}

// Count high-severity cost alerts across recent reports.
// Used by checkStopConditions to decide whether to halt.
export async function countHighSeverityCostAlerts(repoPath, windowSlices = 3) {
  const alerts = await getHighSeverityCostAlerts(repoPath, windowSlices);
  return alerts.filter((a) => a.severity === "high").length;
}
