---
name: pm-rescope
prompt_id: pm-rescope
version: 1.0.0
tier: workflow
description: Autonomous scope/AC rewrite for one FEAT from a list of reviewer objections — the GATE workstream's reject-loop path. Dispatches devcrew:pm --rescope, unattended (no operator confirmation, unlike devcrew:pm-review). Use when architect-reviewer (or any gate) rejects a FEAT/slice proposal and the objections need to be folded back into the FEAT's scope + ACs before re-submission.
---

# PM Rescope — Autonomous Scope Rewrite From Reviewer Objections

Single-FEAT, unattended rescope. This is the autonomous sibling of
`devcrew:pm-review`: no interactive confirmation, no dimension-by-dimension
walkthrough — the GATE calls this in a loop and needs a deterministic
commit or a structured failure, nothing else.

## Usage

```
/devcrew:pm-rescope --id FEAT-NNN --objections "objection one|objection two"
/devcrew:pm-rescope --id FEAT-NNN --objections-file path/to/objections.json
echo '["objection one","objection two"]' | /devcrew:pm-rescope --id FEAT-NNN
```

## Inputs

- **`--id FEAT-NNN`** (required) — exactly one FEAT id per invocation.
- **Objections** — resolve from the first source that has content, in this
  order (matches how other PM dispatch paths accept structured input: a
  flag first, a file second, stdin last):
  1. `--objections "<pipe-delimited text>"` — split on `|`, trim each part.
  2. `--objections-file <path>` — a JSON array of strings.
  3. **stdin** — newline-delimited text, or a JSON array (either accepted).
  If none of the three yields at least one non-empty string, halt with
  `halt_reason: no_objections`.

## Steps

1. **Resolve the FEAT and objections** per the precedence above. Read the
   FEAT file body + frontmatter directly (same read as every other PM
   dispatch path) to confirm the id exists and is in `pending/` or
   `triaged/` — `backlog pm-rescope` (step 4) only writes those states,
   so fail fast here rather than after a wasted PM dispatch.

2. **Resolve PM skills via preset** (same as `devcrew:triage` step 3):

   ```bash
   PRESET_NAME=$(bun -e 'console.log(JSON.parse(require("node:fs").readFileSync(".claude/loop.json","utf8")).preset)')
   bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js" resolve-skills \
     --variant pm \
     --preset "${CLAUDE_PLUGIN_ROOT}/scripts/presets/${PRESET_NAME}.json" \
     --override .claude/loop.json
   ```

   On exit 0, prepend `.dispatchInstructionBlock`. On exit 2, proceed
   without it. On exit 1, halt and surface the stderr.

3. **Dispatch `devcrew:pm` agent** with the `--rescope` trigger. Prompt MUST
   include the FEAT id, the resolved objections list, and a results-file
   path (same DEC-058 scoped-`Write` pattern as triage):

   ```
   <dispatchInstructionBlock from step 2 — omit if exit was 2>

   --rescope FEAT-NNN

   Rewrite this FEAT's scope and Given-When-Then ACs to address ONLY the
   following reviewer objections (address every one; do not touch scores,
   compositePriority, or autonomousSafe):

   1. <objection text>
   2. <objection text>

   Return the rescope output schema (see § Rescope output schema below).
   Write the single-entry JSON array to
   `.claude/artifacts/loop/pm-reviews/<ISO-timestamp>-rescope-results.json`.
   State the exact file path in your final message.
   ```

4. **Validate PM output.**
   - `result.featureId` MUST equal the `--id` passed in step 1.
   - `result.objections` MUST be a non-empty array of strings.
   - `result.acs` MUST be a non-empty array; every entry MUST contain the
     literal words "Given", "When", and "Then".
   - `result.reasoning` MUST be a non-empty string.
   - Reject and halt (`halt_reason: validation_fail`) on any violation —
     no partial commit, same failure posture as `devcrew:triage` step 5.

5. **Commit via the pm-apply write path** (DEC-058 hybrid — the results
   file from step 3 is the only thing PM itself writes; this subcommand is
   the sole writer of the FEAT's AC section and rescope frontmatter):

   ```bash
   bun "${CLAUDE_PLUGIN_ROOT}/dist/loop.js" backlog pm-rescope \
     --file ".claude/artifacts/loop/pm-reviews/<ISO-timestamp>-rescope-results.json" \
     --ids FEAT-NNN
   ```

   Replaces the FEAT's "## Acceptance criteria (Given-When-Then)" section
   in place (never appends a duplicate heading) and writes
   `pm_rescope_count` (incrementing), `pm_last_rescoped`, and
   `rescope_objections` to frontmatter, plus a PM review artifact. A
   failing entry writes NOTHING — inspect `failures` in the JSON output.

6. **Halt on any failure** (no objections resolved, PM dispatch error,
   validation failure, or a non-empty `pm-rescope` `failures` array).
   Surface a structured halt exactly like `devcrew:triage`:

   ```json
   {
     "path": "pm-rescope",
     "halted": true,
     "halt_reason": "<no_objections|pm_error|validation_fail>",
     "halt_detail": "<...>"
   }
   ```

## Rescope output schema

The `devcrew:pm` agent's `--rescope` response uses its own schema — **NOT a
re-score**: no `scores`, no `compositePriority`, no `autonomousSafe` (those stay
whatever triage set). Only scope and ACs move.

```json
{
  "featureId": "FEAT-NNN",
  "objections": ["<objection text, echoed verbatim from the input>", "..."],
  "acs": [
    "AC-1: Given <context>, When <action>, Then <outcome>.",
    "AC-2: Given <context>, When <action>, Then <outcome>.",
    "AC-3: Given <context>, When <action>, Then <outcome>."
  ],
  "scopeNotes": "What was cut / narrowed and why, one paragraph.",
  "reasoning": "One-line summary of how the rewrite addresses each objection."
}
```

Rules: `acs` MUST be ≥3 (fewer only if the narrowed scope genuinely cannot
support 3 — explain in `reasoning`), every entry containing the literal words
"Given", "When", "Then". `objections` MUST be a non-empty array echoing the
input verbatim — the audit trail the GATE reads to confirm every objection was
handled. Narrow scope per Framework 2 (Scope Challenge) where an objection flags
creep; tighten AC precision per the AC drafting rules where one flags a
vague/untestable AC.

## Return contract

```json
{
  "path": "pm-rescope",
  "featureId": "FEAT-NNN",
  "rescopeCount": <N>,
  "filePath": "..."
}
```

## Idempotency (GATE may call this up to 2x per FEAT)

Re-running rescope for the same FEAT — even with a different objections
list — REPLACES the AC section, never appends a second one. `pm_rescope_count`
increments each successful call so the audit trail shows how many rewrite
passes a FEAT went through before the GATE accepted it.

## Difference from `/devcrew:pm-review`

`/devcrew:pm-review` is interactive: it walks the operator through all three
PM frameworks and asks for confirmation on each dimension before writing
scores. `/devcrew:pm-rescope` is unattended: it takes a fixed objections
list, produces a fixed rewrite, and commits or halts — no dimension
walkthrough, no re-scoring. Use `pm-review` when a human wants to
challenge a priority; use `pm-rescope` when the GATE's reject loop needs
an autonomous scope correction.

## Related

- `agents/pm.md` — the base PM agent this skill dispatches with `--rescope`
  (the rescope output contract is self-contained above, § Rescope output schema).
- `src/scripts/lib/pm-apply.mts` — `applyPmRescope`, the write path this
  skill's step 5 commits through.
- `skills/triage/SKILL.md` — sibling autonomous PM dispatch path (scoring,
  not rescoping); this skill mirrors its dispatch/validate/commit/halt
  shape.
