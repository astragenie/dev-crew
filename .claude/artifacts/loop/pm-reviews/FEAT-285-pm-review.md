---
id: PM-REVIEW-FEAT-285
feature: FEAT-285
reviewed_at: 2026-08-04
pm_customer_impact: 0.55
pm_effort_estimate: 0.38
pm_strategic_alignment: 0.7
pm_technical_risk: 0.35
pm_dependency_depth: 0.1
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-285

## Demand Assessment

- **Evidence:** Directly repro'd live in this repo on 2026-08-04 against FEAT-284: six identical parent issues (#599, #601, #603, #605, #607, #609) created for six sibling slice publishes in one `slice from-feature` run; FEAT frontmatter ended up stamped only with the last (#609), leaving five orphans closed by hand as not-planned. Code read confirms the mechanism precisely: github-sync.mjs's publishFeat/publishSlice write FEAT frontmatter via direct fs.writeFile (bypassing BacklogStore), so they never call cache.mts's bust('listBacklog:<repoPath>'). loop.mts:1568's for-loop over sibling slices runs sequentially within one process, but listBacklog() is memoized per-process via cache.mts's cached() — so every publishFeat call across all N sibling publishes returns the same pre-write snapshot regardless of the writes made in between. This is not a race condition; it fires deterministically every time, single-threaded.

## Scope Challenge

- **Scope notes:** Primary fix surface: src/scripts/loop.mts SLICE_HANDLERS['from-feature'] publish loop (~line 1568-1574) and scripts/lib/github-sync.mjs's publishFeat/publishSlice (lines 657-753). Two viable fix shapes: (a) minimal — bust the listBacklog cache after the direct-write in publishFeat so subsequent calls re-read fresh state; (b) structural, matching the FEAT's acceptance direction — restructure the from-feature loop to create the parent issue exactly once, stamp github_issue on the FEAT immediately, and pass that id to every child publish rather than relying on cache freshness at all. Secondary, lower-severity, cheap to bundle: intake free-text's auto-generated FEAT issue title pastes the entire opening paragraph rather than a bounded title (scripts/lib/github-sync/issue-sync.mjs createFeatureIssue). Do not touch BacklogStore's own write path (feature-store.mts) — it already busts the cache correctly per FEAT-282/281 precedent; this bug is specifically the direct-fs.writeFile bypass in github-sync.mjs. NOTE (added by lead after scoring): the reason that bypass was never caught is filed separately as FEAT-287 — validate-backlog-writes.mts's SCAN_ROOT is 'src/scripts' only, so the whole sibling scripts/ tree containing github-sync.mjs is invisible to the sole-writer gate. Prefer porting these writes to BacklogStore (fix shape b) over a bust()-only patch, since that resolves FEAT-285 and FEAT-287's offender in one move.

## Scores

- customer_impact: 0.55
- effort_estimate: 0.38
- strategic_alignment: 0.70
- technical_risk: 0.35
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: Live-fired, deterministic, cleanly root-caused via direct code read (not just the FEAT's own hypothesis) — that argues for real priority, not P3/P4. But weighed honestly against this session's P1s: FEAT-284 is live data loss (a whole slice silently dropped), FEAT-283 is review-gate verdict defects (corrupts a gating decision), FEAT-281 closes a tested-but-never-wired CI gap. FEAT-285 creates external noise (orphan GitHub issues) and double-counts any tracker/DORA metric keyed on FEAT issues, but it never drops or corrupts actual engineering work, and cleanup — while manual — is mechanical (close the duplicates, keep the last-stamped id). That places it just above FEAT-282 (P2, currently inert/blocks nothing) since FEAT-285 actively fires and pollutes external state each time it triggers, but below the P1 tier reserved for data-loss/gating-correctness defects. Fix is bounded to one loop + one write path with a precise, already-identified mechanism, keeping effort_estimate and technical_risk moderate-low.

## Risks

- Restructuring the publish loop to create the parent once and reuse its id must stay scoped to the from-feature multi-slice loop — publishFeat's existing idempotency contract is also used by other single-slice callers (publishFeatureViaProvider at loop.mts:903/1453/2054, direct `github publish` CLI) and must not regress.
- A cache-bust-only fix closes this specific repro but leaves the underlying class open: any other caller that populates the listBacklog cache and then writes directly via fs.writeFile outside BacklogStore hits the same staleness. Prefer the structural fix (single parent creation + explicit id threading) over a bust()-only patch if effort allows.
- Regression coverage needs to actually exercise N>1 sequential publishSlice calls within one process (not just the pre-existing per-slice idempotency check) to catch a re-regression — existing tests likely mock ghExec per-call and may not share process-level cache state the way the real CLI invocation does.
