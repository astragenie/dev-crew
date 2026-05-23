import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
import { listSpecs } from "./spec-parser.mjs";
import { listGrades, SCORE_DIMENSIONS } from "./grade-parser.mjs";
import { listDecisions } from "./decisions-store.mjs";
import { detectPatterns } from "./pattern-alerts.mjs";
import { readEvents } from "./telemetry.mjs";
import { readCrewBlockingGates } from "./crew-workflow-reader.mjs";

// Standalone loop situational report. Complements crew's brief-me;
// surfaces backlog/specs/grades/decisions/alerts without modifying the
// crew plugin. Designed to be called as part of /loop:brief.

function avg(values) {
  const nums = values.filter((v) => typeof v === "number");
  if (nums.length === 0) return null;
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(3));
}

export async function buildBrief(repoPath, { config = null } = {}) {
  const [backlog, specs, grades, decisions, alerts, recentEvents, crewGates] = await Promise.all([
    listBacklog(repoPath, { config }),
    listSpecs(repoPath, { config }),
    listGrades(repoPath, { config }),
    listDecisions(repoPath, { config }),
    detectPatterns(repoPath, { config }),
    readEvents(repoPath, { limit: 10 }),
    readCrewBlockingGates(repoPath)
  ]);

  const backlogCounts = {
    pending: filterBacklog(backlog, { status: "pending" }).length,
    triaged: filterBacklog(backlog, { status: "triaged" }).length,
    in_progress: filterBacklog(backlog, { status: "in-progress" }).length,
    done: filterBacklog(backlog, { status: "done" }).length
  };

  // Top 3 highest-priority triaged features
  const topTriaged = filterBacklog(backlog, { status: "triaged" })
    .sort((a, b) => (a.frontmatter.priority || "P3").localeCompare(b.frontmatter.priority || "P3"))
    .slice(0, 3)
    .map((f) => ({
      id: f.id,
      priority: f.frontmatter.priority,
      category: f.frontmatter.category,
      target_release: f.frontmatter.target_release,
      derived_from: f.frontmatter.derived_from || null
    }));

  // In-flight features (in-progress) — caller acts on these next
  const inFlight = filterBacklog(backlog, { status: "in-progress" }).map((f) => ({
    id: f.id,
    slices: f.frontmatter.slices || [],
    priority: f.frontmatter.priority
  }));

  // Spec flow: approved + undecomposed
  const specsToDecompose = specs
    .filter(
      (s) =>
        s.frontmatter.status === "approved" &&
        (!Array.isArray(s.frontmatter.derived_features) ||
          s.frontmatter.derived_features.length === 0)
    )
    .map((s) => ({ id: s.id, type: s.frontmatter.type, title: s.frontmatter.title }));

  // Score signal over last 5 grades
  const recentGrades = grades.slice(-5);
  const scoreSnapshot = {};
  for (const dim of SCORE_DIMENSIONS) {
    scoreSnapshot[dim] = avg(recentGrades.map((g) => g.scores?.[dim]));
  }
  const avgRecent = avg(recentGrades.map((g) => avg(SCORE_DIMENSIONS.map((d) => g.scores?.[d]))));

  return {
    backlogCounts,
    topTriaged,
    inFlight,
    specsToDecompose,
    grades: {
      total: grades.length,
      lastFive: recentGrades.map((g) => ({
        slice: g.frontmatter.slice,
        avg: avg(SCORE_DIMENSIONS.map((d) => g.scores?.[d]))
      })),
      avgRecent,
      perDimensionRecent: scoreSnapshot
    },
    decisions: {
      total: decisions.length,
      accepted: decisions.filter((d) => d.status === "accepted").length,
      superseded: decisions.filter((d) => d.status === "superseded").length,
      reverted: decisions.filter((d) => d.status === "reverted").length
    },
    alerts,
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
    }
  };
}
