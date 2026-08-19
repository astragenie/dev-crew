# Triage Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/loop:backlog-triage` (regex) with `/loop:triage` (PM-first, regex fallback) as the single public triage surface for the loop.

**Architecture:** Surface-level consolidation: rename `pm-triage` skill+command → `triage`, delete `backlog-triage` command; keep regex CLI subcommand as internal fallback. Add two small CLI helpers (deterministic ID list + pm-write id existence guard) to close the fabricated-ID failure class structurally. Skill body orchestrates PM dispatch → on error or budget exceed → fall through to regex CLI. Cost guard via new `loop.json` keys.

**Tech Stack:** ESM Node (`.mjs`), TypeScript source under `src/scripts/*.mts` emitted to `scripts/*.mjs`. Tests via `node --test` under `src/tests/*.mts`. No CommonJS. ESLint flat config + Prettier. Owned agents capped at 300 lines; `SKILL.md` capped at 200.

**Spec:** `docs/superpowers/specs/2026-06-05-triage-consolidation-design.md`

**Commit policy:** Constitution says do not commit without explicit user approval. Commit steps below are present so the executor knows the cut points, but each one is **gated on explicit user approval**. If the user has not approved a commit, stage the changes and stop at the commit step.

---

## File Structure

**New files:**
- `src/scripts/lib/backlog-list-ids.mts` — pure helper: list pending FEAT ids from disk
- `src/tests/backlog-list-ids.test.mts` — unit tests for the helper
- `commands/triage.md` — the renamed `/loop:triage` command (was `pm-triage.md`)
- `skills/triage/SKILL.md` — the renamed `loop:triage` skill (was `pm-triage/SKILL.md`)
- `src/tests/triage-flow.test.mts` — renamed from `pm-triage-flow.test.mts`

**Modified files:**
- `src/scripts/loop.mts` — dispatcher: add `backlog list-pending-ids` subcommand
- `src/scripts/lib/backlog-pm-write.mts` — add FEAT-id existence guard
- `src/tests/backlog-pm-write.test.mts` — add reject-on-missing-id case
- `.claude/loop/rules.md` — rewire Cross-Slice Continuation HARD RULE to `/loop:triage`
- `CLAUDE.md` — update Auto-dispatch + Backlog discipline references
- `CHANGELOG.md` — add breaking-change entry
- `.claude/loop.json` — add `triageBudget*` defaults

**Deleted files:**
- `commands/pm-triage.md` (renamed to `triage.md`)
- `commands/backlog-triage.md` (decommissioned; CLI subcommand stays as fallback)
- `skills/pm-triage/SKILL.md` (renamed under `skills/triage/`)
- `src/tests/pm-triage-flow.test.mts` (renamed)

**Unchanged (load-bearing):**
- `src/scripts/lib/backlog-triage.mts` — regex `triagePending()` stays as internal fallback target
- `src/scripts/lib/pm-scorer.mts` — validation + scoring math
- `src/scripts/lib/backlog-pm-write.mts` — pm-write CLI (gets a guard added in Task 2)
- `src/tests/backlog-triage-autosafe.test.mts` — regex unit tests still cover fallback path
- `agents/pm.md` — PM agent boundary unchanged

---

## Task 1: Add `backlog list-pending-ids` CLI helper

**Why:** Deterministic FEAT-id list from disk. Skill passes exactly this list to PM so PM cannot score fabricated ids.

**Files:**
- Create: `src/scripts/lib/backlog-list-ids.mts`
- Create: `src/tests/backlog-list-ids.test.mts`

- [ ] **Step 1.1: Write the failing test**

Create `src/tests/backlog-list-ids.test.mts`:

```typescript
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { listPendingFeatureIds } from "../scripts/lib/backlog-list-ids.mjs";

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("listPendingFeatureIds returns ids of pending FEATs only, sorted", async () => {
  const repo = await tmpRepo("al-list-ids-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });
  const b = await addFeature(repo, { title: "Bravo", body: "y", category: "feature" });

  const ids = await listPendingFeatureIds(repo);
  assert.deepEqual(ids.sort(), [a.id, b.id].sort());
});

test("listPendingFeatureIds excludes triaged/in-progress/done", async () => {
  const repo = await tmpRepo("al-list-ids-excl-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });

  // Move alpha out of pending/ to simulate triage
  const { moveFeature } = await import("../scripts/lib/backlog-writer.mjs");
  await moveFeature(
    path.join(repo, "docs/backlog/pending", `${a.id}.md`),
    "triaged",
    { status: "triaged" }
  );

  const b = await addFeature(repo, { title: "Bravo", body: "y", category: "feature" });

  const ids = await listPendingFeatureIds(repo);
  assert.deepEqual(ids, [b.id]);
});

test("listPendingFeatureIds returns [] when no pending entries", async () => {
  const repo = await tmpRepo("al-list-ids-empty-");
  await fs.mkdir(path.join(repo, "docs/backlog/pending"), { recursive: true });
  const ids = await listPendingFeatureIds(repo);
  assert.deepEqual(ids, []);
});
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern "listPendingFeatureIds"`
Expected: FAIL — module not found.

- [ ] **Step 1.3: Implement the helper**

Create `src/scripts/lib/backlog-list-ids.mts`:

```typescript
/**
 * backlog-list-ids — deterministic enumeration of pending FEAT ids from disk.
 *
 * Used by the /loop:triage skill to hand PM an explicit id list, so PM cannot
 * score features that do not exist (structural anti-hallucination guard).
 */

import { listBacklog, filterBacklog } from "./backlog-parser.mjs";

export async function listPendingFeatureIds(repoPath: string): Promise<string[]> {
  const entries = await listBacklog(repoPath);
  const pending = filterBacklog(entries, { status: "pending" });
  return pending.map((e) => e.id);
}
```

- [ ] **Step 1.4: Run test to verify pass**

Run: `npm test -- --test-name-pattern "listPendingFeatureIds"`
Expected: PASS (3 tests).

- [ ] **Step 1.5: Wire CLI subcommand**

In `src/scripts/loop.mts`, find the `backlog` subcommand dispatcher and add a `list-pending-ids` branch that calls `listPendingFeatureIds(repoPath)` and prints JSON `{ ids: [...] }` to stdout. Co-locate with the existing `triage` branch so the maintenance pattern stays obvious.

(Implementation: read the section in `src/scripts/loop.mts` where `sub === "triage"` is handled — add an `if (sub === "list-pending-ids")` branch above or below it.)

- [ ] **Step 1.6: Smoke test the CLI subcommand**

Run: `node scripts/loop.mjs backlog list-pending-ids --repo "$PWD"`
Expected: `{"ids":[...]}` JSON to stdout. Exit 0. (For this repo today, ids will reflect actual pending/ contents.)

- [ ] **Step 1.7: Stage** (do not commit without approval)

```bash
git add src/scripts/lib/backlog-list-ids.mts src/tests/backlog-list-ids.test.mts src/scripts/loop.mts
```

- [ ] **Step 1.8: Commit (gated on explicit user approval)**

```bash
git commit -m "feat(triage): add backlog list-pending-ids CLI helper for deterministic id enumeration"
```

---

## Task 2: Add FEAT-id existence guard to `backlog pm-write`

**Why:** Second line of defense — PM may still return an id outside the list. CLI rejects writes for ids not on disk under `pending/`, `triaged/`, or `in-progress/`.

**Files:**
- Modify: `src/scripts/lib/backlog-pm-write.mts`
- Modify: `src/tests/backlog-pm-write.test.mts`

- [ ] **Step 2.1: Read current pm-write impl**

Read `src/scripts/lib/backlog-pm-write.mts` to identify the exact function signature and where it writes. Locate the entry-point that the CLI dispatcher calls (look for an exported `writePmScores` or similar).

- [ ] **Step 2.2: Write the failing test**

In `src/tests/backlog-pm-write.test.mts`, add:

```typescript
test("writePmScores rejects --id for FEAT not present on disk", async () => {
  const repo = await tmpRepo("al-pmwrite-reject-");
  await fs.mkdir(path.join(repo, "docs/backlog/pending"), { recursive: true });
  await fs.mkdir(path.join(repo, "docs/backlog/triaged"), { recursive: true });
  await fs.mkdir(path.join(repo, "docs/backlog/in-progress"), { recursive: true });

  const scores = {
    customer_impact: 0.5,
    effort_estimate: 0.5,
    strategic_alignment: 0.5,
    technical_risk: 0.5,
    dependency_depth: 0.5
  };

  await assert.rejects(
    () =>
      writePmScores(repo, {
        id: "FEAT-999",
        scores,
        priority: "P2",
        autonomousSafe: false,
        evidence: "n/a",
        reasoning: "n/a"
      }),
    /FEAT-999 not found in backlog/i
  );
});
```

Add the required imports (`fs`, `os`, `path`, `tmpRepo`, `writePmScores`) if not already present.

- [ ] **Step 2.3: Run test to verify it fails**

Run: `npm test -- --test-name-pattern "writePmScores rejects"`
Expected: FAIL — either no error thrown or wrong error message.

- [ ] **Step 2.4: Implement the guard**

In `src/scripts/lib/backlog-pm-write.mts`, at the top of `writePmScores`, before any write:

```typescript
import { listBacklog } from "./backlog-parser.mjs";

// ...inside writePmScores, before frontmatter assembly:
const entries = await listBacklog(repoPath);
const known = entries.find((e) => e.id === opts.id);
if (!known) {
  throw new Error(
    `FEAT-id existence guard: ${opts.id} not found in backlog (pending/triaged/in-progress). ` +
      `Refusing pm-write to prevent fabricated-id pollution.`
  );
}
```

(Adapt variable names to the file's actual conventions.)

- [ ] **Step 2.5: Run test to verify pass**

Run: `npm test -- --test-name-pattern "writePmScores"`
Expected: PASS (including pre-existing tests + new reject test).

- [ ] **Step 2.6: Run full test suite to catch regressions**

Run: `npm test`
Expected: PASS — no other test depends on writing pm scores against fake ids.

- [ ] **Step 2.7: Stage**

```bash
git add src/scripts/lib/backlog-pm-write.mts src/tests/backlog-pm-write.test.mts
```

- [ ] **Step 2.8: Commit (gated on explicit user approval)**

```bash
git commit -m "feat(triage): pm-write rejects unknown FEAT-id to block fabricated-id pollution"
```

---

## Task 3: Rename skill `pm-triage` → `triage`

**Why:** Single public surface for triage.

**Files:**
- Delete: `skills/pm-triage/SKILL.md`
- Create: `skills/triage/SKILL.md` (with rewritten body — see Task 4)

- [ ] **Step 3.1: Create new skill directory + file**

```bash
mkdir -p skills/triage
```

- [ ] **Step 3.2: Write the new SKILL.md (PM-first + fallback body)**

Create `skills/triage/SKILL.md`:

```markdown
---
name: loop:triage
description: Triage every pending backlog FEAT — PM-first (5-dimension LLM scoring), regex fallback on PM error/budget exceed/validation fail. Dispatched by Cross-Slice Continuation when pending/ is non-empty. Hidden internal command `backlog triage` still runs the regex baseline.
---

# Triage

PM-first triage with regex fallback. Single public command for the loop.

## Inputs

- Pending FEAT ids enumerated from disk (deterministic; PM never invents ids).
- Per-batch cost budget from `.claude/loop.json`:
  - `loop.triageBudgetUsdPerBatch` (default 5.0)
  - `loop.triageBudgetTokensPerBatch` (default 500000)
  - `loop.triageFallbackOnBudgetExceeded` (default true)

## Steps

1. **Enumerate pending ids deterministically.**
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" backlog list-pending-ids --repo "$PWD"
   ```
   Parse `{ "ids": ["FEAT-NNN", ...] }`. If `ids.length === 0`, return `{ triaged: 0, path: "noop" }` and stop.

2. **Capture cost baseline** from the most recent cost-report or cost-advisor sample. Record `(baselineUsd, baselineTokens)`.

3. **Dispatch `loop:pm` agent.** Prompt MUST include the explicit id list:

   > Score the following FEATs (and ONLY these): FEAT-XXX, FEAT-YYY, ...
   > For each, return the JSON contract from `agents/pm.md`.
   > Do not return entries for any other id.

4. **Validate PM output.** For each returned result:
   - `result.id` MUST be in the input id list. Reject otherwise.
   - All 5 dimension scores MUST be numeric in `[0, 1]`. Reject otherwise.
   - Required fields present (`scores`, `compositePriority`, `autonomousSafe`, `reasoning`).

5. **Check budget delta.** After PM completes, sample cost again. If `(currentUsd - baselineUsd) > triageBudgetUsdPerBatch` OR `tokens > triageBudgetTokensPerBatch`, mark `BudgetExceeded` and go to fallback (step 7).

6. **Write PM scores** via the existing CLI:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" backlog pm-write \
     --id FEAT-NNN \
     --scores '{"customer_impact":0.8,...}' \
     --priority P1 \
     --autonomous-safe true \
     --evidence "..." \
     --reasoning "..."
   ```
   Then move each entry pending → triaged.
   Write a PM review artifact per FEAT to `.claude/artifacts/loop/pm-reviews/`.
   Return `{ triaged: N, path: "pm", results: [...] }`.

7. **Fallback (PM error | BudgetExceeded | ValidationFail):**
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" backlog triage --repo "$PWD"
   ```
   This invokes the regex `triagePending()` deterministically. It writes the same `pm_*` frontmatter keys with 0.5 defaults and moves entries pending → triaged.

8. **Log fallback to audit JSONL** at `.claude/artifacts/loop/auto-dispatch.jsonl`:
   ```json
   { "event": "triage_fallback", "reason": "<pm_error|budget_exceeded|validation_fail>", "cost_usd": 0.0, "ids": ["FEAT-NNN", ...] }
   ```

9. **Tag `triage_notes`** on every entry — `via=pm` or `via=regex_fallback (reason=...)`.

## Return contract

```json
{
  "triaged": <count>,
  "path": "pm" | "regex_fallback" | "noop",
  "fallback_reason": "<reason or null>",
  "results": [{ "id": "FEAT-NNN", "priority": "P1", "autonomous_safe": true }]
}
```

## When this runs

- **Automatically:** Cross-Slice Continuation HARD RULE dispatches when `pending/` is non-empty.
- **Manually:** `/loop:triage`.

## Pattern alert

If the fallback rate exceeds 50% over a rolling window of 10 runs, raise a warn-severity pattern alert. Sustained PM degradation is a real signal, not background noise.
```

(The body is ~70 lines well under the 200-line cap for SKILL.md.)

- [ ] **Step 3.3: Delete the old skill directory**

```bash
git rm -r skills/pm-triage
```

- [ ] **Step 3.4: Stage**

```bash
git add skills/triage/SKILL.md
```

- [ ] **Step 3.5: Validate content-length + manifest**

Run: `node ./scripts/validate-content-length.mjs && node ./scripts/validate-manifests.mjs`
Expected: PASS — new skill registered, line cap respected.

- [ ] **Step 3.6: Commit (gated on explicit user approval)**

```bash
git commit -m "feat(triage): rename loop:pm-triage skill to loop:triage with PM-first + regex fallback body"
```

---

## Task 4: Rename command `pm-triage.md` → `triage.md` and delete `backlog-triage.md`

**Why:** Match the new skill name. Decommission the regex command (CLI subcommand stays).

**Files:**
- Delete: `commands/pm-triage.md`
- Delete: `commands/backlog-triage.md`
- Create: `commands/triage.md`

- [ ] **Step 4.1: Create new command file**

Create `commands/triage.md`:

```markdown
---
description: Triage every pending backlog FEAT using the PM agent with 5-dimension scoring; falls back to deterministic regex baseline on PM error or budget exceed.
---

# Triage

Run the `loop:triage` skill: PM-first scoring with deterministic regex fallback. Single public triage command.

## Usage

```bash
/loop:triage
```

No arguments. Skill reads `pending/` directory, dispatches PM, falls through to regex on error.

## Returns

```json
{
  "triaged": <count>,
  "path": "pm" | "regex_fallback" | "noop",
  "fallback_reason": "<reason or null>",
  "results": [{ "id": "FEAT-NNN", "priority": "P1", "autonomous_safe": true }]
}
```

## Auto-invocation

Cross-Slice Continuation HARD RULE invokes this command automatically when `docs/backlog/pending/` is non-empty.

## Cost guard

Per-batch budget (`.claude/loop.json`):
- `loop.triageBudgetUsdPerBatch` (default 5.0)
- `loop.triageBudgetTokensPerBatch` (default 500000)
- `loop.triageFallbackOnBudgetExceeded` (default true)

## Fallback path

On PM error, budget exceeded, or output validation fail, the skill calls the internal CLI subcommand `node scripts/loop.mjs backlog triage` which runs the deterministic regex baseline. The fallback writes the same frontmatter shape with 0.5 defaults.

Audit trail: every fallback appends to `.claude/artifacts/loop/auto-dispatch.jsonl` with `event: "triage_fallback"`. Pattern alert fires when fallback rate exceeds 50% over rolling 10 runs.
```

- [ ] **Step 4.2: Delete old command files**

```bash
git rm commands/pm-triage.md commands/backlog-triage.md
git add commands/triage.md
```

- [ ] **Step 4.3: Validate manifest**

Run: `node ./scripts/validate-manifests.mjs`
Expected: PASS — `/loop:triage` registered, old commands gone.

- [ ] **Step 4.4: Commit (gated on explicit user approval)**

```bash
git commit -m "feat(triage): rename /loop:pm-triage to /loop:triage; remove /loop:backlog-triage public command (CLI subcommand kept as internal fallback)"
```

---

## Task 5: Rename test file `pm-triage-flow.test.mts` → `triage-flow.test.mts`

**Why:** Match new naming.

**Files:**
- Delete: `src/tests/pm-triage-flow.test.mts`
- Create: `src/tests/triage-flow.test.mts` (with same content + one new fallback case)

- [ ] **Step 5.1: Copy file content + rename**

```bash
git mv src/tests/pm-triage-flow.test.mts src/tests/triage-flow.test.mts
```

- [ ] **Step 5.2: Add a regex-fallback path test**

In `src/tests/triage-flow.test.mts`, append:

```typescript
import { triagePending } from "../scripts/lib/backlog-triage.mjs";

test("regex fallback writes same frontmatter shape as PM happy path", async () => {
  const repo = await tmpRepo("al-fallback-shape-");
  await addFeature(repo, {
    title: "Fallback shape parity",
    body: "## Acceptance criteria\n\n- AC-1: x\n- AC-2: y\n- AC-3: z",
    category: "feature"
  });

  const results = await triagePending(repo);
  assert.equal(results.length, 1);
  const r = results[0];

  // Every PM dimension key must be present in the regex-fallback frontmatter
  // so consumers do not need to branch on the triage path.
  for (const dim of [
    "pm_customer_impact",
    "pm_effort_estimate",
    "pm_strategic_alignment",
    "pm_technical_risk",
    "pm_dependency_depth"
  ]) {
    assert.ok(dim in r, `regex fallback must write ${dim} (got keys: ${Object.keys(r).join(", ")})`);
  }
  assert.equal(typeof r.autonomous_safe, "boolean");
  assert.ok(typeof r.triage_notes === "string" && r.triage_notes.length > 0);
});
```

- [ ] **Step 5.3: Run all tests**

Run: `npm test`
Expected: PASS — including the new fallback shape test.

- [ ] **Step 5.4: Stage**

```bash
git add src/tests/triage-flow.test.mts
```

- [ ] **Step 5.5: Commit (gated on explicit user approval)**

```bash
git commit -m "test(triage): rename pm-triage-flow.test.mts to triage-flow.test.mts; add regex fallback shape parity test"
```

---

## Task 6: Rewire Cross-Slice Continuation HARD RULE

**Why:** The autonomous loop auto-fires triage via this rule. Must call the new command name.

**Files:**
- Modify: `.claude/loop/rules.md`

- [ ] **Step 6.1: Locate the line**

In `.claude/loop/rules.md`, find the Cross-Slice Continuation HARD RULE step 2 (currently around line 15):

> 2. **Scan `docs/backlog/pending/`** — if any pending entries exist, run `/loop:backlog triage` to fill `priority`, `category`, `target_release` heuristically and move each to `docs/backlog/triaged/`.

- [ ] **Step 6.2: Replace with new wording**

New text:

> 2. **Scan `docs/backlog/pending/`** — if any pending entries exist, run `/loop:triage`. The skill dispatches the PM agent with a deterministic id list from disk for 5-dimension scoring, then falls through to the regex baseline on PM error, budget exceed (`loop.triageBudgetUsdPerBatch`, default 5.0), or output validation fail. Both paths move entries to `docs/backlog/triaged/` and write `pm_*` frontmatter; the regex fallback writes 0.5 defaults. Fallback events append to `.claude/artifacts/loop/auto-dispatch.jsonl` with `event: "triage_fallback"`.

- [ ] **Step 6.3: Stage**

```bash
git add .claude/loop/rules.md
```

- [ ] **Step 6.4: Commit (gated on explicit user approval)**

```bash
git commit -m "docs(loop): rewire Cross-Slice Continuation HARD RULE to /loop:triage with documented fallback path"
```

---

## Task 7: Update `CLAUDE.md`, `README.md`, `CHANGELOG.md`

**Why:** Repo docs reference the old command names.

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md` (only if it mentions the old commands)
- Modify: `CHANGELOG.md`

- [ ] **Step 7.1: Find old references**

Run: `grep -rn "backlog-triage\|pm-triage" CLAUDE.md README.md docs/code-conventions.md`
Expected: list of lines to update.

- [ ] **Step 7.2: Update CLAUDE.md `Auto-dispatch primitives` section**

In the bullet list under `## Auto-dispatch primitives`, leave the other two integration sites unchanged (`/loop:backlog-add`, `/loop:spec-decompose`). The triage flow does not use the `dispatchAgent` marker pattern; it dispatches PM through the Agent tool at skill-level. No change needed here unless the section explicitly listed triage — verify by re-reading the file.

- [ ] **Step 7.3: Update CLAUDE.md `Backlog discipline` section**

Insert a triage mention if absent. Example:

> Triage runs through `/loop:triage` — PM-first with a deterministic regex fallback. Cross-Slice Continuation auto-fires when `pending/` is non-empty. The old `/loop:backlog-triage` public command was removed; the CLI subcommand `node scripts/loop.mjs backlog triage` still works as the internal fallback target.

- [ ] **Step 7.4: Update README.md**

If `README.md` mentions `/loop:backlog-triage` or `/loop:pm-triage`, replace with `/loop:triage` and note the consolidation.

- [ ] **Step 7.5: Add CHANGELOG entry**

Append at the top of `CHANGELOG.md`:

```markdown
## v0.9.0 — TBD

### Breaking changes

- `/loop:backlog-triage` (regex triage) public command removed.
- `/loop:pm-triage` renamed to `/loop:triage` and now PM-first with a regex
  fallback on PM error, budget exceed, or output validation fail.
- The CLI subcommand `node scripts/loop.mjs backlog triage` is unchanged and
  is now invoked only as the internal fallback. Direct callers (CI scripts,
  cron jobs) keep working.

### Added

- `node scripts/loop.mjs backlog list-pending-ids` — deterministic FEAT-id
  enumeration. Used by the triage skill to hand PM an explicit id list so
  fabricated ids are structurally impossible to write.
- `backlog pm-write` rejects `--id` values not found in
  `pending/`/`triaged/`/`in-progress/` — second-line defense against
  fabricated-id pollution.
- `loop.json` keys: `loop.triageBudgetUsdPerBatch` (default 5.0),
  `loop.triageBudgetTokensPerBatch` (default 500000),
  `loop.triageFallbackOnBudgetExceeded` (default true).
```

Bump the version number in `CHANGELOG.md` heading based on `package.json` — this is a breaking change so it should be at least a minor bump.

- [ ] **Step 7.6: Stage**

```bash
git add CLAUDE.md README.md CHANGELOG.md
```

(Drop any file from the stage list that had no actual change.)

- [ ] **Step 7.7: Commit (gated on explicit user approval)**

```bash
git commit -m "docs(triage): update CLAUDE.md, README, CHANGELOG for /loop:triage consolidation"
```

---

## Task 8: Add `triageBudget*` defaults to `.claude/loop.json`

**Why:** Skill reads these keys; they must exist with sane defaults.

**Files:**
- Modify: `.claude/loop.json`

- [ ] **Step 8.1: Read current `.claude/loop.json`**

Read the file. Find the `"loop": { ... }` object.

- [ ] **Step 8.2: Add the three keys**

Inside `"loop": { ... }` add (preserve existing keys, comma-correct):

```json
"triageBudgetUsdPerBatch": 5.0,
"triageBudgetTokensPerBatch": 500000,
"triageFallbackOnBudgetExceeded": true
```

- [ ] **Step 8.3: Verify JSON validity**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude/loop.json'))" && echo OK`
Expected: `OK`.

- [ ] **Step 8.4: Stage**

```bash
git add .claude/loop.json
```

- [ ] **Step 8.5: Commit (gated on explicit user approval)**

```bash
git commit -m "chore(loop): add triageBudget* defaults to .claude/loop.json"
```

---

## Task 9: Final validation pass

**Why:** All gates green before declaring done.

- [ ] **Step 9.1: Lint**

Run: `npm run lint`
Expected: PASS, zero warnings.

- [ ] **Step 9.2: Format check**

Run: `npm run format:check`
Expected: PASS.

- [ ] **Step 9.3: TypeScript check**

Run: `npm run typecheck`
Expected: PASS — emits scripts/*.mjs cleanly. After this, verify no uncommitted drift in `scripts/`:

Run: `git diff --exit-code scripts/`
If diff is non-empty, that is the build output the executor needs to stage and commit (the CI gate enforces this).

- [ ] **Step 9.4: Manifest + content-length**

Run: `node ./scripts/validate-manifests.mjs && node ./scripts/validate-content-length.mjs`
Expected: PASS.

- [ ] **Step 9.5: Full test suite**

Run: `npm test`
Expected: PASS — all suites, including `triage-flow.test.mjs`, `backlog-list-ids.test.mjs`, `backlog-triage-autosafe.test.mjs`, `backlog-pm-write.test.mjs`.

- [ ] **Step 9.6: Manual smoke**

In this repo (which has 0 pending, 1 triaged FEAT-020):

```bash
node scripts/loop.mjs backlog list-pending-ids --repo "$PWD"
```

Expected: `{"ids":[]}`. The `/loop:triage` flow would return `{ triaged: 0, path: "noop" }`.

- [ ] **Step 9.7: Stage emitted JS if any drift, then commit (gated on explicit user approval)**

```bash
git add scripts/
git commit -m "chore(build): emit triage consolidation JS output"
```

---

## Self-Review

**1. Spec coverage:**

| Spec section | Implementing task |
|---|---|
| Surface change (rename + delete) | Tasks 3, 4 |
| Internal flow + fallback (skill body) | Task 3 (skill rewrite) |
| Deterministic ID guard | Task 1 + Task 3 step 4 (validation) |
| pm-write existence check | Task 2 |
| Auto-fire policy (always re-score) | Task 3 skill body step 3, Task 6 rewording |
| Cost guard ($5 / 500k) | Task 3 skill body steps 2, 5; Task 8 (config) |
| Telemetry (`triage_fallback` JSONL) | Task 3 skill body step 8 |
| Pattern alert (>50% rolling 10) | Task 3 skill body, end-of-file |
| Failure visibility (notes preserved) | Task 3 skill body step 9 (`triage_notes` tag) |
| Migration (CHANGELOG + doc updates) | Task 7 |
| Test plan (happy + reject + budget + error) | Tasks 1, 2, 5 |

No spec section uncovered.

**2. Placeholder scan:** None — all "TBD" only appears once in the CHANGELOG entry where the version number is genuinely future-bound (executor sets at release time).

**3. Type consistency:** `listPendingFeatureIds` consistent across Tasks 1 and 3. `writePmScores` matches the existing function name in `backlog-pm-write.mts` (verified at Step 2.1). `triagePending` matches `backlog-triage.mts` exports. Skill name `loop:triage` and command name `/loop:triage` consistent across Tasks 3, 4, 6, 7.

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-05-triage-consolidation.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — fresh `devcrew:fullstack-dev` subagent per task, parent loop dispatches `devcrew:inspector` between tasks, fast iteration with audit trail.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch with checkpoints.

Which approach?
