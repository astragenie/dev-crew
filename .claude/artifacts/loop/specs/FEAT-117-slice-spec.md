# Spec: FEAT-117 — Markdown Workflow Frontmatter for commands/*.md

## Metadata
- developer_type: agent
- estimated_complexity: low
- languages: [typescript]
- derived_from: .claude/artifacts/loop/backlog/triaged/FEAT-117.md

---

## Objective

Add a standardised YAML frontmatter schema to all `commands/*.md` files so that tooling (and future integrations) can discover command metadata programmatically. Extend `src/scripts/validate-manifests.mts` with a `validateCommandFrontmatter` function that enforces the required fields and is exercised by the CI gate (`bun ./src/scripts/validate-manifests.mts`). This slice covers **metadata enrichment only** — ordered numbered steps (already present in most files) need no code changes, and nested workflow composition (`/command-name` calling another command) is explicitly out of scope.

---

## Context

`commands/*.md` files are the slash-command registry for this plugin. As of v0.43.7 every file already carries a `description:` field in its YAML frontmatter (confirmed by reading `commands/slice-start.md`, `commands/retriage.md`, `commands/triage.md`, `commands/auto.md`, `commands/architect.md`). No file carries `name:` or `auto_execute_steps:`. The `parseFrontmatter` function at `src/scripts/lib/frontmatter.mts` already parses boolean scalars (`true`/`false`) and is used by `skill-frontmatter.mts` for an identical pattern. The validate-manifests script (`src/scripts/validate-manifests.mts`) exports `validateManifests` and `validateAllPresets`; validation additions must be exported as a separate function (`validateCommandFrontmatter`) following the same `fail: (msg: string) => void` convention.

The `auto_execute_steps` field is **metadata only** in this slice. It declares the command author's intent that the steps in the file are machine-executable without per-step confirmation. It does not hook into any runtime at this time and must not be wired into `autoMode` logic in this slice — that interaction requires a separate design review (PM risk note in FEAT-117 frontmatter: "auto_execute_steps interaction with autoMode: true needs careful design").

---

## Implementation Contract

### 1. Frontmatter schema for commands/*.md

Every `commands/*.md` file must contain a YAML frontmatter block at the top of the file. The block must include these three fields:

```yaml
---
name: <slug>           # string, required — matches the slash-command name without the "loop:" prefix
description: <text>    # string, required — one sentence describing what the command does
auto_execute_steps: false  # boolean, required — true only when all numbered steps are fully machine-executable without confirmation
---
```

Field constraints:

| Field | Type | Required | Allowed values | Notes |
|---|---|---|---|---|
| `name` | string | yes | Non-empty; matches `[a-z][a-z0-9-]*` | Derived from filename without `.md` extension; e.g. `commands/slice-start.md` → `name: slice-start` |
| `description` | string | yes | Non-empty | Already present in all files; must remain non-empty |
| `auto_execute_steps` | boolean | yes | `true` or `false` | `false` for all commands in this slice; `true` reserved for future commands whose every step can run without a human confirmation prompt |

The `name` field value must equal the filename stem (the part before `.md`) — e.g. `commands/auto.md` → `name: auto`, `commands/slice-start.md` → `name: slice-start`. This is the canonical derivation rule; the validator enforces it.

### 2. Commands to update (pilot set)

All 40 files in `commands/*.md` must be updated. The pilot file is `commands/slice-start.md`. Every other file follows the same pattern. For each file:

1. Open the existing `---` block.
2. Add `name: <stem>` as the first field.
3. Confirm `description:` is present and non-empty.
4. Add `auto_execute_steps: false` as the third field (after `description:`).

The resulting block for `commands/slice-start.md` must be exactly:

```yaml
---
name: slice-start
description: Open a slice — rotate workflow-state.currentRun via write-run-brief, refresh slice-progress dashboard.
auto_execute_steps: false
---
```

For `commands/auto.md`:

```yaml
---
name: auto
description: "Walk the triaged backlog and emit dispatch plans for all viable FEATs. Ranks by composite score, processes both autonomous_safe=true and autonomous_safe=false items with risk gate. Use --auto-mode to flip default to live dispatch (SLICE-C)."
auto_execute_steps: false
---
```

The existing `description` value must be preserved verbatim (including any quoting). No other changes to file content are permitted.

### 3. Validation additions to validate-manifests.mts

Export a new function `validateCommandFrontmatter` from `src/scripts/validate-manifests.mts`:

```typescript
export function validateCommandFrontmatter(repoRoot: string): string[]
```

The function must:

1. Glob all files matching `commands/*.md` under `repoRoot`. If the `commands/` directory is absent, return `[]` (no-op guard, same pattern as `validateAllPresets`).
2. For each file, read the raw content synchronously using `readFileSync`.
3. Parse the frontmatter using the existing `parseFrontmatter` from `./lib/frontmatter.mjs`.
4. Validate the three required fields against the rules in §1 above. Accumulate errors into a string array (do not throw). Error message format:

   - Missing `name`: `commands/<filename>: missing required field "name"`
   - Empty `name`: `commands/<filename>: "name" must be a non-empty string`
   - Name mismatch: `commands/<filename>: "name" must equal filename stem "<stem>", got "<actual>"`
   - Missing `description`: `commands/<filename>: missing required field "description"`
   - Empty `description`: `commands/<filename>: "description" must be a non-empty string`
   - Missing `auto_execute_steps`: `commands/<filename>: missing required field "auto_execute_steps"`
   - Wrong type for `auto_execute_steps`: `commands/<filename>: "auto_execute_steps" must be a boolean, got <typeof value>`

5. Return the accumulated errors array.

Wire `validateCommandFrontmatter` into the existing `validateManifests` function body, after the `validateAllPresets` call. Use the same `fail` callback:

```typescript
for (const cmdErr of validateCommandFrontmatter(repoRoot)) {
  fail(cmdErr);
}
```

This makes the CI gate (`bun ./src/scripts/validate-manifests.mts`) enforce command frontmatter automatically.

### 4. Inputs / Outputs / Side effects

**validateCommandFrontmatter:**
- Input: `repoRoot: string` — absolute path to the repository root
- Output: `string[]` — array of error messages (empty on success)
- Side effects: synchronous file reads; no writes; no stdout; no exit calls

**validateManifests (amended):**
- Existing signature unchanged: `async function validateManifests(repoRoot: string): Promise<{ ok: boolean; failures: string[]; plugin: any; marketplace: any; pkg: any }>`
- `ok` is now `false` if any command frontmatter error is found

---

## Files to Create / Modify

### Modify (implementation):
- `src/scripts/validate-manifests.mts` — add `validateCommandFrontmatter` export + wire into `validateManifests`

### Modify (frontmatter — pilot):
- `commands/slice-start.md` — add `name: slice-start` + `auto_execute_steps: false`

### Modify (frontmatter — full set, all 39 remaining files):
All other files under `commands/*.md`. Exact stems and expected `name:` values:

| File | name value |
|---|---|
| `commands/auto.md` | `auto` |
| `commands/architect.md` | `architect` |
| `commands/backlog-add.md` | `backlog-add` |
| `commands/backlog-enrich.md` | `backlog-enrich` |
| `commands/backlog-list.md` | `backlog-list` |
| `commands/backlog-promote.md` | `backlog-promote` |
| `commands/brief.md` | `brief` |
| `commands/classify-slice-shape.md` | `classify-slice-shape` |
| `commands/competitor-audit.md` | `competitor-audit` |
| `commands/decisions-list.md` | `decisions-list` |
| `commands/decisions-relevant.md` | `decisions-relevant` |
| `commands/decisions-show.md` | `decisions-show` |
| `commands/decisions-supersede.md` | `decisions-supersede` |
| `commands/derive-slice.md` | `derive-slice` |
| `commands/install.md` | `install` |
| `commands/intake.md` | `intake` |
| `commands/learn.md` | `learn` |
| `commands/lessons-recent.md` | `lessons-recent` |
| `commands/list-presets.md` | `list-presets` |
| `commands/next-slice.md` | `next-slice` |
| `commands/phase-gate.md` | `phase-gate` |
| `commands/pr-fix.md` | `pr-fix` |
| `commands/release-plan.md` | `release-plan` |
| `commands/retriage.md` | `retriage` |
| `commands/retrospective.md` | `retrospective` |
| `commands/slice-complete.md` | `slice-complete` |
| `commands/slice-from-feature.md` | `slice-from-feature` |
| `commands/slice-grade-write.md` | `slice-grade-write` |
| `commands/slice-grade.md` | `slice-grade` |
| `commands/slice-link.md` | `slice-link` |
| `commands/slice-plan.md` | `slice-plan` |
| `commands/slice-post-builder-fanout.md` | `slice-post-builder-fanout` |
| `commands/slice-review-ladder.md` | `slice-review-ladder` |
| `commands/snapshot-memory.md` | `snapshot-memory` |
| `commands/spec-add.md` | `spec-add` |
| `commands/spec-decompose.md` | `spec-decompose` |
| `commands/spec-list.md` | `spec-list` |
| `commands/spec-status.md` | `spec-status` |
| `commands/start.md` | `start` |
| `commands/status.md` | `status` |
| `commands/stop-check.md` | `stop-check` |
| `commands/sync-claims.md` | `sync-claims` |
| `commands/triage.md` | `triage` |

### Create (tests):
- `src/tests/command-frontmatter.test.mts` — new test file

---

## Required Tests

All three test cases use a temporary directory with synthetic `commands/*.md` files, following the pattern established in `src/tests/validate-manifests.test.mts` (tmp dir via `mkdtempSync`, `writeFileSync`, import `validateCommandFrontmatter`).

### Test 1 — Happy path: valid frontmatter returns no errors

```
Given: a commands/ directory containing two files:
  commands/my-cmd.md with frontmatter:
    ---
    name: my-cmd
    description: Does something useful
    auto_execute_steps: false
    ---
  commands/other-cmd.md with frontmatter:
    ---
    name: other-cmd
    description: Another command
    auto_execute_steps: true
    ---
When: validateCommandFrontmatter(repoRoot) is called
Then: return value is [] (empty array, no errors)
```

### Test 2 — Missing required fields: all three fields absent

```
Given: a commands/ directory containing one file:
  commands/bare.md with content (no frontmatter at all):
    # Bare Command
    Some body text.
When: validateCommandFrontmatter(repoRoot) is called
Then: return value is a string[] with length 3
  AND errors include a string matching /bare\.md.*"name"/
  AND errors include a string matching /bare\.md.*"description"/
  AND errors include a string matching /bare\.md.*"auto_execute_steps"/
```

### Test 3 — Name mismatch: name field does not match filename stem

```
Given: a commands/ directory containing one file:
  commands/slice-start.md with frontmatter:
    ---
    name: wrong-name
    description: Opens a slice
    auto_execute_steps: false
    ---
When: validateCommandFrontmatter(repoRoot) is called
Then: return value is a string[] with length 1
  AND errors[0] matches /slice-start\.md.*"name".*"slice-start".*"wrong-name"/
```

### Test 4 — Wrong type for auto_execute_steps: string instead of boolean

```
Given: a commands/ directory containing one file:
  commands/triage.md with frontmatter:
    ---
    name: triage
    description: Runs PM scoring
    auto_execute_steps: "yes"
    ---
When: validateCommandFrontmatter(repoRoot) is called
Then: return value is a string[] with length 1
  AND errors[0] matches /triage\.md.*"auto_execute_steps".*boolean/
```

### Test 5 — No commands directory: returns empty errors (no-op guard)

```
Given: a repoRoot directory with no commands/ subdirectory
When: validateCommandFrontmatter(repoRoot) is called
Then: return value is [] (no error thrown, no crash)
```

### Test 6 — validateManifests integrates command validation

```
Given: a minimal repo with valid plugin.json + package.json + commands/ dir where
  commands/cmd.md is missing the "name" field
When: validateManifests(repoRoot) is called (async)
Then: result.ok === false
  AND result.failures includes a string matching /cmd\.md.*"name"/
```

---

## Acceptance Criteria

**AC-001: Pilot file slice-start.md has all three required frontmatter fields**
```
Given: commands/slice-start.md has been updated
When: reading the YAML frontmatter block
Then: name === "slice-start"
  AND description is a non-empty string (original value preserved)
  AND auto_execute_steps === false (boolean)
```

**AC-002: All 40 commands/*.md files have name, description, auto_execute_steps**
```
Given: all commands/*.md files have been updated
When: running bun ./src/scripts/validate-manifests.mts
Then: exit code is 0 and stdout contains "Manifests OK"
  (i.e. validateCommandFrontmatter returns [] for the full commands/ directory)
```

**AC-003: validateCommandFrontmatter is exported from validate-manifests.mts**
```
Given: src/scripts/validate-manifests.mts is updated
When: importing { validateCommandFrontmatter } from the module
Then: the symbol is a function with signature (repoRoot: string) => string[]
  AND bunx tsc --project tsconfig.json --noEmit exits with code 0
```

**AC-004: Validator catches a missing name field**
```
Given: a commands/test.md with description and auto_execute_steps but no name
When: validateCommandFrontmatter(repoRoot) is called
Then: the returned array contains exactly one error string matching /test\.md.*"name"/
```

**AC-005: Validator catches a name/stem mismatch**
```
Given: a commands/slice-start.md with name: "wrong"
When: validateCommandFrontmatter(repoRoot) is called
Then: the returned array contains exactly one error string matching /slice-start.*wrong/
```

**AC-006: auto_execute_steps: false for all commands in this slice**
```
Given: all commands/*.md files have been updated
When: grepping frontmatter for auto_execute_steps
Then: every file has auto_execute_steps: false
  (no file has auto_execute_steps: true, since no command in this repo qualifies)
```

**AC-007: No runtime behavior change — auto_execute_steps is not consumed by any script**
```
Given: all commands/*.md files updated; all source .mts files unchanged except validate-manifests.mts
When: running bun test src/tests/ --parallel --timeout 60000
Then: all existing tests pass (no regressions from the new validation)
```

**AC-008: CI gate passes end-to-end**
```
Given: all changes applied
When: running the full CI gate sequence:
  bun ./src/scripts/validate-manifests.mts
  bunx tsc --project tsconfig.json --noEmit
  bunx eslint src eslint.config.mjs
  bun test src/tests/ --parallel --timeout 60000
Then: all four commands exit with code 0
```

---

## Design Decisions

**auto_execute_steps is metadata-only in this slice.** FEAT-117's PM scoring explicitly called out "auto_execute_steps interaction with autoMode: true needs careful design" as a risk that blocks `autonomous_safe`. The safe boundary is: add the field as structured documentation of intent; do not wire it to any runtime. Any future wiring requires a separate FEAT with explicit interaction design.

**name must equal filename stem.** This makes the field machine-derivable and prevents drift between the filesystem and the declared name. The validator enforces it, so a rename without updating frontmatter fails CI.

**Nested workflow composition is out of scope.** FEAT-117 describes calling one command from another via `/command-name` syntax. This introduces infinite-loop risk and requires runtime call-graph tracking not present in the codebase. The PM scoring notes it as "a separate higher-risk slice." This spec does not address it.

**4-tier scope precedence is out of scope.** The Windsurf model (system > workspace > global > built-in) requires multi-environment install infrastructure that does not apply to a single-developer plugin. The PM explicitly excluded it.

---

## Verification Commands

All commands assume working directory `C:\work\mega\loop`.

**1. Pilot file frontmatter check (human-readable spot check):**
```bash
bun -e "import { parseFrontmatter } from './src/scripts/lib/frontmatter.mjs'; import { readFileSync } from 'node:fs'; const { frontmatter } = parseFrontmatter(readFileSync('commands/slice-start.md', 'utf8')); console.log(JSON.stringify(frontmatter, null, 2));"
```
Expected output contains `"name": "slice-start"`, `"auto_execute_steps": false`, non-empty `"description"`.

**2. Validate all command frontmatter via manifest script:**
```bash
bun ./src/scripts/validate-manifests.mts
```
Expected: exit code 0, stdout line `Manifests OK`.

**3. TypeScript type-check (no emitted files):**
```bash
bunx tsc --project tsconfig.json --noEmit
```
Expected: exit code 0, no output.

**4. Lint clean:**
```bash
bunx eslint src eslint.config.mjs
```
Expected: exit code 0, zero warnings.

**5. New test file passes:**
```bash
bun test src/tests/command-frontmatter.test.mts --timeout 60000
```
Expected: all 6 tests pass, exit code 0.

**6. Full test suite (regression guard):**
```bash
bun test src/tests/ --parallel --timeout 60000
```
Expected: all tests pass, exit code 0.

**7. Full CI gate sequence:**
```bash
bun ./src/scripts/validate-manifests.mts && bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit && bunx eslint src eslint.config.mjs && bun test src/tests/ --parallel --timeout 60000
```
Expected: exit code 0 at each stage, no failures.

---

## Open Questions

None blocking implementation. The following are noted for future FEATs:

1. **Nested composition:** When a command body references `/other-command` via slash syntax, should the validator parse and verify the referenced command exists? This requires a call-graph parser — deferred to a future FEAT.
2. **auto_execute_steps: true candidates:** No existing command qualifies as fully machine-executable without human confirmation prompts. The field defaults to `false` for all 40 commands. A future FEAT should define what "fully machine-executable" means operationally before allowing `true` values in production commands.
