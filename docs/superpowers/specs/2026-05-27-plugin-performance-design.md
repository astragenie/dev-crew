# Plugin Performance Optimization — Design Spec

**Date**: 2026-05-27
**Status**: Draft
**Goal**: Reduce autonomous loop cost by ~60% and CLI latency by ~40%

## Problem

Five recent slices cost $414 total (avg $83/slice). Opus accounts for 88%
of spend despite handling routine mechanical work. CLI operations re-read
config 20+ times per invocation, scan directories without caching, and
re-read templates on every call. Token preamble has duplication across
rules files.

## Pillars

### 1. Model Routing — est. 60% cost reduction

Add `modelRouting` to `loop.json`:

```json
"modelRouting": {
  "default": "sonnet",
  "sliceStart": "opus",
  "review": "opus",
  "gradeWrite": "opus",
  "build": "sonnet",
  "validate": "sonnet"
}
```

**Implementation**:
- New module `scripts/lib/model-router.mjs`
  - `resolveModel(phase, config)` — returns model id from routing config
  - Falls back to `default` when phase not configured
- `slice-start` dispatch instruction includes `--model <resolved>` hint
- `crew-bridge.mjs` passes model hint to crew CLI `--model` flag when
  dispatching subagents
- Cost-report already captures model mix — no changes needed for
  observability

**Files**: `scripts/lib/model-router.mjs` (new), `scripts/lib/slice-linker.mjs`,
`scripts/lib/slice-linker/crew-bridge.mjs`, `templates/loop-rules.md`

### 2. Per-Invocation Runtime Cache — est. 40% faster CLI

New module `scripts/lib/cache.mjs`:

```js
const _store = new Map();

export function cached(key, asyncFn) {
  if (_store.has(key)) return _store.get(key);
  const promise = asyncFn();
  _store.set(key, promise);
  return promise;
}

export function bust(key) { _store.delete(key); }
```

**What gets cached** (wrap existing calls):
- `readConfigFile()` in config loading — 20+ reads → 1
- `listBacklog()` / `listGrades()` / `listSpecs()` directory scans
- `locateSliceFile()` recursive walks
- `readTemplate()` file reads
- `findGradeFileForSlice()` directory scans

**Invalidation**: None. Cache scope = single CLI process. On write
operations (addFeature, moveFeature, writeGrade), call `bust(key)` for
the affected listing.

**Files**: `scripts/lib/cache.mjs` (new), `scripts/lib/backlog-parser.mjs`,
`scripts/lib/grade-parser.mjs`, `scripts/lib/spec-parser.mjs`,
`scripts/lib/paths.mjs`, `scripts/lib/grade-writer.mjs`

### 3. Token Diet — est. 20% preamble reduction

**Deduplication**:
- CLAUDE.md: remove inline HARD RULES summary (20 lines). Keep only
  `@.claude/loop/rules.md` reference — full rules load on demand.
- Merge `templates/dev-crew-method.md` content into `templates/loop-rules.md`
  (they overlap 60%+). Remove dev-crew-method.md as separate file.
- Compress `templates/master-prompt.md`: remove ceremony description
  already in rules (55 → 35 lines).

**Compression**:
- Rewrite Cross-Slice Continuation in loop-rules.md from prose paragraphs
  to structured numbered checklist (est. 186 → 120 lines).
- Trim verbose agent/skill preambles where content duplicates what the
  crew plugin already provides.

**Files**: `CLAUDE.md`, `templates/loop-rules.md`,
`templates/master-prompt.md`, `templates/dev-crew-method.md` (delete or merge)

### 4. Tool Failure Prevention — eliminate 6-9% waste

**Problem**: 6-9% of tool calls fail across slices (41 Bash failures in
grade-trend gate alone). Each failure costs tokens for the error response
plus the retry.

**Implementation**:
- Add `scripts/lib/command-validator.mjs` with `validateBashCommand(cmd)`
  - Checks: file paths exist before operations, correct flag syntax,
    no common shell mistakes
  - Returns `{ valid, suggestion }` for fixable errors
- Wire into crew-bridge.mjs: before dispatching Bash-heavy subagent
  tasks, pre-validate the planned commands
- Add guidance to `templates/loop-rules.md`: "Pre-validate file paths
  and command syntax before tool dispatch. Prefer Read/Grep/Glob over
  Bash for file operations."

**Files**: `scripts/lib/command-validator.mjs` (new),
`scripts/lib/slice-linker/crew-bridge.mjs`, `templates/loop-rules.md`

### 5. Subagent Dispatch Discipline — reduce cold-start overhead

**Problem**: 17 subagent dispatches across 5 slices. Each cold-starts
without cache, re-derives session context. Cost-insights flag this as
10-20% waste.

**Implementation**:
- Add dispatch budget to `loop.json`:
  ```json
  "dispatchLimits": {
    "maxSubagentsPerSlice": 4,
    "preferInlineFor": ["single-file-edit", "test-fix", "lint-fix"]
  }
  ```
- `crew-bridge.mjs` checks budget before dispatching — if over limit,
  emit warning in slice progress
- Update `templates/loop-rules.md` Dispatch Discipline section:
  - Inline execution for single-file mechanical changes
  - Subagent only for bounded independent tasks (review, validation)
  - Never dispatch subagent for lint/format fixes
- Cost-report already tracks `subagentDispatches` — add threshold alert
  in cost-advise when > 4 per slice

**Files**: `scripts/lib/slice-linker/crew-bridge.mjs`,
`templates/loop-rules.md`, `scripts/lib/cost-advisor.mjs`

## Verification

1. **Model routing**: Run `/loop:slice-start` — dispatch instruction
   should include `--model sonnet` for build tasks
2. **Cache**: Run `node scripts/loop.mjs brief --repo .` twice — second
   run should show same results with fewer disk reads (add debug logging)
3. **Token diet**: Diff line counts before/after on rules + templates
4. **Tool failures**: Run test suite, check 0 lint warnings, 0 test
   failures
5. **Subagent limits**: Check crew-bridge emits warning when dispatch
   count exceeds budget
6. **Full CI**: `npm test` (324+), `npm run lint` (0 warnings),
   `npm run format:check` (clean)

## Priority Order

1. Model routing (biggest cost impact, smallest code change)
2. Token diet (second biggest impact, text-only changes)
3. Per-invocation cache (runtime improvement, moderate code change)
4. Subagent dispatch discipline (config + template changes)
5. Tool failure prevention (new module, lowest priority)
