// ARCHITECT GATE (runner side) — pre-slice-1 architect + risk gate for P0/P1
// fullstack FEATs, with a bounded reject loop that DEFERS (never blocks for
// a human). Builds on WS-3 (pickBuilderVariant surface-based variants),
// PM --rescope (pm-apply.mts applyPmRescope), and WS-4 (isBranchInProgress).
//
// ARCHITECTURE DECISION: `devcrew:start` is a CLI — it RETURNS a
// dispatchInstruction for the orchestrating loop to execute; it never spawns
// agents itself. So this module never dispatches devcrew:architect-feature /
// devcrew:architect-reviewer directly. It only:
//   1. decides WHETHER the gate should fire (shouldRunArchGate /
//      maybeBuildArchGatePreflight),
//   2. emits the instruction TEXT the loop hands to subagents
//      (buildArchGatePreflight), and
//   3. persists the reject-loop state machine into FEAT frontmatter once the
//      loop reports a verdict back (applyArchGateVerdict) — a frontmatter
//      state machine, not an in-process loop. Re-entry (a later
//      `devcrew:start` call for the same FEAT) reads `arch_attempt` /
//      `arch_status` back off disk to resume the cycle.
//
// Re-entry note: `contractsArtifactExists()` gates the FIRST entry into the
// gate (avoids re-running the gate for FEATs that already carry a finished
// contracts artifact from an earlier or unrelated pass). Once a cycle is
// underway (`arch_status === "gate_in_progress"`), the state machine —not
// the contracts-file check— governs re-entry: devcrew:architect-feature
// regenerates the same path on every round, so the file already existing
// from round 1 must not block round 2 after a rescope.

import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter } from "./frontmatter.mjs";
import { findFeatureById, updateFeatureFrontmatter } from "./backlog-writer.mjs";
import { contractsArtifactExists } from "./contracts-artifact.mjs";

// ---------------------------------------------------------------------------
// Part 2: gate condition
// ---------------------------------------------------------------------------

const GATE_PRIORITIES = new Set(["P0", "P1"]);
const POSITIVE_FULLSTACK_VARIANTS = new Set(["fullstack", "parallel-fe-be"]);

/**
 * Resolve a FEAT's effective priority. `pm_composite_priority` (PM triage
 * output) wins over the plain `priority` field, mirroring
 * comparePickOrder's precedence elsewhere in the backlog stack.
 */
export function resolveFeaturePriority(
  frontmatter: Record<string, unknown> | null | undefined
): string | null {
  const composite = frontmatter?.pm_composite_priority;
  if (typeof composite === "string" && composite.length > 0) return composite;
  const plain = frontmatter?.priority;
  return typeof plain === "string" && plain.length > 0 ? plain : null;
}

/**
 * True when a WS-3 builder variant is a POSITIVE fullstack signal —
 * "unknown" (no tag data) and single-surface variants ("frontend",
 * "backend") do not qualify. Only a confirmed dual-surface signal
 * ("fullstack" or "parallel-fe-be") should trigger the pre-slice-1 gate.
 */
export function isPositiveFullstackVariant(variant: string | null | undefined): boolean {
  return typeof variant === "string" && POSITIVE_FULLSTACK_VARIANTS.has(variant);
}

/**
 * True when `sliceId` is the FIRST slice materialized for the FEAT
 * (`feature.slices[0]`) — the only point at which the pre-slice-1 gate can
 * fire. Slice ids are allocated globally (SLICE-NN across the whole repo,
 * not per-FEAT), so "slice 1 of a FEAT" is defined by frontmatter position,
 * not by slice-id shape.
 */
export function isFirstSliceOfFeature(
  featureFrontmatter: Record<string, unknown> | null | undefined,
  sliceId: string
): boolean {
  const slices = featureFrontmatter?.slices;
  return Array.isArray(slices) && slices.length > 0 && slices[0] === sliceId;
}

export interface ArchGateConditionInput {
  priority: string | null;
  variant: string | null;
  isFirstSlice: boolean;
  contractsExist: boolean;
  archStatus: string | null | undefined;
}

/**
 * Pure decision function for whether `devcrew:start` should prepend the
 * ARCHITECT GATE preflight instruction to a slice-build dispatch. See the
 * module docstring for the re-entry precedence rule. Crew presence is no
 * longer a precondition (P2 seam-elimination, SLICE-13) — crew is a
 * same-repo subtree now, not an installed plugin that could be absent.
 */
export function shouldRunArchGate(input: ArchGateConditionInput): boolean {
  if (!input.isFirstSlice) return false;
  if (!input.priority || !GATE_PRIORITIES.has(input.priority)) return false;
  if (!isPositiveFullstackVariant(input.variant)) return false;
  if (input.archStatus === "deferred_design") return false; // never re-enters
  if (input.archStatus === "approved") return false; // already resolved
  if (input.archStatus === "gate_in_progress") return true; // active cycle — re-fire regardless of contracts-file state
  return !input.contractsExist; // first entry — contracts artifact is the entry signal
}

/**
 * Build the dispatch instruction block for the ARCHITECT GATE preflight.
 * Modeled on buildArchitectPreflight (slice-linker/dispatch.mts) — same
 * shape (dispatch, AWAIT, proceed), scaled up to the two-specialist
 * feature-level ladder plus the CLI call that persists the verdict.
 */
export function buildArchGatePreflight(featureId: string, title: string): string {
  const contractsPath = `.claude/artifacts/crew/designs/${featureId}-contracts.openapi.yaml`;
  return [
    `ARCHITECT GATE — pre-slice-1 risk gate for ${featureId} (${title}). This is a P0/P1 ` +
      `fullstack FEAT with no approved contracts artifact yet — run the risk gate BEFORE ` +
      `dispatching the first slice builder.`,
    "",
    `1. Dispatch devcrew:architect-feature FIRST with this prompt:`,
    "",
    `> Run /devcrew:architect-feature ${featureId} WITHOUT --auto-start. Produce the contracts ` +
      `artifact at \`${contractsPath}\` and infer surface/stack/concern tags onto the FEAT ` +
      `frontmatter. Return the artifact path.`,
    "",
    `AWAIT the contracts artifact. Then dispatch devcrew:architect-reviewer over it:`,
    "",
    `> Review \`${contractsPath}\` for ${featureId}. Assess service boundaries, integration ` +
      `risk, and scalability per devcrew:architect-reviewer's rubric. Return a verdict of ` +
      `approved | approved_with_notes | rejected (needs_revision), a list of objections when ` +
      `the verdict is not approved, and a list of risk flags (concerns worth recording even on ` +
      `an approved_with_notes verdict).`,
    "",
    `AWAIT the reviewer verdict. Then persist it — this call records arch_review (the ` +
      `normalized verdict) and arch_risk (the risk flags — defaults to --objections when ` +
      `--risk-flags is omitted) and advances the reject-loop state machine:`,
    "",
    `> bun loop.mts backlog arch-gate-apply --id ${featureId} --verdict <verdict> --objections <objections.json> [--risk-flags <risk-flags.json>]`,
    "",
    `Branch on the CLI's response:`,
    `  - \`arch_status: "approved"\` → gate cleared. Proceed with the builder dispatch below.`,
    `  - \`arch_status: "gate_in_progress"\` (rejected, attempt < budget) → run ` +
      `\`bun loop.mts backlog pm-rescope --file <p> --ids ${featureId}\` with the reviewer's ` +
      `objections, then re-run \`/devcrew:start\` for ${featureId} to re-enter the gate. Do NOT ` +
      `dispatch the builder this round.`,
    `  - \`arch_status: "deferred_design"\` (rejected, attempts exhausted) → the FEAT has been ` +
      `auto-deferred (priority demoted one step, autonomous_safe: false). Move on to the next ` +
      `backlog item — do NOT retry ${featureId} again this session.`,
    `  - \`halted: true, halt_reason: "budget_exceeded"\` → STOP. Surface to the operator — do ` +
      `NOT silently proceed or defer.`,
    "",
    `If approved, proceed with the builder dispatch below:`,
    ""
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Part 3: reject-loop state machine (frontmatter)
// ---------------------------------------------------------------------------

export type ArchGateStatus = "gate_in_progress" | "approved" | "deferred_design";

// Max REJECTED rounds before the FEAT is auto-deferred. arch_attempt counts
// rejections (not the first, pre-verdict entry) — the 1st rejection bumps
// attempt to 1 and retries (1 < 2); the 2nd rejection bumps attempt to 2
// and defers (2 is not < 2).
export const MAX_ARCH_GATE_ATTEMPTS = 2;

const PRIORITY_DEMOTION: Record<string, string> = {
  P0: "P1",
  P1: "P2",
  P2: "P2",
  P3: "P3",
  P4: "P4"
};

/** Demote a priority string one step (P0→P1→P2), floored at P2. */
export function demotePriority(priority: string | null | undefined): string {
  if (!priority) return "P2";
  return PRIORITY_DEMOTION[priority] ?? priority;
}

export type NormalizedVerdict = "approved" | "rejected";

const APPROVED_VERDICTS = new Set(["approved", "approved_with_notes"]);
const REJECTED_VERDICTS = new Set(["rejected", "needs_revision"]);

/** Normalize an architect-reviewer verdict string. Throws on an unrecognized value — fail loud rather than silently treating an unknown verdict as either outcome. */
export function normalizeVerdict(raw: string): NormalizedVerdict {
  const v = (raw ?? "").trim().toLowerCase();
  if (APPROVED_VERDICTS.has(v)) return "approved";
  if (REJECTED_VERDICTS.has(v)) return "rejected";
  throw new Error(
    `arch-gate: unrecognized verdict "${raw}" — expected one of ` +
      "approved|approved_with_notes|rejected|needs_revision"
  );
}

export interface ArchGateTransition {
  status: ArchGateStatus;
  attempt: number;
  demote: boolean;
}

/**
 * Pure state transition (Part 3). Given the current rejection count and a
 * raw verdict, compute the next arch_attempt/arch_status. Never touches
 * disk — callers persist the result (see applyArchGateVerdict).
 */
export function computeArchGateTransition(
  priorAttempt: number,
  verdictRaw: string
): ArchGateTransition {
  const verdict = normalizeVerdict(verdictRaw);
  if (verdict === "approved") {
    return { status: "approved", attempt: priorAttempt, demote: false };
  }
  const attempt = priorAttempt + 1;
  if (attempt < MAX_ARCH_GATE_ATTEMPTS) {
    return { status: "gate_in_progress", attempt, demote: false };
  }
  return { status: "deferred_design", attempt, demote: true };
}

// ---------------------------------------------------------------------------
// Part 5: budget config
// ---------------------------------------------------------------------------

export const DEFAULT_ARCH_GATE_BUDGET_USD = 100;
export const ARCH_GATE_BUDGET_HARD_CEILING_USD = 160;

/**
 * Read `loop.archGateBudgetUsdPerFeat` from .claude/loop.json, clamped to
 * the hard ceiling regardless of what the operator configures. Defaults to
 * DEFAULT_ARCH_GATE_BUDGET_USD when unset/invalid.
 */
export function resolveArchGateBudgetUsd(config: Record<string, any> | null | undefined): number {
  const configured = config?.loop?.archGateBudgetUsdPerFeat;
  if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
    return Math.min(configured, ARCH_GATE_BUDGET_HARD_CEILING_USD);
  }
  return DEFAULT_ARCH_GATE_BUDGET_USD;
}

/**
 * Thrown by checkArchGateBudget when spend exceeds the configured ceiling.
 * Mirrors the triageBudget BudgetExceeded halt pattern (skills/triage/SKILL.md,
 * commands/triage.md) — halt-and-escalate to the operator, NOT a silent
 * defer. `halt_reason` matches triage's structured halt contract so callers
 * can pattern-match the same field name.
 */
export class ArchGateBudgetExceededError extends Error {
  readonly halt_reason = "budget_exceeded" as const;
  readonly featureId: string;
  readonly actualUsd: number;
  readonly ceilingUsd: number;

  constructor(featureId: string, actualUsd: number, ceilingUsd: number) {
    super(
      `arch-gate(${featureId}): spend $${actualUsd.toFixed(2)} exceeds archGateBudgetUsdPerFeat ` +
        `ceiling $${ceilingUsd} — halting (no silent defer). Operator: adjust ` +
        "loop.archGateBudgetUsdPerFeat, review architect-feature/architect-reviewer cost reports " +
        "for this FEAT, or resolve manually."
    );
    this.name = "ArchGateBudgetExceededError";
    this.featureId = featureId;
    this.actualUsd = actualUsd;
    this.ceilingUsd = ceilingUsd;
  }
}

/**
 * Throws ArchGateBudgetExceededError when actualUsdSpent exceeds the
 * configured (or default) per-FEAT ceiling; otherwise returns the resolved
 * ceiling/actual pair. Pure aside from the throw — callers decide what a
 * halt means for their own flow (applyArchGateVerdict halts before any
 * frontmatter write).
 */
export function checkArchGateBudget(
  featureId: string,
  actualUsdSpent: number,
  config: Record<string, any> | null | undefined
): { ceilingUsd: number; actualUsd: number } {
  const ceilingUsd = resolveArchGateBudgetUsd(config);
  if (actualUsdSpent > ceilingUsd) {
    throw new ArchGateBudgetExceededError(featureId, actualUsdSpent, ceilingUsd);
  }
  return { ceilingUsd, actualUsd: actualUsdSpent };
}

const COST_DIR_PARTS = [".claude", "artifacts", "crew", "cost"];

/**
 * Sum USD spend across all non-aggregate cost reports tagged
 * `feature: <featureId>` in frontmatter (crew's `cost-slice --feature`
 * flag — see slice-linker/crew-bridge.mts appendFeaturePhaseArgs). Best
 * effort: returns 0 when the cost dir is absent or no report matches.
 * Mirrors slice-cost-ceiling.mts's per-slice reader, scoped by FEAT
 * instead of slice — an approximation (any cost report tagged with this
 * FEAT counts, not only architect-feature/architect-reviewer dispatches),
 * documented as a known limitation rather than silently assumed exact.
 */
export async function readFeatureCostSpendUsd(
  repoPath: string,
  featureId: string
): Promise<number> {
  const dir = path.join(repoPath, ...COST_DIR_PARTS);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return 0;
  }
  let total = 0;
  for (const name of entries) {
    if (!/-cost-report-/.test(name) || /-cost-report-aggregate-/.test(name)) continue;
    let text: string;
    try {
      text = await fs.readFile(path.join(dir, name), "utf8");
    } catch {
      continue;
    }
    const { frontmatter } = parseFrontmatter(text);
    if (frontmatter?.feature !== featureId) continue;
    if (frontmatter?.aggregate_all === true || frontmatter?.aggregate_all === "true") continue;
    const usdRaw = frontmatter?.usd;
    const usd = typeof usdRaw === "number" ? usdRaw : Number(usdRaw);
    if (Number.isFinite(usd)) total += usd;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Write path — persists a verdict into FEAT frontmatter (Part 3 + Part 5).
// Sole writer of arch_* fields; routes through updateFeatureFrontmatter
// (backlog-writer.mts), the same shared primitive pm-apply.mts uses — no
// second bespoke frontmatter writer is introduced.
// ---------------------------------------------------------------------------

export interface ApplyArchGateVerdictOpts {
  objections?: string[] | null;
  /**
   * Reviewer risk flags — the same category of concern architect-reviewer
   * surfaces regardless of the accept/reject boundary (an
   * `approved_with_notes` verdict can still carry risk flags worth
   * recording). Defaults to `objections` when omitted: on a rejected
   * verdict the objections themselves ARE the reviewer's risk flags, so a
   * caller that only threads `objections` through still gets `arch_risk`
   * persisted without having to pass the same data twice.
   */
  riskFlags?: string[] | string | null;
  /** USD spent so far on this FEAT's gate cycle, when known. Omit to skip the budget check (e.g. a caller that has no cost-report signal yet). */
  actualUsdSpent?: number | null;
  config?: Record<string, unknown> | null;
}

export interface ApplyArchGateVerdictResult {
  featureId: string;
  arch_status: ArchGateStatus;
  arch_attempt: number;
  noop: boolean;
  priority?: string;
  arch_defer_reason?: string;
  arch_review?: NormalizedVerdict;
  arch_risk?: string[] | string;
}

/**
 * Persist an architect-reviewer verdict into FEAT frontmatter, advancing
 * the reject-loop state machine. Idempotent: a FEAT already
 * `deferred_design` never re-enters — returns the current state as a
 * no-op, no write. Budget is checked BEFORE any write — an exceeded budget
 * throws ArchGateBudgetExceededError and writes nothing at all
 * (halt-and-escalate, never a silent defer).
 */
export async function applyArchGateVerdict(
  repoPath: string,
  featureId: string,
  verdictRaw: string,
  opts: ApplyArchGateVerdictOpts = {}
): Promise<ApplyArchGateVerdictResult> {
  const config = (opts.config ?? null) as Record<string, any> | null;
  const entry = await findFeatureById(repoPath, featureId, config);
  if (!entry) {
    throw new Error(`arch-gate: no matching FEAT file found on disk for ${featureId}`);
  }
  const fm = entry.frontmatter as Record<string, any>;
  const priorAttempt = typeof fm.arch_attempt === "number" ? fm.arch_attempt : 0;
  const priorStatus: string | null = fm.arch_status ?? null;

  // Idempotency: a deferred FEAT never re-enters the gate — no-op, no write.
  if (priorStatus === "deferred_design") {
    return {
      featureId,
      arch_status: "deferred_design",
      arch_attempt: priorAttempt,
      noop: true
    };
  }

  if (typeof opts.actualUsdSpent === "number") {
    // Throws ArchGateBudgetExceededError on exceed — nothing below runs.
    checkArchGateBudget(featureId, opts.actualUsdSpent, config);
  }

  // Normalized BEFORE computeArchGateTransition so an unrecognized verdict
  // throws here first — computeArchGateTransition normalizes the same raw
  // string again internally, which is fine (pure, cheap, and the two calls
  // must always agree since they're fed the same verdictRaw).
  const normalizedVerdict = normalizeVerdict(verdictRaw);
  // Risk flags default to `objections` — on a rejected verdict the
  // objections ARE the reviewer's risk flags (see ApplyArchGateVerdictOpts
  // docstring). Empty-array objections normalize to undefined so an
  // approved verdict with no risk signal doesn't write an empty arch_risk.
  const riskFlags: string[] | string | undefined =
    opts.riskFlags !== undefined
      ? (opts.riskFlags ?? undefined)
      : opts.objections && opts.objections.length > 0
        ? opts.objections
        : undefined;

  const transition = computeArchGateTransition(priorAttempt, verdictRaw);
  const updates: Record<string, unknown> = {
    arch_attempt: transition.attempt,
    arch_status: transition.status,
    // Sole writer of arch_review/arch_risk (DEC-075) — persisted on every
    // verdict call, not only on the terminal approved/deferred_design
    // transitions, so a gate_in_progress round (rejected, attempt < max)
    // also records what the reviewer actually said.
    arch_review: normalizedVerdict,
    ...(riskFlags !== undefined ? { arch_risk: riskFlags } : {})
  };
  let demotedPriority: string | undefined;
  let deferReason: string | undefined;
  if (transition.demote) {
    demotedPriority = demotePriority(resolveFeaturePriority(fm));
    deferReason =
      (opts.objections ?? []).filter((o) => typeof o === "string" && o.trim() !== "").join("; ") ||
      "architect-reviewer objections unresolved after max gate attempts";
    updates.priority = demotedPriority;
    updates.autonomous_safe = false;
    updates.arch_defer_reason = deferReason;
  }

  await updateFeatureFrontmatter(entry.filePath, updates, repoPath, config);

  return {
    featureId,
    arch_status: transition.status,
    arch_attempt: transition.attempt,
    noop: false,
    arch_review: normalizedVerdict,
    ...(riskFlags !== undefined ? { arch_risk: riskFlags } : {}),
    ...(demotedPriority ? { priority: demotedPriority } : {}),
    ...(deferReason ? { arch_defer_reason: deferReason } : {})
  };
}

// ---------------------------------------------------------------------------
// Async orchestrator (Part 2 wiring).
// ---------------------------------------------------------------------------

export interface ArchGatePreflightParams {
  repoPath: string;
  sliceId: string;
  featureId: string | null;
  variant: string | null;
  config: Record<string, any> | null;
}

/**
 * Async orchestrator for Part 2 — resolves FEAT frontmatter +
 * contracts-artifact existence, and returns the preflight instruction block
 * (or null when the gate doesn't apply). Crew presence is no longer checked
 * here (P2 seam-elimination, SLICE-13) — crew is a same-repo subtree now,
 * always available, so the prior soft-skip-when-crew-absent branch no
 * longer has a real trigger.
 */
export async function maybeBuildArchGatePreflight(
  params: ArchGatePreflightParams
): Promise<string | null> {
  const { repoPath, sliceId, featureId, variant, config } = params;
  if (!featureId) return null;

  const entry = await findFeatureById(repoPath, featureId, config);
  if (!entry) return null;
  const fm = entry.frontmatter as Record<string, any>;

  const decision = shouldRunArchGate({
    priority: resolveFeaturePriority(fm),
    variant,
    isFirstSlice: isFirstSliceOfFeature(fm, sliceId),
    contractsExist: await contractsArtifactExists(repoPath, featureId),
    archStatus: fm.arch_status ?? null
  });
  if (!decision) return null;

  return buildArchGatePreflight(featureId, resolveFeatureTitle(entry.body, featureId));
}

/** Best-effort FEAT title from the body's leading `# FEAT-NNN: Title` heading — FEAT frontmatter carries no `title` field of its own. Falls back to the bare id. */
function resolveFeatureTitle(body: string | null | undefined, featureId: string): string {
  const match = /^#\s+(?:FEAT-\d+[a-z]?:\s*)?(.+)$/m.exec(body ?? "");
  const heading = match?.[1]?.trim();
  return heading && heading.length > 0 ? heading : featureId;
}
