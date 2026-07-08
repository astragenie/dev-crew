# Retroactive review — FEAT-188 S3b recall-injection unification (merged #366)

- **Date:** 2026-07-08
- **Reviewer:** main-thread (Opus 4.8), retroactive
- **Target:** commit `9b74a652` (PR #366, "FEAT-188 S3b — unify slice-start recall onto frozen recall-injection-v1 (#358)"), as carried on `release/v0.64.0`
- **Files:** `src/scripts/lib/slice-linker/start-slice.mts` (`formatRecallBlockV1`, `buildRecallRequest`, `emitRecallUsedEvent`, rewritten `runRecallHook`) + `src/tests/start-slice-recall-v1.test.mts`
- **Gate against:** dev-team `docs/contracts/recall-injection-v1.md` (v1, frozen)

## Why this review exists

PR #366 merged to `main` on 2026-07-07 with `reviews: []` and an empty
`reviewDecision` — no GitHub review, no crew review artifact. The
constitution requires independent review for code-bearing change. This
artifact closes that gate retroactively, before v0.64.0 is tagged.

(A separate review artifact in this directory —
`20260708T074101Z-...s3b-recall-injection-unification-review.md` — is **moot**:
it reviewed a local reimplementation draft that was discarded once the merged
#366 was found. Disregard it; it reviews code that no longer exists.)

## Verdict: PASS (3 low-severity follow-ups)

Behavior-preserving, fail-silent, contract-conformant. Ships in v0.64.0.

## Contract conformance

| Invariant | Result |
|---|---|
| Best-effort, never throws | PASS — `runRecallHook` wraps all in try/catch → `""`; `emitRecallUsedEvent` try/catch; `recallSilent` is itself fail-silent |
| Byte-identical when off | PASS — `memory.enabled:"never"` and `recall.enabled:false` early-return `""` before any transport touch; golden test proves the dispatch body under the block is `===` the off-path body |
| Empty → "" | PASS — `formatRecallBlockV1` returns `""` on empty hits; caller guards `if (recallBlock && ...)` before splicing |
| Scoping | PASS — `buildRecallRequest` folds query + optional `project`/`agent`; `scopeByAgent` opt-in preserved (#309 rationale intact) |
| Header not forked | PASS — header is the shared `## Prior context (from astramem)` |

### On the two alarms raised by the earlier (moot) subagent review

Both were false, traced to that review lacking the frozen contract:

1. *"`runRecallHook` kept, not deleted."* #366 keeps the function name but
   swaps its transport (CLI-spawn `recallPrior` → shared-client `recallSilent`)
   and format (`recall-injector.formatRecallBlock` → `formatRecallBlockV1`).
   The contract's intent — one shared transport + frozen block format, no
   forked recall path — is met. Keeping a single injection function is not a
   violation.
2. *"Block format forked into `formatRecallBlockV1`."* The contract's
   §"Emitted block format" **explicitly sanctions** this: same header, per-line
   shape adapted to `MemoryEntry`'s `kind/severity/source/summary` — "that
   divergence is intentional and frozen." `formatRecallBlockV1` implements
   exactly the frozen line shape `- **[<kind> <severity>]** <source> <summary>`.
   Correct, not rogue.

## Findings (all LOW — none block release)

1. **`severity` hardcoded `"medium"`** (`start-slice.mts:864`). `RecallHit`
   carries no severity, so every line is labeled `medium`. Documented in the
   function's doc comment; mirrors dev-team's own wire-hit mapping for the
   no-local-duplicate case. Cost: display/ranking severity signal is lost.
   Follow-up: thread severity through the wire shape when astramem-client
   exposes it.
2. **Unknown-kind → `"lesson"` relabel** (`start-slice.mts:861`).
   `RECALL_V1_KINDS = {failure, lesson, decision, standard_violation}` omits
   `fact` (a kind the contract lists), so a `fact` hit displays as `lesson`.
   Minor mislabel. Follow-up: add `fact` (and any other real kinds) to the set,
   or pass unrecognized kinds through verbatim.
3. **Golden test gap** (`start-slice-recall-v1.test.mts`). Covers the
   `recall.enabled:false` off-gate but not the `memory.enabled:"never"` gate
   (`start-slice.mts:937`). The "never" branch is untested. Follow-up: add a
   one-line `enabled:"never"` case asserting the same byte-identity.

## Evidence

- Read `start-slice.mts:840-980` + `start-slice-recall-v1.test.mts` in full.
- Local gates on `release/v0.64.0`: `tsc` app+test clean, `biome lint` 0
  errors, `bun test` 2307 pass / 1 skip / 0 fail (S3b suite green).
- PR #366 metadata (`gh pr view 366`): merged 2026-07-07, `reviews: []`.

## Process note (not a code defect)

#366 reached `main` without an independent review gate. Root cause worth a
look: the merge path (author self-merge on a memory FEAT) bypassed the review
requirement. Recommend confirming the branch-protection / merge policy on this
repo requires ≥1 approving review before merge to `main`.
