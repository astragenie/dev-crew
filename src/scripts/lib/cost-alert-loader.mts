import fs from "node:fs/promises";
import path from "node:path";

const COST_INSIGHTS_DIR_PARTS = [".claude", "artifacts", "crew", "cost-insights"];

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

function extractHighSeverityFindings(body) {
  const findings: any[] = [];
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^###\s+\[HIGH\]\s+([\w-]+)/i);
    if (m) {
      findings.push({ id: m[1], severity: "high" });
    }
  }
  return findings;
}

async function loadCostAdviseFiles(repoPath, limit = 20) {
  const dir = path.join(repoPath, ...COST_INSIGHTS_DIR_PARTS);
  const files: any[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  for (const e of entries) {
    if (/-cost-advise-.+\.md$/.test(e)) files.push({ dir, name: e });
  }
  files.sort((a, b) => b.name.localeCompare(a.name));
  const top = files.slice(0, limit);
  const results: any[] = [];
  for (const { dir: d, name } of top) {
    const f = path.join(d, name);
    try {
      const text = await fs.readFile(f, "utf8");
      const { fm, body } = await parseFrontmatter(text);
      results.push({ path: f, fm: fm || {}, body });
    } catch {
      /* skip unreadable / malformed files silently */
    }
  }
  return results;
}

export async function getHighSeverityCostAlerts(repoPath, windowSlices = 3) {
  const adviseFiles = await loadCostAdviseFiles(repoPath, windowSlices);
  const alerts: any[] = [];
  for (const file of adviseFiles) {
    const findings = extractHighSeverityFindings(file.body);
    for (const f of findings) {
      alerts.push({
        id: f.id,
        severity: f.severity,
        reportPath: file.path,
        slice: file.fm.run_title || file.fm.slice || null
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
