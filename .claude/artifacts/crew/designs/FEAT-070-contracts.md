## TypeScript Interfaces

```typescript
// ── Result<T, E> ─────────────────────────────────────────────────────────────
// Canonical two-variant discriminated union for parser + gate return values.
// Entry points (loop.mts callers) retain throw/catch at the boundary and are
// never exposed to this type directly.

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = string> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

// ── Branded IDs ───────────────────────────────────────────────────────────────
// Nominal-type wrappers preventing accidental cross-entity ID substitution.
// All five brands are string at runtime; the brand tag is erased by tsc.

declare const __FeatIdBrand: unique symbol;
export type FeatId = string & { readonly [__FeatIdBrand]: "FeatId" };

declare const __SliceIdBrand: unique symbol;
export type SliceId = string & { readonly [__SliceIdBrand]: "SliceId" };

declare const __SpecIdBrand: unique symbol;
export type SpecId = string & { readonly [__SpecIdBrand]: "SpecId" };

declare const __DecIdBrand: unique symbol;
export type DecId = string & { readonly [__DecIdBrand]: "DecId" };

declare const __GradeIdBrand: unique symbol;
export type GradeId = string & { readonly [__GradeIdBrand]: "GradeId" };

// Convenience constructors — validate format and cast.
export function toFeatId(raw: string): FeatId {
  if (!/^FEAT-\d{3,}$/.test(raw)) throw new TypeError(`Invalid FeatId: ${raw}`);
  return raw as FeatId;
}
export function toSliceId(raw: string): SliceId {
  if (!/^SLICE-\d+$/.test(raw)) throw new TypeError(`Invalid SliceId: ${raw}`);
  return raw as SliceId;
}
export function toSpecId(raw: string): SpecId {
  if (!/^SPEC-\d{3,}$/.test(raw)) throw new TypeError(`Invalid SpecId: ${raw}`);
  return raw as SpecId;
}
export function toDecId(raw: string): DecId {
  if (!/^DEC-\d{3,}$/.test(raw)) throw new TypeError(`Invalid DecId: ${raw}`);
  return raw as DecId;
}
export function toGradeId(raw: string): GradeId {
  if (!/^GRADE-\d{3,}$/.test(raw)) throw new TypeError(`Invalid GradeId: ${raw}`);
  return raw as GradeId;
}

// ── Discriminated union state shapes (B8) ─────────────────────────────────────
// Replace boolean-flag variants in stop-conditions, walker-gates, halt-badges.

// stop-conditions: StopVerdictKind
export type StopVerdictKind =
  | { kind: "backlog-exhausted" }
  | { kind: "warn-alert"; category: string; message: string }
  | { kind: "cost-alert-high"; count: number }
  | { kind: "iteration-cap"; count: number; cap: number }
  | { kind: "crew-escalated"; note: string }
  | { kind: "crew-blocked"; note: string; blockedBy?: string }
  | { kind: "slice-cost-ceiling"; actualUsd: number; ceilingUsd: number }
  | { kind: "cost-regression"; currentUsd: number; medianUsd: number; thresholdUsd: number; multiplier: number }
  | { kind: "session-drift"; sessionIdAtStart: string; sessionIdNow: string }
  | { kind: "redundant-read-stop"; path: string; maxReadCount: number; threshold: number; offendingPathCount: number }
  | { kind: "grade-trend"; consecutiveBelow: number; threshold: number };

// walker-gates: EvaluateCandidateResult
export type EvaluateCandidateResult =
  | { outcome: "skip"; reason: string }
  | { outcome: "plan"; plan: DispatchPlan };

// halt-badges: HaltBadgeEntry — each badge field is a specific typed shape
// rather than `any`. Used in the stop-conditions snapshot and brief output.
export type CostRegressionBadge = {
  triggered: true;
  currentUsd: number;
  medianUsd: number;
  thresholdUsd: number;
  multiplier: number;
  window: number;
  sampleCount: number;
};

export type SessionDriftBadge = {
  triggered: true;
  sessionIdAtStart: string;
  sessionIdNow: string;
};

export type SliceCostCeilingBadge = {
  exceeded: true;
  actualUsd: number;
  ceilingUsd: number;
};

export type GradeTrendBadge = {
  consecutiveBelow: number;
  threshold: number;
};

export type MergeFailedBadge = {
  status: "failed";
  slice: SliceId;
  feature?: FeatId;
  failedStep: string;
  code: string;
  attemptedBranch: string;
  attemptedWorktree: string;
};

export type RedundantReadStopBadge = {
  triggered: true;
  maxReadCount: number;
  path: string;
  sessionId: string;
  threshold: number;
  offendingPathCount: number;
};

export interface StopConditionsSnapshot {
  pendingOrTriaged: number;
  inProgress: number;
  approvedUndecomposed: number;
  totalAlerts: number;
  warnAlerts: number;
  warnAlertsDemoted: number;
  iterationCount: number;
  iterationCap: number;
  costAlerts: number;
  crewBlocked: boolean;
  crewEscalated: boolean;
  autoMode: boolean;
  /** @deprecated alias for autoMode (back-compat) */
  marathonMode: boolean;
  gradeTrend: GradeTrendBadge | null;
  sliceCostCeiling: SliceCostCeilingBadge | null;
  costRegression: CostRegressionBadge | null;
  sessionDrift: SessionDriftBadge | null;
  mergeFailed: MergeFailedBadge | null;
  redundantReadStop: RedundantReadStopBadge | null;
}

export interface StopConditionsResult {
  shouldStop: boolean;
  reasons: string[];
  blockers: Array<{ category: string; message: string; suggestion: string }>;
  suggestions: string[];
  iterationCapReached: boolean;
  snapshot: StopConditionsSnapshot;
}

// ── Frontmatter (tightened from Record<string,any>) ───────────────────────────
// Replaces the current `type Frontmatter = Record<string, any>` with a partial
// typed record; index signature retained for unknown extension keys.
export interface Frontmatter {
  id?: FeatId | SliceId | SpecId | DecId | GradeId | string;
  status?: string;
  priority?: "P0" | "P1" | "P2" | "P3";
  autonomous_safe?: boolean;
  composite_score?: number;
  pm_strategic_fit?: number;
  pm_risk_level?: number;
  depends_on?: string[];
  deferred?: boolean;
  [key: string]: unknown;
}

// ── DispatchPlan (typed, replacing any-typed inline construction) ──────────────
// Already partially typed in walker-gates.mts; re-exported here as the
// canonical shape post-B8. featureId becomes FeatId brand.
export interface DispatchPlan {
  featureId: FeatId;
  suggestedSliceTitle: string;
  fromFeatureCmd: string;
  startCmd: string;
  builderPrompt: string;
  requiresPlanPreflight?: boolean;
  riskGate?: { level: number; warn: string };
  autoMode?: boolean;
}

// ── applyWarnAlertSignals options (tightened) ─────────────────────────────────
export interface WarnAlertSignalsOptions {
  autoMode?: boolean;
  ignoredCategories?: string[];
  suggestions?: string[];
  demotedCount?: { value: number };
}

// ── WarnAlert (replaces any[] in stop-conditions) ─────────────────────────────
export interface WarnAlert {
  severity: "warn" | "info";
  category: string;
  message: string;
  suggested_action?: string;
}
```

## API Contracts

None.

## Event Schemas

None.

## Data Contracts

**tsconfig.json** — compiler flag additions per slice. The file format is unchanged (standard `tsconfig.json` JSON). The table below documents the target state after all B-slices land.

| Field | Before (current) | After FEAT-070 |
|---|---|---|
| `noImplicitAny` | `false` | `true` |
| `useUnknownInCatchVariables` | `false` | `true` |
| `noUnusedLocals` | absent | `true` |
| `noUnusedParameters` | absent | `true` |
| `noImplicitOverride` | absent | `true` |
| `noFallthroughCasesInSwitch` | absent | `true` |
| `exactOptionalPropertyTypes` | absent | `true` |
| `noUncheckedIndexedAccess` | absent | `true` |

All other existing `compilerOptions` keys (`target`, `module`, `moduleResolution`, `rootDir`, `outDir`, `strict`, `noEmit`, `declaration`, `skipLibCheck`, `resolveJsonModule`, `verbatimModuleSyntax`, `types`) are unchanged.

**Branded ID string formats** — values persisted in YAML frontmatter and artifact JSON files. No format change from current; brands are compile-time only.

| Brand | Runtime regex | Example |
|---|---|---|
| `FeatId` | `/^FEAT-\d{3,}$/` | `FEAT-070` |
| `SliceId` | `/^SLICE-\d+$/` | `SLICE-71` |
| `SpecId` | `/^SPEC-\d{3,}$/` | `SPEC-004` |
| `DecId` | `/^DEC-\d{3,}$/` | `DEC-011` |
| `GradeId` | `/^GRADE-\d{3,}$/` | `GRADE-042` |

**Result<T,E> seam boundary** — parsers and gate functions in `src/scripts/lib/` that previously threw or returned `any` will return `Result<T, E>` internally. The seam is at the parser/gate layer; callers in `scripts/loop.mjs` (entry points) retain `try/catch` at the boundary. No on-disk artifact format changes.
