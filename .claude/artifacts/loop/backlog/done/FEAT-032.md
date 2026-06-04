---
id: FEAT-032
status: done
priority: P2
category: infra-bug
target_release: null
created: 2026-06-04
updated: 2026-06-04
depends_on: []
slices: [SLICE-34]
derived_from: null
triage_notes: no fields needed inference
started_at: 2026-06-04
slices_complete: [SLICE-34]
completed_at: 2026-06-04
---
# FEAT-032: Investigate crew:builder mid-cleanup stop pattern (research spike)

## Symptom

`crew:builder` agent stops mid-message during final-synthesis or cleanup
phase. Observed 4 times in a single session across SLICE-23, SLICE-25,
SLICE-26, SLICE-27 (all FEAT-028 / FEAT-030 work).

## Evidence

Final messages from each affected dispatch (tail of last assistant turn):

- SLICE-23: "Review artifact written. Here is the review summary for the builder: ---" (truncated mid-synthesis)
- SLICE-25: "The audit log has the `skipped: true` entry with `skipReason: "opt-out"`. Now delete the test-pollution FEAT file:" (truncated before delete)
- SLICE-26: "All validators pass. Now let's do the live smoke test with `--no-architect`:" (truncated before smoke)
- SLICE-27: "Still 16. The issue is the pre-existing function body already had this. Let me check..." (truncated mid-debug)

Pattern: builder hits a turn / token / context ceiling during the post-implementation cleanup phase. State on disk is consistent in 3 of 4 cases (gates green, files written); in SLICE-27 the builder stopped before completing a complexity-reduction refactor and parent had to finish the work manually.

## Root cause hypothesis

Three candidates:

1. **Turn budget exhaustion** — crew:builder may hit a per-dispatch turn cap defined in dispatch limits or model config. Cleanup turns push past the budget. Verifiable via crew agent dispatch limit configuration.
2. **Context window pressure** — long slice briefs + research + impl + tests + review fill the context; final synthesis happens at the edge of the window and gets truncated. Verifiable by comparing input token counts in cost reports across affected slices.
3. **Tool-call budget** — crew:builder may limit total tool calls per dispatch; final cleanup tools (Bash rm, git status read) tip it over. Verifiable by counting tool calls in agent-report artifacts.

## Investigation plan

Single research spike slice. No production code change expected. Output: a one-page findings document under `docs/research/2026-06-04-builder-mid-cleanup-stop.md` with:

- Pattern confirmation: which dispatch metric (turns / tokens / tools) correlates with the truncation event
- Root cause: which of the three candidates is correct (or new hypothesis)
- Mitigation: config knob OR slice-brief discipline OR parent-side recovery pattern
- Test plan: how to verify the fix works on a future slice

## Goals

- Confirm or reject each of the three root-cause hypotheses with evidence from agent-report + cost-report artifacts
- Identify the lowest-cost mitigation (config tweak preferred over code change)
- Document a recovery pattern for the parent agent when this stop occurs mid-cleanup (rules for "is the work actually done; what to finish inline")

## Out of scope

- Modifying crew:builder agent prompt (different plugin; out of scope here)
- Long-term fix in dispatch infrastructure (this slice produces evidence; fix is a separate FEAT if needed)
- Backporting recovery pattern to earlier slices

## Acceptance criteria

- [ ] AC-1: Research artifact at `docs/research/2026-06-04-builder-mid-cleanup-stop.md` exists with the four required sections (pattern / root cause / mitigation / test plan)
- [ ] AC-2: At least one hypothesis is confirmed or rejected with cost-report / agent-report evidence (file paths + line numbers cited)
- [ ] AC-3: Mitigation recommendation is concrete (specific config key OR specific prompt instruction OR specific parent-side recovery rule)
- [ ] AC-4: Test plan describes how to verify the fix on the NEXT live slice (not a unit test — this is a behavior pattern)

## Risks

- **Inconclusive evidence**: cost-report / agent-report data may not capture the truncation event cleanly. Mitigation: extend research to running a controlled dispatch with verbose logging to reproduce.
- **Hypothesis 1 untestable from inside this plugin**: turn-budget may live in crew plugin config (read-only to us). Mitigation: document the finding and file a follow-up against crew if so.

## Notes

- Researcher agent would be a good fit for this spike but autonomous-loop researcher dispatch already auto-fires on backlog-add — this FEAT was created with `--no-research` to skip that since the research targets crew internals, not loop's own backlog history.
- The fix (if code) likely lives in crew or in this plugin's dispatch wiring — would land as a separate FEAT after this spike's findings.
