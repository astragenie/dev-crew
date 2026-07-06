---
id: FEAT-220
status: done
priority: P1
category: architecture
target_release: null
created: 2026-07-06
updated: 2026-07-06
depends_on: []
slices: []
derived_from: null
tags: [architecture, backend, memory, learning-loop]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: null
triage_notes: "Operator-requested from continuous-learning-loop gap analysis (2026-07-06); corrected after architect-review. Enrich the persisted learnings.jsonl write-shape (learnings.mts::logLearning) with failure_class / root_cause / recommended_fix / evidence / status-lifecycle / scope / expires_at. Foundation for FEAT-221 (classifier) and FEAT-222 (eval generator). Cross-consumer contract change -> needs_contract, NOT autonomous_safe. Strictly additive; backward compatible with the 5 legacy rows (verified). NOTE: capture must be flowing again (issue #325 / dev-team FEAT-188) for the new fields to ever be populated — see Blocked by."
---
# FEAT-220: enrich the learnings.jsonl lesson schema

## Origin

Continuous-learning-loop gap analysis (2026-07-06, this session), corrected by
architect-review. The capture pipeline writes learnings, but the entry schema is
too thin to support evidence-backed promotion or automated eval generation.

**Two distinct shapes exist — do not conflate them (this was an error in the
first draft):**

- **Persisted write-shape** — what `learnings.mts::logLearning` actually appends
  to `learnings.jsonl`:
  `{ id:number, timestamp:ISO-string, key, insight, confidence, source,
  sliceId?, tags? }`. `logLearning` (learnings.mts:70-79) **whitelists** fields
  into the record literal — it does NOT spread the input — so new fields must be
  added explicitly to both the param type and the record builder.
- **Decay/ranking shape** — `learnings-decay.mts::LearningEntry`
  (`{ id:string, text, sliceId, createdAt:number, confidence?, utility_score?,
  last_cited_at? }`), a DIFFERENT shape used only by `rankLearnings`.
  `memory-context.mts::toLearningEntry` (≈:103-108) bridges write-shape →
  decay-shape at read time (without it, `decayConfidence` sees
  `createdAt=undefined` and throws).

This FEAT enriches the **write-shape**. It does NOT add capture sites
(issue #325 / dev-team FEAT-188) or new consumers (FEAT-221/222).

## Scope

Add these OPTIONAL fields to the persisted write-shape, all backward compatible
(absent = legacy behavior):

- `failure_class` — enum: `stale_context | bad_tool_use | hallucinated_ref |
  ignored_policy | bad_patch | review_fail | validation_fail |
  subagent_incomplete | other`.
- `root_cause` — string, one-line diagnosed cause.
- `recommended_fix` — string, the "next time do X" directive.
- `evidence` — string[] of pointers (run/trace ids, artifact paths, review-note
  paths). References only — no blobs.
- `status` — lifecycle enum: `candidate | validated | promoted | rejected`
  (default `candidate` on write).
- `scope` — enum: `agent | workflow | repo | global` (default `repo`).
- `expires_at` — optional ISO timestamp; feeds `learnings-decay`.

Deliverables:

1. Extend the `logLearning` param type AND its whitelisting record builder
   (`learnings.mts`) with the 7 optional fields; omitted fields serialize as
   absent (not `null`).
2. Extend `memory-context.mts::toLearningEntry` so the new fields survive the
   write-shape → decay-shape bridge (required for deliverable 3 to see them).
3. `learnings-ranker` MAY use `status` (rank `validated`/`promoted` above
   `candidate`, drop `rejected`) and `expires_at` (hard-expire) — additive,
   gated so absent fields preserve today's ranking exactly.
4. A net-new validator (`validate-learnings-schema.mts`; none exists today) that
   rejects malformed enum values but tolerates absent optionals.
5. The 5 legacy rows remain readable unchanged (no rewrite).

This FEAT lands the FIELDS + reader/ranker gating only. It does NOT ship a
promotion-transition setter (candidate→validated→promoted) — that lifecycle is
owned by FEAT-222's regression gate. `scope: global` records are stored but
auto-applied nowhere yet (escalation tiers are a later FEAT).

## Acceptance criteria

- AC-1: GIVEN a legacy learnings.jsonl row (old 8 fields only), WHEN read by
  `readAllEntries`, THEN it parses unchanged; and WHEN surfaced through
  `memory-context` → `toLearningEntry` → `rankLearnings`, THEN its rank position
  is byte-for-byte identical to before this change (golden test on the real
  memory-context call graph — NOT a fictional `readAllEntries`→`rankLearnings`
  pairing, which does not exist in the codebase).
- AC-2: GIVEN a `logLearning` call supplying all 7 new fields, WHEN it writes,
  THEN the appended JSONL line round-trips every field and omitted optionals are
  absent (not `null`).
- AC-3: GIVEN an entry with `status: rejected`, WHEN `rankLearnings` runs (via
  the memory-context path), THEN it is excluded; GIVEN `status: validated`, THEN
  it ranks above an otherwise-equal `candidate`.
- AC-4: GIVEN an entry with a past `expires_at`, WHEN ranked at a `nowMs` after
  it, THEN it is dropped.
- AC-5: GIVEN a write with an invalid `failure_class` enum value, WHEN the schema
  validator runs, THEN it fails with a clear message; absent optionals never fail.
- AC-6: Full suite green; typecheck (`tsconfig.json` + `tsconfig.test.json`) +
  biome lint + format clean; snapshot-freshness gate passes.

## Blocked by (external)

- **Capture must be flowing** for the new fields to ever be populated in
  production. `learnings.jsonl` is stale (5 rows, ~a month old). Repair tracked
  in runner-plugin **issue #325** (in flight) and dev-team **FEAT-188**
  (in-progress, cross-repo — NOT runner's own done FEAT-188). This FEAT can be
  built + tested against fixtures without capture, but delivers no live value
  until capture lands.

## Risks / open questions

- `learnings.jsonl` is read by `learnings-ranker`, `memory-context`,
  `lessons-feed`, mirrored to astramem via `memory-sink`, and lessons feed crew
  GEPA. Schema change is strictly additive; no consumer does exhaustive-key
  validation (verified — `readAllEntries` only requires truthy `key`+`insight`).
- Default `status: candidate` means nothing is auto-trusted; promotion is
  FEAT-222's job. Ship field + reader only here.

## Refs

- `src/scripts/lib/learnings.mts` (`logLearning` write-shape + `readAllEntries`).
- `src/scripts/lib/learnings-decay.mts` (`LearningEntry` decay-shape — DIFFERENT).
- `src/scripts/lib/memory-context.mts` (`toLearningEntry` bridge; ranker consumer).
- `src/scripts/lib/learnings-ranker.mts` (`rankLearnings`, token budget).
- Architect-review: this session (2026-07-06).
