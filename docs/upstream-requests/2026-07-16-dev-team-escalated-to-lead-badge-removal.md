# Upstream tracking: `escalated_to_lead` badge-alias deprecation (dev-team DEC-029)

- **Upstream**: astragenie/dev-team (crew plugin)
- **PR**: https://github.com/astragenie/dev-team/pull/244 (docs-only, adds `DEC-029`)
- **Status**: open (filed 2026-07-16)
- **Impact on loop**: documentation-only — no functional dependency, no
  FEAT blocked, no code in this repo reads the field.

## Summary

dev-team's `scripts/lib/workflow-state.ts` `BADGE_HANDLERS` map defines the
canonical `escalated_to_dispatcher` workflow badge (`gates.escalation` →
`escalated`) plus a backward-compat CLI alias, `escalated_to_lead`, left
over from the FEAT-180 `lead`→`dispatcher` rename. PR #243 ("Slice B",
merged) closed the *other* deferred rename surface (wire-value string
defaults like `to: "lead"` → `to: "dispatcher"`) but explicitly left this
badge-name alias for a separate, reviewed deprecation plan — dev-team
PR #244 adds that plan as `DEC-029`
(`.claude/artifacts/loop/decisions/DEC-029.md` in dev-team).

This repo's only coupling to the alias is one line of prose in
`skills/loop-discipline/SKILL.md:43`:

> only `escalated_to_dispatcher` (alias `escalated_to_lead`) is a hard
> external block

No runner-plugin script parses or reads this field — verified against
`src/scripts/lib/slice-linker/crew-bridge.mts` and
`src/scripts/lib/slice-linker/dispatch.mts` (zero references to
`escalation`/`escalated_to`). The line exists to tell the dispatched LLM
agent, at read time, that this crew badge is a hard stop it must respect —
not to drive any programmatic branch in this repo.

## What this repo needs to do, and when

Per DEC-029's Migration order, **dev-team ships first in every phase**;
this repo has nothing to do until dev-team's Phase 3 (removal) lands:

1. **Now (dev-team Phase 1, PR #244):** no action here. The alias still
   works exactly as documented; DEC-029 only adds a deprecation warning
   and fixes dev-team's own stale doc drift.
2. **After dev-team ships Phase 3 (CLI removal of `escalated_to_lead`):**
   file the follow-up PR in this repo that does both of the following in
   one change:
   - Bump `MIN_CREW_VERSION` in
     `src/scripts/lib/plugin-identity.mts` to the dev-team release that
     shipped the removal, so `/devcrew:install` refuses to configure this
     loop against a crew version old enough for the alias's documented
     behavior to still be real.
   - Drop the `(alias escalated_to_lead)` parenthetical from
     `skills/loop-discipline/SKILL.md:43`.

Do **not** make either edit before dev-team's Phase 3 ships — doing so
early would describe behavior that is still true for any consumer on a
pre-removal crew version.

## `docs/halt-badges.md` — scope correction

The cross-repo inventory this DEC and this tracking doc originated from
(`.claude/artifacts/crew/runs/20260716T132510Z-research-lead-to-dispatcher-inventory.md`)
initially framed `docs/halt-badges.md` (this repo's SPEC-003 halt-badge
registry) as a surface documenting this alias. Verified false as of
2026-07-16: `docs/halt-badges.md` has zero references to
`escalated_to_lead`/`escalated_to_dispatcher`, because it is a
structurally different registry — loop's own `snapshot.*` walker
halt-signals (`costRegression`, `sessionDrift`, `marathonCheckpoint`,
etc.), not crew's `gates.*` workflow badges surfaced via `mark-badge`.
**No entry needs to be added to or removed from `docs/halt-badges.md` for
this deprecation.** If a future FEAT wants to bridge crew's `escalation`
gate into loop's `snapshot.*` halt-badge schema so it participates in the
walker's stop-condition machinery programmatically (today the coupling is
prose-only, read by the agent, not the walker), that is separate,
larger design work — file it as its own FEAT and follow the "How to add a
new halt-badge" checklist in `docs/halt-badges.md` at that time. Neither
DEC-029 nor this tracking doc authorizes or requires that bridge.

## References

- dev-team PR #244: https://github.com/astragenie/dev-team/pull/244
- dev-team DEC-029: `.claude/artifacts/loop/decisions/DEC-029.md` (dev-team repo)
- dev-team PR #243 (Slice B, merged, the companion wire-defaults rename): https://github.com/astragenie/dev-team/pull/243
- Cross-repo inventory that scoped this work: `.claude/artifacts/crew/runs/20260716T132510Z-research-lead-to-dispatcher-inventory.md`
- Prior, unrelated open ticket about a different "lead" collision (Claude Code teams/mailbox label, not this badge): `docs/upstream-requests/2026-07-10-crew-team-lead-label-collision.md`
