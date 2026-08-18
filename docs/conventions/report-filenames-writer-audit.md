# Report Filenames -- Writer Audit

Exhaustive survey of every writer module under `src/scripts/lib/**` that
templates an artifact filename. Produced for SLICE-96 / FEAT-187 (SLICE-B
flip work). Classification follows the schema in `report-filenames.md`.

Last updated: 2026-06-11

---

## Classification legend

| Class | Meaning |
|-------|---------|
| **routes-through-helper** | Already calls `buildArtifactSlug` (or `buildArtifactTitle`) -- slug segments are correct; only the `kind` segment remains kebab. Flip = swap kind token to camelCase. |
| **easy-flip** | Templates manually but all segments are already tight (no intra-token hyphens). Flip = wrap in `buildArtifactFilename`. |
| **needs-mapping** | Templates manually with a multi-token kebab kind (`cost-report-slice`, `agent-report`, etc.). Flip = add kind to `KIND_REGISTRY` + swap to `buildArtifactFilename`. |
| **non-standard** | Legacy pattern that does not follow the `{ts}-{kind}-{slug}` structure at all (`SLICE-*.json`, `{featureId}-pm-review.md`, `{date}.md`, etc.). Flip requires a schema decision. |

---

## routes-through-helper

### `src/scripts/lib/grade-writer.mts` -- line 60

Pattern: `${utcTimestamp()}-${slug}-grade.md`

Uses `buildArtifactSlug` for the slug (line 59). Kind is `grade` -- single
token, already clean. Needs only `buildArtifactFilename` wrapper to enforce
registry validation.
**Effort: S**

### `src/scripts/lib/slice-linker/crew-bridge.mts` -- line 396

Pattern: `${slug}-final-synthesis.md`

Uses `buildArtifactSlug` (line 392). Kind is `final-synthesis` (kebab, needs
mapping to `finalSynthesis`). No leading timestamp.
**Effort: S**

### `src/scripts/lib/slice-linker/crew-bridge.mts` -- line 480

Pattern: `${slug}-complete.md`

Uses `buildArtifactSlug` (line 477). Non-standard kind `complete` -- no
timestamp. Closest new kind: `handoff`. Decision needed on kind alignment.
**Effort: M**

### `src/scripts/lib/slice-linker/agent-report-writer.mts` -- line 465

Pattern: `${ts}-agent-report-${slug}.md`

Uses `buildArtifactSlug` (line 489). Kind is `agent-report` (kebab, needs
mapping to `agentReport`). Kind appears as infix not prefix; flip requires
reordering to ts-kind-slug.
**Effort: M**

---

## easy-flip

### `src/scripts/lib/slice-plan.mts` -- line 338

Pattern: `${utcTimestamp()}-plan-${sliceId}.md`

Kind is `plan` (single token, already clean). Slug uses raw `sliceId` (not
via `buildArtifactSlug`), so `featureId` / `phase` are dropped. Flip = use
`buildArtifactFilename` with `kind: "plan"`.
**Effort: S**

---

## needs-mapping

### `src/scripts/lib/auto-walker.mts` -- line 280

Pattern: `${timestamp}-auto-run.md`

Kind is `auto-run` (kebab, needs mapping to `autoRun`). Timestamp format uses
ISO-8601 with colons replaced by dashes, not the compact form. Flip requires
normalising the timestamp AND switching to `autoRun` kind. No feat/slice
segments (auto-run is not slice-scoped); needs a convention decision for the
slug portion.
**Effort: M**

### `src/scripts/lib/grade-telemetry.mts` -- line 63

Pattern: `phase${slug}-gate.md`

Produces `phaseN-gate.md` -- no timestamp, kind is `gate`. Not in kind
registry. Classified needs-mapping because the multi-token suffix is a reader
target.
**Effort: M**

---

## non-standard

### `src/scripts/lib/fanout-marker.mts` -- line 31

Pattern: `${id}.json`

Produces `SLICE-95.json` (bare slice id with dash, no kind, no timestamp).
Must move to `{ts}-fanoutMarker-{slug}.json` per new convention.
**Effort: L** (requires reader regex update in `ceremonies.mts` + tests)

### `src/scripts/lib/shape-marker.mts` -- line 41

Pattern: `${id}.json`

Same structure as fanout-marker. Must move to `{ts}-shapeMarker-{slug}.json`.
**Effort: L** (same reader update scope as fanout-marker)

### `src/scripts/lib/pm-artifact-writer.mts` -- line 122

Pattern: `${featureId}-pm-review.md`

Produces `FEAT-187-pm-review.md` -- no timestamp, no slice segment, kind
`pm-review` (kebab). New form: `{ts}-pmReview-{featId}.md` (slice-less).
`buildArtifactFilename` currently requires `sliceId`; needs relaxation or a
feature-only variant.
**Effort: M**

### `src/scripts/lib/retrospective.mts` -- line 293

Pattern: `${report.range.until}.md`

Produces `2026-06-11.md` (ISO date, no kind, no feat/slice). New form:
`{ts}-retro.md` or `{ts}-retro-{dateToken}.md`. Date token `20260611` is a
tight segment already.
**Effort: M**

### `src/scripts/lib/doctor.mts` -- line 155

Pattern: `${stamp}-report.md`

Produces `2026-06-11T16-23-21.649Z-report.md` -- ISO timestamp with hyphens
replacing colons, kind `report`. Not in kind registry (closest: no match).
Out of migration scope unless a `doctorReport` kind is added.
**Effort: L**

### `src/scripts/lib/doctor.mts` -- lines 199, 216

Pattern: `${authEntry.id}-${authEntry.state}.md` / `${strayEntry.id}-${strayEntry.state}.md`

Internal conflict-log scratch files, not public artifacts. No migration needed.
**Effort: N/A**

### `src/scripts/lib/contracts-artifact.mts` -- line 12

Pattern: `${featureId}-contracts.md`

Produces `FEAT-187-contracts.md` -- no timestamp, no slice, kind `contracts`
not in registry. Legacy per-feature contracts artifact. Out of scope for
SLICE-B.
**Effort: L**

### `src/scripts/lib/trajectory-writer.mts` -- line 8

Pattern: `${sliceId}-trajectory.jsonl`

Produces `SLICE-96-trajectory.jsonl` -- no timestamp. Kind `trajectory`
IS in registry. However the pattern `sliceId-kind` is inverted vs the spec
`ts-kind-sliceId`. Reader regex in `slice-events.mts` also uses this pattern.
**Effort: M** (dual-accept reader update + writer flip needed together)

### `src/scripts/lib/slice-events.mts` -- line 72

Pattern: `${sliceId}-events.jsonl`

Produces `SLICE-96-events.jsonl`. Kind `events` is not in the registry.
Sibling of trajectory; same migration scope.
**Effort: M**

### `src/scripts/lib/phase-gate.mts` -- line 96

Pattern: `phase${...}-gate.md`

Produces `phaseN-gate.md` -- no timestamp, kind `gate` not in registry.
Phase-gate artifacts are written by the crew CLI side in practice; this path
is the loop-owned fallback. Decision: add `phaseGate` kind or treat as
non-standard legacy.
**Effort: M**

### `src/scripts/lib/phase-gate.mts` -- line 324

Pattern: `${stamp}-${stub}.md` where stub is `ready-to-deploy-${versionSlug}`

Produces `20260611T162321Z-ready-to-deploy-0-39-0.md` -- multi-token kind
`ready-to-deploy`. Not in registry. Classify as needs-mapping candidate once
a `readyToDeploy` kind is decided.
**Effort: M**

### `src/scripts/lib/ceremonies.mts` -- line 122

Pattern: `feature-end-${result.id}-${stamp}.json`

Produces `feature-end-FEAT-NNN-{stamp}.json` under
`.claude/artifacts/crew/ceremonies/`. Multi-token kebab kind `feature-end`,
embedded `FEAT-NNN` with hyphen splits into junk tags, no leading timestamp
(stamp comes after kind+id). Decision: add `featureEnd` kind to registry +
restructure to `${stamp}-featureEnd-${tight(featureId)}.json`.
**Effort: M**

---

## Summary table

| File | Line | Class | Kind (current) | Kind (new) | Effort |
|------|------|-------|---------------|-----------|--------|
| `grade-writer.mts` | 60 | routes-through-helper | `grade` | `grade` | S |
| `slice-linker/crew-bridge.mts` | 396 | routes-through-helper | `final-synthesis` | `finalSynthesis` | S |
| `slice-linker/crew-bridge.mts` | 480 | routes-through-helper | `complete` | `handoff`? | M |
| `slice-linker/agent-report-writer.mts` | 465 | routes-through-helper | `agent-report` | `agentReport` | M |
| `slice-plan.mts` | 338 | easy-flip | `plan` | `plan` | S |
| `auto-walker.mts` | 280 | needs-mapping | `auto-run` | `autoRun` | M |
| `grade-telemetry.mts` | 63 | needs-mapping | `gate` | (decision needed) | M |
| `fanout-marker.mts` | 31 | non-standard | bare `SLICE-NN` | `fanoutMarker` | L |
| `shape-marker.mts` | 41 | non-standard | bare `SLICE-NN` | `shapeMarker` | L |
| `pm-artifact-writer.mts` | 122 | non-standard | `FEAT-NN-pm-review` | `pmReview` | M |
| `retrospective.mts` | 293 | non-standard | `{date}` | `retro` | M |
| `doctor.mts` | 155 | non-standard | `{ts}-report` | out of scope | L |
| `contracts-artifact.mts` | 12 | non-standard | `FEAT-NN-contracts` | out of scope | L |
| `trajectory-writer.mts` | 8 | non-standard | `{sliceId}-trajectory` | `trajectory` | M |
| `slice-events.mts` | 72 | non-standard | `{sliceId}-events` | (new kind needed) | M |
| `phase-gate.mts` | 96 | non-standard | `phaseN-gate` | (new kind needed) | M |
| `phase-gate.mts` | 324 | needs-mapping | `ready-to-deploy-*` | `readyToDeploy`? | M |
| `ceremonies.mts` | 122 | non-standard | `feature-end-{featId}-{stamp}` | `featureEnd` | M |

---

## SLICE-B recommendations (easy wins first)

1. **S-effort flips** (3 writers): `grade-writer`, `slice-linker/crew-bridge:396`, `slice-plan` -- wrap in `buildArtifactFilename`, register kinds if needed.
2. **M-effort flips** (agent-report, auto-walker, pm-artifact-writer, retrospective, trajectory): require kind registration + mild reader regex updates.
3. **L-effort flips** (fanout-marker, shape-marker, doctor, contracts): require reader regex dual-accept + downstream consumer updates. Batch into SLICE-C.
