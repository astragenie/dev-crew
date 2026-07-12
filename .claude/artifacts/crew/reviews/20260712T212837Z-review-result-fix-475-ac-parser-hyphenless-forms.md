---
findings: "🔴:0,🟡:1,❓:0"
status: completed
decision: approved_with_notes
author_id: builder
judge_id: reviewer
self_approval: false
---
# Review Result: Review Result

- Created: 2026-07-12T21:28:37.000Z
- Reviewer: reviewer
- Decision: approved_with_notes
- Status: completed
- Summary: Re-review of `fix/ac-parser-hyphenless-forms` at commit `2c69bd8d` (on top of `ef0cee47`). Builder applied the exact delimiter fix I requested in the prior round — `classifyAcceptanceCriteriaLine`'s regex now requires a `:`, `-`, or `—` immediately after the AC marker's digits (`ac[-\s]?\d+\b\s*[:—-]`) instead of a bare word boundary. This closes the false-positive class I found last round (`AC2000 legacy format`, `AC130 gunship reference`, `AC42 is a system code, not a test` — all previously misclassified as testable ACs, now all correctly rejected; verified independently, not just via the builder's added test). One narrow residual edge case remains (see Risks) but it is materially smaller than the defect this diff fixes and does not block merge.

- Evidence Checked:
  - Diffed `ef0cee47..2c69bd8d` directly: the only functional change is the regex literal (`ac[-\s]?\d+\b` → `ac[-\s]?\d+\b\s*[:—-]`) plus one new test; `headingFound` threading, the `AcceptanceCriteriaRequiredError` message split, the `extractAcceptanceCriteria` wrapper, and `buildSliceMarkdown`'s null-handling are byte-identical to the version I already reviewed and approved of in the prior round — nothing to re-litigate there.
  - Ran the new regex directly in node against my three original failing inputs from last round (not the builder's copy of them): `AC2000 legacy format` → false, `AC130 gunship reference` → false, `AC42 is a system code, not a test` → false. All now correctly rejected.
  - Re-checked every currently-accepted positive form still matches: `AC-1:`, `AC1:`, `AC 1:`, and both bold/em-dash-wrapped forms (`**AC1 — Root cause...**`, `**AC 2 — Second criterion.**`) — all still `true`.
  - Extra edge cases per the lead's specific ask: `AC1.` (period), `AC1)` (paren), and `AC1 more prose no punctuation` (trailing space then prose, no delimiter at all) all correctly evaluate to `false` — the delimiter requirement holds for all three.
  - Sanity-checked the `\s*` before the delimiter: it does not reopen the hole. It only ever bridges whitespace between the digits and a delimiter that IS present (e.g. `AC1        : ...`, `AC1\t: ...`, and the em-dash forms' `AC1 — ...`); it never allows a delimiter-less match, since the delimiter itself is still mandatory in the pattern.
  - Ran `bun test src/tests/extract-acceptance-criteria.test.mts` myself: 24 pass, 0 fail — matches the lead's independently-reported count.
  - Re-confirmed `extractAcceptanceCriteria` call sites via grep (unchanged from prior round): only `backlog-store.mts`, `slice-linker/feature-lifecycle.mts`, `slice-linker.mts` re-export it, plus the one real caller of `assertAcceptanceCriteria` at `feature-lifecycle.mts:235`. No new call sites introduced by this commit.

- Files Reviewed:
  - src/scripts/lib/backlog-store/slice-store.mts
  - src/tests/extract-acceptance-criteria.test.mts

- Test Adequacy: The new test (`rejects prose bullets starting with 'AC<digits>' but no delimiter after the number`) pins exactly the three inputs that broke last round, using real prose shapes rather than contrived ones — good regression coverage for the reported defect. Combined with the pre-existing hyphen/space/none-marker positive tests and the bold/em-dash-wrapped positive tests, the accepted-vs-rejected boundary is now well pinned for every case discussed across both review rounds. 24/24 pass, typecheck clean per builder (not independently re-run, no reason to doubt it — only the regex literal changed).

- Author: builder
- Judge: reviewer

- Risks: 🟡 LOW (not blocking) — the delimiter set `[:—-]` includes a bare ASCII hyphen with no required space, so a bullet shaped like `AC<N>-<compound-word>` (a hyphenated compound modifier directly touching the digits, e.g. `AC42-page document requirements`, `AC3-way handshake required`) still matches, because the hyphen there is read as the AC delimiter rather than English hyphenation. This is narrower than the defect just fixed (it needs a hyphen immediately after the digits with zero space, not just any prose start), and dropping the bare hyphen from the delimiter set would also reject the legitimate, commonly-used `AC1 - Description` (spaced hyphen) form, so the fix as shipped is a reasonable tradeoff rather than an oversight. Flagging so it's a known, accepted residual rather than a silent gap — no test currently pins the `AC<N>-word` shape either way.

- Required Follow-up: Optional, non-blocking — if this shape is ever hit in practice, add a test pinning the desired behavior for `AC<N>-<word>` (compound-modifier) bullets and decide then whether to require a space before the hyphen delimiter specifically (while still allowing `:` and `—` immediately). Not required before merge.
