// Slice progress dashboard. Renders a single-glance view of which slices
// exist, which are done, and which is in flight for the active plan.
// Rewritten by both startSlice and completeSlice so the file always
// reflects the latest transition.
//
// Plan source priority:
//   1. docs/superpowers/plans/*.md — picked by mtime when multiple exist.
//   2. docs/ai-loop/backlog/approved-slices.md — fallback when no
//      superpowers plan is present.
//
// Task heading shapes tolerated: `## Task 1: SLICE_18 — Title`,
// `## Task 12: SLICE-18 - Title`. Mixed underscore/hyphen and em-dash /
// hyphen separators are normalized to SLICE-NN form.

import fs from "node:fs/promises";
import path from "node:path";
import { execFile as _execFile } from "node:child_process";
import { promisify } from "node:util";

import { parseFrontmatter } from "../frontmatter.mjs";
import {
  backlogPath as resolveBacklogPath,
  slicesRoot as resolveSlicesRoot,
  pathExists
} from "../paths.mjs";

const execFile = promisify(_execFile);

const TASK_HEADING_RE = /^##\s+Task\s+\d+:\s+(SLICE[-_]\d+)\s*[—–-]\s*(.+?)\s*$/;
const APPROVED_SLICE_RE = /^[-*]\s+\[([ xX])\]\s+(SLICE[-_]\d+)\s*[—–:-]\s*(.+?)\s*$/;
const SLICE_FILENAME_RE = /^SLICE[-_](\d+)/i;

function normalizeSliceId(raw) {
  return raw.replace(/_/g, "-").toUpperCase();
}

// Returns { source: "superpowers"|"approved-slices"|null, planPath, slices }
// where slices is [{ id: "SLICE-18", title, checked: bool }].
export async function findActivePlan(repoPath, config = null) {
  const plansDir = path.join(repoPath, "docs/superpowers/plans");
  if (await pathExists(plansDir)) {
    const entries = await fs.readdir(plansDir, { withFileTypes: true });
    const planFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => path.join(plansDir, e.name));
    if (planFiles.length > 0) {
      const stats = await Promise.all(
        planFiles.map(async (file) => ({ file, mtimeMs: (await fs.stat(file)).mtimeMs }))
      );
      stats.sort((a, b) => b.mtimeMs - a.mtimeMs);
      const planPath = stats[0].file;
      const slices = await parseSuperpowersPlan(planPath);
      if (slices.length > 0) {
        return { source: "superpowers", planPath, slices };
      }
    }
  }

  const approved = path.join(resolveBacklogPath(repoPath, config), "approved-slices.md");
  if (await pathExists(approved)) {
    const slices = await parseApprovedSlices(approved);
    if (slices.length > 0) {
      return { source: "approved-slices", planPath: approved, slices };
    }
  }

  return { source: null, planPath: null, slices: [] };
}

export async function parseSuperpowersPlan(planPath) {
  const text = await fs.readFile(planPath, "utf8");
  const slices = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(TASK_HEADING_RE);
    if (m) {
      slices.push({ id: normalizeSliceId(m[1]), title: m[2].trim(), checked: false });
    }
  }
  return slices;
}

export async function parseApprovedSlices(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const slices = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(APPROVED_SLICE_RE);
    if (m) {
      slices.push({
        id: normalizeSliceId(m[2]),
        title: m[3].trim(),
        checked: m[1].toLowerCase() === "x"
      });
    }
  }
  return slices;
}

// For a list of parsed slice descriptors, check whether each slice file
// exists under slicesRoot and whether its frontmatter is status:
// completed. Returns slices augmented with { exists, completed, slicePath }.
export async function detectSliceStatus(repoPath, slices, { slicesRoot } = {}) {
  const root = slicesRoot || resolveSlicesRoot(repoPath);
  const hasRoot = await pathExists(root);
  const filesByNumber = hasRoot ? await indexSliceFiles(root) : new Map();
  const completedFromGit = await sliceNumbersCompletedInGit(repoPath);
  return Promise.all(
    slices.map(async (slice) => {
      const number = sliceNumber(slice.id);
      const slicePath = number != null ? filesByNumber.get(number) : null;
      let completed = slice.checked === true;
      if (number != null && completedFromGit.has(number)) {
        completed = true;
      }
      if (slicePath) {
        const content = await fs.readFile(slicePath, "utf8");
        const { frontmatter } = parseFrontmatter(content);
        if (frontmatter?.status === "completed") completed = true;
        if (/\*\*Status:\*\*\s*COMPLETED/i.test(content)) completed = true;
      }
      return { ...slice, exists: Boolean(slicePath), completed, slicePath };
    })
  );
}

// Scan git log for `docs(slice): mark SLICE_NN complete` commits. Returns
// a Set of numeric slice ids that have been marked complete via that
// commit convention. Falls back to an empty Set if git is unavailable or
// the repo isn't a git checkout.
async function sliceNumbersCompletedInGit(repoPath) {
  const out = new Set();
  try {
    const { stdout } = await execFile("git", ["log", "--pretty=%s", "--grep", "mark SLICE", "-i"], {
      cwd: repoPath,
      maxBuffer: 1024 * 1024
    });
    for (const line of stdout.split(/\r?\n/)) {
      const m = line.match(/SLICE[_-]?(\d+)/i);
      if (m && /complete/i.test(line)) {
        out.add(Number(m[1]));
      }
    }
  } catch {
    // not a git repo or git not available — best-effort
  }
  return out;
}

function sliceNumber(sliceId) {
  const m = sliceId.match(/SLICE-(\d+)/i);
  return m ? Number(m[1]) : null;
}

async function indexSliceFiles(root) {
  const out = new Map();
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
        continue;
      }
      const m = e.name.match(SLICE_FILENAME_RE);
      if (m) {
        const number = Number(m[1]);
        if (!out.has(number)) out.set(number, full);
      }
    }
  }
  return out;
}

function renderRow({ slice, isCurrent }) {
  const status = isCurrent
    ? "IN_PROGRESS"
    : slice.completed
      ? "COMPLETED"
      : slice.exists
        ? "PENDING (file present)"
        : "PENDING (no file)";
  const rel = slice.slicePath
    ? `\`${path.relative(slice.repoPath || "", slice.slicePath).replace(/\\/g, "/")}\``
    : "_(no file)_";
  return `- ${slice.id} — ${slice.title} — **${status}** — ${rel}`;
}

// Writes .claude/state/crew/slice-progress.md describing the active plan
// and per-slice status. currentSliceId, when provided, marks that row as
// IN_PROGRESS regardless of the file's status frontmatter.
export async function writeSliceProgress(
  repoPath,
  { activePlan, slices, currentSliceId = null } = {}
) {
  const stateDir = path.join(repoPath, ".claude/state/crew");
  await fs.mkdir(stateDir, { recursive: true });
  const target = path.join(stateDir, "slice-progress.md");

  const now = new Date().toISOString();
  const planLine = activePlan?.planPath
    ? `Active plan: \`${path
        .relative(repoPath, activePlan.planPath)
        .replace(/\\/g, "/")}\` (source: ${activePlan.source})`
    : "Active plan: _(none detected)_";

  const rows =
    slices.length === 0
      ? ["_(no slices parsed)_"]
      : slices.map((slice) =>
          renderRow({
            slice: { ...slice, repoPath },
            isCurrent: currentSliceId ? normalizeSliceId(currentSliceId) === slice.id : false
          })
        );

  const completedCount = slices.filter((s) => s.completed).length;
  const totalCount = slices.length;
  const summary = totalCount > 0 ? `Progress: ${completedCount}/${totalCount} completed` : "";

  const body = [
    "# Slice Progress",
    "",
    `Updated: ${now}`,
    "",
    planLine,
    summary,
    "",
    "## Slices",
    "",
    ...rows,
    ""
  ]
    .filter((line) => line !== null)
    .join("\n");

  await fs.writeFile(target, body);
  return { path: target, completedCount, totalCount };
}

// Convenience: parse active plan, detect status, write dashboard.
export async function refreshSliceProgress(
  repoPath,
  { currentSliceId = null, config = null } = {}
) {
  const activePlan = await findActivePlan(repoPath, config);
  const enriched = await detectSliceStatus(repoPath, activePlan.slices, {
    slicesRoot: resolveSlicesRoot(repoPath, config)
  });
  return writeSliceProgress(repoPath, {
    activePlan,
    slices: enriched,
    currentSliceId
  });
}
