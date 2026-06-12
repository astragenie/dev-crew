---
id: FEAT-006
status: pending
priority: P1
category: bugfix
target_release: null
created: 2026-05-24
updated: 2026-05-24
depends_on: []
slices: []
derived_from: null
---
# FEAT-006: Rich artifact sections for all crew CLI write-* commands

crew CLI write-run-brief, write-handoff, write-review-result, write-validation-result all use renderField which defaults to dash when flag not passed. Three gaps remain after the agent-prompt fix (11284d8):

1. write-run-brief template has Mode, Pace, Summary, Scope, Out Of Scope, Planned Files, Next Step — none passed by writeCrewRunBrief in crew-bridge.mjs (only --title, --goal, --owner). Crew CLI needs to accept these or callers need to pass them.

2. No validation artifact emitted during slice lifecycle — dispatch instruction now names crew:verifier but the builder workflow doesnt always dispatch one. Needs enforcement in the build workflow or loop ceremony.

3. ~~write-review-result still shows Evidence Checked / Files Reviewed / Test Adequacy as dash because the crew:inspector agent reads the AGENT prompt (agents/reviewer.md) which now has write-handoff flags but does NOT have write-review-result flags — only the loop reviewer-ladder prompt was fixed.~~ **Resolved** — hero-crew commit `3d025d0` ("fix(agents): full write-handoff + write-review-result flags in all agent prompts") added the full `write-review-result` example to `agents/reviewer.md`. No action needed here.

Root: crew CLI artifact templates have many more sections than callers know about.