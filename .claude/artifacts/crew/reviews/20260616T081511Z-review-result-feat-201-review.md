---
findings: "HIGH:1,MEDIUM:2,LOW:1"
status: completed
---
# Review Result: FEAT-201 review

- Created: 2026-06-16T08:20:01.306Z
- Reviewer: inspector
- Decision: rejected
- Status: completed
- Summary: FEAT-201 is rejected on one correctness bug (FEAT_ID_RE rejects valid FEAT-NNNa ids), one documentation accuracy issue (SKILL.md claims halt_reason appears in CLI output but it does not), and one CHANGELOG structural defect (duplicate ### Added heading). All 15 tests pass and backwards compat is intact.
- Evidence Checked:
  - 1. FEAT_ID_RE=/^FEAT-\d+(-[a-z]+)?$/ rejects 'FEAT-119a' (no hyphen before letter) but backlog-parser.mts regex FEATURE_FILE_RE matches 'FEAT-119a' as a valid split-feature id. Confirmed against actual filenames in backlog/done/. The comment on line 19 even cites FEAT-119a as valid
  - contradicting the regex. 2. process.exitCode=2 + return is correct for exit code but stdout still carries JSON payload {ids:[]
  - error:'...'} via main() line 769 console.log(JSON.stringify(result)) — callers parsing stdout on mutex error see misleading {ids:[]}. 3. SKILL.md line 44: 'CLI exits non-zero with halt_reason: invalid_ids' — false; the halt_reason is on the thrown Error object
  - main().catch() prints only error.message to stderr and exits 1 with no JSON halt_reason in stdout. 4. CHANGELOG.md lines 8-12: duplicate ### Added heading inserted within ## Unreleased block instead of prepending bullet to existing ### Added. 5. Malformed-id test only covers 'not-a-feat'; does not cover 'FEAT-119a' which the regex also rejects incorrectly. 6. tsc --noEmit: PASS. All 15 tests: PASS (backlog-list-ids.test.mts x7
  - triage-command-include-triaged.test.mts x2
  - triage-ids-flag.test.mts x6).
- Files Reviewed:
  - src/scripts/lib/backlog-list-ids.mts
  - src/scripts/loop.mts
  - src/tests/triage-ids-flag.test.mts
  - src/tests/backlog-list-ids.test.mts
  - src/tests/triage-command-include-triaged.test.mts
  - skills/triage/SKILL.md
  - commands/triage.md
  - CHANGELOG.md
- Test Adequacy: 15/15 tests pass across 3 test files. New 6-test suite covers flag parsing, mutex guard exit-2, library happy path, missing-id error, malformed-id error, bystander-untouched integration. Regression: existing 7+2 tests pass untouched. Gap: no CLI-level test for invalid_ids throw path; malformed-id test does not cover FEAT-NNNa format (which the regex incorrectly rejects).
- Risks: Operators with split-feature ids (FEAT-119a style) would get 'malformed FEAT id' error and be unable to rescore them despite being valid ids. SKILL.md halt_reason documentation inaccuracy would cause skill-readers to expect structured JSON halt but get plain stderr.
- Required Follow-up: 1. Fix FEAT_ID_RE to /^FEAT-\d+[a-z]?(-[a-z]+)?$/ (or align with backlog-parser.mts FEATURE_FILE_RE pattern) — matches FEAT-119a and FEAT-154-suffix. 2. Add a test case for FEAT-119a format in malformed-id tests (should NOT be malformed). 3. Fix SKILL.md line 44 wording: remove claim that CLI emits halt_reason in stdout; say 'CLI exits non-zero and surfaces the missing-id list in stderr'. 4. Fix CHANGELOG.md duplicate ### Added: merge the new bullet into the existing ### Added under ## Unreleased. 5. Optional/MEDIUM: replace 'process.exitCode=2; return result' with either process.exit(2) or _suppressDefaultOutput:true to prevent stdout JSON leak on mutex error.

