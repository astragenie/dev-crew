---
id: FEAT-282
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
---
## Description

validate-learnings-schema.mts fails against real learnings.jsonl data and is wired into nothing. Discovered 2026-08-04 while running the full validator sweep before a push. Running 'bun ./src/scripts/validate-learnings-schema.mts --repo .' against this repo's own .claude/artifacts/loop/learnings.jsonl reports 14 errors across 7 lines (6,7,8,9,60,64,65), all of the form 'missing/invalid key' and 'missing/invalid insight'. Root cause is a two-producer schema mismatch, not corrupt data: the validator enforces the shape written by 'loop.mts learnings log' ({id, timestamp, key, insight, confidence, sliceId, status, scope, agentType}), but a second producer writes a completely different record shape -- e.g. line 6 is {kind: failure, ts, agent, severity, tags, summary, source: review_fail}, emitted by the review-failure capture path. Both shapes coexist legitimately in one append-only file; only one has a validator. Verified this is NOT new drift: line 6 is byte-identical 8 commits back, so the file has been failing this validator for a long time. It went unnoticed because validate-learnings-schema.mts is referenced by NOTHING -- it is absent from .github/workflows/ and from src/scripts/pre-push-validate.mts, and it is not among the 18 gates enumerated in CLAUDE.md's CI gates section. An orphan validator that no pipeline runs provides zero protection while appearing to. Fix options, in preference order: (a) teach the validator the union of both legitimate record shapes (discriminate on the presence of 'kind' vs 'key') and then WIRE IT INTO CI so it actually guards, renumbering the CLAUDE.md gate list accordingly -- note generate-metrics-band.mts counts that list programmatically, so the count and ordering are load-bearing; (b) if the failure-record shape is considered obsolete, migrate those rows and keep a single schema; (c) if the validator is genuinely dead, delete it rather than leave a red script in the tree implying coverage that does not exist. Do not simply relax the validator to pass -- that reproduces the tested-but-never-wired class this repo just filed as FEAT-281.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.