import fs from "node:fs/promises";
import path from "node:path";

import {
  listGrades,
  SCORE_DIMENSIONS,
  isAllZeroScores,
  detectPlaceholders
} from "./grade-parser.mjs";
import { listDecisions } from "./decisions-store.mjs";
import { listBacklog } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";
import { retroRoot } from "./paths.mjs";

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

function parseDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function withinWindow(
  itemDate: string | null | undefined,
  sinceDate: Date | null,
  untilDate: Date | null
) {
  if (!itemDate) return false;
  const d = parseDate(itemDate);
  if (!d) return false;
  if (sinceDate && d < sinceDate) return false;
  if (untilDate && d > untilDate) return false;
  return true;
}

/**
 * FEAT-145: Check if a grade is unfilled (all-zero scores or has placeholder text).
 */
function isUnfilledGrade(grade: Record<string, any>): boolean {
  if (isAllZeroScores(grade.scores || {})) {
    return true;
  }
  const placeholders = detectPlaceholders(grade.body || "");
  return placeholders.length > 0;
}

function avg(values: unknown[]) {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(3));
}

function topRepeats(strings: string[], limit = 5) {
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

function parseListSection(body: string, sectionHeader: string) {
  const items: any[] = [];
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
    if (m && (m[1] ?? "").trim()) items.push((m[1] ?? "").trim());
  }
  return items;
}

export async function buildRetrospective(
  repoPath: string,
  { since = null, spanDays = null, until = null, config = null }: Record<string, any> = {}
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
  const gradesInWindow = grades.filter((g: Record<string, any>) =>
    withinWindow(g.frontmatter.graded_at, sinceDate, untilDate)
  );
  const decisionsInWindow = decisions.filter((d) =>
    withinWindow(d.introduced_at, sinceDate, untilDate)
  );

  // FEAT-145: Exclude unfilled grades from score averaging
  const filledGradesInWindow = gradesInWindow.filter(
    (g: Record<string, any>) => !isUnfilledGrade(g)
  );

  // Score averages per dimension (only over filled grades)
  const scoreAverages: Record<string, number | null> = {};
  for (const dim of SCORE_DIMENSIONS) {
    scoreAverages[dim] = avg(filledGradesInWindow.map((g: Record<string, any>) => g.scores?.[dim]));
  }
  const dimensionsBelowThreshold = SCORE_DIMENSIONS.filter((dim: string) => {
    const v = scoreAverages[dim] ?? null;
    return v !== null && v < 0.8;
  });

  // Aggregate lessons / surprises / followups from grade bodies (only from filled grades)
  const allLessons = filledGradesInWindow.flatMap((g: Record<string, any>) =>
    parseListSection(g.body, "Lessons")
  );
  const allSurprises = filledGradesInWindow.flatMap((g: Record<string, any>) =>
    parseListSection(g.body, "Surprises")
  );
  const allFollowups = filledGradesInWindow.flatMap((g: Record<string, any>) =>
    parseListSection(g.body, "Followups")
  );

  // Slice cadence: graded_at distribution (only filled grades)
  const cadenceCount = filledGradesInWindow.length;

  // Backlog flow during window: features that moved in / out
  const movedToDone = backlog.filter(
    (f: Record<string, any>) =>
      f.state === "done" &&
      withinWindow(f.frontmatter.completed_at || f.frontmatter.updated, sinceDate, untilDate)
  );

  // Specs satisfied in window (status changed to satisfied — coarse: just count)
  const specsSatisfied = specs.filter(
    (s: Record<string, any>) => s.frontmatter.status === "satisfied"
  );

  return {
    range: { since: sinceStr, until: untilStr },
    counts: {
      gradesInWindow: filledGradesInWindow.length,
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
    gradesList: filledGradesInWindow.map((g: Record<string, any>) => ({
      slice: g.frontmatter.slice,
      feature: g.frontmatter.feature,
      avg: avg(SCORE_DIMENSIONS.map((d: string) => g.scores?.[d])),
      gradedAt: g.frontmatter.graded_at
    })),
    cadenceSlicesPerWeek:
      cadenceCount > 0 && sinceDate
        ? Number(
            (
              cadenceCount /
              Math.max(1, (untilDate!.getTime() - sinceDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
            ).toFixed(2)
          )
        : null
  };
}

function renderRetroSummary(report: Record<string, any>) {
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

function renderRetroScores(report: Record<string, any>) {
  const out = ["## Score averages"];
  for (const [dim, value] of Object.entries(report.scoreAverages)) {
    const flag = report.dimensionsBelowThreshold.includes(dim) ? " ⚠ below 0.80" : "";
    out.push(`- ${dim}: ${value === null ? "n/a" : value}${flag}`);
  }
  out.push("");
  return out;
}

function renderRetroDimensionGaps(report: Record<string, any>) {
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

function renderRetroTopList(heading: string, items: Array<Record<string, any>>) {
  if (items.length === 0) return [];
  const out = [`## ${heading}`];
  for (const { key, count } of items) {
    out.push(`- (${count}×) ${key}`);
  }
  out.push("");
  return out;
}

function renderRetroDecisions(report: Record<string, any>) {
  if (report.decisionsList.length === 0) return [];
  const out = ["## Decisions made"];
  for (const d of report.decisionsList) {
    out.push(`- **${d.id}**: ${d.title} _(from ${d.slice || "n/a"})_`);
  }
  out.push("");
  return out;
}

function renderRetroGrades(report: Record<string, any>) {
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

function renderMarkdown(report: Record<string, any>) {
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

export async function writeRetrospective(repoPath: string, options: Record<string, any> = {}) {
  const report = await buildRetrospective(repoPath, options);
  const md = renderMarkdown(report);
  const dir = retroRoot(repoPath, options.config || null);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${report.range.until}.md`;
  const target = path.join(dir, filename);
  await fs.writeFile(target, md);

  // FEAT-188 S1b: capture the retrospective's own findings — systemic
  // dimension gaps and undispositioned recurring lessons — into the
  // learnings store with zero operator action. Today `commands/retrospective.md`
  // ("Synthesis step") asks the dispatching agent to manually run
  // `/devcrew:learn` for each of these; this makes the persistence automatic
  // (the agent's synthesis/disposition judgment is unchanged — this only
  // guarantees the raw finding survives even if that follow-up is skipped).
  // Fire-and-forget: must never affect the retrospective artifact write.
  await captureRetrospectiveFindings(repoPath, report, options.config || null);

  return { artifactPath: target, report };
}

// FEAT-188 S1b: mirror retrospective-level findings into the persistent
// learnings store (reuses learnings.mts::logLearning — same store +
// astramem mirror grade-writer.mts already uses; no parallel capture
// mechanism). Dedup key is content-derived and scoped to the retro's own
// date range so re-running the same window is idempotent, while a NEW
// window (different `until`) gets fresh rows. Fail-silent: any error here
// must never affect the retrospective-write contract.
async function captureRetrospectiveFindings(
  repoPath: string,
  report: Record<string, any>,
  config: Record<string, any> | null
): Promise<void> {
  const until = report?.range?.until;
  if (!until) return;
  const dimensionGaps: string[] = Array.isArray(report.dimensionsBelowThreshold)
    ? report.dimensionsBelowThreshold
    : [];
  const recurringLessons: Array<{ key: string; count: number }> = Array.isArray(report.topLessons)
    ? report.topLessons.filter((item: { count: number }) => item.count >= 2)
    : [];
  if (dimensionGaps.length === 0 && recurringLessons.length === 0) return;

  try {
    const { isFeatureEnabled } = await import("./features-service.mjs");
    if (!isFeatureEnabled("learnings-capture", config)) return;

    const { logLearning, searchLearnings } = await import("./learnings.mjs");
    const { items: existing } = await searchLearnings(repoPath, `retro:${until}`);
    const existingKeys = new Set(existing.map((e: any) => e.key));

    await captureDimensionGaps(repoPath, report, until, dimensionGaps, existingKeys, logLearning);
    await captureRecurringLessons(repoPath, until, recurringLessons, existingKeys, logLearning);
  } catch {
    // swallow — capture is non-critical, must never break the retro write
  }
}

type LogLearningFn = (
  repoPath: string,
  entry: {
    key: string;
    insight: string;
    confidence?: number;
    source?: string;
    sliceId?: string;
    tags?: string[];
  }
) => Promise<unknown>;

async function captureDimensionGaps(
  repoPath: string,
  report: Record<string, any>,
  until: string,
  dimensionGaps: string[],
  existingKeys: Set<string>,
  logLearning: LogLearningFn
): Promise<void> {
  for (const dim of dimensionGaps) {
    const key = `retro:${until}:dimension-gap:${dim}`;
    if (existingKeys.has(key)) continue;
    const value = report.scoreAverages?.[dim];
    await logLearning(repoPath, {
      key,
      insight:
        `Retrospective ${report.range.since ?? "(all time)"} -> ${until}: "${dim}" averaged ` +
        `${value ?? "n/a"} across ${report.counts?.gradesInWindow ?? "?"} slices — below the 0.80 threshold.`,
      source: "retrospective",
      tags: ["retrospective", "dimension-gap", dim]
    });
  }
}

async function captureRecurringLessons(
  repoPath: string,
  until: string,
  recurringLessons: Array<{ key: string; count: number }>,
  existingKeys: Set<string>,
  logLearning: LogLearningFn
): Promise<void> {
  if (recurringLessons.length === 0) return;
  const { createHash } = await import("node:crypto");
  for (const lesson of recurringLessons) {
    const digest = createHash("sha1").update(lesson.key).digest("hex").slice(0, 8);
    const key = `retro:${until}:recurring-lesson:${digest}`;
    if (existingKeys.has(key)) continue;
    await logLearning(repoPath, {
      key,
      insight: `Retrospective ${until}: recurring lesson (${lesson.count}x) — "${lesson.key}". Needs disposition (process fix / backlog item / already-covered DEC).`,
      source: "retrospective",
      tags: ["retrospective", "recurring-lesson"]
    });
  }
}
