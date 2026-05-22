import fs from "node:fs/promises";
import path from "node:path";

import { listGrades, SCORE_DIMENSIONS } from "./grade-parser.mjs";
import { listDecisions } from "./decisions-store.mjs";
import { listBacklog } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";

// Aggregates grades + decisions + backlog over a time window into a markdown
// retrospective at docs/retrospectives/YYYY-MM-DD.md. Pure read + filter +
// format — no LLM call. Caller passes the date range.
//
// Two filter modes:
//   { since: "YYYY-MM-DD" }            absolute lower bound
//   { spanDays: N }                    rolling N days back from today

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function withinWindow(itemDate, sinceDate, untilDate) {
  if (!itemDate) return false;
  const d = parseDate(itemDate);
  if (!d) return false;
  if (sinceDate && d < sinceDate) return false;
  if (untilDate && d > untilDate) return false;
  return true;
}

function avg(values) {
  const nums = values.filter((v) => typeof v === "number");
  if (nums.length === 0) return null;
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(3));
}

function topRepeats(strings, limit = 5) {
  // Counts repeated lessons / surprises / followups via token-shingle similarity.
  // For MVP: exact-prefix match on the first 40 chars (case-insensitive).
  const counts = new Map();
  for (const s of strings) {
    if (!s) continue;
    const key = s.trim().toLowerCase().slice(0, 40);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted
    .slice(0, limit)
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count }));
}

function parseListSection(body, sectionHeader) {
  const items = [];
  const lines = body.split("\n");
  let inSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (new RegExp(`^##\\s+${sectionHeader}\\b`, "i").test(trimmed)) {
      inSection = true;
      continue;
    }
    if (inSection && /^##\s+/.test(trimmed)) break;
    if (!inSection) continue;
    const m = trimmed.match(/^-\s+(.+)$/);
    if (m && m[1].trim()) items.push(m[1].trim());
  }
  return items;
}

export async function buildRetrospective(
  repoPath,
  { since = null, spanDays = null, until = null, config = null } = {}
) {
  const untilStr = until || todayIso();
  let sinceStr = since;
  if (!sinceStr && spanDays) {
    const d = new Date(untilStr);
    d.setDate(d.getDate() - Number(spanDays));
    sinceStr = d.toISOString().slice(0, 10);
  }
  const sinceDate = sinceStr ? parseDate(sinceStr) : null;
  const untilDate = parseDate(untilStr);

  const [grades, decisions, backlog, specs] = await Promise.all([
    listGrades(repoPath, { config }),
    listDecisions(repoPath, { config }),
    listBacklog(repoPath, { config }),
    listSpecs(repoPath, { config })
  ]);

  // Filter to window using frontmatter graded_at / introduced_at / updated / completed_at
  const gradesInWindow = grades.filter((g) =>
    withinWindow(g.frontmatter.graded_at, sinceDate, untilDate)
  );
  const decisionsInWindow = decisions.filter((d) =>
    withinWindow(d.introduced_at, sinceDate, untilDate)
  );

  // Score averages per dimension
  const scoreAverages = {};
  for (const dim of SCORE_DIMENSIONS) {
    scoreAverages[dim] = avg(gradesInWindow.map((g) => g.scores?.[dim]));
  }
  const dimensionsBelowThreshold = SCORE_DIMENSIONS.filter((dim) => {
    const v = scoreAverages[dim];
    return v !== null && v < 0.8;
  });

  // Aggregate lessons / surprises / followups from grade bodies
  const allLessons = gradesInWindow.flatMap((g) => parseListSection(g.body, "Lessons"));
  const allSurprises = gradesInWindow.flatMap((g) => parseListSection(g.body, "Surprises"));
  const allFollowups = gradesInWindow.flatMap((g) => parseListSection(g.body, "Followups"));

  // Slice cadence: graded_at distribution
  const cadenceCount = gradesInWindow.length;

  // Backlog flow during window: features that moved in / out
  const movedToDone = backlog.filter(
    (f) =>
      f.state === "done" &&
      withinWindow(f.frontmatter.completed_at || f.frontmatter.updated, sinceDate, untilDate)
  );

  // Specs satisfied in window (status changed to satisfied — coarse: just count)
  const specsSatisfied = specs.filter((s) => s.frontmatter.status === "satisfied");

  return {
    range: { since: sinceStr, until: untilStr },
    counts: {
      gradesInWindow: gradesInWindow.length,
      decisionsInWindow: decisionsInWindow.length,
      featuresDoneInWindow: movedToDone.length,
      specsSatisfied: specsSatisfied.length
    },
    scoreAverages,
    dimensionsBelowThreshold,
    topLessons: topRepeats(allLessons),
    topSurprises: topRepeats(allSurprises),
    topFollowups: topRepeats(allFollowups),
    decisionsList: decisionsInWindow.map((d) => ({
      id: d.id,
      title: d.title,
      slice: d.introduced_by_slice
    })),
    gradesList: gradesInWindow.map((g) => ({
      slice: g.frontmatter.slice,
      feature: g.frontmatter.feature,
      avg: avg(SCORE_DIMENSIONS.map((d) => g.scores?.[d])),
      gradedAt: g.frontmatter.graded_at
    })),
    cadenceSlicesPerWeek:
      cadenceCount > 0 && sinceDate
        ? Number(
            (
              cadenceCount / Math.max(1, (untilDate - sinceDate) / (7 * 24 * 60 * 60 * 1000))
            ).toFixed(2)
          )
        : null
  };
}

function renderRetroSummary(report) {
  const lines = [
    "## Summary",
    `- Slices graded: ${report.counts.gradesInWindow}`,
    `- Decisions captured: ${report.counts.decisionsInWindow}`,
    `- Features shipped (moved to done): ${report.counts.featuresDoneInWindow}`,
    `- Specs satisfied: ${report.counts.specsSatisfied}`
  ];
  if (report.cadenceSlicesPerWeek !== null) {
    lines.push(`- Cadence: ${report.cadenceSlicesPerWeek} slices/week`);
  }
  lines.push("");
  return lines;
}

function renderRetroScores(report) {
  const out = ["## Score averages"];
  for (const [dim, value] of Object.entries(report.scoreAverages)) {
    const flag = report.dimensionsBelowThreshold.includes(dim) ? " ⚠ below 0.80" : "";
    out.push(`- ${dim}: ${value === null ? "n/a" : value}${flag}`);
  }
  out.push("");
  return out;
}

function renderRetroDimensionGaps(report) {
  if (report.dimensionsBelowThreshold.length === 0) return [];
  const out = ["## Improvement opportunities"];
  for (const dim of report.dimensionsBelowThreshold) {
    out.push(
      `- **${dim}** below threshold — consider authoring a SPEC (type=sre or type=adr) addressing the systemic gap.`
    );
  }
  out.push("");
  return out;
}

function renderRetroTopList(heading, items) {
  if (items.length === 0) return [];
  const out = [`## ${heading}`];
  for (const { key, count } of items) {
    out.push(`- (${count}×) ${key}`);
  }
  out.push("");
  return out;
}

function renderRetroDecisions(report) {
  if (report.decisionsList.length === 0) return [];
  const out = ["## Decisions made"];
  for (const d of report.decisionsList) {
    out.push(`- **${d.id}**: ${d.title} _(from ${d.slice || "n/a"})_`);
  }
  out.push("");
  return out;
}

function renderRetroGrades(report) {
  if (report.gradesList.length === 0) return [];
  const out = ["## Slices graded"];
  for (const g of report.gradesList) {
    out.push(
      `- **${g.slice}** (avg ${g.avg ?? "n/a"}) ${g.feature ? `← ${g.feature}` : ""} on ${g.gradedAt}`
    );
  }
  out.push("");
  return out;
}

function renderMarkdown(report) {
  return [
    `# Retrospective ${report.range.since ?? "(all time)"} → ${report.range.until}`,
    "",
    ...renderRetroSummary(report),
    ...renderRetroScores(report),
    ...renderRetroDimensionGaps(report),
    ...renderRetroTopList("Top recurring lessons", report.topLessons),
    ...renderRetroTopList("Top recurring surprises", report.topSurprises),
    ...renderRetroTopList("Outstanding followups", report.topFollowups),
    ...renderRetroDecisions(report),
    ...renderRetroGrades(report)
  ].join("\n");
}

export async function writeRetrospective(repoPath, options = {}) {
  const report = await buildRetrospective(repoPath, options);
  const md = renderMarkdown(report);
  const dir = path.join(repoPath, "docs", "retrospectives");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${report.range.until}.md`;
  const target = path.join(dir, filename);
  await fs.writeFile(target, md);
  return { artifactPath: target, report };
}
