# Platform Competitive Positioning Audit — 2026-06-08

**Status:** approved-scope (pending user spec review)
**Owner:** lead (this session)
**Output target:** `docs/research/2026-06-08-platform-positioning/`

---

## Goal

Produce a single strategic positioning document that:

1. Scores Crew + Loop plugins against 19 competitors on 16 product/business axes.
2. Surfaces capability gaps, shared weaknesses, and "claimed-but-undelivered" market patterns.
3. Recommends Top 10 next-build FEATs for Crew and Top 10 for Loop, auto-materialized as `.claude/artifacts/loop/backlog/pending/FEAT-NNN.md` files ready for `/loop:triage`.
4. Documents moat structure: obsoleter / hard-to-copy / network-effects / retention.

Successor to `2026-05-28-loop-crew-competitor-gap-audit-design.md` and `2026-06-08 Archon analysis`. Wider scope (16 cols vs 10 axes, 19 competitors vs 7), more business-facing.

## Non-goals

- No code changes. Pure research + Markdown deliverables.
- No re-audit of CrewAI/LangGraph/Cursor/Aider (May 28 briefs trusted; scores translated to new axes).
- No moat analysis per competitor — only aggregated.
- No implementation of any recommended FEAT inside this run. FEAT files are queued for `/loop:triage`, not executed.

## Competitor universe (19)

**AI coding (6):** Claude Code, OpenAI Codex, Cursor, Windsurf, Cline, Aider.
**Agent frameworks (6):** CrewAI, LangGraph, AutoGen, OpenHands, PydanticAI, Mastra.
**Workflow platforms (5):** n8n, Temporal, Trigger.dev, Kestra, Airflow.
**Adjacent (2 — already audited):** Archon (2026-06-08 brief), superpowers/gstack/Devin-SWE (May 28 briefs).

Sub-set requiring fresh briefs: **15** (the 6 + 6 + 5 new — Cursor, CrewAI, LangGraph, Aider reuse May 28; Archon reuse 2026-06-08).

## 16-axis scoring rubric

Score each cell `0` (missing) | `1` (weak) | `2` (moderate) | `3` (strong). One-line evidence per cell mandatory.

1. **Planning** — Pre-flight design / spec / decomposition phase.
2. **Multi-Agent** — Multiple cooperating agents (not just one chain).
3. **Shared Memory** — State accessible to >1 agent / across runs.
4. **Workflow Visibility** — User can observe step state during execution.
5. **Knowledge Base** — Persistent repo / domain knowledge structured.
6. **Human Approval Gates** — Explicit pause-for-human at named points.
7. **GitHub Integration** — First-class GH issue / PR / sub-issue plumbing.
8. **Linear Integration** — Native Linear adapter or first-class issue sync.
9. **Architecture Governance** — ADR / decision tracking / supersession.
10. **Standards Enforcement** — Automated lint / convention / content-length gates.
11. **Learning From Past Runs** — Captured grades / retros surfaced into next run.
12. **Cost Tracking** — Per-run / per-phase $ visibility + budget alert.
13. **Agent Analytics** — Per-agent latency / token / outcome metrics.
14. **Loop Execution** — Long-running autonomous walk without human poke.
15. **Self-Healing** — Auto-retry / autofix / circuit-break on failure.
16. **Enterprise Readiness** — SOC2 / SSO / RBAC / audit-log / on-prem story.

## Execution plan

### Phase 1 — Research (parallel, ~10-15 min wall-clock for slowest)

Dispatch 15 `loop:researcher` subagents in parallel. Each prompt:

- Target: 1 competitor.
- Sources: official docs / repo / changelog / pricing page. WebFetch + WebSearch allowed.
- Constraints: ≤15 tool calls, ≤10 min wall-clock per `docs/sop/specialist-pause-handling.md`. Inline output if artifact-write times out.
- Output path: `docs/research/2026-06-08-platform-positioning/briefs/<competitor-slug>.md`
- Output schema:
  ```yaml
  ---
  competitor: <name>
  category: ai-coding | agent-framework | workflow-platform
  sources: [<url>, <url>]
  date: 2026-06-08
  ---
  ## Scores
  | axis | score | one-line evidence |
  | ---  | ---   | ---               |
  ## Strengths (top 3)
  ## Weaknesses (top 3)
  ## Features Crew/Loop should NOT copy (and why)
  ## Open questions / low-confidence cells
  ```

### Phase 2 — Translate May 28 briefs (sync, ~10 min)

For CrewAI, LangGraph, Cursor, Aider: map 10-axis scores → 16-col scores. Cross-reference May 28 brief prose. Mark translated cells as "T:" prefix for traceability.

### Phase 3 — Aggregate matrix (manual, ~15 min)

Hand-build 19×16 matrix in strategy.md. No `aggregate.mjs` extension (one-off, rewrite cost > gain).

### Phase 4 — Strategy synthesis (~30 min)

Write `docs/research/2026-06-08-platform-positioning/strategy.md`:

1. Exec summary (≤500 words).
2. 19×16 competitive matrix.
3. Top 20 capability gaps (industry-wide opportunities).
4. Top 20 shared weaknesses.
5. Top 10 claimed-but-undelivered features.
6. Segment opportunities (solo / startup / enterprise).
7. Ranked opportunities (impact × difficulty × moat, composite 0–9).
8. Top 10 Crew FEATs (auto-generated below).
9. Top 10 Loop FEATs (auto-generated below).
10. Moat analysis — obsoleter / hard-to-copy / network-effects / retention buckets.
11. Recommended priorities — 90-day / 6-month / 12-month.

### Phase 5 — FEAT auto-gen (~10 min)

20 FEAT files at `.claude/artifacts/loop/backlog/pending/FEAT-{101..120}.md` (FEAT-080..100 already exist from May 28 audit). Frontmatter:

```yaml
---
id: FEAT-NNN
status: pending
priority: P2 | P3
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-06-08
depends_on: []
slices: []
derived_from: null
source_competitors: [<name>, ...]
autonomous_safe: false  # creative scoping; PM triage required
tags: [<axis>, <plugin: crew|loop>]
needs_contract: false
needs_ux: false
---
```

Body: 1 paragraph problem + 1 paragraph proposal + acceptance criteria + reference back to strategy.md§N.

## Risks + mitigations

- **R1: Researcher pause-without-write.** Mitigation: explicit ≤15 tool-call + ≤10 min budget + inline-fallback clause in every prompt.
- **R2: Login-walled docs (Cursor, Codex, Windsurf, Devin).** Mitigation: prioritize public docs + changelog + GitHub repo; mark unverifiable cells as `?` with low-confidence note.
- **R3: FEAT-NNN collision.** Mitigation: confirmed FEAT-080..100 occupied; start at FEAT-101. Pre-check via `ls pending/` before write.
- **R4: 2-hour wall-clock budget exceeded.** Mitigation: 15 parallel runs cap at max(researcher) ≈ 10 min Phase 1. Total wall-clock ≈ 75 min nominal. Acceptable.
- **R5: Score subjectivity.** Mitigation: rubric specifies "first-class adapter" for integration cells, "named primitive" for governance cells. Translator (Phase 2) follows same rubric.

## Acceptance criteria

- `docs/research/2026-06-08-platform-positioning/briefs/` contains ≥15 briefs (one per non-May28 competitor) with all 16 scores filled.
- `strategy.md` contains all 11 sections, exec summary ≤500 words, matrix renders as valid Markdown table.
- 20 FEAT files written, valid frontmatter, IDs FEAT-101..120, ready for `/loop:triage`.
- Cross-references: each FEAT links to its strategy.md anchor; each strategy.md§Top-10 row links to its FEAT.
- Final synthesis written to `.claude/artifacts/crew/runs/<timestamp>-final-synthesis-platform-positioning.md` per workflow.md.

## Decisions baked in (no longer up for debate)

- DEC-A: 16 columns from user prompt, not 10 axes from May 28.
- DEC-B: 15-way parallel dispatch, not grouped fan-out.
- DEC-C: Translate May 28 scores rather than re-audit (10-day-old, low drift).
- DEC-D: Single strategy doc + FEAT auto-gen (option B from intake).
- DEC-E: FEAT-101 start (FEAT-080..100 occupied by May 28 auto-gen).
- DEC-F: No moat analysis per competitor; aggregated only.

## Out of scope (explicit)

- ROI / pricing modeling.
- Hiring / team-shape recommendations.
- Sales positioning / GTM tactics.
- Re-litigating May 28 picks (FEAT-080..100 already in pending; treat as baseline).
- Building any FEAT inside this run.
