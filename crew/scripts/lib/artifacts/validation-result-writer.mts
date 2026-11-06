// Extracted from scripts/crew.mts's "write-validation-result" command body
// (SLICE-12, P2 seam-elimination contract §1/§2 —
// docs/planning/p2-seam-contract.md). Previously the verdict-resolution +
// schema-refusal + write sequence lived inline in crew.mts, reachable only
// via the CLI subprocess (`crew write-validation-result`, exit 2 on
// refusal). Exported here so runner-plugin's phase-gate.mts can call it as a
// direct import instead of shelling out.
//
// UNLIKE SLICE-11's fail-soft extractions (write-run-brief / cost-slice /
// cost-advise / mark-badge), this call is fail-hard by design (contract §2):
// every failure mode below THROWS rather than exiting the process or
// returning an `{ ok: false }` sentinel. crew.mts's CLI handler is
// responsible for catching and mapping to `process.exit(2)` for its own
// CLI-UX contract; this module must never call `process.exit` itself, since
// library callers (phase-gate.mts) need the throw to propagate uncaught so
// the phase-gate run fails loudly instead of silently registering nothing
// (P2 seam-contract.md finding 2 — today's callers don't check
// `crewResult.ok` at all).

import { writeArtifact } from "./write.mjs";
import type { ArtifactRecord } from "./write.mjs";
import { normalizeValidationDecision, ValidationArtifactSchema } from "../artifact-schemas.mjs";

// Every field's union explicitly includes `| undefined` (not just `| null`)
// even though it's already optional — this module is cross-tree-imported
// under two different tsconfigs (crew's own, and root's, both with
// exactOptionalPropertyTypes: true), and callers on both sides build these
// objects with `?? undefined` patterns. Omitting `| undefined` here would
// make those call sites a type error despite the key being optional.
export interface ValidationResultInput {
  title?: string | null | undefined;
  validator?: string | null | undefined;
  owner?: string | null | undefined;
  decision?: string | null | undefined;
  skipReason?: string | null | undefined;
  status?: string | null | undefined;
  findings?: string | null | undefined;
  scaffold?: boolean | undefined;
  environment?: string | null | undefined;
  goal?: string | null | undefined;
  summary?: string | null | undefined;
  evidence?: string | null | undefined;
  files?: string | null | undefined;
  risks?: string | null | undefined;
  next?: string | null | undefined;
  feature?: string | null | undefined;
  phase?: string | number | null | undefined;
  updatePath?: string | null | undefined;
  /** Schema-checked only — never persisted to the artifact. Matches
   * crew.mts's original inline handler, which validated `--slice` and
   * `--validation-evidence` against ValidationArtifactSchema but never
   * passed either through to writeArtifact's fields. Preserved verbatim
   * rather than "fixed" here — out of SLICE-12's fail-hard scope. */
  slice?: string | null | undefined;
  validationEvidence?: string | null | undefined;
}

// Resolve --decision into the canonical validation verdict enum. Throws
// (never process.exit — this module is cross-tree-imported by library code,
// not just the CLI) on an unrecognized value. Legacy values real callers
// already emit (passed, passed_with_notes, failed) normalize rather than
// throw — same acceptance list crew.mts's CLI has always honored.
export function resolveValidationVerdict(
  rawDecision: string | null | undefined
): string | undefined {
  if (!rawDecision) return undefined;
  const normalized = normalizeValidationDecision(rawDecision);
  if (!normalized) {
    throw new Error(
      `write-validation-result refused: unknown decision "${rawDecision}". Valid values: pass, fail, skipped (passed, passed_with_notes, failed accepted as legacy aliases).`
    );
  }
  return normalized.canonical;
}

// FEAT-024: throws (never process.exit — this module is cross-tree-imported
// by library code, same fail-hard contract as the rest of this file) on a
// terminal write-validation-result call with no --decision. Terminal = not
// --scaffold and resolved status is anything other than "in-progress"
// (absent/"completed"/etc all count as terminal) — mirrors crew.mts's
// refuseIfReviewDecisionMissing for write-review-result. --scaffold and
// --status in-progress writes register the artifact path only and never
// carry a verdict, so they must never reach this refusal.
function assertDecisionProvided(
  rawDecision: string | null,
  scaffold: boolean,
  status: string | undefined
): void {
  if (scaffold || status === "in-progress") return;
  if (rawDecision) return;
  throw new Error("write-validation-result refused: --decision is required (pass|fail|skipped).");
}

// Throws (never process.exit) when ValidationArtifactSchema rejects the
// assembled fields — same message text crew.mts's CLI has always produced
// on stderr before exit(2), now surfaced as a thrown Error instead.
export function assertValidationFieldsValid(fields: {
  decision?: string | undefined;
  skip_reason?: string | undefined;
  phase?: string | undefined;
  feature?: string | undefined;
  slice?: string | undefined;
  findings?: string | undefined;
  status?: string | undefined;
  validation_evidence?: string | undefined;
}): void {
  const result = ValidationArtifactSchema.safeParse(fields);
  // `=== true`, not truthy-check: the P2 contract's strictNullChecks finding
  // (p2-seam-contract.md §0) — this file is cross-tree-imported into
  // tsconfig.test.json's relaxed-strictness tsc program, where a plain
  // `if (result.success) return;` fails to narrow the `result.error` access
  // below. Explicit equality narrows correctly under both configs.
  if (result.success === true) return;
  const messages = result.error?.issues.map((i) => i.message).join("; ") ?? "unknown error";
  throw new Error(`write-validation-result refused: schema validation failed: ${messages}`);
}

// `--phase` is only ever sent when non-empty (mirrors the original CLI
// handler's `args.push("--phase", ...)` guard in phase-gate.mts's old
// execFile call). Hoisted out to keep writeValidationResultArtifact's
// cognitive complexity under the repo's 15 cap.
function resolvePhase(rawPhase: string | number | null | undefined): string | undefined {
  return rawPhase !== null && rawPhase !== undefined && String(rawPhase).length > 0
    ? String(rawPhase)
    : undefined;
}

// Fields ValidationArtifactSchema actually checks (frontmatter-level only —
// see artifact-schemas.mts's header comment). Hoisted out for the same
// complexity-cap reason as resolvePhase.
function buildSchemaCheckFields(
  input: ValidationResultInput,
  verdict: string | undefined,
  phase: string | undefined
) {
  return {
    decision: verdict,
    skip_reason: input.skipReason ?? undefined,
    phase,
    feature: input.feature ?? undefined,
    slice: input.slice ?? undefined,
    findings: input.findings ?? undefined,
    status: input.status ?? undefined,
    validation_evidence: input.validationEvidence ?? undefined
  };
}

// ArtifactFields.scaffold is `boolean` (no `| undefined` in its union) —
// exactOptionalPropertyTypes requires omitting the key rather than assigning
// `undefined` explicitly. Hoisted out (rather than an inline conditional
// spread) to keep buildArtifactFields under the complexity cap.
function scaffoldField(
  scaffold: boolean | undefined
): { scaffold: boolean } | Record<string, never> {
  return scaffold !== undefined ? { scaffold } : {};
}

// Assembles writeArtifact's fields object. Hoisted out for the same
// complexity-cap reason as resolvePhase/buildSchemaCheckFields.
function buildArtifactFields(
  input: ValidationResultInput,
  rawDecision: string | null,
  verdict: string | undefined,
  phase: string | undefined
) {
  return {
    title: input.title || "Validation Result",
    validator: input.validator || input.owner || "verifier",
    decision: rawDecision ?? undefined,
    verdict,
    skipReason: input.skipReason ?? undefined,
    status: input.status ?? undefined,
    findings: input.findings ?? null,
    ...scaffoldField(input.scaffold),
    environment: input.environment ?? undefined,
    goal: input.goal ?? undefined,
    summary: input.summary ?? undefined,
    evidence: input.evidence ?? undefined,
    files: input.files ?? undefined,
    risks: input.risks ?? undefined,
    next: input.next ?? undefined,
    feature: input.feature ?? undefined,
    phase,
    updatePath: input.updatePath ?? undefined
  };
}

/**
 * Fail-hard direct-import replacement for `crew write-validation-result`.
 * Resolves the verdict, validates against ValidationArtifactSchema, writes
 * the artifact via writeArtifact, and unwraps its `Result<ArtifactRecord,
 * Error>` — throwing on ANY failure (invalid decision, schema refusal, or
 * the underlying write itself failing). Callers MUST let this throw
 * propagate; catching it here (or in the caller) to keep going would
 * silently reintroduce the fail-soft bug this slice fixes.
 *
 * Note: `if (r.ok === false) throw r.error` — not `if (!r.ok)` — per the P2
 * contract's strictNullChecks narrowing finding (a cross-tree import pulls
 * this file into tsconfig.test.json's relaxed-strictness tsc program, where
 * `!r.ok` fails to narrow the union).
 */
export async function writeValidationResultArtifact(
  repoPath: string,
  input: ValidationResultInput
): Promise<ArtifactRecord> {
  const rawDecision = input.decision ?? null;
  assertDecisionProvided(rawDecision, input.scaffold === true, input.status ?? undefined);
  const verdict = resolveValidationVerdict(rawDecision);
  const phase = resolvePhase(input.phase);

  assertValidationFieldsValid(buildSchemaCheckFields(input, verdict, phase));

  const r = await writeArtifact(
    repoPath,
    "validation-result",
    buildArtifactFields(input, rawDecision, verdict, phase)
  );
  if (r.ok === false) throw r.error;
  return r.value;
}
