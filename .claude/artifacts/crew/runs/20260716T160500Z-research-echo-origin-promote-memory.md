# Research — echo-origin attribution (T1 ceiling) + promote_memory wiring status

- **Date:** 2026-07-16
- **Owner:** researcher (read-only, R0)
- **Context:** `.claude/artifacts/crew/runs/20260716T120000Z-plan-extraction-quality-templates-validity.md`
  — T1 pre-task measurement (reviewer ask) + E7 open question (is `promote_memory`
  wired or dormant?).
- **Scope:** read-only. No source edits, no commits, no GitHub actions.

## Q1 — Echo origin attribution

### Method

Read the full templated dispatch builder in
`src/scripts/lib/slice-linker/dispatch.mts` (455 lines, entire file) and
grepped it for the 5 exemplar echoed phrases. Then grepped today's
(2026-07-16 + 2026-07-15) handoff artifacts under
`.claude/artifacts/crew/handoffs/` for the same phrases, and cross-checked
against the cached crew plugin's `commands/*.md` + `agents/*.md`
(v0.66.0, the version this repo's `plugin-identity.mts` pins) to rule out a
second templated source.

### Findings

**0 of 5 exemplars appear anywhere in `dispatch.mts`.** The file's only
generated prose is: the builder-variant header (`Dispatch <agent> subagent
with this prompt: > Implement <title>...You own implementation only — frame,
edit, run the self-verify gates, and return a write-handoff artifact path.
Do NOT dispatch crew:reviewer or crew:verifier yourself...Never use
caveman:* agents for slice work...`), the parallel-fe-be variant of the same,
the architect-preflight block (`buildArchitectPreflight`, dispatch.mts:355-367),
progress-signal tags (`appendProgressSignals`, :43-53), the worktree section
(`appendWorktreeSection`, :55-67), and the budget line (`buildBudgetLine`,
:13-21). None of these mention committing, forbidden file paths, test
mocking policy, or review methodology.

Structurally more important: **`buildDispatchInstruction` only ever
constructs a BUILDER-role prompt** (frontend-dev / backend-dev / fullstack-dev
/ parallel-fe-be) or the architect-contract-preflight prompt
(dispatch.mts:254-315). There is no function anywhere in this file — or
findable elsewhere in `src/scripts/lib/` — that generates a **reviewer** or
**validator** dispatch prompt. The code comment at dispatch.mts:307 confirms
this by omission: it tells the builder to return control "so the parent loop
can dispatch crew:reviewer, then crew:verifier" — i.e. those dispatches are
composed by the orchestrating agent at the point of use, not by any template
function. So exemplar 5 ("Review the diffs and the builder's handoff
evidence") is categorically outside dispatch.mts's reach — there is no
reviewer template to instrument with a marker in the first place.

Per-exemplar attribution:

| Exemplar | In `dispatch.mts`? | In crew v0.66.0 commands/agents? | Verdict |
|---|---|---|---|
| "Do not commit" | No | No (`grep -i` clean across `commands/` + `agents/`) | Ad-hoc. Matches the "Forbidden scope" prose style seen in `.claude/artifacts/crew/handoffs/20260715T160000Z-handoff-e2e-memory-experiment-slice160-daemon-flap.md:88` ("Do not commit the runner-plugin working tree (operator chose no-commit)"), which is itself session-specific reasoning ("operator chose"), not boilerplate. |
| "Write a handoff artifact under .claude/artifacts/crew/handoffs/" | No | Partial — `commands/build.md:177`, `fix.md:180`, `incident.md:111` all contain "write a handoff artifact if the run is substantial" as a step **in the orchestrator's own numbered sequence**, not as text injected into a subagent's dispatch prompt. The literal path-qualified phrasing ("under `.claude/artifacts/crew/handoffs/`") only turned up in a historical ad-hoc plan doc (`crew/0.66.0/.claude/artifacts/loop/plans/20260608T034944Z-plan-SLICE-48.md:83`), confirming this is a recurring hand-typed idiom, not a live template string. | Ad-hoc (paraphrased from an orchestrator-facing instruction, then hand-typed into a subagent prompt or the lead's own reasoning trace — either path is outside dispatch.mts). |
| "Do not touch src/scripts/lib/astramem-e2e-preflight.mts, backlog files, agents/, or skills/" | No | No | Ad-hoc — names a specific file created in this session's SLICE-160 work; no generic template can reference it. |
| "Keep unit tests offline and mocked" | No | No | Ad-hoc — testing-constraint guidance specific to the astramem-daemon-dependent test suite (phase2-e2e-suite work today). |
| "Review the diffs and the builder's handoff evidence" | No — no reviewer-prompt function exists in this codebase | No template match | Ad-hoc, and structurally un-catchable by T1 (no reviewer template exists to mark). |

### Split estimate — T1's realistic ceiling

**0 of the 5 given exemplars, and by extension a small minority of the 30
echoed atoms, could ever be caught by a marker on `dispatch.mts`'s templated
strings**, for two compounding reasons:

1. None of the 5 exemplars textually match anything `dispatch.mts` emits.
2. `dispatch.mts` only has template coverage for the **builder** dispatch
   step. Reviewer, validator, and architect-preflight-adjacent guardrail
   prose are either uncovered by any template function, or (architect
   preflight) covered but not implicated in any of the 5 exemplars.

Additionally, today's specific dispatch pattern makes this worse than the
general case: the teammate roster for today's session
(`phase1-memory-tagging`, `phase1-review`, `phase2-e2e-suite`, `phase2-review`,
`phase3a-review`, `phase3a-scope-hygiene`, `w1-b1-markers`, `w1-b2-close-memory`,
`w1-b3-review-split`, this R0 research dispatch) are all named by workstream/
topic, not by `SLICE-NNN` id — the naming convention `/runner:start` /
`buildDispatchInstruction` would produce. That's a strong tell that today's
chaff-generating dispatches were **hand-authored `Agent()` calls by the
session lead** (exactly like the message that dispatched this research task),
not `/runner:start` → `slice-build` → `dispatch.mts` invocations.

**Estimate:** template-markable ceiling ≈ **0% of today's 30 echoed atoms**;
even under a generous general-case estimate across all repo dispatch traffic
(counting every `/runner:start` builder dispatch that ever fires), the
ceiling is bounded by the builder-only fraction of total dispatches — roughly
15-20% at most, since builder dispatches are one of several roles (builder +
reviewer(s) + validator + architect-preflight + ad-hoc) in a typical slice
cycle, and only the builder leg runs through this template at all. **The
remaining 80-100% requires the ad-hoc dispatch style itself (the session
lead's own free-form `Agent()` prompts) to adopt the `<task-scoped>` marker
convention** — T1 as scoped (marking `dispatch.mts` only) cannot reach it.
Confidence: high on the "0/5 exemplars match" fact (direct file read +
grep); medium on the extrapolated 15-20% general ceiling (estimate, not a
count of historical dispatch logs).

## Q2 — `promote_memory` wiring status

### Method

Located the astramem plugin cache at
`C:/Users/serge/.claude/plugins/cache/astra/astramem/0.7.0` and inspected its
`package.json` and `.mcp.json`. Grepped the plugin's `src/`, `lib/`, `skills/`,
`commands/`, `hooks/`, `CHANGELOG.md`, `README.md`, `CLAUDE.md` for
`promote`/`promote_memory`/`promoteMemory` (case-insensitive). Also grepped
this repo's `node_modules/@astragenie/astramem-client` (the wire client this
repo actually imports per `docs/sop/memory-bridge.md`) and all of
`src/scripts/` in this repo for the same terms.

### Findings

- **`.mcp.json` (`C:/Users/serge/.claude/plugins/cache/astra/astramem/0.7.0/.mcp.json`)
  declares the astramem MCP server as a remote HTTP endpoint**:
  `"astramem": { "type": "http", "url": "${MEMORY_API_URL}/mcp", "headers": {
  "Authorization": "Bearer ${MEMORY_BEARER}" } }`. The actual tool
  implementations (including `promote_memory`) live server-side, behind that
  URL — **not in any source tree present on this filesystem**. The cached
  plugin package (`@astragenie/astramem-plugin` 0.7.0, per its
  `package.json`) is described in its own description field as "provider
  selector + hooks + CLI" — a client, not the server.
- **Zero references to `promote`/`promote_memory`/`promoteMemory`** anywhere
  in: the astramem plugin's `src/` (cli, contracts, lib, providers
  subdirs), its `skills/using-memory/SKILL.md`, its `CHANGELOG.md`,
  `README.md`, `CLAUDE.md`, or the `@astragenie/astramem-client` package
  vendored into this repo's `node_modules`. (Bash `grep -in promote` on
  each returned exit code 1 / "no files found" via the Grep tool.)
- **The `using-memory` skill's documented 4-step loop** (Load →
  `agent_profile`/`recall_memory`; Use; Feed back → `submit_feedback` /
  `mark_memory_used`; Store → `remember`) **never mentions `promote_memory`
  at all** — it is absent from the one skill this repo's `CLAUDE.md`
  explicitly says agents must follow for the memory loop.
- This repo's own `src/scripts/` has zero callers of `promote_memory`. The
  only "promote" hits in `src/` are unrelated backlog/learnings-promotion
  concepts (`pm-apply.mts`, `learnings-ranker.mts`, `claims-sync.mts`,
  `planning-rules.mts` — FEAT/SLICE promotion, not memory promotion).

### Verdict

**Dormant, from every observable client-side vantage point — indeterminate
at the server implementation level** (that code isn't present on this
machine; it lives behind `${MEMORY_API_URL}`). Concretely: nothing in this
repo, the astramem plugin cache, the astramem-client npm package, or the
using-memory skill ever calls, documents, or schedules `promote_memory`. If
it is wired to an automatic consolidation/credit path, that wiring exists
solely in the remote astramem-local server codebase, which this research
could not reach. Given the plan's own E7 phrasing ("the primitive already
exists server-side; the rule just wires it") already anticipates this gap,
and the plugin's CHANGELOG is silent on it, the most defensible reading is
that **E7 should proceed as its own small upstream workstream** (as the plan
already hedges), not assume existing automatic wiring.

Confidence: high on "no local/client-side caller or documentation exists";
cannot rule out server-side wiring (source unavailable) — flagged as
indeterminate at that layer, not asserted as fully dormant end-to-end.
