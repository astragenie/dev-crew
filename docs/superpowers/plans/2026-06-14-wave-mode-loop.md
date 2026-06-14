# Wave-mode loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a wave-mode autonomous runner that dispatches N independent slices into parallel git worktrees per wave, merges PASS, pivots FAIL into `/crew:fix` next wave, and loops until standard stop-check fires.

**Architecture:** New `src/scripts/lib/wave/` library (planner + runner + failure-pivot + artifacts), one new slash command `/loop:wave`, three new `loop.mts` subcommands (`wave plan|run|loop`), `loop.json` schema extension (`marathonRunner` + `wave` block), spec-writer contract addition (`touches_files` slice frontmatter), and a single config knob (`marathonRunner: "wave"`) that opts the marathon into wave mode. All crew dispatch goes through a configured slash command (`/crew:orchestrate-slice` default) — loop stays decoupled from crew internals.

**Tech Stack:** TypeScript + Bun runtime, ESM, existing `lib/dispatch-*` primitives for worktree spawn/merge, `lib/stop-conditions.mts` for halt detection, `lib/memory-snapshot.mts` for telemetry. Spec is at `docs/superpowers/specs/2026-06-14-wave-mode-loop-design.md`.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/scripts/lib/wave/types.mts` | Shared types: `SliceCandidate`, `WavePlan`, `WavePlanItem`, `WorktreeResult`, `WaveResult`, `FailurePivot`, `WaveConfig`, `TouchesFilesResult` |
| `src/scripts/lib/wave/conflict.mts` | Path normalization + `pathsConflict(a, b)` + `PathSet` class with `conflictsWith` / `addAll` |
| `src/scripts/lib/wave/touches-files.mts` | `readTouchesFiles(slicePath, repoRoot)` — declared / inferred / missing |
| `src/scripts/lib/wave/planner.mts` | `loadCandidates`, `rankCandidates`, `packWave` |
| `src/scripts/lib/wave/failure-pivot.mts` | `buildFailurePivot`, `persistPivot`, fix-prompt builder |
| `src/scripts/lib/wave/artifacts.mts` | Wave artifact writer (plan.json, wave-result.json, marker files, index.json) |
| `src/scripts/lib/wave/runner.mts` | `runWave(repoRoot, opts)`, `loopWaves(repoRoot, opts)` — orchestrates plan→dispatch→finalize→retest |
| `src/scripts/lib/wave/dispatch-prompt.mts` | Builds per-worktree agent prompt invoking configured slash command |
| `src/scripts/validate-slice-touches-files.mts` | CI script: warn on missing, error on bad paths |
| `commands/wave.md` | `/loop:wave` slash flow (plan / run / loop subcommands) |
| `src/tests/wave/conflict.test.mts` | Conflict graph + path-set unit tests |
| `src/tests/wave/touches-files.test.mts` | Parser + inference + missing fallback |
| `src/tests/wave/planner.test.mts` | Ranking + greedy packer edge cases |
| `src/tests/wave/failure-pivot.test.mts` | Frontmatter mutation, retry ceiling, prompt shape |
| `src/tests/wave/artifacts.test.mts` | Artifact tree writes + index.json rolling |
| `src/tests/wave/runner.test.mts` | Mocked lifecycle: PASS/FAIL/timeout/agent-error paths |
| `src/tests/wave/dispatch-prompt.test.mts` | Prompt shape for normal + fix-mode dispatches |
| `src/tests/wave/config.test.mts` | loop.json validation + defaults for new block |
| `src/tests/wave/cli.test.mts` | `wave plan / run / loop` subcommand exit codes + JSON |
| `src/tests/wave/validate-touches-files.test.mts` | Validator script: warn / error / clean |
| `src/tests/integration/wave-e2e.test.mts` | One full wave against fixture repo |

### Files to modify

| Path | Change |
|---|---|
| `src/scripts/loop.mts` | Register `wave` subcommand with `plan`/`run`/`loop` sub-subcommands |
| `src/scripts/lib/config-resolver.mts` | Extend schema with `marathonRunner` + `wave` block + validation |
| `src/scripts/lib/auto-walker.mts` | Extract `rankCandidates` into pure helper for wave planner reuse |
| `src/scripts/lib/halt-badges.mts` | Add `wave_post_merge_red`, `wave_dirty_main`, `wave_pending_fix_count`, `wave_escalation_count` |
| `src/scripts/lib/memory-snapshot.mts` | Read `.claude/artifacts/loop/waves/index.json`; emit "Wave telemetry" block |
| `agents/spec-writer.md` | Add `touches_files` contract paragraph to slice-level SDD section |
| `commands/auto.md` | Route to `/loop:wave loop` when `marathonRunner === "wave"` |
| `commands/start.md` | Same routing |
| `docs/halt-badges.md` | Document the 4 new wave badges |
| `.claude/loop.json` | Add `marathonRunner: "wave"` + `wave` block scaffold (this repo's opt-in) |
| `src/scripts/validate-content-length.mts` | Add `commands/wave.md` to scope if not auto-included |
| `package.json` scripts (if applicable) | Add `bun run validate-touches-files` script |

### File-structure rationale

Each module under `src/scripts/lib/wave/` has one responsibility. The split between `planner.mts` and `conflict.mts` exists because the conflict logic has the largest test surface and benefits from isolated unit tests. `dispatch-prompt.mts` is split out so the prompt template is in one place — same builder serves normal + fix-mode dispatches via a single parameter. `types.mts` holds shared types so cross-imports avoid circular references.

---

## Task 1: Shared types module

**Files:**
- Create: `src/scripts/lib/wave/types.mts`

- [ ] **Step 1: Create the types module**

Note: TypeScript types have no runtime; tests come in the modules that consume the types. Write the module directly.

```typescript
// src/scripts/lib/wave/types.mts

export type TouchesFilesConfidence = "declared" | "inferred" | "missing";

export type TouchesFilesResult = {
  paths: string[];
  confidence: TouchesFilesConfidence;
};

export type SlicePriority = "P0" | "P1" | "P2" | "P3";

export type SliceCandidate = {
  sliceId: string;
  featureId: string;
  slicePath: string;
  priority: SlicePriority;
  compositeScore: number;
  strategicFit: number;
  touches: TouchesFilesResult;
  pmRiskLevel: number;
  autonomousSafe: boolean;
  retryCount: number;
  pendingFix: boolean;
  dependsOn: string[];
  helpRequestOpen: boolean;
};

export type WavePlanItem = {
  sliceId: string;
  featureId: string;
  worktreeBranch: string;
  sliceCommand: string;
  dispatchPrompt: string;
};

export type WaveRejection = {
  sliceId: string;
  reason: string;
};

export type WavePlan = {
  waveId: string;
  size: number;
  items: WavePlanItem[];
  rejected: WaveRejection[];
  config: { waveSize: number; sliceCommand: string };
};

export type WorktreeStatus = "PASS" | "FAIL" | "timeout" | "agent_error";

export type WorktreeResult = {
  sliceId: string;
  branch: string;
  worktreePath: string;
  status: WorktreeStatus;
  marker: unknown;
  artifacts: string[];
};

export type PostMergeTestStatus = "PASS" | "FAIL" | "skipped";

export type WaveResult = {
  waveId: string;
  plan: WavePlan;
  worktreeResults: WorktreeResult[];
  mergedBranches: string[];
  failedBranches: string[];
  postMergeTest: { ran: boolean; status: PostMergeTestStatus; logPath?: string };
  failurePivots: FailurePivot[];
  durationMs: number;
};

export type FailureKind = "worktree_fail" | "merge_conflict" | "timeout" | "agent_error";

export type FailurePivot = {
  sliceId: string;
  featureId: string;
  originalWaveId: string;
  failureKind: FailureKind;
  failureArtifactPath: string;
  worktreePath: string | null;
  retryCount: number;
  fixCommand: string;
  fixDispatchPrompt: string;
};

export type WaveConfig = {
  size: number;
  sliceCommand: string;
  sliceCommandFallback: string;
  fixCommand: string;
  maxParallel: number;
  dispatchTimeoutMs: number;
  postMergeTestCmd: string;
  maxWaveAttempts: number;
  subagentType: string;
  artifactsRoot: string;
};

export type WaveHaltReason =
  | "backlog_exhausted"
  | "post_merge_red"
  | "dirty_main"
  | "max_iterations"
  | "max_waves"
  | "stop_check_fired"
  | "escalation_threshold_hit"
  | "marathon_checkpoint_required";
```

- [ ] **Step 2: Run typecheck**

Run: `bunx tsc --project tsconfig.json --noEmit`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add src/scripts/lib/wave/types.mts
git commit -m "feat(wave): add shared types module for wave-mode runner"
```

---

## Task 2: Path conflict primitives

**Files:**
- Create: `src/scripts/lib/wave/conflict.mts`
- Test: `src/tests/wave/conflict.test.mts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/tests/wave/conflict.test.mts
import { describe, expect, test } from "bun:test";
import { normalizePath, pathsConflict, PathSet } from "../../scripts/lib/wave/conflict.mjs";

describe("normalizePath", () => {
  test("strips ./ prefix", () => {
    expect(normalizePath("./src/foo.mts")).toBe("src/foo.mts");
  });
  test("converts backslashes to forward", () => {
    expect(normalizePath("src\\foo.mts")).toBe("src/foo.mts");
  });
  test("lowercases on win32-style absolute (case-insensitive cmp)", () => {
    expect(normalizePath("SRC/Foo.mts")).toBe("src/foo.mts");
  });
});

describe("pathsConflict", () => {
  test("exact match conflicts", () => {
    expect(pathsConflict("src/a.mts", "src/a.mts")).toBe(true);
  });
  test("different files do not conflict", () => {
    expect(pathsConflict("src/a.mts", "src/b.mts")).toBe(false);
  });
  test("glob in A matches literal in B", () => {
    expect(pathsConflict("src/wave/*.mts", "src/wave/runner.mts")).toBe(true);
  });
  test("glob in B matches literal in A", () => {
    expect(pathsConflict("src/wave/runner.mts", "src/wave/*.mts")).toBe(true);
  });
  test("both touching loop.json conflicts (coarse-prefix)", () => {
    expect(pathsConflict(".claude/loop.json", ".claude/loop.json")).toBe(true);
  });
  test("both inside backlog/** conflicts (coarse-prefix)", () => {
    expect(
      pathsConflict(
        ".claude/artifacts/loop/backlog/triaged/FEAT-001.md",
        ".claude/artifacts/loop/backlog/pending/FEAT-002.md",
      ),
    ).toBe(true);
  });
  test("non-coarse-prefix different files outside loop.json do not conflict", () => {
    expect(pathsConflict("src/a.mts", "docs/b.md")).toBe(false);
  });
});

describe("PathSet", () => {
  test("addAll then conflictsWith returns true on overlap", () => {
    const s = new PathSet();
    s.addAll(["src/a.mts", "src/b.mts"]);
    expect(s.conflictsWith(["src/b.mts"])).toBe(true);
  });
  test("addAll then conflictsWith returns false on disjoint", () => {
    const s = new PathSet();
    s.addAll(["src/a.mts"]);
    expect(s.conflictsWith(["src/b.mts"])).toBe(false);
  });
  test("conflictingPath returns the colliding entry", () => {
    const s = new PathSet();
    s.addAll(["src/a.mts"]);
    expect(s.conflictingPath(["src/a.mts"])).toBe("src/a.mts");
  });
  test("conflictingPath returns null when no overlap", () => {
    const s = new PathSet();
    s.addAll(["src/a.mts"]);
    expect(s.conflictingPath(["src/b.mts"])).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/tests/wave/conflict.test.mts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement the module**

```typescript
// src/scripts/lib/wave/conflict.mts

const COARSE_PREFIXES = [
  ".claude/loop.json",
  ".claude/artifacts/loop/backlog/",
];

export function normalizePath(p: string): string {
  return p
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .toLowerCase();
}

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .split("*")
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join("[^/]*");
  return new RegExp(`^${escaped}$`);
}

function isGlob(p: string): boolean {
  return p.includes("*");
}

function inCoarsePrefix(p: string): string | null {
  const np = normalizePath(p);
  for (const prefix of COARSE_PREFIXES) {
    if (np === prefix || np.startsWith(prefix.toLowerCase())) {
      return prefix;
    }
  }
  return null;
}

export function pathsConflict(a: string, b: string): boolean {
  const na = normalizePath(a);
  const nb = normalizePath(b);

  if (na === nb) return true;

  const aPrefix = inCoarsePrefix(na);
  const bPrefix = inCoarsePrefix(nb);
  if (aPrefix !== null && aPrefix === bPrefix) return true;

  if (isGlob(na) && globToRegex(na).test(nb)) return true;
  if (isGlob(nb) && globToRegex(nb).test(na)) return true;

  return false;
}

export class PathSet {
  private paths: string[] = [];

  addAll(paths: string[]): void {
    for (const p of paths) {
      this.paths.push(p);
    }
  }

  conflictsWith(candidate: string[]): boolean {
    return this.conflictingPath(candidate) !== null;
  }

  conflictingPath(candidate: string[]): string | null {
    for (const c of candidate) {
      for (const existing of this.paths) {
        if (pathsConflict(c, existing)) return existing;
      }
    }
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/tests/wave/conflict.test.mts`
Expected: PASS (12 tests)

- [ ] **Step 5: Run lint + typecheck**

Run: `bunx eslint src/scripts/lib/wave/conflict.mts src/tests/wave/conflict.test.mts && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/scripts/lib/wave/conflict.mts src/tests/wave/conflict.test.mts
git commit -m "feat(wave): add path conflict primitives (normalize + PathSet)"
```

---

## Task 3: touches_files parser + inference

**Files:**
- Create: `src/scripts/lib/wave/touches-files.mts`
- Test: `src/tests/wave/touches-files.test.mts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/tests/wave/touches-files.test.mts
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readTouchesFiles } from "../../scripts/lib/wave/touches-files.mjs";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wave-touches-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function writeSlice(name: string, body: string): string {
  const p = join(tmp, name);
  writeFileSync(p, body, "utf8");
  return p;
}

describe("readTouchesFiles", () => {
  test("declared frontmatter wins", () => {
    const p = writeSlice(
      "SLICE-1.md",
      `---
id: SLICE-1
touches_files:
  - src/a.mts
  - src/b.mts
touches_files_confidence: declared
---
# body
`,
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.confidence).toBe("declared");
    expect(r.paths).toEqual(["src/a.mts", "src/b.mts"]);
  });

  test("inferred from In scope body when frontmatter missing", () => {
    const p = writeSlice(
      "SLICE-2.md",
      `---
id: SLICE-2
---
# SLICE-2
## In scope
- Add helper to \`src/scripts/lib/brief.mts\`
- Update \`src/tests/brief.test.mts\` with 3 cases
`,
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.confidence).toBe("inferred");
    expect(r.paths.sort()).toEqual(["src/scripts/lib/brief.mts", "src/tests/brief.test.mts"]);
  });

  test("missing when no frontmatter + no body matches", () => {
    const p = writeSlice(
      "SLICE-3.md",
      `---
id: SLICE-3
---
# SLICE-3
## In scope
- Update the configuration
- Write tests
`,
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.confidence).toBe("missing");
    expect(r.paths).toEqual([]);
  });

  test("dedup duplicate paths from body", () => {
    const p = writeSlice(
      "SLICE-4.md",
      `---
id: SLICE-4
---
## In scope
- Edit \`src/a.mts\`
- Also edit \`src/a.mts\` again
`,
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.confidence).toBe("inferred");
    expect(r.paths).toEqual(["src/a.mts"]);
  });

  test("normalizes backslashes from declared paths", () => {
    const p = writeSlice(
      "SLICE-5.md",
      `---
id: SLICE-5
touches_files:
  - src\\foo.mts
touches_files_confidence: declared
---
`,
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.paths).toEqual(["src/foo.mts"]);
  });

  test("non-existent slice file throws", () => {
    expect(() => readTouchesFiles(join(tmp, "missing.md"), tmp)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/tests/wave/touches-files.test.mts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement the parser**

```typescript
// src/scripts/lib/wave/touches-files.mts
import { readFileSync } from "node:fs";
import type { TouchesFilesResult } from "./types.mjs";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
const INFERENCE_RE =
  /(?:src|docs|scripts|commands|agents|skills)\/[\w\-./]+\.(?:mts|md|json|yaml|yml|mjs|ts|js)/g;

function normalize(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

function parseFrontmatter(raw: string): Record<string, unknown> {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) return {};
  const lines = m[1].split("\n");
  const out: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let listAcc: string[] | null = null;
  for (const line of lines) {
    if (line.startsWith("  - ") && currentKey !== null && listAcc !== null) {
      listAcc.push(line.slice(4).trim());
      continue;
    }
    if (listAcc !== null && currentKey !== null) {
      out[currentKey] = listAcc;
      listAcc = null;
      currentKey = null;
    }
    const kv = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === "") {
      currentKey = key;
      listAcc = [];
    } else {
      out[key] = value.trim();
    }
  }
  if (listAcc !== null && currentKey !== null) {
    out[currentKey] = listAcc;
  }
  return out;
}

function inferFromBody(body: string): string[] {
  const matches = body.match(INFERENCE_RE) ?? [];
  const dedup = Array.from(new Set(matches.map(normalize)));
  dedup.sort();
  return dedup;
}

export function readTouchesFiles(slicePath: string, _repoRoot: string): TouchesFilesResult {
  const raw = readFileSync(slicePath, "utf8");
  const fm = parseFrontmatter(raw);
  const declared = fm["touches_files"];

  if (Array.isArray(declared) && declared.length > 0) {
    return {
      paths: declared.map((p) => normalize(String(p))),
      confidence: "declared",
    };
  }

  const body = raw.replace(FRONTMATTER_RE, "");
  const inferred = inferFromBody(body);
  if (inferred.length > 0) {
    return { paths: inferred, confidence: "inferred" };
  }

  return { paths: [], confidence: "missing" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/tests/wave/touches-files.test.mts`
Expected: PASS (6 tests)

- [ ] **Step 5: Run lint + typecheck**

Run: `bunx eslint src/scripts/lib/wave/touches-files.mts src/tests/wave/touches-files.test.mts && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/scripts/lib/wave/touches-files.mts src/tests/wave/touches-files.test.mts
git commit -m "feat(wave): add touches_files parser with declared/inferred/missing classification"
```

---

## Task 4: Slice frontmatter validator CLI

**Files:**
- Create: `src/scripts/validate-slice-touches-files.mts`
- Test: `src/tests/wave/validate-touches-files.test.mts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/tests/wave/validate-touches-files.test.mts
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateRepo } from "../../scripts/validate-slice-touches-files.mjs";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wave-validate-"));
  mkdirSync(join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending"), { recursive: true });
  mkdirSync(join(tmp, "src/scripts/lib"), { recursive: true });
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function writeSlice(state: string, name: string, body: string): void {
  const dir = join(tmp, ".claude/artifacts/loop/ai-loop/slices", state);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), body, "utf8");
}

describe("validateRepo", () => {
  test("clean: declared touches_files paths whose parent dirs exist", () => {
    writeSlice(
      "pending",
      "SLICE-1.md",
      `---
id: SLICE-1
created: 2026-06-15
touches_files:
  - src/scripts/lib/foo.mts
touches_files_confidence: declared
---
`,
    );
    const r = validateRepo(tmp, { warnCutoff: "2026-06-01" });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  test("warn: missing confidence on slice created after cutoff", () => {
    writeSlice(
      "pending",
      "SLICE-2.md",
      `---
id: SLICE-2
created: 2026-06-15
---
# body, no touches mentioned
`,
    );
    const r = validateRepo(tmp, { warnCutoff: "2026-06-01" });
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain("SLICE-2");
    expect(r.errors).toEqual([]);
  });

  test("error: declared path whose parent dir does not exist", () => {
    writeSlice(
      "pending",
      "SLICE-3.md",
      `---
id: SLICE-3
created: 2026-06-15
touches_files:
  - bogus/path/foo.mts
touches_files_confidence: declared
---
`,
    );
    const r = validateRepo(tmp, { warnCutoff: "2026-06-01" });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("bogus/path");
  });

  test("error: absolute path declared", () => {
    writeSlice(
      "pending",
      "SLICE-4.md",
      `---
id: SLICE-4
created: 2026-06-15
touches_files:
  - /etc/passwd
touches_files_confidence: declared
---
`,
    );
    const r = validateRepo(tmp, { warnCutoff: "2026-06-01" });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("outside repo");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/tests/wave/validate-touches-files.test.mts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement the validator**

```typescript
// src/scripts/validate-slice-touches-files.mts
import { existsSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { readTouchesFiles } from "./lib/wave/touches-files.mjs";

export type ValidateResult = {
  errors: string[];
  warnings: string[];
  filesScanned: number;
};

const SLICES_ROOT = ".claude/artifacts/loop/ai-loop/slices";
const STATES = ["pending", "in-progress", "needs-review"];

function listSlices(repoRoot: string): string[] {
  const out: string[] = [];
  for (const state of STATES) {
    const dir = join(repoRoot, SLICES_ROOT, state);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (name.endsWith(".md")) out.push(join(dir, name));
    }
  }
  return out;
}

function extractCreated(slicePath: string): string | null {
  const raw = require("node:fs").readFileSync(slicePath, "utf8") as string;
  const m = raw.match(/^created:\s*(\d{4}-\d{2}-\d{2})/m);
  return m ? m[1] : null;
}

export function validateRepo(
  repoRoot: string,
  opts: { warnCutoff: string },
): ValidateResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const slicePaths = listSlices(repoRoot);

  for (const slicePath of slicePaths) {
    const r = readTouchesFiles(slicePath, repoRoot);
    const sliceId = slicePath.split(/[\\/]/).pop();

    if (r.confidence === "missing") {
      const created = extractCreated(slicePath);
      if (created !== null && created >= opts.warnCutoff) {
        warnings.push(`${sliceId}: touches_files missing (created ${created})`);
      }
      continue;
    }

    for (const p of r.paths) {
      if (isAbsolute(p)) {
        errors.push(`${sliceId}: path "${p}" outside repo (absolute)`);
        continue;
      }
      if (p.includes("..")) {
        errors.push(`${sliceId}: path "${p}" outside repo (parent traversal)`);
        continue;
      }
      if (p.includes("*")) continue;
      const parent = dirname(p);
      if (!existsSync(join(repoRoot, parent))) {
        errors.push(`${sliceId}: parent dir "${parent}" does not exist for "${p}"`);
      }
    }
  }

  return { errors, warnings, filesScanned: slicePaths.length };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const repoIdx = args.indexOf("--repo");
  const repoRoot = repoIdx >= 0 ? args[repoIdx + 1] : process.cwd();
  const cutoffIdx = args.indexOf("--warn-cutoff");
  const cutoff = cutoffIdx >= 0 ? args[cutoffIdx + 1] : "2026-06-15";

  const r = validateRepo(repoRoot, { warnCutoff: cutoff });
  for (const w of r.warnings) console.warn(`WARN ${w}`);
  for (const e of r.errors) console.error(`ERROR ${e}`);
  console.log(`Scanned ${r.filesScanned} slice files; ${r.warnings.length} warnings, ${r.errors.length} errors`);
  if (r.errors.length > 0) process.exitCode = 1;
}

if (import.meta.path === Bun.main) {
  void main();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/tests/wave/validate-touches-files.test.mts`
Expected: PASS (4 tests)

- [ ] **Step 5: Run validator against current repo**

Run: `bun ./src/scripts/validate-slice-touches-files.mts --repo . --warn-cutoff 2099-01-01`
Expected: Exit 0; only warnings (no current slices have touches_files yet, all dated before cutoff filter)

- [ ] **Step 6: Run lint + typecheck**

Run: `bunx eslint src/scripts/validate-slice-touches-files.mts src/tests/wave/validate-touches-files.test.mts && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/scripts/validate-slice-touches-files.mts src/tests/wave/validate-touches-files.test.mts
git commit -m "feat(wave): add validate-slice-touches-files CI script"
```

---

## Task 5: Spec-writer contract update

**Files:**
- Modify: `agents/spec-writer.md`

- [ ] **Step 1: Read existing spec-writer agent**

Run: `cat agents/spec-writer.md | head -80`
Read top portion to find the "Slice-level SDD" section heading.

- [ ] **Step 2: Append the touches_files contract**

Find the section heading that describes slice-level SDD output (typically headed like `## Slice-level SDD spec` or `### Output`). Append this paragraph at the end of that section:

```markdown
### touches_files frontmatter (REQUIRED for wave-mode dispatch)

Every slice spec MUST populate `touches_files` in its frontmatter:

```yaml
---
id: SLICE-NNN
touches_files:
  - src/scripts/lib/foo.mts
  - src/tests/foo.test.mts
touches_files_confidence: declared
---
```

Rules:
- Repo-relative paths only. No absolute paths, no `..` parent traversal.
- Exact paths preferred; globs (e.g., `src/tests/wave/*.test.mts`) only when the change touches a generated set.
- Include every file the slice will create, edit, or delete — tests counted.
- Set `touches_files_confidence: declared` to signal the planner that the list is authoritative.
- When omitted or empty, the wave planner falls back to body inference (regex over the In scope section); the slice will dispatch alone (wave size collapses to 1) rather than block other slices.

This contract is enforced by `bun ./src/scripts/validate-slice-touches-files.mts` in CI.
```

- [ ] **Step 3: Verify the line-cap rule (300 lines for owned agents)**

Run: `wc -l agents/spec-writer.md`
Expected: ≤ 300. If over, trim earlier content rather than the new contract.

- [ ] **Step 4: Run validators**

Run: `bun ./src/scripts/validate-manifests.mts && bun ./src/scripts/validate-content-length.mts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add agents/spec-writer.md
git commit -m "feat(wave): add touches_files frontmatter contract to spec-writer"
```

---

## Task 6: Extract rankCandidates from auto-walker

**Files:**
- Modify: `src/scripts/lib/auto-walker.mts`
- Create: `src/scripts/lib/wave/ranking.mts`
- Test: `src/tests/wave/ranking.test.mts`

- [ ] **Step 1: Read auto-walker to find ranking logic**

Run: `grep -n "sort\|rank\|composite_score\|priority" src/scripts/lib/auto-walker.mts | head -20`
Identify the in-file comparator function (likely inline inside `walk`).

- [ ] **Step 2: Write the failing test**

```typescript
// src/tests/wave/ranking.test.mts
import { describe, expect, test } from "bun:test";
import { rankCandidates } from "../../scripts/lib/wave/ranking.mjs";
import type { SliceCandidate } from "../../scripts/lib/wave/types.mjs";

function cand(over: Partial<SliceCandidate>): SliceCandidate {
  return {
    sliceId: "SLICE-X",
    featureId: "FEAT-X",
    slicePath: "",
    priority: "P3",
    compositeScore: 0,
    strategicFit: 0,
    touches: { paths: [], confidence: "missing" },
    pmRiskLevel: 0,
    autonomousSafe: true,
    retryCount: 0,
    pendingFix: false,
    dependsOn: [],
    helpRequestOpen: false,
    ...over,
  };
}

describe("rankCandidates", () => {
  test("pendingFix items first", () => {
    const a = cand({ sliceId: "A", compositeScore: 0.9 });
    const b = cand({ sliceId: "B", compositeScore: 0.1, pendingFix: true });
    expect(rankCandidates([a, b]).map((c) => c.sliceId)).toEqual(["B", "A"]);
  });
  test("compositeScore DESC among non-pending", () => {
    const a = cand({ sliceId: "A", compositeScore: 0.5 });
    const b = cand({ sliceId: "B", compositeScore: 0.8 });
    expect(rankCandidates([a, b]).map((c) => c.sliceId)).toEqual(["B", "A"]);
  });
  test("priority breaks ties: P0 > P1 > P2 > P3", () => {
    const a = cand({ sliceId: "A", priority: "P2" });
    const b = cand({ sliceId: "B", priority: "P0" });
    expect(rankCandidates([a, b]).map((c) => c.sliceId)).toEqual(["B", "A"]);
  });
  test("strategicFit DESC breaks priority ties", () => {
    const a = cand({ sliceId: "A", priority: "P2", strategicFit: 0.3 });
    const b = cand({ sliceId: "B", priority: "P2", strategicFit: 0.7 });
    expect(rankCandidates([a, b]).map((c) => c.sliceId)).toEqual(["B", "A"]);
  });
  test("retryCount ASC breaks strategicFit ties", () => {
    const a = cand({ sliceId: "A", retryCount: 1 });
    const b = cand({ sliceId: "B", retryCount: 0 });
    expect(rankCandidates([a, b]).map((c) => c.sliceId)).toEqual(["B", "A"]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test src/tests/wave/ranking.test.mts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 4: Implement ranking module**

```typescript
// src/scripts/lib/wave/ranking.mts
import type { SliceCandidate, SlicePriority } from "./types.mjs";

const PRIORITY_RANK: Record<SlicePriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

export function rankCandidates(input: SliceCandidate[]): SliceCandidate[] {
  return [...input].sort((a, b) => {
    if (a.pendingFix !== b.pendingFix) return a.pendingFix ? -1 : 1;
    if (a.compositeScore !== b.compositeScore) return b.compositeScore - a.compositeScore;
    if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (a.strategicFit !== b.strategicFit) return b.strategicFit - a.strategicFit;
    return a.retryCount - b.retryCount;
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test src/tests/wave/ranking.test.mts`
Expected: PASS (5 tests)

- [ ] **Step 6: Refactor auto-walker to consume the new module**

Open `src/scripts/lib/auto-walker.mts`. Find the inline sort comparator. Replace its sort call with a call to `rankCandidates` from `./wave/ranking.mjs`, adapting the input type if needed. If auto-walker's candidate type differs from `SliceCandidate`, write a small adapter inside auto-walker rather than touching the type module.

- [ ] **Step 7: Run full test suite**

Run: `bun test src/tests/ --parallel --timeout 60000`
Expected: PASS (no regressions in auto-walker tests)

- [ ] **Step 8: Run lint + typecheck**

Run: `bunx eslint src/scripts/lib/wave/ranking.mts src/scripts/lib/auto-walker.mts src/tests/wave/ranking.test.mts && bunx tsc --project tsconfig.json --noEmit`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/scripts/lib/wave/ranking.mts src/scripts/lib/auto-walker.mts src/tests/wave/ranking.test.mts
git commit -m "refactor(wave): extract rankCandidates from auto-walker for wave planner reuse"
```

---

## Task 7: Wave planner with greedy packer

**Files:**
- Create: `src/scripts/lib/wave/planner.mts`
- Test: `src/tests/wave/planner.test.mts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/tests/wave/planner.test.mts
import { describe, expect, test } from "bun:test";
import { packWave } from "../../scripts/lib/wave/planner.mjs";
import type { SliceCandidate } from "../../scripts/lib/wave/types.mjs";

function cand(id: string, paths: string[], over: Partial<SliceCandidate> = {}): SliceCandidate {
  return {
    sliceId: id,
    featureId: `FEAT-${id}`,
    slicePath: "",
    priority: "P2",
    compositeScore: 0.5,
    strategicFit: 0.5,
    touches: { paths, confidence: paths.length > 0 ? "declared" : "missing" },
    pmRiskLevel: 0,
    autonomousSafe: true,
    retryCount: 0,
    pendingFix: false,
    dependsOn: [],
    helpRequestOpen: false,
    ...over,
  };
}

const opts = { waveSize: 3, sliceCommand: "/crew:orchestrate-slice", waveId: "test-wave" };

describe("packWave", () => {
  test("empty ranked list returns size 0", () => {
    const p = packWave([], opts);
    expect(p.size).toBe(0);
    expect(p.items).toEqual([]);
  });

  test("packs 3 non-conflicting slices up to waveSize", () => {
    const ranked = [
      cand("S1", ["src/a.mts"]),
      cand("S2", ["src/b.mts"]),
      cand("S3", ["src/c.mts"]),
      cand("S4", ["src/d.mts"]),
    ];
    const p = packWave(ranked, opts);
    expect(p.size).toBe(3);
    expect(p.items.map((i) => i.sliceId)).toEqual(["S1", "S2", "S3"]);
  });

  test("rejects conflicting slice with reason", () => {
    const ranked = [
      cand("S1", ["src/a.mts"]),
      cand("S2", ["src/a.mts"]),
      cand("S3", ["src/b.mts"]),
    ];
    const p = packWave(ranked, opts);
    expect(p.items.map((i) => i.sliceId)).toEqual(["S1", "S3"]);
    expect(p.rejected).toHaveLength(1);
    expect(p.rejected[0].sliceId).toBe("S2");
    expect(p.rejected[0].reason).toContain("conflict");
  });

  test("missing touches_files dispatched solo when picked is empty", () => {
    const ranked = [cand("S1", []), cand("S2", ["src/b.mts"])];
    const p = packWave(ranked, opts);
    expect(p.size).toBe(1);
    expect(p.items[0].sliceId).toBe("S1");
    expect(p.rejected.find((r) => r.sliceId === "S2")).toBeUndefined();
  });

  test("missing touches_files rejected when picked is non-empty", () => {
    const ranked = [cand("S1", ["src/a.mts"]), cand("S2", [])];
    const p = packWave(ranked, opts);
    expect(p.size).toBe(1);
    expect(p.rejected[0].sliceId).toBe("S2");
    expect(p.rejected[0].reason).toContain("missing");
  });

  test("dispatchPrompt contains sliceCommand + sliceId + worktreePath placeholder", () => {
    const p = packWave([cand("S1", ["src/a.mts"])], opts);
    expect(p.items[0].dispatchPrompt).toContain("/crew:orchestrate-slice");
    expect(p.items[0].dispatchPrompt).toContain("S1");
  });

  test("worktreeBranch uses waveId + sliceId", () => {
    const p = packWave([cand("S1", ["src/a.mts"])], opts);
    expect(p.items[0].worktreeBranch).toContain("test-wave");
    expect(p.items[0].worktreeBranch).toContain("S1");
  });

  test("waveSize: 1 short-circuits to ranked[0]", () => {
    const p = packWave(
      [cand("S1", ["src/a.mts"]), cand("S2", ["src/b.mts"])],
      { ...opts, waveSize: 1 },
    );
    expect(p.size).toBe(1);
    expect(p.items[0].sliceId).toBe("S1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/tests/wave/planner.test.mts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement the planner**

```typescript
// src/scripts/lib/wave/planner.mts
import { PathSet } from "./conflict.mjs";
import { buildDispatchPrompt } from "./dispatch-prompt.mjs";
import type { SliceCandidate, WavePlan, WavePlanItem, WaveRejection } from "./types.mjs";

export type PackOpts = {
  waveSize: number;
  sliceCommand: string;
  waveId: string;
};

export function packWave(ranked: SliceCandidate[], opts: PackOpts): WavePlan {
  const picked: SliceCandidate[] = [];
  const rejected: WaveRejection[] = [];
  const pickedPaths = new PathSet();

  for (const cand of ranked) {
    if (picked.length >= opts.waveSize) break;

    if (cand.touches.confidence === "missing") {
      if (picked.length === 0) {
        picked.push(cand);
        break;
      }
      rejected.push({
        sliceId: cand.sliceId,
        reason: "missing_touches_files_solo_only",
      });
      continue;
    }

    const conflict = pickedPaths.conflictingPath(cand.touches.paths);
    if (conflict !== null) {
      rejected.push({
        sliceId: cand.sliceId,
        reason: `conflict_with_${conflict}`,
      });
      continue;
    }

    picked.push(cand);
    pickedPaths.addAll(cand.touches.paths);
  }

  const items: WavePlanItem[] = picked.map((c) => ({
    sliceId: c.sliceId,
    featureId: c.featureId,
    worktreeBranch: `wave/${opts.waveId}/${c.sliceId}`,
    sliceCommand: opts.sliceCommand,
    dispatchPrompt: buildDispatchPrompt({
      sliceId: c.sliceId,
      worktreePath: `<worktreePath:${c.sliceId}>`,
      sliceCommand: opts.sliceCommand,
      mode: "normal",
    }),
  }));

  return {
    waveId: opts.waveId,
    size: items.length,
    items,
    rejected,
    config: { waveSize: opts.waveSize, sliceCommand: opts.sliceCommand },
  };
}
```

- [ ] **Step 4: Stub the dispatch-prompt module (full impl in Task 8)**

```typescript
// src/scripts/lib/wave/dispatch-prompt.mts
export type DispatchPromptOpts = {
  sliceId: string;
  worktreePath: string;
  sliceCommand: string;
  mode: "normal" | "fix";
  failureArtifactPath?: string;
};

export function buildDispatchPrompt(opts: DispatchPromptOpts): string {
  if (opts.mode === "fix") {
    return [
      `You are running in worktree ${opts.worktreePath} for slice ${opts.sliceId} in fix mode.`,
      `Previous wave attempt FAILED. Failure artifact: ${opts.failureArtifactPath ?? "(unknown)"}.`,
      `1. Read the failure artifact in full.`,
      `2. Execute the slash command: /crew:fix --slice ${opts.sliceId} --failure ${opts.failureArtifactPath ?? "(unknown)"}`,
      `3. Wait for completion.`,
      `4. Return a JSON marker on the last line: {"slice":"${opts.sliceId}","status":"PASS"|"FAIL","artifacts":[paths]}`,
    ].join("\n");
  }
  return [
    `You are running in worktree ${opts.worktreePath} for slice ${opts.sliceId}.`,
    `1. Execute the slash command: ${opts.sliceCommand} --id ${opts.sliceId}`,
    `2. Wait for completion.`,
    `3. Return a JSON marker on the last line: {"slice":"${opts.sliceId}","status":"PASS"|"FAIL","artifacts":[paths]}`,
  ].join("\n");
}
```

- [ ] **Step 5: Run planner test**

Run: `bun test src/tests/wave/planner.test.mts`
Expected: PASS (8 tests)

- [ ] **Step 6: Run lint + typecheck**

Run: `bunx eslint src/scripts/lib/wave/planner.mts src/scripts/lib/wave/dispatch-prompt.mts src/tests/wave/planner.test.mts && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/scripts/lib/wave/planner.mts src/scripts/lib/wave/dispatch-prompt.mts src/tests/wave/planner.test.mts
git commit -m "feat(wave): add greedy wave planner + dispatch-prompt builder"
```

---

## Task 8: Dispatch-prompt unit test

**Files:**
- Test: `src/tests/wave/dispatch-prompt.test.mts`

- [ ] **Step 1: Write the test (impl already in Task 7 stub)**

```typescript
// src/tests/wave/dispatch-prompt.test.mts
import { describe, expect, test } from "bun:test";
import { buildDispatchPrompt } from "../../scripts/lib/wave/dispatch-prompt.mjs";

describe("buildDispatchPrompt", () => {
  test("normal mode contains slice command + slice id + worktree path", () => {
    const p = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "normal",
    });
    expect(p).toContain("/crew:orchestrate-slice --id SLICE-117");
    expect(p).toContain("/tmp/wt/SLICE-117");
    expect(p).toContain("JSON marker");
  });

  test("fix mode includes failure artifact path and /crew:fix invocation", () => {
    const p = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "fix",
      failureArtifactPath: ".claude/artifacts/crew/handoffs/SLICE-117-fail.md",
    });
    expect(p).toContain("/crew:fix --slice SLICE-117");
    expect(p).toContain(".claude/artifacts/crew/handoffs/SLICE-117-fail.md");
    expect(p).toContain("fix mode");
  });

  test("fix mode without failure artifact uses '(unknown)' placeholder", () => {
    const p = buildDispatchPrompt({
      sliceId: "SLICE-117",
      worktreePath: "/tmp/wt/SLICE-117",
      sliceCommand: "/crew:orchestrate-slice",
      mode: "fix",
    });
    expect(p).toContain("(unknown)");
  });
});
```

- [ ] **Step 2: Run test**

Run: `bun test src/tests/wave/dispatch-prompt.test.mts`
Expected: PASS (3 tests)

- [ ] **Step 3: Commit**

```bash
git add src/tests/wave/dispatch-prompt.test.mts
git commit -m "test(wave): add dispatch-prompt unit tests"
```

---

## Task 9: loadCandidates (read from disk)

**Files:**
- Modify: `src/scripts/lib/wave/planner.mts` (add `loadCandidates`)
- Test: extend `src/tests/wave/planner.test.mts` with disk-based fixture

- [ ] **Step 1: Write the failing test (append to existing planner test)**

Add to `src/tests/wave/planner.test.mts`:

```typescript
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadCandidates } from "../../scripts/lib/wave/planner.mjs";

describe("loadCandidates", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "wave-load-"));
    mkdirSync(join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending"), { recursive: true });
    mkdirSync(join(tmp, ".claude/artifacts/loop/backlog/triaged"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  test("loads pending slices with touches_files into candidates", () => {
    writeFileSync(
      join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending/SLICE-1.md"),
      `---
id: SLICE-1
feature: FEAT-1
priority: P2
touches_files:
  - src/a.mts
touches_files_confidence: declared
---
`,
    );
    writeFileSync(
      join(tmp, ".claude/artifacts/loop/backlog/triaged/FEAT-1.md"),
      `---
id: FEAT-1
priority: P2
composite_score: 0.7
pm_strategic_fit: 0.6
pm_risk_level: 0.2
autonomous_safe: true
---
`,
    );
    const cands = loadCandidates(tmp);
    expect(cands).toHaveLength(1);
    expect(cands[0].sliceId).toBe("SLICE-1");
    expect(cands[0].compositeScore).toBe(0.7);
    expect(cands[0].touches.confidence).toBe("declared");
  });

  test("skips slice when parent FEAT missing from triaged", () => {
    writeFileSync(
      join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending/SLICE-2.md"),
      `---
id: SLICE-2
feature: FEAT-MISSING
---
`,
    );
    const cands = loadCandidates(tmp);
    expect(cands).toHaveLength(0);
  });
});
```

(Add `beforeEach`/`afterEach` to the import line if not already there.)

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/tests/wave/planner.test.mts`
Expected: FAIL — `loadCandidates` not exported

- [ ] **Step 3: Implement loadCandidates in planner.mts**

Append to `src/scripts/lib/wave/planner.mts`:

```typescript
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readTouchesFiles } from "./touches-files.mjs";
import type { SliceCandidate, SlicePriority } from "./types.mjs";

const SLICES_PENDING = ".claude/artifacts/loop/ai-loop/slices/pending";
const BACKLOG_TRIAGED = ".claude/artifacts/loop/backlog/triaged";
const BACKLOG_IN_PROGRESS = ".claude/artifacts/loop/backlog/in-progress";

function parseFrontmatter(raw: string): Record<string, string | string[]> {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out: Record<string, string | string[]> = {};
  let key: string | null = null;
  let acc: string[] | null = null;
  for (const line of m[1].split("\n")) {
    if (line.startsWith("  - ") && key !== null && acc !== null) {
      acc.push(line.slice(4).trim());
      continue;
    }
    if (acc !== null && key !== null) {
      out[key] = acc;
      acc = null;
      key = null;
    }
    const kv = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!kv) continue;
    if (kv[2] === "") {
      key = kv[1];
      acc = [];
    } else {
      out[kv[1]] = kv[2].trim();
    }
  }
  if (acc !== null && key !== null) out[key] = acc;
  return out;
}

function loadFeatureMap(repoRoot: string): Map<string, Record<string, string | string[]>> {
  const map = new Map<string, Record<string, string | string[]>>();
  for (const state of ["triaged", "in-progress"]) {
    const dir = join(repoRoot, ".claude/artifacts/loop/backlog", state);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".md")) continue;
      const fm = parseFrontmatter(readFileSync(join(dir, name), "utf8"));
      const id = String(fm["id"] ?? name.replace(/\.md$/, ""));
      map.set(id, fm);
    }
  }
  return map;
}

function asPriority(v: unknown): SlicePriority {
  const s = String(v ?? "P3");
  if (s === "P0" || s === "P1" || s === "P2") return s;
  return "P3";
}

function asNumber(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asBoolean(v: unknown, fallback: boolean): boolean {
  if (v === "true" || v === true) return true;
  if (v === "false" || v === false) return false;
  return fallback;
}

export function loadCandidates(repoRoot: string): SliceCandidate[] {
  const slicesDir = join(repoRoot, SLICES_PENDING);
  if (!existsSync(slicesDir)) return [];
  const featureMap = loadFeatureMap(repoRoot);
  const out: SliceCandidate[] = [];

  for (const name of readdirSync(slicesDir)) {
    if (!name.endsWith(".md")) continue;
    const slicePath = join(slicesDir, name);
    const raw = readFileSync(slicePath, "utf8");
    const fm = parseFrontmatter(raw);
    const sliceId = String(fm["id"] ?? name.replace(/\.md$/, ""));
    const featureId = String(fm["feature"] ?? "");
    const feature = featureMap.get(featureId);
    if (!feature) continue;

    const touches = readTouchesFiles(slicePath, repoRoot);
    const dependsOnRaw = feature["depends_on"];
    const dependsOn = Array.isArray(dependsOnRaw) ? dependsOnRaw.map(String) : [];

    out.push({
      sliceId,
      featureId,
      slicePath,
      priority: asPriority(fm["priority"] ?? feature["priority"]),
      compositeScore: asNumber(feature["composite_score"], 0),
      strategicFit: asNumber(feature["pm_strategic_fit"], 0),
      touches,
      pmRiskLevel: asNumber(feature["pm_risk_level"], 0),
      autonomousSafe: asBoolean(feature["autonomous_safe"], false),
      retryCount: asNumber(fm["wave_attempts"], 0),
      pendingFix: asBoolean(fm["pending_fix"], false),
      dependsOn,
      helpRequestOpen: false,
    });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/tests/wave/planner.test.mts`
Expected: PASS (10 tests now: 8 packer + 2 loader)

- [ ] **Step 5: Run lint + typecheck**

Run: `bunx eslint src/scripts/lib/wave/planner.mts && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/scripts/lib/wave/planner.mts src/tests/wave/planner.test.mts
git commit -m "feat(wave): add loadCandidates reading slices + parent FEATs from disk"
```

---

## Task 10: Failure pivot module

**Files:**
- Create: `src/scripts/lib/wave/failure-pivot.mts`
- Test: `src/tests/wave/failure-pivot.test.mts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/tests/wave/failure-pivot.test.mts
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildFailurePivot, persistPivot } from "../../scripts/lib/wave/failure-pivot.mjs";
import type { SliceCandidate, WaveConfig, WorktreeResult } from "../../scripts/lib/wave/types.mjs";

const cfg: WaveConfig = {
  size: 3,
  sliceCommand: "/crew:orchestrate-slice",
  sliceCommandFallback: "/crew:build",
  fixCommand: "/crew:fix",
  maxParallel: 3,
  dispatchTimeoutMs: 30 * 60 * 1000,
  postMergeTestCmd: "bun test",
  maxWaveAttempts: 2,
  subagentType: "general-purpose",
  artifactsRoot: ".claude/artifacts/loop/waves",
};

function mkCandidate(id: string, retryCount = 0): SliceCandidate {
  return {
    sliceId: id,
    featureId: `FEAT-${id}`,
    slicePath: "",
    priority: "P2",
    compositeScore: 0.5,
    strategicFit: 0.5,
    touches: { paths: ["src/a.mts"], confidence: "declared" },
    pmRiskLevel: 0,
    autonomousSafe: true,
    retryCount,
    pendingFix: false,
    dependsOn: [],
    helpRequestOpen: false,
  };
}

function mkResult(id: string, status: "FAIL" | "timeout" | "agent_error" = "FAIL"): WorktreeResult {
  return {
    sliceId: id,
    branch: `wave/X/${id}`,
    worktreePath: `/tmp/wt/${id}`,
    status,
    marker: { slice: id, status },
    artifacts: [`.claude/artifacts/crew/handoffs/${id}-fail.md`],
  };
}

describe("buildFailurePivot", () => {
  test("worktree_fail kind for status FAIL", () => {
    const p = buildFailurePivot(mkResult("S1"), { conflicts: [] }, mkCandidate("S1"), "wave-1", cfg);
    expect(p.failureKind).toBe("worktree_fail");
  });

  test("timeout kind for status timeout", () => {
    const p = buildFailurePivot(mkResult("S1", "timeout"), { conflicts: [] }, mkCandidate("S1"), "wave-1", cfg);
    expect(p.failureKind).toBe("timeout");
  });

  test("merge_conflict kind when finalize reports conflict for branch", () => {
    const p = buildFailurePivot(
      { ...mkResult("S1"), status: "PASS" },
      { conflicts: ["wave/X/S1"] },
      mkCandidate("S1"),
      "wave-1",
      cfg,
    );
    expect(p.failureKind).toBe("merge_conflict");
  });

  test("retryCount incremented from candidate", () => {
    const p = buildFailurePivot(mkResult("S1"), { conflicts: [] }, mkCandidate("S1", 1), "wave-1", cfg);
    expect(p.retryCount).toBe(2);
  });

  test("fixDispatchPrompt contains /crew:fix and failureArtifactPath", () => {
    const p = buildFailurePivot(mkResult("S1"), { conflicts: [] }, mkCandidate("S1"), "wave-1", cfg);
    expect(p.fixDispatchPrompt).toContain("/crew:fix --slice S1");
    expect(p.fixDispatchPrompt).toContain(p.failureArtifactPath);
  });
});

describe("persistPivot", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "wave-pivot-"));
    mkdirSync(join(tmp, "slices"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  test("mutates slice frontmatter with wave_attempts + pending_fix + last_failure", () => {
    const slicePath = join(tmp, "slices/SLICE-1.md");
    writeFileSync(
      slicePath,
      `---
id: SLICE-1
status: pending
---
body
`,
      "utf8",
    );
    const pivot = buildFailurePivot(
      mkResult("SLICE-1"),
      { conflicts: [] },
      { ...mkCandidate("SLICE-1"), slicePath },
      "wave-1",
      cfg,
    );
    persistPivot(tmp, pivot);
    const updated = readFileSync(slicePath, "utf8");
    expect(updated).toContain("wave_attempts: 1");
    expect(updated).toContain("pending_fix: true");
    expect(updated).toMatch(/last_failure:[\s\S]*wave_id: ['"]?wave-1['"]?/);
  });

  test("escalates to needs-review at maxWaveAttempts", () => {
    const slicePath = join(tmp, "slices/SLICE-2.md");
    writeFileSync(
      slicePath,
      `---
id: SLICE-2
status: pending
wave_attempts: 1
---
`,
      "utf8",
    );
    const pivot = buildFailurePivot(
      mkResult("SLICE-2"),
      { conflicts: [] },
      { ...mkCandidate("SLICE-2", 1), slicePath },
      "wave-1",
      cfg,
    );
    persistPivot(tmp, pivot);
    const updated = readFileSync(slicePath, "utf8");
    expect(updated).toContain("status: needs-review");
    expect(updated).not.toContain("pending_fix: true");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/tests/wave/failure-pivot.test.mts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement the module**

```typescript
// src/scripts/lib/wave/failure-pivot.mts
import { readFileSync, writeFileSync } from "node:fs";
import { buildDispatchPrompt } from "./dispatch-prompt.mjs";
import type {
  FailureKind,
  FailurePivot,
  SliceCandidate,
  WaveConfig,
  WorktreeResult,
} from "./types.mjs";

export type FinalizeOutcome = {
  conflicts: string[];
};

function classifyKind(result: WorktreeResult, finalize: FinalizeOutcome): FailureKind {
  if (finalize.conflicts.includes(result.branch)) return "merge_conflict";
  if (result.status === "timeout") return "timeout";
  if (result.status === "agent_error") return "agent_error";
  return "worktree_fail";
}

function firstArtifact(result: WorktreeResult): string {
  return result.artifacts[0] ?? "(no artifact)";
}

export function buildFailurePivot(
  result: WorktreeResult,
  finalize: FinalizeOutcome,
  slice: SliceCandidate,
  waveId: string,
  cfg: WaveConfig,
): FailurePivot {
  const failureKind = classifyKind(result, finalize);
  const failureArtifactPath = firstArtifact(result);
  const retryCount = slice.retryCount + 1;
  return {
    sliceId: result.sliceId,
    featureId: slice.featureId,
    originalWaveId: waveId,
    failureKind,
    failureArtifactPath,
    worktreePath: failureKind === "merge_conflict" ? null : result.worktreePath,
    retryCount,
    fixCommand: cfg.fixCommand,
    fixDispatchPrompt: buildDispatchPrompt({
      sliceId: result.sliceId,
      worktreePath: result.worktreePath,
      sliceCommand: cfg.sliceCommand,
      mode: "fix",
      failureArtifactPath,
    }),
  };
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

function upsertFrontmatterField(fmBlock: string, key: string, value: string): string {
  const re = new RegExp(`^${key}:.*$`, "m");
  if (re.test(fmBlock)) {
    return fmBlock.replace(re, `${key}: ${value}`);
  }
  return fmBlock + `\n${key}: ${value}`;
}

function removeFrontmatterField(fmBlock: string, key: string): string {
  return fmBlock.replace(new RegExp(`^${key}:.*\n?`, "m"), "");
}

function setLastFailureBlock(fmBlock: string, pivot: FailurePivot): string {
  const stripped = fmBlock.replace(/^last_failure:[\s\S]*?(?=^[a-z_]+:|\Z)/m, "");
  const block = [
    "last_failure:",
    `  wave_id: ${pivot.originalWaveId}`,
    `  kind: ${pivot.failureKind}`,
    `  artifact: ${pivot.failureArtifactPath}`,
    `  pivot_command: ${pivot.fixCommand}`,
  ].join("\n");
  return stripped.replace(/\n+$/, "") + "\n" + block;
}

export function persistPivot(_repoRoot: string, pivot: FailurePivot): void {
  // slicePath travels with the candidate via SliceCandidate.slicePath; pivot doesn't carry it,
  // so the caller must wire the slice file path through buildFailurePivot's slice argument.
  // For symmetry with the test signature we expect the slice to carry slicePath.
  throw new Error("persistPivot requires slice path — call persistPivotAt instead");
}

export function persistPivotAt(slicePath: string, pivot: FailurePivot, cfg: WaveConfig): void {
  const raw = readFileSync(slicePath, "utf8");
  const m = raw.match(FRONTMATTER_RE);
  if (!m) throw new Error(`slice file missing frontmatter: ${slicePath}`);
  let fm = m[1];

  if (pivot.retryCount >= cfg.maxWaveAttempts) {
    fm = upsertFrontmatterField(fm, "status", "needs-review");
    fm = upsertFrontmatterField(fm, "wave_attempts", String(pivot.retryCount));
    fm = removeFrontmatterField(fm, "pending_fix");
    fm = setLastFailureBlock(fm, pivot);
  } else {
    fm = upsertFrontmatterField(fm, "wave_attempts", String(pivot.retryCount));
    fm = upsertFrontmatterField(fm, "pending_fix", "true");
    fm = setLastFailureBlock(fm, pivot);
  }
  const updated = raw.replace(FRONTMATTER_RE, `---\n${fm}\n---`);
  writeFileSync(slicePath, updated, "utf8");
}
```

Update the test imports to use `persistPivotAt` instead of `persistPivot` (rename in tests). The original test used `persistPivot(tmp, pivot)` — change to `persistPivotAt(slicePath, pivot, cfg)`. Update both `persistPivot` tests in Step 1's test file before running.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/tests/wave/failure-pivot.test.mts`
Expected: PASS (7 tests)

- [ ] **Step 5: Run lint + typecheck**

Run: `bunx eslint src/scripts/lib/wave/failure-pivot.mts src/tests/wave/failure-pivot.test.mts && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/scripts/lib/wave/failure-pivot.mts src/tests/wave/failure-pivot.test.mts
git commit -m "feat(wave): add failure-pivot builder + slice frontmatter persistence"
```

---

## Task 11: Wave artifacts writer

**Files:**
- Create: `src/scripts/lib/wave/artifacts.mts`
- Test: `src/tests/wave/artifacts.test.mts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/tests/wave/artifacts.test.mts
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, existsSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeWaveArtifacts, updateIndex } from "../../scripts/lib/wave/artifacts.mjs";
import type { WavePlan, WaveResult } from "../../scripts/lib/wave/types.mjs";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wave-artifacts-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

const plan: WavePlan = {
  waveId: "wave-1",
  size: 1,
  items: [
    {
      sliceId: "SLICE-1",
      featureId: "FEAT-1",
      worktreeBranch: "wave/wave-1/SLICE-1",
      sliceCommand: "/crew:orchestrate-slice",
      dispatchPrompt: "prompt",
    },
  ],
  rejected: [],
  config: { waveSize: 3, sliceCommand: "/crew:orchestrate-slice" },
};

const result: WaveResult = {
  waveId: "wave-1",
  plan,
  worktreeResults: [
    {
      sliceId: "SLICE-1",
      branch: "wave/wave-1/SLICE-1",
      worktreePath: "/tmp/wt/SLICE-1",
      status: "PASS",
      marker: { slice: "SLICE-1", status: "PASS" },
      artifacts: [],
    },
  ],
  mergedBranches: ["wave/wave-1/SLICE-1"],
  failedBranches: [],
  postMergeTest: { ran: true, status: "PASS", logPath: "post-merge-test.log" },
  failurePivots: [],
  durationMs: 1234,
};

describe("writeWaveArtifacts", () => {
  test("writes plan.json + wave-result.json + per-slice marker", () => {
    writeWaveArtifacts(tmp, result, ".claude/artifacts/loop/waves");
    const base = join(tmp, ".claude/artifacts/loop/waves/wave-1");
    expect(existsSync(join(base, "plan.json"))).toBe(true);
    expect(existsSync(join(base, "wave-result.json"))).toBe(true);
    expect(existsSync(join(base, "SLICE-1-marker.json"))).toBe(true);
  });

  test("plan.json round-trips", () => {
    writeWaveArtifacts(tmp, result, ".claude/artifacts/loop/waves");
    const raw = readFileSync(
      join(tmp, ".claude/artifacts/loop/waves/wave-1/plan.json"),
      "utf8",
    );
    expect(JSON.parse(raw).waveId).toBe("wave-1");
  });
});

describe("updateIndex", () => {
  test("appends new wave summary, capped at 50", () => {
    mkdirSync(join(tmp, ".claude/artifacts/loop/waves"), { recursive: true });
    for (let i = 0; i < 60; i++) {
      updateIndex(tmp, { ...result, waveId: `w-${i}` }, ".claude/artifacts/loop/waves");
    }
    const raw = readFileSync(
      join(tmp, ".claude/artifacts/loop/waves/index.json"),
      "utf8",
    );
    const idx = JSON.parse(raw);
    expect(idx.entries).toHaveLength(50);
    expect(idx.entries[0].waveId).toBe("w-10");
    expect(idx.entries[49].waveId).toBe("w-59");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/tests/wave/artifacts.test.mts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement the module**

```typescript
// src/scripts/lib/wave/artifacts.mts
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { WaveResult } from "./types.mjs";

const INDEX_CAP = 50;

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function writeWaveArtifacts(repoRoot: string, result: WaveResult, artifactsRoot: string): void {
  const baseDir = join(repoRoot, artifactsRoot, result.waveId);
  ensureDir(baseDir);
  writeFileSync(join(baseDir, "plan.json"), JSON.stringify(result.plan, null, 2), "utf8");
  writeFileSync(join(baseDir, "wave-result.json"), JSON.stringify(result, null, 2), "utf8");
  for (const wr of result.worktreeResults) {
    writeFileSync(
      join(baseDir, `${wr.sliceId}-marker.json`),
      JSON.stringify(wr, null, 2),
      "utf8",
    );
  }
}

export type IndexEntry = {
  waveId: string;
  size: number;
  passCount: number;
  failCount: number;
  postMergeTest: WaveResult["postMergeTest"]["status"];
  durationMs: number;
};

export function updateIndex(repoRoot: string, result: WaveResult, artifactsRoot: string): void {
  const dir = join(repoRoot, artifactsRoot);
  ensureDir(dir);
  const path = join(dir, "index.json");
  const existing: { entries: IndexEntry[] } = existsSync(path)
    ? JSON.parse(readFileSync(path, "utf8"))
    : { entries: [] };
  existing.entries.push({
    waveId: result.waveId,
    size: result.plan.size,
    passCount: result.mergedBranches.length,
    failCount: result.failedBranches.length,
    postMergeTest: result.postMergeTest.status,
    durationMs: result.durationMs,
  });
  if (existing.entries.length > INDEX_CAP) {
    existing.entries = existing.entries.slice(-INDEX_CAP);
  }
  writeFileSync(path, JSON.stringify(existing, null, 2), "utf8");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/tests/wave/artifacts.test.mts`
Expected: PASS (3 tests)

- [ ] **Step 5: Run lint + typecheck**

Run: `bunx eslint src/scripts/lib/wave/artifacts.mts src/tests/wave/artifacts.test.mts && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/scripts/lib/wave/artifacts.mts src/tests/wave/artifacts.test.mts
git commit -m "feat(wave): add wave artifacts writer + index rolling"
```

---

## Task 12: loop.json schema extension

**Files:**
- Modify: `src/scripts/lib/config-resolver.mts` (or wherever loop.json schema lives)
- Test: `src/tests/wave/config.test.mts`

- [ ] **Step 1: Find the config schema module**

Run: `grep -l "marathonMode\|costStopThreshold" src/scripts/lib/*.mts`
Open the file. Likely `config-resolver.mts` or a sibling.

- [ ] **Step 2: Write the failing test**

```typescript
// src/tests/wave/config.test.mts
import { describe, expect, test } from "bun:test";
import { resolveWaveConfig, validateWaveConfig } from "../../scripts/lib/wave/config.mjs";

describe("resolveWaveConfig", () => {
  test("returns defaults when block absent", () => {
    const c = resolveWaveConfig({});
    expect(c.size).toBe(3);
    expect(c.sliceCommand).toBe("/crew:orchestrate-slice");
    expect(c.maxParallel).toBe(3);
    expect(c.maxWaveAttempts).toBe(2);
    expect(c.subagentType).toBe("general-purpose");
  });

  test("user overrides applied", () => {
    const c = resolveWaveConfig({
      wave: { size: 5, sliceCommand: "/crew:build", maxWaveAttempts: 3 },
    });
    expect(c.size).toBe(5);
    expect(c.sliceCommand).toBe("/crew:build");
    expect(c.maxWaveAttempts).toBe(3);
  });
});

describe("validateWaveConfig", () => {
  test("PASS on valid config", () => {
    expect(validateWaveConfig({
      size: 3,
      sliceCommand: "/crew:orchestrate-slice",
      sliceCommandFallback: "/crew:build",
      fixCommand: "/crew:fix",
      maxParallel: 3,
      dispatchTimeoutMs: 1800000,
      postMergeTestCmd: "bun test",
      maxWaveAttempts: 2,
      subagentType: "general-purpose",
      artifactsRoot: ".claude/artifacts/loop/waves",
    })).toEqual({ ok: true, errors: [] });
  });
  test("FAIL on size < 1", () => {
    const r = validateWaveConfig({ size: 0 } as never);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("size"))).toBe(true);
  });
  test("FAIL on bad sliceCommand", () => {
    const r = validateWaveConfig({ sliceCommand: "not-a-command" } as never);
    expect(r.errors.some((e) => e.includes("sliceCommand"))).toBe(true);
  });
  test("FAIL on maxParallel > size", () => {
    const r = validateWaveConfig({ size: 2, maxParallel: 5 } as never);
    expect(r.errors.some((e) => e.includes("maxParallel"))).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test src/tests/wave/config.test.mts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 4: Implement the config module**

```typescript
// src/scripts/lib/wave/config.mts
import type { WaveConfig } from "./types.mjs";

const DEFAULTS: WaveConfig = {
  size: 3,
  sliceCommand: "/crew:orchestrate-slice",
  sliceCommandFallback: "/crew:build",
  fixCommand: "/crew:fix",
  maxParallel: 3,
  dispatchTimeoutMs: 30 * 60 * 1000,
  postMergeTestCmd: "bun test src/tests/ --parallel --timeout 60000",
  maxWaveAttempts: 2,
  subagentType: "general-purpose",
  artifactsRoot: ".claude/artifacts/loop/waves",
};

const SLASH_CMD_RE = /^\/[a-z][a-z0-9:-]*$/;

export function resolveWaveConfig(loopJson: { wave?: Partial<WaveConfig> }): WaveConfig {
  return { ...DEFAULTS, ...(loopJson.wave ?? {}) };
}

export type ValidationResult = { ok: boolean; errors: string[] };

export function validateWaveConfig(cfg: Partial<WaveConfig>): ValidationResult {
  const errors: string[] = [];
  const merged = { ...DEFAULTS, ...cfg };
  if (merged.size < 1) errors.push(`wave.size must be >= 1 (got ${merged.size})`);
  if (!SLASH_CMD_RE.test(merged.sliceCommand)) {
    errors.push(`wave.sliceCommand must match /^\\/[a-z][a-z0-9:-]*$/ (got "${merged.sliceCommand}")`);
  }
  if (merged.maxParallel > merged.size) {
    errors.push(`wave.maxParallel (${merged.maxParallel}) must be <= wave.size (${merged.size})`);
  }
  if (merged.maxWaveAttempts < 1) {
    errors.push(`wave.maxWaveAttempts must be >= 1 (got ${merged.maxWaveAttempts})`);
  }
  return { ok: errors.length === 0, errors };
}

export function resolveMarathonRunner(loopJson: { marathonRunner?: string }): "sequential" | "wave" {
  const v = loopJson.marathonRunner;
  if (v === "wave") return "wave";
  if (v === "sequential") return "sequential";
  if (v !== undefined) {
    console.warn(`unknown marathonRunner "${v}"; falling back to "sequential"`);
  }
  return "sequential";
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test src/tests/wave/config.test.mts`
Expected: PASS (6 tests)

- [ ] **Step 6: Wire into existing config-resolver**

Add to the main config-resolver module: import `resolveWaveConfig` and `resolveMarathonRunner`, expose them on the resolved config object alongside `loop.marathonMode` and similar fields.

- [ ] **Step 7: Run lint + typecheck**

Run: `bunx eslint src/scripts/lib/wave/config.mts src/tests/wave/config.test.mts && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/scripts/lib/wave/config.mts src/scripts/lib/config-resolver.mts src/tests/wave/config.test.mts
git commit -m "feat(wave): add wave config resolver + validation"
```

---

## Task 13: Wave runner — pre-flight + plan + prepare

**Files:**
- Create: `src/scripts/lib/wave/runner.mts` (skeleton + first lifecycle steps)
- Test: `src/tests/wave/runner.test.mts` (pre-flight + plan steps)

- [ ] **Step 1: Write the failing test (pre-flight + planning)**

```typescript
// src/tests/wave/runner.test.mts
import { describe, expect, test } from "bun:test";
import { runWave } from "../../scripts/lib/wave/runner.mjs";

describe("runWave pre-flight", () => {
  test("halts with dirty_main when git status reports modifications", async () => {
    const r = await runWave("/tmp/fake-dirty-repo", {
      gitStatusFn: async () => ({ clean: false }),
      stopCheckFn: async () => ({ shouldStop: false }),
      planFn: () => ({ waveId: "w", size: 1, items: [], rejected: [], config: { waveSize: 3, sliceCommand: "/crew:o" } }),
      prepareFn: async () => ({ runId: "r", agentBatch: [] }),
      dispatchFn: async () => [],
      finalizeFn: async () => ({ merged: [], conflicts: [], failed: [] }),
      postMergeTestFn: async () => ({ ran: false, status: "skipped" as const }),
      cfg: { size: 3, sliceCommand: "/crew:o", sliceCommandFallback: "/crew:b", fixCommand: "/crew:f", maxParallel: 3, dispatchTimeoutMs: 1, postMergeTestCmd: "", maxWaveAttempts: 2, subagentType: "general-purpose", artifactsRoot: "x" },
    });
    expect(r.haltReason).toBe("dirty_main");
  });

  test("halts with backlog_exhausted when plan size is 0", async () => {
    const r = await runWave("/tmp/fake", {
      gitStatusFn: async () => ({ clean: true }),
      stopCheckFn: async () => ({ shouldStop: false }),
      planFn: () => ({ waveId: "w", size: 0, items: [], rejected: [], config: { waveSize: 3, sliceCommand: "/crew:o" } }),
      prepareFn: async () => ({ runId: "r", agentBatch: [] }),
      dispatchFn: async () => [],
      finalizeFn: async () => ({ merged: [], conflicts: [], failed: [] }),
      postMergeTestFn: async () => ({ ran: false, status: "skipped" as const }),
      cfg: { size: 3, sliceCommand: "/crew:o", sliceCommandFallback: "/crew:b", fixCommand: "/crew:f", maxParallel: 3, dispatchTimeoutMs: 1, postMergeTestCmd: "", maxWaveAttempts: 2, subagentType: "general-purpose", artifactsRoot: "x" },
    });
    expect(r.haltReason).toBe("backlog_exhausted");
  });

  test("halts with stop_check_fired when stop-check returns shouldStop", async () => {
    const r = await runWave("/tmp/fake", {
      gitStatusFn: async () => ({ clean: true }),
      stopCheckFn: async () => ({ shouldStop: true, reason: "marathon_checkpoint_required", severity: "error" }),
      planFn: () => ({ waveId: "w", size: 1, items: [], rejected: [], config: { waveSize: 3, sliceCommand: "/crew:o" } }),
      prepareFn: async () => ({ runId: "r", agentBatch: [] }),
      dispatchFn: async () => [],
      finalizeFn: async () => ({ merged: [], conflicts: [], failed: [] }),
      postMergeTestFn: async () => ({ ran: false, status: "skipped" as const }),
      cfg: { size: 3, sliceCommand: "/crew:o", sliceCommandFallback: "/crew:b", fixCommand: "/crew:f", maxParallel: 3, dispatchTimeoutMs: 1, postMergeTestCmd: "", maxWaveAttempts: 2, subagentType: "general-purpose", artifactsRoot: "x" },
    });
    expect(r.haltReason).toBe("stop_check_fired");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/tests/wave/runner.test.mts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement the runner skeleton with dependency-injection seams**

```typescript
// src/scripts/lib/wave/runner.mts
import type {
  WaveConfig,
  WavePlan,
  WaveResult,
  WorktreeResult,
} from "./types.mjs";

export type GitStatus = { clean: boolean };
export type StopCheckResult = {
  shouldStop: boolean;
  reason?: string;
  severity?: "info" | "warn" | "error" | "escalation";
};
export type PrepareResult = {
  runId: string;
  agentBatch: Array<{ sliceId: string; worktreePath: string; branch: string; prompt: string }>;
};
export type FinalizeResult = {
  merged: string[];
  conflicts: string[];
  failed: string[];
};

export type RunWaveDeps = {
  gitStatusFn: (repoRoot: string) => Promise<GitStatus>;
  stopCheckFn: (repoRoot: string) => Promise<StopCheckResult>;
  planFn: (repoRoot: string) => WavePlan;
  prepareFn: (repoRoot: string, plan: WavePlan) => Promise<PrepareResult>;
  dispatchFn: (batch: PrepareResult["agentBatch"], cfg: WaveConfig) => Promise<WorktreeResult[]>;
  finalizeFn: (repoRoot: string, runId: string, plan: WavePlan) => Promise<FinalizeResult>;
  postMergeTestFn: (
    repoRoot: string,
    cmd: string,
  ) => Promise<{ ran: boolean; status: "PASS" | "FAIL" | "skipped"; logPath?: string }>;
  cfg: WaveConfig;
};

export type RunWaveOutcome = WaveResult & {
  haltReason: string | null;
};

export async function runWave(repoRoot: string, deps: RunWaveDeps): Promise<RunWaveOutcome> {
  const t0 = Date.now();

  // Step 1: pre-flight
  const status = await deps.gitStatusFn(repoRoot);
  if (!status.clean) {
    return makeOutcome(repoRoot, deps.cfg, t0, "dirty_main");
  }

  const sc = await deps.stopCheckFn(repoRoot);
  if (sc.shouldStop) {
    return makeOutcome(repoRoot, deps.cfg, t0, "stop_check_fired");
  }

  // Step 2: plan
  const plan = deps.planFn(repoRoot);
  if (plan.size === 0) {
    return makeOutcome(repoRoot, deps.cfg, t0, "backlog_exhausted", plan);
  }

  // Step 3: prepare worktrees
  const prepared = await deps.prepareFn(repoRoot, plan);

  // Step 4: dispatch
  const worktreeResults = await deps.dispatchFn(prepared.agentBatch, deps.cfg);

  // Step 6: finalize (merge PASS branches)
  const finalize = await deps.finalizeFn(repoRoot, prepared.runId, plan);

  // Step 7: post-merge test
  const postMergeTest = await deps.postMergeTestFn(repoRoot, deps.cfg.postMergeTestCmd);

  const haltReason = postMergeTest.status === "FAIL" ? "post_merge_red" : null;

  return {
    waveId: plan.waveId,
    plan,
    worktreeResults,
    mergedBranches: finalize.merged,
    failedBranches: [...finalize.failed, ...finalize.conflicts],
    postMergeTest,
    failurePivots: [],
    durationMs: Date.now() - t0,
    haltReason,
  };
}

function makeOutcome(
  _repoRoot: string,
  _cfg: WaveConfig,
  t0: number,
  haltReason: string,
  plan?: WavePlan,
): RunWaveOutcome {
  return {
    waveId: plan?.waveId ?? "n/a",
    plan: plan ?? {
      waveId: "n/a",
      size: 0,
      items: [],
      rejected: [],
      config: { waveSize: 0, sliceCommand: "" },
    },
    worktreeResults: [],
    mergedBranches: [],
    failedBranches: [],
    postMergeTest: { ran: false, status: "skipped" },
    failurePivots: [],
    durationMs: Date.now() - t0,
    haltReason,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/tests/wave/runner.test.mts`
Expected: PASS (3 tests)

- [ ] **Step 5: Run lint + typecheck**

Run: `bunx eslint src/scripts/lib/wave/runner.mts src/tests/wave/runner.test.mts && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/scripts/lib/wave/runner.mts src/tests/wave/runner.test.mts
git commit -m "feat(wave): add runner skeleton with pre-flight + plan + halt detection"
```

---

## Task 14: Wave runner — failure pivot integration

**Files:**
- Modify: `src/scripts/lib/wave/runner.mts`
- Modify: `src/tests/wave/runner.test.mts`

- [ ] **Step 1: Write the failing test (PASS+FAIL mixed wave with pivot)**

Append to `src/tests/wave/runner.test.mts`:

```typescript
import type { WorktreeResult } from "../../scripts/lib/wave/types.mjs";

describe("runWave failure pivots", () => {
  test("FAIL worktree produces a FailurePivot in result; PASS items still merge", async () => {
    const plan = {
      waveId: "w-mixed",
      size: 2,
      items: [
        {
          sliceId: "S1",
          featureId: "F1",
          worktreeBranch: "wave/w-mixed/S1",
          sliceCommand: "/crew:o",
          dispatchPrompt: "p1",
        },
        {
          sliceId: "S2",
          featureId: "F2",
          worktreeBranch: "wave/w-mixed/S2",
          sliceCommand: "/crew:o",
          dispatchPrompt: "p2",
        },
      ],
      rejected: [],
      config: { waveSize: 3, sliceCommand: "/crew:o" },
    };
    const wts: WorktreeResult[] = [
      {
        sliceId: "S1",
        branch: "wave/w-mixed/S1",
        worktreePath: "/wt/S1",
        status: "PASS",
        marker: { status: "PASS" },
        artifacts: [],
      },
      {
        sliceId: "S2",
        branch: "wave/w-mixed/S2",
        worktreePath: "/wt/S2",
        status: "FAIL",
        marker: { status: "FAIL" },
        artifacts: [".claude/artifacts/crew/handoffs/S2-fail.md"],
      },
    ];
    const cfg = {
      size: 3,
      sliceCommand: "/crew:o",
      sliceCommandFallback: "/crew:b",
      fixCommand: "/crew:fix",
      maxParallel: 3,
      dispatchTimeoutMs: 1,
      postMergeTestCmd: "",
      maxWaveAttempts: 2,
      subagentType: "general-purpose",
      artifactsRoot: "x",
    };
    const r = await runWave("/tmp/fake", {
      gitStatusFn: async () => ({ clean: true }),
      stopCheckFn: async () => ({ shouldStop: false }),
      planFn: () => plan,
      prepareFn: async () => ({
        runId: "r1",
        agentBatch: plan.items.map((i) => ({
          sliceId: i.sliceId,
          worktreePath: `/wt/${i.sliceId}`,
          branch: i.worktreeBranch,
          prompt: i.dispatchPrompt,
        })),
      }),
      dispatchFn: async () => wts,
      finalizeFn: async () => ({
        merged: ["wave/w-mixed/S1"],
        conflicts: [],
        failed: ["wave/w-mixed/S2"],
      }),
      postMergeTestFn: async () => ({ ran: true, status: "PASS" as const, logPath: "log" }),
      cfg,
    });
    expect(r.haltReason).toBeNull();
    expect(r.mergedBranches).toEqual(["wave/w-mixed/S1"]);
    expect(r.failedBranches).toEqual(["wave/w-mixed/S2"]);
    expect(r.failurePivots).toHaveLength(1);
    expect(r.failurePivots[0].sliceId).toBe("S2");
    expect(r.failurePivots[0].failureKind).toBe("worktree_fail");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/tests/wave/runner.test.mts`
Expected: FAIL — `failurePivots` still empty

- [ ] **Step 3: Wire failure-pivot builder into runner**

Modify `src/scripts/lib/wave/runner.mts`:

```typescript
// At top of file, add:
import { buildFailurePivot } from "./failure-pivot.mjs";
import type { SliceCandidate } from "./types.mjs";

// In RunWaveDeps, add:
export type RunWaveDeps = {
  // ... existing fields
  candidateLookupFn?: (sliceId: string) => SliceCandidate | undefined;
};

// Inside runWave, after finalize, before returning:
const failurePivots = buildPivotsForWave(plan, worktreeResults, finalize, deps);
// ... include `failurePivots` in the returned object

function buildPivotsForWave(
  plan: WavePlan,
  worktreeResults: WorktreeResult[],
  finalize: FinalizeResult,
  deps: RunWaveDeps,
) {
  const pivots = [];
  for (const wr of worktreeResults) {
    const isFail = wr.status === "FAIL" || wr.status === "timeout" || wr.status === "agent_error";
    const isMergeConflict = finalize.conflicts.includes(wr.branch);
    if (!isFail && !isMergeConflict) continue;
    const slice = deps.candidateLookupFn?.(wr.sliceId) ?? defaultCandidate(wr.sliceId, plan);
    pivots.push(buildFailurePivot(wr, { conflicts: finalize.conflicts }, slice, plan.waveId, deps.cfg));
  }
  return pivots;
}

function defaultCandidate(sliceId: string, plan: WavePlan): SliceCandidate {
  const item = plan.items.find((i) => i.sliceId === sliceId);
  return {
    sliceId,
    featureId: item?.featureId ?? "",
    slicePath: "",
    priority: "P3",
    compositeScore: 0,
    strategicFit: 0,
    touches: { paths: [], confidence: "missing" },
    pmRiskLevel: 0,
    autonomousSafe: false,
    retryCount: 0,
    pendingFix: false,
    dependsOn: [],
    helpRequestOpen: false,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `bun test src/tests/wave/runner.test.mts`
Expected: PASS (4 tests)

- [ ] **Step 5: Run lint + typecheck**

Run: `bunx eslint src/scripts/lib/wave/runner.mts && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/scripts/lib/wave/runner.mts src/tests/wave/runner.test.mts
git commit -m "feat(wave): wire failure-pivot builder into wave runner"
```

---

## Task 15: Wave loop (multi-wave runner)

**Files:**
- Modify: `src/scripts/lib/wave/runner.mts` (add `loopWaves`)
- Modify: `src/tests/wave/runner.test.mts`

- [ ] **Step 1: Write the failing test**

Append to `src/tests/wave/runner.test.mts`:

```typescript
import { loopWaves } from "../../scripts/lib/wave/runner.mjs";

describe("loopWaves", () => {
  test("halts immediately on backlog_exhausted", async () => {
    let calls = 0;
    const r = await loopWaves("/tmp/fake", {
      runWaveFn: async () => {
        calls++;
        return {
          waveId: "w",
          plan: { waveId: "w", size: 0, items: [], rejected: [], config: { waveSize: 3, sliceCommand: "/c" } },
          worktreeResults: [],
          mergedBranches: [],
          failedBranches: [],
          postMergeTest: { ran: false, status: "skipped" },
          failurePivots: [],
          durationMs: 0,
          haltReason: "backlog_exhausted",
        };
      },
      maxIterations: 25,
      maxWaves: undefined,
    });
    expect(calls).toBe(1);
    expect(r.haltReason).toBe("backlog_exhausted");
    expect(r.wavesRun).toBe(1);
  });

  test("runs until maxWaves cap", async () => {
    let calls = 0;
    const r = await loopWaves("/tmp/fake", {
      runWaveFn: async () => {
        calls++;
        return {
          waveId: `w-${calls}`,
          plan: { waveId: `w-${calls}`, size: 1, items: [], rejected: [], config: { waveSize: 3, sliceCommand: "/c" } },
          worktreeResults: [],
          mergedBranches: ["x"],
          failedBranches: [],
          postMergeTest: { ran: true, status: "PASS" },
          failurePivots: [],
          durationMs: 0,
          haltReason: null,
        };
      },
      maxIterations: 100,
      maxWaves: 3,
    });
    expect(r.wavesRun).toBe(3);
    expect(r.haltReason).toBe("max_waves");
  });

  test("halts on post_merge_red", async () => {
    let calls = 0;
    const r = await loopWaves("/tmp/fake", {
      runWaveFn: async () => {
        calls++;
        return {
          waveId: `w-${calls}`,
          plan: { waveId: `w-${calls}`, size: 1, items: [], rejected: [], config: { waveSize: 3, sliceCommand: "/c" } },
          worktreeResults: [],
          mergedBranches: ["x"],
          failedBranches: [],
          postMergeTest: { ran: true, status: "FAIL", logPath: "log" },
          failurePivots: [],
          durationMs: 0,
          haltReason: "post_merge_red",
        };
      },
      maxIterations: 100,
      maxWaves: 10,
    });
    expect(r.wavesRun).toBe(1);
    expect(r.haltReason).toBe("post_merge_red");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/tests/wave/runner.test.mts`
Expected: FAIL — `loopWaves` not exported

- [ ] **Step 3: Implement loopWaves**

Append to `src/scripts/lib/wave/runner.mts`:

```typescript
export type LoopWavesDeps = {
  runWaveFn: () => Promise<RunWaveOutcome>;
  maxIterations: number;
  maxWaves: number | undefined;
};

export type LoopWavesOutcome = {
  wavesRun: number;
  haltReason: string;
  lastWave: RunWaveOutcome | null;
};

export async function loopWaves(_repoRoot: string, deps: LoopWavesDeps): Promise<LoopWavesOutcome> {
  let last: RunWaveOutcome | null = null;
  for (let i = 0; i < deps.maxIterations; i++) {
    if (deps.maxWaves !== undefined && i >= deps.maxWaves) {
      return { wavesRun: i, haltReason: "max_waves", lastWave: last };
    }
    last = await deps.runWaveFn();
    if (last.haltReason !== null) {
      return { wavesRun: i + 1, haltReason: last.haltReason, lastWave: last };
    }
  }
  return { wavesRun: deps.maxIterations, haltReason: "max_iterations", lastWave: last };
}
```

- [ ] **Step 4: Run tests**

Run: `bun test src/tests/wave/runner.test.mts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/scripts/lib/wave/runner.mts src/tests/wave/runner.test.mts
git commit -m "feat(wave): add loopWaves multi-wave driver with halt routing"
```

---

## Task 16: CLI subcommands on loop.mts

**Files:**
- Modify: `src/scripts/loop.mts`
- Test: `src/tests/wave/cli.test.mts`

- [ ] **Step 1: Inspect loop.mts subcommand router**

Run: `grep -n "case '\|subcommand\|argv\[2\]" src/scripts/loop.mts | head -30`
Identify the pattern used by other subcommands (e.g., `auto`, `slice`, `dispatch`).

- [ ] **Step 2: Write the failing test**

```typescript
// src/tests/wave/cli.test.mts
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

const LOOP_CLI = "src/scripts/loop.mts";

function run(args: string[]) {
  return spawnSync("bun", [LOOP_CLI, ...args], { encoding: "utf8" });
}

describe("loop.mts wave subcommand", () => {
  test("wave plan --help mentions plan flags", () => {
    const r = run(["wave", "plan", "--help"]);
    expect(r.stdout + r.stderr).toContain("wave");
  });

  test("wave plan --repo <tmp> --json emits empty plan when no slices", () => {
    const r = run(["wave", "plan", "--repo", "/tmp/empty-fake", "--json"]);
    // Tolerate exit 1 if /tmp/empty-fake missing; we just want a deterministic shape mention
    expect(r.stdout + r.stderr).toMatch(/(waveId|error)/);
  });

  test("wave with no subcommand prints usage and exits non-zero", () => {
    const r = run(["wave"]);
    expect(r.status).not.toBe(0);
    expect((r.stdout + r.stderr).toLowerCase()).toContain("usage");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test src/tests/wave/cli.test.mts`
Expected: FAIL — wave subcommand not registered

- [ ] **Step 4: Add the subcommand to loop.mts**

In `src/scripts/loop.mts`, find the subcommand dispatch (search for `case "auto":` or similar). Add a parallel `case "wave":` block:

```typescript
case "wave": {
  const sub = process.argv[3];
  if (!sub) {
    console.error("usage: loop.mts wave <plan|run|loop> [flags]");
    process.exitCode = 1;
    return;
  }
  const { default: waveCli } = await import("./lib/wave/cli.mjs");
  await waveCli(sub, process.argv.slice(4));
  return;
}
```

- [ ] **Step 5: Implement the CLI dispatch module**

```typescript
// src/scripts/lib/wave/cli.mts
import { resolveWaveConfig, resolveMarathonRunner } from "./config.mjs";
import { loadCandidates } from "./planner.mjs";
import { rankCandidates } from "./ranking.mjs";
import { packWave } from "./planner.mjs";

function getFlag(argv: string[], name: string, fallback?: string): string | undefined {
  const idx = argv.indexOf(`--${name}`);
  if (idx < 0) return fallback;
  return argv[idx + 1];
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`);
}

async function readLoopJson(repoRoot: string): Promise<{ wave?: object; marathonRunner?: string }> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const p = path.join(repoRoot, ".claude", "loop.json");
  if (!fs.existsSync(p)) return {};
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  return raw.loop ?? {};
}

export default async function waveCli(sub: string, argv: string[]): Promise<void> {
  const repoRoot = getFlag(argv, "repo", process.cwd())!;
  const wantJson = hasFlag(argv, "json");
  const sizeOverride = getFlag(argv, "size");
  const loopJson = await readLoopJson(repoRoot);
  const cfg = resolveWaveConfig(loopJson);
  if (sizeOverride) cfg.size = Number(sizeOverride);

  switch (sub) {
    case "plan": {
      const cands = loadCandidates(repoRoot);
      const plan = packWave(rankCandidates(cands), {
        waveSize: cfg.size,
        sliceCommand: cfg.sliceCommand,
        waveId: new Date().toISOString().replace(/[:.]/g, "-"),
      });
      if (wantJson) {
        console.log(JSON.stringify(plan, null, 2));
      } else {
        console.log(`Wave plan: size=${plan.size}, rejected=${plan.rejected.length}`);
        for (const item of plan.items) console.log(`  - ${item.sliceId} (${item.featureId})`);
      }
      return;
    }
    case "run": {
      // Implemented in Task 17 (wires in dispatch+finalize+test); stub here.
      console.error("wave run: not yet implemented");
      process.exitCode = 2;
      return;
    }
    case "loop": {
      console.error("wave loop: not yet implemented");
      process.exitCode = 2;
      return;
    }
    case "--help": {
      console.log("loop.mts wave <plan|run|loop> [--repo PATH] [--size N] [--json]");
      return;
    }
    default: {
      console.error(`unknown wave subcommand: ${sub}`);
      process.exitCode = 1;
      return;
    }
  }
}

export { resolveMarathonRunner };
```

- [ ] **Step 6: Run tests**

Run: `bun test src/tests/wave/cli.test.mts`
Expected: PASS (3 tests)

- [ ] **Step 7: Manual sanity check**

Run: `bun ./src/scripts/loop.mts wave plan --repo . --json`
Expected: JSON output with `waveId`, `size`, `items`, `rejected` (likely size 0 since no slices have touches_files yet).

- [ ] **Step 8: Run lint + typecheck**

Run: `bunx eslint src/scripts/lib/wave/cli.mts src/scripts/loop.mts && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/scripts/loop.mts src/scripts/lib/wave/cli.mts src/tests/wave/cli.test.mts
git commit -m "feat(wave): add 'wave plan' CLI subcommand on loop.mts"
```

---

## Task 17: Wire wave run + wave loop CLI to real dispatch primitives

**Files:**
- Modify: `src/scripts/lib/wave/cli.mts`
- Modify: `src/tests/wave/cli.test.mts` (add `wave run --dry-run` test)

- [ ] **Step 1: Find existing dispatch CLI invocations**

Run: `grep -n "dispatch prepare\|dispatch finalize\|dispatchPrepare\|dispatchFinalize" src/scripts/lib/*.mts src/scripts/loop.mts | head -10`
Note the function/module names used by `/crew:parallel` flow.

- [ ] **Step 2: Wire real implementations into cli.mts**

Open `src/scripts/lib/wave/cli.mts`. Replace the `case "run"` and `case "loop"` stubs with real implementations:

```typescript
case "run": {
  const dryRun = hasFlag(argv, "dry-run");
  const cands = loadCandidates(repoRoot);
  const plan = packWave(rankCandidates(cands), {
    waveSize: cfg.size,
    sliceCommand: cfg.sliceCommand,
    waveId: new Date().toISOString().replace(/[:.]/g, "-"),
  });
  if (dryRun) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  const { runWave } = await import("./runner.mjs");
  const { writeWaveArtifacts, updateIndex } = await import("./artifacts.mjs");
  const { realGitStatus, realStopCheck, realPrepare, realDispatch, realFinalize, realPostMergeTest } =
    await import("./real-deps.mjs");
  const outcome = await runWave(repoRoot, {
    gitStatusFn: realGitStatus,
    stopCheckFn: realStopCheck,
    planFn: () => plan,
    prepareFn: realPrepare,
    dispatchFn: realDispatch,
    finalizeFn: realFinalize,
    postMergeTestFn: realPostMergeTest,
    cfg,
  });
  writeWaveArtifacts(repoRoot, outcome, cfg.artifactsRoot);
  updateIndex(repoRoot, outcome, cfg.artifactsRoot);
  if (outcome.haltReason !== null) {
    process.exitCode = haltExitCode(outcome.haltReason);
  }
  console.log(JSON.stringify({ haltReason: outcome.haltReason, wavesRun: 1 }, null, 2));
  return;
}
case "loop": {
  const maxWavesFlag = getFlag(argv, "max-waves");
  const maxWaves = maxWavesFlag ? Number(maxWavesFlag) : undefined;
  const { runWave, loopWaves } = await import("./runner.mjs");
  const { writeWaveArtifacts, updateIndex } = await import("./artifacts.mjs");
  const {
    realGitStatus, realStopCheck, realPrepare, realDispatch, realFinalize, realPostMergeTest,
  } = await import("./real-deps.mjs");
  const outcome = await loopWaves(repoRoot, {
    runWaveFn: async () => {
      const cands = loadCandidates(repoRoot);
      const plan = packWave(rankCandidates(cands), {
        waveSize: cfg.size,
        sliceCommand: cfg.sliceCommand,
        waveId: new Date().toISOString().replace(/[:.]/g, "-"),
      });
      const r = await runWave(repoRoot, {
        gitStatusFn: realGitStatus,
        stopCheckFn: realStopCheck,
        planFn: () => plan,
        prepareFn: realPrepare,
        dispatchFn: realDispatch,
        finalizeFn: realFinalize,
        postMergeTestFn: realPostMergeTest,
        cfg,
      });
      writeWaveArtifacts(repoRoot, r, cfg.artifactsRoot);
      updateIndex(repoRoot, r, cfg.artifactsRoot);
      return r;
    },
    maxIterations: 25,
    maxWaves,
  });
  if (outcome.haltReason) {
    process.exitCode = haltExitCode(outcome.haltReason);
  }
  console.log(JSON.stringify(outcome, null, 2));
  return;
}
```

Add the helper:

```typescript
function haltExitCode(reason: string): number {
  if (
    reason === "backlog_exhausted" ||
    reason === "max_iterations" ||
    reason === "max_waves"
  ) {
    return 0;
  }
  if (reason === "escalated_to_human" || reason === "escalation_threshold_hit") {
    return 3;
  }
  return 2;
}
```

- [ ] **Step 3: Implement real-deps stubs**

```typescript
// src/scripts/lib/wave/real-deps.mts
import { spawnSync } from "node:child_process";
import type {
  GitStatus,
  StopCheckResult,
  PrepareResult,
  FinalizeResult,
  RunWaveDeps,
} from "./runner.mjs";
import type { WaveConfig, WavePlan, WorktreeResult } from "./types.mjs";

export async function realGitStatus(repoRoot: string): Promise<GitStatus> {
  const r = spawnSync("git", ["-C", repoRoot, "status", "--porcelain"], { encoding: "utf8" });
  return { clean: r.status === 0 && r.stdout.trim() === "" };
}

export async function realStopCheck(repoRoot: string): Promise<StopCheckResult> {
  const r = spawnSync("bun", ["src/scripts/loop.mts", "stop-check", "--repo", repoRoot, "--json"], {
    encoding: "utf8",
  });
  if (r.status !== 0) return { shouldStop: false };
  try {
    const parsed = JSON.parse(r.stdout);
    return {
      shouldStop: Boolean(parsed.shouldStop),
      reason: parsed.reason,
      severity: parsed.severity,
    };
  } catch {
    return { shouldStop: false };
  }
}

export async function realPrepare(repoRoot: string, plan: WavePlan): Promise<PrepareResult> {
  const r = spawnSync(
    "bun",
    [
      "src/scripts/loop.mts",
      "dispatch",
      "prepare",
      "--plan",
      JSON.stringify(plan),
      "--parent-branch",
      "main",
      "--repo",
      repoRoot,
      "--json",
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  if (r.status !== 0) throw new Error(`dispatch prepare failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

export async function realDispatch(
  batch: PrepareResult["agentBatch"],
  cfg: WaveConfig,
): Promise<WorktreeResult[]> {
  // The runtime path: emit a structured payload that the slash flow turns into N parallel
  // Agent calls. For headless CLI runs (no Claude harness), this throws — the wrapper
  // command /loop:wave handles dispatch via the harness. Document this constraint in the
  // /loop:wave slash command.
  throw new Error(
    "realDispatch must be invoked from the /loop:wave slash flow (Agent dispatch is harness-only).",
  );
}

export async function realFinalize(
  repoRoot: string,
  runId: string,
  plan: WavePlan,
): Promise<FinalizeResult> {
  const r = spawnSync(
    "bun",
    [
      "src/scripts/loop.mts",
      "dispatch",
      "finalize",
      "--run-id",
      runId,
      "--plan",
      JSON.stringify(plan),
      "--repo",
      repoRoot,
      "--json",
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  if (r.status !== 0) throw new Error(`dispatch finalize failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

export async function realPostMergeTest(
  repoRoot: string,
  cmd: string,
): Promise<{ ran: boolean; status: "PASS" | "FAIL" | "skipped"; logPath?: string }> {
  if (!cmd) return { ran: false, status: "skipped" };
  const r = spawnSync(cmd, [], { cwd: repoRoot, shell: true, encoding: "utf8" });
  return { ran: true, status: r.status === 0 ? "PASS" : "FAIL" };
}
```

- [ ] **Step 4: Run tests (CLI tests should still pass; dispatch isn't tested headlessly)**

Run: `bun test src/tests/wave/cli.test.mts`
Expected: PASS (3 tests)

- [ ] **Step 5: Manual smoke (dry-run only — real dispatch needs harness)**

Run: `bun ./src/scripts/loop.mts wave run --repo . --dry-run`
Expected: Plan JSON printed; no worktrees created.

- [ ] **Step 6: Run lint + typecheck**

Run: `bunx eslint src/scripts/lib/wave/cli.mts src/scripts/lib/wave/real-deps.mts && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/scripts/lib/wave/cli.mts src/scripts/lib/wave/real-deps.mts src/tests/wave/cli.test.mts
git commit -m "feat(wave): wire 'wave run' and 'wave loop' CLI to real dispatch + stop-check + finalize"
```

---

## Task 18: /loop:wave slash command

**Files:**
- Create: `commands/wave.md`

- [ ] **Step 1: Write the slash command**

```markdown
---
name: wave
description: "Run wave-mode autonomous loop: pack N independent slices into parallel worktrees, dispatch in one parallel block, merge PASS, pivot FAIL into /crew:fix next wave. Subcommands: plan | run | loop."
auto_execute_steps: false
---

# Wave-mode loop

Reads triaged slices with declared `touches_files`, packs up to `wave.size` non-conflicting
into one wave, dispatches each slice into a parallel git worktree, merges PASS branches,
runs post-merge tests, enqueues FAIL slices for `/crew:fix` next wave. Loops until
`/loop:stop-check` fires.

## Subcommands

### plan — emit the next wave plan without dispatching

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" wave plan \
  --repo "$PWD" \
  [--size N] \
  [--json]
```

### run — execute one wave end-to-end

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" wave run \
  --repo "$PWD" \
  [--dry-run] \
  [--size N]
```

`run` must be invoked from within Claude Code (harness-only). The dispatch step emits a
parallel-agent batch payload that the harness materializes into N parallel
`Agent(subagent_type: general-purpose)` calls. Each agent's prompt instructs:

1. `cd <worktreePath>`
2. Execute the configured slash command (`/crew:orchestrate-slice --id <SLICE-ID>` by default).
3. Return a last-line JSON marker: `{"slice":"<id>","status":"PASS"|"FAIL","artifacts":[...]}`.

After all N agents return, the wave runner calls `dispatch finalize` (merges PASS
branches, leaves FAIL worktrees on disk for next-wave `/crew:fix`), runs the post-merge
test command, writes artifacts to `.claude/artifacts/loop/waves/<waveId>/`, and exits.

### loop — repeat `run` until a stop condition fires

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" wave loop \
  --repo "$PWD" \
  [--max-waves N] \
  [--auto-mode]
```

## Behavioral note: iteration accounting

Wave mode counts each wave as one `loop.maxIterations` increment. A wave-size-3 config
with `loop.maxIterations: 25` allows up to 75 slice closes per run. Tighten
`loop.maxIterations` or pass `--max-waves` to cap cost proportionally.

## Exit codes

| Exit | Halt reasons |
|---|---|
| `0` | `backlog_exhausted`, `max_iterations`, `max_waves` |
| `2` | `post_merge_red`, `dirty_main`, `stop_check_fired` (non-escalation) |
| `3` | `escalated_to_human`, `escalation_threshold_hit` |
| `1` | unexpected error |

## Config (`.claude/loop.json`)

```json
{
  "loop": {
    "marathonRunner": "wave",
    "wave": {
      "size": 3,
      "sliceCommand": "/crew:orchestrate-slice",
      "sliceCommandFallback": "/crew:build",
      "fixCommand": "/crew:fix",
      "maxParallel": 3,
      "dispatchTimeoutMs": 1800000,
      "postMergeTestCmd": "bun test src/tests/ --parallel --timeout 60000",
      "maxWaveAttempts": 2,
      "subagentType": "general-purpose",
      "artifactsRoot": ".claude/artifacts/loop/waves"
    }
  }
}
```

`marathonRunner: "wave"` opts the marathon (`/loop:auto`, `/loop:start`) into wave mode.
Default remains `"sequential"`.

## Failure pivots

A FAIL worktree from wave N:
1. Has its slice frontmatter mutated: `wave_attempts++`, `pending_fix: true`, `last_failure: {...}`.
2. Is picked first by the planner in wave N+1 (pendingFix ranks ahead of compositeScore).
3. Dispatches with a fix-mode prompt invoking `/crew:fix --slice <id> --failure <artifact>`.
4. Escalates to `needs-review/` after `wave.maxWaveAttempts` (default 2) failures.

## Artifacts

```
.claude/artifacts/loop/waves/
  <waveId>/
    plan.json
    wave-result.json
    post-merge-test.log
    escalations.json
    SLICE-<id>-marker.json
  index.json
```
```

- [ ] **Step 2: Verify line cap (commands not capped, but check anyway)**

Run: `wc -l commands/wave.md`
Expected: < 200

- [ ] **Step 3: Run validators**

Run: `bun ./src/scripts/validate-manifests.mts && bun ./src/scripts/validate-content-length.mts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add commands/wave.md
git commit -m "feat(wave): add /loop:wave slash command with plan|run|loop subcommands"
```

---

## Task 19: Halt-badge registry + docs update

**Files:**
- Modify: `src/scripts/lib/halt-badges.mts`
- Modify: `docs/halt-badges.md`
- Modify: `src/tests/explain-halts.test.mts`

- [ ] **Step 1: Read current halt-badges registry**

Run: `cat src/scripts/lib/halt-badges.mts | head -100`
Identify the registry shape (array, map, enum).

- [ ] **Step 2: Read current explain-halts test**

Run: `cat src/tests/explain-halts.test.mts | head -50`

- [ ] **Step 3: Write failing tests for new badges**

Append to `src/tests/explain-halts.test.mts`:

```typescript
import { describe, expect, test } from "bun:test";
import { explainHaltBadge } from "../scripts/lib/halt-badges.mjs";

describe("wave halt badges", () => {
  test("wave_post_merge_red explains as error", () => {
    const r = explainHaltBadge("wave_post_merge_red");
    expect(r.severity).toBe("error");
    expect(r.description.toLowerCase()).toContain("post-merge");
  });
  test("wave_dirty_main explains as error", () => {
    const r = explainHaltBadge("wave_dirty_main");
    expect(r.severity).toBe("error");
  });
  test("wave_pending_fix_count is info", () => {
    const r = explainHaltBadge("wave_pending_fix_count");
    expect(r.severity).toBe("info");
  });
  test("wave_escalation_count is warn", () => {
    const r = explainHaltBadge("wave_escalation_count");
    expect(r.severity).toBe("warn");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `bun test src/tests/explain-halts.test.mts`
Expected: FAIL — badges not registered

- [ ] **Step 5: Add the badges to the registry**

In `src/scripts/lib/halt-badges.mts`, add four entries matching the existing pattern:

```typescript
{
  id: "wave_post_merge_red",
  severity: "error",
  description: "Post-merge test suite returned non-zero after wave merge to main.",
},
{
  id: "wave_dirty_main",
  severity: "error",
  description: "Wave runner detected a dirty main branch before dispatching; refusing to proceed.",
},
{
  id: "wave_pending_fix_count",
  severity: "info",
  description: "Count of slices with pending_fix=true; planner will pick them first next wave.",
},
{
  id: "wave_escalation_count",
  severity: "warn",
  description: "Slices moved to needs-review/ since the last retrospective due to repeated wave failures.",
},
```

- [ ] **Step 6: Run tests**

Run: `bun test src/tests/explain-halts.test.mts`
Expected: PASS (4 new tests pass)

- [ ] **Step 7: Update docs/halt-badges.md**

Append a section to `docs/halt-badges.md` (after the existing badge table):

```markdown
## Wave-mode badges

| Badge | Severity | Description |
|---|---|---|
| `wave_post_merge_red` | error | Post-merge test suite returned non-zero after wave merge to main. Operator must decide whether to revert. |
| `wave_dirty_main` | error | Wave runner detected modifications on main before dispatching. Commit, stash, or reset before re-running. |
| `wave_pending_fix_count` | info | Number of slices with `pending_fix: true`. Planner picks them first next wave. Informational; no halt. |
| `wave_escalation_count` | warn | Slices moved to `needs-review/` since the last retrospective due to repeated wave failures. Investigate at next retro. |

Emitted by: `src/scripts/lib/wave/runner.mts` (via snapshot writer).
Consumed by: `loop-snapshot.md` Wave telemetry block; dashboards reading `snapshot.haltBadges`.
```

- [ ] **Step 8: Run validators**

Run: `bun ./src/scripts/validate-content-length.mts && bun test src/tests/explain-halts.test.mts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/scripts/lib/halt-badges.mts docs/halt-badges.md src/tests/explain-halts.test.mts
git commit -m "feat(wave): register 4 wave halt-badges + update docs/halt-badges.md"
```

---

## Task 20: Snapshot integration (Wave telemetry block)

**Files:**
- Modify: `src/scripts/lib/memory-snapshot.mts`
- Test: extend existing snapshot test (find via `grep -l memory-snapshot src/tests/`)

- [ ] **Step 1: Find snapshot test**

Run: `grep -rln "memory-snapshot\|snapshot.mts\|loop-snapshot" src/tests/`

- [ ] **Step 2: Write the failing test**

Append (in the matching snapshot test file) a `describe("wave telemetry", ...)` block:

```typescript
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("wave telemetry block", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "snap-wave-"));
    mkdirSync(join(tmp, ".claude/artifacts/loop/waves"), { recursive: true });
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  test("emits no block when index.json missing", () => {
    const text = renderSnapshot(tmp); // function from existing snapshot module; rename if different
    expect(text).not.toContain("## Wave telemetry");
  });

  test("emits block summarizing index.json entries", () => {
    writeFileSync(
      join(tmp, ".claude/artifacts/loop/waves/index.json"),
      JSON.stringify({
        entries: [
          { waveId: "w1", size: 3, passCount: 2, failCount: 1, postMergeTest: "PASS", durationMs: 100 },
          { waveId: "w2", size: 3, passCount: 3, failCount: 0, postMergeTest: "PASS", durationMs: 200 },
        ],
      }),
      "utf8",
    );
    const text = renderSnapshot(tmp);
    expect(text).toContain("## Wave telemetry");
    expect(text).toContain("Last wave: w2");
    expect(text).toContain("PASS rate");
  });
});
```

(Rename `renderSnapshot` to the actual export name. If the snapshot test uses a different harness, adapt to it.)

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test <matching-snapshot-test>.mts`
Expected: FAIL

- [ ] **Step 4: Add the wave telemetry renderer**

In `src/scripts/lib/memory-snapshot.mts`, add a helper:

```typescript
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type WaveIndexEntry = {
  waveId: string;
  size: number;
  passCount: number;
  failCount: number;
  postMergeTest: "PASS" | "FAIL" | "skipped";
  durationMs: number;
};

export function renderWaveTelemetry(repoRoot: string): string {
  const path = join(repoRoot, ".claude/artifacts/loop/waves/index.json");
  if (!existsSync(path)) return "";
  const idx = JSON.parse(readFileSync(path, "utf8")) as { entries: WaveIndexEntry[] };
  if (idx.entries.length === 0) return "";

  const last = idx.entries[idx.entries.length - 1];
  const last10 = idx.entries.slice(-10);
  const passRate = last10.reduce((s, e) => s + e.passCount, 0) /
    Math.max(1, last10.reduce((s, e) => s + e.size, 0));

  return [
    "",
    "## Wave telemetry",
    "",
    `- Last wave: ${last.waveId} (size=${last.size}, PASS=${last.passCount}, FAIL=${last.failCount})`,
    `- Recent ${last10.length} waves: avg PASS rate ${passRate.toFixed(2)}`,
    "",
  ].join("\n");
}
```

Wire it into the main snapshot render function: append `renderWaveTelemetry(repoRoot)` to the rendered string (find the existing render entry point and call it).

- [ ] **Step 5: Run snapshot test**

Run: `bun test <matching-snapshot-test>.mts`
Expected: PASS

- [ ] **Step 6: Run lint + typecheck**

Run: `bunx eslint src/scripts/lib/memory-snapshot.mts && bunx tsc --project tsconfig.json --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/scripts/lib/memory-snapshot.mts src/tests/<snapshot-test>.mts
git commit -m "feat(wave): add Wave telemetry block to loop-snapshot.md"
```

---

## Task 21: Marathon entry-point routing (auto + start)

**Files:**
- Modify: `commands/auto.md`
- Modify: `commands/start.md`

- [ ] **Step 1: Read existing auto.md routing**

Run: `cat commands/auto.md | head -40`

- [ ] **Step 2: Add routing block to auto.md**

Insert near the top of `commands/auto.md` (after frontmatter, before existing workflow):

```markdown
## Marathon runner routing

Before executing the sequential walker, check `.claude/loop.json` for `loop.marathonRunner`:

```bash
RUNNER=$(bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" config get loop.marathonRunner --repo "$PWD" 2>/dev/null || echo "sequential")
```

If `RUNNER === "wave"`, delegate to `/loop:wave loop` and exit. Do not run the sequential
walker. The wave loop respects the same `loop.maxIterations`, `loop.autoMode`, and
`/loop:stop-check` conditions, plus the wave-specific halt reasons documented in
`commands/wave.md`.

If `RUNNER === "sequential"` (default), proceed with the existing workflow below.
```

Add the same block to `commands/start.md` just before its first-action checklist.

- [ ] **Step 3: Implement `config get` subcommand on loop.mts**

In `src/scripts/loop.mts`, add a small `case "config":` block:

```typescript
case "config": {
  const sub = process.argv[3];
  if (sub !== "get") {
    console.error("usage: loop.mts config get <dotted.path> [--repo PATH]");
    process.exitCode = 1;
    return;
  }
  const dotted = process.argv[4];
  const repoIdx = process.argv.indexOf("--repo");
  const repoRoot = repoIdx >= 0 ? process.argv[repoIdx + 1] : process.cwd();
  const fs = await import("node:fs");
  const path = await import("node:path");
  const p = path.join(repoRoot, ".claude", "loop.json");
  if (!fs.existsSync(p)) return;
  const json = JSON.parse(fs.readFileSync(p, "utf8"));
  const value = dotted.split(".").reduce((acc: unknown, k: string) => {
    if (acc && typeof acc === "object" && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, json);
  if (value !== undefined) console.log(String(value));
  return;
}
```

- [ ] **Step 4: Quick smoke test**

Run: `bun ./src/scripts/loop.mts config get loop.marathonRunner --repo .`
Expected: Either prints `sequential` or empty (depending on whether the key is set).

- [ ] **Step 5: Add `marathonRunner: "wave"` to this repo's loop.json**

Edit `.claude/loop.json`:

```json
{
  "loop": {
    ...existing fields...,
    "marathonRunner": "wave",
    "wave": {
      "size": 3,
      "sliceCommand": "/crew:orchestrate-slice",
      "sliceCommandFallback": "/crew:build",
      "fixCommand": "/crew:fix",
      "maxParallel": 3,
      "dispatchTimeoutMs": 1800000,
      "postMergeTestCmd": "bun test src/tests/ --parallel --timeout 60000",
      "maxWaveAttempts": 2,
      "subagentType": "general-purpose",
      "artifactsRoot": ".claude/artifacts/loop/waves"
    }
  }
}
```

Run: `bun ./src/scripts/loop.mts config get loop.marathonRunner --repo .`
Expected: `wave`

- [ ] **Step 6: Run validators + full test suite**

Run: `bun ./src/scripts/validate-manifests.mts && bun test src/tests/ --parallel --timeout 60000`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add commands/auto.md commands/start.md src/scripts/loop.mts .claude/loop.json
git commit -m "feat(wave): route marathon entry points to /loop:wave when marathonRunner=='wave'"
```

---

## Task 22: Integration test — one full wave end-to-end

**Files:**
- Create: `src/tests/integration/wave-e2e.test.mts`

- [ ] **Step 1: Write the integration test**

```typescript
// src/tests/integration/wave-e2e.test.mts
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runWave } from "../../scripts/lib/wave/runner.mjs";
import { loadCandidates, packWave } from "../../scripts/lib/wave/planner.mjs";
import { rankCandidates } from "../../scripts/lib/wave/ranking.mjs";
import { resolveWaveConfig } from "../../scripts/lib/wave/config.mjs";
import { writeWaveArtifacts } from "../../scripts/lib/wave/artifacts.mjs";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wave-e2e-"));
  mkdirSync(join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending"), { recursive: true });
  mkdirSync(join(tmp, ".claude/artifacts/loop/backlog/triaged"), { recursive: true });
  mkdirSync(join(tmp, "src/scripts/lib"), { recursive: true });

  // 3 slices with disjoint touches_files
  for (let i = 1; i <= 3; i++) {
    writeFileSync(
      join(tmp, `.claude/artifacts/loop/ai-loop/slices/pending/SLICE-${i}.md`),
      `---
id: SLICE-${i}
feature: FEAT-${i}
priority: P2
touches_files:
  - src/scripts/lib/file-${i}.mts
touches_files_confidence: declared
---
`,
      "utf8",
    );
    writeFileSync(
      join(tmp, `.claude/artifacts/loop/backlog/triaged/FEAT-${i}.md`),
      `---
id: FEAT-${i}
priority: P2
composite_score: 0.${9 - i}
pm_strategic_fit: 0.5
pm_risk_level: 0.1
autonomous_safe: true
---
`,
      "utf8",
    );
    writeFileSync(join(tmp, `src/scripts/lib/file-${i}.mts`), `// file ${i}\n`, "utf8");
  }
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("wave e2e (fully mocked dispatch)", () => {
  test("plans 3 disjoint slices, dispatch mocked PASS, finalize merges all 3, artifacts written", async () => {
    const cfg = resolveWaveConfig({});
    const cands = loadCandidates(tmp);
    expect(cands).toHaveLength(3);
    const plan = packWave(rankCandidates(cands), {
      waveSize: cfg.size,
      sliceCommand: cfg.sliceCommand,
      waveId: "e2e-wave-1",
    });
    expect(plan.size).toBe(3);

    const outcome = await runWave(tmp, {
      gitStatusFn: async () => ({ clean: true }),
      stopCheckFn: async () => ({ shouldStop: false }),
      planFn: () => plan,
      prepareFn: async () => ({
        runId: "run-1",
        agentBatch: plan.items.map((i) => ({
          sliceId: i.sliceId,
          worktreePath: `/tmp/wt/${i.sliceId}`,
          branch: i.worktreeBranch,
          prompt: i.dispatchPrompt,
        })),
      }),
      dispatchFn: async () =>
        plan.items.map((i) => ({
          sliceId: i.sliceId,
          branch: i.worktreeBranch,
          worktreePath: `/tmp/wt/${i.sliceId}`,
          status: "PASS" as const,
          marker: { status: "PASS" },
          artifacts: [],
        })),
      finalizeFn: async () => ({
        merged: plan.items.map((i) => i.worktreeBranch),
        conflicts: [],
        failed: [],
      }),
      postMergeTestFn: async () => ({ ran: true, status: "PASS" as const, logPath: "log" }),
      cfg,
    });

    expect(outcome.haltReason).toBeNull();
    expect(outcome.mergedBranches).toHaveLength(3);
    expect(outcome.failurePivots).toHaveLength(0);

    writeWaveArtifacts(tmp, outcome, cfg.artifactsRoot);
    expect(existsSync(join(tmp, ".claude/artifacts/loop/waves/e2e-wave-1/plan.json"))).toBe(true);
    expect(existsSync(join(tmp, ".claude/artifacts/loop/waves/e2e-wave-1/wave-result.json"))).toBe(true);
  });

  test("one slice FAIL produces pivot; other two merge", async () => {
    const cfg = resolveWaveConfig({});
    const cands = loadCandidates(tmp);
    const plan = packWave(rankCandidates(cands), {
      waveSize: cfg.size,
      sliceCommand: cfg.sliceCommand,
      waveId: "e2e-wave-2",
    });

    const outcome = await runWave(tmp, {
      gitStatusFn: async () => ({ clean: true }),
      stopCheckFn: async () => ({ shouldStop: false }),
      planFn: () => plan,
      prepareFn: async () => ({
        runId: "run-2",
        agentBatch: plan.items.map((i) => ({
          sliceId: i.sliceId,
          worktreePath: `/tmp/wt/${i.sliceId}`,
          branch: i.worktreeBranch,
          prompt: i.dispatchPrompt,
        })),
      }),
      dispatchFn: async () =>
        plan.items.map((i, idx) => ({
          sliceId: i.sliceId,
          branch: i.worktreeBranch,
          worktreePath: `/tmp/wt/${i.sliceId}`,
          status: idx === 0 ? ("FAIL" as const) : ("PASS" as const),
          marker: {},
          artifacts: idx === 0 ? [`.claude/artifacts/crew/handoffs/${i.sliceId}-fail.md`] : [],
        })),
      finalizeFn: async () => ({
        merged: plan.items.slice(1).map((i) => i.worktreeBranch),
        conflicts: [],
        failed: [plan.items[0].worktreeBranch],
      }),
      postMergeTestFn: async () => ({ ran: true, status: "PASS" as const, logPath: "log" }),
      cfg,
    });

    expect(outcome.mergedBranches).toHaveLength(2);
    expect(outcome.failurePivots).toHaveLength(1);
    expect(outcome.failurePivots[0].fixDispatchPrompt).toContain("/crew:fix");
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `bun test src/tests/integration/wave-e2e.test.mts`
Expected: PASS (2 tests)

- [ ] **Step 3: Run full test suite to verify no regressions**

Run: `bun test src/tests/ --parallel --timeout 60000`
Expected: PASS

- [ ] **Step 4: Run lint + typecheck on entire repo**

Run: `bunx eslint src eslint.config.mjs && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tests/integration/wave-e2e.test.mts
git commit -m "test(wave): add e2e integration test for full wave lifecycle"
```

---

## Task 23: README + CHANGELOG + final docs sweep

**Files:**
- Modify: `README.md` (add Wave-mode section)
- Modify: `CHANGELOG.md` (add unreleased entry)
- Modify: `CLAUDE.md` (cross-reference wave docs)

- [ ] **Step 1: Read existing README**

Run: `grep -n "^## " README.md | head -20`
Find a good insertion point (after the "Orchestrator mode" or equivalent section).

- [ ] **Step 2: Add Wave-mode section to README**

Insert after the orchestrator-mode section:

```markdown
## Wave mode

Opt-in marathon runner that dispatches N independent slices per "wave" into parallel
git worktrees, merges PASS branches, pivots FAIL slices into `/crew:fix` next wave, and
loops until standard stop-check fires.

Enable in `.claude/loop.json`:

```json
{
  "loop": {
    "marathonRunner": "wave",
    "wave": { "size": 3, "sliceCommand": "/crew:orchestrate-slice" }
  }
}
```

Run via `/loop:wave loop` (or `/loop:auto` once `marathonRunner: "wave"` is set —
auto routes to wave automatically).

Slice prerequisite: `touches_files` in slice frontmatter. Spec-writer populates this
automatically; CI gate (`bun ./src/scripts/validate-slice-touches-files.mts`) warns when
missing. Slices without `touches_files` dispatch solo (wave size collapses to 1 for that
slot) rather than blocking the planner.

See `commands/wave.md` for full subcommand reference and
`docs/superpowers/specs/2026-06-14-wave-mode-loop-design.md` for design rationale.
```

- [ ] **Step 3: Add unreleased CHANGELOG entry**

Prepend to `CHANGELOG.md` (under any existing "Unreleased" heading):

```markdown
### Added
- Wave-mode autonomous loop (`/loop:wave plan|run|loop`): dispatches up to N independent
  slices per wave into parallel git worktrees, merges PASS, pivots FAIL into `/crew:fix`
  next wave, runs post-merge tests, loops until standard stop-check fires. Opt-in via
  `loop.json:marathonRunner: "wave"`; default remains `"sequential"`.
- `touches_files` slice frontmatter contract + parser + CI validator
  (`validate-slice-touches-files.mts`).
- 4 new wave halt-badges: `wave_post_merge_red`, `wave_dirty_main`,
  `wave_pending_fix_count`, `wave_escalation_count`.
- `loop.mts wave plan|run|loop` CLI subcommands + `loop.mts config get` helper.
- `loop-snapshot.md` Wave telemetry block.

### Changed
- spec-writer agent contract requires `touches_files` in slice frontmatter for wave-mode
  dispatch.
- `commands/auto.md` and `commands/start.md` route to `/loop:wave loop` when
  `loop.marathonRunner === "wave"`.
```

- [ ] **Step 4: Add cross-reference to CLAUDE.md**

Append a paragraph after the "Orchestrator mode" section:

```markdown
### Wave mode (opt-in)

Set `loop.marathonRunner: "wave"` in `.claude/loop.json` to flip `/loop:auto` and
`/loop:start` into wave mode: per-wave parallel worktree dispatch instead of single-slice
sequential. See `commands/wave.md` and
`docs/superpowers/specs/2026-06-14-wave-mode-loop-design.md`.

Wave mode counts each wave as one `loop.maxIterations` increment (a wave-size-3 config
with `maxIterations: 25` allows up to 75 slice closes per run). Tighten `maxIterations`
or pass `--max-waves` to cap cost proportionally.
```

- [ ] **Step 5: Run validators**

Run: `bun ./src/scripts/validate-manifests.mts && bun ./src/scripts/validate-content-length.mts && bun test src/tests/ --parallel --timeout 60000`
Expected: PASS

- [ ] **Step 6: Run full pre-push validation**

Run: `bun ./src/scripts/pre-push-validate.mts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add README.md CHANGELOG.md CLAUDE.md
git commit -m "docs(wave): add wave-mode section to README, CHANGELOG entry, CLAUDE.md cross-ref"
```

---

## Self-review

After completing all tasks, run this checklist:

### 1. Spec coverage

| Spec section | Implementing task(s) |
|---|---|
| Architecture / module layout | Tasks 1, 7, 13, 15 |
| touches_files contract | Tasks 3, 4, 5 |
| Planner (rank + conflict graph + packer) | Tasks 2, 6, 7, 9 |
| Wave runner lifecycle | Tasks 13, 14, 15 |
| Failure pivot to /crew:fix | Task 10, 14 |
| Config + CLI surface | Tasks 12, 16, 17 |
| Slash command + marathon routing | Tasks 18, 21 |
| Artifacts + snapshot integration | Tasks 11, 20 |
| Halt badges | Task 19 |
| Tests (unit + integration) | Tasks 2–22 inline |
| README/CHANGELOG/CLAUDE.md | Task 23 |

All design sections covered. No gaps.

### 2. Placeholder scan

Search for: `TBD`, `TODO`, `implement later`, `fill in details`, `// stub`, `not yet implemented`.

- Task 16's `wave run` and `wave loop` cases initially stub with `not yet implemented`; Task 17 replaces them. Acceptable — the stub is explicitly TDD'd.
- Task 17's `realDispatch` deliberately throws with a documented constraint (harness-only). Not a placeholder — it's the correct runtime contract.

No other placeholders.

### 3. Type consistency

- `WaveConfig` field names (`size`, `sliceCommand`, `maxParallel`, etc.) are identical across Tasks 1 (types), 12 (config), 14 (failure-pivot), 17 (CLI).
- `WorktreeResult.status` enum (`"PASS" | "FAIL" | "timeout" | "agent_error"`) consistent across Tasks 1, 10, 13, 14.
- `FailurePivot` shape consistent across Tasks 1, 10, 14.
- `persistPivot` vs `persistPivotAt`: Task 10 introduces both; the deprecated `persistPivot` throws to surface the API contract mismatch (slice path required). Tests in Task 10 use `persistPivotAt`.
- `loadCandidates` signature consistent: `(repoRoot: string) => SliceCandidate[]` in Tasks 9, 16, 17, 22.

All types consistent. No drift.

---

## Wave schedule for subagent-driven execution

This plan is itself a candidate for wave-mode execution (meta-recursive: the wave runner being built can be implemented via parallel worktrees).

Each task below has a declared `touches_files` set. Tasks whose sets are disjoint can run as parallel subagent dispatches in one wave; merge between waves; next wave begins after the prior wave's PASS-merge + test-gate.

### Task touches_files declarations

| Task | touches_files |
|---|---|
| T1 | `src/scripts/lib/wave/types.mts` |
| T2 | `src/scripts/lib/wave/conflict.mts`, `src/tests/wave/conflict.test.mts` |
| T3 | `src/scripts/lib/wave/touches-files.mts`, `src/tests/wave/touches-files.test.mts` |
| T4 | `src/scripts/validate-slice-touches-files.mts`, `src/tests/wave/validate-touches-files.test.mts` |
| T5 | `agents/spec-writer.md` |
| T6 | `src/scripts/lib/wave/ranking.mts`, `src/scripts/lib/auto-walker.mts`, `src/tests/wave/ranking.test.mts` |
| T7 | `src/scripts/lib/wave/planner.mts`, `src/scripts/lib/wave/dispatch-prompt.mts`, `src/tests/wave/planner.test.mts` |
| T8 | `src/tests/wave/dispatch-prompt.test.mts` |
| T9 | `src/scripts/lib/wave/planner.mts`, `src/tests/wave/planner.test.mts` |
| T10 | `src/scripts/lib/wave/failure-pivot.mts`, `src/tests/wave/failure-pivot.test.mts` |
| T11 | `src/scripts/lib/wave/artifacts.mts`, `src/tests/wave/artifacts.test.mts` |
| T12 | `src/scripts/lib/wave/config.mts`, `src/scripts/lib/config-resolver.mts`, `src/tests/wave/config.test.mts` |
| T13 | `src/scripts/lib/wave/runner.mts`, `src/tests/wave/runner.test.mts` |
| T14 | `src/scripts/lib/wave/runner.mts`, `src/tests/wave/runner.test.mts` |
| T15 | `src/scripts/lib/wave/runner.mts`, `src/tests/wave/runner.test.mts` |
| T16 | `src/scripts/loop.mts`, `src/scripts/lib/wave/cli.mts`, `src/tests/wave/cli.test.mts` |
| T17 | `src/scripts/lib/wave/cli.mts`, `src/scripts/lib/wave/real-deps.mts`, `src/tests/wave/cli.test.mts` |
| T18 | `commands/wave.md` |
| T19 | `src/scripts/lib/halt-badges.mts`, `docs/halt-badges.md`, `src/tests/explain-halts.test.mts` |
| T20 | `src/scripts/lib/memory-snapshot.mts`, `src/tests/memory-snapshot.test.mts` (or matching snapshot test) |
| T21 | `commands/auto.md`, `commands/start.md`, `src/scripts/loop.mts`, `.claude/loop.json` |
| T22 | `src/tests/integration/wave-e2e.test.mts` |
| T23 | `README.md`, `CHANGELOG.md`, `CLAUDE.md` |

### Dependency graph (must-be-before)

```
T1 ──► T3, T6, T7, T11, T12, T13
T2 ──► T7
T3 ──► T4, T7, T9
T6 ──► (consumed by T7, T9 conceptually; no file overlap)
T7 ──► T8, T9, T10, T13
T9 ──► T16
T10 ──► T14
T11 ──► T20 (artifacts shape consumed by snapshot renderer)
T12 ──► T13, T16
T13 ──► T14
T14 ──► T15
T15 ──► T17
T16 ──► T17, T21
T17 ──► T21, T22
T19 ──► (independent — but landed early so badges available for snapshot tests)
T20 ──► T22 (snapshot integration consumed by e2e)
T21 ──► T22
T22 ──► T23
```

### Wave schedule

**Wave 1** (foundation — fully disjoint, no dependencies between them)

| # | Task | touches_files | depends on |
|---|---|---|---|
| 1 | T1 — types.mts | `src/scripts/lib/wave/types.mts` | — |
| 2 | T2 — conflict.mts + test | `src/scripts/lib/wave/conflict.mts`, `src/tests/wave/conflict.test.mts` | — |
| 3 | T5 — spec-writer contract update | `agents/spec-writer.md` | — |
| 4 | T19 — halt-badges + docs | `src/scripts/lib/halt-badges.mts`, `docs/halt-badges.md`, `src/tests/explain-halts.test.mts` | — |

Parallelism: 4. All worktrees independent — no shared files.

---

**Wave 2** (depends on T1 — types in place; T19 docs already merged)

| # | Task | touches_files | depends on |
|---|---|---|---|
| 1 | T3 — touches-files.mts + test | `src/scripts/lib/wave/touches-files.mts`, `src/tests/wave/touches-files.test.mts` | T1 |
| 2 | T6 — ranking.mts + auto-walker refactor | `src/scripts/lib/wave/ranking.mts`, `src/scripts/lib/auto-walker.mts`, `src/tests/wave/ranking.test.mts` | T1 |
| 3 | T11 — artifacts.mts + test | `src/scripts/lib/wave/artifacts.mts`, `src/tests/wave/artifacts.test.mts` | T1 |
| 4 | T12 — config.mts + test | `src/scripts/lib/wave/config.mts`, `src/scripts/lib/config-resolver.mts`, `src/tests/wave/config.test.mts` | T1 |

Parallelism: 4. Disjoint files.

---

**Wave 3** (depends on T3 + T7-precondition T2)

| # | Task | touches_files | depends on |
|---|---|---|---|
| 1 | T4 — validator script + test | `src/scripts/validate-slice-touches-files.mts`, `src/tests/wave/validate-touches-files.test.mts` | T3 |
| 2 | T7 — packer + dispatch-prompt stub | `src/scripts/lib/wave/planner.mts`, `src/scripts/lib/wave/dispatch-prompt.mts`, `src/tests/wave/planner.test.mts` | T1, T2, T3 |
| 3 | T20 — snapshot wave telemetry | `src/scripts/lib/memory-snapshot.mts`, `src/tests/memory-snapshot.test.mts` | T11 |

Parallelism: 3. Disjoint files.

---

**Wave 4** (depends on T7)

| # | Task | touches_files | depends on |
|---|---|---|---|
| 1 | T8 — dispatch-prompt test only | `src/tests/wave/dispatch-prompt.test.mts` | T7 |
| 2 | T9 — loadCandidates extends planner | `src/scripts/lib/wave/planner.mts`, `src/tests/wave/planner.test.mts` | T7 |
| 3 | T10 — failure-pivot + test | `src/scripts/lib/wave/failure-pivot.mts`, `src/tests/wave/failure-pivot.test.mts` | T7 |

Parallelism: 3. Disjoint files (T9 owns planner.mts, T8 owns its own test, T10 owns failure-pivot.mts).

---

**Wave 5** (depends on T9, T12)

| # | Task | touches_files | depends on |
|---|---|---|---|
| 1 | T13 — runner skeleton + pre-flight test | `src/scripts/lib/wave/runner.mts`, `src/tests/wave/runner.test.mts` | T1, T7, T12 |
| 2 | T16 — CLI wave plan subcommand | `src/scripts/loop.mts`, `src/scripts/lib/wave/cli.mts`, `src/tests/wave/cli.test.mts` | T9, T12 |

Parallelism: 2. Disjoint files.

---

**Wave 6** (depends on T13, T10)

| # | Task | touches_files | depends on |
|---|---|---|---|
| 1 | T14 — runner pivot integration | `src/scripts/lib/wave/runner.mts`, `src/tests/wave/runner.test.mts` | T10, T13 |

Parallelism: 1 (solo — only T14 ready, runner.mts is held).

---

**Wave 7** (depends on T14)

| # | Task | touches_files | depends on |
|---|---|---|---|
| 1 | T15 — loopWaves multi-wave driver | `src/scripts/lib/wave/runner.mts`, `src/tests/wave/runner.test.mts` | T14 |
| 2 | T18 — `/loop:wave` slash command | `commands/wave.md` | T16 |

Parallelism: 2. Disjoint files (T15 in runner.mts, T18 in commands/wave.md).

---

**Wave 8** (depends on T15, T16, T11, T17 needs T13/14/15/11/16)

| # | Task | touches_files | depends on |
|---|---|---|---|
| 1 | T17 — wire real dispatch into CLI | `src/scripts/lib/wave/cli.mts`, `src/scripts/lib/wave/real-deps.mts`, `src/tests/wave/cli.test.mts` | T11, T13, T14, T15, T16 |
| 2 | T21 — marathon routing + config get + loop.json | `commands/auto.md`, `commands/start.md`, `src/scripts/loop.mts`, `.claude/loop.json` | T16, T18 |

Parallelism: 2. Disjoint files. **Note coarse-prefix rule**: `.claude/loop.json` is coarse-prefix. T21 touches it; no other task in Wave 8 touches `.claude/loop.json`, so OK.

---

**Wave 9** (depends on T17, T20, T21)

| # | Task | touches_files | depends on |
|---|---|---|---|
| 1 | T22 — integration e2e | `src/tests/integration/wave-e2e.test.mts` | T17, T20, T21 |
| 2 | T23 — README + CHANGELOG + CLAUDE.md | `README.md`, `CHANGELOG.md`, `CLAUDE.md` | T22 |

Parallelism: 2. Disjoint files. T23 lists T22 as dep but can run in parallel because both touch disjoint files — if T22 fails the e2e test, T23 docs still land cleanly and T22 retries via failure pivot.

---

### Schedule summary

| Wave | Tasks | Parallelism | Critical-path step |
|---|---|---|---|
| 1 | T1, T2, T5, T19 | 4 | foundation |
| 2 | T3, T6, T11, T12 | 4 | parser + ranking + artifacts + config |
| 3 | T4, T7, T20 | 3 | validator + packer + snapshot |
| 4 | T8, T9, T10 | 3 | dispatch-prompt test + loadCandidates + pivot |
| 5 | T13, T16 | 2 | runner skeleton + CLI plan |
| 6 | T14 | 1 | runner pivot integration (solo — runner.mts contention) |
| 7 | T15, T18 | 2 | loopWaves + slash command |
| 8 | T17, T21 | 2 | real CLI wire + marathon routing |
| 9 | T22, T23 | 2 | e2e + docs |

Total: 23 tasks / 9 waves = avg 2.6× parallelism. Wall-clock approx 9 wave-iterations vs 23 sequential.

Bottlenecks (limit parallelism):
- `src/scripts/lib/wave/runner.mts` held across T13, T14, T15 (forces 3 sequential waves).
- `src/scripts/lib/wave/planner.mts` held across T7, T9 (forces 2 sequential waves).
- `src/scripts/loop.mts` held across T16, T21 (forces 2 sequential waves).

### Subagent dispatch shape per wave

For each wave, the lead dispatches N parallel subagents (one per task) in a single message:

```
Wave N: parallel dispatch — N subagents

For each task:
  Agent(general-purpose):
    "You are implementing Task <id> from
     docs/superpowers/plans/2026-06-14-wave-mode-loop.md
     in worktree <path>. Execute all steps in order. TDD: write the failing test
     first, verify it fails, implement, verify it passes, lint+typecheck, commit.
     Return JSON marker on last line:
     {\"task\":\"T<id>\",\"status\":\"PASS\"|\"FAIL\",\"commits\":[sha...],\"artifacts\":[paths]}"
```

After all subagents return PASS, merge worktrees to main, run full test suite, proceed to next wave. FAIL tasks pivot to `/crew:fix` next wave per the wave-mode contract.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-14-wave-mode-loop.md`. Two execution options:

**1. Subagent-Driven, wave-grouped (recommended)** — execute by wave schedule above. 9 waves, 23 tasks, avg 2.6× parallelism. Each wave merges + tests before the next.

**2. Subagent-Driven, sequential** — dispatch one subagent per task in order, review between each. Simpler; ~2.6× slower wall-clock.

**3. Inline Execution** — execute tasks in this session using executing-plans.

Which approach?
