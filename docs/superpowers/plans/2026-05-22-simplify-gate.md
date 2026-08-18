# Simplify Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `featureEnd` to carry `simplifyRan`, add writer/reader helpers to persist the ceremony, and guard `completeSlice` from moving a feature to `done/` when `simplifyRan` is false.

**Architecture:** Three isolated changes: (1) extend pure `featureEnd` function, (2) add IO writer/reader in `ceremonies.mjs`, (3) add simplify gate check in `slice-linker.mjs::completeSlice` alongside the existing crew-blocking-gates check. Loop skill wiring is out of scope.

**Tech Stack:** Node.js ESM, `node:fs/promises`, `node:test`, `node:assert/strict`

---

## File Structure

| Action | Path | Change |
|--------|------|--------|
| Modify | `scripts/lib/ceremonies.mjs` | Extend `featureEnd`, add `writeFeatureEndCeremony`, `readFeatureEndCeremony`, add `fs`/`path` imports |
| Modify | `scripts/lib/slice-linker.mjs` | Import `readFeatureEndCeremony`, add simplify gate into `completeSlice` |
| Modify | `tests/ceremonies.test.mjs` | 7 new tests for featureEnd opts + writer + reader |
| Modify | `tests/slice-complete.test.mjs` | 3 new tests for simplify gate in completeSlice |

---

## Task 1: Extend `featureEnd` to accept opts

**Files:**
- Modify: `tests/ceremonies.test.mjs` — append 3 failing tests
- Modify: `scripts/lib/ceremonies.mjs` — extend `featureEnd` signature

- [ ] **Step 1: Append 3 failing tests to `tests/ceremonies.test.mjs`**

Add after the last existing test in the file:

```js
// --- featureEnd opts ---

test("featureEnd with no opts defaults simplifyRan to false", () => {
  const result = featureEnd({ id: "FEAT-005", title: "csharp-conventions", phase: "2" });
  assert.equal(result.simplifyRan, false);
});

test("featureEnd with simplifyRan: true forwards the flag", () => {
  const result = featureEnd(
    { id: "FEAT-005", title: "csharp-conventions", phase: "2" },
    { simplifyRan: true }
  );
  assert.equal(result.simplifyRan, true);
});

test("featureEnd with simplifyRan: false explicit preserves false", () => {
  const result = featureEnd(
    { id: "FEAT-005", title: "csharp-conventions", phase: "2" },
    { simplifyRan: false }
  );
  assert.equal(result.simplifyRan, false);
});
```

- [ ] **Step 2: Run — confirm 3 new tests fail**

```
node --test tests/ceremonies.test.mjs
```

Expected: 10 pass (existing), 3 fail (`simplifyRan is not a property` or similar)

- [ ] **Step 3: Extend `featureEnd` in `scripts/lib/ceremonies.mjs`**

Replace the existing `featureEnd` function (lines 42-53) with:

```js
/**
 * @param {{ id: string, title: string, phase: string }} feat
 * @param {{ simplifyRan?: boolean }} [opts]
 * @returns {{ type: string, id: string, timestamp: string, status: string, simplifyRan: boolean }}
 */
export function featureEnd(feat, opts = {}) {
  return {
    type: "feature-end",
    id: feat.id,
    timestamp: new Date().toISOString(),
    status: "scaffold",
    simplifyRan: opts.simplifyRan ?? false
  };
}
```

- [ ] **Step 4: Run — confirm all 13 pass**

```
node --test tests/ceremonies.test.mjs
```

Expected: 13 pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/ceremonies.mjs tests/ceremonies.test.mjs
git commit -m "feat(ceremonies): extend featureEnd with simplifyRan opt"
```

---

## Task 2: Add `writeFeatureEndCeremony` and `readFeatureEndCeremony`

**Files:**
- Modify: `scripts/lib/ceremonies.mjs` — add `fs`/`path` imports + 2 new exports
- Modify: `tests/ceremonies.test.mjs` — append 4 failing tests

- [ ] **Step 1: Append 4 failing tests to `tests/ceremonies.test.mjs`**

Add after the last test in the file. These tests need `fs`, `os`, `path` — add the imports at the top of the file alongside the existing imports:

```js
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
```

Then import the new functions in the existing import block:

```js
import {
  phaseStart,
  phaseEnd,
  featureStart,
  featureEnd,
  renderTree,
  writeFeatureEndCeremony,
  readFeatureEndCeremony,
} from "../scripts/lib/ceremonies.mjs";
```

Then append the tests:

```js
// --- writeFeatureEndCeremony / readFeatureEndCeremony ---

test("writeFeatureEndCeremony writes JSON file at expected path", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "al-ceremonies-write-"));
  const result = featureEnd({ id: "FEAT-005", title: "csharp", phase: "2" }, { simplifyRan: true });
  const filePath = await writeFeatureEndCeremony(repo, result);
  assert.ok(filePath.includes("feature-end-FEAT-005"), "filename contains feature id");
  assert.ok(filePath.endsWith(".json"), "file is JSON");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  assert.equal(parsed.id, "FEAT-005");
  assert.equal(parsed.simplifyRan, true);
});

test("readFeatureEndCeremony returns null when no file exists", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "al-ceremonies-read-miss-"));
  const result = await readFeatureEndCeremony(repo, "FEAT-005");
  assert.equal(result, null);
});

test("readFeatureEndCeremony returns ceremony after write", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "al-ceremonies-read-"));
  const result = featureEnd({ id: "FEAT-007", title: "flutter", phase: "2" }, { simplifyRan: true });
  await writeFeatureEndCeremony(repo, result);
  const read = await readFeatureEndCeremony(repo, "FEAT-007");
  assert.ok(read !== null);
  assert.equal(read.id, "FEAT-007");
  assert.equal(read.simplifyRan, true);
});

test("readFeatureEndCeremony returns latest when multiple files exist", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "al-ceremonies-read-multi-"));
  // Write older ceremony first (simplifyRan: false)
  const older = featureEnd({ id: "FEAT-008", title: "ts", phase: "2" }, { simplifyRan: false });
  await writeFeatureEndCeremony(repo, older);
  // Small delay to ensure different timestamp
  await new Promise((r) => setTimeout(r, 10));
  // Write newer ceremony (simplifyRan: true)
  const newer = featureEnd({ id: "FEAT-008", title: "ts", phase: "2" }, { simplifyRan: true });
  await writeFeatureEndCeremony(repo, newer);
  const read = await readFeatureEndCeremony(repo, "FEAT-008");
  assert.equal(read.simplifyRan, true, "should return the latest ceremony");
});
```

- [ ] **Step 2: Run — confirm 4 new tests fail**

```
node --test tests/ceremonies.test.mjs
```

Expected: 13 pass (existing), 4 fail (functions not exported yet)

- [ ] **Step 3: Add imports + implement the two new functions in `scripts/lib/ceremonies.mjs`**

Add at the top of the file (before the typedef):

```js
import fs from "node:fs/promises";
import path from "node:path";
```

Add at the end of the file:

```js
/**
 * @param {string} repoPath
 * @param {{ type: string, id: string, timestamp: string, status: string, simplifyRan: boolean }} result
 * @returns {Promise<string>} written file path
 */
export async function writeFeatureEndCeremony(repoPath, result) {
  const dir = path.join(repoPath, ".claude", "artifacts", "crew", "ceremonies");
  await fs.mkdir(dir, { recursive: true });
  const stamp = result.timestamp.replace(/[^0-9]/g, "");
  const filename = `feature-end-${result.id}-${stamp}.json`;
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, JSON.stringify(result, null, 2));
  return filePath;
}

/**
 * @param {string} repoPath
 * @param {string} featureId
 * @returns {Promise<{ type: string, id: string, timestamp: string, status: string, simplifyRan: boolean } | null>}
 */
export async function readFeatureEndCeremony(repoPath, featureId) {
  const dir = path.join(repoPath, ".claude", "artifacts", "crew", "ceremonies");
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }
  const prefix = `feature-end-${featureId}-`;
  const matches = entries.filter((e) => e.startsWith(prefix) && e.endsWith(".json"));
  if (matches.length === 0) return null;
  const ceremonies = await Promise.all(
    matches.map(async (filename) => {
      const raw = await fs.readFile(path.join(dir, filename), "utf8");
      return JSON.parse(raw);
    })
  );
  ceremonies.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return ceremonies[0];
}
```

- [ ] **Step 4: Run — confirm all 17 pass**

```
node --test tests/ceremonies.test.mjs
```

Expected: 17 pass, 0 fail

- [ ] **Step 5: Run full suite — confirm no regressions**

```
npm test
```

Expected: all existing tests pass + 7 new (17 in ceremonies suite)

- [ ] **Step 6: Run lint**

```
npm run lint
```

Expected: no new errors

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/ceremonies.mjs tests/ceremonies.test.mjs
git commit -m "feat(ceremonies): add writeFeatureEndCeremony + readFeatureEndCeremony"
```

---

## Task 3: Add simplify gate to `completeSlice`

**Files:**
- Modify: `scripts/lib/slice-linker.mjs` — import + gate logic at lines ~7-18 and ~265-287
- Modify: `tests/slice-complete.test.mjs` — append 3 failing tests

- [ ] **Step 1: Append 3 failing tests to `tests/slice-complete.test.mjs`**

Add these imports at the top of the file alongside existing ones:

```js
import { writeFeatureEndCeremony, featureEnd } from "../scripts/lib/ceremonies.mjs";
```

Then append the tests:

```js
test("completeSlice blocked when featureEnd ceremony has simplifyRan: false", async () => {
  const repo = await tmpRepo("al-slice-simplify-blocked-");
  const feat = await addFeature(repo, { title: "Simplify gate test" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // Write a ceremony with simplifyRan: false
  const ceremony = featureEnd({ id: feat.id, title: "Simplify gate test", phase: "2" }, { simplifyRan: false });
  await writeFeatureEndCeremony(repo, ceremony);
  const result = await completeSlice(repo, slice.id);
  // Slice still moves but feature is blocked
  assert.match(result.slice.to, /completed[\\/]SLICE_/);
  assert.equal(result.feature.skipped, true);
  assert.ok(result.feature.reason.includes("simplify-gate"), `expected simplify-gate in reason, got: ${result.feature.reason}`);
});

test("completeSlice allowed when featureEnd ceremony has simplifyRan: true", async () => {
  const repo = await tmpRepo("al-slice-simplify-allowed-");
  const feat = await addFeature(repo, { title: "Simplify passed" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // Write a ceremony with simplifyRan: true
  const ceremony = featureEnd({ id: feat.id, title: "Simplify passed", phase: "2" }, { simplifyRan: true });
  await writeFeatureEndCeremony(repo, ceremony);
  const result = await completeSlice(repo, slice.id);
  // Feature should move to done normally
  assert.ok(!result.feature.skipped, "feature should not be skipped");
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
});

test("completeSlice allowed when no featureEnd ceremony exists", async () => {
  const repo = await tmpRepo("al-slice-simplify-no-ceremony-");
  const feat = await addFeature(repo, { title: "No ceremony" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // No ceremony written — feature is still in-progress
  const result = await completeSlice(repo, slice.id);
  // Should complete normally (no ceremony = no gate)
  assert.ok(!result.feature.skipped, "no ceremony should not block");
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
});
```

- [ ] **Step 2: Run — confirm 3 new tests fail**

```
node --test tests/slice-complete.test.mjs
```

Expected: existing tests pass, 3 new tests fail (gate not implemented yet)

- [ ] **Step 3: Add import to `scripts/lib/slice-linker.mjs`**

Add `readFeatureEndCeremony` to the existing imports at the top of the file. The current imports end at line ~18. Add to the existing import from ceremonies when it exists, or add a new import line after line 18:

```js
import { readFeatureEndCeremony } from "./ceremonies.mjs";
```

- [ ] **Step 4: Add simplify gate into `completeSlice` in `scripts/lib/slice-linker.mjs`**

Find this block (around lines 269-287):

```js
  const blockingGates = await readCrewBlockingGates(repoPath);
  const isBlocked = Boolean(blockingGates.blocked || blockingGates.escalated);

  const targetSlicePath = await moveAndStampSlice({
    sliceFile,
    sliceContent,
    sliceFm,
    slicesRoot,
    today
  });
  const featureResult = isBlocked
    ? {
        skipped: true,
        reason: blockingGates.escalated
          ? `crew run escalated_to_human: ${blockingGates.escalated.note || ""}`
          : `crew run blocked: ${blockingGates.blocked?.note || ""}`,
        blockingGates
      }
    : await moveFeatureToDone(repoPath, featureId, config);
```

Replace with:

```js
  const blockingGates = await readCrewBlockingGates(repoPath);
  const isBlocked = Boolean(blockingGates.blocked || blockingGates.escalated);

  const simplifyCeremony = await readFeatureEndCeremony(repoPath, featureId);
  const isSimplifyBlocked = Boolean(simplifyCeremony && simplifyCeremony.simplifyRan === false);

  const targetSlicePath = await moveAndStampSlice({
    sliceFile,
    sliceContent,
    sliceFm,
    slicesRoot,
    today
  });
  const featureResult = isBlocked || isSimplifyBlocked
    ? {
        skipped: true,
        reason: isBlocked
          ? blockingGates.escalated
            ? `crew run escalated_to_human: ${blockingGates.escalated.note || ""}`
            : `crew run blocked: ${blockingGates.blocked?.note || ""}`
          : "simplify-gate: featureEnd ceremony exists but simplifyRan is false",
        blockingGates: isBlocked ? blockingGates : null,
        simplifyGate: isSimplifyBlocked ? { simplifyRan: false } : null
      }
    : await moveFeatureToDone(repoPath, featureId, config);
```

- [ ] **Step 5: Run — confirm 3 new slice-complete tests pass**

```
node --test tests/slice-complete.test.mjs
```

Expected: all existing + 3 new pass, 0 fail

- [ ] **Step 6: Run full suite — confirm no regressions**

```
npm test
```

Expected: 204 + 10 = ~214 pass (17 ceremonies + 3 new slice-complete), 0 fail

- [ ] **Step 7: Run lint**

```
npm run lint
```

Expected: no new errors

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/slice-linker.mjs tests/slice-complete.test.mjs
git commit -m "feat(simplify-gate): block feature completion until simplifyRan is true"
```
