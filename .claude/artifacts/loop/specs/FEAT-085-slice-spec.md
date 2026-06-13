# Spec: FEAT-085 — Confidence Reporting per Slice (Traffic-Light Signal in loop brief)

## Metadata
- developer_type: agent
- estimated_complexity: low
- languages: [typescript]
- feature: FEAT-085
- date_created: 2026-06-13

---

## Objective

Expose the prospective confidence signal (green/yellow/red) for the next-to-slice item in the `loop brief` JSON output. The heuristic computation (`computeConfidence`) and its wiring into `startSlice` already exist. The gap is that `buildBrief` — the function backing `bun loop.mts brief` — does not surface any confidence field, so operators and dashboards have no pre-start confidence signal without first running `slice start`.

This slice adds a `sliceStartConfidence` block to the `buildBrief` return shape. The block describes the confidence verdict for the highest-priority triaged feature that would be sliced next. No new heuristic logic is introduced; all computation delegates to the existing `computeConfidence` function in `src/scripts/lib/confidence-signal.mts`.

---

## Context

### Existing code — read before editing

| File | Role |
|---|---|
| `src/scripts/lib/confidence-signal.mts` | Exports `computeConfidence(ConfidenceInputs): ConfidenceResult`. Already implemented and tested. DO NOT modify its logic or types. |
| `src/scripts/lib/brief.mts` | Exports `buildBrief(repoPath, opts)`. Target file. Returns the JSON object printed by `bun loop.mts brief`. Currently has no confidence field in its return shape. |
| `src/scripts/lib/backlog-parser.mts` | Exports `filterBacklog` and `comparePickOrder`. `buildBrief` already calls these to derive `topTriaged`. |
| `src/scripts/lib/grade-parser.mts` | Exports `listGrades` and `SCORE_DIMENSIONS`. `buildBrief` already calls this; the local `computeGradeSignal` already computes `avgRecent`. |
| `src/scripts/lib/start-slice.mts` | Already wires `computeConfidence` for `startSlice`; shows the exact pattern for deriving `recentGradeAvg` from grade trend scores (see `computeRecentGradeAvg`, line 72). |
| `src/tests/confidence-signal.test.mts` | Existing passing tests for `computeConfidence`. DO NOT modify. |
| `src/tests/brief.test.mts` | Existing passing tests for `buildBrief`. New tests must be added here. |

### Key types (from `confidence-signal.mts`, already exported — quote, do not re-declare)

```typescript
export type Confidence = "green" | "yellow" | "red";

export interface ConfidenceInputs {
  autonomousSafe: boolean | null;
  acCount: number;
  recentGradeAvg: number | null;
  dependsOnCount: number;
}

export interface ConfidenceResult {
  confidence: Confidence;
  reason: string;
}
```

### How `recentGradeAvg` is computed in `start-slice.mts` (lines 72–76)

```typescript
function computeRecentGradeAvg(scores: Array<{ sliceId: string; avg: number }>): number | null {
  if (!scores || scores.length === 0) return null;
  const recent = scores.slice(-3);
  return recent.reduce((sum, s) => sum + s.avg, 0) / recent.length;
}
```

`buildBrief` already calls `listGrades` and its local `computeGradeSignal` produces `grades.avgRecent` (average of last 5 grades across all SCORE_DIMENSIONS). Use `grades.avgRecent` as `recentGradeAvg` for brief-level confidence — it is already available in the function body without any new I/O.

### How `acCount` is derived

The existing `buildBrief` call chain does NOT parse slice file content; it works from FEAT frontmatter only. `acCount` for the brief-level signal must therefore come from the FEAT file's `slices` array length as a proxy — but this is unreliable. The correct approach: use the FEAT frontmatter `slices: []` count and `autonomous_safe` flag only; set `acCount` to a sentinel value (`1`) when no slice file content is available, so the signal degrades gracefully to yellow/green rather than always firing red. See AC-003 for exact sentinel behavior.

---

## Implementation Contract

### Inputs to `buildBrief` (unchanged)

```typescript
buildBrief(repoPath: string, opts?: { config?: Record<string, any> | null }): Promise<BriefResult>
```

No new parameters. The confidence block is derived from data already gathered inside `buildBrief`.

### New return field: `sliceStartConfidence`

Add the following field to the object returned by `buildBrief`:

```typescript
sliceStartConfidence: {
  featureId: string | null;       // FEAT-NNN of the top triaged item, or null when backlog empty
  confidence: "green" | "yellow" | "red" | null;  // null when no triaged items exist
  reason: string | null;          // human-readable reason from computeConfidence, or null
} | null
```

`sliceStartConfidence` is `null` only when `topTriaged` is empty (no triaged items exist).

When `topTriaged` is non-empty, the block is always a non-null object with `featureId`, `confidence`, and `reason` set.

### Derivation of `ConfidenceInputs` inside `buildBrief`

```
autonomousSafe  ← topTriaged[0].frontmatter.autonomous_safe ?? null
                  (topTriaged items already include frontmatter from listBacklog;
                   inspect the existing backlog-parser shape to confirm the field name)
acCount         ← 1   (sentinel — slice body not parsed at brief time; see AC-003)
recentGradeAvg  ← grades.avgRecent  (already computed by computeGradeSignal above)
dependsOnCount  ← topTriaged[0].frontmatter.depends_on?.length ?? 0
```

Call `computeConfidence(inputs)` from `confidence-signal.mts` to obtain the verdict. Do not inline or duplicate the heuristic logic.

### Side effects

None beyond the existing `buildBrief` side effects (none — pure read + aggregate).

---

## Files to Create / Modify

| Action | File |
|---|---|
| **Modify** | `src/scripts/lib/brief.mts` — add `sliceStartConfidence` derivation and include in return object |
| **Modify** | `src/tests/brief.test.mts` — add ≥3 new test cases (see Required Tests below) |
| **No change** | `src/scripts/lib/confidence-signal.mts` — import only, do not alter |
| **No change** | `src/tests/confidence-signal.test.mts` — do not alter |

---

## Required Tests

All tests go in `src/tests/brief.test.mts` using the existing `tmpRepo` / `buildBrief` / `addFeature` / `moveFeature` helpers already present in that file.

### TC-001 — No triaged items: `sliceStartConfidence` is null

```typescript
test("buildBrief: sliceStartConfidence is null when no triaged items exist", async () => {
  const repo = await tmpRepo("al-brief-conf-empty-");
  const out = await buildBrief(repo);
  assert.equal(out.sliceStartConfidence, null);
});
```

Pass condition: `out.sliceStartConfidence === null`.

### TC-002 — Autonomous-safe feature with no depends_on: confidence is green

```typescript
test("buildBrief: sliceStartConfidence green for autonomous-safe feature with no deps", async () => {
  const repo = await tmpRepo("al-brief-conf-green-");
  const f = await addFeature(repo, { title: "safe feat" });
  await moveFeature(f.filePath, "triaged", {
    priority: "P1",
    category: "feature",
    autonomous_safe: true,
    depends_on: []
  });
  const out = await buildBrief(repo);
  assert.ok(out.sliceStartConfidence !== null, "sliceStartConfidence must be present");
  assert.equal(out.sliceStartConfidence.featureId, f.id);
  assert.equal(out.sliceStartConfidence.confidence, "green");
  assert.ok(typeof out.sliceStartConfidence.reason === "string");
});
```

Pass condition: `confidence === "green"`, `featureId` matches the added feature, `reason` is a non-empty string.

### TC-003 — `autonomous_safe: false` feature with depends_on: confidence is red (compound)

```typescript
test("buildBrief: sliceStartConfidence red for not-autonomous-safe + depends_on present", async () => {
  const repo = await tmpRepo("al-brief-conf-red-");
  const f = await addFeature(repo, { title: "risky feat" });
  await moveFeature(f.filePath, "triaged", {
    priority: "P1",
    category: "feature",
    autonomous_safe: false,
    depends_on: ["FEAT-001"]
  });
  const out = await buildBrief(repo);
  assert.ok(out.sliceStartConfidence !== null);
  assert.equal(out.sliceStartConfidence.confidence, "red");
  assert.match(out.sliceStartConfidence.reason, /unresolved depends_on/);
});
```

Pass condition: `confidence === "red"`, `reason` matches `/unresolved depends_on/`.

### TC-004 — `autonomous_safe: false`, no compound triggers: confidence is yellow

```typescript
test("buildBrief: sliceStartConfidence yellow for autonomous_safe false with no compound trigger", async () => {
  const repo = await tmpRepo("al-brief-conf-yellow-");
  const f = await addFeature(repo, { title: "manual feat" });
  await moveFeature(f.filePath, "triaged", {
    priority: "P1",
    category: "feature",
    autonomous_safe: false,
    depends_on: []
  });
  const out = await buildBrief(repo);
  assert.ok(out.sliceStartConfidence !== null);
  assert.equal(out.sliceStartConfidence.confidence, "yellow");
  assert.match(out.sliceStartConfidence.reason, /autonomous_safe: false/);
});
```

Pass condition: `confidence === "yellow"`, `reason` matches `/autonomous_safe: false/`.

### TC-005 — `sliceStartConfidence` shape: all three fields always present when non-null

```typescript
test("buildBrief: sliceStartConfidence has featureId, confidence, reason when non-null", async () => {
  const repo = await tmpRepo("al-brief-conf-shape-");
  const f = await addFeature(repo, { title: "shape check" });
  await moveFeature(f.filePath, "triaged", { priority: "P2", category: "feature" });
  const out = await buildBrief(repo);
  assert.ok(out.sliceStartConfidence !== null);
  assert.ok("featureId" in out.sliceStartConfidence);
  assert.ok("confidence" in out.sliceStartConfidence);
  assert.ok("reason" in out.sliceStartConfidence);
  assert.ok(["green", "yellow", "red"].includes(out.sliceStartConfidence.confidence));
});
```

Pass condition: all three fields present, `confidence` is one of the three valid values.

---

## Acceptance Criteria

**AC-001:** Given `buildBrief` is called on a repo with zero triaged features, when the result is inspected, then `result.sliceStartConfidence === null`.

**AC-002:** Given the top triaged feature has `autonomous_safe: true`, `depends_on: []`, and no grade history (first ever run), when `buildBrief` is called, then `result.sliceStartConfidence.confidence === "green"` and `result.sliceStartConfidence.reason` contains `"no grade history yet"` or `"grade trend healthy"`.

**AC-003:** Given `acCount` cannot be derived from FEAT frontmatter alone (no slice body available at brief time), when `computeConfidence` is called, then `acCount` is supplied as `1` (sentinel). Consequence: the signal never fires `red` for the "no acceptance criteria" branch (`acCount === 0`) from brief output alone, preserving the meaningful `green`/`yellow`/`red` signal for the `autonomousSafe` and `recentGradeAvg` branches only.

**AC-004:** Given the top triaged feature has `autonomous_safe: false` and `depends_on: ["FEAT-001"]`, when `buildBrief` is called, then `result.sliceStartConfidence.confidence === "red"` and `result.sliceStartConfidence.reason` contains `"unresolved depends_on"`.

**AC-005:** Given the top triaged feature has `autonomous_safe: false` and `depends_on: []`, when `buildBrief` is called, then `result.sliceStartConfidence.confidence === "yellow"` and `result.sliceStartConfidence.reason` contains `"autonomous_safe: false"`.

**AC-006:** Given `buildBrief` returns a non-null `sliceStartConfidence`, then `featureId` is the `id` of the feature at `topTriaged[0]`.

**AC-007:** The existing `buildBrief` tests in `src/tests/brief.test.mts` continue to pass without modification.

**AC-008:** `computeConfidence` from `confidence-signal.mts` is the only confidence computation call site in `brief.mts` — the heuristic logic is not duplicated or inlined.

---

## Heuristic Formula Reference

Implemented in `src/scripts/lib/confidence-signal.mts`. Reproduced here for readability only — the source of truth is the module.

```
acCount === 0                                          → red  ("no acceptance criteria — slice not testable")
autonomousSafe === false AND (acCount < 2
  OR recentGradeAvg < 0.80 OR dependsOnCount > 0)     → red  ("high-risk compound: …")
autonomousSafe === false                               → yellow ("autonomous_safe: false — review recommended")
recentGradeAvg < 0.85                                 → yellow ("recent grade trend X.XX below 0.85")
else                                                   → green  ("autonomous-safe, AC count N, …")

First matching branch wins.
```

At brief time, `acCount` is always `1` (sentinel, see AC-003), so the `acCount === 0` red branch is never reached. The `acCount < 2` red-compound sub-branch (`acCount < 2` with `autonomousSafe === false`) is also bypassed because sentinel `1 < 2` is true — meaning a feature with `autonomous_safe: false` AND `depends_on: []` AND `recentGradeAvg >= 0.80` will NOT fall into the compound red branch. It will reach the catch-all yellow. This is the correct behavior for brief output: brief-level confidence is conservative (signals yellow for any non-autonomous feature without further compound triggers), which is appropriate since the full AC count is only known after the slice file exists.

> **Open question (not decided here):** A future slice could parse the FEAT body for AC-like headings to improve `acCount` precision. Defer to a follow-up FEAT or SLICE-B if `autonomous_safe: false` + `acCount` proxy accuracy becomes a pain point.

---

## Verification Commands

Run all confidence-related tests:

```
bun test src/tests/ --timeout 60000 -t "confidence"
```

Run all brief tests (includes new tests):

```
bun test src/tests/brief.test.mts --timeout 60000
```

Run full suite (CI gate):

```
bun test src/tests/ --parallel --timeout 60000
```

Typecheck (must be clean):

```
bunx tsc --project tsconfig.json --noEmit
bunx tsc --project tsconfig.test.json --noEmit
```

Lint (must be zero warnings):

```
bunx eslint src eslint.config.mjs
```
