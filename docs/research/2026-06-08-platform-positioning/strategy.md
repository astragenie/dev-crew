# Platform Competitive Positioning — Crew + Loop vs. 17 competitors

**Date:** 2026-06-08
**Author:** lead session
**Scope:** AI coding tools (6) + agent frameworks (6) + workflow platforms (5) scored on 16 product/business axes.
**Inputs:** 13 fresh researcher briefs (this date) + 4 May-28 audit briefs translated to 16-axis rubric + Crew+Loop self-scoring.
**Output goal:** Roadmap for Top 10 Crew FEATs + Top 10 Loop FEATs + moat analysis.

---

## 1. Executive summary

**Where we win (score 3, ≤3 competitors match):**

- **Architecture Governance** — only Crew+Loop ships ADR/DEC-NNN ledger + supersession chain + architect-as-ADR-drafter. **All 17 competitors score 0 or 1.** Net-uncontested moat.
- **Learning From Past Runs** — grade-trend + lessons-recent + retros + decisions feeding next slice. Only PydanticAI Evals (2) and CrewAI Training (2) come close — and neither closes the auto-feed-forward loop.
- **Standards Enforcement** — content-length validators + zero-warning lint + HARD RULE blocks + manifest validators. Only Aider (2) and Cline (2) approach this; rest score 0 or 1.
- **Cost Tracking** — cost-advisor + cost trajectory + per-iteration $ alert. Tied with Trigger.dev (3); ahead of everyone else (most score 1 or 2 with no budget-alert primitive).

**Where we are at parity (score 3, several competitors also 3):**

- **Planning** — tied with Windsurf, Cline (3). Ahead of Claude Code/Cursor/Codex (2).
- **Multi-Agent** — tied with 7 competitors at 3. Crew's named-role contract (builder/reviewer/validator/architect/pm) is distinctive; Cline/Codex/Windsurf match but with looser semantics.
- **Human Approval Gates** — tied with Cline, Codex, Windsurf-prior, LangGraph, PydanticAI, Kestra, Mastra, Trigger.dev (3). Halt-badges + escalated_to_human is the loop's named-gate contract.
- **Loop Execution** — tied with Cline, OpenHands, Windsurf, Temporal, Airflow, Kestra (3). Loop's marathon-mode + stop-condition resolver is fully-fledged; Temporal/Airflow/Kestra are richer substrate but lack agent-loop opinion.

**Where we are behind (score ≤2, ≥2 competitors at 3):**

- **Enterprise Readiness** — Crew+Loop = 1. Cline/Codex/Claude Code/Windsurf/Temporal/Mastra/Kestra/Airflow/OpenHands/n8n all 3. **The single largest commercial gap.** No SOC2, no SSO, no RBAC, no on-prem story. Crew+Loop inherits Claude Code's enterprise posture — but that is invisible to evaluators searching `crew + SOC2` on Google.
- **GitHub Integration** — Crew+Loop = 2 (github-sync + gh CLI usage). Codex, Claude Code, Cline, OpenHands all 3 with `@bot`-in-PR-comment teammate pattern.
- **Linear Integration** — Crew+Loop = 1 (NoopProvider + stub). Codex, OpenHands score 3 with first-party "assign-to-agent" semantics.
- **Workflow Visibility** — Crew+Loop = 2 (artifact files only). Cline, Windsurf, OpenHands, Kestra, n8n, Airflow, Temporal, Cursor, Mastra all 3 with live UI / DAG / Gantt view.

**Strategic posture (one paragraph).** Crew+Loop is **the only tool in this audit that ships engineering-process methodology as code** — slice ceremony, ADR ledger, grade aggregation, HARD RULE skill blocks. Every competitor either ships a runtime (Temporal, LangGraph, Trigger.dev) or a coding-agent surface (Claude Code, Codex, Cursor, Cline, Windsurf) but stops at "execute steps fast." None of them encode "evolve the engineering system over time." Our defensible position is **the methodology layer above any agent harness** — currently bound to Claude Code but architecturally portable. The three things we must build next: (1) close the enterprise-readiness gap to clear procurement, (2) close the Linear/GitHub teammate gap to win the day-1-installed-by-PM segment, (3) ship a live workflow-visibility surface so evaluators can *see* the methodology, not just read about it.

---

## 2. Competitive matrix

Scores: 0 = missing, 1 = weak, 2 = moderate, 3 = strong. Total per row = sum/48.

### AI coding

| Competitor | Plan | MultiA | SharedMem | Visib | KB | Approval | GH | Linear | Arch.Gov | Standards | Learn | Cost | AgAnalytics | Loop | Heal | Enterprise | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Claude Code | 2 | 3 | 2 | 2 | 2 | 3 | 3 | 1 | 0 | 1 | 1 | 2 | 2 | 2 | 2 | 3 | **31** |
| OpenAI Codex | 2 | 3 | 2 | 2 | 2 | 3 | 3 | 3 | 1 | 2 | 1 | 2 | 3 | 2 | 2 | 3 | **34** |
| Cursor agents | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 3 | 0 | 2 | 1 | 2 | 2 | 2 | 2 | 3 | **30** |
| Windsurf / Devin Desktop | 3 | 3 | 3 | 3 | 2 | 2 | 2 | 1 | 1 | 2 | 2 | 2 | 1 | 3 | 2 | 3 | **35** |
| Cline | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 1 | 2 | 1 | 2 | 3 | 3 | 2 | 3 | **37** |
| Aider | 0 | 1 | 0 | 1 | 2 | 1 | 1 | 0 | 0 | 2 | 0 | 1 | 1 | 0 | 2 | 1 | **13** |

### Agent frameworks

| Competitor | Plan | MultiA | SharedMem | Visib | KB | Approval | GH | Linear | Arch.Gov | Standards | Learn | Cost | AgAnalytics | Loop | Heal | Enterprise | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CrewAI | 2 | 3 | 3 | 2 | 2 | 1 | 1 | 0 | 0 | 1 | 2 | 1 | 2 | 2 | 2 | 2 | **26** |
| LangGraph | 1 | 3 | 3 | 3 | 2 | 3 | 0 | 0 | 1 | 1 | 1 | 1 | 3 | 3 | 3 | 2 | **30** |
| AutoGen (maint.) | 1 | 3 | 2 | 2 | 1 | 2 | 0 | 0 | 0 | 0 | 1 | 2 | 2 | 2 | 1 | 1 | **20** |
| OpenHands | 2 | 2 | 2 | 3 | 3 | 1 | 3 | 3 | 0 | 1 | 1 | 2 | 2 | 3 | 2 | 3 | **32** |
| PydanticAI | 1 | 3 | 2 | 3 | 1 | 3 | 0 | 0 | 0 | 1 | 2 | 2 | 3 | 1 | 2 | 2 | **26** |
| Mastra | 1 | 3 | 3 | 3 | 2 | 3 | 1 | 0 | 0 | 0 | 2 | 2 | 3 | 2 | 1 | 3 | **29** |

### Workflow platforms

| Competitor | Plan | MultiA | SharedMem | Visib | KB | Approval | GH | Linear | Arch.Gov | Standards | Learn | Cost | AgAnalytics | Loop | Heal | Enterprise | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| n8n | 1 | 2 | 2 | 3 | 2 | 2 | 2 | 2 | 0 | 1 | 1 | 1 | 1 | 2 | 2 | 3 | **27** |
| Temporal | 1 | 2 | 3 | 3 | 1 | 3 | 0 | 0 | 0 | 0 | 1 | 2 | 2 | 3 | 3 | 3 | **27** |
| Trigger.dev | 1 | 2 | 3 | 3 | 1 | 3 | 2 | 0 | 0 | 1 | 1 | 3 | 2 | 2 | 2 | 2 | **28** |
| Kestra | 1 | 2 | 2 | 3 | 1 | 3 | 2 | 2 | 0 | 1 | 1 | 1 | 2 | 3 | 3 | 3 | **30** |
| Apache Airflow | 1 | 2 | 2 | 3 | 0 | 2 | 2 | 0 | 1 | 1 | 1 | 0 | 1 | 3 | 3 | 3 | **25** |

### Baseline — Crew + Loop self-scoring

| Competitor | Plan | MultiA | SharedMem | Visib | KB | Approval | GH | Linear | Arch.Gov | Standards | Learn | Cost | AgAnalytics | Loop | Heal | Enterprise | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Crew + Loop** | **3** | **3** | **2** | **2** | **3** | **3** | **2** | **1** | **3** | **3** | **3** | **3** | **2** | **3** | **2** | **1** | **39** |

**Aggregate total ranking (best → worst):**
Crew+Loop (39) > Cline (37) > Windsurf (35) > Codex (34) > OpenHands (32) > Claude Code (31) > LangGraph / Kestra (30) > Cursor (30) > Mastra (29) > Trigger.dev (28) > n8n / Temporal (27) > CrewAI / PydanticAI (26) > Airflow (25) > AutoGen (20) > Aider (13).

**Caveat.** Total is a coarse summary. Crew+Loop tops the list despite weak Enterprise (1) because methodology axes (Plan/Arch.Gov/Standards/Learn/Cost) are summed equally. **Strip those five axes and Crew+Loop = 22/33 vs Cline 30/33 / Windsurf 29/33 / Codex 28/33** — we are behind on every commercial dimension. The strategic implication: our methodology moat is invisible to buyers who score "Enterprise Readiness," "GitHub Integration," "Workflow Visibility" first.

---

## 3. Top 20 capability gaps in market

Industry-wide opportunities where ≥12 of 17 competitors score ≤1:

1. **Architecture governance (ADR + decision-supersession)** — 16/17 at 0 or 1. The single largest blue ocean. Crew+Loop = 3 (alone at top).
2. **Learning from past runs (grades → next run automation)** — 13/17 at 0 or 1. Crew+Loop = 3.
3. **Standards enforcement (content-length + convention + manifest gates auto-applied)** — 13/17 at 0 or 1. Crew+Loop = 3.
4. **Cost tracking with per-run budget alerts (vs raw token counts)** — 11/17 at 0 or 1. Crew+Loop = 3; Trigger.dev = 3.
5. **First-class Linear integration with sub-issue + cycle/project sync** — 13/17 at 0 or 1. Codex/OpenHands at 3; rest weak.
6. **Native marathon-mode autonomous walk with stop-condition resolver** — 8/17 at 0 or 1. Most have substrate (Temporal/Airflow/Kestra at 3) but no agent-loop opinion.
7. **Per-agent analytics (latency × token × outcome per named role)** — 9/17 at 0 or 1. Cline at 3 with OTel; LangGraph at 3 with LangSmith.
8. **Workflow visibility for agent runs (not just DAG state)** — 5/17 at 0 or 1. Visual UI is solved; agent-aware UI is not.
9. **Multi-agent named-role contract (builder/reviewer/validator)** — every competitor's "multi-agent" is generic; only Crew defines roles.
10. **Human approval gates as enumerable named primitives** (review/validate/deploy) — 8/17 at 0 or 1; most have generic pause-token.
11. **Cross-session shared memory with semantic search** — 7/17 at 0 or 1. CrewAI/LangGraph/Mastra/Cline at 3.
12. **Knowledge-base as committed-to-repo artifacts** — 8/17 at 0 or 1. Auto-memory dominates; committed memory rarer.
13. **Plan-mode with codebase-research pre-flight** — 4/17 at 3 (Windsurf/Cline). Most have implicit-plan-in-chat-turn.
14. **Self-healing with circuit-breaker + retry budget** — 4/17 at 3 (Temporal/Kestra/Airflow/LangGraph). Coding-agents at 2 with autofix loops.
15. **GitHub sub-issue + Projects v2 first-class support** — 17/17 at 0 or 1 for sub-issue specifically. All GH integrations hit only top-level Issues/PRs.
16. **Per-skill cost attribution (not just per-run)** — 15/17 at 0 or 1.
17. **Deterministic-replay for debugging agent failures** — only LangGraph + Temporal ship; everyone else loses state on crash.
18. **Composable preset-driven skill activation** — Crew+Loop is unique (FEAT-077 preset resolver); competitors don't model "stack identity → skill set."
19. **Parallel multi-dimensional review fan-out** — only Archon (.archon/) ships natively; Crew+Loop adding via FEAT-079 (in-progress).
20. **Halt-badge cross-plugin contract (SPEC-003 pattern)** — unique to Crew+Loop; no competitor has structured halt-state primitive.

---

## 4. Top 20 shared weaknesses

What ≥12 competitors do poorly (vs Crew+Loop):

1. **No ADR/decision tracking** (16/17).
2. **No automated grades-to-next-run loop** (13/17).
3. **No content-length / agent-shape standards enforcement** (13/17).
4. **No per-run $ budget alert with hard cap** (11/17).
5. **No Linear sub-issue + cycle sync (just CRUD)** (13/17).
6. **No first-class marathon-mode with stop-condition resolver** (15/17 in coding-agent + framework category — workflow platforms have it differently).
7. **No structured handoff-format artifact contract** (15/17).
8. **No per-skill cost attribution** (15/17).
9. **No grade-aggregation retrospective primitive** (15/17).
10. **No named approval-gate enumeration (review/validate/deploy)** (12/17 have only generic pause).
11. **No committed-to-repo memory** (12/17 default to local-only auto-memory with silent drift).
12. **No cross-plugin contract pattern (halt-badge equivalent)** (17/17).
13. **No deterministic replay** (15/17).
14. **No preset-driven skill activation** (17/17).
15. **No parallel multi-dimensional review** (16/17 — Archon excluded).
16. **No public on-prem story for SaaS-first vendors** (Codex / Cursor cloud-only; Windsurf VPC available but proprietary harness).
17. **No model-agnostic posture for vendor-locked tools** (Codex = GPT-5 only; Claude Code = Anthropic only).
18. **No first-class GH sub-issue support** (17/17).
19. **No per-agent token attribution dashboard out of box** (12/17).
20. **No FEAT/SPEC/SLICE backlog primitives** (17/17).

---

## 5. Top 10 features everyone claims but nobody does well

1. **Multi-agent collaboration.** Everyone says "agents talk to each other." In practice: chat-based handoff (AutoGen, PydanticAI), tool-wrapping (Codex, Mastra), or hand-wired DAG (n8n, Kestra). Only Crew defines named-role contracts with structured handoffs.
2. **Long-running autonomous loops.** Every coding-agent claims "headless / unattended mode." In practice: 20-tool-call caps (Windsurf), credit-throttled continues, no stop-condition resolver, no iteration counter. Only Loop ships a real marathon-mode contract.
3. **Cost tracking.** Every vendor surfaces a dashboard. In practice: aggregate spend, no per-run budget alert, no hard cap, no per-skill attribution. Trigger.dev's `usage.getCurrent()` and Crew+Loop's cost-advisor are the only real implementations.
4. **Human-in-the-loop.** Everyone has "approval." In practice: chat-confirm (Codex), per-tool-call accept (Windsurf), or generic Pause node (Kestra/n8n). Only LangGraph's `interrupt()` + Loop's halt-badges name the gate type.
5. **Knowledge base / memory.** Everyone claims "remembers your project." In practice: per-session chat history (Aider) or local-only auto-memory (Claude Code, Windsurf, Cursor). Only Cline's Memory Bank + Crew+Loop's committed snapshot+CLAUDE.md gives team-shareable memory.
6. **Self-healing.** Everyone claims "auto-fixes errors." In practice: lint-on-edit (Aider, Windsurf) or retry-on-tool-error (everyone). Only Temporal/Airflow/Kestra ship real circuit-break + retry-budget; coding-agents lack circuit-breaker primitives.
7. **Enterprise readiness.** Many claim "SOC 2 / SSO / RBAC." In practice: marketing pages list logos, public docs don't surface SCIM/audit-log/data-residency specifics. OpenAI Codex + Cline + Temporal are the gold standard.
8. **GitHub integration.** All 17 list it. In practice: REST wrappers around Issues/PRs. None of 17 support sub-issues, Projects v2, or PR-comment-resolution-as-workflow-input first-class.
9. **Planning.** Most ship "plan mode" or "agent that plans." In practice: chain-of-thought in chat turn. Only Windsurf's specialized planning agent + Cline's Plan/Act toggle + Crew+Loop's spec-decompose+slice-plan are real.
10. **Workflow visibility.** All have "live dashboards." In practice: tool-call streaming (Codex/Cursor) or DAG/Gantt (Airflow/n8n/Kestra). Only Cline's Kanban + Windsurf's Spaces + OpenHands' Cloud GUI ship a real agent-state-over-time view.

---

## 6. Segment opportunities

### Solo developers

**Pain.** Aider/Claude Code/Codex/Cursor cover daily work; nobody captures *learning* across projects. Solo devs lose context when they switch repos.

**Where Crew+Loop wins.** Committed-to-repo memory + auto-replay of past learnings + cost trajectory per slice. Standards enforcement helps a solo dev keep their own code clean as the project grows.

**Where we lose.** Setup friction (HARD RULE blocks feel heavy for a weekend project). Workflow Visibility is just artifact files — solo devs want to *see* progress in a UI.

**Best opportunity:** **lightweight on-ramp preset** (`/loop:install --solo`) that strips ceremony to grade + decisions + cost only.

### Small startups (2-20 engineers)

**Pain.** Onboarding new hires onto an evolving codebase; institutional knowledge in 3 founders' heads; "why did we choose X?" forgotten in 6 months.

**Where Crew+Loop wins.** ADR ledger + decisions-supersession + grade-trend retrospectives are exactly the institutional-memory primitive small teams build by hand (or skip entirely). Onboarding a new hire to "read all DEC-NNN files + last 3 retros" = real value.

**Where we lose.** No Linear sync (most startups run Linear). No Slack triggers. No issue → agent assignment flow (Codex + Cline + OpenHands have this; we don't).

**Best opportunity:** **Linear/GitHub teammate flow** — assign FEAT in Linear → Crew+Loop picks it up via webhook → slice runs → PR opens → DEC-NNN cross-linked.

### Enterprise teams

**Pain.** Procurement requires SOC2/SSO/RBAC/audit-log/on-prem. AI coding tools mostly fail the security checklist. Tools that pass (Codex Enterprise, Cline Enterprise, Temporal Cloud) lack engineering-methodology depth.

**Where Crew+Loop wins.** Methodology depth is *the* enterprise pitch — auditable engineering process, ADR ledger for compliance, grade aggregation for quarterly reviews, decision supersession for regulator inspection. Architecture governance maps to SOX / GDPR / HIPAA documentation requirements.

**Where we lose.** No own SOC2 attestation. No SSO/SCIM. No RBAC for who can write/read which artifacts. No on-prem deployment story for air-gapped customers. No managed offering. Enterprise inherits Claude Code's posture — invisible to procurement search.

**Best opportunity:** **Enterprise-readiness fast track** — Trust Center page surfacing Claude Code's SOC2 + clear "Crew+Loop runs inside Claude Code, inherits all enterprise controls" messaging, plus optional Crew+Loop-specific RBAC for artifact write permissions.

---

## 7. Ranked opportunities (Impact × Difficulty × Moat)

Composite = `Impact + (3 - Difficulty) + Moat`, max 9.

| Opportunity | Impact | Difficulty | Moat | Composite |
|---|---|---|---|---|
| **Live workflow-visibility UI for slice state** (closes gap to Cline/Windsurf/OpenHands) | 3 | 3 | 1 | 4 |
| **Linear teammate flow (assign FEAT → run slice → PR)** | 3 | 2 | 2 | 6 |
| **GitHub `@crew` PR-comment teammate (Codex pattern)** | 3 | 2 | 2 | 6 |
| **Enterprise-readiness Trust-Center page + SOC2-inheritance messaging** | 3 | 1 | 1 | 6 |
| **Per-skill cost attribution (extend cost-advisor)** | 2 | 1 | 3 | 7 |
| **Halt-badge cross-plugin contract documentation as marketing pillar** | 2 | 1 | 3 | 7 |
| **Architecture-governance hosted artifact catalog (DEC-NNN + grades aggregator)** | 2 | 2 | 3 | 6 |
| **Solo-developer preset (`/loop:install --solo`)** | 2 | 1 | 1 | 5 |
| **Parallel multi-dimensional reviewer fan-out** (already in-progress FEAT-079) | 3 | 2 | 2 | 6 |
| **Clause-citation discipline for scope decisions** (FEAT-078) | 1 | 1 | 2 | 5 |
| **Backlog-walking marathon-mode contract documentation** | 2 | 1 | 3 | 7 |
| **Preset-driven skill activation as marketing pillar** | 2 | 1 | 3 | 7 |
| **Cline-style Kanban for multi-slice parallel awareness** | 3 | 3 | 1 | 4 |
| **Temporal-style durable replay for crashed slices** | 2 | 3 | 1 | 3 |
| **Vector-store-backed shared memory (CrewAI/LangGraph parity)** | 2 | 3 | 1 | 3 |
| **Model-agnostic harness (run Crew+Loop outside Claude Code)** | 3 | 3 | 3 | 6 |
| **Grade-feed-forward: lessons auto-injected into next slice prompt** | 3 | 2 | 3 | 7 |
| **Public marketplace plugin for `@crew`/`@loop` in CC marketplace** | 2 | 2 | 1 | 4 |
| **Deterministic-replay (interrupt-recoverable slices)** | 2 | 3 | 2 | 4 |
| **Per-FEAT cost forecast (budget alert before slice starts)** | 2 | 2 | 3 | 6 |

---

## 8. Top 10 features Crew Plugin should build next

(Ranked by composite from §7; biased toward "extends current Crew surface, ships in ≤2 slices.")

1. **CREW-NEXT-1: GitHub `@crew` PR-comment teammate.** Add webhook receiver + slash flow that picks up `@crew review` / `@crew fix the test failure` in PR comments and dispatches `crew:reviewer` / `crew:builder` against the change. Composite 6. Closes major commercial gap (Codex/Claude Code/Cline at 3).
2. **CREW-NEXT-2: Linear teammate flow (assign-to-agent).** First-party Linear adapter that watches issue assignment, decomposes into FEAT (via existing `/loop:spec-decompose`), and posts status back to the Linear issue with embedded grade summary. Composite 6.
3. **CREW-NEXT-3: Per-skill cost attribution.** Extend cost-advisor to bucket spend by skill name (not just by slice). Surfaces "you spent $4.12 on `crew:reviewer` calls last week, 30% above 4-week average." Composite 7.
4. **CREW-NEXT-4: Enterprise Trust-Center page + SOC2-inheritance messaging.** Markdown page at `docs/trust/` enumerating Claude Code's SOC2/ISO/SSO posture + per-axis "Crew+Loop inherits this because…" notes. Composite 6.
5. **CREW-NEXT-5: Halt-badge cross-plugin contract as marketing pillar.** Promote `docs/halt-badges.md` + SPEC-003 to a top-level README section + blog post + skill manifest. Composite 7.
6. **CREW-NEXT-6: Per-FEAT cost forecast.** At `crew:builder` dispatch time, look up historical avg cost for similar FEATs by tag, surface "predicted $X ± Y, current budget $Z." Composite 6.
7. **CREW-NEXT-7: Architecture-governance dashboard.** Aggregate `decisions/*.md` + `grades/*.md` into a single HTML/MD report (`crew:brief-me --governance`) showing decision lineage + grade trend + supersession graph. Composite 6.
8. **CREW-NEXT-8: Crew-skill activity badge (per-PR).** Inject markdown summary into PR description: "Crew dispatches: reviewer (PASS), validator (PASS), 3 DEC-NNN refs, grade snapshot." Closes "show-your-work" gap for buyers. Composite 6.
9. **CREW-NEXT-9: Crew CLI run-summary export.** `crew:export --since=1w` emits structured JSONL of all dispatches + costs + outcomes for OTel/Datadog/Grafana ingestion. Closes Agent Analytics gap (rivals Cline/LangGraph at 3). Composite 5.
10. **CREW-NEXT-10: Crew adopt-existing-repo onboarding wizard.** Interactive `crew:install` flow that detects stack, picks preset, scaffolds `.claude/crew/` artifacts, and runs a sample `/crew:build` against a trivial task — first-run experience. Composite 5.

---

## 9. Top 10 features Loop Plugin should build next

1. **LOOP-NEXT-1: Live workflow-visibility UI for slice state.** Static-HTML dashboard generated from `loop-snapshot.md` + active claims + halt-badges, served via `loop:dashboard` slash command (opens browser). Composite 4 (high cost, high impact). Closes UI gap to Cline/Windsurf/OpenHands.
2. **LOOP-NEXT-2: Grade-feed-forward (lessons → next slice prompt).** Auto-inject last 3 slice grades' lessons into next slice's planning prompt via `/loop:slice-plan`. Closes the auto-learning loop nobody ships. Composite 7.
3. **LOOP-NEXT-3: Solo-developer preset (`/loop:install --solo`).** Strips HARD RULE blocks + slice ceremony to grade + decisions + cost only. Lightweight on-ramp for hobbyists. Composite 5.
4. **LOOP-NEXT-4: Backlog-walking marathon-mode contract documentation.** Promote `loop:auto` + `loop.marathonMode` + stop-condition resolver to top-level README pillar with comparison table vs Temporal/Airflow/Kestra autonomous-walk semantics. Composite 7.
5. **LOOP-NEXT-5: Preset-driven skill activation as marketing pillar.** Currently buried in `scripts/presets/*.json`. Surface `loop:list-presets` output in README + blog post comparing to Cursor rules / Windsurf rules. Composite 7.
6. **LOOP-NEXT-6: Cline-style Kanban for multi-slice parallel awareness.** Same dashboard as LOOP-NEXT-1 but with worktree column. Composite 4.
7. **LOOP-NEXT-7: Model-agnostic harness (run Loop outside Claude Code).** Port the JS scripts to be Node-runnable independent of CC; ship reference dispatcher for `aider` / `codex CLI` integration. Composite 6 (high moat).
8. **LOOP-NEXT-8: Per-FEAT cost forecast (budget alert before slice starts).** Use historical cost-trajectory data to predict slice cost at `/loop:slice-start`; halt-badge if forecast > budget. Composite 6.
9. **LOOP-NEXT-9: Loop `@bot` Linear/GitHub issue triage.** Linear webhook → `loop:pm` triages → emits autonomous_safe + composite_priority → posts triage as Linear comment. Composite 6.
10. **LOOP-NEXT-10: Deterministic-replay (interrupt-recoverable slices).** Snapshot slice state at each phase-gate boundary; allow `/loop:slice-resume <slice-id>` to pick up from last green checkpoint. Borrows LangGraph's super-step pattern. Composite 4 (high difficulty, real moat).

---

## 10. Moat analysis

### Features that would make competitors obsolete

1. **Architecture-governance ledger + retrospective aggregation.** No competitor has the engineering-OS opinion; if Crew+Loop establishes "ADR + grades + decisions = how AI engineering teams audit themselves," competitors will have to copy the *vocabulary* (DEC-NNN, grade dimensions) which is hard once published.
2. **Halt-badge cross-plugin contract (SPEC-003 pattern).** Halt-badge as a stable interface that any plugin can read/write/extend — first-mover establishes the schema. Future Anthropic / Microsoft / OpenAI plugins would either adopt it or fragment.
3. **Preset-driven skill activation by repo identity.** Generalizes to "skill manifest declares which agent stack it expects" — same pattern as Docker images declaring runtime. Hard to retrofit into Cursor rules / Windsurf rules without breaking existing user installs.

### Features difficult for competitors to copy

1. **Five-dimensional PM scoring with autonomous_safe flag + grade-feed-forward** — requires PM agent, grade ledger, lessons-recent, cost trajectory, decisions, all wired together. Three years of accumulated grade data is unbeatable training data for the next PM rev.
2. **Slice ceremony as HARD RULE skill** — encoded as Skill markdown that's loaded into every session start. Competitors building inside their own product would need to ship a "skill" primitive first (only Cline + Claude Code have one).
3. **Iron-Law verification-before-completion as a named skill** — superpowers pattern adapted to Loop's grade system. Cultural artifact as much as technical.
4. **Decisions-supersede chain with auto-relevant lookup.** `loop:decisions-relevant` reads diff and surfaces past decisions. Building this without the underlying ledger is impossible; building the ledger after-the-fact loses cumulative context.

### Features that create network effects

1. **Shared `decisions/`, `grades/`, `lessons/` artifact format.** If multiple teams adopt, cross-team retrospectives become possible. Standard like JSON-LD for engineering process.
2. **Public registry of preset stacks** (TypeScript/Python/Go × FE/BE/single). Network effect: more presets → more useful → more contributors.
3. **Skill marketplace for Crew/Loop add-ons** (cybersecurity-review, frontend-design-review, etc.). Network effect: every team that ships a skill for their stack makes the platform more attractive to next adopter.
4. **Halt-badge consumers ecosystem.** If 3rd-party tools read `snapshot.*` halt-badges (Slack notifier, ops dashboard, etc.), the badge format becomes a defacto standard.

### Features that improve retention

1. **Grade-trend dashboard.** Users come back to see if their work is improving over time. Daily/weekly habit loop.
2. **DEC-NNN supersession chain.** Old decisions stay queryable; users return to "remind me why we chose X six months ago." Stickiness.
3. **Cost-trajectory advisor.** Users learn how much they spend per slice. Halting becomes the trust-builder for autonomous mode.
4. **Lessons-recent auto-injection.** Last week's lessons fold into this week's slice prompts. Compounding value.
5. **Snapshot-memory as session-resume anchor.** Cross-compaction continuity is rare; users feel they "don't have to re-explain" each new session.

---

## 11. Recommended priorities

### 90 days (commercial gap-closure)

1. **Enterprise Trust-Center page** (CREW-NEXT-4) — Markdown only. Unblocks procurement conversations. **2 days.**
2. **GitHub `@crew` PR-comment teammate** (CREW-NEXT-1) — closes Codex/Claude Code parity. **2 slices.**
3. **Linear teammate flow** (CREW-NEXT-2 / LOOP-NEXT-9) — closes Codex parity. **2 slices.**
4. **Per-skill cost attribution** (CREW-NEXT-3) — extend existing cost-advisor. **1 slice.**
5. **Halt-badge marketing pillar** (CREW-NEXT-5) — blog post + README section. **1 slice.**
6. **Preset-driven activation pillar** (LOOP-NEXT-5) — README + blog. **1 slice.**
7. **Backlog-walking marathon-mode contract** (LOOP-NEXT-4) — README section. **1 slice.**
8. **Parallel multi-dimensional reviewer** (in-progress FEAT-079) — ship it. **already in-progress.**
9. **Clause-citation discipline** (FEAT-078, queued) — ship it. **1 slice.**

### 180 days (moat consolidation)

10. **Grade-feed-forward into next slice prompt** (LOOP-NEXT-2) — closes the learning loop nobody ships. **2 slices.**
11. **Per-FEAT cost forecast** (CREW-NEXT-6 / LOOP-NEXT-8) — predict before commit. **2 slices.**
12. **Architecture-governance dashboard** (CREW-NEXT-7) — single HTML report. **2 slices.**
13. **PR activity badge** (CREW-NEXT-8) — embed Crew summary in PR descriptions. **1 slice.**
14. **Solo-developer preset** (LOOP-NEXT-3) — lightweight on-ramp. **2 slices.**
15. **Crew run-summary export** (CREW-NEXT-9) — closes Agent Analytics gap. **2 slices.**

### 365 days (category leadership)

16. **Live workflow-visibility UI** (LOOP-NEXT-1) — static-HTML dashboard. **4 slices.**
17. **Model-agnostic harness** (LOOP-NEXT-7) — Crew+Loop runs outside Claude Code. **6 slices.**
18. **Deterministic-replay** (LOOP-NEXT-10) — borrow LangGraph super-step pattern. **4 slices.**
19. **Public registry of preset stacks + community marketplace.** **3 slices + ongoing.**
20. **Skill marketplace** — third-party Crew/Loop add-ons. **5 slices + ongoing.**

---

## Appendix A — Briefs index

- AI coding: [claude-code](briefs/claude-code.md), [openai-codex](briefs/openai-codex.md), [cursor (translated)](briefs/_translated-from-may28.md#cursor-agents-ai-coding), [windsurf](briefs/windsurf.md), [cline](briefs/cline.md), [aider (translated)](briefs/_translated-from-may28.md#aider-ai-coding)
- Agent frameworks: [crewai (translated)](briefs/_translated-from-may28.md#crewai-agent-framework), [langgraph (translated)](briefs/_translated-from-may28.md#langgraph-agent-framework), [autogen](briefs/autogen.md), [openhands](briefs/openhands.md), [pydantic-ai](briefs/pydantic-ai.md), [mastra](briefs/mastra.md)
- Workflow platforms: [n8n](briefs/n8n.md), [temporal](briefs/temporal.md), [trigger-dev](briefs/trigger-dev.md), [kestra](briefs/kestra.md), [airflow](briefs/airflow.md)

## Appendix B — Methodology + caveats

- Crew+Loop self-scoring is biased upward (author scoring own product). Treat axes ≥3 with mild skepticism; axes ≤2 are accurate (visible gaps).
- 4 May-28 briefs (Aider/CrewAI/Cursor/LangGraph) translated from 10-axis rubric to 16-axis rubric; cells where no May-28 signal existed defaulted to 0 unless brief prose hinted at adjacent capability. See `_translated-from-may28.md` translation notes.
- Researcher briefs marked `confidence: medium-high` or higher; cells flagged `?` were not double-checked.
- Microsoft Agent Framework (AutoGen successor) NOT audited — recommend separate brief if AutoGen pivot becomes strategic.
- Archon (`.archon/`) not in this matrix; covered separately in `.claude/artifacts/crew/runs/competitor-archon-analysis.md` (2026-06-08) — feeding FEAT-078 + FEAT-079.

## Appendix C — Confidence calibration

| Brief | Source recency | Source primary? | Confidence |
|---|---|---|---|
| claude-code | live | Anthropic docs | medium-high |
| openai-codex | live | OpenAI docs | high |
| windsurf | live | windsurf.com + devin.ai | high |
| cline | live | cline.bot docs | high |
| aider | 2026-05-28 | aider.chat docs | high (translation conservative) |
| crewai | 2026-05-28 | docs.crewai.com | high (translation conservative) |
| langgraph | 2026-05-28 | langchain docs | high (translation conservative) |
| cursor-agents | 2026-05-28 | cursor.com docs | high (translation conservative) |
| autogen | live | microsoft/autogen | high; maintenance mode flag |
| openhands | live | docs.openhands.dev | medium-high |
| pydantic-ai | live | ai.pydantic.dev | high |
| mastra | live | mastra.ai + GH | high |
| n8n | live | docs.n8n.io | high |
| temporal | live | temporal.io + docs | medium-high |
| trigger-dev | live | trigger.dev/docs | medium-high |
| kestra | live | kestra.io + GH | medium-high |
| airflow | live | airflow.apache.org | medium-high |
