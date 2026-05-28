import fs from "node:fs/promises";
import path from "node:path";

import { resolveConfig } from "./config-resolver.mjs";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import { findFeatureById, moveFeature, updateFeatureFrontmatter } from "./backlog-writer.mjs";
import { readCrewWorkflowState } from "./crew-workflow-reader.mjs";
import { readFeatureEndCeremony } from "./ceremonies.mjs";
import { readGradeTrend } from "./grade-trend.mjs";
import {
  markValidationSkippedBadge,
  tryWriteAgentReport,
  tryWriteCostReport,
  writeCrewFinalSynthesis,
  writeCrewHandoff,
  writeCrewRunBrief
} from "./slice-linker/crew-bridge.mjs";
import { deriveValidationGate } from "./validation-gate.mjs";
import {
  findActivePlan,
  detectSliceStatus,
  writeSliceProgress
} from "./slice-linker/slice-progress.mjs";
import {
  pathExists,
  ensureDir,
  locateSliceFile,
  slicesRoot as resolveSlicesRoot,
  backlogRoot as resolveBacklogRoot
} from "./paths.mjs";
import { resolveModel } from "./model-router.mjs";

const SLICE_FILE_RE = /^SLICE[-_](\d+)/;

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
    phase: featureFrontmatter.phase || null,
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
    "- build / test commands per `.claude/loop.json` pass",
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
  const slicesRoot = resolveSlicesRoot(repoPath, resolved);

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
function deriveBlockingGates(workflowState) {
  const gates = workflowState?.currentRun?.gates || {};
  const blocked = gates.blocked?.status === "blocked" ? gates.blocked : null;
  const escalated = gates.escalation?.status === "escalated" ? gates.escalation : null;
  return { blocked, escalated };
}

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
// describing the move (or the alreadyDone or kept-open case).
//
// Skips the move when:
//   - feat.frontmatter.feature_complete === false (operator opts out for multi-slice features)
//   - keepFeatureOpen === true (runtime CLI override via --keep-feature-open)
async function moveFeatureToDone(repoPath, featureId, config, keepFeatureOpen = false) {
  if (!featureId) return null;
  const { findFeatureById, moveFeature } = await import("./backlog-writer.mjs");
  const feat = await findFeatureById(repoPath, featureId, config);
  if (!feat) return null;
  if (feat.state === "done") {
    return { id: featureId, alreadyDone: true, path: feat.filePath };
  }
  const featureComplete = feat.frontmatter?.feature_complete;
  if (keepFeatureOpen) {
    return {
      id: featureId,
      keptOpen: true,
      reason: "runtime --keep-feature-open flag set",
      path: feat.filePath
    };
  }
  if (featureComplete === false) {
    return {
      id: featureId,
      keptOpen: true,
      reason: "feature frontmatter feature_complete: false",
      path: feat.filePath
    };
  }
  const moved = await moveFeature(feat.filePath, "done");
  return { id: featureId, from: moved.from, to: moved.to };
}

// Compute featureResult based on blocking gates, simplify ceremony, and
// validation gate. Validation gate fires when the slice closed without a
// validation artifact under .claude/artifacts/crew/validations/ AND without
// a validation_passed/skipped badge AND without a requires_validation: false
// waiver in slice frontmatter. The slice file itself still moves to
// completed/; only the feature->done transition is held back.
function describeBlockedGate({ isBlocked, isSimplifyBlocked, blockingGates, validationGate }) {
  if (isBlocked) {
    return blockingGates.escalated
      ? `crew run escalated_to_human: ${blockingGates.escalated.note || ""}`
      : `crew run blocked: ${blockingGates.blocked?.note || ""}`;
  }
  if (isSimplifyBlocked) {
    return "simplify-gate: featureEnd ceremony exists but simplifyRan is false";
  }
  return `validation-gate: ${validationGate.reason}`;
}

async function computeFeatureResult(
  repoPath,
  featureId,
  blockingGates,
  config,
  keepFeatureOpen = false,
  validationGate = null
) {
  const isBlocked = Boolean(blockingGates.blocked || blockingGates.escalated);
  const simplifyCeremony = await readFeatureEndCeremony(repoPath, featureId);
  const isSimplifyBlocked = Boolean(simplifyCeremony && simplifyCeremony.simplifyRan === false);
  const isValidationBlocked = Boolean(validationGate && validationGate.satisfied === false);

  if (isBlocked || isSimplifyBlocked || isValidationBlocked) {
    return {
      skipped: true,
      reason: describeBlockedGate({
        isBlocked,
        isSimplifyBlocked,
        blockingGates,
        validationGate
      }),
      blockingGates: isBlocked ? blockingGates : null,
      simplifyGate: isSimplifyBlocked ? { simplifyRan: false } : null,
      validationGate: isValidationBlocked ? validationGate : null
    };
  }

  return await moveFeatureToDone(repoPath, featureId, config, keepFeatureOpen);
}

//      auto-rolls to satisfied.
//   5. Return paths + a hint that the agent should run `slice grade` next.
export async function completeSlice(
  repoPath,
  sliceId,
  { config = null, keepFeatureOpen = false, skipValidationCheck = null } = {}
) {
  if (!sliceId) throw new Error("completeSlice requires a sliceId.");
  const resolved = config || (await resolveConfig(repoPath));
  const slicesRoot = resolveSlicesRoot(repoPath, resolved);

  // Locate slice file recursively
  const sliceFile = await locateSliceFile(slicesRoot, sliceId);
  if (!sliceFile) throw new Error(`Slice file not found for ${sliceId} under ${slicesRoot}`);

  const sliceContent = await fs.readFile(sliceFile, "utf8");
  const { frontmatter: sliceFm } = parseFrontmatter(sliceContent);
  const featureId = sliceFm.feature || null;
  const phase = sliceFm.phase || null;
  const today = new Date().toISOString().slice(0, 10);

  // FEAT-002: refuse to roll the parent feature to done/ while the crew
  // workflow run is blocked or escalated_to_human. The slice itself can
  // still complete (move + stamp), but the feature transition waits for
  // the human to clear the gate.
  const workflowState = await readCrewWorkflowState(repoPath);
  const startedAt = workflowState?.currentRun?.startedAt ?? null;
  const blockingGates = deriveBlockingGates(workflowState);

  // Validation gate: refuse to roll feature to done when no validation
  // artifact / badge / waiver is present. --skip-validation-check writes
  // a validation_skipped badge first so the bypass is auditable, then
  // shortcuts the gate to satisfied.
  let validationGate;
  let validationSkippedBadge = null;
  if (skipValidationCheck) {
    const reason = String(skipValidationCheck).trim();
    if (!reason) {
      throw new Error(
        "--skip-validation-check requires a non-empty reason. " +
          "Example: --skip-validation-check 'doc-only slice, no behavior'."
      );
    }
    validationSkippedBadge = await bestEffort(() => markValidationSkippedBadge(repoPath, reason));
    validationGate = {
      satisfied: true,
      reason: `--skip-validation-check: ${reason}`,
      evidence: []
    };
  } else {
    validationGate = await deriveValidationGate(repoPath, sliceId, { sliceFm });
  }

  const targetSlicePath = await moveAndStampSlice({
    sliceFile,
    sliceContent,
    sliceFm,
    slicesRoot,
    today
  });
  const featureResult = await computeFeatureResult(
    repoPath,
    featureId,
    blockingGates,
    config,
    keepFeatureOpen,
    validationGate
  );

  // Reconcile parent spec status
  const { reconcileSpecStatus } = await import("./linkage.mjs");
  const specChanges = await reconcileSpecStatus(repoPath, config);

  const crewArgs = {
    sliceId,
    slicePath: targetSlicePath,
    featureId,
    phase,
    featureResult,
    specChanges,
    config: resolved
  };
  const [handoff, synthesis, costReport, agentReport] = await Promise.all([
    bestEffort(() => writeCrewHandoff(repoPath, crewArgs)),
    bestEffort(() => writeCrewFinalSynthesis(repoPath, crewArgs)),
    bestEffort(() => tryWriteCostReport(repoPath, { sliceId, featureId, phase }, resolved)),
    bestEffort(() => tryWriteAgentReport(repoPath, { sliceId, featureId, phase, startedAt }))
  ]);

  const sliceProgress = await bestEffort(async () => {
    const activePlan = await findActivePlan(repoPath, resolved);
    const enriched = await detectSliceStatus(repoPath, activePlan.slices, {
      slicesRoot: resolveSlicesRoot(repoPath, resolved)
    });
    return writeSliceProgress(repoPath, { activePlan, slices: enriched, currentSliceId: null });
  });

  return {
    slice: { id: sliceId, from: sliceFile, to: targetSlicePath },
    feature: featureResult,
    specStatusChanges: specChanges,
    handoff,
    synthesis,
    costReport,
    agentReport,
    sliceProgress,
    validationGate,
    validationSkippedBadge,
    nextAction: `Run /loop:slice grade --id ${sliceId} to capture lessons + decisions.`
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
  const slicesRoot = resolveSlicesRoot(repoPath, resolved);

  const { activePlan, title } = await resolvePlanAndTitle(repoPath, sliceId, resolved);

  const ctx = await readSliceContext(slicesRoot, sliceId);
  const resolvedGoal = goal || ctx.goal;
  const featureId = ctx.frontmatter.feature || null;
  const phase = ctx.frontmatter.phase || null;

  const [runBrief, gradeTrend, featureExcerpt] = await Promise.all([
    bestEffort(() =>
      writeCrewRunBrief(repoPath, {
        sliceId,
        title,
        goal: resolvedGoal,
        featureId,
        phase,
        mode: "autonomous",
        pace: "unattended",
        scope: ctx.scope,
        outOfScope: ctx.outOfScope
      })
    ),
    readGradeTrend(repoPath),
    featureId ? readFeatureExcerpt(repoPath, featureId, resolved) : Promise.resolve(null)
  ]);
  const sliceProgress = await refreshSliceProgress(repoPath, activePlan, sliceId, resolved);
  const gradeTrendCaution =
    gradeTrend.consecutiveBelow > 0
      ? `Grade trend caution: ${gradeTrend.consecutiveBelow} consecutive slice(s) averaged below threshold. ` +
        "Review recent grades before continuing if this persists."
      : null;

  const modelHint = resolveModel("build", resolved);

  return buildStartSliceReturn({
    sliceId,
    title,
    activePlan,
    runBrief,
    sliceProgress,
    dispatch,
    sliceFile: ctx.file,
    repoPath,
    resolvedGoal,
    gradeTrendCaution,
    modelHint,
    featureId,
    sliceContent: ctx.content,
    featureExcerpt
  });
}

// Locate the active plan + derive the human-readable title for this slice
// from the plan match, falling back to bare sliceId. Extracted from
// startSlice to keep its cyclomatic complexity under the eslint cap.
async function resolvePlanAndTitle(repoPath, sliceId, config = null) {
  const activePlan = await findActivePlan(repoPath, config);
  const planMatch = activePlan.slices.find((s) => s.id === sliceId.toUpperCase());
  const title = planMatch ? `${sliceId}: ${planMatch.title}` : sliceId;
  return { activePlan, title };
}

// Build the return shape for startSlice. Extracted to keep startSlice
// under the eslint complexity cap; no behavior change.
function buildStartSliceReturn({
  sliceId,
  title,
  activePlan,
  runBrief,
  sliceProgress,
  dispatch,
  sliceFile,
  repoPath,
  resolvedGoal,
  gradeTrendCaution = null,
  modelHint = null,
  featureId = null,
  sliceContent = null,
  featureExcerpt = null
}) {
  const dispatchInstruction = dispatch
    ? buildDispatchInstruction({
        sliceId,
        title,
        sliceFile,
        repoPath,
        resolvedGoal,
        modelHint,
        featureId,
        sliceContent,
        featureExcerpt
      })
    : null;
  const activePlanSummary = activePlan.planPath
    ? { source: activePlan.source, path: activePlan.planPath }
    : null;
  const nextAction = dispatch
    ? `Dispatch /crew:build subagent for ${sliceId}; close with /loop:slice complete --id ${sliceId}.`
    : `Begin acceptance-criteria work for ${sliceId}. Close with /loop:slice complete --id ${sliceId}.`;
  return {
    slice: { id: sliceId, title },
    activePlan: activePlanSummary,
    runBrief,
    sliceProgress,
    dispatchInstruction,
    nextAction,
    gradeTrendCaution
  };
}

// Refresh the slice-progress dashboard with the new currentSliceId.
// Extracted from startSlice purely to lower its cyclomatic complexity.
async function refreshSliceProgress(repoPath, activePlan, sliceId, config = null) {
  return bestEffort(async () => {
    const enriched = await detectSliceStatus(repoPath, activePlan.slices, {
      slicesRoot: resolveSlicesRoot(repoPath, config)
    });
    return writeSliceProgress(repoPath, {
      activePlan,
      slices: enriched,
      currentSliceId: sliceId
    });
  });
}

export function buildDispatchInstruction({
  sliceId,
  title,
  sliceFile,
  repoPath,
  resolvedGoal,
  modelHint = null,
  featureId = null,
  sliceContent = null,
  featureExcerpt = null
}) {
  const rel = sliceFile ? path.relative(repoPath, sliceFile).replace(/\\/g, "/") : null;
  const goalLine = resolvedGoal ? ` Goal: ${resolvedGoal.slice(0, 200)}.` : "";
  const sliceRef = rel ? ` See \`${rel}\` for acceptance criteria.` : "";
  const modelLine = modelHint
    ? `\n\n> Preferred model: ${modelHint}. Use this model for the build subagent unless the task requires deeper reasoning.`
    : "";
  const lines = [
    `Dispatch /crew:build subagent with this prompt:`,
    "",
    `> Implement ${title}.${sliceRef}${goalLine} Follow the full crew build workflow (frame → implement → review → validate → synthesize). For review, dispatch a \`crew:reviewer\` subagent. For validation, dispatch a \`crew:validator\` subagent. Never use caveman:* agents for slice work — they lack the artifact protocol. When acceptance criteria PASS with evidence, return control so the parent loop can run /loop:slice complete --id ${sliceId}. If review or validation reports needs_fix / fail, pivot through /crew:fix before resuming.${modelLine}`
  ];

  if (sliceContent || featureExcerpt) {
    lines.push("", "## Slice context (pre-read — do not re-read these files)", "");
    if (rel && sliceContent) {
      lines.push(`### Slice: ${rel}`, "", sliceContent);
    }
    if (featureId && featureExcerpt) {
      lines.push("", `### Feature: ${featureId} (excerpt)`, "", featureExcerpt);
    }
  }

  return lines.join("\n");
}

// Locates the slice file under slicesRoot and reads frontmatter + objective
// text. Returns null fields when the slice file is missing — callers fall
// back gracefully (run-brief emits with bare sliceId; dispatchInstruction
// omits goalLine).
async function readSliceContext(slicesRoot, sliceId) {
  let file = null;
  try {
    file = await locateSliceFile(slicesRoot, sliceId);
  } catch {
    file = null;
  }
  if (!file) {
    return { file: null, frontmatter: {}, goal: null };
  }
  const content = await fs.readFile(file, "utf8");
  const frontmatter = parseFrontmatter(content).frontmatter || {};
  const goal = extractObjective(content);
  const scope = extractSection(content, /^##\s+(In\s+scope|Acceptance\s+criteria)\s*$/i, {
    maxLen: 800,
    joinChar: "\n"
  });
  const outOfScope = extractSection(content, /^##\s+Out\s+of\s+scope\s*$/i, {
    maxLen: 400,
    joinChar: "\n"
  });
  return { file, frontmatter, goal, scope, outOfScope, content };
}

async function readFeatureExcerpt(repoPath, featureId, config) {
  const root = resolveBacklogRoot(repoPath, config);
  for (const dir of ["in-progress", "triaged", "pending", "done"]) {
    const p = path.join(root, dir, `${featureId}.md`);
    const content = await fs.readFile(p, "utf8").catch(() => null);
    if (content) {
      return extractSection(content, /^##\s+Description\s*$/i, { maxLen: 400, joinChar: "\n" });
    }
  }
  return null;
}

export function extractSection(
  sliceContent,
  headingPattern,
  { maxLen = 500, joinChar = " " } = {}
) {
  const lines = sliceContent.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => headingPattern.test(l));
  if (startIdx === -1) return null;
  const body = [];
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^##\s+/.test(line)) break;
    if (line.trim().length === 0 && body.length === 0) continue;
    body.push(line);
  }
  const text = body.join(joinChar).trim();
  return text.length > 0 ? text.slice(0, maxLen) : null;
}

function extractObjective(sliceContent) {
  return extractSection(sliceContent, /^##\s+Objective\s*$/i);
}

import { mergeFrontmatter } from "./frontmatter.mjs";
