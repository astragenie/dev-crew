export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchemaError";
  }
}

export type ProjectType = "claude-plugin" | "library" | "service" | "saas";

export type RoleName = "pm" | "researcher" | "architect" | "document-writer";

export const VALID_ROLES: ReadonlyArray<RoleName> = [
  "pm",
  "researcher",
  "architect",
  "document-writer"
];

export interface StackStage {
  cmd: string;
  args?: string[];
  cwd?: string;
}

export interface PresetV1 {
  schemaVersion: 1;
  presetName: string;
  description?: string;
  projectType: ProjectType;
  split: boolean;
  frontend?: { framework: string; language: string };
  backend?: { framework: string; language: string; storage: string };
  contract?: string;
  deployment?: string;
  skills?: string[];
  fe?: { skills: string[] };
  be?: { skills: string[] };
  roles?: Partial<Record<RoleName, { skills: string[] }>>;
  loop?: Record<string, unknown>;
  stack?: {
    build?: StackStage[] | null;
    test?: StackStage[] | null;
    frontendBuild?: StackStage | null;
    infraPlan?: StackStage | null;
    aspireBoot?: StackStage | null;
    healthchecks?: Array<{ url: string }>;
  };
  reviewers?: {
    ladder: Array<"A" | "B">;
    strictParallel?: boolean;
    serialTimingThresholdMs?: number;
  };
  mandatoryDocs?: string[];
  productName?: string;
  productDescription?: string;
  stackDescription?: string;
}

const VALID_PROJECT_TYPES: ReadonlyArray<ProjectType> = [
  "claude-plugin",
  "library",
  "service",
  "saas"
];

export function validatePreset(input: unknown): PresetV1 {
  if (typeof input !== "object" || input === null) {
    throw new SchemaError("preset must be an object");
  }
  const obj = input as Record<string, unknown>;

  validateCommonHeader(obj);

  if (obj.split === true) {
    validateSplitTrue(obj);
  } else {
    validateSplitFalse(obj);
  }

  if (obj.roles !== undefined) {
    validateRoles(obj.roles);
  }

  // FEAT-218 Phase 1 found these fields are read at runtime by
  // config-resolver/loop-installer/phase-gate but were never actually
  // schema-checked. Validate their shape when present (all optional —
  // .claude/loop.json overrides may only set a subset).
  validateStackDrivenFields(obj);

  return obj as unknown as PresetV1;
}

function validateStackDrivenFields(obj: Record<string, unknown>): void {
  if (obj.loop !== undefined && !isPlainRecord(obj.loop)) {
    throw new SchemaError("preset.loop must be an object");
  }
  if (obj.stack !== undefined) {
    validateStack(obj.stack);
  }
  if (obj.reviewers !== undefined) {
    validateReviewers(obj.reviewers);
  }
  if (obj.mandatoryDocs !== undefined && !isStringArray(obj.mandatoryDocs)) {
    throw new SchemaError("preset.mandatoryDocs must be a string array");
  }
  for (const field of ["productName", "productDescription", "stackDescription"] as const) {
    if (obj[field] !== undefined && typeof obj[field] !== "string") {
      throw new SchemaError(`preset.${field} must be a string`);
    }
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isStackStage(value: unknown): boolean {
  if (!isPlainRecord(value)) return false;
  if (typeof value.cmd !== "string") return false;
  if (value.args !== undefined && !isStringArray(value.args)) return false;
  if (value.cwd !== undefined && typeof value.cwd !== "string") return false;
  return true;
}

function validateStack(stack: unknown): void {
  if (!isPlainRecord(stack)) {
    throw new SchemaError("preset.stack must be an object");
  }
  for (const key of ["build", "test"] as const) {
    const value = stack[key];
    if (
      value !== undefined &&
      value !== null &&
      (!Array.isArray(value) || !value.every(isStackStage))
    ) {
      throw new SchemaError(`preset.stack.${key} must be an array of stage objects or null`);
    }
  }
  for (const key of ["frontendBuild", "infraPlan", "aspireBoot"] as const) {
    const value = stack[key];
    if (value !== undefined && value !== null && !isStackStage(value)) {
      throw new SchemaError(`preset.stack.${key} must be a stage object or null`);
    }
  }
  const healthchecks = stack.healthchecks;
  if (healthchecks !== undefined && !Array.isArray(healthchecks)) {
    throw new SchemaError("preset.stack.healthchecks must be an array");
  }
}

function validateReviewers(reviewers: unknown): void {
  if (!isPlainRecord(reviewers) || !Array.isArray(reviewers.ladder)) {
    throw new SchemaError("preset.reviewers.ladder must be an array");
  }
  if (!reviewers.ladder.every((r: unknown) => r === "A" || r === "B")) {
    throw new SchemaError('preset.reviewers.ladder entries must be "A" or "B"');
  }
}

function validateRoles(roles: unknown): void {
  if (typeof roles !== "object" || roles === null || Array.isArray(roles)) {
    throw new SchemaError("preset.roles must be an object");
  }
  for (const [key, block] of Object.entries(roles)) {
    if (!VALID_ROLES.includes(key as RoleName)) {
      throw new SchemaError(
        `preset.roles.${key} is not a known role; valid roles: ${VALID_ROLES.join(", ")}`
      );
    }
    if (!isSkillBlock(block)) {
      throw new SchemaError(`preset.roles.${key}.skills must be a string array`);
    }
  }
}

function validateCommonHeader(obj: Record<string, unknown>): void {
  if (obj.schemaVersion !== 1) {
    throw new SchemaError(
      `unsupported preset schemaVersion ${String(obj.schemaVersion)}; loop plugin may be too old`
    );
  }
  if (typeof obj.presetName !== "string" || obj.presetName.length === 0) {
    throw new SchemaError("preset.presetName must be a non-empty string");
  }
  if (
    typeof obj.projectType !== "string" ||
    !VALID_PROJECT_TYPES.includes(obj.projectType as ProjectType)
  ) {
    throw new SchemaError(`preset.projectType must be one of ${VALID_PROJECT_TYPES.join(", ")}`);
  }
  if (typeof obj.split !== "boolean") {
    throw new SchemaError("preset.split must be a boolean");
  }
}

function validateSplitTrue(obj: Record<string, unknown>): void {
  if (obj.skills !== undefined) {
    throw new SchemaError("split=true preset must not declare top-level skills");
  }
  if (!isSkillBlock(obj.fe) || !isSkillBlock(obj.be)) {
    throw new SchemaError("split=true preset requires both fe.skills and be.skills");
  }
}

function validateSplitFalse(obj: Record<string, unknown>): void {
  if (obj.fe !== undefined || obj.be !== undefined) {
    throw new SchemaError("split=false preset must not declare fe or be blocks");
  }
  if (!Array.isArray(obj.skills)) {
    throw new SchemaError("split=false preset requires top-level skills array");
  }
}

function isSkillBlock(value: unknown): value is { skills: string[] } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const skills = (value as { skills?: unknown }).skills;
  return Array.isArray(skills) && skills.every((s) => typeof s === "string");
}
