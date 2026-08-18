---
id: FEAT-254
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-10
depends_on: [FEAT-251, FEAT-252, FEAT-242]
slices: []
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.6
pm_technical_risk: 0.45
pm_dependency_depth: 0.55
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-07-10
autonomous_safe: true
triage_notes: "Three independently-testable finesse hooks reusing the proven PR #406 emitter pattern. dependency_depth revised 0.65->0.55 since the watcher-track blocker (FEAT-242 B1) is now done, though a same-id unrelated FEAT-242 was separately filed and must not be confused with it (flagged in risks). technical_risk 0.45 confirmed (known pattern, multiple modules, no schema change to existing data). P2 confirmed."
tags: [workflow, infra]
needs_contract: false
needs_ux: false
github_issue: 502
github_url: https://github.com/astragenie/runner-plugin/issues/502
p0_bucket: carry
p0_bucket_reason: "autonomous issue-flow hooks (close-comment, --from-issue, issue events) are runner methodology surface, not seam-scoped"
---
## Description

Tracker-provider program Phase 5 — autonomous issue flow hooks (finesse pass; watcher heavy lifting stays in FEAT-242/245/246). Three hooks: (a) /runner:close posts close-comment + closes the mirrored issue via getProvider (today only manual github sync reconciles) — evidence-rich close comments (grade summary, PR link) give DORA-grade per-slice traceability; (b) /runner:intake --from-issue accepts Linear issue URLs in addition to GitHub (parse -> provider fetch -> FEAT) — once landed, FEAT-242 watcher reactions calling intake --from-issue make Linear issues watchable findings with zero watcher changes; (c) emit issue.published / issue.closed loop events copying the landed PR #406 pattern exactly: dedicated <kind>-emitter.mts module, payload schema under schemas/loop-events/ + index.json registry entry, shared fanoutEnvelope sink, no-op without webhook config, canonical ts field — gives astrarunner issue open->close timestamps for lead-time/MTTR. SEQUENCING: queue until FEAT-242 (B1) slices close — shared envelope/fanout surface. depends_on: FEAT-251, FEAT-252, FEAT-242. Do NOT build watcher tick, IssueBroker, or cross-repo queue here. Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1 (hook a -- happy path): Given a slice with a mirrored external tracker issue (`github_issue:` or `linear_issue:` frontmatter set) and a resolvable provider, When `/runner:close` completes the closing ceremony for that slice, Then it calls `getProvider(config, repoPath)` to post an evidence-rich close comment (grade summary + PR link, sourced from closeSlice.mts's existing grade/PR data) via `postSliceComment` and then `closeSlice` on the mirrored issue -- evidenced by a test asserting both `TaskStoreProvider` methods are invoked with the correct externalId and a comment body containing the grade score and PR URL.
- AC-2 (hook a -- edge, no mirror configured): Given a slice with no external tracker id stamped (NoopProvider resolved, or `taskStore.enabled: false`), When `/runner:close` completes, Then no provider call is attempted and the close ceremony proceeds unaffected -- no error, no hang -- evidenced by a test asserting closeSlice completes successfully with zero provider method invocations when NoopProvider is active.
- AC-3 (hook b -- happy path): Given a Linear issue URL (e.g. `https://linear.app/astragenie/issue/AST-123`) passed to `/runner:intake --from-issue <url>`, When intake resolves the URL, Then it routes to a Linear-provider-backed fetch path (extending the existing GitHub-only contract at loop.mts:775-782, `from-issue.mjs::fetchIssue`) and pre-fills the new FEAT's body from the fetched Linear issue's title/description -- evidenced by a test asserting URL-pattern detection (linear.app vs github.com) routes to the correct fetcher.
- AC-4 (hook b -- edge, unrecognized URL): Given a `--from-issue` URL matching neither the GitHub nor the Linear issue URL pattern, When intake processes it, Then it fails with a clear error naming the unsupported URL shape rather than silently creating an empty or malformed FEAT -- evidenced by a test asserting the error path for a malformed/unsupported URL.
- AC-5 (hook c -- emitter pattern parity): Given a slice or feature issue transitions to a published or closed state, When the corresponding hook fires, Then it emits an `issue.published` or `issue.closed` envelope via a dedicated `<kind>-emitter.mts` module mirroring `pr-merged-emitter.mts`'s `buildPrMergedInput`/fanout shape, through the shared `fanoutEnvelope` sink (webhook-fanout.mts), with a new payload schema registered under `schemas/loop-events/` and an `index.json` entry alongside the existing `pr.merged`/`spec.created` kinds -- evidenced by a schema-validation test and an index.json registry test asserting both new kinds resolve to their schema files.
- AC-6 (hook c -- edge, no-op without webhook config): Given no webhook config is present, mirroring `pr-merged-emitter.mts`'s documented 'fail-silent... swallowed by fanoutEnvelope' contract, When an `issue.published`/`issue.closed` event fires, Then the emitter no-ops without throwing and without blocking the calling ceremony -- evidenced by a test asserting the emit call resolves cleanly with `fanoutEnvelope` mocked to simulate absent webhook config.
