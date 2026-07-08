---
id: FEAT-237
status: pending
priority: P2
category: maintenance
target_release: null
created: 2026-07-08
updated: 2026-07-08
depends_on: []
slices: []
derived_from: null
tags: [concern:docs, surface:plugin]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: null
triage_notes: "Install-template command-name drift — same class as #371 (phantom crew:builder in installed rules), surfaced while fixing #370/#371. The install templates that /runner:install writes into consumer repos — templates/claude-md-hard-rules.md + templates/loop-rules.md — still reference removed/renamed command names: /runner:slice start|complete (real surface: /runner:start + /runner:close), /runner:slice from-feature, /runner:slice-from-feature, /runner:derive-slice, /runner:slice grade|grade-write (subsumed into /runner:close per v0.53). FEAT-236 SLICE-4 fixed the generated CLAUDE.md but NOT the templates — so /runner:install regenerates the drift back. Fix the templates to the real command surface, and extend the agent-ref/command validator to scan command-token refs in templates so this can't silently reappear. autonomous_safe: true (docs + validator)."
---
# FEAT-237: reconcile install-template command names + gate command refs

## Problem

The install templates `templates/claude-md-hard-rules.md` and
`templates/loop-rules.md` (written into every consumer repo by
`/runner:install`) reference command names that no longer exist or were renamed:

- `/runner:slice start|complete` — real surface is `/runner:start` + `/runner:close`
- `/runner:slice from-feature`, `/runner:slice-from-feature`, `/runner:derive-slice`
- `/runner:slice grade|grade-write` — subsumed into `/runner:close` (v0.53)

FEAT-236 SLICE-4 fixed the *generated* `CLAUDE.md`, but the templates are the
install-time SOURCE — the next `/runner:install` (or a fresh consumer install)
regenerates the drift right back. This is the same class as #371 (phantom
`crew:builder` in installed rules), which was HIGH customer-facing.

`validate-agent-refs.mts` (shipped for #371) scans `crew:`/`runner:` **agent**
dispatch refs but NOT command-name refs, so it doesn't catch this.

## Goal

Templates name only the real current command surface; a validator gate prevents
stale command refs from reappearing in templates/docs.

## Acceptance criteria

- AC-1: GIVEN `templates/claude-md-hard-rules.md` + `templates/loop-rules.md`,
  WHEN read, THEN every `/runner:<cmd>` reference resolves to a real command
  (`commands/<cmd>.md`) or is explicitly a documented historical/removed name in
  a "these were removed" context — no live instruction to run a non-existent
  command.
- AC-2: GIVEN `/runner:install` runs against a fresh repo, WHEN it writes the
  HARD-RULES block, THEN the generated CLAUDE.md contains no phantom command
  (the fix is at the template source, not just the generated output).
- AC-3: GIVEN a stale `/runner:<cmd>` dispatch instruction is added to a
  template or doc, WHEN the command-ref validator runs in CI, THEN it fails and
  names the offending file:line (extend `validate-agent-refs.mts` to cover
  `/runner:<cmd>` command tokens in dispatch context, or add a sibling check).
- AC-4: `validate-agent-refs` + full suite green; tsc + lint + format clean;
  snapshot-freshness passes.

## Risks

- Some `/runner:slice-*` mentions are legitimately describing *removed* commands
  in a historical/"subsumed by" context (e.g. CLAUDE.md's Backlog-discipline
  section) — the validator must allow negated/historical context (mirror
  `validate-agent-refs`'s existing proximity-bounded dispatch-context heuristic),
  not blanket-flag every mention.

## Refs

- #371 (phantom `crew:builder`, same class) + `src/scripts/validate-agent-refs.mts` (extend).
- FEAT-236 SLICE-4 (fixed generated CLAUDE.md, flagged the template residual).
- `templates/claude-md-hard-rules.md`, `templates/loop-rules.md`.
