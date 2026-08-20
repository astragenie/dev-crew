---
decision: needs_fix
reviewer: crew:reviewer
slice: SLICE-45
reviewed_commits: [59bae128]
---

# Review — SLICE-45 (FEAT-017): hard-fail legacy crew:/loop: dispatch tokens

## Summary

Commit `59bae128` empties `guard-feat-dispatch.mjs`'s legacy `crew:*`/
`loop:*` allowlist (12 entries removed) and adds a `legacySuccessors` map
that names an actionable devcrew replacement for each retired token. The
removal is complete and correctly verified, the historical "no `runner:`
namespace ever existed" claim checks out, live-fire testing confirms the
hard-fail/pass-through behavior exactly as documented, and the mutation
check genuinely proves the flipped tests catch a re-allowlisted regression.
**However, the `crew:deployer` → `devcrew:release-engineer` successor
entry is broken**: `devcrew:release-engineer` is not itself in the
`allowed[]` array, so an operator who follows the guard's own printed
remediation advice gets blocked a second time by the same guard. This is a
defect newly introduced by this slice's own message text (before this
slice, `crew:deployer` silently passed through with no remediation
message at all — there was nothing to be wrong). **Decision: needs_fix**,
scoped narrowly to this one successor entry; everything else in this slice
is solid.

## 1. Removal completeness — verified

`grep -n "crew:\|loop:\|runner:" hooks/guard-feat-dispatch.mjs`: every hit
is inside a comment; the `allowed[]` array itself (lines 69-89) contains
only `devcrew:*` entries plus `"Explore"` — zero legacy tokens remain.
`general-purpose` is deliberately never allowlisted (confirmed via the
module header comment: "it's the exact bypass this hook exists to close").

**Historical `runner:` claim** — verified two ways, not just trusted:
- `git log --oneline --all -S'"runner:' -- hooks/guard-feat-dispatch.mjs`
  returns **zero commits** — no commit in this file's entire history ever
  added or removed a string containing `"runner:`.
- Read the file's original creation commit (`2ce539f5`) directly: its
  initial `allowed[]` array contained only `crew:*` and `loop:*` entries,
  never `runner:*`.

Claim confirmed true on both counts.

## 2. Live-fire — all four synthetic payloads confirmed exactly as documented

Piped synthetic JSON payloads to `node hooks/guard-feat-dispatch.mjs` via
stdin (same technique the test file itself uses):

- `crew:builder` on `FEAT-017` work → `BLOCKED`, exit 2, message names
  `devcrew:fullstack-dev` (plus the frontend-dev/backend-dev/dev-lite
  alternatives) with the "'builder' is no longer a standalone role" note.
- `loop:pm` → `BLOCKED`, exit 2, `use devcrew:pm.`
- `crew:validator` → `BLOCKED`, exit 2, `use devcrew:verifier.`
- `devcrew:fullstack-dev` (control) → exit 0, **no stderr at all** —
  clean pass-through, as expected for a current ceremony participant.

## 3. Successor map accuracy — 4 agents spot-checked, exist as claimed

`find`/`ls agents/` confirms `agents/verifier.md`, `agents/release-engineer.md`,
`agents/document-writer.md`, and `agents/architect.md` all exist as real
files. Went one step further and read each frontmatter `name:` field
(`verifier`, `release-engineer`, `document-writer`, `architect`) to confirm
the `devcrew:` prefix used in the successor guidance is the correct
plugin-namespaced invocation form — and for 3 of the 4
(`devcrew:verifier`, `devcrew:architect`, `devcrew:document-writer`), this
is further reinforced by their literal presence in `allowed[]` itself, so
following that guidance is provably safe (a fully closed loop: the guard
recommends a token, and that exact token passes the same guard). The 4th,
`devcrew:release-engineer`, exists as a real agent but is **not** in
`allowed[]` — see §4.

## 4. The flagged gap — confirmed real, needs_fix

Reproduced live, both directions:

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
BLOCKED: Agent dispatch with subagent_type='devcrew:release-engineer' on
FEAT work (FEAT-017).
exit=2
```

Following the guard's own printed advice leads to a second block from the
same guard — a dead end. This is a defect **in this slice**, not a
pre-existing one carried forward unfixed: before `59bae128`, `crew:deployer`
had no remediation message at all (it silently passed through as an
allowlisted legacy alias), so there was no prior "recommend X" claim that
could have been wrong. This commit is what newly authored the
`crew:deployer → devcrew:release-engineer` guidance text, and that text is
false as written — `devcrew:release-engineer` is blocked by the exact
mechanism the message tells the operator to use to get unblocked.

Checked the existing test coverage for this: the new
`"retired crew:reviewer, crew:deployer, ..."` test asserts the stderr
message *contains the string* `devcrew:release-engineer` — it does not
assert that dispatching to `devcrew:release-engineer` itself succeeds. So
the test suite is fully green today despite the successor being
unreachable; no existing test would catch this class of gap.

**Fix options** (either closes it):
1. Add `"devcrew:release-engineer"` to `allowed[]` if release/deployment
   work legitimately belongs in the FEAT-ceremony dispatch surface (this
   hook only fires when the prompt mentions `FEAT-NNN`, and a deployment
   task naming the FEAT it's shipping is a realistic prompt shape).
2. If `release-engineer` is intentionally excluded from FEAT-tagged
   ceremony dispatch for a design reason not evidenced in the current code
   or comments, change the `crew:deployer` successor text to not recommend
   a token this same guard will reject — point to the actual reachable
   path instead (e.g., clarify that release/deployment happens outside the
   FEAT-ceremony `Agent` dispatch surface this hook guards, via whatever
   mechanism release-engineer is actually invoked through).

I don't have enough context on this repo's deployment-dispatch topology to
pick between the two — that's a call for whoever owns this fix — but the
message as currently written is not actionable, which contradicts this
slice's own stated goal (commit message: "actionable message naming the
attempted token and its devcrew successor"; CHANGELOG: same framing).

## 5. Mutation/neuter-proof — independently reproduced, not just trusted

The commit message claims "a mutation check proving the flipped test
actually catches a re-allowlisted regression." I did not find a test
literally labeled as a mutation check, so I reproduced the claim myself:
re-added `"crew:builder"` to `allowed[]`, ran the suite — **16 pass, 1
fail**, and the one failure is exactly `legacy alias crew:builder
hard-fails as of v1.1.0 (FEAT-017/SLICE-45)` (`0 !== 2`). Restored;
`git diff` on the file came back empty (byte-identical to HEAD); reran —
**17 pass, 0 fail** again. The flipped tests do genuinely catch a
re-allowlisted regression, confirmed independently.

## 6. Gates

- `bun test src/tests/guard-feat-dispatch-hook.test.mts`: **17 pass, 0
  fail** (matches the expected count).
- `bun ./src/scripts/validate-dispatch-markers.mts`: `Dispatch-marker
  validation OK — 7 producer fixture(s) checked, all balanced and
  confined.`
- `bun ./src/scripts/validate-agent-refs.mts`: `Agent-ref validation OK: no
  phantom crew:/runner: dispatch references found.` (Note: this validator's
  scope is CLAUDE.md's own dispatch references, not the hook's runtime
  successor-message text — it would not have caught §4's gap; different
  surface entirely.)
- `bunx tsc --project tsconfig.json --noEmit`: clean.
- `bunx tsc --project tsconfig.test.json --noEmit`: clean.
- CHANGELOG.md entry read and cross-checked against the diff — accurate,
  though it repeats the same "actionable... successor" framing that §4
  shows isn't fully true yet.

## Decision rationale

`needs_fix`, scoped to the single `crew:deployer` → `devcrew:release-engineer`
successor entry. Everything else is independently verified solid: the
removal is complete (zero legacy tokens remain, confirmed by direct
inspection of `allowed[]`, not just grep-on-comments), the historical
`runner:` claim is true (verified via both `git log -S` and the file's
original creation commit), all four requested live-fire cases behave
exactly as documented, three of the four spot-checked successor agents are
not just real files but literally present in `allowed[]` (a fully
self-consistent, provably-safe loop), and the mutation/neuter-proof claim
is independently reproduced (re-allowlisting a retired token breaks exactly
one, precisely-named test; restoring returns to clean green). The one gap
is real, live-reproduced in both directions, newly introduced by this
slice's own message text (not a pre-existing issue this slice merely
failed to fix), and self-contradicts this slice's own stated purpose of
giving operators an actionable path forward. This gates the v1.1.0 cut per
the lead's framing, so it should not ship with a known dead-end
remediation message.
