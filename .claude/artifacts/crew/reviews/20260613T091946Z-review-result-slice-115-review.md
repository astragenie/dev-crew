---
findings: "🟡:2,❓:0,🔴:0"
status: completed
---
# Review Result: SLICE-115 review — Reviewer B: production-readiness + security

- Created: 2026-06-13T09:22:03.008Z
- Reviewer: inspector
- Decision: approved_with_notes
- Status: completed
- Summary: Implementation is functional and backward-compatible; one MEDIUM YAML-injection vector via unvalidated github_url/title scalar serialization needs a newline guard before this is considered fully hardened.
- Evidence Checked:
  - 1) serializeScalar QUOTE_NEEDED_RE=/[:#[]{}'"'
  - ]/ omits \n — a github_url containing a newline would break frontmatter (frontmatter.mts:37
  - 218). 2) validateFeat never checks github_url type/content (state-schemas.mts:43-62). 3) nodeErr.stderr forwarded verbatim into Error.message (from-issue.mts:67-70). 4) No partial-file-on-error: writeFile is called after validateFeat passes (backlog-writer.mts:130
  - 138). 5) Backward-compat confirmed: runBacklogAdd only runs from-issue block when flags.fromIssue is truthy; existing callers unaffected.
- Files Reviewed:
  - src/scripts/lib/from-issue.mts
  - src/scripts/lib/backlog-writer.mts
  - src/scripts/loop.mts
  - src/scripts/lib/frontmatter.mts
  - src/scripts/lib/state-schemas.mts
  - src/tests/from-issue.test.mts
- Test Adequacy: 13 unit tests in from-issue.test.mts: happy path, null body, args shape, ENOENT, non-zero exit, stderr in error, non-JSON, missing fields, addFeature integration (with/without github fields). All AC-3/AC-4 scenarios covered. No real gh CLI invoked — executor injection pattern is correct. Gap: no test exercises newline in github_url/title through the serialization path.
- Risks: YAML frontmatter injection if gh returns (or is manipulated to return) a url/title with an embedded newline. Practical risk is low against real GitHub API but zero defense-in-depth exists. Verbatim stderr in error messages may leak ANSI codes or unexpected content.
- Required Follow-up: MEDIUM: add \n to QUOTE_NEEDED_RE in frontmatter.mts (one-char fix), or strip newlines from github_url/title before writing frontmatter. LOW: strip ANSI codes from nodeErr.stderr before embedding in Error.message in from-issue.mts:67.

