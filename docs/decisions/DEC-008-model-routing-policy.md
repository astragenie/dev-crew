---
id: DEC-008
title: Route mechanical phases to Sonnet by default; reserve Opus for judgment-heavy work
status: accepted
introduced_by_slice: SLICE-37
introduced_at: 2026-06-04
related_specs: []
superseded_by: null
---
# DEC-008: Route mechanical phases to Sonnet by default; reserve Opus for judgment-heavy work

## Context

SLICE-36 burned **$400.21** of own-project spend (and **$846.78** in
aggregate across sibling projects) in 184 minutes on 255 assistant
messages — **100% Opus**, with a 96.3% cache-hit rate. The cost report
flagged `[HIGH] opus-overuse` and `[HIGH] cache-busted` and asked
why mechanical surfaces were being driven on Opus pricing.

`docs/standards/model-selection.md` already says Opus's edge applies
to four things — task framing, ambiguous design decisions, user
communication, and synthesis. SLICE-36 burned Opus tokens on review,
spec-decompose, document-writer, PM, researcher, and orchestrator
turns where the work is rule-following, structured-output, or
mechanical text-shaping.

The current `.claude/loop.json::modelRouting`:

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

`default: sonnet` is the right baseline. The problem is that
`review: opus` routes both slice-review-ladder reviewers (A + B) to
Opus even though both reviewers follow a fixed checklist against a
known diff. And `spec-decompose`'s architect call — which returns a
semicolon-separated list of feature titles — inherits Opus through
`modelRouting.architect → modelRouting.sliceStart` despite being a
mechanical text-shaping task.

The audit in `docs/research/2026-06-04-model-routing-audit.md`
inventoried 12 dispatch sites and projected a ~32% per-slice cost
reduction (≈$130 on a SLICE-36-shaped workload) from rerouting the
mechanical sites to Sonnet without giving up the high-judgment lead /
architect / grade-write surfaces.

## Decision

We will adopt a two-tier Sonnet/Opus model routing policy with
**Sonnet as the default for mechanical phases** and **Opus reserved
for genuinely judgment-heavy phases**. Specifically, `loop.json`
ships with these `modelRouting` updates:

1. **`review: opus → sonnet`.** Routes both slice-review-ladder
   reviewers to Sonnet. Reviewer A (correctness, regression
   detection, AC coverage) and Reviewer B (production-readiness,
   observability, security posture) both score a defined diff
   against a defined checklist — mechanical work where Sonnet
   matches Opus quality at ~10× lower per-message cost. This is the
   single largest per-slice savings.
2. **`decompose: (new) sonnet`.** Adds a new phase key for
   `spec-decompose`'s architect call. The dispatch returns a
   semicolon-list of feature titles — pure text-shaping. Sonnet is
   the correct model. The design-pass architect call
   (`commands/architect.md`) continues to route via
   `architect → sliceStart → opus` and is unaffected.

The Opus-justified surfaces stay on Opus:

- **lead** (`modelRouting.sliceStart`) — framing, mode choice, gate
  decisions, synthesis, user communication.
- **architect design pass** (`modelRouting.architect`) —
  cross-cutting ADR + structural change reasoning.
- **grade-write** (`modelRouting.gradeWrite`) — slice retrospective
  + decision extraction; needs judgment about which lessons to
  preserve.
- **reviewerSecurity** (when ladder slot ships) — threat-modeling
  against SPEC-003 is genuinely judgment-heavy; carved out so it
  doesn't inherit the new `review: sonnet` default.

The mechanical surfaces (builder, researcher, document-writer, pm,
orchestrator, decompose, both slice-review-ladder reviewers) route
via `default: sonnet` or explicit phase keys pointing at Sonnet.

## Consequences

### Positive

- Per-slice cost drops by ~32% on workloads matched to SLICE-36 (≈$130
  savings on a $400 slice). The savings scale with the share of
  mechanical work in the slice.
- Routing intent is explicit per phase. Future contributors editing
  `loop.json` can see which surface ships on which tier without
  reading `resolveModel` source.
- Opus pricing is reserved for places where its judgment edge earns
  its keep. Lead / architect / grade-write quality is unaffected.
- Sets a precedent: new dispatch surfaces must justify Opus routing
  in their ADR rather than inheriting it by fallthrough.

### Negative

- Sonnet outputs are slightly more verbose than Opus on the same
  prompt; review-result and decompose-list artifacts may grow in
  size. Quality of the underlying decisions is unaffected per
  `docs/standards/model-selection.md`.
- If a future slice introduces a high-judgment reviewer surface
  (e.g. cross-cutting refactor review), we will need to carve it
  out explicitly with a new phase key — the `review: sonnet`
  default is a floor, not a ceiling.
- Routing churn: the audit identified 4 optional follow-up phase
  keys (`documentWriter`, `researcher`, `reviewerSecurity`, and
  flipping spec-decompose's `architectOptOut` path) that we
  deliberately defer to a future slice. The fallthrough behavior
  for those sites is unchanged and the savings projection treats
  them conservatively.

### Neutral

- The `architectOptOut` dispatch (`src/scripts/loop.mts:508`) only
  writes an audit-log marker — model choice is cost-neutral. It
  shares the `decompose` phase key with the main spec-decompose
  architect call for consistency.
- Cache hit rate is not affected by this change. Routing decisions
  are made at dispatch time; the prompt cache is keyed on
  prompt content, not on the model selected.

## Alternatives considered

- **Option A — leave routing as-is and add monitoring.** Rejected.
  SLICE-36 was the second consecutive slice to flag `opus-overuse`.
  Monitoring without action means the next 5 slices burn an
  unnecessary ~$650 before policy catches up. Cost reports already
  exist; the gap is enforcement.
- **Option B — flip everything to Sonnet (including lead and
  architect).** Rejected. `docs/standards/model-selection.md`
  documents three cases — ambiguous architecture, hard refactor,
  design choice required — where Opus's judgment edge materially
  changes output quality. Lead-on-Sonnet would degrade framing and
  synthesis on slices that span those cases.
- **Option C — three-tier with Haiku for the cheapest phases.**
  Rejected for this slice. Haiku adds a third model to the routing
  table and complicates `resolveModel` fallback. The audit's
  cost-delta projection shows Sonnet alone delivers most of the
  available savings. Haiku is a candidate for a future ADR if
  per-phase token counts warrant it.
- **Option D — make `review` configurable per ladder slot.**
  Rejected as overkill for SLICE-37. The reviewerSecurity carve-out
  (planned for the Security ladder slot) is the only forecast
  ladder-specific override; adding the rest of the routing
  surface for a single carve-out is premature.

## References

- Routing audit: `docs/research/2026-06-04-model-routing-audit.md`
- Model selection standard: `docs/standards/model-selection.md`
- Two-model split: `commands/architect.md` (FEAT-005)
- Model router: `src/scripts/lib/model-router.mts`
- Cost report (SLICE-36): `.claude/artifacts/crew/cost/20260604T201256Z-cost-report-slice-feat-010-slice-36-confidence-traffic-light-at-slice-start-sh.md`
- Originating feature: `.claude/artifacts/loop/backlog/in-progress/FEAT-039.md`
- Slice: `.claude/artifacts/loop/ai-loop/slices/pending/SLICE_37_RE-READ-GUARD-MODEL-ROUTING-AUDIT.md`
