// FEAT-220: schema validator for the persisted learnings.jsonl write-shape
// (learnings.mts::logLearning). Rejects malformed enum values on the 3
// FEAT-220 enum fields (failure_class, status, scope); tolerates absent
// optionals (AC-5) — the 5 legacy rows (no FEAT-220 fields at all) must
// pass unchanged.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FAILURE_CLASSES,
  LEARNING_SCOPES,
  LEARNING_STATUSES,
  learningsPath
} from "./lib/learnings.mjs";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

// Checks one FEAT-220 enum field, returning an error string (or null when
// the field is absent or valid). Absent optionals are always tolerated —
// only a present-but-unrecognized value is rejected (AC-5).
function checkEnumField(
  e: Record<string, unknown>,
  field: string,
  allowed: readonly string[],
  label: string
): string | null {
  const value = e[field];
  if (value === undefined || allowed.includes(value as never)) return null;
  return `${label}: invalid ${field} "${String(value)}" (expected one of ${allowed.join(", ")})`;
}

function checkEvidenceField(e: Record<string, unknown>, label: string): string | null {
  if (e.evidence === undefined) return null;
  const isStringArray = Array.isArray(e.evidence) && e.evidence.every((v) => typeof v === "string");
  return isStringArray ? null : `${label}: "evidence" must be a string[] when present`;
}

function checkExpiresAtField(e: Record<string, unknown>, label: string): string | null {
  if (e.expires_at === undefined) return null;
  const valid = typeof e.expires_at === "string" && !Number.isNaN(Date.parse(e.expires_at));
  return valid ? null : `${label}: "expires_at" must be a parseable ISO timestamp when present`;
}

/**
 * Validate a single parsed learnings.jsonl entry. Only the 3 FEAT-220 enum
 * fields (failure_class, status, scope) are enum-checked; every other field
 * (including the 7 new optional fields as a whole) is tolerated absent.
 */
export function validateLearningEntry(entry: unknown, label: string): string[] {
  if (!entry || typeof entry !== "object") {
    return [`${label}: entry is not an object`];
  }
  const e = entry as Record<string, unknown>;

  const errors: string[] = [];
  if (!e.key || typeof e.key !== "string") errors.push(`${label}: missing/invalid "key"`);
  if (!e.insight || typeof e.insight !== "string")
    errors.push(`${label}: missing/invalid "insight"`);

  const checks = [
    checkEnumField(e, "failure_class", FAILURE_CLASSES, label),
    checkEnumField(e, "status", LEARNING_STATUSES, label),
    checkEnumField(e, "scope", LEARNING_SCOPES, label),
    checkEvidenceField(e, label),
    checkExpiresAtField(e, label)
  ];
  for (const check of checks) {
    if (check) errors.push(check);
  }

  return errors;
}

/**
 * Validate every line of <repoRoot>/.claude/artifacts/loop/learnings.jsonl.
 * Absent file or empty file is not an error (nothing to validate yet).
 */
export function validateLearningsSchema(repoRoot: string): ValidationResult {
  const filePath = learningsPath(repoRoot);
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return { ok: true, errors: [] };
  }

  const errors: string[] = [];
  const lines = raw.split("\n");
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      errors.push(`line ${idx + 1}: malformed JSON`);
      return;
    }
    errors.push(...validateLearningEntry(parsed, `line ${idx + 1}`));
  });

  return { ok: errors.length === 0, errors };
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  const entryPath = resolve(process.argv[1]);
  const thisPath = fileURLToPath(import.meta.url);
  return entryPath === thisPath;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const repoIdx = args.indexOf("--repo");
  const repoRoot = repoIdx >= 0 && args[repoIdx + 1] ? args[repoIdx + 1]! : process.cwd();

  const result = validateLearningsSchema(repoRoot);
  if (!result.ok) {
    console.error("learnings.jsonl schema validation failed:");
    for (const e of result.errors) console.error(`  - ${e}`);
    process.exitCode = 1;
  } else {
    console.log("learnings.jsonl schema OK");
  }
}

if (isMainEntry()) {
  void main();
}
