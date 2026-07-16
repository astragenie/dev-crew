# Handoff — E2E memory experiment (SLICE-160) + astramem daemon flap

- **Created:** 2026-07-15
- **Objective:** Drive one real quick-win slice through the full crew/runner loop
  to exercise + observe the astramem memory lifecycle (recall → use → credit →
  remember) across dispatched agents, on real work (not plumbing canaries).
- **Owner (next):** validator / operator — resume the **after-analysis** once the
  astramem daemon is healthy (see Pending).
- **Confidence:** high on what ran; the memory-lifecycle observation is
  **incomplete** because the daemon flapped down mid-run.

## What ran (full loop, no commit — operator chose working-tree-only)

Issue #514 → FEAT-263 → SLICE-160 (astramem e2e daemon preflight):
`intake → triage(runner:pm) → start → build(crew:fullstack-dev) → review(crew:reviewer) → close → grade`.

- FEAT-263 scored P2 autonomous_safe, → triaged → **done**.
- SLICE-160 built, reviewed **approved_with_notes**, **closed**, graded **0.823**.

## Headline finding — agent memory tracks daemon health exactly

| when | daemon | skill | agent_profile | recall_memory | remember |
|---|---|---|---|---|---|
| early smoke ×2 | up | ✅ | ✅ instant | ✅ fast | ✅ ok |
| runner:pm | flapping | ✅ | ✅ off-topic | ⛔ hung 300s | ⛔ hung |
| builder | down | ✅ | ⛔ timeout | ⛔ hung 300s | ⛔ unreachable |
| reviewer | down | ✅ | ⛔ hung | ⛔ hung | ⛔ hung |

- **Skill-load never failed** (local) — wiring is sound.
- **Every over-the-wire call is hostage to daemon stability** (astramem-local
  #343 cold-flap / #347 recall+remember 300s hang). Up early → all worked
  instantly; down → all hung/errored.
- **Fail-silent held:** down daemon never blocked close/grade. Loop's file-based
  `learningsDigest` (grade-lessons) injected fine at slice-start.

## Memory-quality findings (observed while up)

- Profile cross-repo pollution — `agent_profile` is agent-global → runner:pm
  surfaced unrelated .NET/OAuth atoms. Ticket **astramem-local#353**.
- Superseded guidance ranks unflagged — disproven `tools:` allowlist decision
  (`a65c4ff3`) surfaced in 2 agents. Ticket **astramem-local#352**.
- Write path had no project/scope guidance → private/untagged writes. Fixed in
  the skill (below).

## Deliverables / changed files

- **runner-plugin (uncommitted working tree):**
  - `src/scripts/lib/astramem-e2e-preflight.mts` (new) — `preflightAstramemDaemon`
    + `astramemE2eMode`; double-bounded timeout (AbortSignal + Promise.race).
  - `src/tests/astramem-e2e-preflight.test.mts` (new, 13 pass).
  - `docs/sop/memory-bridge.md` (edited — :7777 dep + start cmds + ASTRAMEM_E2E).
  - backlog moves (FEAT-263 → done, SLICE-160 → completed), grade/handoff/
    synthesis/pm-review artifacts.
  - Gates green: bun test, tsc x2, biome lint+format, content-length, manifests.
    Runtime transport (`memory-transport.mts`/`memory-sink.mts`) untouched.
- **astramem-plugin** worktree `C:\work\mega\astramem-plugin-wt-usingmemory`,
  branch `feat/using-memory-project-scope`, commit `cb8d630` (NOT pushed) —
  `skills/using-memory/SKILL.md`: `project` required on recall, `project`+
  `scope:"team"` on remember. This is the skill agents actually load via
  `Skill(astramem:using-memory)` (dev-team `skills/universal/using-memory` is a
  separate, apparently-legacy copy — a mis-edit there was reverted).
- **Tickets:** astramem-local #352 (superseded-guidance signal), #353
  (agent_profile project filter). Operator-filed #514 (this slice's source).
- **Earlier this session:** crew `0.66.0` cache node_modules vendored
  (`bun install`) to unblock `write-review-result` scaffold — **ephemeral**,
  wiped on next crew reinstall; durable fix belongs in dev-team ship.

## Review note (open)

- MEDIUM (accepted at close as scope caveat): AC-4/AC-5 proven at helper level
  only — no memory-e2e suite imports `astramemE2eMode()`/`preflightAstramemDaemon()`
  yet. Followup: wire a real ASTRAMEM_E2E-gated e2e test.

## Pending — after-analysis (needs daemon UP)

Run against live astramem MCP once healthy:
1. Profile before/after deltas per role (baselines: pm 219 / fullstack-dev 1075 /
   reviewer 1121; watermark epoch `1784128028368`).
2. New-atom audit: `search_memory project=runner-plugin since=1784128028368` —
   did pm/builder/reviewer `remember` attempts persist? verify `project` +
   `scope:team` top-level via `why_memory` (#341 family).
3. Usefulness-off-0.5 check on any credited id (ADR-010).
4. `list_consolidation_proposals` — is `a65c4ff3` flagged as a contradiction
   (relates to #352)?

## Forbidden scope

- Do not commit the runner-plugin working tree (operator chose no-commit).
- Do not push the astramem-plugin skill branch — operator PRs it.
- Do not add `mcp__` tool names to agent files (rename-safety).

## Suggested next handoff

- After daemon stabilizes: run the 4-step after-analysis, then decide whether to
  commit SLICE-160 + open the AC-4/5 followup slice, and PR the skill branch.
