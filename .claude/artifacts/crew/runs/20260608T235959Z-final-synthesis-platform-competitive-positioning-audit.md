# Final Synthesis: Platform Competitive Positioning Audit (2026-06-08)

- **Created:** 2026-06-08T23:59:59Z
- **Owner:** lead-session
- **Outcome:** completed
- **Spec:** docs/superpowers/specs/2026-06-08-platform-competitive-positioning-design.md
- **Output dir:** docs/research/2026-06-08-platform-positioning/

## Summary

Audited 17 competitors (6 AI coding + 6 agent frameworks + 5 workflow platforms) on 16 product/business axes for Crew + Loop plugin positioning. Dispatched 13 parallel `loop:researcher` subagents (all completed; all delivered SOP-compliant briefs — 12 via inline-fallback, 1 via direct write). Translated 4 May-28 audit briefs (Aider, CrewAI, Cursor, LangGraph) to 16-axis rubric. Hand-aggregated 18×16 matrix (17 competitors + Crew+Loop self-baseline).

**Headline findings:**
- Crew+Loop scores 39/48 (1st in audit) due to dominance on methodology axes (Architecture Governance, Standards Enforcement, Learning From Past Runs, Cost Tracking, Loop Execution).
- Crew+Loop scores **1 on Enterprise Readiness** — the largest commercial gap. 10/17 competitors score 3.
- Crew+Loop scores **2 on Workflow Visibility** vs 9 competitors at 3 (Cline, Windsurf, OpenHands, Kestra, n8n, Airflow, Temporal, Cursor, Mastra).
- Crew+Loop scores **1 on Linear Integration** vs 2 at 3 (Codex, OpenHands).

**Industry-wide blue oceans where ≥12 competitors score ≤1:** Architecture Governance (16/17), Learning From Past Runs (13/17), Standards Enforcement (13/17), per-run Cost Tracking (11/17), first-class Linear integration (13/17), GH sub-issue support (17/17), preset-driven activation (17/17), halt-badge cross-plugin contract (17/17).

## Deliverables

- `docs/superpowers/specs/2026-06-08-platform-competitive-positioning-design.md` — spec.
- `docs/research/2026-06-08-platform-positioning/strategy.md` — 11-section strategy doc (exec summary + matrix + top-20 gaps + top-20 weaknesses + top-10 "claimed-but-undelivered" + segment opportunities + ranked opportunities + Top 10 Crew + Top 10 Loop + moat analysis + 90/180/365-day priorities + appendices).
- `docs/research/2026-06-08-platform-positioning/briefs/` — 13 competitor briefs + 1 translation worksheet.
- `.claude/artifacts/loop/backlog/pending/FEAT-103..120.md` + `triaged/FEAT-101..102.md` — 20 new FEATs. FEAT-101 and FEAT-102 auto-promoted to triaged (P2). Ready for `/loop:triage` or manual review.

## Changed Files / Evidence

- Specs: 1 file written
- Strategy doc: 1 file written
- Briefs: 13 fresh + 1 translation worksheet = 14 files written
- FEAT files: 20 files written
- **Total:** 36 artifacts.

## Risks observed during run

- **R1 (mitigated):** All 13 researchers hit the SOP fallback (read-only tool surface; no Write tool exposed). Inline-output delivery worked as designed per `docs/sop/specialist-pause-handling.md`. One researcher (n8n) successfully wrote directly — confirms researcher Write surface is intermittent / context-dependent.
- **R2 (mitigated):** FEAT ID collision avoided — pre-scanned pending/ before write; started at FEAT-101 with FEAT-080..100 already occupied (May 28 audit's auto-gen).
- **R3 (observed):** FEAT-101/102 auto-promoted from pending to triaged by a hook (likely priority-based). Did not break the run; flagged for awareness.
- **R4 (open):** Researcher confidence varies — `medium` to `high`; cells flagged `?` in briefs warrant follow-up before publishing strategy externally. See per-brief "Open questions / low-confidence cells" sections.

## Run Steps

1. Spec written + self-reviewed (skill: superpowers:brainstorming compliance).
2. 13 parallel researchers dispatched (~5-10 min wall-clock each, all returned within ~7 min).
3. May-28 briefs translated to 16-axis rubric (manual, ~15 min).
4. Matrix aggregated (manual, ~10 min).
5. Strategy doc written (~30 min, 11 sections).
6. 20 FEAT files generated (~10 min, batched 2 messages).

## Next Step

User to:
- Review strategy doc (`docs/research/2026-06-08-platform-positioning/strategy.md`).
- Triage new FEATs via `/loop:triage` (FEAT-103..120 pending; FEAT-101/102 already triaged).
- Decide on 90-day priorities — recommend starting with FEAT-104 (Trust-Center page, 2 days) + FEAT-105 + FEAT-114 + FEAT-115 (marketing pillars, 1 slice each).

## Confidence

**Medium-high.** Primary-source coverage strong for 14/17 competitors. AutoGen flagged in maintenance mode (Microsoft Agent Framework is the migration target — not audited; worth a separate brief). 5 cells across all briefs marked `?` for low-confidence. Crew+Loop self-scoring biased upward by definition — treat axes ≥3 with mild skepticism.
