// Versioned validators for loop-owned state files. Schema v1.
// Plain JS checks, no deps. Every validator returns { ok, issues }.

export interface ValidationResult {
  ok: boolean;
  issues: string[];
}

const FEAT_ID = /^FEAT-\d{3,}[a-z]?$/;
const SLICE_ID = /^SLICE-\d+$/;
const DEC_ID = /^DEC-\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// wont_fix: terminal state for declined features (filed under done/).
const FEAT_STATUSES = new Set(["pending", "triaged", "in-progress", "done", "wont_fix"]);
const PRIORITIES = new Set(["P0", "P1", "P2", "P3"]);

type Fm = Record<string, unknown>;

function result(issues: string[]): ValidationResult {
  return { ok: issues.length === 0, issues };
}

function checkVersion(fm: Fm, issues: string[]): void {
  // Absent => v1 (pre-contract files). Only v1 is known.
  if (fm.schemaVersion !== undefined && fm.schemaVersion !== 1) {
    issues.push(`schemaVersion: unknown version ${String(fm.schemaVersion)}`);
  }
}

function checkIsoDate(fm: Fm, key: string, issues: string[]): void {
  if (typeof fm[key] !== "string" || !ISO_DATE.test(fm[key] as string)) {
    issues.push(`${key}: expected YYYY-MM-DD, got ${JSON.stringify(fm[key])}`);
  }
}

function checkStringArray(fm: Fm, key: string, issues: string[]): void {
  const v = fm[key];
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) {
    issues.push(`${key}: expected string array, got ${JSON.stringify(v)}`);
  }
}

export function validateFeat(fm: Fm): ValidationResult {
  const issues: string[] = [];
  if (typeof fm.id !== "string" || !FEAT_ID.test(fm.id)) {
    issues.push(`id: expected FEAT-NNN, got ${JSON.stringify(fm.id)}`);
  }
  if (typeof fm.status !== "string" || !FEAT_STATUSES.has(fm.status)) {
    issues.push(
      `status: expected one of ${[...FEAT_STATUSES].join("|")}, got ${JSON.stringify(fm.status)}`
    );
  }
  if (fm.priority !== null && fm.priority !== undefined && !PRIORITIES.has(fm.priority as string)) {
    issues.push(`priority: expected null or P0..P3, got ${JSON.stringify(fm.priority)}`);
  }
  checkIsoDate(fm, "created", issues);
  if (fm.updated !== undefined) checkIsoDate(fm, "updated", issues);
  checkStringArray(fm, "depends_on", issues);
  checkStringArray(fm, "slices", issues);
  checkVersion(fm, issues);
  return result(issues);
}

export function validateSlice(fm: Fm): ValidationResult {
  const issues: string[] = [];
  if (typeof fm.id !== "string" || !SLICE_ID.test(fm.id)) {
    issues.push(`id: expected SLICE-NN, got ${JSON.stringify(fm.id)}`);
  }
  if (typeof fm.status !== "string" || fm.status.length === 0) {
    issues.push(`status: expected non-empty string`);
  }
  if (fm.feature !== null && fm.feature !== undefined) {
    if (typeof fm.feature !== "string" || !FEAT_ID.test(fm.feature)) {
      issues.push(`feature: expected null or FEAT-NNN, got ${JSON.stringify(fm.feature)}`);
    }
  }
  if (fm.requires_validation !== undefined && typeof fm.requires_validation !== "boolean") {
    issues.push(`requires_validation: expected boolean`);
  }
  if (fm.created !== undefined) checkIsoDate(fm, "created", issues);
  checkVersion(fm, issues);
  return result(issues);
}

export function validateGrade(fm: Fm): ValidationResult {
  const issues: string[] = [];
  if (typeof fm.slice !== "string" || !SLICE_ID.test(fm.slice)) {
    issues.push(`slice: expected SLICE-NN, got ${JSON.stringify(fm.slice)}`);
  }
  checkVersion(fm, issues);
  return result(issues);
}

export function validateDecision(fm: Fm): ValidationResult {
  const issues: string[] = [];
  if (typeof fm.id !== "string" || !DEC_ID.test(fm.id)) {
    issues.push(`id: expected DEC-NNN, got ${JSON.stringify(fm.id)}`);
  }
  if (typeof fm.title !== "string" || fm.title.length === 0) {
    issues.push(`title: expected non-empty string`);
  }
  if (typeof fm.status !== "string" || fm.status.length === 0) {
    issues.push(`status: expected non-empty string`);
  }
  checkVersion(fm, issues);
  return result(issues);
}

export function validateLoopJson(cfg: Fm): ValidationResult {
  const issues: string[] = [];
  if (cfg.schemaVersion !== 1) {
    issues.push(`schemaVersion: expected 1, got ${JSON.stringify(cfg.schemaVersion)}`);
  }
  const loop = cfg.loop as Fm | undefined;
  if (loop !== undefined) {
    for (const [k, v] of Object.entries(loop)) {
      if (/Root$|Path$|Dir$/.test(k) && typeof v !== "string") {
        issues.push(`loop.${k}: path override must be a string, got ${JSON.stringify(v)}`);
      }
    }
  }
  return result(issues);
}
