---
id: FEAT-033
status: done
priority: P0
category: feature
target_release: null
created: 2026-11-05
updated: 2026-11-06
depends_on: []
slices: [SLICE-46]
derived_from: null
pm_customer_impact: 1
pm_effort_estimate: 0.3
pm_strategic_alignment: 1
pm_technical_risk: 0.4
pm_dependency_depth: 0
pm_composite_priority: P0
pm_autonomous_safe: true
pm_reviewed: 2026-11-05
autonomous_safe: true
triage_notes: "P0, outranking FEAT-026: this is the single highest-severity finding in the whole remediation effort — not a crash under certain conditions but total non-execution of every devcrew hook (gate guard, pre-push gate, telemetry, guard-feat-dispatch) for every consumer today, confirmed by a live two-plugin marker test rather than static analysis. FEAT-026's node_modules fix is moot until this lands, since the file sitting under `.claude-plugin/hooks/` never loads regardless of whether its contents crash. technical_risk 0.4 (band 0.3-0.5: a mechanical, scoped file move with an explicit no-double-fire constraint and an acknowledged CLI-version unknown in its own AC, not a schema/logic change)."
started_at: 2026-11-06
slices_complete: [SLICE-46]
completed_at: 2026-11-06
---
## Description

Audit T0b: plugin hooks never load — move hooks.json to the documented discovery path

Source: live validation .claude/artifacts/crew/validations/20261105T223500Z-validation-plugin-hooks-json-discovery.md (this session); official docs code.claude.com/docs/en/plugins/components ("Save the plugin's hooks in hooks/hooks.json at the plugin root" — `.claude-plugin/hooks/` is never mentioned); assumption-attack review #4. Wave 1 (new lane E, zero overlap with lanes A-D). Depends on: none. Must land BEFORE FEAT-026 and FEAT-031 (both render hooks.json).

Problem: devcrew ships all 38 hook entries in .claude-plugin/hooks/hooks.json and .claude-plugin/plugin.json has no `hooks` key. A two-plugin marker test on claude 2.1.270 proved only hooks/hooks.json is discovered: the `.claude-plugin/hooks/` copy never runs. Consequence: for every consumer on devcrew 1.1.0 NO devcrew hook executes — gate guard, pre-push gate, guard-feat-dispatch, artifact lock, telemetry — regardless of the node_modules crash the audit found. This repo's own .claude/settings.json dogfood hooks masked it locally. runner 0.78.0 has the same dead layout.

Deliverable:
- Move the file to hooks/hooks.json at the plugin root (git mv, content unchanged in this FEAT). Do NOT also add a manifest `hooks` key pointing at the old path (both would load and double-fire).
- Update every hard-coded reference: src/scripts/validate-repo-boundary.mts:101 HOOKS_JSON_REL, its inventory file docs/planning/hooksjson-crew-path-inventory.json (regenerate with --write-inventory), docs/ci-gates.md:66, src/tests/validate-repo-boundary.test.mts, src/tests/wave/touches-files.test.mts, any commands/skills/agents prose citing the old path, docs/memory.md (record the finding under load-bearing contracts), CHANGELOG entry.
- Add a discovery test (not an execution test): src/tests/install/hooks-discovery.test.mts stages the plugin copy and asserts the hooks file is at hooks/hooks.json AND plugin.json has no conflicting `hooks` key; plus a documented manual check in docs/audits/2026-11-05/README.md: `claude -p --plugin-dir <copy>` with a SessionStart marker hook present in the shipped file must write the marker.
- Note in README consumer prerequisites that hooks require `bun` on PATH (they always did; nobody noticed because they never ran).

Acceptance criteria:
- Given the staged plugin copy, when hooks-discovery.test runs, then hooks/hooks.json exists, .claude-plugin/hooks/hooks.json does not, and plugin.json has no `hooks` key.
- Given a fresh consumer repo and `claude -p --plugin-dir <copy> --max-budget-usd 0.5 "Reply with exactly: OK"`, then the devcrew SessionStart hook leaves its trace (events.jsonl row written by the plugin's own log_event path or a marker), recorded in docs/audits/2026-11-05/README.md with the command and output.
- Given the moved file, when `bun src/scripts/validate-repo-boundary.mts` runs, then exit 0 with the regenerated inventory; validate-manifests, validate-agent-refs, validate-content-length green.
- Given the two-plugin marker test from the validation artifact, when re-run on the CI runner's CLI version, then the result is recorded (discovery may differ on CLI >= 2.1.295).

Scope: hooks/hooks.json (moved), .claude-plugin/hooks/ (removed), src/scripts/validate-repo-boundary.mts, docs/planning/hooksjson-crew-path-inventory.json, docs/ci-gates.md, docs/memory.md, src/tests/validate-repo-boundary.test.mts, src/tests/wave/touches-files.test.mts, src/tests/install/hooks-discovery.test.mts, README.md prerequisites line, CHANGELOG.md. No hook logic changes (FEAT-031 owns those).

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given the staged plugin copy, When `hooks-discovery.test` runs, Then `hooks/hooks.json` exists, `.claude-plugin/hooks/hooks.json` does not, and `plugin.json` has no `hooks` key.
- AC-2: Given a fresh consumer repo and `claude -p --plugin-dir <copy> --max-budget-usd 0.5 "Reply with exactly: OK"`, When the devcrew SessionStart hook runs, Then it leaves its trace, recorded in `docs/audits/2026-11-05/README.md` with the command and observed output.
- AC-3: Given the moved file, When `bun src/scripts/validate-repo-boundary.mts` runs, Then it exits `0` with the regenerated inventory, and `validate-manifests`, `validate-agent-refs`, `validate-content-length` are all green.
- AC-4: Given the two-plugin marker test from the validation artifact, When re-run on the CI runner's CLI version, Then the result is recorded, noting discovery may differ on CLI >= 2.1.295.
- AC-5: Given the moved file and no manifest `hooks` key added at the old location, When both the old and new paths are inspected, Then exactly one hooks file exists so the load path can never double-fire.
