# Research: "lead" → "dispatcher" rename — reference inventory

- **Type**: run brief / research inventory (read-only)
- **Requested by**: team-lead
- **Scope**: two repos — `C:\work\mega\runner-plugin` (loop) and `C:\work\mega\dev-team` (crew/hero-crew)
- **Method**: parallel read-only research dispatch (`runner:researcher` for runner-plugin, `crew:researcher` for dev-team), each covering 7 surface categories + repo-specific checks, synthesized below. No edits, no commits made.

## Headline finding

**dev-team already ran this exact rename once, in v0.41.0** ("hard cut" — `CHANGELOG.md:1202-1209`): `agents/lead.md` was deleted, `lead` → `dispatcher` was swept across active `agents/*.md`, `commands/*.md`, `skills/**/SKILL.md`, and routing/architecture docs, and a `NO_LEAD_REF_REQUIRED` CI gate (`scripts/validate-agents.ts`) was added to prevent regression. Current dev-team version is 0.66.0 — v0.41 is ~25 releases old. **No `crew:lead` agent exists today; the rename is not virgin ground.**

This changes the shape of the task: it is not "invent a new name," it is **"finish and reconcile an incomplete rename from 25 releases ago,"** plus decide what to do about a second, unrelated thing already named "dispatcher" in runner-plugin (`runner:hierarchical-dispatcher`, a parallel-worktree-fanout agent — a different concept).

Runner-plugin's own `orchestratorMode: "lead"` was a **different, already-fully-retired** thing (loop-side orchestrator mode, removed v0.43/FEAT-191 for a persistent specialist-pause bug, unrelated to dev-team's role-naming rename). Its schema (`OrchestratorMode` type union) has **no live `"lead"` value left** — only comments and stale docs mention it.

---

## Repo 1 — runner-plugin (loop)

~75-80 live role-sense hits across ~35 files (excluding `.claude/artifacts/**`, which alone case-insensitively matches "lead" in 623 files — historical, out of scope). No wire/persisted field is literally named `lead`; the `OrchestratorMode` type already excludes it.

### 1. Agent/command/skill definitions

| File:line | Hit | Category | Persisted vs prose | Rename risk |
|---|---|---|---|---|
| `agents/pm.md:250` | "There is no `crew:lead` step in this repo (decommissioned 2026-06-07)" | negation prose | prose | low — but is a test fixture anchor (see §5) |
| `agents/architect.md:3` | frontmatter description: "Dispatched by lead or invoked manually..." | frontmatter body prose | prose | low |
| `agents/architect.md:120` | "there is no `crew:lead` step in this repo (decommissioned 2026-06-07)" | negation prose | prose | low, same test anchor |
| `commands/auto.md:92,95` | documents `orchestratorMode` as `("lead" default, "orchestrate-slice", or "direct-builder")` | **stale doc drift**, not live schema | prose | **must reconcile to real default (`slice-build`) before/alongside rename** — see Doc-drift flag |
| `commands/close.md:149` | "`dispatchInstruction`... (mode `lead`)" | same doc-drift pattern | prose | same as above |
| `commands/lessons-recent.md:43` | "Lead reads before promoting a feature to slice..." | live role prose | prose | low |
| `skills/loop-discipline/SKILL.md:43` | `escalated_to_dispatcher` (alias `escalated_to_lead`) | **pre-existing alias, DIFFERENT concept** (hard-block escalation state, not the orchestrator role) | display/config | **HIGH — semantic collision**, see Collision analysis |
| `skills/workflow/using-crew/SKILL.md:24-26,46,99` | "one clear lead per run", "the session... is the lead for that run", "not alternate leads" | **live, current definition of the role concept being renamed** | prose | low, core rename surface |
| `skills/workflow/review-gates/SKILL.md:14,26,83` | "a lead is deciding...", "the lead should state...", "back to the lead" | live role prose | prose | low |
| `skills/universal/writing-task-handoffs/SKILL.md:14,18` | "work passes between lead, builder, reviewer, researcher..." (×2) | live role prose | prose | low |
| `skills/domain/javascript/js-conventions/SKILL.md:17` | "Lead: recommend when a builder is touching..." | borderline — could be heading-style, not address-to-role | prose | judgment call, low either way |
| `skills/workflow/systematic-debugging/test-pressure-3.md` (7 lines) | "tech lead" | **excluded** — fictional debugging-pressure persona, unrelated | n/a | none |
| `skills/domain/prompt-engineering/SKILL.md:39,56`, `references/examples.md:5` | "leadership"/"technical leadership" | **excluded** | n/a | none |
| `agents/3rdparty/fact-checker.md:44` | "misleading" | **excluded** | n/a | none |
| `skills/universal/brainstorming/SKILL.md:31` | "Lead with your recommended option" | **excluded** — verb, not role noun | n/a | none |

### 2. Source code identifiers + string literals

- `src/scripts/lib/slice-linker/dispatch.mts:69` — `export type OrchestratorMode = "slice-build" | "orchestrate-slice";` — **confirmed no `"lead"` member; schema already fully migrated.**
- `src/scripts/lib/slice-linker/start-slice.mts:127-139` (`resolveOrchestratorModeConfig`) and `src/scripts/lib/walker-gates.mts:26,47-55` (`resolveWalkerOrchestratorMode`) — comments only, documenting the legacy `"lead"`/`"direct-builder"` fallback-to-`slice-build` behavior. Comment-only cleanup, zero behavior risk.
- **`src/scripts/lib/slice-linker/crew-bridge.mts:632`** — `"After grade-write, lead picks next slice + opens new builder handoff."` — a template-literal string **written verbatim into every generated handoff artifact's "Suggested next handoff" section** (persisted to `.claude/artifacts/crew/handoffs/*.md`). Genuine persisted/generated-artifact-body hit; nothing parses it back, but it seeds every future handoff's prose. **Contract-migration-adjacent, not zero-cost.**
- `src/scripts/lib/slice-linker/start-slice.mts:116` — `"...lead-attested per docs/sop/inline-criteria.md."` — display-only hint string surfaced at dispatch time.
- `scripts/competitor-audit/researcher-prompt.md:16,126` — describes crew's role roster "(lead, builder, reviewer, validator, deployer, researcher)" — an **outward-facing prompt template** fed to the market-researcher's LLM call describing the (now-outdated) crew role model to an external research pass.
- `src/scripts/validate-agent-refs.mts:56` — comment listing `crew:lead` as a deliberately-excluded retired name from the docs/ scan allowlist. Comment only, but see §validators below.
- All other hits (`leading`, `misleading`, `LEADING_TS_RE`, `hasLeadingTimestamp`, `leadTime` DORA metric field in `pr-merged-emitter.mts`, `backlog-state-emitter.mts:40`, `spec-created-emitter.mts`) — **false positives, excluded.**
- `hooks/**` — zero hits.

### 3. Manifests

`.claude-plugin/plugin.json` — zero hits. (Stale untracked worktree copies under `.claude/worktrees/agent-*/` excluded as session artifacts, not source.)

### 4. Docs with live contract relevance

| File | Lines | Status |
|---|---|---|
| `docs/upstream-requests/2026-07-10-crew-team-lead-label-collision.md` | title, 12, 14 | **OPEN** (ticket astragenie/dev-team#200) — direct collision data point, see below |
| `docs/upstream-requests/archive/2026-06-10-hero-crew-lead-orchestrator-restoration.md` | — | **CLOSED/superseded-by-FEAT-191** (frontmatter `status: superseded-by-feat-191`, resolved 2026-06-12) — historical only |
| `docs/sop/specialist-pause-handling.md` | 3,9,11,20-24,124,163,165,172,178,181,204,225,227,248 | **live SOP**, heaviest live usage of "lead" as the role (e.g. `--from builder --to lead` CLI example) |
| `docs/sop/inline-criteria.md:8` | 8 | live |
| `docs/decisions/DEC-008-model-routing-policy.md:51,77,103,141,145` | — | live decision record; "lead" is a **prose label** only — confirmed the actual config key is `modelRouting.sliceStart`, not a `lead` wire key |
| `docs/integrations/github-pr-comment-teammate.md:18,22` | — | live |
| `docs/upstream-requests/2026-06-13-hero-crew-verdict-not-checked-author-judge.md:31,99` | — | live/open |
| `docs/superpowers/specs/**`, `docs/superpowers/plans/**` (10 files, e.g. `2026-06-04-tool-restricted-lead-orchestrator-design.md`) | — | **historical design-record archive**, excluded per CLAUDE.md's own framing — filenames contain "lead" but files won't be touched by a rename |
| `docs/research/**` competitor briefs | — | excluded — "lead" as generic term for competitor products' own roles (e.g. CrewAI) |
| README.md, ADOPTION.md | — | **zero hits, verified** |
| CHANGELOG.md (8+ historical entries around v0.39/v0.43) | — | historical release notes describing the removed lead-mode saga — excluded, out of scope |
| `docs/cleanup-audit-2026-06-11.md`, `docs/conventions/report-filenames*.md` | — | **open question** — surfaced in broad grep, not individually line-verified |

### 5. Tests asserting on the literal "lead"

| File:line | Assertion |
|---|---|
| `src/tests/slice-build-routing.test.mts:34,37` | asserts fallback behavior when stale config says `orchestratorMode: "lead"` |
| `src/tests/slice-start.test.mts:117,131-132` | negative assertion — `dispatchInstruction` must NOT match `/Dispatch crew:lead subagent/` |
| `src/tests/slice-linker.test.mts:279,300,311,331` | fixture titles ("SLICE-63: Lead operates...") + a FEAT-191 section comment — fixture data, not role assertion |
| `src/tests/validate-agent-refs.test.mts:126,131` | **load-bearing**: tests that the negation prose "there is no `crew:lead` step" (in `agents/pm.md:250`, `agents/architect.md:120`) is NOT flagged as a live dispatch instruction by the CI validator |
| `model-router.test.mts`, `frontmatter.test.mts`, `gh-mention-parser.test.mts`, `competitor-audit-aggregate.test.mts`, `ids.test.mts`, `grade-naming.test.mts`, `artifact-naming.test.mts`, `auto-walker.test.mts` | all false positives (`misleading`, `leading`, `LEADING_TS_RE`, "rejects leading zeros") — excluded |

### 6. `.claude/loop.json` / orchestratorMode schema

Zero hits in the live `.claude/loop.json`. Schema (`OrchestratorMode` type union) already fully migrated — only the two resolver-function comments (§2) still mention the retired literal. **Not touched by a future rename; already done.**

### 7. Historical-only artifacts

`.claude/artifacts/**` — **~623 files** case-insensitive match (order-of-magnitude, not de-duplicated against `leading`/`misleading` false positives). Spans grades, plans, decisions, pm-reviews, triaged backlog, retrospectives, trajectories, pending-dispatch, learnings.jsonl, plus the current in-flight memory-integration session's runs/handoffs/reviews/cost-insights. **All out of scope for rename**, consistent with how `validate-org-refs.mts`/`validate-agent-refs.mts` already carve this tree out as non-authored/frozen.

### Repo-specific checks (as requested)

- `src/scripts/lib/plugin-identity.mts` (MIN_CREW_VERSION pinning) — **zero hits**, no role-name coupling.
- `docs/halt-badges.md` (SPEC-003 registry) — **zero hits**, no lead-related halt badge exists.
- `.claude/loop/rules.md`, `docs/ai-loop/00-entry/MASTER_PROMPT.md` — **zero hits** (only an unrelated "leading timestamp" match in rules.md); both already use "orchestrator"/"the loop" language, not "the lead."
- `src/scripts/validate-agent-refs.mts` — does **not** hardcode a general role-name list; hardcodes a `CREW_KNOWN_TOKENS` allowlist of real dispatch ids that already deliberately excludes `"lead"`/`"builder"` as phantom-by-design (lines 32-44, 74-99). A rename to "dispatcher" needs: (a) confirming `"dispatcher"` doesn't collide with a real future crew agent id, (b) updating the comment at lines 46-58 which itself names `crew:lead` as a retired-name example.
- `src/scripts/lib/post-builder-fanout.mts` — **zero hits**; the "golden byte-identical test" concern flagged in CLAUDE.md does not apply to this term.

### Doc-drift flag (pre-existing, independent of any rename)

`commands/auto.md:87-99` and `commands/close.md:149` document `orchestratorMode` defaulting to `"lead"` — this **contradicts** the actual current type (`"slice-build" | "orchestrate-slice"`) and CLAUDE.md's own statement that legacy modes were removed in v0.43/FEAT-191. This is pre-existing drift, not caused by any rename, but **must be reconciled first** — otherwise a mechanical rename would propagate the wrong (already-wrong) string forward.

---

## Repo 2 — dev-team (crew / hero-crew)

### 1. Agent/command/skill definitions

- **No `agents/lead.md` on disk.** `agents/lead.md`, `agents/3rdparty/backup/lead.md`, `evals/agents/crew-lead.yaml` were deleted in v0.41.0 (`CHANGELOG.md:1202-1209`). `crew:lead` is not a dispatchable agent id anywhere live (confirmed against the full 23-agent roster).
- **`skills/workflow/dispatcher-routing/SKILL.md`** and **`skills/workflow/dispatcher-orchestration/SKILL.md`** — directory names, frontmatter `name:`, and body prose throughout consistently say "dispatcher" (this IS the completed rename of the orchestrator-role concept — same concept as the old `lead`/`crew:lead`, confirmed distinct from runner-plugin's `runner:hierarchical-dispatcher` parallel-worktree-fanout agent). **But**: `dispatcher-routing/SKILL.md:8` H1 reads `# Lead Routing`, and `dispatcher-orchestration/SKILL.md:8` H1 reads `# Lead Orchestration Reference` — **live drift, a body-content miss from the v0.41 sweep**, undetected since because no test asserts skill H1 text against frontmatter `name`. CHANGELOG confirms the directory itself was renamed (`lead-orchestration/`→`dispatcher-orchestration/`, `lead-routing/`→`dispatcher-routing/`) but the visible heading was missed.
- `agents/3rdparty/critical-thinking.md:8` — "...before architect produces a design or lead accepts a scope..." — ambiguous prose in a vendored 3rdparty file, explicitly out-of-scope per the v0.41 CHANGELOG note itself ("third-party `agents/3rdparty/*` deferred").

### 2. Source code identifiers + string literals

| File:line | Hit | Persisted vs prose | Rename risk |
|---|---|---|---|
| `scripts/lib/workflow-state.ts:290-301` | `escalated_to_dispatcher` (current) vs `escalated_to_lead` (legacy alias, same selector/status slot) | **PERSISTED wire badge**, cross-plugin contract | **HIGH — do not touch without a deprecation plan**; any consumer (incl. runner-plugin) still emitting/reading `escalated_to_lead` depends on it staying live |
| `scripts/crew.ts:768` | `to: flags.to ?? "lead"` | **persisted handoff-artifact default value** (`to:` field written into generated handoff JSON/frontmatter) | contract-migration — a real default other tooling could rely on |
| `scripts/lib/approvals.ts:98` | `return USER_APPROVAL_KINDS.has(kind) ? "user" : "lead";` | **live role-classification return value**, not just prose | contract-migration |
| `scripts/crew.ts` (×8: 850,877,914,936,982,1032,1103,1189,1289), `scripts/lib/approvals.ts:212,280`, `scripts/lib/claims.ts:251` | `"lead-session"` default owner/actor identifier strings | audit-trail labels, not role-dispatch ids | mechanical-ish, but a coordinated naming decision needed (rename to `"dispatcher-session"` or leave) |
| `scripts/validate-routing-table.ts:33,45` | `"lead"` still in a role-token enum/regex | likely **dead** — `docs/routing-table.md` itself has zero "lead" hits now | small mechanical cleanup, no functional risk |
| `scripts/lib/memory/inject-profile.ts:3`, `docs/contracts/agent-profile-feedback-v1.md:98`, `docs/superpowers/plans/2026-07-14-agent-profile-load-feedback.md:17,165` | "Corrections lead deterministically..." | **excluded** — verb, not role | none |

### 3. Manifests / user-facing docs — the most visible stale drift

- **`.claude-plugin/plugin.json:4`** — `"description": "A lead-guided engineering workflow plugin for Claude Code..."` — marketplace-facing description **directly contradicts** the v0.41 hard cut. High visibility.
- **`.claude/loop.json:101`** (dev-team's own) — `"productDescription": "...Crew harness with lead-guided engineering workflow..."` — same stale phrase.
- **`README.md`** — internally self-contradictory:
  - Line 11 (correct, post-rename): "There is no `lead` agent role; orchestration is a concept, not a callable subagent."
  - Lines 106-107, 194, 215, 242 (stale, pre-v0.41 mental model): "The user should mostly talk to the lead," "tell the lead about project habits," "the lead should dispatch review," "ask the lead to help..."
  - Line 255: model-tier table row `| lead | opus |`.
  - Line 297: agent roster list names `lead, builder, builder-fe, builder-be, reviewer, validator, deployer, integrator, researcher, architect, uxdesigner, refactor` — matches **no** current era (no lead; builder/builder-fe/builder-be superseded by backend-dev/frontend-dev/fullstack-dev; validator superseded by verifier; deployer superseded by release-engineer). README is frozen well before v0.41, a broader doc-currency problem the rename work would touch incidentally.

### 4. Design docs treating "lead" and "dispatcher" as live synonyms (should have been swept, weren't)

- `docs/design/2026-07-10-subagent-lifecycle-reliability.md:280,282,285` — line 285 literally: "lead/dispatcher is still the only party that can `TaskStop`."
- `docs/research/2026-07-06-memory-bridge-reconciliation.md:96` — "a design note the dispatcher/lead owns."
- `.claude/artifacts/crew/designs/2026-07-12-subagent-lifecycle-guards.md:286` — "lead/orchestrator-scoped, not peer-scoped" (4-day-old artifact, conceptually live despite sitting in the artifacts tree).

### 5. Tests — heaviest enforcement surface, mirrors the v0.41 gate

- `tests/agent-prompt-content.test.ts:56-79` — explicit whitelist of *allowed* "lead" phrases in builder prompts (`"you are the lead"`, `` `crew:lead` ``, `--to lead`) with a comment: "New 'lead' mentions outside the whitelist are likely orchestrator-vs-lead conflation creep" (FEAT-170 SLICE-D).
- `tests/agent-prompt-content.test.ts:1208-1247` — parametrized "No lead refs across active agents (v0.41 hard cut)" describe-block, mirrors `scripts/validate-agents.ts`'s `NO_LEAD_REF_REQUIRED` set (line 429-450, 20 agents) exactly.
- `scripts/validate-agents.ts` `NO_LEAD_REF_REQUIRED` regex: `/\bthe lead\b|\bto the lead\b|\bby the lead\b|\bcrew:lead\b/gi` — **any future rename work should extend this existing gate, not duplicate it.**
- **Possible live regression, unverified (read-only pass, tests not run)**: `.claude/artifacts/crew/reviews/20260622T073549Z-review-result-fix-inspector-prompt-contract-review.md:30` flags `tests/dispatch-timing-pre-tap.test.ts:82` as a known failure — "`crew:lead` removed in v0.41 hard cut but the test was not removed in the hard-cut commit d5889d4" (`lookupAgentModel crew:lead→sonnet` fails). **Recommend a live `bun test`/equivalent check before scoping further rename work** to confirm current status.
- `tests/cli-artifacts.test.ts:282,305`, `tests/cli-claims.test.ts:61` — `"lead-session"` default-string assertions, same class as §2.
- `tests/validate-agents-peer-dispatch.test.ts`, `tests/validate-skills-frontmatter.test.ts`, `tests/validate-skills.test.ts` — synthetic fixture markdown (`owner: lead`, `- Receive scope from lead.`) used to test the validators themselves, not real agent/skill content — low risk.

### 6. Historical artifacts

`.claude/artifacts/crew/`: runs 262 files, handoffs 366, reviews 194, agents 105, designs 5, deployments 2 — heavy "lead"/"crew:lead" mentions confirmed in `runs/`/`reviews/` but frozen historical narrative, out of scope.

### 7. Manifests (marketplace)

No local `marketplace.json` in dev-team — it's a consumer of the external `astragenie/astra-marketplace` registry (confirmed via runner-plugin's `validate-marketplace-sync.mts`, which fetches that registry rather than reading a local file here).

---

## Collision analysis: "dispatcher" already means (at least) three things

A "lead" → "dispatcher" rename does not land in an empty namespace. Today, across the two repos, "dispatcher" already has **three distinct senses**:

1. **runner-plugin's `runner:hierarchical-dispatcher`** (`agents/hierarchical-dispatcher.md`) — a dispatchable agent that spawns N parallel child subagents in isolated git worktrees, depth-capped fan-out/merge (`dispatchLimits.maxDepth`). This is a **different concept** from the orchestrating-role rename target.
2. **runner-plugin's `escalated_to_dispatcher`/`escalated_to_lead` alias** (`skills/loop-discipline/SKILL.md:43`) — "dispatcher" is *already* the primary name here for a **hard-block escalation state**, a third, unrelated concept, with "lead" retained only as a deprecated alias for that same escalation state.
3. **dev-team's `dispatcher-routing`/`dispatcher-orchestration` skills + `workflow-state.ts`'s `escalated_to_dispatcher` field** — this one IS the target concept (the orchestrating role), and it is the **same wire field name** as runner-plugin's item 2 above (`escalated_to_dispatcher`/`escalated_to_lead`), which is reassuring (the two repos' escalation-badge naming is already aligned) but means the word "dispatcher" is overloaded within a single shared vocabulary across the plugin boundary.

Net: if a rename effort in runner-plugin were to introduce "dispatcher" as the *role* name (mirroring dev-team's already-completed v0.41 rename), it would collide head-on with `runner:hierarchical-dispatcher`'s existing identity in the same repo. **This is the single highest-value decision the operator needs to make before scoping any implementation slice**: either (a) pick a different target name than "dispatcher" for runner-plugin's role concept, (b) rename/namespace `runner:hierarchical-dispatcher` to something else first, or (c) accept the two-senses-of-one-word risk explicitly and document a disambiguation rule (e.g. "dispatcher" unqualified = role, "hierarchical-dispatcher" = the parallel-fanout agent, never abbreviate the latter).

Separately: **`docs/upstream-requests/2026-07-10-crew-team-lead-label-collision.md`** (open, ticket astragenie/dev-team#200) reports that the crew mailbox/teams harness echoes a `team-lead` label that operators confuse with the retired loop-side `orchestratorMode: "lead"`. That collision is about the **Claude Code teams harness's own session-identity label**, not something either plugin's rename controls — but whoever eventually resolves #200 should be told a same-word rename may be in flight on the runner-plugin side, so the two efforts don't produce a fresh collision in the opposite direction.

---

## Personal-config note (report-only, not renameable by this effort)

The user's global `~/.claude/crew/constitution.md` declares, under **Team Roles**:
```
- lead: planning, delegation, synthesis
```
This file is outside both repos (personal, not checked into either codebase) and is loaded into every session's system prompt as durable instruction. **A "lead"→"dispatcher" rename is incomplete without the operator editing this personal file** — no amount of in-repo renaming changes what the constitution tells every session to call the role. This is out of scope for any engineering slice; it requires the operator's own edit.

---

## Cross-plugin contract risk summary

The genuinely coordinated (not mechanical) surfaces, ranked by blast radius:

1. **`escalated_to_dispatcher`/`escalated_to_lead` badge alias** — present in both repos' vocabulary (dev-team's `workflow-state.ts` defines it; runner-plugin's `loop-discipline/SKILL.md` documents the same alias pair). Any change here needs both repos' halt-badge registries (`docs/halt-badges.md` in runner-plugin, SPEC-003) checked in lockstep.
2. **dev-team's `scripts/crew.ts:768` handoff `to:` default** (`"lead"`) and **`scripts/lib/approvals.ts:98`** role-classification return value — both are live program values a consumer could read back, not just prose.
3. **runner-plugin's `validate-agent-refs.mts` `CREW_KNOWN_TOKENS` allowlist** and its retired-name comment — needs updating in lockstep with any live rename to avoid the CI gate either false-flagging or silently permitting a new phantom name.
4. **dev-team's `NO_LEAD_REF_REQUIRED` gate** (`validate-agents.ts` + mirrored `agent-prompt-content.test.ts` describe-block) — this is the *existing* enforcement from the v0.41 rename; extending it (rather than building a parallel gate) is the natural next step if the rename effort's scope is "finish v0.41's incomplete sweep" rather than "invent a new name."
5. **`docs/superpowers`/`docs/design` docs treating "lead" and "dispatcher" as synonyms** (dev-team) — these are exactly the kind of doc that got missed by v0.41's file-glob-based sweep because they're prose paragraphs, not agent/skill/command files that the sweep's glob targeted.

---

## Suggested slice decomposition

Given the headline finding (dev-team already did this; runner-plugin's `orchestratorMode: "lead"` is a separate, already-fully-retired thing), the work does **not** decompose into "rename lead to X in repo A" / "rename lead to X in repo B" as parallel twins. It decomposes by risk class:

1. **SLICE A — dev-team: finish the v0.41 sweep** (mechanical, low risk, single repo). Fix the two skill H1 headings (`dispatcher-routing/SKILL.md:8`, `dispatcher-orchestration/SKILL.md:8`), the stale `plugin.json` description, `.claude/loop.json` productDescription, the self-contradictory README passages (bundle with the broader README agent-roster staleness since they're adjacent edits in the same file), and the likely-dead `"lead"` entries in `validate-routing-table.ts`. Verify (don't just assume) the `dispatch-timing-pre-tap.test.ts:82` regression status first — run the test.
2. **SLICE B — dev-team: decide + migrate the wire-relevant "lead" values** (`scripts/crew.ts:768` handoff default, `approvals.ts:98` role-classification value, `"lead-session"` actor strings). Needs a decision on target string (`"dispatcher"` vs `"dispatcher-session"`) and a deprecation-window plan for `escalated_to_lead`, coordinated with runner-plugin since that alias is cross-plugin.
3. **SLICE C — runner-plugin: reconcile pre-existing doc drift independent of any rename** (`commands/auto.md:87-99`, `commands/close.md:149` documenting a stale `"lead"` default that doesn't match the real `OrchestratorMode` schema). This should land **before or alongside** any prose rename, or the rename would propagate an already-wrong string forward.
4. **SLICE D — runner-plugin: prose-only rename of the live role references** (§1/§4 tables above — `pm.md`, `architect.md`, `commands/lessons-recent.md`, `using-crew`/`review-gates`/`writing-task-handoffs` skills, `docs/sop/specialist-pause-handling.md`, `docs/sop/inline-criteria.md`, `docs/decisions/DEC-008-model-routing-policy.md`, `docs/integrations/github-pr-comment-teammate.md`). Update the two test fixtures anchored to the negation-prose pattern (`validate-agent-refs.test.mts:126,131`) and the `validate-agent-refs.mts:56` comment in lockstep. **Blocked on the operator's naming decision from the Collision analysis section** — do not start this slice with "dispatcher" as the assumed target name without first resolving the `runner:hierarchical-dispatcher` collision.
5. **Not a slice, an operator action**: update `~/.claude/crew/constitution.md`'s Team Roles line — outside repo scope, cannot be done by an engineering slice.
6. **Not a slice, cross-plugin coordination**: notify whoever owns `docs/upstream-requests/2026-07-10-crew-team-lead-label-collision.md` (ticket #200) that a role rename may be in flight, so the mailbox-label fix and the role rename don't collide in the opposite direction.

## Confidence

Medium-high. Both sub-agents covered every requested surface and repo-specific check; the dev-team finding (prior completed rename, incomplete sweep) is the single most load-bearing discovery and was independently corroborated across CHANGELOG, the two skill files, README, and multiple design docs. Residual open items: three runner-plugin docs not individually line-verified (`docs/cleanup-audit-2026-06-11.md`, `docs/conventions/report-filenames.md`, `docs/conventions/report-filenames-writer-audit.md`), the `.claude/artifacts/**` counts are order-of-magnitude not exact, and the `dispatch-timing-pre-tap.test.ts:82` regression status in dev-team was not verified live (flagged from a review artifact, not re-run).
