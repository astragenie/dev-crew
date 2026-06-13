import { listBacklog, filterBacklog, comparePickOrder } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";
import { listGrades, SCORE_DIMENSIONS } from "./grade-parser.mjs";
import { listDecisions } from "./decisions-store.mjs";
import { detectPatterns } from "./pattern-alerts.mjs";
import { readEvents } from "./telemetry.mjs";
import { readCrewBlockingGates } from "./crew-workflow-reader.mjs";
import { checkCostRegression } from "./cost-regression.mjs";
import { checkSessionDrift } from "./session-drift.mjs";
import { recentLearnings } from "./learnings.mjs";
import { computeConfidence } from "./confidence-signal.mjs";

// Standalone loop situational report. Complements crew's brief-me;
// surfaces backlog/specs/grades/decisions/alerts without modifying the
// crew plugin. Designed to be called as part of /loop:brief.

function avg(values: unknown[]) {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(3));
}

function computeGradeSignal(grades: Record<string, any>[]) {
  const recentGrades = grades.slice(-5);
  const scoreSnapshot: Record<string, unknown> = {};
  for (const dim of SCORE_DIMENSIONS) {
    scoreSnapshot[dim] = avg(recentGrades.map((g: Record<string, any>) => g.scores?.[dim]));
  }
  return {
    total: grades.length,
    lastFive: recentGrades.map((g: Record<string, any>) => ({
      slice: g.frontmatter.slice,
      avg: avg(SCORE_DIMENSIONS.map((d) => g.scores?.[d]))
    })),
    avgRecent: avg(
      recentGrades.map((g: Record<string, any>) => avg(SCORE_DIMENSIONS.map((d) => g.scores?.[d])))
    ),
    perDimensionRecent: scoreSnapshot
  };
}

// Derive the sliceStartConfidence block for the top triaged feature.
// acCount is sentinel 2 — slice body not parsed at brief time (see AC-003 of FEAT-085).
// Using 2 avoids triggering the acCount===0 and acCount<2 red branches, preserving
// meaningful green/yellow/red signal driven by autonomousSafe and dependsOnCount only.
function deriveSliceStartConfidence(
  topTriagedRaw: Record<string, any>[],
  gradeAvgRecent: number | null
): {
  featureId: string | null;
  confidence: "green" | "yellow" | "red" | null;
  reason: string | null;
} | null {
  const top = topTriagedRaw[0];
  if (!top) return null;
  const autonomousSafe: boolean | null = top.frontmatter.autonomous_safe ?? null;
  const dependsOnCount: number = Array.isArray(top.frontmatter.depends_on)
    ? top.frontmatter.depends_on.length
    : 0;
  const result = computeConfidence({
    autonomousSafe,
    acCount: 2,
    recentGradeAvg: gradeAvgRecent,
    dependsOnCount
  });
  return { featureId: top.id as string, confidence: result.confidence, reason: result.reason };
}

// Count how many warn alerts would be demoted under current autoMode + ignoredCategories config.
function countDemotedAlerts(alerts: any[], config: any): number {
  const autoMode = config?.loop?.autoMode ?? config?.loop?.marathonMode ?? true;
  if (!autoMode) return 0;
  const ignoredCategories: string[] = config?.loop?.warnAlertCategoriesIgnoredInAutoMode ?? [
    "score-trend"
  ];
  return alerts.filter((a) => a.severity === "warn" && ignoredCategories.includes(a.category))
    .length;
}

export async function buildBrief(
  repoPath: string,
  { config = null }: { config?: Record<string, any> | null } = {}
) {
  const [
    backlog,
    specs,
    grades,
    decisions,
    alerts,
    recentEvents,
    crewGates,
    costRegression,
    sessionDrift
  ] = await Promise.all([
    listBacklog(repoPath, { config }),
    listSpecs(repoPath, { config }),
    listGrades(repoPath, { config }),
    listDecisions(repoPath, { config }),
    detectPatterns(repoPath, { config }),
    readEvents(repoPath, { limit: 10 }),
    readCrewBlockingGates(repoPath),
    checkCostRegression(repoPath, config as Record<string, any> | null),
    checkSessionDrift(repoPath)
  ]);

  let learningsDigest: string | null = null;
  try {
    const lr = await recentLearnings(repoPath, 3);
    learningsDigest = lr.digest;
  } catch {
    // store absent or corrupt; digest stays null
  }

  const backlogCounts = {
    pending: filterBacklog(backlog, { status: "pending" }).length,
    triaged: filterBacklog(backlog, { status: "triaged" }).length,
    in_progress: filterBacklog(backlog, { status: "in-progress" }).length,
    done: filterBacklog(backlog, { status: "done" }).length
  };

  // Top 3 highest-priority triaged features — priority asc, then FEAT-NNN asc.
  const topTriagedRaw = filterBacklog(backlog, { status: "triaged" })
    .sort(comparePickOrder)
    .slice(0, 3);

  const topTriaged = topTriagedRaw.map((f: Record<string, any>) => ({
    id: f.id,
    priority: f.frontmatter.priority,
    category: f.frontmatter.category,
    target_release: f.frontmatter.target_release,
    derived_from: f.frontmatter.derived_from || null
  }));

  // In-flight features (in-progress) — caller acts on these next
  const inFlight = filterBacklog(backlog, { status: "in-progress" }).map(
    (f: Record<string, any>) => ({
      id: f.id,
      slices: f.frontmatter.slices || [],
      priority: f.frontmatter.priority
    })
  );

  // Compute grade signal first so avgRecent is available for confidence
  const gradeSignal = computeGradeSignal(grades);

  const sliceStartConfidence = deriveSliceStartConfidence(topTriagedRaw, gradeSignal.avgRecent);

  // Spec flow: approved + undecomposed
  const specsToDecompose = specs
    .filter(
      (s: Record<string, any>) =>
        s.frontmatter.status === "approved" &&
        (!Array.isArray(s.frontmatter.derived_features) ||
          s.frontmatter.derived_features.length === 0)
    )
    .map((s: Record<string, any>) => ({
      id: s.id,
      type: s.frontmatter.type,
      title: s.frontmatter.title
    }));

  return {
    backlogCounts,
    topTriaged,
    inFlight,
    specsToDecompose,
    sliceStartConfidence,
    grades: gradeSignal,
    decisions: {
      total: decisions.length,
      accepted: decisions.filter((d) => d.status === "accepted").length,
      superseded: decisions.filter((d) => d.status === "superseded").length,
      reverted: decisions.filter((d) => d.status === "reverted").length
    },
    alerts,
    warnAlertsDemoted: countDemotedAlerts(alerts, config),
    recentEvents: recentEvents.map((e) => ({
      timestamp: e.timestamp,
      command: e.command,
      summary: e.slice || e.feature || e.version || null
    })),
    crewGates: {
      blocked: crewGates.blocked
        ? { note: crewGates.blocked.note || null, blockedBy: crewGates.blocked.blockedBy || null }
        : null,
      escalated: crewGates.escalated ? { note: crewGates.escalated.note || null } : null
    },
    costRegression: costRegression
      ? {
          triggered: costRegression.triggered,
          currentUsd: costRegression.currentUsd,
          medianUsd: costRegression.medianUsd,
          thresholdUsd: costRegression.thresholdUsd,
          multiplier: costRegression.multiplier,
          window: costRegression.window,
          sampleCount: costRegression.sampleCount,
          slice: costRegression.slice
        }
      : null,
    sessionDrift: sessionDrift
      ? {
          triggered: sessionDrift.triggered,
          sessionIdAtStart: sessionDrift.sessionIdAtStart,
          sessionIdNow: sessionDrift.sessionIdNow
        }
      : null,
    learningsDigest
  };
}
