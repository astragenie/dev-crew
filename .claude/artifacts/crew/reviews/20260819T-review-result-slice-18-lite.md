---
decision: approved
slice: SLICE-18
tier: lite
reviewer: reviewer-slice18 (ad hoc lite review)
reviewed_at: 2026-08-19T00:00:00Z
---

# Review: SLICE-18 — models.yaml/model-router single-source design merge (rescoped)

**Decision: approved**

- Diff confined to the two declared files: `crew/evals/lib/model-profile.mts` (10-line change) and new `crew/tests/model-profile-schema-parity.test.mts`. The regex `/^\d+\.\d+\.\d+$/` added to the hand-rolled validator is byte-for-byte identical to `ModelsConfigSchema`'s Zod check at `crew/scripts/lib/models/schema.mts:26`, so the two validators now genuinely agree on the version contract.
- Parity test passes standalone (11/11) and covers both directions — 2 accept fixtures (single/multi profile) and 9 reject fixtures (bad root, missing fields, dangling default_profile, missing tier, non-string tier, non-semver version) — not just a happy-path smoke test. Full `crew/` suite is green (2031 pass / 0 fail / 117 skip) with this change in place.
- Re-scope rationale is sound, not a punt: verified independently that `crew/scripts/validate-configs.mts:44` does document models.yaml staying under `crew/` REPO_ROOT per `resolve-token.mts`'s TokenResolverRoots split, that `resolve-model.mts`/`model-router.mts` both carry keep-in-sync comments, that `crew/hooks/pre-tool-use-model-enforce.mts` and `crew/hooks/lib/model-routing-enforce.mts` import `resolve-model.mjs` directly (hooks/ zone reserved for SLICE-17), and that crew/ still runs its own TS 6.0.3 vs root TS 7.0.0. Deferring the literal router/resolve-model merge until after the crew-to-root absorption removes that tsc-boundary risk is the right call rather than forcing a risky cross-project import now.

Other dirty files in the working tree (`.claude-plugin/hooks/hooks.json`, `.claude/state/crew/workflow-state.json`, untracked `hooks/pre-push-gate.mts`) are unrelated concurrent slice work in this shared checkout, not part of SLICE-18's diff — confirmed the slice's actual footprint is the two declared files only.
