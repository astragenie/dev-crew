# Handoff — memory-quality program: full-day session close (2026-07-16)

- **Objective (as executed):** debug, profile, validate, and improve lessons/facts
  tracking for crew + runner agents against astramem-local; make agent-memory
  extraction serve per-engineering-agent profiles; execute in parallel waves.
- **Owner:** session lead (this session) → next session picks up from here.
- **Confidence:** high — every code claim below is backed by a merged PR,
  a review artifact, or a live measurement cited in-place.

## Delivered — 9 merged PRs across 2 repos

| PR | Repo | What |
|---|---|---|
| #515 | runner-plugin | Top-level `project`/`agent` write tagging (fixed project-filtered recall = 0 hits) |
| #516 | runner-plugin | `ASTRAMEM_E2E` live smoke suite T1–T6 + strict preflight + bounded-fetch |
| #517 | runner-plugin | `scope:"team"` default + meta-noise write guard (`memory-noise-guard.mts`) |
| #518 | runner-plugin | Wave: `<task-scoped>` dispatch markers + CI gate 16, reviewer durable/run-evidence split, `--learnings` structured capture, `--memories-used` outcome-weighted close credit, GepaPayload attribution, usefulness snapshot telemetry (+ post-merge fix: volatile-line strip in freshness gate) |
| #519 | runner-plugin | Agent rename `runner:hierarchical-dispatcher` → `runner:swarm` (persisted `dispatchKind:"hierarchical"` enum + module names deliberately kept) |
| #240 | dev-team | v0.41 lead→dispatcher rename drift closed (skills/plugin.json/README/3 command H1s) |
| #241 | dev-team | Dispatch-time credit loop: SubagentStart-hook digest (covers ad-hoc dispatches), `--memories-used` on write-handoff AND report-to-pr, credit-on-receipt. Contract: `docs/contracts/dispatch-memory-credit-loop-v1.md` |
| #242 | dev-team | Dogfood flip: `memory.feedback.creditLoop.enabled: true` (k=5) |
| #298 | runner-plugin | (closed unmerged — rebase proved content already upstream) |

**The loop is closed end-to-end:** dispatch-time recall digest with atom ids →
agents report `memories_used` → orchestrator credits on receipt → slice-close
batch-credits outcome-weighted (PASS only) → writes land tagged + team-scoped +
noise-guarded → usefulness telemetry in every loop snapshot.
**Measured: usefulness rate 0.6% → 1.9% in one day.**

## Key evidence artifacts (all committed under .claude/artifacts/)

- Plans: `crew/runs/20260716T110000Z-…credit-loop-ceremony-neutral.md` (hard
  invariants), `…T120000Z-…extraction-quality…` (v2, dual-arch-reviewed),
  `…T133000Z-wave-plan…` (execution model).
- Reviews: 9 review artifacts, every code-bearing diff independently reviewed;
  one fix wave (B2 trajectory observability) with delta re-review.
- Research: echo-origin attribution (`…T160500Z…`, **template ceiling ≈0%,
  chaff comes from ad-hoc orchestrator prompts**), lead→dispatcher inventory
  (`…T132510Z…`), session-digest chaff audit (113 atoms: ~45% run-state,
  ~27% instruction echo — the preserved re-audit baseline).
- Validation: post-#515 smoke battery + suite timing JSONLs under
  `loop/memory-e2e/`.

## Upstream state (astramem-local)

Filed/updated today: **#370** supervisor gaps (5 datapoints: 2 hangs, silent
respawn death, dual-daemon split-brain from manual relaunch racing supervisor,
2.8h-run crash), **#371** distill noise, **#372** consolidation backlog (768
pending merges), **#374** validity-horizon umbrella (amended ×3: fact/note
priors, no-TTL invalidation via contradiction pass, promote_memory dormant),
**#375** subagent capture attribution (profiles gained 0 atoms from a full
multi-agent day — the prerequisite for the user's per-agent-profile goal),
**#385 (E3)** marker-skip + provenance chunking, **#386 (E4)** outcome-fact
collapsing. Comments with evidence on #341/#352.

## Known traps (verified today — do not relearn)

1. `@astragenie/memory-provider` `MemoryConfigSchema` is `.strict()`; only
   `profile`/`feedback` are passthrough. A bare top-level memory key is
   silently swallowed by fail-silent callers — feature dead, config looks fine.
2. dev-team main tree can carry a stale installed provider (found 0.1.0 vs
   declared 0.2.1) — `bun install` after pull or config flips no-op silently.
3. Snapshot content must be deterministic: anything reading live state needs
   the volatile-strip treatment in `validate-snapshot-freshness.mts` (DEC-063).
4. Known parallel-CI flakes (pass isolated, fail under load): runner
   `capture-at-close` hook tests; dev-team `dispatch-timing.test.ts` wallMs.
   Quarantine-slice candidates in both repos.
5. Daemon build `+5735adab` takes ~15 min to first listen (silent boot);
   process-exists ≠ liveness (#370).
6. Editing `.claude/loop.json` via JSON round-trip mangles escaped strings —
   patch surgically.

## Suggested next handoffs (priority order)

1. **Watch the dogfood cycle** — `usefulness.rate_7d` on daemon /health and the
   `memory_capture` trajectory steps; flip evidence feeds the E7 promote rule.
2. **Chaff re-audit** when astramem-local ships E3+E4 (#385/#386) — method +
   113-atom baseline preserved in the extraction plan artifact.
3. dev-team wire-value lead→dispatcher migration (deferred Slice B:
   `crew.ts:768` handoff default, `approvals.ts:98`, badge alias — lockstep
   cross-repo change).
4. Flake-quarantine slices (both repos).
5. runner Phase 3b usage: start passing `--learnings`/`--memories-used` at
   real slice closes (plumbing is live, ceremony unchanged, both optional).

## Forbidden/parked

- No further daemon restarts without checking for an existing serve process
  first (split-brain trap, #370).
- User's personal `~/.claude/crew/constitution.md` still declares the `lead`
  role — only the operator edits that file.
