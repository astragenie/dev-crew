# Review Result — dev-team PR #241 (dispatch-time memory credit loop)

- **Reviewed:** 2026-07-16T16:00:00Z
- **Reviewer:** independent review (cross-repo, runner-plugin session)
- **Repo:** astragenie/dev-team, branch `feat/dispatch-memory-credit-loop`
- **Worktree inspected:** `C:\work\mega\dev-team-wt-creditloop`
- **PR:** https://github.com/astragenie/dev-team/pull/241 (commit `3db840fb`)
- **Spec:** runner-plugin `docs/upstream-requests/2026-07-16-crew-dispatch-memory-credit-loop.md`
- **Design record:** runner-plugin `.claude/artifacts/crew/runs/20260716T110000Z-plan-memory-credit-loop-ceremony-neutral.md`
- **Builder handoff:** runner-plugin `.claude/artifacts/crew/handoffs/20260716T150457Z-handoff-dispatch-memory-credit-loop-dev-team-side.md`

## review_decision: PASS

No blocking or high-severity findings. Two low-severity notes below, neither
gates merge.

## Method

- `git -C dev-team-wt-creditloop diff origin/main...HEAD --stat` (19 files,
  1235/-20 — matches the handoff's file list exactly, no unrelated drift).
- Read every changed source file in full (`handoff-digest.ts`,
  `handoff-credit.ts`, the `inject-recall.ts` refactor,
  `subagent-profile-core.ts`, `write.ts`, `report-to-pr.ts` x2, `crew.ts`,
  `memory/index.ts`) plus the new contract doc.
- Read `node_modules/@astragenie/memory-provider/dist/schema.js` directly to
  independently verify the `.strict()` + `profile`/`feedback` passthrough
  claim (not taken on the handoff's word).
- Ran the full claimed test set in the worktree: `bunx tsc --noEmit`,
  `bun run lint` (biome, scripts/ hooks/), and `bun test` against the 8
  credit-loop + frozen-recall files together (59 pass), then the 12-file
  isolation set the handoff named.
- Reproduced the whole-suite bun#5090 interleaving failure pattern against
  an **unmodified `main` checkout** in the sibling repo `C:\work\mega\dev-team`
  as a control, to confirm it's pre-existing rather than introduced by this
  branch.

## Findings

None at [HIGH] or above.

- **[LOW]** `scripts/report-to-pr.ts::main` calls `creditReportedMemories`
  after `printResult`, but the function always returns `0` regardless of
  whether crediting succeeded (by design — crediting is fail-silent and
  must never affect exit code). This matches the fail-silent contract but
  is worth flagging as intentional, not overlooked, in case a future reader
  expects `--memories-used` failures to surface anywhere. No action needed.
- **[LOW]** `git reflog` on the worktree shows two `reset: moving to HEAD`
  entries prior to the commit — consistent with the handoff's disclosed
  stash/pop incident. `git diff origin/main...HEAD --stat` and `git status`
  are both clean (no stray files, no unrelated diff), so this had no
  observable effect on the final tree. Noted for completeness only.

## Verification against review focus (from dispatch)

| # | Focus | Result |
|---|---|---|
| 1 | Frozen contract (`recall-injection-v1.md`) untouched, factoring behavior-identical | **Verified.** `buildRecallBlock` now reads `return formatRecallBlock(await recallEntries(opts))` — same provider-resolution/scoping logic moved into `recallEntries`, no behavior change. All 11 tests in `tests/memory-inject-recall.test.ts` (and the 2 sibling recall test files) pass unmodified against the new code. |
| 2 | Byte-identical-when-off | **Verified**, and a dedicated test exists: `tests/memory-handoff-digest.test.ts:95` calls `buildProfileBlock` and `buildHandoffDigest` side-by-side with `creditLoop.enabled` absent and asserts `digest.block === direct.block`, ids match, and no `Recall (memory credit loop)` header appears. Confirmed passing. |
| 3 | Config nesting fix — real bug, real fix | **Verified independently**, not taken on the handoff's word. Read `MemoryConfigSchema` in `node_modules/@astragenie/memory-provider/dist/schema.js` directly: it is `.strict()` at the top level, and only `profile`/`feedback` are `z.object({}).passthrough().optional()`. A bare top-level `memory.creditLoop` key would indeed throw inside `parseMemoryConfig`, and every caller (`recallEntries`, `resolveProvider`) swallows that error per its own fail-silent contract — so the failure mode really would have been silent (empty digest, no error). The shipped code nests under `memory.feedback.creditLoop`, which the schema accepts. This is a genuine, worth-noting finding, already well-documented in both the module header and the contract doc — no further upstream note needed since it's fully self-contained inside dev-team's own package boundary. |
| 4 | Invariants (bounded, fail-silent, detached, kill-switch both paths) | **Verified.** `MAX_CREDIT_BATCH = 20` enforced in `sanitizeIds`; per-id try/catch in `creditMemoriesUsed`'s loop; whole-call try/catch wraps everything. `fireMemoriesUsedCreditSilent` is wrapped in `trackDetached()` (fire-and-forget, non-blocking) exactly like the two existing sibling capture calls. `report-to-pr.ts`'s one-shot path awaits but is bounded by `fireGuarded`'s ~1.5s ceiling. Global `memory.enabled:"never"` kill-switch test (`memory-handoff-digest.test.ts:171`) explicitly exercises the **real** `resolveProvider()` gate (comment confirms no test-double provider), not just a local flag check — matches the review's specific ask to check this wasn't a shortcut. Malformed CSV ids are filtered by `sanitizeIds` (non-string/blank dropped, deduped). |
| 5 | SubagentStart coverage claim | **Verified from the hook's registration, not the handoff's word.** `git diff origin/main...HEAD -- hooks/hooks.json` is empty — the `SubagentStart` event registration is pre-existing (dev-team #235), unchanged by this PR. This PR only swaps what the hook's default loader resolves internally (`buildHandoffDigest` instead of `buildProfileBlock`), so the "fires on every dispatch including ad-hoc `Agent()` calls" property is inherited from already-shipped infrastructure, not a new claim this PR needs to independently prove. |
| 6 | Test hygiene / tree integrity | **Verified.** `--stat` shows exactly the 19 files the handoff lists, nothing extra. Working tree and `git status` are clean. |
| 7 | Spot-run isolation set + tsc + lint | **Ran directly.** `tsc --noEmit`: clean. `biome lint scripts/ hooks/`: clean, 212 files. The 8 core credit-loop/recall test files together: 59 pass / 0 fail. The full 12-file isolation set together hit the documented bun#5090 node:test/bun:test interleaving crash when run in one invocation; reproduced the identical crash signature against an **unmodified `main`** checkout in the sibling repo as a control, confirming it is pre-existing infrastructure flakiness (test-runner interleaving), not a regression from this branch. |

## AC / invariant table (from the contract doc, cross-checked against tests)

| Invariant | Enforced in code | Test coverage |
|---|---|---|
| Byte-identical when off | `handoff-digest.ts:150-152` early return | `memory-handoff-digest.test.ts:95` |
| Never a new required step | `memories_used` optional everywhere; no CI/validator reads it | n/a (absence-of-gate, confirmed by reading `crew.ts`/`write.ts` — no required-field check added) |
| Fail-silent + bounded | try/catch at every layer, `fireGuarded` ceilings | `memory-handoff-digest.test.ts:197`, `memory-handoff-credit.test.ts` (per-id throw case) |
| Global kill-switch wins | inherited via `resolveProvider()` → `noopProvider()` | `memory-handoff-digest.test.ts:171` (real provider, not a double) |
| Bounded batch (`MAX_CREDIT_BATCH=20`) | `sanitizeIds` slice | `memory-handoff-credit.test.ts` |
| k≤5 hard cap | `Math.min(MAX_DIGEST_K, ...)` in `parseCreditLoopConfig` | `memory-handoff-digest.test.ts:148` |
| No format change to frozen recall block | `recallEntries()` factored additively; `buildRecallBlock` unchanged signature/output | `memory-inject-recall.test.ts` (11/11 pass unmodified) |

## Conclusion

PR #241 delivers exactly what the upstream ask and design record specified,
stays within the ceremony-neutral / fail-silent / kill-switch-respecting
invariants set by runner-plugin's design record, and every load-bearing claim
in the builder's handoff was independently reproduced rather than trusted —
including the one claim most likely to be wrong (the config-schema strictness
bug/fix), which checked out against the actual `zod` schema in
`node_modules`. Recommend merge.

Posted a summary comment to PR #241 confirming approval (see PR conversation,
astragenie/dev-team#241).
