# Handoff — rename `runner:hierarchical-dispatcher` → `runner:swarm`

- **Type**: build handoff (mechanical rename)
- **Owner**: crew:fullstack-dev
- **Branch**: `worktree-agent-ac54799c1e9d4207f` (isolated worktree off `main`)
- **Commit**: `055f5da5` — `rename(agents): runner:hierarchical-dispatcher -> runner:swarm`
- **Pushed**: no (local commit only, per instructions)

## Objective

Rename the owned agent `runner:hierarchical-dispatcher` → `runner:swarm`
(operator decision, mid-task correction from an initial `runner:swarm-runner`
target — no `swarm-runner` edits had landed yet, so nothing needed
reverting). Frees the word "dispatcher" for the orchestrating-role
vocabulary; see collision analysis in
`.claude/artifacts/crew/runs/20260716T132510Z-research-lead-to-dispatcher-inventory.md`.

## Scope

**Allowed**: `agents/hierarchical-dispatcher.md` → `agents/swarm.md` rename +
frontmatter/self-reference update, repo-wide live-reference sweep,
CLAUDE.md tombstone note, validator re-check.

**Forbidden (respected, not touched)**: agent prompt behavior beyond
naming; memory modules; backlog; `loop-snapshot.md`; the
`escalated_to_dispatcher` badge / role vocabulary (separate decision, and a
genuinely distinct concept per the collision-analysis memory).

## Reference-sweep table (file:line, old → new)

| File:line | Old | New | Note |
|---|---|---|---|
| `agents/hierarchical-dispatcher.md` → `agents/swarm.md` | (path) | (path) | `git mv` |
| `agents/swarm.md:2` | `name: hierarchical-dispatcher` | `name: swarm` | frontmatter |
| `agents/swarm.md:15` | `You are the hierarchical-dispatcher for this loop.` | `You are the swarm dispatcher for this loop.` | body self-reference |
| `README.md:150` | `` ## Hierarchical dispatch (`runner:hierarchical-dispatcher`, FEAT-020 SLICE-1) `` | `` ## Hierarchical dispatch (`runner:swarm`, FEAT-020 SLICE-1) `` | heading keeps mechanism name "Hierarchical dispatch"; only the agent id changes |
| `README.md:187` | `` In production, the `runner:hierarchical-dispatcher` agent runs `prepare`, invokes `` | `` In production, the `runner:swarm` agent runs `prepare`, invokes `` | prose |
| `src/scripts/lib/dispatch-prompt.mts:24` | `"## Hierarchical dispatch context (injected by loop:hierarchical-dispatcher)"` | `"## Hierarchical dispatch context (injected by runner:swarm)"` | live string injected into every child-agent prompt; also corrected the stale `loop:` namespace prefix to `runner:` while touching this line (no test asserts the exact string — verified via grep, zero hits) |
| `src/scripts/lib/frontmatter.mts:46-48` | comment citing `agents/hierarchical-dispatcher.md's multi-line description:` | comment citing `agents/swarm.md's multi-line description:` | code comment, factual citation of a real file used as parser-divergence evidence |
| `CLAUDE.md` (Owned agents section) | *(no entry existed)* | new bullet: `` `runner:swarm` (formerly `runner:hierarchical-dispatcher`, renamed v0.77) — ... `` | the old agent was never listed in CLAUDE.md's Owned agents section — added an entry now (with tombstone) rather than editing a nonexistent one |

## Left untouched — different concept, confirmed by inspection

- `src/scripts/lib/hierarchical-dispatch.mts` (module file), `dispatchHierarchical()` (function), `dispatchKind: "hierarchical"` (persisted enum value in `auto-dispatch.mts`, `audit-envelope-join.mts`, `cost-by-skill.mts`, asserted in `envelope-enrichment.test.mts`) — this is the dispatch **mechanism/library name**, distinct from the agent's identity. Task instructions explicitly scoped the rename to the agent name only.
- `dispatchLimits.*` config keys (`.claude/loop.json` schema) — confirmed via grep no agent-name embedding; left as-is per instructions.
- `docs/sop/jsonl-ledger-merge-driver.md:51` — references `hierarchical-dispatch.mts` (the module), not the agent.
- `skills/loop-discipline/SKILL.md` `escalated_to_dispatcher`/`escalated_to_lead` alias — confirmed via memory recall + grep to be an unrelated hard-block-escalation-state concept; zero hits for "hierarchical" there anyway.
- Historical/frozen, left alone: `CHANGELOG.md` (past entries), `docs/audits/2026-06-15-prod-release-audit.md` + `-wave-plan.md`, `docs/superpowers/specs/2026-06-09-feat020-hierarchical-dispatch-design.md`, `docs/superpowers/plans/2026-06-09-feat020-slice-1-hierarchical-dispatch.md`, everything under `.claude/artifacts/**` (grades, done backlog, completed slices, runs/reviews/handoffs, `.claude/state/cost-hygiene/*.json`).
- `src/tests/deleted-skills-stub.test.mts` — checked; its hard-break-stub convention covers retired **commands/skills only**, not agents. No stub needed/applicable for an agent rename; noting per task instruction rather than fabricating one.
- `src/scripts/validate-agent-refs.mts` — `runner:<name>` tokens resolve **dynamically** against the live `agents/*.md` tree (no hardcoded allowlist like the `crew:` namespace has), confirmed by reading the validator source and by zero grep hits for "hierarchical" in that file. Nothing to update there; reran after the rename and it passes clean, meaning a future `runner:hierarchical-dispatcher` dispatch instruction would now correctly flag as phantom.

## Gate outputs (all green)

```
bun ./src/scripts/validate-agent-refs.mts
  → Agent-ref validation OK: no phantom crew:/runner: dispatch references found.

bun ./src/scripts/validate-manifests.mts
  → Manifests OK: plugin.json runner@0.76.0, package.json runner-plugin@0.76.0

bun ./src/scripts/validate-content-length.mts
  → Content length OK: agents (6 enforced, 7 exempt, cap=300 lines), skills (17 files, cap=200 lines)

bun ./src/scripts/validate-dispatch-markers.mts
  → Dispatch-marker validation OK — 7 producer fixture(s) checked, all balanced and confined.

bunx tsc --project tsconfig.json --noEmit        → clean, no output
bunx tsc --project tsconfig.test.json --noEmit   → clean, no output

bunx biome lint src/scripts/lib/dispatch-prompt.mts src/scripts/lib/frontmatter.mts
  → Checked 2 files. No fixes applied. (repo-wide `biome lint src/` shows the
    pre-existing legacy warning baseline per CLAUDE.md; none in touched files)

bunx biome format src/scripts/lib/dispatch-prompt.mts src/scripts/lib/frontmatter.mts
  → Checked 2 files. No fixes applied. (exit 0)

bun test src/tests/ --parallel --timeout 60000
  → First run: 2972 pass / 7 skip / 1 fail (transient — offline git-fetch
    noise throughout the run, unrelated file). Rerun: 2973 pass / 7 skip /
    0 fail, 1246 expect() calls, 299 files. Confirmed no test references the
    old agent name (`grep -rn "hierarchical-dispatcher" src/tests/` → zero
    hits before and after).
```

## Confidence

High. Mechanical rename with a narrow, well-bounded live-reference surface
(5 files). The one ambiguous judgment call — correcting `dispatch-prompt.mts`'s
stale `loop:` namespace prefix to `runner:` while touching that exact line —
is noted above with rationale (no test pins the literal string; the prefix
was already wrong before this rename, just for a different reason).

## Anything ambiguous left, and why

- **Version number in the tombstone** (`renamed v0.77`) — current
  `plugin.json` is `0.76.0`; this rename hasn't been released yet. Used the
  operator's own suggested text verbatim rather than guessing the actual
  release version, since bumping/tagging is release-engineer's call, not
  this dispatch's.
- **`README.md` H2 heading text** ("Hierarchical dispatch") was deliberately
  left as prose describing the *mechanism*, not renamed to "Swarm dispatch"
  — only the `` `runner:...` `` agent-id token inside it changed, consistent
  with "don't change the behavior contract beyond naming" and with the
  module/library name (`hierarchical-dispatch.mts`) staying as-is.

## Suggested next handoff

None required — this closes the rename cleanly. If the operator wants the
`README.md` H2 / module name to eventually follow the agent's new short
name too, that would be a separate, larger renaming decision (touches a
9-file `dispatch-*.mjs` barrel and a persisted `dispatchKind` enum) and
should be scoped as its own FEAT rather than folded into this one.
