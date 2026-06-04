---
id: FEAT-028
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-06-04
updated: 2026-06-04
depends_on: []
slices: [SLICE-23]
derived_from: null
triage_notes: no fields needed inference
started_at: 2026-06-04
slices_complete: [SLICE-23]
---
# FEAT-028: Agent-aware autonomous backlog flow

## Description

Wire the three new role agents (researcher, architect, document-writer)
into the autonomous loop primitives so that backlog quality, spec
decomposition quality, and post-slice documentation continuity stop
depending on a human remembering to dispatch them.

Today PM agent already references `loop:researcher` and `loop:architect`
as escalation targets, but no harness step actually dispatches them.
Document-writer has no integration at all. Result: FEAT bodies land
empty, SPECs decompose on title-only guesses, and CHANGELOG / release
notes / ADR drift accumulates between manual cleanups.

## Goals

1. Every `/loop:backlog-add` invocation auto-dispatches the researcher
   agent to produce a citation-backed body before the FEAT lands in
   pending/. Researcher capped at 60s and 20 file reads per dispatch.
2. Every `/loop:spec-decompose` invocation auto-dispatches the architect
   agent to produce a rich `--features-file` artifact (title + scope +
   out-of-scope + dependencies + technical_risk hint + autonomous_safe
   hint per FEAT) instead of relying on agent gut-read of the SPEC body.
3. Every `/loop:slice-complete` invocation auto-dispatches the
   document-writer agent (async, non-blocking) to draft CHANGELOG line,
   per-DEC ADR, release-notes append (when target_release set), and
   README / docs suggestions (when surface-touching).

## Design decisions (resolved up front)

- **Always-on, opt-out via flag** (`--no-research`, `--no-architect`,
  `--no-doc-writer`). Friction-free default beats "remembered the flag".
- **No skip heuristics on researcher** — always run. Bounded cost via
  60s + 20-file caps is sufficient guardrail.
- **Cost-advisor warn does NOT skip auto-dispatches** — run anyway, log
  warning so retro surfaces it. User accepts spend in exchange for
  unblocked workflow.
- **Brainstorming dispatched on incomplete SPEC** — skip; let architect
  do best-effort decomposition from partial SPEC + emit warning. Avoids
  autonomous-loop halt waiting for human dialogue.
- **Document-writer runs async** post-slice-complete — does not block
  close ceremony.
- **Doc-writer multi-output**: single dispatch produces CHANGELOG line +
  ADR drafts (per DEC-NNN) + release-notes append (if target_release) +
  README suggestions (if user-facing surface). One agent, multi-output.

## Slices

- **SLICE-A — dispatch infra foundation** (~1.5 hr)
  - Shared `auto-dispatch.mts` module: agent spawn + cost attribution +
    audit log to `.claude/artifacts/loop/auto-dispatch.jsonl` + opt-out
    flag parser
  - Cost-advisor integration (log warn, don't skip)
  - Subagent dispatch limit reuse (respects existing crew cap)
  - Try-catch wrapper: auto-dispatch failure logs + does NOT block
    parent command
  - Tests for: opt-out flag honored, audit log written, failure
    isolation, cost warn logged
  - Lands first; B/C/D consume

- **SLICE-B — researcher into backlog-add** (~2 hr)
  - Wire researcher dispatch into backlog add command
  - 60s + 20-file caps applied to researcher invocation
  - Researcher findings spliced into FEAT body (replaces template
    placeholders)
  - `--no-research` opt-out
  - Tests for: research output merged correctly, opt-out skips, cap
    enforced, failure does not block backlog add

- **SLICE-C — architect into spec-decompose** (~2 hr)
  - Wire architect dispatch into spec decompose command
  - Architect produces `--features-file` artifact when --features not
    given
  - Incomplete SPEC detection: missing `objective` or `scope`
    frontmatter → log warning, proceed with architect best-effort
  - `--no-architect` opt-out
  - Tests for: architect output consumed, incomplete SPEC handled,
    opt-out skips

- **SLICE-D — document-writer into slice-complete** (~2 hr)
  - Hook into feature-lifecycle.mts at slice-complete
  - Async background dispatch (does not block close ceremony)
  - Multi-output emitter: CHANGELOG line + ADR drafts + release-notes
    append + README/docs suggestion
  - Output routing based on what slice / grade / FEAT frontmatter has
    set (target_release, DEC-NNN extracted, surface flags)
  - `--no-doc-writer` opt-out on slice-complete
  - Tests for: each output kind written conditionally, async does not
    block, opt-out skips

## Acceptance criteria

- [ ] `node scripts/loop.mjs backlog add --title "X"` (no other flags)
      auto-dispatches researcher; FEAT body contains citation-backed
      findings; failure of researcher does not prevent FEAT creation
- [ ] `--no-research` flag skips researcher; backlog-add completes
      with placeholder body identical to current behavior
- [ ] `node scripts/loop.mjs spec decompose --id SPEC-NNN` (no
      `--features`) auto-dispatches architect; produced FEATs have
      scope + out-of-scope + technical_risk + autonomous_safe in
      frontmatter
- [ ] Incomplete SPEC (missing objective) emits warning but still
      decomposes via architect best-effort
- [ ] `node scripts/loop.mjs slice complete --id SLICE-NN` triggers
      async document-writer dispatch; ceremony close returns immediately
- [ ] When target_release set on FEAT, document-writer appends release
      notes; when DEC-NNN extracted, ADR drafts appear in
      `docs/decisions/`
- [ ] Every auto-dispatch logs one line to
      `.claude/artifacts/loop/auto-dispatch.jsonl` with agent name,
      cost, duration, parent command
- [ ] All four slices pass `npm test`, `npm run lint`,
      `npm run typecheck`, validators

## Risks

- **Cost amplification** — marathon 25 slices × $1.50 doc-writer = +$37
  per loop; +$0.50 per add; +$3 per decompose. Mitigation: audit log
  surfaces in `/loop:brief` cost section.
- **Latency** — researcher pre-add adds 20-60s. Acceptable: backlog-add
  is interactive, not loop-critical-path. Doc-writer is async.
- **Cascading failures** — auto-dispatched agent crash. Mitigation:
  try-catch wrapper isolates; parent command always succeeds.
- **Audit gap** — auto-spend invisible. Mitigation: auto-dispatch.jsonl
  + cost-report integration.
- **Doc churn on trivial slices** — every 1-line slice generates ADR
  draft. Mitigation: document-writer decides "no doc needed" + emits
  empty result; no file written when no DEC, no target_release, no
  surface change.

## Notes

- Pattern alert: 4 slices on one FEAT will trigger the existing
  `decomposition` warn (threshold ≥3). Accepted in exchange for unified
  shipping story. Foundation slice (A) must land before B/C/D — others
  parallelizable after A.
- `commands/architect.md` (CLI: 2-model split, FEAT-005) and
  `agents/architect.md` (agent: design + ADR) share name. Disambiguate
  during SLICE-C wiring (dispatch the AGENT, not the CLI).
