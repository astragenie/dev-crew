# Slice Throughput 2x Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cut median per-slice wall-clock by ≥50% (target 2x) while keeping average grade ≥ 0.83, by adding five config-gated ceremony-compression levers.

**Architecture:** Each lever is one new or modified `.mts` module + a config flag in `.claude/loop.json`. Levers compose but do not couple — flipping a flag off reverts a single lever cleanly. Telemetry seed ships first so the other four can be measured. Riskiest lever (post-builder fanout) ships last after telemetry confirms quality floor holds.

**Tech Stack:** Bun (runtime), TypeScript ESM `.mts`, `bun test` (with `node:test` compat for existing tests), `node:fs/promises`, `node:child_process.spawn` for parallel process management, `node:assert/strict`. No new runtime deps.

**Spec:** `docs/superpowers/specs/2026-06-11-slice-throughput-2x-design.md`

---

## File Structure

| Task | File | Action | Responsibility |
|---|---|---|---|
| 1 | `src/scripts/lib/grade-writer.mts` | modify | Extend prefill template with `timing` + `shape` frontmatter blocks |
| 1 | `src/scripts/lib/perf-report.mts` | create | Aggregate timing telemetry over window N |
| 1 | `src/scripts/loop.mts` | modify | Wire `perf-report` subcommand |
| 1 | `templates/grade.md` | modify | Add `timing` + `shape` placeholders to prefill body |
| 1 | `src/tests/perf-report.test.mts` | create | Unit tests for perf-report aggregation |
| 1 | `src/tests/grade-writer-timing.test.mts` | create | Test new frontmatter blocks land |
| 2 | `src/scripts/lib/phase-gate/parallel-runner.mts` | create | `Promise.all` group runner with tagged streams |
| 2 | `src/scripts/lib/phase-gate.mts` | modify | Branch on `phaseGate.parallel` flag; delegate to parallel runner |
| 2 | `src/scripts/loop.mts` | modify | Pass `--serial` / `--only` flags through |
| 2 | `commands/phase-gate.md` | modify | Document new flags + groups schema |
| 2 | `src/tests/phase-gate-parallel-runner.test.mts` | create | Mock 3 commands, assert parallel + tagged output |
| 3 | `src/scripts/lib/reviewer-ladder.mts` | modify | Prepend `PARALLEL_DISPATCH_CONTRACT v1` block to `instructions` |
| 3 | `src/scripts/lib/reviewer-timing.mts` | create | Compute span across review-artifact creation timestamps |
| 3 | `src/scripts/lib/slice-linker/complete-slice.mts` | modify | Call detector, write badge + grade observation |
| 3 | `src/tests/reviewer-ladder-contract.test.mts` | create | Assert contract block present |
| 3 | `src/tests/reviewer-timing.test.mts` | create | Span calc + threshold cases |
| 4 | `src/scripts/lib/classify-slice-shape.mts` | create | Pure classifier with public-surface guard list |
| 4 | `src/scripts/loop.mts` | modify | Wire `classify-slice-shape` subcommand |
| 4 | `commands/classify-slice-shape.md` | create | CLI doc |
| 4 | `docs/sop/inline-criteria.md` | create | Shape definitions + rationale |
| 4 | `src/tests/classify-slice-shape.test.mts` | create | One case per shape + negative cases |
| 5 | `src/scripts/lib/post-builder-fanout.mts` | create | Build N+1 parallel task payload |
| 5 | `src/scripts/loop.mts` | modify | Wire `slice post-builder-fanout` subcommand |
| 5 | `commands/slice-post-builder-fanout.md` | create | CLI doc |
| 5 | `commands/slice-complete.md` | modify | Document fanout aggregation rules |
| 5 | `src/tests/post-builder-fanout.test.mts` | create | 3 tasks emitted + independence + aggregation |

---

## Task 1: Telemetry Seed (SLICE-91)

**Files:**
- Create: `src/scripts/lib/perf-report.mts`
- Create: `src/tests/perf-report.test.mts`
- Create: `src/tests/grade-writer-timing.test.mts`
- Modify: `src/scripts/lib/grade-writer.mts`
- Modify: `src/scripts/loop.mts`
- Modify: `templates/grade.md`

**Config flag added:** none yet — telemetry is always on. Baseline pinning lands in this task.

- [ ] **Step 1: Write failing test for grade frontmatter `timing` + `shape` blocks**

Create `src/tests/grade-writer-timing.test.mts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { generateGradeArtifact } from "../scripts/lib/grade-writer.mjs";

test("grade prefill includes timing + shape frontmatter blocks", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "grade-timing-"));
  await fs.mkdir(path.join(repo, ".claude/artifacts/loop/grades"), { recursive: true });
  await fs.mkdir(path.join(repo, ".claude/artifacts/loop/ai-loop/slices/in-progress"), {
    recursive: true
  });
  await fs.writeFile(
    path.join(repo, ".claude/artifacts/loop/ai-loop/slices/in-progress/SLICE_91_test.md"),
    "---\nid: SLICE-91\nfeature: FEAT-001\n---\n# SLICE-91\n"
  );
  const { gradePath, content } = await generateGradeArtifact(repo, "SLICE-91", {});
  assert.match(content, /timing:/);
  assert.match(content, /wall_clock_seconds:/);
  assert.match(content, /phase_gate_parallel:/);
  assert.match(content, /post_builder_fanout:/);
  assert.match(content, /reviewer_span_ms:/);
  assert.match(content, /serial_reviewer_warning:/);
  assert.match(content, /shape:/);
  assert.match(content, /classified:/);
  assert.match(content, /inline_path_used:/);
  await fs.rm(repo, { recursive: true, force: true });
  assert.ok(gradePath);
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
bun test src/tests/grade-writer-timing.test.mts
```

Expected: FAIL with `Expected /timing:/ to match` — current template has no `timing:` block.

- [ ] **Step 3: Extend `templates/grade.md` with timing + shape frontmatter**

Open `templates/grade.md` and add these frontmatter keys (preserve all existing keys):

```yaml
timing:
  wall_clock_seconds: null
  phase_gate_parallel: null
  post_builder_fanout: null
  reviewer_span_ms: null
  serial_reviewer_warning: false
shape:
  classified: null
  inline_path_used: false
```

If the template uses tokens like `{{slice}}`, leave those untouched and add the new keys after the existing block.

- [ ] **Step 4: Run test, verify it passes**

```bash
bun test src/tests/grade-writer-timing.test.mts
```

Expected: PASS.

- [ ] **Step 5: Write failing test for `perf-report` aggregation**

Create `src/tests/perf-report.test.mts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { buildPerfReport } from "../scripts/lib/perf-report.mjs";

async function writeGrade(repo: string, sliceId: string, walls: number, avg: number) {
  const dir = path.join(repo, ".claude/artifacts/loop/grades");
  await fs.mkdir(dir, { recursive: true });
  const body = `---
id: GRADE-${sliceId}
slice: ${sliceId}
timing:
  wall_clock_seconds: ${walls}
  phase_gate_parallel: true
  post_builder_fanout: false
scores:
  architecture_quality: ${avg}
  reliability: ${avg}
  observability: ${avg}
  production_readiness: ${avg}
  security: ${avg}
  test_confidence: ${avg}
  product_completeness: ${avg}
---
# ${sliceId}
`;
  await fs.writeFile(path.join(dir, `20260611T0000${sliceId}-grade.md`), body);
}

test("perf-report aggregates median wall_clock + avg grade across window", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "perf-report-"));
  await writeGrade(repo, "01", 600, 0.85);
  await writeGrade(repo, "02", 480, 0.83);
  await writeGrade(repo, "03", 720, 0.87);
  const report = await buildPerfReport(repo, { window: 3 });
  assert.equal(report.window, 3);
  assert.equal(report.medianWallClockSeconds, 600);
  assert.equal(Math.round(report.avgGrade * 1000) / 1000, 0.85);
  assert.equal(report.phaseGateParallelPct, 100);
  await fs.rm(repo, { recursive: true, force: true });
});

test("perf-report computes speedup vs pinned baseline", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "perf-report-baseline-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({ loop: { perfBaseline: { medianWallClockSeconds: 1200, avgGrade: 0.835 } } })
  );
  await writeGrade(repo, "01", 600, 0.85);
  const report = await buildPerfReport(repo, { window: 1 });
  assert.equal(report.baseline.medianWallClockSeconds, 1200);
  assert.equal(report.speedupRatio, 2);
  await fs.rm(repo, { recursive: true, force: true });
});
```

- [ ] **Step 6: Run test, verify it fails (module missing)**

```bash
bun test src/tests/perf-report.test.mts
```

Expected: FAIL with `Cannot find module 'perf-report'`.

- [ ] **Step 7: Implement `src/scripts/lib/perf-report.mts`**

```typescript
import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter } from "./frontmatter.mjs";
import { gradesRoot } from "./grade-parser.mjs";
import { resolveConfig } from "./config-resolver.mjs";

export type PerfReport = {
  window: number;
  slicesIncluded: number;
  medianWallClockSeconds: number | null;
  p90WallClockSeconds: number | null;
  avgGrade: number | null;
  phaseGateParallelPct: number;
  postBuilderFanoutPct: number;
  serialReviewerWarningPct: number;
  inlinePathPct: number;
  baseline: { medianWallClockSeconds: number | null; avgGrade: number | null };
  speedupRatio: number | null;
};

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function percentile(nums: number[], p: number): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pct(matches: number, total: number): number {
  return total === 0 ? 0 : Math.round((matches / total) * 1000) / 10;
}

export async function buildPerfReport(
  repoPath: string,
  { window = 10 }: { window?: number } = {}
): Promise<PerfReport> {
  const config = await resolveConfig(repoPath).catch(() => null);
  const dir = gradesRoot(repoPath, config);
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    /* no grades yet */
  }
  const grades = entries.filter((f) => f.endsWith("-grade.md")).sort();
  const recent = grades.slice(-window);
  const walls: number[] = [];
  const gradeAvgs: number[] = [];
  let phaseGateParallel = 0;
  let postBuilderFanout = 0;
  let serialWarn = 0;
  let inlinePath = 0;
  for (const file of recent) {
    const raw = await fs.readFile(path.join(dir, file), "utf8");
    const { frontmatter } = parseFrontmatter(raw);
    const timing = frontmatter.timing || {};
    const shape = frontmatter.shape || {};
    if (typeof timing.wall_clock_seconds === "number") walls.push(timing.wall_clock_seconds);
    const scores = frontmatter.scores || {};
    const scoreVals = Object.values(scores).filter((v): v is number => typeof v === "number");
    if (scoreVals.length) gradeAvgs.push(scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length);
    if (timing.phase_gate_parallel === true) phaseGateParallel++;
    if (timing.post_builder_fanout === true) postBuilderFanout++;
    if (timing.serial_reviewer_warning === true) serialWarn++;
    if (shape.inline_path_used === true) inlinePath++;
  }
  const baselineCfg = (config?.loop?.perfBaseline ?? {}) as {
    medianWallClockSeconds?: number;
    avgGrade?: number;
  };
  const medianWall = median(walls);
  return {
    window,
    slicesIncluded: recent.length,
    medianWallClockSeconds: medianWall,
    p90WallClockSeconds: percentile(walls, 90),
    avgGrade: avg(gradeAvgs),
    phaseGateParallelPct: pct(phaseGateParallel, recent.length),
    postBuilderFanoutPct: pct(postBuilderFanout, recent.length),
    serialReviewerWarningPct: pct(serialWarn, recent.length),
    inlinePathPct: pct(inlinePath, recent.length),
    baseline: {
      medianWallClockSeconds: baselineCfg.medianWallClockSeconds ?? null,
      avgGrade: baselineCfg.avgGrade ?? null
    },
    speedupRatio:
      medianWall && baselineCfg.medianWallClockSeconds
        ? Math.round((baselineCfg.medianWallClockSeconds / medianWall) * 100) / 100
        : null
  };
}
```

- [ ] **Step 8: Run test, verify it passes**

```bash
bun test src/tests/perf-report.test.mts
```

Expected: PASS (both `test()` cases).

- [ ] **Step 9: Wire `perf-report` subcommand in `src/scripts/loop.mts`**

Find the existing subcommand dispatch block (look for `case "brief":` or similar). Add:

```typescript
if (subcommand === "perf-report") {
  const { buildPerfReport } = await import("./lib/perf-report.mjs");
  const repo = parseFlag(args, "--repo") || process.cwd();
  const window = Number.parseInt(parseFlag(args, "--window") || "10", 10);
  const report = await buildPerfReport(repo, { window });
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  return;
}
```

Use whatever `parseFlag` / argv-parsing utility the file already uses for siblings like `brief`.

- [ ] **Step 10: Smoke-test the CLI**

```bash
bun src/scripts/loop.mts perf-report --repo "$PWD" --window 5
```

Expected: JSON output with `window: 5` and either a numeric `medianWallClockSeconds` or `null`. No exception.

- [ ] **Step 11: Pin baseline in `.claude/loop.json`**

Add this block under the existing `loop` object in `.claude/loop.json`. Use the current snapshot's median (≈1200 seconds based on SLICE-90 baseline of 20 min) and current `avgRecent` (0.835):

```json
"perfBaseline": {
  "medianWallClockSeconds": 1200,
  "avgGrade": 0.835,
  "pinnedAt": "2026-06-11"
}
```

- [ ] **Step 12: Commit**

```bash
git add src/scripts/lib/perf-report.mts src/scripts/lib/grade-writer.mts src/scripts/loop.mts templates/grade.md src/tests/perf-report.test.mts src/tests/grade-writer-timing.test.mts .claude/loop.json
git commit -m "feat(loop): add perf-report CLI and timing/shape grade telemetry (SLICE-91)"
```

---

## Task 2: Phase-Gate Parallelization (SLICE-92)

**Files:**
- Create: `src/scripts/lib/phase-gate/parallel-runner.mts`
- Create: `src/tests/phase-gate-parallel-runner.test.mts`
- Modify: `src/scripts/lib/phase-gate.mts`
- Modify: `src/scripts/loop.mts`
- Modify: `commands/phase-gate.md`
- Modify: `.claude/loop.json` (add `phaseGate` block)

**Config flag added:** `phaseGate.parallel` (default `true`).

- [ ] **Step 1: Write failing test for parallel runner**

Create `src/tests/phase-gate-parallel-runner.test.mts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";

import { runParallelGroups } from "../scripts/lib/phase-gate/parallel-runner.mjs";

test("runParallelGroups runs all groups concurrently and tags output", async () => {
  const groups = {
    lint: [{ cmd: "node", args: ["-e", "console.log('lint-ok'); process.exit(0)"] }],
    typecheck: [{ cmd: "node", args: ["-e", "console.log('tc-ok'); process.exit(0)"] }],
    test: [{ cmd: "node", args: ["-e", "console.log('test-ok'); process.exit(0)"] }]
  };
  const t0 = Date.now();
  const result = await runParallelGroups(groups);
  const elapsed = Date.now() - t0;
  assert.equal(result.exitCode, 0);
  assert.ok(result.combinedLog.includes("[lint] lint-ok"));
  assert.ok(result.combinedLog.includes("[typecheck] tc-ok"));
  assert.ok(result.combinedLog.includes("[test] test-ok"));
  assert.ok(elapsed < 3000, `expected <3s, got ${elapsed}ms`);
});

test("runParallelGroups fails-fast with first non-zero exit code", async () => {
  const groups = {
    lint: [{ cmd: "node", args: ["-e", "process.exit(7)"] }],
    test: [{ cmd: "node", args: ["-e", "console.log('test-ok')"] }]
  };
  const result = await runParallelGroups(groups);
  assert.equal(result.exitCode, 7);
  assert.equal(result.failedGroup, "lint");
});

test("runParallelGroups --only filters to a single group", async () => {
  const groups = {
    lint: [{ cmd: "node", args: ["-e", "console.log('lint-ok')"] }],
    test: [{ cmd: "node", args: ["-e", "console.log('test-ok')"] }]
  };
  const result = await runParallelGroups(groups, { only: "test" });
  assert.ok(!result.combinedLog.includes("lint-ok"));
  assert.ok(result.combinedLog.includes("[test] test-ok"));
});
```

- [ ] **Step 2: Run test, verify it fails (module missing)**

```bash
bun test src/tests/phase-gate-parallel-runner.test.mts
```

Expected: FAIL with `Cannot find module 'phase-gate/parallel-runner'`.

- [ ] **Step 3: Implement parallel runner**

Create `src/scripts/lib/phase-gate/parallel-runner.mts`:

```typescript
import { spawn } from "node:child_process";

export type Command = { cmd: string; args?: string[]; cwd?: string };
export type Groups = Record<string, Command[]>;

export type GroupResult = {
  group: string;
  exitCode: number;
  durationMs: number;
};

export type RunResult = {
  exitCode: number;
  failedGroup: string | null;
  groups: GroupResult[];
  combinedLog: string;
};

function runCommand(group: string, cmd: Command, sink: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd.cmd, cmd.args || [], {
      cwd: cmd.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });
    const tag = `[${group}] `;
    const emit = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      for (const line of text.split(/\r?\n/)) {
        if (line) sink.push(tag + line);
      }
    };
    child.stdout.on("data", emit);
    child.stderr.on("data", emit);
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", (err) => {
      sink.push(`${tag}spawn-error: ${err.message}`);
      resolve(1);
    });
  });
}

async function runGroup(group: string, commands: Command[], sink: string[]): Promise<GroupResult> {
  const t0 = Date.now();
  let exit = 0;
  for (const cmd of commands) {
    exit = await runCommand(group, cmd, sink);
    if (exit !== 0) break;
  }
  return { group, exitCode: exit, durationMs: Date.now() - t0 };
}

export async function runParallelGroups(
  groups: Groups,
  { only }: { only?: string } = {}
): Promise<RunResult> {
  const sink: string[] = [];
  const entries = Object.entries(groups).filter(([name]) => !only || name === only);
  const settled = await Promise.all(entries.map(([name, cmds]) => runGroup(name, cmds, sink)));
  const failed = settled.find((g) => g.exitCode !== 0) || null;
  return {
    exitCode: failed ? failed.exitCode : 0,
    failedGroup: failed ? failed.group : null,
    groups: settled,
    combinedLog: sink.join("\n")
  };
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
bun test src/tests/phase-gate-parallel-runner.test.mts
```

Expected: PASS (all three test cases).

- [ ] **Step 5: Wire parallel branch into `src/scripts/lib/phase-gate.mts`**

Open `src/scripts/lib/phase-gate.mts`. Find the main entry function (likely `runPhaseGate` or similar). Before the existing sequential stage loop, add:

```typescript
import { runParallelGroups } from "./phase-gate/parallel-runner.mjs";

// inside the entry function, before the existing serial path:
const phaseGateCfg = (config.phaseGate ?? {}) as {
  parallel?: boolean;
  groups?: Record<string, Array<{ cmd: string; args?: string[] }>>;
};
if (phaseGateCfg.parallel !== false && phaseGateCfg.groups && !options.serial) {
  const result = await runParallelGroups(phaseGateCfg.groups, { only: options.only });
  process.stdout.write(result.combinedLog + "\n");
  if (result.exitCode !== 0) {
    process.stdout.write(`Phase gate FAILED in group: ${result.failedGroup}\n`);
  }
  return { exit: result.exitCode, groups: result.groups };
}
// fall through to existing sequential stack.test path...
```

The exact integration point depends on the file structure — keep the existing serial path intact for back-compat.

- [ ] **Step 6: Wire `--serial` and `--only` flags in `src/scripts/loop.mts`**

In the `phase-gate` subcommand block, parse and pass:

```typescript
const serial = args.includes("--serial");
const only = parseFlag(args, "--only") || undefined;
const result = await runPhaseGate(repo, { serial, only });
process.exit(result.exit ?? 0);
```

- [ ] **Step 7: Add `phaseGate` block to `.claude/loop.json`**

Append under the existing root object:

```json
"phaseGate": {
  "parallel": true,
  "groups": {
    "lint": [
      { "cmd": "bun", "args": ["run", "lint"] },
      { "cmd": "bun", "args": ["run", "format:check"] },
      { "cmd": "bun", "args": ["./src/scripts/validate-manifests.mts"] },
      { "cmd": "bun", "args": ["./src/scripts/validate-content-length.mts"] }
    ],
    "typecheck": [
      { "cmd": "bunx", "args": ["tsc", "--project", "tsconfig.json", "--noEmit"] },
      { "cmd": "bunx", "args": ["tsc", "--project", "tsconfig.test.json", "--noEmit"] }
    ],
    "test": [
      { "cmd": "bun", "args": ["test", "src/tests/", "--parallel", "--timeout", "60000"] }
    ]
  }
}
```

- [ ] **Step 8: Smoke test full parallel gate**

```bash
bun src/scripts/loop.mts phase-gate --repo "$PWD"
```

Expected: tagged output lines `[lint] ...`, `[typecheck] ...`, `[test] ...` interleaved. Exit 0. Wall-clock under 100s (vs ~145s serial).

- [ ] **Step 9: Smoke test `--serial` fallback**

```bash
bun src/scripts/loop.mts phase-gate --repo "$PWD" --serial
```

Expected: existing sequential behavior, no tagged lines.

- [ ] **Step 10: Update `commands/phase-gate.md`**

Add a section documenting the new `phaseGate` config block, the `--serial` flag, and the `--only lint|typecheck|test` flag. Preserve existing prose.

- [ ] **Step 11: Commit**

```bash
git add src/scripts/lib/phase-gate src/scripts/lib/phase-gate.mts src/scripts/loop.mts commands/phase-gate.md .claude/loop.json src/tests/phase-gate-parallel-runner.test.mts
git commit -m "feat(loop): parallelize phase-gate groups (lint || tsc || test) (SLICE-92)"
```

---

## Task 3: Parallel-Dispatch Contract + Serial-Reviewer Detector (SLICE-93)

**Files:**
- Modify: `src/scripts/lib/reviewer-ladder.mts`
- Create: `src/scripts/lib/reviewer-timing.mts`
- Modify: `src/scripts/lib/slice-linker/complete-slice.mts`
- Create: `src/tests/reviewer-ladder-contract.test.mts`
- Create: `src/tests/reviewer-timing.test.mts`
- Modify: `.claude/loop.json` (`reviewers.serialTimingThresholdMs`, `reviewers.strictParallel`)

**Config flags added:** `reviewers.strictParallel` (default `true`), `reviewers.serialTimingThresholdMs` (default `90000`).

- [ ] **Step 1: Write failing contract test**

Create `src/tests/reviewer-ladder-contract.test.mts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { buildReviewLadder } from "../scripts/lib/reviewer-ladder.mjs";

test("review-ladder instructions include PARALLEL_DISPATCH_CONTRACT v1 block", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "ladder-contract-"));
  const sliceDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/in-progress");
  await fs.mkdir(sliceDir, { recursive: true });
  await fs.writeFile(
    path.join(sliceDir, "SLICE_99_test.md"),
    "---\nid: SLICE-99\n---\n# SLICE-99\n## Files\n- src/a.mts\n"
  );
  const ladder = await buildReviewLadder(repo, "SLICE-99");
  assert.ok(ladder.instructions.includes("PARALLEL_DISPATCH_CONTRACT v1"));
  assert.ok(
    ladder.instructions.includes("required: emit exactly ONE message containing N=2 Agent tool calls")
  );
  assert.ok(ladder.instructions.includes("forbidden: send any message between dispatches"));
  assert.ok(ladder.instructions.includes("forbidden: wait for one reviewer return"));
  assert.ok(ladder.instructions.includes("violation: serial-reviewer-warning"));
  await fs.rm(repo, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
bun test src/tests/reviewer-ladder-contract.test.mts
```

Expected: FAIL — current `instructions` field is a single prose line without the contract block.

- [ ] **Step 3: Update `instructions` field in `src/scripts/lib/reviewer-ladder.mts`**

Replace the `instructions:` line at the end of `buildReviewLadder` with:

```typescript
const contractBlock = [
  "PARALLEL_DISPATCH_CONTRACT v1",
  `required: emit exactly ONE message containing N=${ladder.length} Agent tool calls`,
  "forbidden: send any message between dispatches",
  "forbidden: wait for one reviewer return before next dispatch",
  "violation: serial-reviewer-warning badge logged to grade"
].join("\n");

return {
  sliceId,
  ladder,
  tasks,
  instructions: `${contractBlock}\n\nAggregate verdicts — slice passes when all reviewers return PASS or PASS with minor.`
};
```

- [ ] **Step 4: Run test, verify it passes**

```bash
bun test src/tests/reviewer-ladder-contract.test.mts
```

Expected: PASS.

- [ ] **Step 5: Write failing test for `reviewer-timing` detector**

Create `src/tests/reviewer-timing.test.mts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { detectSerialReviewer } from "../scripts/lib/reviewer-timing.mjs";

async function makeReview(repo: string, ts: string, slice: string) {
  const dir = path.join(repo, ".claude/artifacts/crew/reviews");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, `${ts}-review-result-${slice}-x.md`),
    `---\nslice: ${slice}\n---\n# review\n`
  );
}

test("detects serial when span > threshold", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "rev-timing-"));
  await makeReview(repo, "20260611T100000Z", "slice-99");
  await makeReview(repo, "20260611T100400Z", "slice-99");
  const result = await detectSerialReviewer(repo, "SLICE-99", { thresholdMs: 90000 });
  assert.equal(result.serial, true);
  assert.equal(result.spanMs, 240000);
  await fs.rm(repo, { recursive: true, force: true });
});

test("no warning when span <= threshold", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "rev-timing-ok-"));
  await makeReview(repo, "20260611T100000Z", "slice-99");
  await makeReview(repo, "20260611T100030Z", "slice-99");
  const result = await detectSerialReviewer(repo, "SLICE-99", { thresholdMs: 90000 });
  assert.equal(result.serial, false);
  assert.equal(result.spanMs, 30000);
  await fs.rm(repo, { recursive: true, force: true });
});

test("no-op on single review", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "rev-timing-single-"));
  await makeReview(repo, "20260611T100000Z", "slice-99");
  const result = await detectSerialReviewer(repo, "SLICE-99", { thresholdMs: 90000 });
  assert.equal(result.serial, false);
  assert.equal(result.spanMs, 0);
  assert.equal(result.reviewCount, 1);
  await fs.rm(repo, { recursive: true, force: true });
});
```

- [ ] **Step 6: Run test, verify it fails (module missing)**

```bash
bun test src/tests/reviewer-timing.test.mts
```

Expected: FAIL with `Cannot find module 'reviewer-timing'`.

- [ ] **Step 7: Implement `src/scripts/lib/reviewer-timing.mts`**

```typescript
import fs from "node:fs/promises";
import path from "node:path";

export type SerialReviewerResult = {
  serial: boolean;
  spanMs: number;
  reviewCount: number;
  threshold: number;
};

function parseTimestamp(filename: string): number | null {
  const m = filename.match(/^(\d{8}T\d{6}Z)/);
  if (!m) return null;
  const ts = m[1]!;
  // YYYYMMDDTHHMMSSZ → YYYY-MM-DDTHH:MM:SSZ
  const iso = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 11)}:${ts.slice(11, 13)}:${ts.slice(13, 15)}Z`;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

export async function detectSerialReviewer(
  repoPath: string,
  sliceId: string,
  { thresholdMs = 90000 }: { thresholdMs?: number } = {}
): Promise<SerialReviewerResult> {
  const dir = path.join(repoPath, ".claude/artifacts/crew/reviews");
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return { serial: false, spanMs: 0, reviewCount: 0, threshold: thresholdMs };
  }
  const slug = sliceId.toLowerCase();
  const matching = entries.filter((f) => f.toLowerCase().includes(slug));
  const stamps = matching.map(parseTimestamp).filter((n): n is number => n !== null);
  if (stamps.length < 2) {
    return { serial: false, spanMs: 0, reviewCount: stamps.length, threshold: thresholdMs };
  }
  const spanMs = Math.max(...stamps) - Math.min(...stamps);
  return {
    serial: spanMs > thresholdMs,
    spanMs,
    reviewCount: stamps.length,
    threshold: thresholdMs
  };
}
```

- [ ] **Step 8: Run test, verify it passes**

```bash
bun test src/tests/reviewer-timing.test.mts
```

Expected: PASS (all three test cases).

- [ ] **Step 9: Add badge + observation helpers to `src/scripts/lib/slice-linker/complete-slice.mts`**

Open the file. Add these helpers near the top of the module (after existing imports). Reuse the existing `parseFrontmatter` / `serializeFrontmatter` imports; if they aren't already imported in this file, add the import line too:

```typescript
import { parseFrontmatter, serializeFrontmatter } from "../frontmatter.mjs";

async function appendSliceBadge(repoPath: string, sliceId: string, badge: string) {
  const slicesRootDir = resolveSlicesRoot(repoPath, null);
  const sliceFile = await locateSliceFile(slicesRootDir, sliceId);
  if (!sliceFile) return;
  const raw = await fs.readFile(sliceFile, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);
  const badges = Array.isArray(frontmatter.badges) ? frontmatter.badges.slice() : [];
  if (!badges.includes(badge)) badges.push(badge);
  frontmatter.badges = badges;
  await fs.writeFile(sliceFile, serializeFrontmatter(frontmatter) + "\n" + body);
}

async function appendGradeObservation(repoPath: string, sliceId: string, note: string) {
  const { findGradeFileForSlice, gradesRoot } = await import("../grade-parser.mjs");
  const gradeFile = await findGradeFileForSlice(gradesRoot(repoPath, null), sliceId);
  if (!gradeFile) return; // grade not written yet — observation will be re-emitted at grade-write time
  const raw = await fs.readFile(gradeFile, "utf8");
  if (raw.includes(note)) return; // idempotent
  const marker = "## Surprises";
  const idx = raw.indexOf(marker);
  if (idx === -1) {
    await fs.appendFile(gradeFile, `\n## Surprises\n\n- ${note}\n`);
  } else {
    const insertAt = raw.indexOf("\n", idx) + 1;
    const next = raw.slice(0, insertAt) + `\n- ${note}\n` + raw.slice(insertAt);
    await fs.writeFile(gradeFile, next);
  }
}
```

`locateSliceFile` and `resolveSlicesRoot` are already imported from `../paths.mjs` elsewhere in the file — reuse those imports.

- [ ] **Step 10: Wire detector call near the end of the complete-slice function**

In the same file, locate the function that finalizes the slice (search for the existing slice-complete write path — typically a function called `completeSlice` or similar). Just before the function returns its success result, add:

```typescript
import { detectSerialReviewer } from "../reviewer-timing.mjs";

const thresholdMs = (config?.reviewers?.serialTimingThresholdMs as number) ?? 90000;
const detector = await detectSerialReviewer(repoPath, sliceId, { thresholdMs });
if (detector.serial) {
  await appendSliceBadge(repoPath, sliceId, "serial-reviewer-warning");
  await appendGradeObservation(
    repoPath,
    sliceId,
    `Reviewer ladder ran serially (span ${detector.spanMs}ms, threshold ${thresholdMs}ms). Parallel contract violated.`
  );
}
```

The `config` variable should already be resolved earlier in the function. If not, add `const config = await resolveConfig(repoPath).catch(() => null);` before the detector call (reuse the existing import).

- [ ] **Step 11: Add config block to `.claude/loop.json`**

Extend the existing `reviewers` block:

```json
"reviewers": {
  "ladder": ["A", "B"],
  "strictParallel": true,
  "serialTimingThresholdMs": 90000
}
```

- [ ] **Step 12: Run full test suite**

```bash
bun test src/tests/ --timeout 60000
```

Expected: PASS. No existing tests regress.

- [ ] **Step 13: Commit**

```bash
git add src/scripts/lib/reviewer-ladder.mts src/scripts/lib/reviewer-timing.mts src/scripts/lib/slice-linker/complete-slice.mts src/tests/reviewer-ladder-contract.test.mts src/tests/reviewer-timing.test.mts .claude/loop.json
git commit -m "feat(loop): parallel-dispatch contract + serial-reviewer detector (SLICE-93)"
```

---

## Task 4: classify-slice-shape + Inline Criteria (SLICE-94)

**Files:**
- Create: `src/scripts/lib/classify-slice-shape.mts`
- Create: `src/tests/classify-slice-shape.test.mts`
- Modify: `src/scripts/loop.mts`
- Create: `commands/classify-slice-shape.md`
- Create: `docs/sop/inline-criteria.md`
- Modify: `.claude/loop.json` (extend `dispatchLimits.preferInlineFor`)

**Config flag added:** the new shape entries in `dispatchLimits.preferInlineFor`.

- [ ] **Step 1: Write failing classifier test**

Create `src/tests/classify-slice-shape.test.mts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";

import { classifySliceShape } from "../scripts/lib/classify-slice-shape.mjs";

test("doc-update: all markdown", () => {
  const r = classifySliceShape({ files: [{ path: "docs/foo.md", added: 10, removed: 2 }] });
  assert.equal(r.shape, "doc-update");
});

test("config-tweak: only loop.json", () => {
  const r = classifySliceShape({ files: [{ path: ".claude/loop.json", added: 3, removed: 1 }] });
  assert.equal(r.shape, "config-tweak");
});

test("single-module-edit: 1 source file, small delta, no export", () => {
  const r = classifySliceShape({
    files: [{ path: "src/scripts/lib/helper.mts", added: 20, removed: 5, exportDelta: 0 }]
  });
  assert.equal(r.shape, "single-module-edit");
});

test("test-only: all under src/tests", () => {
  const r = classifySliceShape({ files: [{ path: "src/tests/a.test.mts", added: 50, removed: 0 }] });
  assert.equal(r.shape, "test-only");
});

test("none: mixed file types", () => {
  const r = classifySliceShape({
    files: [
      { path: "src/scripts/lib/a.mts", added: 5, removed: 0 },
      { path: "docs/x.md", added: 5, removed: 0 }
    ]
  });
  assert.equal(r.shape, "none");
});

test("none: public-surface file forbidden from single-module-edit", () => {
  const r = classifySliceShape({
    files: [
      { path: "src/scripts/lib/auto-dispatch.mts", added: 10, removed: 0, exportDelta: 0 }
    ]
  });
  assert.equal(r.shape, "none");
  assert.match(r.rationale, /public-surface/);
});

test("none: gross LOC delta over threshold", () => {
  const r = classifySliceShape({
    files: [{ path: "src/scripts/lib/x.mts", added: 60, removed: 10, exportDelta: 0 }]
  });
  assert.equal(r.shape, "none");
});

test("none: export delta non-zero", () => {
  const r = classifySliceShape({
    files: [{ path: "src/scripts/lib/x.mts", added: 10, removed: 0, exportDelta: 1 }]
  });
  assert.equal(r.shape, "none");
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
bun test src/tests/classify-slice-shape.test.mts
```

Expected: FAIL with `Cannot find module 'classify-slice-shape'`.

- [ ] **Step 3: Implement `src/scripts/lib/classify-slice-shape.mts`**

```typescript
export type FileChange = {
  path: string;
  added: number;
  removed: number;
  exportDelta?: number;
};

export type Shape =
  | "doc-update"
  | "config-tweak"
  | "single-module-edit"
  | "test-only"
  | "none";

export type ClassifyResult = { shape: Shape; rationale: string };

const PUBLIC_SURFACE = new Set([
  "src/scripts/lib/auto-dispatch.mts",
  "src/scripts/lib/halt-badges.mts",
  "src/scripts/lib/auto-walker.mts"
]);

const SINGLE_MODULE_MAX_LOC = 50;

function isDoc(p: string) {
  return p.endsWith(".md") || p.startsWith("docs/");
}

function isConfig(p: string) {
  return (
    p === ".claude/loop.json" ||
    p.startsWith(".eslintrc") ||
    p.startsWith("prettier.config.") ||
    p.startsWith("tsconfig") && p.endsWith(".json")
  );
}

function isTest(p: string) {
  return p.startsWith("src/tests/");
}

function isSource(p: string) {
  return (p.endsWith(".mts") || p.endsWith(".mjs") || p.endsWith(".ts")) && !isTest(p);
}

export function classifySliceShape({ files }: { files: FileChange[] }): ClassifyResult {
  if (files.length === 0) return { shape: "none", rationale: "no files" };
  const paths = files.map((f) => f.path);
  if (paths.every(isDoc)) return { shape: "doc-update", rationale: "all changed files are docs/markdown" };
  if (paths.every(isConfig)) return { shape: "config-tweak", rationale: "all changed files are config" };
  if (paths.every(isTest)) return { shape: "test-only", rationale: "all changed files under src/tests/" };
  if (files.length === 1 && isSource(files[0]!.path)) {
    const f = files[0]!;
    if (PUBLIC_SURFACE.has(f.path)) {
      return { shape: "none", rationale: `public-surface file: ${f.path}` };
    }
    if ((f.exportDelta ?? 0) !== 0) {
      return { shape: "none", rationale: "exported symbols changed" };
    }
    if (f.added + f.removed > SINGLE_MODULE_MAX_LOC) {
      return { shape: "none", rationale: `gross LOC delta ${f.added + f.removed} > ${SINGLE_MODULE_MAX_LOC}` };
    }
    return { shape: "single-module-edit", rationale: "1 source file, small delta, no export change" };
  }
  return { shape: "none", rationale: "mixed file types" };
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
bun test src/tests/classify-slice-shape.test.mts
```

Expected: PASS (all eight cases).

- [ ] **Step 5: Wire `classify-slice-shape` subcommand in `src/scripts/loop.mts`**

Add to the subcommand dispatch:

```typescript
if (subcommand === "classify-slice-shape") {
  const { classifySliceShape } = await import("./lib/classify-slice-shape.mjs");
  const filesArg = parseFlag(args, "--files") || "";
  const files = filesArg
    .split(",")
    .filter(Boolean)
    .map((p) => ({ path: p.trim(), added: 0, removed: 0, exportDelta: 0 }));
  // Optional: derive added/removed/exportDelta from `git diff --numstat HEAD~1`
  // when --from-git is passed. For now caller supplies via --files only.
  const result = classifySliceShape({ files });
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  return;
}
```

- [ ] **Step 6: Smoke test CLI**

```bash
bun src/scripts/loop.mts classify-slice-shape --files "docs/a.md,docs/b.md"
```

Expected: `{ "shape": "doc-update", "rationale": "all changed files are docs/markdown" }`.

- [ ] **Step 7: Extend `dispatchLimits.preferInlineFor` in `.claude/loop.json`**

Find the existing array and update:

```json
"dispatchLimits": {
  "maxSubagentsPerSlice": 4,
  "preferInlineFor": [
    "single-file-edit",
    "test-fix",
    "lint-fix",
    "format-fix",
    "doc-update",
    "config-tweak",
    "single-module-edit",
    "test-only"
  ]
}
```

- [ ] **Step 8: Write `commands/classify-slice-shape.md`**

```markdown
---
description: Classify a slice's changed-file set into an inline-friendly shape.
---

# Classify Slice Shape

Returns a shape tag describing what kind of edit a slice contains. The orchestrator uses the result to decide whether the inline path is appropriate.

Usage:

\`\`\`bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" classify-slice-shape \
  --repo "$PWD" \
  --files "a.mts,b.md"
\`\`\`

Returns JSON: `{ "shape": "...", "rationale": "..." }`.

Shapes: `doc-update`, `config-tweak`, `single-module-edit`, `test-only`, `none`.

See `docs/sop/inline-criteria.md` for the full rule set and the public-surface guard list.
```

(Replace the escaped backticks with real ones when saving.)

- [ ] **Step 9: Write `docs/sop/inline-criteria.md`**

```markdown
# SOP: Inline-path criteria for slice ceremony

**Status:** active.
**Origin:** SLICE-94 (FEAT-throughput-2x).

## Purpose

When a slice's changed-file set fits one of the shapes below, the loop ceremony may take the inline path — lead writes review + validation artifacts inline rather than dispatching specialist subagents. The path is advisory; the orchestrator can override with rationale logged to grade.

## Shape rules

| Shape | Rule |
|---|---|
| `doc-update` | All changed files match `*.md` or live under `docs/**`. |
| `config-tweak` | All changed files are `.claude/loop.json`, `.eslintrc*`, `prettier.config.*`, or `tsconfig*.json`. |
| `single-module-edit` | Exactly 1 source file, gross LOC delta (added + removed) ≤ 50, no exported symbols added or removed, file not on the public-surface guard list. |
| `test-only` | All changed files match `src/tests/**`. |
| `none` | Anything else. |

## Public-surface guard list

These files cannot qualify for `single-module-edit` because they participate in the cross-plugin contract (SPEC-003) or carry behavior other modules consume directly:

- `src/scripts/lib/auto-dispatch.mts`
- `src/scripts/lib/halt-badges.mts`
- `src/scripts/lib/auto-walker.mts`

Audit this list quarterly. Add modules when they grow public surface.

## Integration

Call from slice ceremony:

\`\`\`bash
bun src/scripts/loop.mts classify-slice-shape --files "<comma-separated paths>"
\`\`\`

If the returned shape is in `loop.json.dispatchLimits.preferInlineFor`, the orchestrator should consider the inline path.
```

- [ ] **Step 10: Commit**

```bash
git add src/scripts/lib/classify-slice-shape.mts src/scripts/loop.mts src/tests/classify-slice-shape.test.mts commands/classify-slice-shape.md docs/sop/inline-criteria.md .claude/loop.json
git commit -m "feat(loop): classify-slice-shape CLI + expanded inline criteria (SLICE-94)"
```

---

## Task 5: Post-Builder Fanout (SLICE-95)

**Files:**
- Create: `src/scripts/lib/post-builder-fanout.mts`
- Create: `src/tests/post-builder-fanout.test.mts`
- Modify: `src/scripts/loop.mts`
- Create: `commands/slice-post-builder-fanout.md`
- Modify: `commands/slice-complete.md`
- Modify: `.claude/loop.json` (`slice.postBuilderFanout`)

**Config flag added:** `slice.postBuilderFanout` (default `true`).

- [ ] **Step 1: Write failing fanout test**

Create `src/tests/post-builder-fanout.test.mts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { buildPostBuilderFanout } from "../scripts/lib/post-builder-fanout.mjs";

async function makeRepo() {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "fanout-"));
  const sliceDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/in-progress");
  await fs.mkdir(sliceDir, { recursive: true });
  await fs.writeFile(
    path.join(sliceDir, "SLICE_99_test.md"),
    "---\nid: SLICE-99\nfeature: FEAT-001\n---\n# SLICE-99\n## Files\n- src/a.mts\n"
  );
  return repo;
}

test("emits N+1 tasks (reviewer-A, reviewer-B, validator)", async () => {
  const repo = await makeRepo();
  const out = await buildPostBuilderFanout(repo, "SLICE-99");
  assert.equal(out.tasks.length, 3);
  const roles = out.tasks.map((t) => t.role);
  assert.deepEqual(roles.sort(), ["reviewer-A", "reviewer-B", "validator"]);
  const subagents = out.tasks.map((t) => t.subagent_type);
  assert.ok(subagents.includes("crew:verifier"));
  assert.equal(subagents.filter((s) => s === "crew:inspector").length, 2);
  await fs.rm(repo, { recursive: true, force: true });
});

test("validator prompt independent of reviewers (no reviewer artifact refs)", async () => {
  const repo = await makeRepo();
  const out = await buildPostBuilderFanout(repo, "SLICE-99");
  const validator = out.tasks.find((t) => t.role === "validator")!;
  assert.ok(!/reviewer-[AB]/i.test(validator.prompt));
  assert.ok(!/reviews\//.test(validator.prompt));
  await fs.rm(repo, { recursive: true, force: true });
});

test("instructions reuse PARALLEL_DISPATCH_CONTRACT v1", async () => {
  const repo = await makeRepo();
  const out = await buildPostBuilderFanout(repo, "SLICE-99");
  assert.ok(out.instructions.includes("PARALLEL_DISPATCH_CONTRACT v1"));
  assert.ok(out.instructions.includes("N=3"));
  await fs.rm(repo, { recursive: true, force: true });
});

test("aggregation rules match contract", async () => {
  const repo = await makeRepo();
  const out = await buildPostBuilderFanout(repo, "SLICE-99");
  assert.deepEqual(out.aggregation, { halt_on_any_FAIL: true, wait_for_all: true });
  await fs.rm(repo, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
bun test src/tests/post-builder-fanout.test.mts
```

Expected: FAIL with `Cannot find module 'post-builder-fanout'`.

- [ ] **Step 3: Implement `src/scripts/lib/post-builder-fanout.mts`**

```typescript
import fs from "node:fs/promises";
import path from "node:path";

import { resolveConfig } from "./config-resolver.mjs";
import { parseFrontmatter } from "./frontmatter.mjs";
import { locateSliceFile, slicesRoot as resolveSlicesRoot } from "./paths.mjs";

export type FanoutTask = {
  role: "reviewer-A" | "reviewer-B" | "validator";
  subagent_type: "crew:inspector" | "crew:verifier";
  description: string;
  prompt: string;
};

export type FanoutResult = {
  sliceId: string;
  tasks: FanoutTask[];
  instructions: string;
  aggregation: { halt_on_any_FAIL: true; wait_for_all: true };
};

function reviewerPrompt(sliceId: string, slicePathRel: string, role: "A" | "B"): string {
  const focus =
    role === "A"
      ? "Correctness, regressions, and explicit coverage of each acceptance criterion."
      : "Production-readiness, observability, security posture, edge cases.";
  return [
    `You are Reviewer ${role} on the post-builder fanout for slice ${sliceId}.`,
    `**Slice file**: \`${slicePathRel}\``,
    "",
    "**Focus**:",
    focus,
    "",
    "Read the builder handoff (latest in .claude/artifacts/crew/handoffs/ for this slice).",
    "Write your verdict via `crew write-review-result`. Do NOT pause without writing the artifact."
  ].join("\n");
}

function validatorPrompt(sliceId: string, slicePathRel: string): string {
  return [
    `You are the Validator on the post-builder fanout for slice ${sliceId}.`,
    `**Slice file**: \`${slicePathRel}\``,
    "",
    "Run `bun src/scripts/loop.mts phase-gate --repo \"$PWD\" --slice " + sliceId + "` to gather evidence.",
    "Write your verdict via `crew write-validation-result`.",
    "",
    "You run INDEPENDENTLY of the reviewers. Do not read review artifacts. Verdict is based on behavior evidence only."
  ].join("\n");
}

export async function buildPostBuilderFanout(
  repoPath: string,
  sliceId: string
): Promise<FanoutResult> {
  const config = await resolveConfig(repoPath).catch(() => null);
  const slicesRootDir = resolveSlicesRoot(repoPath, config);
  const sliceFile = await locateSliceFile(slicesRootDir, sliceId);
  if (!sliceFile) throw new Error(`Slice not found: ${sliceId}`);
  const sliceContent = await fs.readFile(sliceFile, "utf8");
  parseFrontmatter(sliceContent); // sanity parse
  const slicePathRel = path.relative(repoPath, sliceFile).replace(/\\/g, "/");

  const tasks: FanoutTask[] = [
    {
      role: "reviewer-A",
      subagent_type: "crew:inspector",
      description: `Reviewer A review of ${sliceId} (fanout)`,
      prompt: reviewerPrompt(sliceId, slicePathRel, "A")
    },
    {
      role: "reviewer-B",
      subagent_type: "crew:inspector",
      description: `Reviewer B review of ${sliceId} (fanout)`,
      prompt: reviewerPrompt(sliceId, slicePathRel, "B")
    },
    {
      role: "validator",
      subagent_type: "crew:verifier",
      description: `Validator behavior check of ${sliceId} (fanout)`,
      prompt: validatorPrompt(sliceId, slicePathRel)
    }
  ];

  const contract = [
    "PARALLEL_DISPATCH_CONTRACT v1",
    `required: emit exactly ONE message containing N=${tasks.length} Agent tool calls`,
    "forbidden: send any message between dispatches",
    "forbidden: wait for one return before next dispatch",
    "violation: serial-reviewer-warning badge logged to grade"
  ].join("\n");

  return {
    sliceId,
    tasks,
    instructions: `${contract}\n\nAggregate: any reviewer FAIL halts slice; validator FAIL halts slice; all PASS continues to grade.`,
    aggregation: { halt_on_any_FAIL: true, wait_for_all: true }
  };
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
bun test src/tests/post-builder-fanout.test.mts
```

Expected: PASS (all four cases).

- [ ] **Step 5: Wire `slice post-builder-fanout` subcommand in `src/scripts/loop.mts`**

Find the `slice` subcommand dispatcher (next to `slice review-ladder`). Add:

```typescript
if (subSubcommand === "post-builder-fanout") {
  const { buildPostBuilderFanout } = await import("./lib/post-builder-fanout.mjs");
  const repo = parseFlag(args, "--repo") || process.cwd();
  const id = parseFlag(args, "--id");
  if (!id) throw new Error("--id required");
  const result = await buildPostBuilderFanout(repo, id);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  return;
}
```

- [ ] **Step 6: Smoke test CLI**

Create a throwaway slice file under `.claude/artifacts/loop/ai-loop/slices/in-progress/SLICE_99_smoke.md`:

```bash
mkdir -p .claude/artifacts/loop/ai-loop/slices/in-progress
printf -- "---\nid: SLICE-99\n---\n# SLICE-99 smoke\n" > .claude/artifacts/loop/ai-loop/slices/in-progress/SLICE_99_smoke.md
bun src/scripts/loop.mts slice post-builder-fanout --repo "$PWD" --id SLICE-99
rm .claude/artifacts/loop/ai-loop/slices/in-progress/SLICE_99_smoke.md
```

Expected: JSON with `tasks: [3 entries]`, `instructions: "PARALLEL_DISPATCH_CONTRACT v1\n..."`, `aggregation: { halt_on_any_FAIL: true, wait_for_all: true }`.

- [ ] **Step 7: Add `slice.postBuilderFanout` config block to `.claude/loop.json`**

```json
"slice": {
  "postBuilderFanout": true
}
```

(If a `slice` key already exists, merge the new key into it instead of overwriting.)

- [ ] **Step 8: Write `commands/slice-post-builder-fanout.md`**

```markdown
---
description: Emit a single parallel-dispatch payload with reviewers A+B and the validator after builder PASS.
---

# Slice — Post-Builder Fanout

Replaces the serial reviewer-A → reviewer-B → validator sequence with a single parallel dispatch of all three.

Usage:

\`\`\`bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice post-builder-fanout \
  --repo "$PWD" \
  --id SLICE-91
\`\`\`

Returns `{ sliceId, tasks[3], instructions, aggregation }`. The orchestrator emits one message with three Agent tool calls — one per task.

Validator runs independently of reviewers; it does NOT read review artifacts. Wasted-dispatch cost on FAIL slices is acceptable per the design spec.

Config: `slice.postBuilderFanout` in `.claude/loop.json` (default `true`). Flip to `false` to revert to the serial ladder.
```

- [ ] **Step 9: Update `commands/slice-complete.md` aggregation section**

Add a section describing the new aggregation when fanout is on:

```markdown
## Aggregation (post-builder fanout)

When `slice.postBuilderFanout: true` (default), the ceremony dispatches reviewers A+B and the validator in parallel after builder PASS. Slice rules:

- Wait for all three artifacts to land.
- Any reviewer FAIL halts the slice. Validator result preserved (informational).
- Validator FAIL halts the slice. Reviewer results preserved.
- All PASS continues to grade.

The validator prompt does not reference reviewer artifact paths — verdict is based on phase-gate evidence only.
```

- [ ] **Step 10: Run full test suite**

```bash
bun test src/tests/ --timeout 60000
```

Expected: PASS. No existing tests regress.

- [ ] **Step 11: Commit**

```bash
git add src/scripts/lib/post-builder-fanout.mts src/scripts/loop.mts src/tests/post-builder-fanout.test.mts commands/slice-post-builder-fanout.md commands/slice-complete.md .claude/loop.json
git commit -m "feat(loop): post-builder fanout — reviewers || validator (SLICE-95)"
```

---

## Final Verification (after all five tasks)

- [ ] **Step F1: Run full suite + lint + format + typecheck**

```bash
bun test src/tests/ --parallel --timeout 60000 && bun run lint && bun run format:check && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit
```

Expected: all green.

- [ ] **Step F2: Confirm config flags are togglable**

For each flag, flip to `false` in `.claude/loop.json`, run the relevant CLI, and confirm the legacy behavior kicks in:

- `reviewers.strictParallel: false` → `bun src/scripts/loop.mts slice review-ladder --id SLICE-X` should still produce the contract block (lever 1 always emits; flag controls only the badge in detector).
- `reviewers.serialTimingThresholdMs: 0` → detector matches every slice (smoke-only).
- `phaseGate.parallel: false` → phase-gate falls back to serial path.
- `dispatchLimits.expandedInlineCriteria: false` → classify-slice-shape still runs; orchestrator ignores the hint.
- `slice.postBuilderFanout: false` → fanout CLI still runs on request but ceremony skips it by default.

Flip every flag back to `true` after the smoke pass.

- [ ] **Step F3: Capture baseline run for AC-1 measurement**

```bash
bun src/scripts/loop.mts perf-report --repo "$PWD" --window 5 > .claude/artifacts/loop/perf-baseline-2026-06-11.json
```

This is the snapshot to compare against once 5 slices run on the new ceremony.

---

## Spec Coverage Check

| Spec section | Task |
|---|---|
| Lever 1 (strict parallel contract) | Task 3 step 3 |
| Lever 2 (serial-reviewer detector) | Task 3 steps 7+9 |
| Lever 3 (classify-slice-shape + inline criteria) | Task 4 |
| Lever 4 (phase-gate parallelization) | Task 2 |
| Lever 5 (post-builder fanout) | Task 5 |
| Telemetry (grade frontmatter + perf-report CLI) | Task 1 |
| Baseline pinning | Task 1 step 11 |
| AC-1 wall-clock measure | Task 1 (telemetry seed) + Task F3 baseline capture |
| AC-4 flags togglable | Task F2 |
| AC-5 inline-path adoption % | Task 1 perf-report `inlinePathPct` |

All spec sections covered.
