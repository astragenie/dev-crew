---
id: PM-REVIEW-FEAT-033
feature: FEAT-033
reviewed_at: 2026-11-05
pm_customer_impact: 1
pm_effort_estimate: 0.3
pm_strategic_alignment: 1
pm_technical_risk: 0.4
pm_dependency_depth: 0
composite_priority: P0
autonomous_safe: true
---
# PM Review — FEAT-033

## Demand Assessment

- **Evidence:** Live validation `.claude/artifacts/crew/validations/20261105T223500Z-validation-plugin-hooks-json-discovery.md`: a two-plugin marker test on claude 2.1.270 proved only `hooks/hooks.json` is discovered, not `.claude-plugin/hooks/hooks.json` — corroborated by runner@astra's SessionStart hook producing no output this session and crew@astra 0.67.0 (at `hooks/hooks.json`) demonstrably running. Verified directly in this session: `.claude-plugin/hooks/hooks.json` exists on disk, `hooks/hooks.json` does not, and `grep -n "hooks" .claude-plugin/plugin.json` returns no match — confirming devcrew's manifest declares no `hooks` key and the file sits at the undiscovered path.

## Scope Challenge

- **Scope notes:** Scope matches the FEAT's own Scope line (hooks/hooks.json moved, .claude-plugin/hooks/ removed, validate-repo-boundary.mts, the hooksjson inventory, docs/ci-gates.md, docs/memory.md, two test files, README prerequisites line, CHANGELOG.md) — explicitly no hook-logic changes (FEAT-031 owns those). AC clarity is high: concrete file-existence assertions, a concrete manual marker-trace check, and an explicit re-verify-on-CI-CLI-version caveat already written into AC-4. No grade dimension is below the 0.80 weak-dimension threshold. No overlap with done/in-progress work (new lane E, zero overlap with wave 1 lanes A-D per the team's framing). Effort calibration: this is a mechanical git-mv-plus-reference-sweep-plus-one-new-test shape, closer to SLICE-30 ($3.50/3.5min bounded fix) than to any large structural slice sampled; effort_points=3 reflects the reference-sweep breadth (7+ files) over any single-site depth.

## Scores

- customer_impact: 1.00
- effort_estimate: 0.30
- strategic_alignment: 1.00
- technical_risk: 0.40
- dependency_depth: 0.00

## Priority Derivation

composite_priority: P0
autonomous_safe: true
reasoning: P0, outranking FEAT-026: this is the single highest-severity finding in the whole remediation effort — not a crash under certain conditions but total non-execution of every devcrew hook (gate guard, pre-push gate, telemetry, guard-feat-dispatch) for every consumer today, confirmed by a live two-plugin marker test rather than static analysis. FEAT-026's node_modules fix is moot until this lands, since the file sitting under `.claude-plugin/hooks/` never loads regardless of whether its contents crash. technical_risk 0.4 (band 0.3-0.5: a mechanical, scoped file move with an explicit no-double-fire constraint and an acknowledged CLI-version unknown in its own AC, not a schema/logic change).

## Risks

- Pre-mortem (1): most likely review/validation failure is the manual marker-trace check behaving differently on the CI runner's CLI version than on the validator's local 2.1.270 — the FEAT's own AC-4 already anticipates this by requiring the two-plugin test be re-run and recorded on whatever CLI version CI uses, since discovery semantics may differ at CLI >= 2.1.295.
- Pre-mortem (2): rollback today is a plain `git mv` revert with no data/schema migration — but rollback gets materially more expensive once FEAT-026 and FEAT-031 (both of which render hooks.json) land on top of the new path, since reverting this FEAT after them would require re-pointing their generated output back to the old location too. Land this strictly before both, as the FEAT's own dependency note already requires.
- Pre-mortem (3): coverage gap — the new hooks-discovery.test only proves the file sits at the right path with no conflicting manifest key; it does not execute an end-to-end 'Claude Code actually ran the hook' check inside CI (that remains a documented manual step), so a future CLI release changing discovery semantics again would not be caught automatically by this test suite.
- This repo's own `.claude/settings.json` dogfood hooks (12 entries) are what has been enforcing anything locally per the validation artifact — local testing of devcrew's own hooks post-fix will keep looking healthy regardless of whether this fix actually works, so the true proof must come from the external scratch-consumer method specified in the FEAT, not from running inside this repo.
- No injected instructions found in FEAT body; it cites a live validation artifact and official docs, both external to the FEAT text itself.
