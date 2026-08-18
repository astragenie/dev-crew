# Ceremonies & Tree Formatter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `scripts/lib/ceremonies.mjs` — 4 scaffold ceremony stubs + `renderTree` ASCII tree renderer — with full test coverage.

**Architecture:** Single pure-utility module, no imports from other crew modules, no side effects. Ceremony stubs return a typed object. `renderTree` converts a phase/feature/slice data structure to an ASCII tree string. Both are scaffold-only: no gate logic, no file writes, no state mutation.

**Tech Stack:** Node.js ESM, `node:test`, `node:assert/strict`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `scripts/lib/ceremonies.mjs` | Ceremony stubs + tree renderer |
| Create | `tests/ceremonies.test.mjs` | Shape tests + tree renderer tests |

No other files touched.

---

## Task 1: Write failing tests for ceremony stubs

**Files:**
- Create: `tests/ceremonies.test.mjs`

- [ ] **Step 1: Create the test file**

```js
// tests/ceremonies.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

import {
  phaseStart,
  phaseEnd,
  featureStart,
  featureEnd,
  renderTree,
} from "../scripts/lib/ceremonies.mjs";

// --- ceremony stubs ---

test("phaseStart returns scaffold ceremony object", () => {
  const result = phaseStart({ id: "2", title: "Domain build-out" });
  assert.equal(result.type, "phase-start");
  assert.equal(result.id, "2");
  assert.equal(result.status, "scaffold");
  assert.ok(typeof result.timestamp === "string", "timestamp must be a string");
  assert.ok(result.timestamp.includes("T"), "timestamp must be ISO 8601");
});

test("phaseEnd returns scaffold ceremony object", () => {
  const result = phaseEnd({ id: "3", title: "Workflow polish" });
  assert.equal(result.type, "phase-end");
  assert.equal(result.id, "3");
  assert.equal(result.status, "scaffold");
  assert.ok(typeof result.timestamp === "string");
});

test("featureStart returns scaffold ceremony object", () => {
  const result = featureStart({ id: "FEAT-005", title: "csharp-conventions", phase: "2" });
  assert.equal(result.type, "feature-start");
  assert.equal(result.id, "FEAT-005");
  assert.equal(result.status, "scaffold");
  assert.ok(typeof result.timestamp === "string");
});

test("featureEnd returns scaffold ceremony object", () => {
  const result = featureEnd({ id: "FEAT-006", title: "flutter-conventions", phase: "2" });
  assert.equal(result.type, "feature-end");
  assert.equal(result.id, "FEAT-006");
  assert.equal(result.status, "scaffold");
  assert.ok(typeof result.timestamp === "string");
});
```

- [ ] **Step 2: Run the tests — confirm they fail with import error**

```
node --test tests/ceremonies.test.mjs
```

Expected: error — `Cannot find module '../scripts/lib/ceremonies.mjs'`

---

## Task 2: Implement ceremony stubs and make stub tests pass

**Files:**
- Create: `scripts/lib/ceremonies.mjs`

- [ ] **Step 1: Create the module with ceremony stubs only**

```js
// scripts/lib/ceremonies.mjs

/** @typedef {{ type: string, id: string, timestamp: string, status: 'scaffold' }} CeremonyResult */

/**
 * @param {{ id: string, title: string }} phase
 * @returns {CeremonyResult}
 */
export function phaseStart(phase) {
  return { type: "phase-start", id: phase.id, timestamp: new Date().toISOString(), status: "scaffold" };
}

/**
 * @param {{ id: string, title: string }} phase
 * @returns {CeremonyResult}
 */
export function phaseEnd(phase) {
  return { type: "phase-end", id: phase.id, timestamp: new Date().toISOString(), status: "scaffold" };
}

/**
 * @param {{ id: string, title: string, phase: string }} feat
 * @returns {CeremonyResult}
 */
export function featureStart(feat) {
  return { type: "feature-start", id: feat.id, timestamp: new Date().toISOString(), status: "scaffold" };
}

/**
 * @param {{ id: string, title: string, phase: string }} feat
 * @returns {CeremonyResult}
 */
export function featureEnd(feat) {
  return { type: "feature-end", id: feat.id, timestamp: new Date().toISOString(), status: "scaffold" };
}

/**
 * @param {Array<{ id: string, title: string, status: string, features: Array<{ id: string, title: string, status: string, slices: Array<{ id: string, title: string, status: string }> }> }>} phases
 * @returns {string}
 */
export function renderTree(phases) {
  // stub — implemented in Task 4
  return "";
}
```

- [ ] **Step 2: Run stub tests — confirm they pass**

```
node --test tests/ceremonies.test.mjs
```

Expected: 4 pass, `renderTree` tests not yet written.

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/ceremonies.mjs tests/ceremonies.test.mjs
git commit -m "feat(ceremonies): scaffold ceremony stubs + passing tests"
```

---

## Task 3: Write failing tests for renderTree

**Files:**
- Modify: `tests/ceremonies.test.mjs` — append tree renderer tests

- [ ] **Step 1: Append renderTree tests to the test file**

Add these tests after the last ceremony stub test:

```js
// --- renderTree ---

test("renderTree([]) returns empty string", () => {
  const result = renderTree([]);
  assert.equal(result, "");
});

test("renderTree single phase + single feature + no slices", () => {
  const result = renderTree([
    {
      id: "2",
      title: "Domain build-out",
      status: "in-progress",
      features: [
        { id: "FEAT-005", title: "csharp-conventions", status: "in-progress", slices: [] },
      ],
    },
  ]);
  const lines = result.split("\n");
  assert.equal(lines[0], "Phase 2 — Domain build-out [in-progress]");
  assert.equal(lines[1], "└── FEAT-005 csharp-conventions [in-progress]");
  assert.equal(lines.length, 2);
});

test("renderTree two features — first uses ├── last uses └──", () => {
  const result = renderTree([
    {
      id: "2",
      title: "Domain build-out",
      status: "in-progress",
      features: [
        { id: "FEAT-005", title: "csharp-conventions", status: "in-progress", slices: [] },
        { id: "FEAT-006", title: "flutter-conventions", status: "pending", slices: [] },
      ],
    },
  ]);
  const lines = result.split("\n");
  assert.equal(lines[1], "├── FEAT-005 csharp-conventions [in-progress]");
  assert.equal(lines[2], "└── FEAT-006 flutter-conventions [pending]");
});

test("renderTree feature with two slices — first ├── last └── indented under │", () => {
  const result = renderTree([
    {
      id: "2",
      title: "Domain build-out",
      status: "in-progress",
      features: [
        {
          id: "FEAT-005",
          title: "csharp-conventions",
          status: "in-progress",
          slices: [
            { id: "slice-001", title: "scaffold skill file", status: "done" },
            { id: "slice-002", title: "write acceptance tests", status: "active" },
          ],
        },
        { id: "FEAT-006", title: "flutter-conventions", status: "pending", slices: [] },
      ],
    },
  ]);
  const lines = result.split("\n");
  assert.equal(lines[1], "├── FEAT-005 csharp-conventions [in-progress]");
  assert.equal(lines[2], "│   ├── slice-001 scaffold skill file [done]");
  assert.equal(lines[3], "│   └── slice-002 write acceptance tests [active]");
  assert.equal(lines[4], "└── FEAT-006 flutter-conventions [pending]");
});

test("renderTree last feature with slices uses 4-space indent not │", () => {
  const result = renderTree([
    {
      id: "2",
      title: "Domain build-out",
      status: "in-progress",
      features: [
        {
          id: "FEAT-005",
          title: "csharp-conventions",
          status: "in-progress",
          slices: [
            { id: "slice-001", title: "scaffold skill file", status: "done" },
            { id: "slice-002", title: "write acceptance tests", status: "active" },
          ],
        },
      ],
    },
  ]);
  const lines = result.split("\n");
  assert.equal(lines[1], "└── FEAT-005 csharp-conventions [in-progress]");
  assert.equal(lines[2], "    ├── slice-001 scaffold skill file [done]");
  assert.equal(lines[3], "    └── slice-002 write acceptance tests [active]");
});

test("renderTree two phases separated by blank line", () => {
  const result = renderTree([
    {
      id: "2",
      title: "Domain build-out",
      status: "in-progress",
      features: [
        { id: "FEAT-005", title: "csharp-conventions", status: "in-progress", slices: [] },
      ],
    },
    {
      id: "3",
      title: "Workflow polish",
      status: "pending",
      features: [
        { id: "FEAT-008", title: "routing-table cadence", status: "pending", slices: [] },
      ],
    },
  ]);
  const lines = result.split("\n");
  // blank line between phases
  assert.equal(lines[2], "");
  assert.equal(lines[3], "Phase 3 — Workflow polish [pending]");
});
```

- [ ] **Step 2: Run tests — confirm renderTree tests fail**

```
node --test tests/ceremonies.test.mjs
```

Expected: 4 pass (stubs), 6 fail (renderTree returns `""` stub).

---

## Task 4: Implement renderTree and make all tests pass

**Files:**
- Modify: `scripts/lib/ceremonies.mjs` — replace the `renderTree` stub body

- [ ] **Step 1: Replace the renderTree stub with full implementation**

Replace the `renderTree` function body (keep the JSDoc):

```js
export function renderTree(phases) {
  if (!phases || phases.length === 0) return "";

  const lines = [];

  for (let pi = 0; pi < phases.length; pi++) {
    const phase = phases[pi];
    if (pi > 0) lines.push("");
    lines.push(`Phase ${phase.id} — ${phase.title} [${phase.status}]`);

    const features = phase.features ?? [];
    for (let fi = 0; fi < features.length; fi++) {
      const feat = features[fi];
      const isLastFeat = fi === features.length - 1;
      const featBranch = isLastFeat ? "└" : "├";
      lines.push(`${featBranch}── ${feat.id} ${feat.title} [${feat.status}]`);

      const slices = feat.slices ?? [];
      const sliceIndent = isLastFeat ? "    " : "│   ";
      for (let si = 0; si < slices.length; si++) {
        const slice = slices[si];
        const isLastSlice = si === slices.length - 1;
        const sliceBranch = isLastSlice ? "└" : "├";
        lines.push(`${sliceIndent}${sliceBranch}── ${slice.id} ${slice.title} [${slice.status}]`);
      }
    }
  }

  return lines.join("\n");
}
```

- [ ] **Step 2: Run all tests — confirm all 10 pass**

```
node --test tests/ceremonies.test.mjs
```

Expected output:
```
✔ phaseStart returns scaffold ceremony object
✔ phaseEnd returns scaffold ceremony object
✔ featureStart returns scaffold ceremony object
✔ featureEnd returns scaffold ceremony object
✔ renderTree([]) returns empty string
✔ renderTree single phase + single feature + no slices
✔ renderTree two features — first uses ├── last uses └──
✔ renderTree feature with two slices — first ├── last └── indented under │
✔ renderTree last feature with slices uses 4-space indent not │
✔ renderTree two phases separated by blank line

ℹ tests 10
ℹ pass 10
ℹ fail 0
```

- [ ] **Step 3: Run full test suite — confirm no regressions**

```
npm test
```

Expected: all existing tests still pass + 10 new.

- [ ] **Step 4: Run lint**

```
npm run lint
```

Expected: no warnings, no errors.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/ceremonies.mjs tests/ceremonies.test.mjs
git commit -m "feat(ceremonies): implement renderTree + full test coverage"
```
