---
findings: "Re-validation of SLICE-50 / FEAT-025 after commit 58dcfb62 (\"fix(SLICE-50):\ncost-report honesty guards + run_id on the loop close path (review B\nblocker)\"). All checks below were run fresh against the committed state.\n\n1. Typecheck (PASS)\n\nbun run typecheck\n-> \"tsc --project tsconfig.json --noEmit && tsc --project tsconfig.test.json --noEmit\", rc 0, zero errors.\n\ncd crew && bunx tsc -p tsconfig.json --noEmit\n-> rc 0, zero errors.\n\nThe prior narrowing failure at cost-slice-handler.mts is gone. Confirmed\nthe fix: both emit-cost-report.mts and cost-slice-handler.mts now check\n\"guard.refused === true\" (explicit equality) instead of a bare\n\"if (guard.refused)\", with an inline comment explaining that root\ntsconfig.test.json runs strict:false and does not narrow the awaited\ndiscriminated union on a bare boolean-property check under this\nTypeScript version, while the explicit equality check narrows correctly\nunder both projects. Code read directly at cost-slice-handler.mts line\n228 and emit-cost-report.mts line 180.\n\n2. Re-drove the real production costSliceHandler path (PASS, all four cases)\n\nFresh scratch repo plus a CREW_PROJECTS_ROOT-scoped fake sessions dir,\ncalling costSliceHandler directly (the function\nsrc/scripts/lib/slice-linker/crew-bridge.mts's tryWriteCostReport calls\nfor every real /runner:slice complete close).\n\n(1) zero sessions scanned:\n{\"written\":false,\"reason\":\"sessions_scanned_zero\"}\ncost dir: []  -- refused, nothing written.\n\n(2) window > 24h, no --allow-wide-window, WITH a real session inside the window:\n{\"written\":false,\"reason\":\"window_too_wide\"}\ncost dir: []  -- refused, nothing written. (See the cursor-advance finding\nbelow -- this is the dangerous case.)\n\n(3a) normal emit (sessions present, window normal, fresh run_id):\nwritten ok: true\ncost dir: [ \"20261106T043117Z-cost-report-slice-revalidate-run.md\" ]\nFrontmatter line read directly from the written file:\nrun_id: \"revalidate-3\"\nThis confirms run_id is now stamped on the real production write path,\nnot just the interactive write-final-synthesis path.\n\n(3b) second write, same run_id + identical totals:\n{\"written\":false,\"reason\":\"duplicate run_id\"}\ncost dir after (3b): [ \"20261106T043117Z-cost-report-slice-revalidate-run.md\" ]\n(unchanged -- no second file)\n\n3. Aggregate-mode gating (CONFIRMED STILL UNGATED, as suspected)\n\nRan costSliceHandler with flags:{aggregateAll:true} against a window with\ntwo active source projects (so maybeEmitAggregateSlice actually fires).\nResult: {\"slice\": {...}, \"aggregate\": {...}}, both written --\ncost dir: [ \"...-cost-report-aggregate-revalidate-run.md\", \"...-cost-report-slice-revalidate-run.md\" ]\n\nRead the aggregate file's frontmatter directly:\n---\nkind: cost-report\nrun_title: \"revalidate run\"\nusd: 0.0021\n...\naggregate_all: true\nsource_count: 2\ncreated_at: ...\n---\nNo run_id line (grep count 0). Reading maybeEmitAggregateSlice in\ncost-slice-handler.mts confirms it: the aggregate branch calls\nwriteArtifact(\"cost-report-aggregate\", ...) directly, with no call to\nevaluateCostReportGuard anywhere in that function. The guard is only\nevaluated once, before the SLICE write; if that guard passes, the\naggregate write proceeds completely unguarded -- no zero-sessions check\nspecific to the aggregate window, no duplicate check, no run_id. This is\nonly reachable at all when the slice write itself succeeds (a refused\nslice guard returns early and never reaches the aggregate branch), but\nonce reached, the aggregate write has none of AC-1's three protections.\nConfirmed, matches the question as posed.\n\n4. Test suite (PASS, counts up from the prior run)\n\ncd crew && bun test tests/cost-report-honesty.test.mts tests/cost-report-emission.test.mts tests/pricing.test.mts\n-> 33 pass, 0 fail, 87 expect() calls, rc 0.\n(Previously 29 pass/0 fail/73 expect() calls before this fix -- the 4 new\ncases driving costSliceHandler directly account for the increase.)\n\n5. Judgement on the cursor-advance-on-refusal question (data loss: YES for window_too_wide, NO for the other two reasons)\n\nRead src/scripts/lib/slice-linker/crew-bridge.mts's tryWriteCostReport\ndirectly (lines ~264-300). The relevant line:\n\n  if (sliceId && !report?.error) {\n    await writeCostScanCursor(repoPath, sliceId, window.completedAt);\n  }\n\n\"report\" here is costSliceHandler's direct return value. All three guard\nrefusals return \"{ written: false, reason: ... }\" -- none of them carry\nan \"error\" key. So \"!report?.error\" is true for every refusal, and the\ncursor advances to \"window.completedAt\" (effectively \"now\") on EVERY\nrefusal, not just on a genuine failure.\n\nWalking through what that means per reason, using\nsrc/scripts/lib/slice-linker/cost-scan-cursor.mts's own model (the cursor\nis \"the last window end this slice successfully scanned to\"; the NEXT\nclose starts its scan from wherever the cursor last landed):\n\n- sessions_scanned_zero: by definition there were no sessions in this\n  window. Advancing the cursor past an empty window loses nothing --\n  there was nothing there to lose. Harmless, as the team lead's framing\n  assumed.\n- duplicate run_id: this fires only when an identical-run_id,\n  identical-usd report ALREADY exists on disk -- i.e. this exact window's\n  data was already captured and written in an earlier successful call.\n  Advancing the cursor past it is correct: the data is not lost, it is\n  already durably recorded under the earlier report. Harmless, as\n  assumed.\n- window_too_wide: this is the one case where sessionsScanned > 0 --\n  real, substantive session cost DID happen inside this window, and the\n  guard is refusing to write a report specifically because the window is\n  wide enough to be dishonest (the exact #178 incident shape: a\n  stale/un-rotated start time silently blending unrelated work into one\n  total). If the cursor still advances to \"now\" on this refusal, the\n  entire wide span of real, unreported session activity is permanently\n  skipped: the next close's scan window starts from \"now\", not from the\n  original stale start, so that span of real cost data will never be\n  retried and will never appear in ANY cost report, ever. This is a\n  genuine data-loss bug, structurally different from the other two\n  reasons -- the refusal is doing its honesty job (refusing to write a\n  misleading total) but the surrounding cursor machinery then throws the\n  underlying data away rather than preserving it for a corrected retry\n  (e.g. via --allow-wide-window or a narrower manual window).\n\nVerdict: yes, it is data loss for window_too_wide specifically, and only\nfor that reason. The fix (out of this validation's scope to implement)\nwould be to also check \"report?.reason\" and skip the cursor advance when\nreason === \"window_too_wide\" specifically, while still advancing for the\nother two refusal reasons and for a real .error failure case. Worth a\nfollow-up FEAT/SLICE citing this exact file and line; not a SLICE-50 AC-1\nregression since the cursor mechanism (FEAT-268) predates FEAT-025 and\nAC-1 never specified cursor behavior, but it does undercut AC-1's intent\nin the one case that matters most (the window_too_wide safeguard exists\nspecifically to protect against losing honest accounting of real work,\nand the cursor advance currently defeats that protection for the exact\ndata the guard was built to protect)."
decision: pass
---
# Validation Result: SLICE-50 re-validation: cost guards on both paths

- Created: 2026-11-06T04:32:35.288Z
- Validator: verifier
- Environment: -
- Decision: pass
- Scenario: SLICE-50 / FEAT-025 telemetry-honesty RE-VALIDATION, after commit
58dcfb62 ("fix(SLICE-50): cost-report honesty guards + run_id on the loop
close path (review B blocker)").

Decision: PASS.

The gap this validation and reviewer B both independently found in the
first pass -- AC-1's three refusal checks (zero-sessions, wide-window,
duplicate-run_id) and the run_id field existing only on the interactive
crew write-final-synthesis path, never on the real /runner:slice complete
close path (crew-bridge.mts -> costSliceHandler) -- is now closed. A
shared crew/scripts/lib/cost-hygiene/cost-report-guard.mts module backs
both call sites. Re-driving the real costSliceHandler directly confirms
all three refusals now fire correctly on the production path, and a
successful write now carries a run_id frontmatter line (confirmed by
reading the written file directly: run_id: "revalidate-3").

The TypeScript narrowing regression flagged in the first pass (root
tsconfig failing to narrow a bare "if (guard.refused)" discriminated
union under strict:false) is also resolved -- both call sites now use the
explicit "guard.refused === true" form. bun run typecheck and
bunx tsc -p crew/tsconfig.json --noEmit both report rc 0 with zero
errors.

cd crew && bun test tests/cost-report-honesty.test.mts
tests/cost-report-emission.test.mts tests/pricing.test.mts -> 33 pass,
0 fail, 87 expect() calls (up from 29/0/73 before this fix -- the four
new cases drive costSliceHandler directly).

Two things to flag, neither of which changes the PASS verdict for
SLICE-50's four stated ACs:

1. Aggregate-mode writes (cost-report-aggregate, written when
   aggregateAll:true finds more than one active source project) are
   confirmed STILL UNGATED -- no run_id, no zero-sessions check, no
   duplicate check -- because evaluateCostReportGuard is only called once,
   before the slice write, and the aggregate branch never calls it
   independently. This only matters once the slice guard has already
   passed (a refused slice guard returns early and the aggregate branch
   is never reached), so the exposure is narrower than AC-1's wording
   might suggest, but it is a real, confirmed gap worth a follow-up note
   if aggregate honesty is ever in scope.

2. A genuine data-loss bug, found while answering the cursor question:
   crew-bridge.mts's tryWriteCostReport advances the per-slice scan
   cursor whenever "!report?.error", and all three AC-1 refusals return
   "{written:false, reason}" with no .error key -- so the cursor advances
   on every refusal, not just real failures. For sessions_scanned_zero
   and duplicate run_id this is harmless (nothing real was lost either
   way). For window_too_wide it is NOT harmless: that refusal fires
   specifically when real session cost activity (sessionsScanned > 0)
   exists in a window too wide to trust, and advancing the cursor past it
   anyway means that real, unreported activity is permanently skipped --
   the next close starts scanning from "now," not from the original
   stale start, so the skipped span is never retried and never appears
   in any cost report. This is a distinct bug from anything FEAT-025's
   ACs cover (the cursor mechanism predates FEAT-025, via FEAT-268), and
   is not something I am fixing as part of this validation, but it is a
   real finding worth a follow-up ticket: skip the cursor advance
   specifically when reason === "window_too_wide".
- Evidence Collected: -
- Files / Surfaces Checked: -
- Risks: -
- Required Follow-up: -

