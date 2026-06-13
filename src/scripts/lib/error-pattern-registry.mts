// Registry of known error patterns for specialist dispatch failures.
// Provides detection, recovery hints, and JSONL logging for the autonomous loop.
// This module is a library — it does NOT wire into loop.mts or event-notifier.

import fs from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PatternId =
  | "pause-without-artifact"
  | "empty-artifact"
  | "truncated-output"
  | "budget-exceeded";

export type RecoveryAction = "retry-with-inline" | "re-dispatch" | "escalate";

export interface ErrorPattern {
  id: PatternId;
  description: string;
  recovery: RecoveryAction;
}

export interface DispatchCheckResult {
  pattern: ErrorPattern;
  evidence: string;
}

// ---------------------------------------------------------------------------
// Pattern registry (closed-set; new patterns require an explicit entry here)
// ---------------------------------------------------------------------------

const PATTERNS: ErrorPattern[] = [
  {
    id: "budget-exceeded",
    description: "Builder indicated its token or tool budget was exhausted.",
    recovery: "escalate"
  },
  {
    id: "pause-without-artifact",
    description: "Builder paused or is waiting for input but wrote no artifact.",
    recovery: "re-dispatch"
  },
  {
    id: "truncated-output",
    description: "Builder output appears cut off before a natural conclusion.",
    recovery: "retry-with-inline"
  },
  {
    id: "empty-artifact",
    description: "Builder wrote an artifact file, but it is too small to be valid.",
    recovery: "re-dispatch"
  }
];

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/** True when the output looks like a budget-exceeded signal. */
function isBudgetExceeded(output: string): boolean {
  const lower = output.toLowerCase();
  return (
    lower.includes("budget") &&
    (lower.includes("exceeded") || lower.includes("limit") || lower.includes("stopping"))
  );
}

/** True when the output suggests the builder paused waiting for input. */
function isPauseWithoutArtifactOutput(output: string): boolean {
  const lower = output.toLowerCase();
  return lower.includes("pausing") || lower.includes("waiting for") || lower.includes("i'll wait");
}

/** True when the output appears to end abruptly without a natural conclusion. */
function isTruncatedOutput(output: string): boolean {
  const trimmed = output.trimEnd();
  if (trimmed.length === 0) return false;

  const lastChar = trimmed[trimmed.length - 1];
  const naturalEnd = lastChar === "." || lastChar === "}" || lastChar === "\n";

  if (!naturalEnd) return true;

  // Long output with no pass/fail verdict is also treated as truncated.
  if (trimmed.length > 8000) {
    const upper = trimmed.toUpperCase();
    return !upper.includes("PASS") && !upper.includes("FAIL");
  }

  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Match builder output against known output-only patterns.
 * Checks are ordered by specificity: budget-exceeded > pause > truncated.
 * Returns the first matching pattern, or null when output looks clean.
 */
export function matchPatterns(output: string): ErrorPattern | null {
  if (isBudgetExceeded(output)) {
    return PATTERNS.find((p) => p.id === "budget-exceeded") ?? null;
  }
  if (isPauseWithoutArtifactOutput(output)) {
    return PATTERNS.find((p) => p.id === "pause-without-artifact") ?? null;
  }
  if (isTruncatedOutput(output)) {
    return PATTERNS.find((p) => p.id === "truncated-output") ?? null;
  }
  return null;
}

/**
 * Full dispatch-result check: matches output patterns first, then inspects
 * the artifact file on disk.
 *
 * - `pause-without-artifact`: output has pause keywords AND artifact is absent.
 * - `empty-artifact`: artifact exists but is < 50 bytes.
 * - Otherwise delegates to `matchPatterns` for output-only checks.
 *
 * Returns null when output is clean and artifact exists with substantial size.
 */
export async function checkDispatchResult(
  builderOutput: string,
  artifactPath: string,
  repoPath: string
): Promise<DispatchCheckResult | null> {
  const fullArtifactPath = path.isAbsolute(artifactPath)
    ? artifactPath
    : path.join(repoPath, artifactPath);

  // Check artifact existence
  let artifactStat: { size: number } | null = null;
  try {
    artifactStat = await fs.stat(fullArtifactPath);
  } catch {
    artifactStat = null;
  }

  const artifactMissing = artifactStat === null;
  const artifactEmpty = artifactStat !== null && artifactStat.size < 50;

  // pause-without-artifact: output signals a pause AND artifact is absent
  if (isPauseWithoutArtifactOutput(builderOutput) && artifactMissing) {
    const pattern = PATTERNS.find((p) => p.id === "pause-without-artifact")!;
    return {
      pattern,
      evidence: `Output contains pause keywords and artifact was not found at: ${fullArtifactPath}`
    };
  }

  // empty-artifact: artifact exists but undersized
  if (artifactEmpty) {
    const pattern = PATTERNS.find((p) => p.id === "empty-artifact")!;
    return {
      pattern,
      evidence: `Artifact at ${fullArtifactPath} is only ${artifactStat!.size} bytes (< 50 threshold).`
    };
  }

  // Delegate to output-only checks
  const outputPattern = matchPatterns(builderOutput);
  if (outputPattern !== null) {
    return {
      pattern: outputPattern,
      evidence: `Output-pattern match for '${outputPattern.id}'.`
    };
  }

  return null;
}

/**
 * Append one JSON line to `.claude/artifacts/loop/learnings.jsonl`.
 * Creates parent directories on first write.
 */
export async function logPatternMatch(
  result: DispatchCheckResult,
  sliceId: string,
  repoPath: string
): Promise<void> {
  const logPath = path.join(repoPath, ".claude/artifacts/loop/learnings.jsonl");
  await fs.mkdir(path.dirname(logPath), { recursive: true });

  const entry = {
    timestamp: new Date().toISOString(),
    patternId: result.pattern.id,
    sliceId,
    evidence: result.evidence,
    recovery: result.pattern.recovery
  };

  await fs.appendFile(logPath, JSON.stringify(entry) + "\n", "utf8");
}
