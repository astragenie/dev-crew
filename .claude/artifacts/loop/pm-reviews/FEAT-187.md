# PM Review — FEAT-187

- **Path:** pm
- **Composite priority:** P2 (composite_score 0.2625)
- **autonomous_safe:** false
- **Demand evidence:** none — FEAT body cites only the 2026-06-11 conversation; no lesson/surprise/followup in last 5 grades (SLICE-91..95) mentions filename parsing pain or memory-engine ingestion; no existing FEAT in triaged/done references memory engine or tag extraction; current regex readers in `src/scripts/lib/cost-alert-loader.mts:11-12` and `slice-cost-ceiling.mts:40` work without complaint.

## Scores

| Dimension | Score |
|-----------|-------|
| customer_impact | 0.25 |
| effort_estimate | 0.85 |
| strategic_alignment | 0.35 |
| technical_risk | 0.85 |
| dependency_depth | 0.50 |

## Reasoning

Technical-risk band 0.9-1.0 (cross-plugin contract + hard-to-reverse rename) per rubric; capped at 0.85 because dual-accept grace window and idempotent migration script provide partial rollback. Effort 0.85 from SLICE-82 cost analog ($128 / 25 min cross-plugin, multidim ladder). Demand evidence absent → customer_impact 0.25. P2 / autonomous_safe:false confirmed.

## Scope notes

Three-slice ladder is sensibly decomposed in FEAT body (spec+helper / writer flip+dual-accept / migration). Smallest deliverable that delivers value = SLICE 1+2 (new pattern adoptable forward, legacy preserved); SLICE 3 (rename history) is the destructive piece and should be deferred until memory-engine consumer actually exists. Cost analog: SLICE-82 aggregate (cross-plugin, multidim ladder) was $128 / 25 min over 6 sessions — this FEAT spans similar cross-plugin scope plus 15 writer modules plus an on-disk migration → expect $150-$200 total over 3 slices, effort 0.85 confirmed. Observability dim trending 0.74 (weak) noted; this FEAT is naming-discoverability not telemetry, so weak-dim AC-coverage rule does not bind. AC clarity is reasonable for a planning-stage FEAT but lacks concrete test fixtures and a stale-frontmatter-ref audit step — spec-writer pass before SLICE-A would tighten the contract.

**Pre-existing helper overlap.** `src/scripts/lib/artifact-naming.mts` already exports `buildArtifactSlug({featureId,phase,sliceId})` → `phase3-feat021-slice36` and `buildArtifactTitle(...)`. Tight segments already produced. SLICE-A scope shrinks: extend the helper to take `kind` (camelCase) + `ts` and add a `buildArtifactFilename()` wrapper. Most writers currently template the filename manually instead of routing through the helper — audit needed.

## Risks

1. **Pre-mortem 1 — Most likely 2-week failure**: hero-crew adopts the spec late or never, dual-accept regex window becomes permanent, contract drifts. Mitigation: cite hero-crew upstream-request PR id as a precondition for SLICE 3.
2. **Pre-mortem 2 — Rollback after merge requires more than `git revert`**: the migration script renames historical artifacts whose absolute paths may be embedded in older grade frontmatter `evidence:` fields and decision `references:` fields. Rollback needs a reverse-rename pass plus a frontmatter-path-rewrite sweep, not just a code revert.
3. **Pre-mortem 3 — Coverage gap**: no existing test verifies that grade/decision frontmatter `evidence:` paths still resolve after artifact rename. AC must include a post-migration link-check that walks `.claude/artifacts/loop/grades/**` + `.claude/artifacts/loop/decisions/**` frontmatter and asserts every cited path exists.
4. **Cross-plugin contract**: hero-crew owns `crew/agents/`, `crew/cost/`, `crew/cost-insights/`, `crew/reviews/`, `crew/validations/`, `crew/runs/`, `crew/handoffs/` writers. Loop cannot unilaterally rename these without breaking hero-crew tooling.
5. **Destructive on-disk rename** — files referenced by absolute path in retrospective markdown, decision references, and grade evidence will silently 404 unless the migration also rewrites references.
6. **Memory-engine consumer is hypothetical** — no spec exists for what shape tag-extraction needs; building the surface before the consumer risks rework when the consumer arrives.

## Relevant files

- `.claude/artifacts/loop/backlog/triaged/FEAT-187.md` (post-move)
- `src/scripts/lib/cost-alert-loader.mts` (reader regex sample)
- `src/scripts/lib/artifact-naming.mts` (existing helper — overlap with FEAT proposal)
- `.claude/artifacts/crew/cost/20260608T232100Z-cost-report-aggregate-orchestrate-slice-slice-82-multidim-reviewer-preset.md` (effort analog: $128 / 25 min cross-plugin)
- `.claude/artifacts/crew/cost/20260609T041501Z-cost-report-aggregate-orchestrate-slice-slice-83-clause-citation-discipline.md` (smaller cross-plugin analog: $41 / 18 min)
