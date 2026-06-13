import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter } from "./frontmatter.mjs";
import {
  backlogRoot,
  slicesRoot as resolveSlicesRoot,
  gradesRoot,
  decisionsRoot,
  pathExists
} from "./paths.mjs";

export interface BrokenLink {
  sourceFile: string;
  field: string; // e.g. "depends_on", "derived_from", "supersedes", "declined_per", "feature"
  referencedId: string;
  reason: string;
}

export interface OrphanedArtifact {
  file: string;
  type: "grade" | "slice";
  reason: string;
}

export interface LinkReport {
  broken: BrokenLink[];
  orphaned: OrphanedArtifact[];
  mermaid: string;
}

const BACKLOG_STATES = ["pending", "triaged", "in-progress", "done"];
const SLICE_STATES = ["pending", "in-progress", "completed"];
const FEAT_FILE_RE = /^FEAT-(\d+)([a-z])?(?:-.*)?\.md$/;
const SLICE_FILE_RE = /^SLICE[-_](\d+)/i;
const GRADE_FILE_RE = /grade\.md$/i;

// Extract FEAT id from a grade filename: "20260528T191825Z-feat023-slice06-grade.md"
// → "FEAT-023", and slice id: "SLICE-06"
const GRADE_FEAT_RE = /feat(\d+)/i;
const GRADE_SLICE_RE = /slice(\d+)/i;

async function readDirSafe(dir: string): Promise<string[]> {
  if (!(await pathExists(dir))) return [];
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

/**
 * Collect all FEAT ids that exist in any backlog state directory.
 * Returns a Set of ids like "FEAT-020", "FEAT-175".
 */
async function collectBacklogIds(root: string): Promise<{
  ids: Set<string>;
  files: Array<{ id: string; file: string; frontmatter: Record<string, unknown> }>;
}> {
  const ids = new Set<string>();
  const files: Array<{ id: string; file: string; frontmatter: Record<string, unknown> }> = [];

  for (const state of BACKLOG_STATES) {
    const dir = path.join(root, state);
    const entries = await readDirSafe(dir);
    for (const entry of entries) {
      if (!entry.endsWith(".md") || !FEAT_FILE_RE.test(entry)) continue;
      const filePath = path.join(dir, entry);
      let frontmatter: Record<string, unknown> = {};
      try {
        const content = await fs.readFile(filePath, "utf8");
        ({ frontmatter } = parseFrontmatter(content));
      } catch {
        continue;
      }
      const id = (frontmatter.id as string) || deriveIdFromFilename(entry);
      ids.add(id);
      files.push({ id, file: filePath, frontmatter });
    }
  }
  return { ids, files };
}

function deriveIdFromFilename(filename: string): string {
  const match = filename.match(/^(FEAT-\d+[a-z]?)/i);
  return match ? match[1].toUpperCase() : filename.replace(/\.md$/, "");
}

/**
 * Collect all slice ids that exist in any slice state directory (completed only
 * matters for orphan checking, but we collect all states for broken-link checks).
 */
async function collectSliceIds(slicesRootDir: string): Promise<{
  allIds: Set<string>;
  completedIds: Set<string>;
  files: Array<{ id: string; file: string; frontmatter: Record<string, unknown>; state: string }>;
}> {
  const allIds = new Set<string>();
  const completedIds = new Set<string>();
  const files: Array<{
    id: string;
    file: string;
    frontmatter: Record<string, unknown>;
    state: string;
  }> = [];

  for (const state of SLICE_STATES) {
    const dir = path.join(slicesRootDir, state);
    const entries = await readDirSafe(dir);
    for (const entry of entries) {
      if (!entry.endsWith(".md") || !SLICE_FILE_RE.test(entry)) continue;
      const filePath = path.join(dir, entry);
      let frontmatter: Record<string, unknown> = {};
      try {
        const content = await fs.readFile(filePath, "utf8");
        ({ frontmatter } = parseFrontmatter(content));
      } catch {
        continue;
      }
      const rawId = (frontmatter.id as string | undefined) ?? "";
      const id = rawId || deriveSliceId(entry);
      allIds.add(id);
      if (state === "completed") completedIds.add(id);
      files.push({ id, file: filePath, frontmatter, state });
    }
  }
  return { allIds, completedIds, files };
}

function deriveSliceId(filename: string): string {
  const m = filename.match(/^(SLICE[-_]\d+)/i);
  if (m) return m[1].replace("_", "-").toUpperCase();
  return filename.replace(/\.md$/, "");
}

/**
 * Collect all decision ids from the decisions directory.
 */
async function collectDecisionIds(decRoot: string): Promise<{
  ids: Set<string>;
  files: Array<{ id: string; file: string; frontmatter: Record<string, unknown> }>;
}> {
  const ids = new Set<string>();
  const files: Array<{ id: string; file: string; frontmatter: Record<string, unknown> }> = [];

  const entries = await readDirSafe(decRoot);
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const filePath = path.join(decRoot, entry);
    let frontmatter: Record<string, unknown> = {};
    try {
      const content = await fs.readFile(filePath, "utf8");
      ({ frontmatter } = parseFrontmatter(content));
    } catch {
      continue;
    }
    const id = frontmatter.id as string | undefined;
    if (id) {
      ids.add(id);
      files.push({ id, file: filePath, frontmatter });
    }
  }
  return { ids, files };
}

/**
 * Collect all grade files from the grades directory.
 * Returns file paths and extracted feat/slice references.
 */
async function collectGradeFiles(gradesDir: string): Promise<
  Array<{
    file: string;
    featId: string | null;
    sliceId: string | null;
    frontmatter: Record<string, unknown>;
  }>
> {
  const entries = await readDirSafe(gradesDir);
  const results: Array<{
    file: string;
    featId: string | null;
    sliceId: string | null;
    frontmatter: Record<string, unknown>;
  }> = [];

  for (const entry of entries) {
    if (!entry.endsWith(".md") || !GRADE_FILE_RE.test(entry)) continue;
    const filePath = path.join(gradesDir, entry);
    let frontmatter: Record<string, unknown> = {};
    try {
      const content = await fs.readFile(filePath, "utf8");
      ({ frontmatter } = parseFrontmatter(content));
    } catch {
      continue;
    }

    // Try frontmatter first for slice reference
    const sliceFromFm = frontmatter.slice as string | null | undefined;
    const featFromFm = frontmatter.feature as string | null | undefined;

    // Fall back to filename parsing
    const featMatch = entry.match(GRADE_FEAT_RE);
    const sliceMatch = entry.match(GRADE_SLICE_RE);

    const sliceId =
      sliceFromFm ||
      (sliceMatch ? `SLICE-${String(parseInt(sliceMatch[1], 10)).padStart(2, "0")}` : null);
    const featId =
      featFromFm ||
      (featMatch ? `FEAT-${String(parseInt(featMatch[1], 10)).padStart(3, "0")}` : null);

    results.push({ file: filePath, featId, sliceId, frontmatter });
  }
  return results;
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

/**
 * Main entry point: walk all artifact directories and validate cross-references.
 */
export async function checkArtifactLinks(
  repoPath: string,
  config: Record<string, unknown> | null = null
): Promise<LinkReport> {
  const broken: BrokenLink[] = [];
  const orphaned: OrphanedArtifact[] = [];

  const backlogRootDir = backlogRoot(repoPath, config);
  const slicesRootDir = resolveSlicesRoot(repoPath, config);
  const gradesDir = gradesRoot(repoPath, config);
  const decRoot = decisionsRoot(repoPath, config);

  // Collect all known ids
  const [backlog, slices, decisions, grades] = await Promise.all([
    collectBacklogIds(backlogRootDir),
    collectSliceIds(slicesRootDir),
    collectDecisionIds(decRoot),
    collectGradeFiles(gradesDir)
  ]);

  const featIds = backlog.ids;
  const decIds = decisions.ids;

  // --- Validate FEAT files ---
  for (const { id: featId, file, frontmatter } of backlog.files) {
    const rel = path.relative(repoPath, file).replace(/\\/g, "/");

    // depends_on: [FEAT-NNN]
    for (const ref of toArray(frontmatter.depends_on)) {
      if (ref && !featIds.has(ref)) {
        broken.push({
          sourceFile: rel,
          field: "depends_on",
          referencedId: ref,
          reason: `Referenced FEAT "${ref}" not found in any backlog state`
        });
      }
    }

    // derived_from: FEAT-NNN (or array)
    for (const ref of toArray(frontmatter.derived_from)) {
      if (ref && !featIds.has(ref)) {
        broken.push({
          sourceFile: rel,
          field: "derived_from",
          referencedId: ref,
          reason: `Referenced FEAT "${ref}" not found in any backlog state`
        });
      }
    }

    // declined_per: [clause-id, ...] — these reference CLAUDE.md clause ids (not artifact ids)
    // We skip validating these since clause ids are embedded in CLAUDE.md, not separate files.
    // The existing validate-decline-citations.mts script handles that check.
  }

  // --- Validate slice files ---
  for (const { id: sliceId, file, frontmatter } of slices.files) {
    const rel = path.relative(repoPath, file).replace(/\\/g, "/");

    // feature: FEAT-NNN must exist in backlog
    const featureRef = frontmatter.feature as string | null | undefined;
    if (featureRef && typeof featureRef === "string" && featureRef.trim()) {
      const ref = featureRef.trim();
      if (!featIds.has(ref)) {
        broken.push({
          sourceFile: rel,
          field: "feature",
          referencedId: ref,
          reason: `Referenced FEAT "${ref}" not found in any backlog state`
        });
      }
    }

    // Slice ids that are not in backlog but are in slice dirs: not a broken link issue,
    // orphaned detection is for grades only per the spec.
    void sliceId;
  }

  // --- Validate decision files ---
  for (const { id: decId, file, frontmatter } of decisions.files) {
    const rel = path.relative(repoPath, file).replace(/\\/g, "/");

    // supersedes: [DEC-NNN] — referenced decision must exist
    for (const ref of toArray(frontmatter.supersedes)) {
      if (ref && !decIds.has(ref)) {
        broken.push({
          sourceFile: rel,
          field: "supersedes",
          referencedId: ref,
          reason: `Referenced decision "${ref}" not found in decisions directory`
        });
      }
    }

    void decId;
  }

  // --- Detect orphaned grade files ---
  // A grade is orphaned if its slice reference has no corresponding file in slices/completed/
  for (const grade of grades) {
    const rel = path.relative(repoPath, grade.file).replace(/\\/g, "/");
    if (!grade.sliceId) {
      orphaned.push({
        file: rel,
        type: "grade",
        reason: "Could not determine slice reference from filename or frontmatter"
      });
      continue;
    }
    if (!slices.completedIds.has(grade.sliceId)) {
      orphaned.push({
        file: rel,
        type: "grade",
        reason: `Grade references slice "${grade.sliceId}" but no completed slice file found`
      });
    }
  }

  // --- Build Mermaid graph ---
  const mermaid = buildMermaidGraph(backlog.files, slices.files, grades);

  return { broken, orphaned, mermaid };
}

interface BacklogEntry {
  id: string;
  file: string;
  frontmatter: Record<string, unknown>;
}

interface SliceEntry {
  id: string;
  file: string;
  frontmatter: Record<string, unknown>;
  state: string;
}

interface GradeEntry {
  file: string;
  featId: string | null;
  sliceId: string | null;
  frontmatter: Record<string, unknown>;
}

function buildMermaidGraph(
  featFiles: BacklogEntry[],
  sliceFiles: SliceEntry[],
  gradeFiles: GradeEntry[]
): string {
  const MAX_NODES = 20;
  const edges: string[] = [];
  const nodesSeen = new Set<string>();

  function safeId(id: string): string {
    // Mermaid node ids can't contain hyphens in some renderers — use underscores
    return id.replace(/-/g, "_");
  }

  function addEdge(from: string, to: string) {
    if (nodesSeen.size < MAX_NODES || (nodesSeen.has(from) && nodesSeen.has(to))) {
      nodesSeen.add(from);
      nodesSeen.add(to);
      if (nodesSeen.size <= MAX_NODES) {
        edges.push(`  ${safeId(from)} --> ${safeId(to)}`);
      }
    }
  }

  // FEAT → slice edges
  for (const slice of sliceFiles) {
    const featRef = slice.frontmatter.feature as string | null | undefined;
    if (featRef && typeof featRef === "string" && featRef.trim()) {
      addEdge(featRef.trim(), slice.id);
    }
  }

  // slice → grade edges
  for (const grade of gradeFiles) {
    if (grade.sliceId && grade.featId) {
      // Use grade filename without the full path
      const gradeLabel = path.basename(grade.file).replace(/\.md$/, "");
      addEdge(grade.sliceId, gradeLabel);
    }
  }

  // FEAT depends_on edges
  for (const feat of featFiles) {
    for (const dep of toArray(feat.frontmatter.depends_on)) {
      if (dep) addEdge(dep, feat.id);
    }
  }

  const lines = ["graph TD", ...edges];
  if (edges.length === 0) {
    lines.push("  %% no edges found");
  }
  return lines.join("\n");
}
