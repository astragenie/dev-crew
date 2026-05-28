import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { parseFrontmatter, serializeFrontmatter } from "../lib/frontmatter.mjs";
import { addFeature, updateFeatureFrontmatter } from "../lib/backlog-writer.mjs";

export const AXES = Object.freeze([
  "Workflow phases",
  "Roles / dispatch",
  "Artifacts / state",
  "Memory / retention",
  "Model routing",
  "Cost / telemetry",
  "Backlog / spec",
  "Validation / gates",
  "Deployment",
  "Install / distribution"
]);

const REQUIRED_FRONTMATTER_FIELDS = Object.freeze([
  "competitor",
  "host",
  "language",
  "license",
  "version_observed"
]);

const SYMBOL_RE = /[●◐○]/;
const GAP_HEADER_RE = /^### (GAP-\d+):\s*(.+)$/;
const SCORE_RE = /^- (Impact|Effort|Fit) \(0-3\):\s*(\d)/i;
const COMPOSITE_RE = /^- Composite:.*?=\s*(\d+)/i;
const DESC_RE = /^- Description:\s*(.+)$/;
const SOURCE_RE = /^- Source:\s*(.+)$/;

function parseMatrixRow(line) {
  // | Axis name | symbol | note |
  const cells = line
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c !== "");
  if (cells.length < 3) return null;
  const [axis, symbolCell, ...noteParts] = cells;
  const m = symbolCell.match(SYMBOL_RE);
  if (!m) return null;
  return { axis, symbol: m[0], note: noteParts.join(" | ").trim() };
}

function extractMatrix(body) {
  const lines = body.split("\n");
  const matrix = {};
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const parsed = parseMatrixRow(line);
    if (!parsed) continue;
    if (AXES.includes(parsed.axis)) {
      if (parsed.axis in matrix) {
        throw new Error(`Brief has duplicate axis row: ${parsed.axis}`);
      }
      matrix[parsed.axis] = { symbol: parsed.symbol, note: parsed.note };
    }
  }
  for (const axis of AXES) {
    if (!(axis in matrix)) {
      throw new Error(`Brief missing axis: ${axis}`);
    }
  }
  return matrix;
}

function extractGaps(body) {
  const lines = body.split("\n");
  const gaps = [];
  let current = null;
  for (const raw of lines) {
    const headerMatch = raw.match(GAP_HEADER_RE);
    if (headerMatch) {
      if (current) gaps.push(current);
      current = {
        id: headerMatch[1],
        title: headerMatch[2].trim(),
        description: "",
        source: "",
        impact: null,
        effort: null,
        fit: null,
        composite: null
      };
      continue;
    }
    if (!current) continue;
    const descMatch = raw.match(DESC_RE);
    if (descMatch) current.description = descMatch[1].trim();
    const sourceMatch = raw.match(SOURCE_RE);
    if (sourceMatch) current.source = sourceMatch[1].trim();
    const scoreMatch = raw.match(SCORE_RE);
    if (scoreMatch) {
      current[scoreMatch[1].toLowerCase()] = Number(scoreMatch[2]);
    }
    const compositeMatch = raw.match(COMPOSITE_RE);
    if (compositeMatch) current.composite = Number(compositeMatch[1]);
  }
  if (current) gaps.push(current);
  return gaps;
}

export async function parseBrief(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);
  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    const value = frontmatter[field];
    if (value === undefined || value === null || value === "") {
      throw new Error(`Brief missing required frontmatter field: ${field}`);
    }
  }
  const matrix = extractMatrix(body);
  const gaps = extractGaps(body);
  return {
    filePath,
    competitor: frontmatter.competitor,
    host: frontmatter.host,
    language: frontmatter.language,
    license: frontmatter.license,
    version_observed: frontmatter.version_observed,
    sources: frontmatter.sources || [],
    matrix,
    gaps
  };
}

// Researchers must use ASCII-only gap titles. Non-ASCII titles
// normalize to an empty key and are silently skipped — see `if (!key) continue`
// in dedupeAndRank. Surfacing the warning would require I/O which is out
// of scope for this pure function.
function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createMergedGap(gap) {
  const impact = gap.impact ?? 0;
  const effort = gap.effort ?? 3;
  const fit = gap.fit ?? 0;
  return {
    key: normalizeTitle(gap.title),
    title: gap.title,
    description: gap.description || "",
    source_competitors: [],
    sources: [],
    impact,
    effort,
    fit,
    // Recompute composite from components rather than trusting the stored
    // value — the brief may not be internally consistent.
    composite: impact + (3 - effort) + fit
  };
}

function mergeGapInto(merged, gap, competitor) {
  if (!merged.source_competitors.includes(competitor)) {
    merged.source_competitors.push(competitor);
  }
  if (gap.source && !merged.sources.includes(gap.source)) {
    merged.sources.push(gap.source);
  }
  // Take the most generous scores across duplicates so we don't
  // under-rate a gap that one researcher scored conservatively.
  merged.impact = Math.max(merged.impact, gap.impact ?? 0);
  merged.effort = Math.min(merged.effort, gap.effort ?? 3);
  merged.fit = Math.max(merged.fit, gap.fit ?? 0);
  // Recompute composite from merged components — taking max of stored
  // composites would use stale values from before the per-component merge.
  merged.composite = merged.impact + (3 - merged.effort) + merged.fit;
  // Keep the longest description we have seen.
  if ((gap.description || "").length > merged.description.length) {
    merged.description = gap.description;
  }
}

export function dedupeAndRank(briefs) {
  const bucket = new Map();
  for (const brief of briefs) {
    for (const gap of brief.gaps || []) {
      const key = normalizeTitle(gap.title);
      if (!key) continue;
      if (!bucket.has(key)) {
        bucket.set(key, createMergedGap(gap));
      }
      mergeGapInto(bucket.get(key), gap, brief.competitor);
    }
  }
  return [...bucket.values()].sort((a, b) => b.composite - a.composite);
}

export function renderMatrixMarkdown(briefs, { baseline, axes }) {
  const competitors = briefs.map((b) => b.competitor);
  const header = `| Axis                 | ${baseline.name} | ${competitors.join(" | ")} |`;
  const sep = `| -------------------- | ${"---".padEnd(baseline.name.length, "-")} | ${competitors
    .map((c) => "---".padEnd(c.length, "-"))
    .join(" | ")} |`;
  const rows = axes.map((axis) => {
    const baseCell = baseline.matrix[axis] || { symbol: "?", note: "" };
    const baseCellStr = `${baseCell.symbol} ${baseCell.note}`.trim();
    const competitorCells = briefs.map((b) => {
      const cell = b.matrix[axis] || { symbol: "?", note: "" };
      return `${cell.symbol} ${cell.note}`.trim();
    });
    return `| ${axis} | ${baseCellStr} | ${competitorCells.join(" | ")} |`;
  });
  return [header, sep, ...rows].join("\n");
}

export function priorityFromComposite(composite) {
  if (composite >= 9) return "P0";
  if (composite >= 7) return "P1";
  if (composite >= 6) return "P2";
  return "P3";
}

function renderGapBody(featId, gap) {
  return [
    `# ${featId}: ${gap.title}`,
    "",
    "## Source",
    "",
    "Competitor gap audit (2026-05-28). Surfaced by:",
    ...gap.source_competitors.map((c) => `- ${c}`),
    "",
    "## Description",
    "",
    gap.description || "(no description provided)",
    "",
    "## Scoring",
    "",
    `- Impact: ${gap.impact}`,
    `- Effort: ${gap.effort}`,
    `- Fit: ${gap.fit}`,
    `- Composite: ${gap.composite} / 9`,
    "",
    "## References",
    "",
    ...(gap.sources.length > 0
      ? gap.sources.map((s) => `- ${s}`)
      : ["- (no source URLs captured)"]),
    "",
    "## Consider rejecting because",
    "",
    "_(Filled in during PM triage. See related inadvisable-mimic entries in the matching competitor briefs.)_",
    ""
  ].join("\n");
}

async function listBriefFiles(briefsDir) {
  const entries = await fs.readdir(briefsDir);
  return entries
    .filter((entry) => entry.endsWith(".md") && entry.toLowerCase() !== "readme.md")
    .map((entry) => path.join(briefsDir, entry));
}

export async function runAudit(repoPath, { auditDir, baselineName, baselineMatrix }) {
  const briefsDir = path.join(repoPath, auditDir, "briefs");
  const briefFiles = await listBriefFiles(briefsDir);
  const briefs = [];
  for (const file of briefFiles) {
    briefs.push(await parseBrief(file));
  }
  briefs.sort((a, b) => a.competitor.localeCompare(b.competitor));

  const ranked = dedupeAndRank(briefs);
  const matrix = renderMatrixMarkdown(briefs, {
    baseline: { name: baselineName, matrix: baselineMatrix },
    axes: AXES
  });

  const matrixPath = path.join(repoPath, auditDir, "matrix.md");
  const rankedList =
    ranked.length === 0
      ? "_(no gap candidates found — every competitor was matched on every axis)_"
      : ranked
          .map((gap, idx) => {
            const sources = gap.source_competitors.join(", ");
            return `${idx + 1}. **${gap.title}** — composite ${gap.composite}/9 (impact ${gap.impact}, effort ${gap.effort}, fit ${gap.fit}). Surfaced by: ${sources}.`;
          })
          .join("\n");
  const matrixBody = [
    "# Master matrix — 2026-05-28 competitor gap audit",
    "",
    "Legend: ● = full coverage, ◐ = partial, ○ = absent.",
    "",
    matrix,
    "",
    "## Ranked candidate list",
    "",
    rankedList,
    ""
  ].join("\n");
  await fs.writeFile(matrixPath, matrixBody);

  const draftedFeats = [];
  for (const gap of ranked) {
    if (gap.composite < 6) continue;
    const draft = await addFeature(repoPath, {
      title: gap.title,
      priority: priorityFromComposite(gap.composite),
      category: "competitor-gap"
    });
    // addFeature can't take arbitrary frontmatter; layer the audit-specific
    // fields on top via updateFeatureFrontmatter and re-render the body
    // while preserving the frontmatter block addFeature wrote.
    const body = renderGapBody(draft.id, gap);
    const existing = await fs.readFile(draft.filePath, "utf8");
    const { frontmatter } = parseFrontmatter(existing);
    await fs.writeFile(draft.filePath, serializeFrontmatter(frontmatter, body));
    await updateFeatureFrontmatter(draft.filePath, {
      composite_score: gap.composite,
      source_competitors: gap.source_competitors,
      autonomous_safe: false
    });
    draftedFeats.push(draft);
  }

  return { briefs, ranked, matrixPath, draftedFeats };
}

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const repoPath = process.cwd();
  const baselineMatrix = Object.fromEntries(
    AXES.map((axis) => [axis, { symbol: "●", note: "native" }])
  );
  try {
    const result = await runAudit(repoPath, {
      auditDir: "docs/research/2026-05-28-competitor-gap-audit",
      baselineName: "loop+crew",
      baselineMatrix
    });
    console.log(
      JSON.stringify(
        {
          briefs: result.briefs.length,
          ranked: result.ranked.length,
          drafted: result.draftedFeats.length,
          matrixPath: result.matrixPath
        },
        null,
        2
      )
    );
  } catch (err) {
    if (err && err.code === "ENOENT") {
      console.error(
        "Briefs directory not found. Run Task 5 (dispatch researchers) " +
          "to populate docs/research/2026-05-28-competitor-gap-audit/briefs/ first."
      );
      process.exitCode = 1;
    } else {
      throw err;
    }
  }
}
