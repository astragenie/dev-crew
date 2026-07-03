---
id: FEAT-216
status: pending
priority: P3
category: telemetry
target_release: null
created: 2026-07-03
updated: 2026-07-03
depends_on: [FEAT-215]
slices: []
derived_from: FEAT-215
tags: [telemetry, ingest, security, competitor-gap]
needs_contract: true
needs_ux: false
github_issue: null
github_milestone: null
pm_customer_impact: 0.35
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.45
pm_technical_risk: 0.4
pm_dependency_depth: 0.3
pm_composite_priority: P3
pm_autonomous_safe: false
pm_reviewed: 2026-07-03
autonomous_safe: false
triage_notes: "SLICE-140 (FEAT-215) review follow-ups. One MEDIUM (secret-adjacent precedence change) + one LOW (observability). needs_contract:true / autonomous_safe:false because the tightening alters bearer-tier routing — must be a conscious design decision, not an unattended edit."
---
# FEAT-216: Ingest env-tier hardening + silent-skip observability (FEAT-215 follow-ups)

## Origin

Both items surfaced in the SLICE-140 review gate (FEAT-215) as non-blocking
notes and were deferred rather than scope-crept into that slice. FEAT-215
shipped with the current behavior documented in-code and pinned by a test.

## Item 1 — env-tier hardening (Reviewer B, MEDIUM)

`resolveEffectiveEnv` (`src/scripts/lib/slice-linker/astrarunner-ingest.mts`)
falls through to a shell-global `ASTRARUNNER_ENV` when a committed `loop.json`
`ingest` block supplies `url` but omits `env`. In a fleet where
`ASTRARUNNER_ENV` is set org-wide, this pairs a wrong-tier bearer (e.g. a
staging token) with the committed url's tier (e.g. prod). Not
attacker-controllable, but a real misconfiguration footgun.

Current behavior is intentional per FEAT-215 DECISION-1 (`ingest.env` optional),
documented in the `resolveEffectiveEnv` docstring, and pinned by the
`Reviewer-B: ingest.url without ingest.env pairs bearer from shell-global
ASTRARUNNER_ENV` test in `astrarunner-ingest.test.mts`.

**Decision to make (needs_contract):** should a committed `ingest.url` WITHOUT
`ingest.env` refuse to inherit the shell-global `ASTRARUNNER_ENV` tier for
bearer resolution (fail-silent skip instead of wrong-tier send)? This is a
precedence change — ratify via architect/spec before implementing.

### AC (draft)
- AC-1: Given `ingest.url` committed and `ingest.env` absent and
  `ASTRARUNNER_ENV=staging`, When the resolver runs under the tightened rule,
  Then the bearer is NOT resolved from the staging tier and the sink no-ops
  (`{posted:0, skipped, failed:0}`) rather than sending a staging bearer to the
  committed url. (Exact semantics pending the design decision.)
- AC-2: The existing `Reviewer-B` pin test is updated/retired to reflect the
  ratified behavior — no silent regression of the documented hazard.

## Item 2 — silent-skip observability (Reviewer B, LOW)

The direct sink skips silently (no signal) when no url/token resolves — a
total black hole for a 20-repo fleet rollout. Add a debug-level, **non-secret**
signal (e.g. gated on a `LOOP_DEBUG`/existing debug flag) noting "ingest
skipped: no url" / "no token for appId <id>". MUST NOT log any bearer/token
value.

### AC (draft)
- AC-3: When the sink skips for a missing url or unresolved token, a debug-level
  message is emitted behind the repo's existing debug flag, containing appId
  (not the token) and the skip reason; default (non-debug) runs stay silent.
- AC-4: No test or code path logs a bearer/token value.

## Refs
- FEAT-215 (parent) — `.claude/artifacts/loop/backlog/done/FEAT-215.md`.
- Design: `.claude/artifacts/loop/design/FEAT-215-design.md` (DEC-062, DECISION-1).
- Review artifacts: `.claude/artifacts/crew/reviews/*slice-140*`.
- Code: `src/scripts/lib/slice-linker/astrarunner-ingest.mts` (`resolveEffectiveEnv`, `resolveIngestToken`).
