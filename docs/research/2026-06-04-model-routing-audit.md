# Model Routing Audit — 2026-06-04

> **HISTORICAL — frozen as of 2026-06-04.** The `devcrew:lead` orchestrator referenced throughout this audit was removed in v0.43 (FEAT-191). The current default is `slice-build` mode, which dispatches the tag-routed crew builder variant (`devcrew:frontend-dev` / `devcrew:backend-dev` / `devcrew:fullstack-dev`) directly — no lead step. Routing recommendations below pre-date the FEAT-191 removal; treat as historical context, not live guidance.

**Slice:** SLICE-37 (FEAT-039 item 3) — Reduce per-slice Opus spend by
auditing every dispatch site, recommending Sonnet routing for non-Opus
work, and updating `loop.json::modelRouting` accordingly.

**Trigger.** SLICE-36 burned $400.21 (own project) / $846.78 (aggregate)
in 184 minutes on 535 messages with 100% Opus and 95.9% cache hit. Cost
report flagged Opus-overuse on read-only / mechanical work. The loop is
leaning entirely on Opus for surfaces that Sonnet handles at 1/10th the
per-message cost with equivalent quality.

## Methodology

1. Grep for `subagent_type`, `Agent(`, `dispatchAgent(`, and named-agent
   strings (`devcrew:lead`, `devcrew:fullstack-dev`, `devcrew:inspector`, `devcrew:verifier`,
   `loop:pm`, `loop:architect`, `loop:researcher`, `devcrew:document-writer`)
   across `commands/`, `skills/`, `agents/`, and `src/scripts/`.
2. For each dispatch site, record the file:line, the agent being
   dispatched, and the **effective** current model.
3. The effective model is computed from `.claude/loop.json::modelRouting`
   via `src/scripts/lib/model-router.mts::resolveModel(phase, config)`:
   the named phase wins, otherwise `modelRouting.default`, otherwise the
   `FALLBACK_MODEL = "opus"`. Phases known to the router:
   `sliceStart`, `architect`, `build`, `review`, `validate`, `gradeWrite`.
4. Recommend an alternate model when the work surface is read-only,
   mechanical, or otherwise a poor return on Opus's pricing.

## Current `loop.json::modelRouting` (as of 2026-06-04 pre-AC-5)

```jsonc
{
  "default": "sonnet",
  "sliceStart": "opus",
  "review": "opus",
  "gradeWrite": "opus",
  "build": "sonnet",
  "validate": "sonnet"
}
```

> The `default: sonnet` baseline is the right starting point — the issue
> is that several dispatch sites have no phase tag at all and therefore
> hit the fallback (`opus`) inside `resolveModel`. Others are tagged with
> a phase that defaults to `opus` despite being mechanical.

## Dispatch site inventory

| # | dispatch_site | agent | current_model | recommended | reason |
|---|---|---|---|---|---|
| 1 | `commands/slice-start.md` L38-51 / `src/scripts/lib/slice-linker/dispatch.mts::buildDispatchInstruction` | `devcrew:lead` | **opus** (`modelRouting.sliceStart`) | **opus** (keep) | Lead orchestrates framing, mode choice, gate decisions, synthesis — judgment-heavy work. Per `docs/standards/model-selection.md` lead is the only role that truly benefits from Opus. **No change.** |
| 2 | `commands/slice-review-ladder.md` L29 / `src/scripts/lib/reviewer-ladder.mts` (Reviewer A prompt) | `devcrew:inspector` | **opus** (`modelRouting.review`) | **sonnet** | Reviewer A focuses on correctness, regression detection, AC coverage. This is rule-following + diff inspection — Sonnet handles it with the same quality at ~10× lower per-message cost. The 2 of 4 SLICE-36 messages tagged `review` together accounted for $84.32. **Switch to sonnet.** |
| 3 | `commands/slice-review-ladder.md` L35 / `src/scripts/lib/reviewer-ladder.mts` (Reviewer B prompt) | `devcrew:inspector` | **opus** (`modelRouting.review`) | **sonnet** | Same as #2 — Reviewer B focuses on production-readiness, observability, security posture against a defined checklist. Mechanical against a known surface. **Switch to sonnet.** |
| 4 | `src/scripts/lib/slice-linker/dispatch.mts::buildDispatchInstruction` (the `devcrew:lead` prompt instructs it to dispatch `devcrew:fullstack-dev`) | `devcrew:fullstack-dev` (downstream) | **sonnet** (`modelRouting.build`) | **sonnet** (keep) | Builder is the editor in the two-model split (FEAT-005). Sonnet is correct. **No change.** |
| 5 | `commands/architect.md` L36-50 / `src/scripts/lib/model-router.mts::resolveArchitectModels` | `loop:architect` (research/plan pass) | **opus** (`modelRouting.architect` → `modelRouting.sliceStart`) | **opus** (keep) | Architect produces design artifacts + ADRs. Cross-cutting reasoning where Opus's edge matters most. **No change.** |
| 6 | `src/scripts/loop.mts::resolveBacklogAddBody` L355 — `/loop:backlog-add` → researcher | `loop:researcher` | **sonnet** (no phase tag → `modelRouting.default`) | **sonnet** (keep) | Read-only repo archaeology. Returns a 200-400 word findings doc. Sonnet handles citation-backed lookup; no Opus benefit. **No change** — but add explicit `researcher` phase key for clarity. |
| 7 | `src/scripts/loop.mts::dispatchArchitectForSpec` L546 — `/loop:spec-decompose` → architect (semicolon-list output) | `loop:architect` | **opus** (`modelRouting.architect` → `modelRouting.sliceStart`) | **sonnet** | This particular architect call returns a semicolon-separated list of feature titles. That's a mechanical text-shaping task wrapped in a "decompose this spec" prompt. Opus is over-spec'd for it. **Special case: route via a new `decompose` phase key set to sonnet** to keep the high-judgment design-pass call (#5) on Opus. |
| 8 | `src/scripts/loop.mts::architectOptOut` L508 (opt-out audit-log marker) | `loop:architect` | **opus** (architect phase) | **sonnet** (matches #7 once `decompose` phase is added) | This dispatch only writes the opt-out audit entry — it produces no agent output. Model choice is cost-neutral here but the registered phase should track the rest of `spec-decompose`. **No real cost impact; follows #7.** |
| 9 | `src/scripts/lib/slice-linker/complete-slice.mts` L494, L515, L530 — `/loop:slice complete` → document-writer (release notes / CHANGELOG / README polish) | `devcrew:document-writer` | **sonnet** (no phase tag → `modelRouting.default`) | **sonnet** (keep) | Markdown-only writing against a known template. Sonnet is correct. **No change** — add `documentWriter` phase key explicitly so future changes don't accidentally promote it. |
| 10 | `src/scripts/loop.mts` PM scoring path (`/loop:pm-triage`, `/loop:pm-review`, `/loop:pm-decompose`) | `loop:pm` | **sonnet** (no phase tag → `modelRouting.default`) | **sonnet** (keep) | PM scores features across 5 dimensions against a fixed rubric. Read-only, structured-output. Sonnet handles it. **No change.** |
| 11 | `src/scripts/lib/slice-linker/start-slice.mts::resolveOrchestratorModel` — surfaces a model-mismatch gate to the orchestrator | (orchestrator session itself) | **sonnet** (`loop.orchestratorModel`) | **sonnet** (keep) | The orchestrator drives the loop between slices; mechanical walk. Sonnet is correct. **No change.** |
| 12 | `commands/slice-review-ladder.md` ladder extension `Security` (configurable third reviewer) | `devcrew:inspector` (Security focus) | **opus** (`modelRouting.review`) inherited | **opus** | Threat-modeling a new surface against SPEC-003 is genuinely judgment-heavy. Keep on Opus when present. **Carve out:** `reviewerSecurity` phase key staying on Opus. |

## Summary by surface

- **Opus-justified (4 sites):** lead (#1), architect design pass (#5),
  security reviewer when present (#12), grade-write (`modelRouting.gradeWrite`).
  These are the only places Opus's pricing earns its keep.
- **Sonnet baseline (8 sites):** builder (#4), researcher (#6), document-writer
  (#9), pm (#10), orchestrator (#11), and the two slice-review-ladder
  reviewers (#2, #3), spec-decompose architect (#7-8). All are mechanical,
  structured-output, or rule-following.
- **No Haiku routing recommended this slice** — out of scope per
  SLICE-37 ("two-tier Sonnet/Opus is sufficient for this slice").

## Estimated cost delta

SLICE-36 own-project actual: **$400.21** at 100% Opus across 255 messages.
If the 2 review messages (≈$84) and the ~10 mechanical builder / pm /
researcher / writer messages (≈$60) had routed to Sonnet at the standard
~10× cost ratio, projected spend would have been:

- Opus messages (lead, architect design, grade-write): ~$256
- Sonnet messages (review, builder, pm, researcher, writer): ~$14

**Projected total: ~$270 — a $130 reduction (~32%).**

This estimate assumes naive proportional re-pricing, no cache disruption,
and identical message counts. Actual savings will depend on Sonnet's
output verbosity (slightly higher) and on cache hit-rate continuity
(the routing change itself does not bust the cache).

## Recommended routing changes (input to AC-5 ADR)

The ADR `DEC-008-model-routing-policy.md` should land **at minimum**
these two `loop.json::modelRouting` updates:

1. **`review`: opus → sonnet.** Routes the two slice-review-ladder
   reviewers (#2, #3) to Sonnet. Largest single per-slice savings.
2. **`decompose`: (new) sonnet.** Adds a phase key for
   `spec-decompose`'s architect call (#7-8) so the design-pass architect
   (#5) stays on Opus while the mechanical-list architect call drops to
   Sonnet.

Optional follow-ups (not required by AC-5, suggested for future slice):

- Add an explicit `documentWriter: sonnet` phase key so the
  document-writer dispatch (#9) is no longer routed by fallthrough.
- Add an explicit `researcher: sonnet` phase key so the researcher
  dispatch (#6) is no longer routed by fallthrough.
- Add `reviewerSecurity: opus` once the Security ladder slot ships,
  to carve out the security reviewer from the new `review: sonnet`
  default.

## References

- Cost report: `.claude/artifacts/crew/cost/20260604T201256Z-cost-report-slice-feat-010-slice-36-confidence-traffic-light-at-slice-start-sh.md`
- Model router: `src/scripts/lib/model-router.mts`
- Two-model split (FEAT-005): `commands/architect.md`
- Slice progress signals (FEAT-038): `src/scripts/lib/slice-linker/dispatch.mts`
- Originating feature: `.claude/artifacts/loop/backlog/in-progress/FEAT-039.md`
- Slice file: `.claude/artifacts/loop/ai-loop/slices/pending/SLICE_37_RE-READ-GUARD-MODEL-ROUTING-AUDIT.md`
