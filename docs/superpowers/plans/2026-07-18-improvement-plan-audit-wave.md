# Improvement Plan — post-audit wave (2026-07-18)

**Sources:** competitive audit `docs/research/2026-07-18-competitive-audit.md` (merged, #525/#526),
FEAT-264 pre-build QA gate (#527, renumbered from FEAT-263 in #528), astramem usefulness
diagnosis (audit §4.4 + `dev-team/docs/contracts/dispatch-memory-credit-loop-v1.md`).

**Thesis:** the audit's verdict was "they built the storefront, we built the factory."
This plan closes the three measured gaps (memory feedback 1.6%, gate compliance 66.7%
pause rate, onboarding docs that fail strangers) and then makes the factory visible.
Ordered so each workstream's output de-risks the next.

---

## Workstream map

| WS | Name | Anchor | Effort | Measured problem it closes |
|---|---|---|---|---|
| W0 | Quick wins (this week) | audit FEAT draft A + hygiene | S | 1.6% memory usefulness; 35-day stale worktrees |
| W1 | Enforcement hooks | audit FEAT draft B (otta port) | M | 66.7% dispatch pause rate; prose-only gates |
| W2 | Pre-build QA gate | FEAT-264 / #527 (already triaged P1) | L (9 pts, 5 slices) | QA runs post-build only; testability never gates |
| W3 | Onboarding truth + wizard | audit FEAT draft C | S+M | ADOPTION.md/README actively wrong; no first-run proof |
| W4 | Visibility (demo + metrics) | audit FEAT draft D | M | Zero marketing surface; unverifiable positioning |
| W5 | GEPA honesty pass | audit §4.3 | M | "Reflective evolution" false by default; broken provenance |

Dependency spine: **W0 → W1 → W2** (hooks make FEAT-264's SLICE-4 goalpost-lock
mechanical — file W1 as a FEAT first and add it to FEAT-264's `depends_on` so the
walker sees the dependency, per architect-review OBJ-1); **W0.6 + W3 → W4** (don't
market onboarding that fails, and no cost numbers before the unit is resolved);
**W5** independent except W5.1 (provenance fix) gates W4.3's GEPA claims.

> Reviewed 2026-07-18: architect (contract sketch, gaps C.1–C.7) +
> architect-reviewer (**approved_with_notes**, OBJ-1..8) + QA-capability researcher
> (agent upgrades required). Full record: runner-plugin#527 comments.

---

## W0 — Quick wins (target: this week, all S)

1. **Flip `memory.feedback.creditLoop.enabled: true`** in this repo's `.claude/loop.json`
   (mirror dev-team's block). The 1.6% usefulness number is a rollout gap — mechanism is
   merged, tested, live in dev-team. *AC: `recall_used(signal='explicit')` events appear
   after next dispatched slice; 7-day usefulness re-measured and quoted in snapshot.*
2. **Memory-config drift guard** — doctor/CI check flagging a consumer repo whose
   memory-feedback config shape lags the current contract (the marketplace-sync pattern,
   applied to config). Prevents recurrence of exactly this gap.
3. **Split usefulness telemetry** — outcome-backstop auto-credit vs explicit crediting on
   the positive side (corrections already split by source). Without it the post-creditLoop
   rate is uninterpretable. (Daemon-side: file to astramem-local.)
4. **Fix stale `usefulness.ts` header** claiming feedback "does NOT feed ranking yet" —
   contradicts shipped `epsilon: 0.1`. One-comment fix, prevents future misdiagnosis.
   (astramem-local.)
5. **`bun src/scripts/loop.mts dispatch prune`** — 4 open runIds, oldest 35 days, 8
   worktrees. The tooling already prints this hint; run it, then add prune-age to the
   watcher tick so it never accumulates silently again.
6. **Resolve the cost-unit ambiguity** — determine what one `*-cost-report-*.md` covers
   (slice vs wave vs session) and relabel `memory-snapshot.mts:277` accordingly. Blocks
   W4's metrics band; also decides whether `sliceCostCeiling` is actually binding.

## W1 — Enforcement hooks (otta port; file as FEAT via /runner:intake)

Port two otta patterns into crew (dev-team) plus one of our own extension, loop
consumes. (Citation honesty per review OBJ-4: only the SubagentStop guard and
repair-dedup are otta-sourced; the PreToolUse artifact-lock is our extension of the
same idea, no otta counterpart.) Positive precedent: cross-plugin config reads
already work — `dev-team/hooks/pre-tool-use-model-enforce.ts:41` reads the consumer
repo's `.claude/loop.json`; only dispatch-scoped lock state is new plumbing (who
writes/clears per-slice locks, orphan handling — needs the wire-contract
upstream-request before FEAT-264 SLICE-4 starts, architect C.1 / review OBJ-3).

- **SubagentStop gate-guard** (`hooks/subagent-gate-guard.sh:1-64` analog): builder
  subagent cannot report done while its gate state is red — exit-2 block with the gate's
  reason echoed. Fail-open on hook error; warn-only bake-in phase (dispatch-size-gate
  precedent).
- **PreToolUse artifact-lock**: deny Write/Edit against declared locked paths (first
  consumer: FEAT-264's test-plan artifact; also usable for slice frontmatter, grade files).
- **Repair-signature dedup** (`workflows/repair-policy.mjs:1-24` analog): shared helper for
  bounded retry loops (reviewer fix-loop, arch-gate, pr-fix circuit breaker, FEAT-264
  red/green) — stop early when the same failure signature repeats instead of burning the
  attempt budget.

*AC: hook blocks a fixture builder finishing past a red phase-gate; lock denies a fixture
edit to a locked path; dedup helper unit-tested and adopted by ≥1 existing retry loop;
**the gate-guard block registers as a halt badge in `docs/halt-badges.md` in the same
slice** (registry checklist requirement — review OBJ-6).
Success metric: dispatch pause rate trend down from 66.7% over the next 15 dispatches.*

## W2 — Pre-build QA gate (FEAT-264, triaged P1, `autonomous_safe: false`)

Already decomposed into 5 slices (ACs 1–6 in `triaged/FEAT-264.md`). Plan-level notes:

- **Sequence SLICE-4 after W1** — goalpost-lock enforcement consumes the PreToolUse
  artifact-lock + SubagentStop guard instead of fragile tool-trace assertions (posted as
  hardening comment on #527). Slices 1–3 and 5 need not wait. Encode this: file W1's
  FEAT first, put its id in FEAT-264 `depends_on` (currently `[]` — prose-only
  dependency is invisible to the walker, review OBJ-1).
- **Pre-slice-1 amendments required** (architect C.2/C.3/C.5/C.7 + review OBJ-7/OBJ-8 +
  researcher findings, consolidated on #527): AC-3 in-bounds allowlist; `kind: test-plan`
  frontmatter + validation-gate exclusion; AC-5 retarget to `test_confidence` (or DEC for
  an 8th dimension); replace "FIX badge" with `GATE_FAILED_AT_CLOSE` + halt-badges row;
  settle AC-3 ordering proxy; deterministic artifact naming or frontmatter-recorded path;
  dev-team agent prep (qa-expert implementation-blind mode, test-automator red-first
  exception) as SLICE-0 or folded into SLICE-3.
- SLICE-1 (PM emits ACs for every FEAT) also closes #490's dead-end (P2/P3 triage skips
  AC drafting → `slice start` hard-fails) — cross-link on close.
- Pilot on `memory` repo per the FEAT's rollout note; default stays off (AC-2/AC-6
  back-compat) so the other ~22 adopter repos are untouched until opted in.

## W3 — Onboarding truth + wizard (audit FEAT draft C)

1. Truth pass (S): rewrite `ADOPTION.md` against current `/runner:install`; fix README
   test/CLI/preset sections; make dev-team README skill/agent counts CI-derived.
2. Wizard UX (M): `/runner:install` gains before/after readiness report + file-write
   summary confirmation + inline failure-mode copy (otta `commands/setup.md:21-346`
   pattern). *AC: stranger completes ADOPTION.md verbatim without hitting a nonexistent
   command; install prints readiness delta + write list.*

## W4 — Visibility (audit FEAT draft D; gated on W0.6 + W3)

1. Record a real wave/slice-ceremony run (asciinema/GIF) with cost+latency overlay —
   real footage where otta shows a scripted fake.
2. README "last 90 days" metrics band regenerated from grade/telemetry artifacts,
   freshness-checked in CI like the snapshot. Every number traces to an artifact.
3. Comparison table (us vs generic agent platforms) with otta-style hedge footnote —
   we state real differentiation: 14 documented halt badges with observed firings, real
   GEPA machinery (vs claimed), 16 incident-born CI gates.

## W5 — GEPA honesty pass (audit §4.3)

1. **Fix champion-provenance writer** — frontmatter shape currently fails
   `validate-agents`; zero agents carry the `gepa:` block the system promises. The audit
   trail must exist on the artifacts it modifies.
2. **Surface `GEPA_LIVE_GENERATOR`** — document it in `commands/gepa-optimize.md`, warn
   loudly when running in synthetic/artifact-only mode ("this run does NOT rewrite
   prompts"), consider config-key promotion instead of an env var.
3. **Sync gepa-core checkout** — local clone is 0.6.1; dev-team consumes 0.10.1. Pull the
   tags or archive the stale checkout so future audits/agents read current code.
4. Only then: position GEPA publicly (W4's comparison table) — with the one real
   promotion (aiplugin-dev 1.2.3→1.2.4, trial `c948e52c`) as the honest proof point.

---

## Not doing (recorded so it stays decided)

- COG discipline patterns (hygiene sweep, mutation post-condition, Compiled-Truth/Timeline)
  — dropped per operator review 2026-07-18 (audit §6); revisit hygiene sweep only if
  memory-drift pain grows.
- otta-style waitlist gating and claim-first marketing — explicitly rejected in audit §6.
- Multi-generation genetic-Pareto GEPA rebuild — out of scope until W5's honesty pass
  ships and the single-generation loop earns >1 real promotion.

## Tracking

- W0 items 1–2, W1, W3, W4 → file via `/runner:intake` from audit FEAT drafts A–D
  (report §7). W0 items 3–4 → astramem-local issues. W2 is FEAT-264 (#527), already
  triaged. W5 → dev-team FEATs.
- Success metrics to re-measure after each wave: memory usefulness rate (1.6% baseline),
  dispatch pause rate (66.7% baseline), stranger-onboarding walkthrough (currently fails),
  open-runId age (35d baseline).
