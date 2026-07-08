---
name: runner:authoring-slices
description: Use when deriving a new slice from a product-backlog entry or authoring a slice file from scratch. Loads the canonical slice template structure and Reviewer A / Reviewer B review questions. Trigger when the user asks to "write a slice", "derive a slice", "add to backlog", or after `/runner:derive-slice` is invoked.
---

# Authoring Slices

Slice files live under `<slicesRoot>/pending/`, `<slicesRoot>/active/`, and
`<slicesRoot>/completed/`. New slices start in `pending/` and move forward as
they're reviewed and implemented.

## Canonical template

Read `<aiLoopRoot>/00-entry/SLICE_TEMPLATE.md`.

<HARD-GATE>
Every slice file MUST have:

- `# SLICE-NN: <title>` heading (NN zero-padded if < 10)
- Priority (P0 / P1 / P2)
- Status (Pending → Reviewed → Approved → In Progress → Completed / Blocked)
- Author + Created date
- Objective (one sentence, user-visible outcome)
- Why now (what this unblocks, what unblocks this)
- In scope (specific files / modules / endpoints)
- Out of scope (explicit punts to future slices)
- Acceptance criteria as a checklist (each testable with evidence)
- Done When (the full close-out checklist)
- Reviewer ladder
- Risks
- Open questions
</HARD-GATE>

## AC quality checklist

Every acceptance criterion in the slice MUST satisfy:

- **Testable with concrete values** — Given-When-Then form or "system
  shall X when Y", with specific data (not "handles errors gracefully"
  but "returns exit code 1 and logs `rules: empty glob` when patterns
  is `[]`").
- **Evidence-backed** — names the proof: test file + case name, command
  to run, file path, or endpoint URL.
- **3–5 AC per slice** — fewer means the slice is under-specified;
  more means it should be split.
- **Edge + error coverage** — at least one AC for an edge case and one
  for an error/failure path. A slice with only happy-path AC fails
  review.
- **NFRs where relevant** — performance bounds, security constraints,
  observability hooks (logs/metrics for new code paths) stated as AC,
  not assumed.
- **DoD separate from AC** — tests green, lint clean, docs updated
  belong in "Done When", not in acceptance criteria.
- **Weak-dimension AC (mandatory)** — check
  `.claude/artifacts/loop/loop-snapshot.md` (or
  `bun src/scripts/loop.mts lessons recent 5`) for grade dimensions
  averaging below 0.80 over the last 5 grades. Every such dimension
  MUST have at least one targeting AC in the slice (e.g. observability
  weak → AC requiring a log line or metric on the new code path, with
  the test that asserts it).

When AC can't be written to this standard from the FEAT body alone, do not
ship vague AC — the standalone `runner:spec-writer` agent was retired and
absorbed into PM (see the "AC drafting rules" in `agents/pm.md`). Pass
`--deep` to `/runner:triage` or `/runner:intake` (or rely on the automatic
P0/P1 trigger) so PM drafts Given-When-Then AC inline in the same response.

## INVEST check (slice shape)

Before approving, verify the slice is:

- **Independent** — implementable without waiting on another pending slice.
- **Negotiable** — out-of-scope list shows what was consciously punted.
- **Valuable** — objective states a user-visible or loop-visible outcome.
- **Estimable** — a builder can bound the work from in-scope + plan steps.
- **Small** — one implementation pass; if the plan exceeds ~6 steps of
  ≤1 hour each, split the slice.
- **Testable** — every AC passes the checklist above.

## Naming convention

`SLICE_<NN>_<UPPER_SNAKE_SHORT_NAME>.md`

Examples:
- `SLICE_03_DOCUMENT_INGESTION.md`
- `SLICE_27_MEMORY_EXPORT_IMPORT.md`

Number is monotonically increasing across the repo. Pick the next integer
beyond the highest existing slice number across all of `pending/`,
`active/`, and `completed/`.

## Reviewer A — domain / engineering pass

Reviewer A reads the slice as a senior engineer for the affected area.
Questions:

- Are acceptance criteria testable with concrete evidence (file paths, test
  commands, endpoint URLs, etc.) per `EVIDENCE_RULES.md`?
- Is the in-scope list bounded? Can a single implementation pass produce
  everything listed?
- Is the out-of-scope list explicit enough to prevent scope creep?
- Are there obvious gaps in the implementation path the slice author missed?
- Do the acceptance criteria collectively prove the user-visible outcome
  stated in the objective?

Revise the slice file inline based on findings.

## Reviewer B — security + production-readiness pass

Reviewer B reads as a security and production-readiness reviewer. Questions:

- Does the slice violate any hard rule in `CLAUDE.md` (anti-patterns,
  forbidden coupling, etc.)?
- Are secrets handled correctly (no hardcoding, no committed env files)?
- Are observability hooks (logs, traces, metrics) considered for new code
  paths?
- Are tenant isolation / authorization requirements addressed where
  relevant?
- Do new infrastructure resources belong in Terraform (or whatever the repo
  uses for infra)?

Revise inline.

## After both reviewers pass

1. Update `Status: Approved` in the slice file
2. Move from `pending/` to `active/`
3. Append to `<backlogPath>/approved-slices.md`:
   ```
   ## SLICE-NN: <title>
   - **File**: <slicesRoot>/active/SLICE_NN_<NAME>.md
   - **Priority**: P0|P1|P2
   - **Status**: Approved (YYYY-MM-DD)
   ```
4. Cross-reference from `<backlogPath>/product-backlog.md` (strikethrough
   or remove the entry that spawned this slice, noting the slice number)

## When the slice closes

1. Move file from `active/` to `completed/`
2. Update `approved-slices.md` entry: `Status: COMPLETED (YYYY-MM-DD)` plus
   an `Evidence:` line summarizing the proof
3. Append to `<backlogPath>/completed-slices.md` with the format described
   there
4. Write a `crew write-final-synthesis` artifact

## Plan handshake (pre-flight)

Before the slice moves from `pending/` to `active/`, optionally run the
plan pre-flight to produce a structured plan artifact the builder can
execute against:

```bash
bun src/scripts/loop.mts slice plan --id SLICE-NN
```

This writes `docs/specs/plans/SLICE_NN_PLAN.md` with four sections:

1. **Research summary** — what was read, what was found, file:line citations
2. **Proposed steps** — ordered, each ≤ 1 hour of work
3. **Test additions** — name the test file(s) and the cases that will prove the AC
4. **Risks + mitigations**

Use the plan artifact whenever:

- the slice touches 3+ files
- the slice introduces a new module or contract surface
- the slice has been flagged `autonomous_safe: false`

The `architect` agent is the right dispatcher when the plan surfaces a
structural decision (provider abstraction, new contract). The
`researcher` agent is the right dispatcher when the plan needs prior-art
mapping. The `crew:fullstack-dev` consumes the finished plan.
