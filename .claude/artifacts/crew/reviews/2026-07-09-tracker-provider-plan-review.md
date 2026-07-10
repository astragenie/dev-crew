# Architecture review — tracker-provider migration plan (v4)

- **Artifact reviewed**: `.claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md` (v4)
- **Reviewer**: crew:architect-reviewer (adversarial pass, code-verified)
- **Date**: 2026-07-09
- **Verdict**: **APPROVED-WITH-CONDITIONS**

Plan's factual claims re-verified against code by the reviewer (moveFeature 3-field emit at
`backlog-writer.mts:214-224`, emitter DORA-field acceptance at `backlog-state-emitter.mts:20-37`,
loop.mts bypass sites, LinearProvider all-throw stub) — all check out.

## Findings

1. **[MAJOR]** Phase 1 slice-side scope understated — no canonical slice-writer exists to
   "consolidate". Slice fs writes scattered: `complete-slice.mts:44-72` (moveAndStampSlice),
   `feature-lifecycle.mts:470-511`, `:565-603` (materialize*), and `wave/failure-pivot.mts:60-72`
   mutates frontmatter via hand-rolled regex, not the shared `frontmatter.mjs` parser. New
   construction + divergence reconciliation, not delegate swap.
2. **[MAJOR]** CompositeProvider frontmatter-stamping contract undefined: `publishFeature`
   returns one id; composite publish needs BOTH `github_issue:` and `linear_issue:` stamped.
   Must decide interface-returns-map vs composite-owns-stamping BEFORE Phase 3 picks its
   stamping approach.
3. **[MAJOR]** Partial-publish failure invisible: github ok + linear fail → valid id returned,
   no signal; Phase 5a close-time Linear call then silently no-ops. Needs warn distinguishing
   not-configured vs configured-but-failed.
4. **[MAJOR]** LinearProvider is greenfield GraphQL (pagination, rate limits in syncPull), not
   a thin wrap like GithubProvider over the existing github-sync engine. Estimate or descope.
5. **[MODERATE]** CI guard must be explicit allowlist (validate-imports BOUNDARIES style);
   naive "no fs on backlog paths" blocks `doctor.mts:169,198-219` reconciliation + test fixtures.
6. **[MODERATE]** Bundled AC not verifiable from this repo's CI (dev-team prompt scan is
   cross-repo) — split into in-repo CI AC + manual Phase 6 verification.
7. **[MINOR]** backlog-writer callers = 11 files, not 8.
8. **[MINOR]** getProvider citation drifted (1923 → 1920); re-grep anchors before Phase 1.
9. **[MINOR]** Sequencing verified sound: FEAT-247 gates Phase 1 (correct), FEAT-242 1/4
   slices done gates Phase 5 (correct), FEAT-245 defers LinearProvider slot to C2 = Phase 3
   (correct direction of dependency).

## Conditions (folded into plan v5 same day)

- **COND-A** (F1): Phase 1 ACs separately name slice-side consolidation; resolve
  failure-pivot regex divergence (port to mergeFrontmatter or document exception).
- **COND-B** (F2+F3): composite id-recording contract decided before Phase 3 stamping;
  partial-failure warn (not-configured vs failed) specified.
- **COND-C** (F4): Phase 3 estimate covers pagination/rate-limits, or syncPull/bootstrap
  descoped to documented warning-stub v1 + follow-up FEAT.
- **COND-D** (F5): CI guard = explicit allowlist; doctor.mts classification decided up front.
- **COND-E** (F6): split cross-repo AC.

## Disposition

All five conditions folded into plan v5 (`2026-07-09-tracker-provider-migration-prompt.md`)
on 2026-07-09. Re-review offered by reviewer once folded; none require re-architecting.
