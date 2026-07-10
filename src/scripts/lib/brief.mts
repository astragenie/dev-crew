import { listBacklog, filterBacklog, comparePickOrder } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";
import { listGrades, SCORE_DIMENSIONS } from "./grade-parser.mjs";
import { listDecisions } from "./decisions-store.mjs";
import { detectPatterns } from "./pattern-alerts.mjs";
import { readEvents } from "./telemetry.mjs";
import { readCrewBlockingGates } from "./crew-workflow-reader.mjs";
import { evaluateBlockedBadgeStaleness } from "./blocked-badge-staleness.mjs";
import { checkCostRegression } from "./cost-regression.mjs";
import { checkSessionDrift } from "./session-drift.mjs";
import { computeConfidence } from "./confidence-signal.mjs";
import { recentLearnings } from "./learnings.mjs";

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

// Compute confidence signal for the top triaged item; null when backlog is empty.
// acCount sentinel 2: avoids the acCount===0 red branch at brief time (slice not parsed).
function computeSliceStartConfidence(
  topTriagedRaw: Record<string, any>[],
  gradeSignal: ReturnType<typeof computeGradeSignal>
): {
  featureId: string | null;
  confidence: "green" | "yellow" | "red" | null;
  reason: string | null;
} | null {
  if (topTriagedRaw.length === 0) return null;
  const top = topTriagedRaw[0] as Record<string, any>;
  const autonomousSafe: boolean | null = top.frontmatter.autonomous_safe ?? null;
  const dependsOnCount: number = Array.isArray(top.frontmatter.depends_on)
    ? top.frontmatter.depends_on.length
    : 0;
  const result = computeConfidence({
    autonomousSafe,
    acCount: 2,
    recentGradeAvg: gradeSignal.avgRecent,
    dependsOnCount
  });
  return { featureId: top.id as string, confidence: result.confidence, reason: result.reason };
}

// Fetch top-3 learnings digest; returns null when store is absent or corrupt.
async function fetchLearningsDigest(repoPath: string): Promise<string | null> {
  try {
    const lr = await recentLearnings(repoPath, 3);
    return lr.digest;
  } catch {
    return null;
  }
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

// A stale `blocked` badge (QW3 staleness policy) is not an active blocker —
// the loop and complete-slice ceremony both downgrade it to a warning. The
// brief must not misreport it as a live block; instead it's surfaced with an
// explicit STALE marker so the operator knows it isn't being enforced.
function formatBlockedBadgeNote(
  badge: Record<string, any>,
  staleness: ReturnType<typeof evaluateBlockedBadgeStaleness>
): string | null {
  const note = badge.note || null;
  if (!staleness.stale) return note;
  const ageDays = staleness.ageDays !== null ? staleness.ageDays.toFixed(1) : "unknown";
  return `blocked badge (STALE, ${ageDays}d old — not enforcing): ${note ?? "(no note)"}`;
}

function buildBlockedGateSnapshot(
  badge: Record<string, any> | null,
  config: Record<string, any> | null
): {
  note: string | null;
  blockedBy: string | null;
  stale: boolean;
  ageDays: number | null;
} | null {
  if (!badge) return null;
  const staleness = evaluateBlockedBadgeStaleness(badge, config);
  return {
    note: formatBlockedBadgeNote(badge, staleness),
    blockedBy: badge.blockedBy || null,
    stale: staleness.stale,
    ageDays: staleness.ageDays
  };
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

  const sliceStartConfidence = computeSliceStartConfidence(topTriagedRaw, gradeSignal);

  const learningsDigest = await fetchLearningsDigest(repoPath);

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
      blocked: buildBlockedGateSnapshot(crewGates.blocked, config),
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
