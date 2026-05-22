import fs from "node:fs/promises";
import path from "node:path";

import { resolveConfig } from "./config-resolver.mjs";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import { findFeatureById, moveFeature, updateFeatureFrontmatter } from "./backlog-writer.mjs";
import { readCrewBlockingGates } from "./crew-workflow-reader.mjs";
import {
  tryWriteCostReport,
  writeCrewFinalSynthesis,
  writeCrewHandoff,
  writeCrewRunBrief
} from "./slice-linker/crew-bridge.mjs";
import { findActivePlan, detectSliceStatus, writeSliceProgress } from "./slice-linker/slice-progress.mjs";

const SLICE_FILE_RE = /^SLICE[-_](\d+)/;

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

// Walks slicesRoot recursively, returns the max numeric slice id found.
async function maxSliceIdUnder(dir) {
  if (!(await pathExists(dir))) return 0;
  let max = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      const m = entry.name.match(SLICE_FILE_RE);
      if (m) {
        const n = Number(m[1]);
        if (n > max) max = n;
      }
    }
  }
  return max;
}

function sliceId(n) {
  return `SLICE-${String(n).padStart(2, "0")}`;
}

function kebab(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function buildSliceContent({ id, title, featureId, featureFrontmatter, featureBody }) {
  const today = new Date().toISOString().slice(0, 10);
  const frontmatter = {
    id,
    status: "pending",
    feature: featureId,
    priority: featureFrontmatter.priority || null,
    target_release: featureFrontmatter.target_release || null,
    created: today,
    updated: today
  };
  const featureDescriptionLine = (featureBody || "")
    .split(/\n+/)
    .find((line) => line && !line.startsWith("#") && !line.startsWith("---"));
  const body = [
    `# ${id}: ${title}`,
    "",
    `Implements ${featureId}. See [feature file](../../../backlog/in-progress/${featureId}.md) for product context.`,
    "",
    "## Objective",
    "",
    featureDescriptionLine
      ? featureDescriptionLine.trim()
      : "(restate the user-visible outcome of the parent feature)",
    "",
    "## In scope",
    "",
    "- bullet 1",
    "- bullet 2",
    "",
    "## Out of scope",
    "",
    "- bullet 1",
    "",
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: ...",
    "- [ ] AC-2: ...",
    "",
    "## Done When",
    "",
    "- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`",
    "- build / test commands per `.claude/autonomous-loop.json` pass",
    `- feature ${featureId} moved from \`in-progress/\` to \`done/\``,
    "- Crew `final-synthesis` artifact written",
    "",
    "## Reviewer ladder",
    "",
    "- Reviewer A: ...",
    "- Reviewer B: ...",
    ""
  ].join("\n");
  return serializeFrontmatter(frontmatter, body);
}

// Creates a slice file under <slicesRoot>/pending/ from a feature.
// - Looks up feature in any backlog state.
// - Moves feature -> in-progress/ if not already there.
// - Allocates next SLICE id by scanning slicesRoot recursively.
// - Writes the slice file with cross-reference to the feature.
// - Updates feature.slices += [SLICE-NN] in frontmatter.
//
// Returns { slice: {id, path}, feature: {id, path, fromState, toState} }.
export async function sliceFromFeature(repoPath, featureId, { config = null } = {}) {
  if (!featureId) throw new Error("sliceFromFeature requires a featureId.");
  const resolved = config || (await resolveConfig(repoPath));
  const slicesRoot = path.resolve(repoPath, resolved.loop?.slicesRoot || "docs/ai-loop/slices");

  const entry = await findFeatureById(repoPath, featureId);
  if (!entry) throw new Error(`Feature not found: ${featureId}`);

  // Move feature to in-progress if not already.
  const movedFromState = entry.state;
  let featureFilePath = entry.filePath;
  if (entry.state !== "in-progress") {
    const result = await moveFeature(entry.filePath, "in-progress");
    featureFilePath = result.to;
  }

  // Allocate next slice id.
  const maxId = await maxSliceIdUnder(slicesRoot);
  const nextNumber = maxId + 1;
  const id = sliceId(nextNumber);

  // Title from first heading in feature body, fallback to first non-empty line.
  const featureContent = await fs.readFile(featureFilePath, "utf8");
  const { frontmatter: featureFM, body: featureBody } = parseFrontmatter(featureContent);
  const titleLine = (featureBody || "").split("\n").find((l) => l.startsWith("# "));
  const title = titleLine
    ? titleLine.replace(/^#\s+[A-Z]+-\d+:\s*/, "").trim()
    : `Implement ${featureId}`;

  const sliceDir = path.join(slicesRoot, "pending");
  await ensureDir(sliceDir);
  const slug = kebab(title);
  const slicePath = path.join(sliceDir, `${id.replace("-", "_")}_${slug.toUpperCase()}.md`);
  const slice = buildSliceContent({
    id,
    title,
    featureId,
    featureFrontmatter: featureFM,
    featureBody
  });
  await fs.writeFile(slicePath, slice);

  // Cross-link on the feature side: append slice id to slices[] frontmatter
  const existingSlices = Array.isArray(featureFM.slices) ? featureFM.slices : [];
  if (!existingSlices.includes(id)) {
    await updateFeatureFrontmatter(featureFilePath, {
      slices: [...existingSlices, id]
    });
  }

  return {
    slice: { id, path: slicePath, title },
    feature: {
      id: featureId,
      path: featureFilePath,
      fromState: movedFromState,
      toState: "in-progress"
    }
  };
}

// Closes a slice. Atomic:
//   1. Move the slice file from <slicesRoot>/pending/ -> completed/ (if
//      nested layout); flat layout updates frontmatter only.
//   2. Update slice frontmatter status: "pending"|"active" -> "completed"
//      and stamp completed_at.
//   3. Find linked feature via slice.feature frontmatter; move feature
//      from in-progress/ -> done/. backlog-writer auto-stamps completed_at.
//   4. Run reconcileSpecStatus so any spec whose features all reached done
// Wraps an async action so any thrown error becomes `{ error: msg }`. Used
// by completeSlice for the three best-effort crew-bridge calls; one failing
// must not block the others or the surrounding slice-complete operation.
async function bestEffort(fn) {
  try {
    return await fn();
  } catch (err) {
    return { error: err.message };
  }
}

// Decides the target path (pending/active/in-progress -> completed; else
// flat), stamps frontmatter, writes the updated file, removes the old one
// if it moved. Returns the new path.
async function moveAndStampSlice({ sliceFile, sliceContent, sliceFm, slicesRoot, today }) {
  const parentDir = path.basename(path.dirname(sliceFile));
  let targetSlicePath = sliceFile;
  if (parentDir === "pending" || parentDir === "active" || parentDir === "in-progress") {
    const completedDir = path.join(slicesRoot, "completed");
    await ensureDir(completedDir);
    targetSlicePath = path.join(completedDir, path.basename(sliceFile));
  }
  const updated = mergeFrontmatter(sliceContent, {
    status: "completed",
    completed_at: sliceFm.completed_at || today,
    updated: today
  });
  await fs.writeFile(targetSlicePath, updated);
  if (targetSlicePath !== sliceFile) await fs.unlink(sliceFile);
  return targetSlicePath;
}

// Moves the slice's linked feature to done/ when present and not yet done.
// Returns null when there is no linked feature, or a result object
// describing the move (or the alreadyDone case).
async function moveFeatureToDone(repoPath, featureId, config) {
  if (!featureId) return null;
  const { findFeatureById, moveFeature } = await import("./backlog-writer.mjs");
  const feat = await findFeatureById(repoPath, featureId, config);
  if (!feat) return null;
  if (feat.state === "done") {
    return { id: featureId, alreadyDone: true, path: feat.filePath };
  }
  const moved = await moveFeature(feat.filePath, "done");
  return { id: featureId, from: moved.from, to: moved.to };
}

//      auto-rolls to satisfied.
//   5. Return paths + a hint that the agent should run `slice grade` next.
export async function completeSlice(repoPath, sliceId, { config = null } = {}) {
  if (!sliceId) throw new Error("completeSlice requires a sliceId.");
  const resolved = config || (await resolveConfig(repoPath));
  const slicesRoot = path.resolve(repoPath, resolved.loop?.slicesRoot || "docs/ai-loop/slices");

  // Locate slice file recursively
  const sliceFile = await locateSliceFile(slicesRoot, sliceId);
  if (!sliceFile) throw new Error(`Slice file not found for ${sliceId} under ${slicesRoot}`);

  const sliceContent = await fs.readFile(sliceFile, "utf8");
  const { frontmatter: sliceFm } = parseFrontmatter(sliceContent);
  const featureId = sliceFm.feature || null;
  const today = new Date().toISOString().slice(0, 10);

  // FEAT-002: refuse to roll the parent feature to done/ while the crew
  // workflow run is blocked or escalated_to_human. The slice itself can
  // still complete (move + stamp), but the feature transition waits for
  // the human to clear the gate.
  const blockingGates = await readCrewBlockingGates(repoPath);
  const isBlocked = Boolean(blockingGates.blocked || blockingGates.escalated);

  const targetSlicePath = await moveAndStampSlice({
    sliceFile,
    sliceContent,
    sliceFm,
    slicesRoot,
    today
  });
  const featureResult = isBlocked
    ? {
        skipped: true,
        reason: blockingGates.escalated
          ? `crew run escalated_to_human: ${blockingGates.escalated.note || ""}`
          : `crew run blocked: ${blockingGates.blocked?.note || ""}`,
        blockingGates
      }
    : await moveFeatureToDone(repoPath, featureId, config);

  // Reconcile parent spec status
  const { reconcileSpecStatus } = await import("./linkage.mjs");
  const specChanges = await reconcileSpecStatus(repoPath, config);

  const crewArgs = { sliceId, slicePath: targetSlicePath, featureId, featureResult, specChanges };
  const [handoff, synthesis, costReport] = await Promise.all([
    bestEffort(() => writeCrewHandoff(repoPath, crewArgs)),
    bestEffort(() => writeCrewFinalSynthesis(repoPath, crewArgs)),
    bestEffort(() => tryWriteCostReport(repoPath, sliceId))
  ]);

  const sliceProgress = await bestEffort(async () => {
    const activePlan = await findActivePlan(repoPath);
    const enriched = await detectSliceStatus(repoPath, activePlan.slices);
    return writeSliceProgress(repoPath, { activePlan, slices: enriched, currentSliceId: null });
  });

  return {
    slice: { id: sliceId, from: sliceFile, to: targetSlicePath },
    feature: featureResult,
    specStatusChanges: specChanges,
    handoff,
    synthesis,
    costReport,
    sliceProgress,
    nextAction: `Run /autonomous-loop:slice grade --id ${sliceId} to capture lessons + decisions.`
  };
}

// Opens a new run for the given slice. Symmetric counterpart to
// completeSlice: rotates workflow-state.currentRun via `crew
// write-run-brief` so cost-emit windows attribute work to this slice,
// then refreshes the slice-progress dashboard. Looks up the slice's
// human-readable title from the active plan when possible. Goal text
// is taken from the slice file's `Objective` block when present.
//
// When { dispatch: true } (default), the returned object includes a
// `dispatchInstruction` string — a literal prompt the loop agent
// should hand to a subagent so the actual implementation runs through
// `/crew:build` (per Dispatch Discipline HARD RULE in rules.md). Pass
// dispatch: false for manual / debugging invocations where the agent
// is doing the slice work in-conversation.
export async function startSlice(
  repoPath,
  sliceId,
  { config = null, goal = null, dispatch = true } = {}
) {
  if (!sliceId) throw new Error("startSlice requires a sliceId.");
  const resolved = config || (await resolveConfig(repoPath));
  const slicesRoot = path.resolve(repoPath, resolved.loop?.slicesRoot || "docs/ai-loop/slices");

  const activePlan = await findActivePlan(repoPath);
  const planMatch = activePlan.slices.find((s) => s.id === sliceId.toUpperCase());
  const title = planMatch ? `${sliceId}: ${planMatch.title}` : sliceId;

  let resolvedGoal = goal;
  let sliceFile = null;
  try {
    sliceFile = await locateSliceFile(slicesRoot, sliceId);
  } catch {
    sliceFile = null;
  }
  if (!resolvedGoal && sliceFile) {
    const content = await fs.readFile(sliceFile, "utf8");
    resolvedGoal = extractObjective(content);
  }

  const runBrief = await bestEffort(() =>
    writeCrewRunBrief(repoPath, { sliceId, title, goal: resolvedGoal })
  );

  const sliceProgress = await bestEffort(async () => {
    const enriched = await detectSliceStatus(repoPath, activePlan.slices);
    return writeSliceProgress(repoPath, {
      activePlan,
      slices: enriched,
      currentSliceId: sliceId
    });
  });

  const dispatchInstruction = dispatch
    ? buildDispatchInstruction({ sliceId, title, sliceFile, repoPath, resolvedGoal })
    : null;

  return {
    slice: { id: sliceId, title },
    activePlan: activePlan.planPath
      ? { source: activePlan.source, path: activePlan.planPath }
      : null,
    runBrief,
    sliceProgress,
    dispatchInstruction,
    nextAction: dispatch
      ? `Dispatch /crew:build subagent for ${sliceId}; close with /autonomous-loop:slice complete --id ${sliceId}.`
      : `Begin acceptance-criteria work for ${sliceId}. Close with /autonomous-loop:slice complete --id ${sliceId}.`
  };
}

function buildDispatchInstruction({ sliceId, title, sliceFile, repoPath, resolvedGoal }) {
  const rel = sliceFile
    ? path.relative(repoPath, sliceFile).replace(/\\/g, "/")
    : null;
  const goalLine = resolvedGoal ? ` Goal: ${resolvedGoal.slice(0, 200)}.` : "";
  const sliceRef = rel ? ` See \`${rel}\` for acceptance criteria.` : "";
  return [
    `Dispatch /crew:build subagent with this prompt:`,
    "",
    `> Implement ${title}.${sliceRef}${goalLine} Follow the full crew build workflow (frame → implement → review → validate → synthesize). When acceptance criteria PASS with evidence, return control so the parent loop can run /autonomous-loop:slice complete --id ${sliceId}. If review or validation reports needs_fix / fail, pivot through /crew:fix before resuming.`
  ].join("\n");
}

function extractObjective(sliceContent) {
  const lines = sliceContent.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => /^##\s+Objective\s*$/i.test(l));
  if (startIdx === -1) return null;
  const body = [];
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^##\s+/.test(line)) break;
    if (line.trim().length === 0 && body.length === 0) continue;
    body.push(line);
  }
  const text = body.join(" ").trim();
  return text.length > 0 ? text.slice(0, 500) : null;
}

async function locateSliceFile(slicesRoot, sliceId) {
  if (!(await pathExists(slicesRoot))) return null;
  const slicePattern = sliceId.replace("-", "[_-]");
  const re = new RegExp(`^${slicePattern}(_|$)`, "i");
  const stack = [slicesRoot];
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
      if (re.test(e.name)) return full;
    }
  }
  return null;
}

import { mergeFrontmatter } from "./frontmatter.mjs";
