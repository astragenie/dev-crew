import fs from "node:fs/promises";
import path from "node:path";
import {
  archiveRun,
  createRun,
  summarizeMissingArtifactWritesForRun
} from "./workflow-state-gates.mjs";
import type {
  WorkflowState,
  WorkflowRun,
  RunFields,
  RunGates,
  GateEntry,
  GateStatus
} from "./workflow-state-gates.mjs";
import { readFileIfExists } from "./fs-utils.mjs";
import { type Result, ok, err } from "./result.mjs";

// Re-export core types so callers that import from workflow-state get them.
export type {
  GateStatus,
  GateEntry,
  DeploymentGates,
  RunGates,
  RunArtifacts,
  WorkflowRun,
  WorkflowState,
  RunFields
} from "./workflow-state-gates.mjs";

const STATE_DIR = [".claude", "state", "crew"] as const;
const WORKFLOW_STATE_PATH = [...STATE_DIR, "workflow-state.json"] as const;
const WORKFLOW_STATE_LOCK_PATH = [...STATE_DIR, "workflow-state.lock"] as const;
// Legacy path retained for read-side fallback so repos installed before the
// engineering-os -> crew rename still pick up their existing workflow state.
// Saves always go to the new path; the installer migration (Step 3) cleans
// the legacy file up.
const LEGACY_WORKFLOW_STATE_PATH = [
  ".claude",
  "state",
  "engineering-os",
  "workflow-state.json"
] as const;

export interface LoadOptions {
  createIfMissing?: boolean;
}

export interface BadgeOptions {
  badge?: string | undefined;
  title?: string | undefined;
  goal?: string | undefined;
  mode?: string | undefined;
  next?: string | undefined;
  note?: string | undefined;
  blockedBy?: string | null;
  force?: boolean;
  summary?: string | undefined;
}

export interface ArtifactRef {
  kind: string;
  path: string;
  title: string;
}

type RegisterFields = RunFields &
  BadgeOptions & {
    decision?: string | undefined;
    // P1.3: canonical enum verdict (approved|approved_with_notes|rejected for
    // review, pass|fail|skipped for validation). Distinct from `decision`,
    // which stays the raw legacy value. FEAT-024: absent now ALWAYS means a
    // scaffold / --status in-progress write (crew.mts's write-review-result /
    // write-validation-result handlers refuse any terminal write missing
    // --decision before an artifact is ever written) — so a verdict-less
    // call reaching the handlers below registers the artifact path only,
    // never a badge.
    verdict?: string | undefined;
    skipReason?: string | undefined;
    environment?: string | undefined;
    status?: string | undefined;
    // FEAT-024: the `--reviewer` / `--validator` value the write carried,
    // used as the aggregation key in GateEntry.reviewers / .validators.
    reviewer?: string | undefined;
    validator?: string | undefined;
  };

// ---------------------------------------------------------------------------
// Private utilities
// ---------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

function defaultWorkflowState(): WorkflowState {
  return {
    version: "1.0",
    updatedAt: nowIso(),
    currentRun: null,
    recentRuns: []
  };
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function ensureFile(filePath: string, contents: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, contents);
  }
}

// FEAT-024: snapshot the required reviewer set from .claude/loop.json's
// reviewers.ladder at write-run-brief time, so the gate's "every required
// reviewer has written" check has a fixed target for the life of the run
// (a mid-run config edit must not retroactively change what's required).
// Mirrors cost-watch.mts's readLoopCostCeiling read pattern (try/catch,
// null/default on any miss) — unlike src/scripts/lib/post-builder-fanout.mts's
// resolveLadder, entries are kept verbatim rather than normalized to the
// "A"/"B" letter subset, since `--reviewer` is also passed as a full role
// name (typescript-reviewer, csharp-reviewer, reviewer-lite) by several
// reviewer agents. Falls back to the two-entry ["A", "B"] default on any
// missing/malformed config, matching post-builder-fanout.mts's fallback so
// the review gate is never silently left unrequired.
const DEFAULT_REVIEWER_LADDER = ["A", "B"] as const;

async function resolveReviewerLadder(repoPath: string): Promise<string[]> {
  try {
    const raw = await fs.readFile(path.join(repoPath, ".claude", "loop.json"), "utf8");
    const parsed = JSON.parse(raw) as { reviewers?: { ladder?: unknown } };
    const ladder = parsed.reviewers?.ladder;
    if (!Array.isArray(ladder)) return [...DEFAULT_REVIEWER_LADDER];
    const seen = new Set<string>();
    const resolved: string[] = [];
    for (const entry of ladder) {
      const role = typeof entry === "string" ? entry.trim() : "";
      if (role && !seen.has(role)) {
        seen.add(role);
        resolved.push(role);
      }
    }
    return resolved.length > 0 ? resolved : [...DEFAULT_REVIEWER_LADDER];
  } catch {
    return [...DEFAULT_REVIEWER_LADDER];
  }
}

// ---------------------------------------------------------------------------
// Public scaffold / load / save
// ---------------------------------------------------------------------------

export async function ensureWorkflowStateScaffold(repoPath: string): Promise<void> {
  await ensureFile(
    path.join(repoPath, ...WORKFLOW_STATE_PATH),
    `${JSON.stringify(defaultWorkflowState(), null, 2)}\n`
  );
}

export async function loadWorkflowState(
  repoPath: string,
  options: LoadOptions = {}
): Promise<WorkflowState> {
  const workflowPath = path.join(repoPath, ...WORKFLOW_STATE_PATH);
  const workflowText = await readFileIfExists(workflowPath);
  if (workflowText !== null) {
    // State file is always written by this module; shape is trusted.
    return JSON.parse(workflowText) as WorkflowState;
  }

  const legacyPath = path.join(repoPath, ...LEGACY_WORKFLOW_STATE_PATH);
  const legacyText = await readFileIfExists(legacyPath);
  if (legacyText !== null) {
    return JSON.parse(legacyText) as WorkflowState;
  }

  if (options.createIfMissing === false) {
    return defaultWorkflowState();
  }

  await ensureWorkflowStateScaffold(repoPath);
  return JSON.parse(await fs.readFile(workflowPath, "utf8")) as WorkflowState;
}

// ---------------------------------------------------------------------------
// Advisory lock for merge-safe concurrent writes
// ---------------------------------------------------------------------------

async function acquireLock(lockPath: string, timeout = 5000): Promise<void> {
  const start = Date.now();
  const staleThreshold = 10000; // 10 seconds
  while (Date.now() - start < timeout) {
    try {
      // Ensure lock directory exists first
      await ensureDir(path.dirname(lockPath));
      // Try to create lock file exclusively (fails if exists)
      const fd = await fs.open(lockPath, "wx");
      await fd.close();
      return;
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code !== "EEXIST") throw e;

      // Lock exists; check if it's stale
      try {
        const stat = await fs.stat(lockPath);
        const age = Date.now() - stat.mtimeMs;
        if (age > staleThreshold) {
          // Lock is stale, remove it and retry
          await fs.unlink(lockPath).catch(() => {
            /* ignore stale-lock unlink errors */
          });
          continue;
        }
      } catch {
        // Stat failed, continue to backoff
      }

      // Lock exists and is fresh, backoff
      await new Promise((r) => setTimeout(r, 10));
    }
  }
  throw new Error("Workflow state lock timeout");
}

async function releaseLock(lockPath: string): Promise<void> {
  try {
    await fs.unlink(lockPath);
  } catch {
    // ENOENT or other errors are fine; lock is released
  }
}

async function saveWorkflowState(
  repoPath: string,
  state: WorkflowState,
  lockHeld = false
): Promise<void> {
  const lockPath = path.join(repoPath, ...WORKFLOW_STATE_LOCK_PATH);
  if (!lockHeld) {
    await acquireLock(lockPath);
  }
  try {
    const workflowPath = path.join(repoPath, ...WORKFLOW_STATE_PATH);
    state.updatedAt = nowIso();
    await ensureDir(path.dirname(workflowPath));
    await fs.writeFile(workflowPath, `${JSON.stringify(state, null, 2)}\n`);
  } finally {
    if (!lockHeld) {
      await releaseLock(lockPath);
    }
  }
}

// ---------------------------------------------------------------------------
// Run lifecycle
// ---------------------------------------------------------------------------

export async function startWorkflowRun(
  repoPath: string,
  fields: RunFields = {}
): Promise<WorkflowRun> {
  const lockPath = path.join(repoPath, ...WORKFLOW_STATE_LOCK_PATH);
  await acquireLock(lockPath);
  try {
    const state = await loadWorkflowState(repoPath);
    if (state.currentRun) {
      archiveRun(state, state.currentRun);
    }
    state.currentRun = createRun(fields);
    await saveWorkflowState(repoPath, state, true);
    return state.currentRun;
  } finally {
    await releaseLock(lockPath);
  }
}

function ensureCurrentRun(state: WorkflowState, fields: RunFields = {}): WorkflowRun {
  if (!state.currentRun) {
    state.currentRun = createRun(fields);
  }
  return state.currentRun;
}

// ---------------------------------------------------------------------------
// Badge table — maps badge name to gate selector and status
// ---------------------------------------------------------------------------

type GateParent = RunGates | RunGates["deployment"];

interface BadgeSpec {
  selector: (run: WorkflowRun) => [GateParent, string];
  status: GateStatus;
  custom?: boolean;
}

const BADGE_TABLE: Record<string, BadgeSpec> = {
  review_required: { selector: (run) => [run.gates, "review"], status: "required" },
  review_passed: { selector: (run) => [run.gates, "review"], status: "passed" },
  review_failed: { selector: (run) => [run.gates, "review"], status: "failed" },
  review_skipped: { selector: (run) => [run.gates, "review"], status: "skipped" },
  validation_expected: { selector: (run) => [run.gates, "validation"], status: "expected" },
  validation_passed: { selector: (run) => [run.gates, "validation"], status: "passed" },
  validation_failed: { selector: (run) => [run.gates, "validation"], status: "failed" },
  validation_skipped: { selector: (run) => [run.gates, "validation"], status: "skipped" },
  validation_stale: { selector: (run) => [run.gates, "validation"], status: "stale", custom: true },
  dev_deploy_expected: {
    selector: (run) => [run.gates.deployment, "dev"],
    status: "expected"
  },
  dev_checked: { selector: (run) => [run.gates.deployment, "dev"], status: "passed" },
  dev_failed: { selector: (run) => [run.gates.deployment, "dev"], status: "failed" },
  dev_skipped: { selector: (run) => [run.gates.deployment, "dev"], status: "skipped" },
  prod_deploy_expected: {
    selector: (run) => [run.gates.deployment, "prod"],
    status: "expected"
  },
  prod_checked: { selector: (run) => [run.gates.deployment, "prod"], status: "passed" },
  prod_failed: { selector: (run) => [run.gates.deployment, "prod"], status: "failed" },
  prod_skipped: { selector: (run) => [run.gates.deployment, "prod"], status: "skipped" },
  blocked: { selector: (run) => [run.gates, "blocked"], status: "blocked", custom: true },
  specialist_recommended: {
    // FEAT-180: builder surfaces "this work belongs to <specialist>".
    // Dispatcher reads + routes a fresh slice to the named specialist.
    selector: (run) => [run.gates, "specialist"],
    status: "recommended",
    custom: true
  },
  escalated_to_dispatcher: {
    selector: (run) => [run.gates, "escalation"],
    status: "escalated",
    custom: true
  },
  // FEAT-180 v2.0.0 rename: dispatcher → semantic concept; lead alias kept
  // for backward-compat with historical artifacts + consumer state files.
  escalated_to_lead: {
    selector: (run) => [run.gates, "escalation"],
    status: "escalated",
    custom: true
  },
  // FEAT-182 SLICE-A: incident-response dispatcher badges. incident_resolved
  // marks full pass through /crew:incident triage; rollback_executed marks a
  // release-engineer-driven rollback.
  incident_resolved: {
    selector: (run) => [run.gates, "incident"],
    status: "resolved",
    custom: true
  },
  rollback_executed: {
    selector: (run) => [run.gates, "incident"],
    status: "rolled-back",
    custom: true
  },
  // FEAT-182 SLICE-B: retry-exhaustion or a rollback decision that needs the
  // user. Lands in the same `incident` gate slot as incident_resolved /
  // rollback_executed, so the incident timeline stays in one place — distinct
  // from the generic `blocked` badge used elsewhere in the workflow.
  incident_blocked: {
    selector: (run) => [run.gates, "incident"],
    status: "blocked",
    custom: true
  },
  // help_request/help_resolved: builder or integrator needs operator input
  // (missing env var, contract drift, setup problem). Long promised by the
  // constitution's dev.stable gate ("no help_request badge open") and
  // instructed in builder prompts, but never backed by a BADGE_TABLE entry
  // until now. Paired like incident_blocked/incident_resolved so an open
  // request has an explicit clear path and cannot permanently wedge finalize.
  help_request: {
    selector: (run) => [run.gates, "help"],
    status: "requested",
    custom: true
  },
  help_resolved: {
    selector: (run) => [run.gates, "help"],
    status: "resolved",
    custom: true
  }
};

function applyBadge(
  run: WorkflowRun,
  badge: string,
  note = "",
  blockedBy: string | null = null
): void {
  const spec = BADGE_TABLE[badge];
  if (!spec) {
    throw new Error(`Unsupported workflow badge: ${badge}`);
  }
  const [parent, key] = spec.selector(run);

  if (spec.custom) {
    const gateObj: GateEntry = { status: spec.status, updatedAt: nowIso(), note: note || "" };
    if ((badge === "blocked" || badge === "incident_blocked") && blockedBy !== null) {
      gateObj.blockedBy = blockedBy;
    }
    (parent as unknown as Record<string, GateEntry | null>)[key] = gateObj;
  } else {
    (parent as unknown as Record<string, GateEntry | null>)[key] = {
      status: spec.status,
      updatedAt: nowIso(),
      note: note || ""
    };
  }
}

// ---------------------------------------------------------------------------
// Badge mutation
// ---------------------------------------------------------------------------

export async function markWorkflowBadge(
  repoPath: string,
  options: BadgeOptions = {}
): Promise<Result<WorkflowRun | null, Error>> {
  const lockPath = path.join(repoPath, ...WORKFLOW_STATE_LOCK_PATH);
  try {
    const badge = options.badge;
    if (!badge) {
      throw new Error("Workflow badge is required.");
    }

    await acquireLock(lockPath);
    try {
      const state = await loadWorkflowState(repoPath);
      const run = ensureCurrentRun(state, {
        title: options.title || "Workflow Run",
        goal: options.goal || "",
        mode: options.mode || "",
        next: options.next || ""
      });
      applyBadge(run, badge, options.note || "", options.blockedBy ?? null);
      run.updatedAt = nowIso();
      if (options.next) {
        run.next = options.next;
      }
      await saveWorkflowState(repoPath, state, true);
      return ok(state.currentRun);
    } finally {
      await releaseLock(lockPath);
    }
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

// ---------------------------------------------------------------------------
// Artifact handlers — per-kind dispatch (AC-8: extracted from registerWorkflowArtifact)
// ---------------------------------------------------------------------------

type ArtifactHandler = (run: WorkflowRun, artifact: ArtifactRef, fields: RegisterFields) => void;

function handleHandoff(run: WorkflowRun, artifact: ArtifactRef): void {
  run.artifacts.handoffs = [...(run.artifacts.handoffs || []), artifact.path].slice(-10);
}

// FEAT-024: compute the aggregated review-gate status from the per-reviewer
// verdict map. Any "rejected" dominates (gate fails outright, regardless of
// how many required slots have or haven't written yet). Otherwise, `required`
// entries are SLOTS (a count), not reviewer-name labels — live reviewers
// write under their own `--reviewer` key (e.g. "typescript-reviewer",
// "reviewer-lite"), which rarely matches a ladder label like "A"/"B". The
// gate passes once at least as many distinct reviewers have written an
// approving verdict as there are required slots; an empty/absent `required`
// falls back to "whatever has been written so far" so a direct (non-ladder)
// write still resolves to "passed" on its first approval, matching
// pre-FEAT-024 single-reviewer behavior.
function computeReviewGateStatus(
  reviewers: Record<string, string>,
  required: string[]
): GateStatus {
  const values = Object.values(reviewers);
  if (values.includes("rejected")) return "failed";
  const approving = values.filter((v) => v === "approved" || v === "approved_with_notes");
  if (required.length > 0) {
    return approving.length >= required.length ? "passed" : "required";
  }
  return values.length > 0 && approving.length === values.length ? "passed" : "required";
}

// Merges one reviewer's verdict into run.gates.review and recomputes status.
// Only called with a defined, canonical verdict (approved/approved_with_notes
// /rejected) — handleReviewResult below is the sole caller and only reaches
// here once crew.mts's write-review-result handler has already refused any
// terminal write missing --decision.
function applyReviewVerdict(
  run: WorkflowRun,
  reviewerKey: string,
  verdict: "approved" | "approved_with_notes" | "rejected",
  note: string
): void {
  const existing = run.gates.review;
  const reviewers = { ...(existing?.reviewers ?? {}), [reviewerKey]: verdict };
  const required = existing?.required ?? [];
  run.gates.review = {
    status: computeReviewGateStatus(reviewers, required),
    updatedAt: nowIso(),
    note: note || existing?.note || "",
    reviewers,
    required
  };
}

// FEAT-024: scaffolds / --status in-progress writes never flip the gate —
// `fields.verdict` undefined at this point always means one of those (see
// RegisterFields.verdict comment above); this handler only registers the
// artifact path. Once a verdict IS present it must be a recognized canonical
// value or this throws — never falls through to a passing badge.
function handleReviewResult(run: WorkflowRun, artifact: ArtifactRef, fields: RegisterFields): void {
  run.artifacts.reviewResult = artifact.path;
  const verdict = fields.verdict;
  if (verdict === undefined) {
    return;
  }
  if (verdict !== "approved" && verdict !== "approved_with_notes" && verdict !== "rejected") {
    throw new Error(
      `handleReviewResult: unrecognized review verdict "${verdict}" — refusing to fail open to review_passed.`
    );
  }
  applyReviewVerdict(run, fields.reviewer || "reviewer", verdict, fields.summary || "");
}

function handleValidationPlan(
  run: WorkflowRun,
  artifact: ArtifactRef,
  fields: RegisterFields
): void {
  run.artifacts.validationPlan = artifact.path;
  applyBadge(run, "validation_expected", fields.summary || fields.goal || "");
}

// FEAT-024: validation-gate counterpart to computeReviewGateStatus. "fail"
// dominates; otherwise, `required` entries are SLOTS (a count), not
// validator-name labels — live validators write under their own
// `--validator` key, which rarely matches a ladder label. The gate resolves
// once at least as many distinct validators have written as there are
// required slots — "skipped" when every one of those verdicts is "skipped"
// (no "pass" among them), else "passed". Empty/absent `required` falls back
// to "whatever has been written so far", same single-validator
// backward-compat fallback as the review side.
function computeValidationGateStatus(
  validators: Record<string, string>,
  required: string[]
): GateStatus {
  const values = Object.values(validators);
  if (values.includes("fail")) return "failed";
  const allWritten = required.length > 0 ? values.length >= required.length : values.length > 0;
  if (!allWritten) return "expected";
  return values.every((v) => v === "skipped") ? "skipped" : "passed";
}

// Merges one validator's verdict into run.gates.validation and recomputes
// status. Only called with a defined, canonical verdict (pass/fail/skipped).
function applyValidationVerdict(
  run: WorkflowRun,
  validatorKey: string,
  verdict: "pass" | "fail" | "skipped",
  note: string
): void {
  const existing = run.gates.validation;
  const validators = { ...(existing?.validators ?? {}), [validatorKey]: verdict };
  const required = existing?.required ?? [];
  run.gates.validation = {
    status: computeValidationGateStatus(validators, required),
    updatedAt: nowIso(),
    note: note || existing?.note || "",
    validators,
    required
  };
}

// FEAT-024: same scaffold/in-progress-never-flips-the-gate treatment as
// handleReviewResult. `skipped` folds --skip-reason into the gate note since
// GateEntry has no dedicated field for it.
function handleValidationResult(
  run: WorkflowRun,
  artifact: ArtifactRef,
  fields: RegisterFields
): void {
  run.artifacts.validationResult = artifact.path;
  const verdict = fields.verdict;
  if (verdict === undefined) {
    return;
  }
  if (verdict !== "pass" && verdict !== "fail" && verdict !== "skipped") {
    throw new Error(
      `handleValidationResult: unrecognized validation verdict "${verdict}" — refusing to fail open to validation_passed.`
    );
  }
  const note =
    verdict === "skipped" && fields.skipReason
      ? `skipped: ${fields.skipReason}`
      : fields.summary || fields.goal || "";
  applyValidationVerdict(run, fields.validator || "verifier", verdict, note);
}

function handleDeploymentCheck(
  run: WorkflowRun,
  artifact: ArtifactRef,
  fields: RegisterFields
): void {
  const environment = fields.environment === "prod" ? "prod" : "dev";
  run.artifacts.deploymentChecks[environment] = artifact.path;
  applyBadge(
    run,
    fields.decision === "failed" ? `${environment}_failed` : `${environment}_checked`,
    fields.summary || fields.goal || ""
  );
}

function handleFinalSynthesis(
  run: WorkflowRun,
  artifact: ArtifactRef,
  fields: RegisterFields
): void {
  const stateSnapshot: WorkflowState = {
    currentRun: run,
    version: "",
    updatedAt: "",
    recentRuns: []
  };
  const pendingBadges = summarizeWorkflowState(stateSnapshot).pendingBadges;
  const hasEscalation = run?.gates?.escalation?.status === "escalated";
  const force = fields.force === true;

  if (pendingBadges.length > 0 && !force) {
    throw new Error(
      `Cannot finalize run while workflow badges are still pending: ${pendingBadges.join(", ")}`
    );
  }
  if (hasEscalation && !force) {
    throw new Error("Cannot finalize run while escalated to lead. Use --force to override.");
  }
  run.artifacts.finalSynthesis = artifact.path;
  run.status = fields.status || "completed";
  run.completedAt = nowIso();
}

// Per-artifact-kind handlers used by registerWorkflowArtifact. Each takes
// (run, artifact, fields) and mutates run in place. Centralizing the
// dispatch keeps registerWorkflowArtifact below the complexity budget
// and makes adding a new artifact kind a one-entry change.
const ARTIFACT_HANDLERS: Record<string, ArtifactHandler> = {
  handoff: handleHandoff,
  "review-result": handleReviewResult,
  "validation-plan": handleValidationPlan,
  "validation-result": handleValidationResult,
  "deployment-check": handleDeploymentCheck,
  "final-synthesis": handleFinalSynthesis
};

function applyArtifactToRun(run: WorkflowRun, artifact: ArtifactRef, fields: RegisterFields): void {
  const handler = ARTIFACT_HANDLERS[artifact.kind];
  if (handler) {
    handler(run, artifact, fields);
  }
}

// ---------------------------------------------------------------------------
// Artifact registration
// ---------------------------------------------------------------------------

export async function registerWorkflowArtifact(
  repoPath: string,
  artifact: ArtifactRef,
  fields: RegisterFields = {}
): Promise<WorkflowRun | null> {
  const lockPath = path.join(repoPath, ...WORKFLOW_STATE_LOCK_PATH);
  await acquireLock(lockPath);
  try {
    const state = await loadWorkflowState(repoPath);

    if (artifact.kind === "run-brief") {
      // BUG-B fix: archive the existing run instead of silently overwriting.
      // Pre-fix behavior destroyed pending gates (e.g. review_required) and
      // never populated recentRuns. archiveRun safely no-ops on null.
      archiveRun(state, state.currentRun);
      state.currentRun = createRun({
        ...(fields.title !== undefined ? { title: fields.title } : {}),
        ...(fields.goal !== undefined ? { goal: fields.goal } : {}),
        ...(fields.mode !== undefined ? { mode: fields.mode } : {}),
        ...(fields.next !== undefined ? { next: fields.next } : {}),
        path: artifact.path
      });
      // FEAT-024: snapshot the required reviewer set at run-brief time so
      // the gate's "every required reviewer has written" check has a fixed
      // target for this run's lifetime.
      state.currentRun.gates.review = {
        status: "required",
        updatedAt: nowIso(),
        reviewers: {},
        required: await resolveReviewerLadder(repoPath)
      };
      await saveWorkflowState(repoPath, state, true);
      return state.currentRun;
    }

    const run = ensureCurrentRun(state, {
      title: fields.title || artifact.title,
      goal: fields.goal || "",
      mode: fields.mode || "",
      next: fields.next || ""
    });

    applyArtifactToRun(run, artifact, fields);

    run.updatedAt = nowIso();
    if (fields.next) {
      run.next = fields.next;
    }
    await saveWorkflowState(repoPath, state, true);
    return state.currentRun;
  } finally {
    await releaseLock(lockPath);
  }
}

// ---------------------------------------------------------------------------
// State summary
// ---------------------------------------------------------------------------

// Pending-badge specs: each maps the runtime gate-status check to the
// badge name emitted in the workflow summary. Keeping these as data lets
// summarizeWorkflowState stay small enough to read at a glance.
const PENDING_BADGE_SPECS: Array<{
  badge: string;
  check: (run: WorkflowRun | null | undefined) => boolean;
}> = [
  { badge: "review_required", check: (run) => run?.gates?.review?.status === "required" },
  { badge: "validation_expected", check: (run) => run?.gates?.validation?.status === "expected" },
  {
    badge: "dev_deploy_expected",
    check: (run) => run?.gates?.deployment?.dev?.status === "expected"
  },
  {
    badge: "prod_deploy_expected",
    check: (run) => run?.gates?.deployment?.prod?.status === "expected"
  },
  { badge: "blocked", check: (run) => run?.gates?.blocked?.status === "blocked" },
  {
    badge: "escalated_to_dispatcher",
    check: (run) => run?.gates?.escalation?.status === "escalated"
  },
  { badge: "help_request", check: (run) => run?.gates?.help?.status === "requested" }
];

function collectPendingBadges(currentRun: WorkflowRun | null | undefined): string[] {
  return PENDING_BADGE_SPECS.filter((spec) => spec.check(currentRun)).map((spec) => spec.badge);
}

export interface WorkflowStateSummary {
  hasActiveRun: boolean;
  pendingBadges: string[];
  missingArtifactWrites: string[];
  currentRun: object | null;
}

export function summarizeWorkflowState(state: WorkflowState): WorkflowStateSummary {
  const currentRun = state?.currentRun ?? null;
  if (!currentRun) {
    return {
      hasActiveRun: false,
      pendingBadges: [],
      missingArtifactWrites: [],
      currentRun: null
    };
  }

  const pendingBadges = collectPendingBadges(currentRun);
  const missingArtifactWrites = summarizeMissingArtifactWritesForRun(currentRun);

  return {
    hasActiveRun: currentRun.status !== "completed",
    pendingBadges,
    missingArtifactWrites,
    currentRun: {
      title: currentRun.title,
      goal: currentRun.goal,
      mode: currentRun.mode,
      status: currentRun.status,
      next: currentRun.next,
      gates: currentRun.gates,
      artifacts: currentRun.artifacts,
      updatedAt: currentRun.updatedAt
    }
  };
}
