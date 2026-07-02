---
filed: 2026-07-02
target_plugin: hero-crew
target_repo: astragenie/dev-team
status: open
priority: P1
loop_tracking_feat: FEAT-209
related:
  - .claude/artifacts/loop/decisions/DEC-018.md
  - .claude/artifacts/loop/decisions/DEC-019.md
  - .claude/artifacts/loop/decisions/DEC-060.md
  - docs/research/2026-07-02-architecture-retrospective.md
---

# Upstream-request: validate workflow-state.json against WorkflowStateSchema at load, and publish schemaVersion

## Filed against

- **Plugin:** hero-crew (`astra/crew/<version>`)
- **Component:** `scripts/lib/workflow-state.ts::loadWorkflowState` +
  `scripts/lib/schemas.ts::WorkflowStateSchema`
- **Reason:** `WorkflowStateSchema` is a fully-specified Zod schema that is
  never invoked at load time. `loadWorkflowState` parses the file with raw
  `JSON.parse(...) as WorkflowState` under the comment "State file is always
  written by this module; shape is trusted." That assumption no longer holds:
  runner-plugin (a downstream consumer) writes session pins and worktree
  paths into this same file as a documented, deliberate cross-plugin
  contract, and the schema carries no version marker either side can gate on.

## Problem

### 1. No runtime validation at load

`loadWorkflowState` (`scripts/lib/workflow-state.ts:115-138`) does:

```ts
const workflowText = await readFileIfExists(workflowPath);
if (workflowText !== null) {
  // State file is always written by this module; shape is trusted.
  return JSON.parse(workflowText) as WorkflowState;
}
```

Any malformed or partially-written file — truncated by a crash mid-write, a
merge conflict marker left behind, a hand-edit, or (as happened once) a
long-running session that hung and left the file in an inconsistent state —
either throws a raw `SyntaxError` with no repair guidance, or worse,
succeeds with a shape that satisfies TypeScript's compile-time cast but not
the actual `WorkflowStateSchema` invariants, silently producing an invalid
in-memory object that downstream code trusts. The 2026-06-10 incident
(session-hang rebuild, FEAT177/SLICE88, ~117 min / 85M tokens) left its only
trace as a self-reported `reconcileNote` field inside the very state file it
corrupted — no external postmortem artifact exists anywhere in either repo's
history, because there is no validation boundary that could have flagged the
corruption as it happened.

### 2. No schemaVersion field to gate on

`WorkflowStateSchema` (`scripts/lib/schemas.ts:69-76`) has no version marker:

```ts
export const WorkflowStateSchema = z.object({
  version: z.string(),
  updatedAt: IsoDate,
  currentRun: WorkflowRun.nullable(),
  recentRuns: z.array(WorkflowRun)
});
```

(`version: z.string()` here is a legacy free-form identifier, not a schema
version — it does not currently distinguish shape revisions.) Without an
explicit `schemaVersion`, neither crew nor any downstream consumer can
detect "this file was written by a schema I don't understand yet" versus
"this file is just missing optional fields." runner-plugin has already
implemented its own write-side guard for this gap (see "Loop-side
coordination" below) but it can only protect the writes it makes — it
cannot validate the file crew itself reads.

## Proposed changes

### Schema addition

```ts
export const WorkflowStateSchema = z.object({
  schemaVersion: z.number().int().positive().default(1), // new, additive
  version: z.string(),
  updatedAt: IsoDate,
  currentRun: WorkflowRun.nullable(),
  recentRuns: z.array(WorkflowRun)
});
```

Additive and backward compatible: files with no `schemaVersion` key parse
with `.default(1)` rather than failing validation.

### `loadWorkflowState` validates at load

```ts
export async function loadWorkflowState(
  repoPath: string,
  options: LoadOptions = {}
): Promise<WorkflowState> {
  const workflowPath = path.join(repoPath, ...WORKFLOW_STATE_PATH);
  const workflowText = await readFileIfExists(workflowPath);
  if (workflowText !== null) {
    return parseWorkflowStateOrThrow(workflowText, workflowPath);
  }
  // ...legacy path unchanged...
}
```

`parseWorkflowStateOrThrow` (new helper):

1. Attempts `JSON.parse`; on failure, throws a named error (e.g.
   `WorkflowStateParseError`) carrying the file path and the underlying
   parse error message.
2. On successful JSON parse, runs `WorkflowStateSchema.safeParse(...)`; on
   failure, throws a named error (e.g. `WorkflowStateValidationError`)
   carrying the file path and the Zod issue list, plus a repair hint (e.g.
   "run `crew brief-me --repair` to attempt reconstruction from
   `currentRun`/`recentRuns` fragments, or delete the file to let it
   re-scaffold").
3. On success, returns the validated, typed `WorkflowState`.

Whether `--repair` ships as an actual reconstruction mode or the hint text
merely points at manual recovery is left to hero-crew's implementation
judgment — the load-time validation boundary is the load-bearing part of
this request, not the repair UX.

### Version-bump discipline

Whenever a future change to `WorkflowStateSchema` is not purely additive
(removes a field, changes a field's type, or changes a nullable/required
invariant), `schemaVersion` increments. This gives downstream consumers
(runner-plugin's write-side guard, or any future consumer) a value to
compare against a known-supported ceiling, joining `MIN_CREW_VERSION` as
part of the documented cross-plugin contract surface.

## Motivation

- **ADR-D**, `docs/research/2026-07-02-architecture-retrospective.md` §5:
  "crew validates with existing `WorkflowStateSchema` at load (fail loud,
  offer `--repair`); the file gains `schemaVersion`; loop refuses to write
  on version mismatch." This request is the crew-side half of that decision;
  the loop-side half (write-time `schemaVersion` guard on runner-plugin's
  own write paths) is recorded independently in
  `.claude/artifacts/loop/decisions/DEC-060.md` and does not depend on this
  request landing first.
- **DEC-018** (`.claude/artifacts/loop/decisions/DEC-018.md`) already names
  the risk this closes: "introduces a write path loop did not previously
  own; potential for schema divergence if crew adds required fields." That
  risk was accepted as a deliberate, mitigated tradeoff — this request is
  the mitigation crew's side owes, not a reversal of the tradeoff.
- **Retrospective §4 F-13**: "No end-to-end slice trace... the 06-10
  incident's only record is inside mutable state." A load-time validation
  boundary is the first structural fix — corruption becomes a loud,
  attributable error at the moment it's read, not a silent state that only
  a downstream consumer's own drift-checking (`session-drift.mts`) happens
  to notice indirectly.

## Prior art in this repo

- `.claude/artifacts/loop/decisions/DEC-018.md` — created the write path
  this request now asks crew to validate against.
- `.claude/artifacts/loop/decisions/DEC-019.md` — established the
  failure-atomicity invariant on runner-plugin's worktree-persistence write,
  the same call site this request's schema guard would protect on the read
  side.
- `.claude/artifacts/loop/decisions/DEC-060.md` — the loop-side
  `schemaVersion` write guard (`WorkflowStateSchemaMismatchError`,
  `WorkflowStateCorruptError`), filed as the counterpart decision that does
  not depend on this request.

## Acceptance criteria (for hero-crew implementation)

- **AC-1**: `WorkflowStateSchema` gains `schemaVersion: z.number().int().positive().default(1)`;
  existing files with no `schemaVersion` key parse successfully as
  `schemaVersion: 1`.
- **AC-2**: `loadWorkflowState` runs `WorkflowStateSchema.safeParse` (or
  equivalent) on every load; malformed JSON and schema-invalid (but
  syntactically valid) JSON both throw distinct, named errors — not a raw
  `JSON.parse` `SyntaxError` and not a silently-cast invalid object.
- **AC-3**: Both new error types carry the file path and enough detail
  (parse error message, or Zod issue list) to act as a repair hint without
  needing to re-read the file manually.
- **AC-4**: `schemaVersion` bump discipline is documented (e.g. in
  `scripts/lib/schemas.ts` comments or a CONTRIBUTING note) alongside
  existing `MIN_CREW_VERSION` guidance, so future non-additive schema
  changes reliably increment it.
- **AC-5**: tests cover: valid file with `schemaVersion` present, valid file
  with `schemaVersion` absent (defaults to 1), syntactically invalid JSON,
  syntactically valid JSON that fails schema validation (e.g. `currentRun`
  missing a required field).

## Loop-side coordination

Independent of when this lands, runner-plugin will (per DEC-060):

1. Ship `src/scripts/lib/workflow-state-guard.mts` with its own
   `LOOP_SUPPORTED_WORKFLOW_STATE_SCHEMA_VERSION` constant and refuse its
   own cross-plugin writes (`writeSessionIdToWorkflowState`,
   `writeWorktreePathToState`, `rollbackWorktreePathInState`) when a file's
   `schemaVersion` exceeds what loop understands.
2. Once this request ships, align `LOOP_SUPPORTED_WORKFLOW_STATE_SCHEMA_VERSION`
   with hero-crew's published `schemaVersion` policy and bump
   `MIN_CREW_VERSION` (`src/scripts/lib/plugin-identity.mts`) to the release
   that carries load-time validation, so an old loop build talking to a new
   crew build (or vice versa) fails the existing `MIN_CREW_VERSION` gate
   before it ever reaches a schema mismatch at runtime.

## How to mark resolved

When `WorkflowStateSchema` gains `schemaVersion` and `loadWorkflowState`
validates at load, update this file's frontmatter:

```yaml
status: resolved-by-upstream
resolved: <date>
resolved_by: hero-crew vN.M.K — WorkflowStateSchema.schemaVersion + loadWorkflowState validation
```
