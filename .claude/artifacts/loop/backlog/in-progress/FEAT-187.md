---
id: FEAT-187
status: in-progress
priority: P2
category: tech-debt
target_release: null
created: 2026-06-11
updated: 2026-06-11
depends_on: []
autonomous_safe: false
pm_customer_impact: 0.25
pm_effort_estimate: 0.85
pm_strategic_alignment: 0.35
pm_technical_risk: 0.85
pm_dependency_depth: 0.5
composite_score: 0.2625
triage_notes: "Tech-debt enabler for an undelivered memory-engine consumer. Cross-plugin (hero-crew owns crew/**) + destructive on-disk rename + 15 writers + 4 reader regexes → technical_risk band 0.9-1.0 per rubric (public/cross-plugin contract change, hard-to-reverse effects). Effort analog: SLICE-82 (cross-plugin multidim) ran 28/25min; this is similar-or-larger blast radius → effort 0.85. No demand signal in grades — customer_impact capped at 0.25. autonomous_safe:false confirmed (cross-plugin coordination + destructive rename + architectural review needed before implementation per FEAT self-declaration). Observability dim (0.74 weak) noted but this FEAT is naming-discoverability not telemetry — does not trigger AC weak-dim requirement."
started_at: 2026-06-11
slices: [SLICE-96]
github_issue: 212
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/212"
slices_complete: [SLICE-96]
completed_at: 2026-06-11
---
# FEAT-187: Unified report filename pattern for memory-engine tag parsing

## Problem

Report filenames across `.claude/artifacts/crew/**` and `.claude/artifacts/loop/**` use ~6 distinct conventions. Hyphens inside tokens (`SLICE-93`, `FEAT-060`, `2026-06-04`, `cost-report-slice`, `agent-report`, `review-result`, `final-synthesis`) prevent clean tag extraction via `filename.split('-')`. Trailing title slugs (`expose-checkpointdue-sliceclosessincecheckpo`, `fanout-wiring-validation`) inject N junk tokens per file. Goal: ingest reports into a memory engine where every `-`-separated segment is one semantic tag.

## Drift inventory

| Dir | Current sample | Issue |
|---|---|---|
| `crew/agents/` | `20260611T115758Z-agent-report-feat185-slice93.md` | kind multi-token |
| `crew/cost/` | `20260611T115759Z-cost-report-slice-feat185-slice93.md` | kind + variant multi-token |
| `crew/cost-insights/` | `20260611T115759Z-cost-advise-feat185-slice93.md` | kind multi-token |
| `crew/reviews/` | `20260611T123759Z-review-result-feat181-slice95-{titleSlug}.md` | kind multi-token + trailing title slug |
| `crew/validations/` | `20260611T114845Z-validation-result-feat185-slice93-{titleSlug}.md` | kind multi-token + trailing title slug |
| `loop/grades/` | `20260611T115807Z-feat185-slice93-grade.md` | kind in trailing position |
| `crew/handoffs/` | `phase3-feat072-slice73-complete.md` AND `20260611T123331Z-handoff-slice-95-{title}.md` | mixed legacy/modern, SLICE-95 splits |
| `crew/runs/` | `phase3-feat072-slice73-final-synthesis.md` | legacy phase prefix + kind multi-token |
| `crew/designs/` | `FEAT-060-contracts.md` | feat id with hyphen |
| `loop/pm-reviews/` | `FEAT-169.md` AND `20260608T163800Z-pm-review-feat-079.md` | inconsistent shape |
| `loop/retrospectives/` | `2026-06-04.md` | date hyphens split |
| `loop/plans/` | `20260611T122540Z-plan-SLICE-95.md` AND `FEAT-083-preflight.md` | SLICE id splits |
| `loop/fanout-markers/`, `loop/shape-markers/` | `SLICE-93.json` | SLICE id splits |
| `loop/auto-runs/` | `2026-06-10T23-56-00-353Z-auto-run.md` | timestamp uses hyphens |
| `loop/trajectories/` | `SLICE-94-trajectory.jsonl` | SLICE id splits |

## Target pattern

```
{compactTs}-{kind}-{featId}-{sliceId}[-{titleCamel}].{ext}
```

Rules:
- `compactTs` — `YYYYMMDDTHHMMSSZ` (UTC, no inner hyphens). Already in use.
- `kind` — camelCase single token. Mapping table below.
- `featId` — `feat185` lowercase, no hyphen. Already in use in modern reports.
- `sliceId` — `slice93` lowercase, no hyphen. Filename form only. Frontmatter keeps canonical `SLICE-93`.
- `titleCamel` — OPTIONAL, single camelCase token, max 24 chars. Default: omit. Title belongs in frontmatter `title:`, not filename.
- Files without slice/feat scope (retros, perf baseline): `{compactTs}-{kind}.{ext}` or `{compactDate}-{kind}.{ext}`.

### Kind mapping

| Old token chain | New camelCase kind |
|---|---|
| `agent-report` | `agentReport` |
| `cost-report-slice` | `costReportSlice` |
| `cost-report-aggregate` | `costReportAggregate` |
| `cost-advise` | `costAdvise` |
| `review-result` | `reviewResult` |
| `validation-result` | `validationResult` |
| `final-synthesis` | `finalSynthesis` |
| `pm-review` | `pmReview` |
| `auto-run` | `autoRun` |
| `handoff` | `handoff` |
| `grade` | `grade` |
| `plan` | `plan` |
| `retro` | `retro` |
| `trajectory` | `trajectory` |
| `fanout-marker` | `fanoutMarker` |
| `shape-marker` | `shapeMarker` |
| `design` | `design` |

### Example transforms

- `20260611T115759Z-cost-report-slice-feat185-slice93.md` → `20260611T115759Z-costReportSlice-feat185-slice93.md`
- `20260611T115807Z-feat185-slice93-grade.md` → `20260611T115807Z-grade-feat185-slice93.md`
- `SLICE-93.json` → `slice93.json`
- `FEAT-060-contracts.md` → `feat060-design.md`
- `2026-06-04.md` → `20260604-retro.md`
- `phase3-feat072-slice73-final-synthesis.md` → `{synthesizedTs}-finalSynthesis-feat072-slice73.md`

## Acceptance hints

- New filename spec doc lands under `docs/conventions/report-filenames.md` (single source of truth — kinds table + grammar).
- All writer modules under `src/scripts/lib/*` honor the spec via a shared `buildArtifactFilename({ ts, kind, featId, sliceId, title? })` helper. No writer string-templates the filename directly.
- Reader regexes updated:
  - `cost-alert-loader.mts:12` — `/-costReportAggregate-/` (also accept legacy `/-cost-report-aggregate-/` during grace window).
  - `slice-cost-ceiling.mts:40` — same dual-accept.
  - Marker/grade/decision/snapshot readers — audit for any filename-shape regex assumption.
- One-shot migration script `src/scripts/migrate-artifact-filenames.mts` renames existing artifacts in place, idempotent. Skips files already matching new shape. Logs every rename to stderr.
- Tag-parser smoke test: pick 20 representative renamed files, assert `path.basename(f).split('-')` produces only tokens that match `/^[a-z][a-zA-Z0-9]*$|^[0-9]+T[0-9]+Z?$|^[0-9]{8}$/`.
- Tests for `buildArtifactFilename` cover every kind in the mapping table.
- Existing test fixtures updated to new pattern.
- CHANGELOG entry + ADR (cross-plugin: hero-crew also writes under `crew/` — coordination needed).

## Why P2

Tech-debt + enabler. Memory engine itself is the user-facing capability — this FEAT only prepares the surface. Big blast radius (~15 writers + readers + on-disk migration) but no behavior change. Splitting into a 3-slice ladder keeps each slice bounded:
1. Spec doc + `buildArtifactFilename` helper + tests.
2. Flip all writers + reader regex dual-accept + golden fixture churn.
3. Migration script + run against existing artifacts + drop legacy regex acceptance.

## Why `autonomous_safe: false`

- Cross-plugin coordination — hero-crew writes under `crew/` directories. Renaming under loop's authority alone breaks crew tooling.
- On-disk rename of historical artifacts is destructive (no `git rm` recovery for the index entries downstream tools cache).
- Memory engine ingestion is the actual user goal — FEAT contract should be reviewed against that spec before implementation.

PM may flip after reviewing scope.

## Risks

- Hero-crew agents that produce review/validation artifacts will continue emitting legacy filenames until hero-crew adopts the spec. Dual-accept regex window mitigates but must not become permanent.
- `path.basename(f).split('-')` tag extraction still produces noise from timestamp segment (`20260611T115759Z` is one tag, fine). Memory engine should treat timestamp + kind + featId + sliceId as the canonical 4-tag header.
- `titleCamel` segment, if present, is a single token but encodes prose — may want to drop entirely once frontmatter `title:` is canonical.

## Existing helper (PM finding 2026-06-11)

`src/scripts/lib/artifact-naming.mts` already exports `buildArtifactSlug({featureId,phase,sliceId})` producing tight segments joined by `-` (e.g. `phase3-feat021-slice36`). SLICE-A scope shrinks accordingly:

- Extend `buildArtifactSlug` to accept `kind` (camelCase) + `ts` and add a `buildArtifactFilename({ts,kind,featureId,phase,sliceId,title?,ext})` wrapper. Helper already implements the tight-segment rule via `tight()` — only the `kind` slot is missing.
- Audit writers — most currently template the filename manually instead of routing through the helper. Migration = route through helper, not invent a new one.
- Re-confirm scope: helper exists → SLICE-A is ~5 file changes (helper + spec doc + ~2 writers + tests) rather than 15. Effort may revise downward after writer audit.

## Refs

- This conversation, 2026-06-11 — initial audit + pattern proposal + PM finding.
- `src/scripts/lib/artifact-naming.mts` — existing slug helper (`buildArtifactSlug`, `buildArtifactTitle`, `tight()`). Already produces tight segments.
- `src/scripts/lib/cost-alert-loader.mts` — sample reader regex that needs updating.
- `src/tests/cost-regression.test.mts` — fixture already partially migrated (bare slice `slice-01` → `slice01` at commit pending).
- `.claude/artifacts/loop/pm-reviews/FEAT-187.md` — full PM scoring rationale + pre-mortems.
