---
decision: approved
reviewer: crew:reviewer
slice: SLICE-45
reviewed_commits: [59bae128, 648cc1ae]
supersedes: .claude/artifacts/crew/reviews/20260820T010000Z-review-result-slice-45-legacy-token-hard-fail.md
---

# Review — SLICE-45 (FEAT-017) final: release-engineer reachability fix, supersedes needs_fix

## Summary

This supersedes my prior `needs_fix` review
(`20260820T010000Z-review-result-slice-45-legacy-token-hard-fail.md`),
which live-reproduced a dead-end: `crew:deployer`'s successor message
recommended `devcrew:release-engineer`, but that token was itself missing
from `allowed[]`, so following the guard's own advice hit the same block
again. Follow-up commit `648cc1ae` adds `devcrew:release-engineer` to
`allowed[]` and, notably, adds a **systemic** regression test that parses
`legacySuccessors` directly from the hook source and asserts every
`devcrew:*` token it recommends is itself reachable — closing the whole gap
class, not just this one instance. I re-ran my original dead-end
reproduction (now closed), ran the suite solo (18/18 as expected), and
independently reproduced the mutation check on the new systemic test.
**Decision: approved.**

## 1. Dead-end reproduction re-run — closed

```
$ echo '{"cwd": ".", "tool_name": "Agent", "tool_input":
  {"subagent_type": "crew:deployer", "prompt": "deploy FEAT-017"}}' \
  | node hooks/guard-feat-dispatch.mjs
BLOCKED: ... Legacy token 'crew:deployer' is retired as of devcrew v1.1.0
— use devcrew:release-engineer.
exit=2

$ echo '{"cwd": ".", "tool_name": "Agent", "tool_input":
  {"subagent_type": "devcrew:release-engineer", "prompt": "deploy FEAT-017"}}' \
  | node hooks/guard-feat-dispatch.mjs
exit=0
```

`crew:deployer` still blocks with the same message (unchanged, correct),
and `devcrew:release-engineer` now passes clean — no stderr, exit 0. The
override-guidance list in the block message also now includes
`devcrew:release-engineer`, confirmed in the live output. The exact
dead-end from my prior review no longer exists.

## 2. Suite solo — 18/18 as expected

`bun test src/tests/guard-feat-dispatch-hook.test.mts`: **18 pass, 0 fail**
(17 from the original slice + 1 new systemic reachability test).

## 3. Mutation check on the new systemic test — independently reproduced

Removed `"devcrew:release-engineer"` from `allowed[]` (reverting just the
one-line fix) and reran the suite: **17 pass, 1 fail**, and the failure is
exactly the new test —
`"every devcrew:* successor named in legacySuccessors guidance is itself
allowlisted (no dead-end remediation)"` — with the assertion message
naming `devcrew:release-engineer` specifically as the unreachable token.
Restored; `git diff` on the file came back empty (byte-identical to HEAD);
reran — **18 pass, 0 fail** again.

Read the new test's implementation, not just its pass/fail status: it
regex-parses the `legacySuccessors` object literal straight out of the hook
source file, extracts every `devcrew:[a-z][a-z-]*` token appearing anywhere
in any successor string (not a hardcoded list the author could forget to
update), and live-invokes the hook for each one, asserting exit 0. This
means any *future* `legacySuccessors` entry that names an unreachable
`devcrew:*` token will fail this same test automatically — the fix closes
the gap class the prior review found, not just the one instance.

## 4. Sanity checks

- `bunx tsc --project tsconfig.json --noEmit`: clean.
- `bunx tsc --project tsconfig.test.json --noEmit`: clean.

## Decision rationale

`approved`. The one gap from my prior review — a legacy-token successor
message pointing at a token the same guard would itself block — is fixed
by adding `devcrew:release-engineer` to `allowed[]`, and I independently
re-verified this live in both directions (block message unchanged, the
recommended token now passes). More importantly, the fix ships a systemic
regression test that parses the actual `legacySuccessors` source and checks
reachability for every token it names, rather than a one-off assertion for
this specific case — I proved this genuinely works via an independent
mutation (removing the allowlist entry reproduces exactly the new test
failing, restoring returns to clean green). Combined with my prior review's
already-verified findings (complete legacy-token removal, correct
historical `runner:` claim, all four live-fire cases, three of four
successor agents already provably reachable, the original mutation check on
the flipped tests, and all CI gates green), FEAT-017's AC-1 through AC-4 are
now fully satisfied with no known dead-end remediation paths. No blockers
remain for the v1.1.0 cut.
