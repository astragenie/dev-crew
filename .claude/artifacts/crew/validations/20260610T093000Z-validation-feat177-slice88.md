# Validation — SLICE-88 / FEAT-177: snapshot excludes deferred from Top-triaged

**Result: PASS** (parent-run; specialist dispatch skipped — single-file fix, specialist layer paused 3× this session, see `docs/sop/specialist-pause-handling.md`).

`requires_validation: true` — observable change to snapshot output.

## Scenario 1 — live repo (the reported bug)

- **Before:** snapshot "Top triaged" listed `FEAT-176` (`deferred: true`, blocked on upstream) as next-to-slice, while `/loop:auto` skipped it — the two views disagreed.
- **Action:** applied the filter, ran `node scripts/loop.mjs snapshot-memory`.
- **After:** "Top triaged" = FEAT-166, 167, 168, 083, 085. **FEAT-176 absent.** Walker top plan is also FEAT-083 (176 skipped). Views now agree. ✅

## Scenario 2 — automated (AC-2 / AC-3)

- 1 deferred + 5 non-deferred triaged → Top-triaged shows exactly the 5 non-deferred; deferred id absent. ✅
- 1 deferred + 2 non-deferred → Top-triaged shows exactly the 2 non-deferred (no padding with the deferred entry). ✅

## Scenario 3 — counts unaffected (AC-4)

`Triaged: N` still counts deferred items; only the next-to-slice list excludes them. Confirmed on the live snapshot (FEAT-176 still in the triaged count). ✅

## Gate evidence

`npm run typecheck` =0 · `npm run lint` =0 · `npm test` → **pass 1145, fail 0**, 1 skip · build/scripts in sync.

All 6 ACs PASS. Snapshot generator now consistent with the walker's deferred handling.
