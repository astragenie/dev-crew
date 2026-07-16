---
objective: T3 — reviewer-dispatch template split (durable findings vs run evidence)
owner: builder-B3 (crew:fullstack-dev)
allowed_scope:
  - src/scripts/lib/post-builder-fanout.mts
  - src/tests/post-builder-fanout.test.mts
forbidden_scope: everything else (dispatch.mts, start-slice.mts, complete-slice.mts, memory-*, loop-snapshot.md, CLAUDE.md, commands/, agents/)
deliverable: reviewer dispatch prompt now emits a required "## Durable findings" section (transferable lessons, max 3, "none" legal) and a "## Run evidence (ephemeral)" section (gate outputs, timings, file lists, verdict mechanics), with one negative and one positive example, inserted between "## Not checked" and the handoff-read instruction. No change to ladder resolution, reviewer selection, subagent_type, PARALLEL_DISPATCH_CONTRACT wording, or aggregation rules.
---

# Handoff — W1 B3: reviewer-dispatch template split

## Objective

Add a required output-structure split to the post-builder reviewer dispatch
prompt so review payloads separate durable, transferable lessons from
ephemeral run mechanics (this session's per-agent memory tagging /
extraction-quality program, T3 workstream).

## Owner

builder-B3 (crew:fullstack-dev), wave 1 of 3 parallel builders.

## Allowed scope

- `src/scripts/lib/post-builder-fanout.mts`
- `src/tests/post-builder-fanout.test.mts`

## Forbidden scope

Everything else in the repo — in particular `dispatch.mts`, `start-slice.mts`,
`complete-slice.mts`, any `memory-*` module, `loop-snapshot.md`, `CLAUDE.md`,
`commands/`, `agents/`.

## Changes

`reviewerPrompt()` in `post-builder-fanout.mts` now inserts two new sections
between the existing `## Not checked` block and the `Read the builder
handoff...` line, identical text for Reviewer A and Reviewer B:

```
## Durable findings (max 3, "none" is legal)
Transferable lessons only — a bug CLASS to watch for next time, a contract
truth discovered, or decision rationale. Never run-state.
Bad: "tsc was clean." Good: "Provider adapters here swallow timeout errors
on bare catch — check for that shape in any new provider.mts."

## Run evidence (ephemeral)
Gate outputs, timings, file lists, verdict mechanics — everything else about
this run.
```

No change to: `resolveLadder`, ladder fallback behavior, `subagent_type`,
task role naming, `PARALLEL_DISPATCH_CONTRACT v1` wording, aggregation rules,
or memory-context prepend logic (`buildMemoryContext` block still prepends
ahead of the whole prompt unchanged).

Test file: updated the FEAT-219 golden byte-identical `expectedBody` array to
include the two new sections, and added one new test —
`"reviewer prompts include '## Durable findings' and '## Run evidence
(ephemeral)' sections for both roles and both ladder configs"` — which
iterates the default two-reviewer ladder plus each single-entry ladder
(`["A"]`, `["B"]`), asserting section presence, the negative/positive example
text, and correct ordering (Not checked → Durable findings → Run evidence →
handoff-read instruction) for every emitted task.

## Changed files

- `src/scripts/lib/post-builder-fanout.mts` (+7 lines)
- `src/tests/post-builder-fanout.test.mts` (+50 lines)

## Gate evidence

- `bun test src/tests/post-builder-fanout.test.mts --timeout 60000` → 12 pass, 0 fail
- `bun test src/tests/ --parallel --timeout 60000` → 2925 pass, 7 skip, 0 fail (full suite, pre-existing unrelated stderr noise from slice-id-allocator/worktree-manager tests, not new)
- `bunx tsc -p tsconfig.json --noEmit` → clean
- `bunx tsc -p tsconfig.test.json --noEmit` → clean
- `bunx biome lint src/scripts/lib/post-builder-fanout.mts src/tests/post-builder-fanout.test.mts` → clean
- `bunx biome format src/scripts/lib/post-builder-fanout.mts src/tests/post-builder-fanout.test.mts` (check mode, no `--write`) → clean

## Confidence level

High — pure prompt-text addition, single function touched, all gates green,
golden test extended rather than loosened.

## Risks / open questions

- The new sections are guidance prose only; there is no CLI flag (e.g.
  `--durable-findings`) wired on the crew-plugin side to actually capture
  these sections structurally — reviewers write them as markdown headings
  in their handoff/review body, same as today's `## Not checked` section
  does NOT have a dedicated flag beyond `--not-checked`. This matches the
  plan's T3 framing ("guidance prose in reviewer dispatch prompts... not a
  new artifact spec") — no follow-up needed unless a later slice wants to
  make durable-findings machine-parseable.
- Did not touch `commands/*.md` or `agents/pm.md` (out of ownership) even
  though the plan mentions `agents/pm.md` is near its 300-line cap — not
  applicable here since this file isn't an owned agent file.

## Suggested next handoff

Wave 2 — dispatch `crew:reviewer` in an isolated worktree pointed at branch
`worktree-agent-a9823114402a56583` (commit `703e21f8`) for independent review
of this diff, per the wave plan's merge-train step (B3 merges first — smallest
diff).

Branch: `worktree-agent-a9823114402a56583`
SHA: `703e21f80852a1e5e1b9a858836c4fa1f137f3df`
