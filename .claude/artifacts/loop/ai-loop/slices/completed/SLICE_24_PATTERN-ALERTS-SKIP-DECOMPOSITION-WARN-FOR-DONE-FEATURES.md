---
id: SLICE-24
status: completed
feature: FEAT-029
phase: null
priority: P1
target_release: null
requires_validation: false
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
github_issue: 62
github_url: "https://github.com/sergeymilashico/loop/issues/62"
---
# SLICE-24: state-gate decomposition alert by feature.state

Implements FEAT-029. See [feature file](../../../backlog/in-progress/FEAT-029.md) for full product context.

## Objective

State-gate the `decomposition` pattern alert in `pattern-alerts.mts` so DONE features emit `severity: "info"` (observability preserved) while active features (`pending`, `triaged`, `in-progress`) keep emitting `severity: "warn"` (gate preserved). Marathon loop unblocks for shipped-historical FEATs without losing the scope-creep early warning on live work.

## In scope

- `src/scripts/lib/pattern-alerts.mts` — modify `detectDecompositionAlerts` (or equivalent) to branch on `feat.state`:
  - `state === "done"` → emit `{ severity: "info", category: "decomposition", message: "<id> shipped with <N> slices — consider capturing the pattern as a SPEC if recurring", suggested_action: "Capture pattern as SPEC retroactively only if recurring." }`
  - All other states → emit existing `warn` shape verbatim
- `src/tests/pattern-alerts.test.mts` — three new / updated test cases:
  1. existing warn case made explicit: feature stays `pending`, ≥3 slices → assert `severity === "warn"`
  2. new: feature moved to `done`, ≥3 slices → assert `severity === "info"`, message contains `"shipped with"`
  3. new: feature moved to `in-progress`, ≥3 slices → assert `severity === "warn"` (active-state guard)

## Out of scope

- Other alert categories (`score-trend`, `spec-flow`, `backlog-flow`, `in-progress-orphan`)
- `stop-conditions.mts` changes — already filters by severity correctly
- `loop.json` config additions
- Retrospective SPEC authoring for FEAT-024 / FEAT-025 / FEAT-026
- Touching done feature files

## Acceptance criteria

- [ ] AC-1: `npm test` passes (full suite + new pattern-alerts cases)
- [ ] AC-2: `npm run lint`, `npm run typecheck`, `npm run format:check` clean
- [ ] AC-3: `node scripts/validate-manifests.mjs` + `node scripts/validate-content-length.mjs` OK
- [ ] AC-4: After `npm run build`, `node scripts/loop.mjs stop-check --repo "$PWD"` returns NO entries in `blockers` with `category: "decomposition"` for FEAT-024 / FEAT-025 / FEAT-026
- [ ] AC-5: Same stop-check still shows `decomposition` entries in `snapshot.totalAlerts` (proves info-severity preserved, not silently dropped)
- [ ] AC-6: New test asserts: done 3-slice FEAT → `severity: "info"`, message contains `"shipped with"`
- [ ] AC-7: New test asserts: active (pending or in-progress) 3-slice FEAT → `severity: "warn"`
- [ ] AC-8: Diff is bounded: only `src/scripts/lib/pattern-alerts.mts` + `src/tests/pattern-alerts.test.mts` modified (plus tsc-emitted `.mjs` mirrors)

## Done When

- All ACs PASS with evidence
- Feature FEAT-029 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- Grade written
- `requires_validation: false` (pure refactor inside a helper; tests cover the contract)

## Reviewer ladder

- **Reviewer A** — Engineering pass: branch logic correctness, test isolation, no regression on warn path, message field present and parseable, no new exports leak from the module.
- **Reviewer B** — Production-readiness pass: any other consumer of `decomposition` category that might filter by `severity === "warn"` and break under the new contract; backwards compat of audit log / brief output; verify the `stop-conditions.mts` consumer correctly ignores the info-severity entries.

## Risks

- **Other consumers**: confirm via Grep that no consumer filters `category === "decomposition" && severity === "warn"` and would silently lose data on the flip
- **Test fixture state**: `pattern-alerts.test.mts` may use a helper that hardcodes `state: "pending"` — done-state tests need `moveFeature(filePath, "done")` or equivalent
- **Build artifact drift**: ensure `npm run build` runs before `stop-check` smoke test so emitted `.mjs` matches

## Open questions

(none — Plan agent answered all design questions; consumer audit covered in Reviewer B brief)
