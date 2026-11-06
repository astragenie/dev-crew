---
findings: "[LOW] crew/scripts/lib/session-cost.mts:9 — the `// eslint-disable-next-line @typescript-eslint/no-unused-vars` comment above `import inlinedPricing from \"./pricing.json\"` is stale: the import IS used (loadPricingTable returns it), and this repo lints with Biome, not ESLint, so the directive is also inert. Fix: delete the comment.\n\n[LOW] crew/scripts/lib/pricing.json — the top-level \"fallback\": \"claude-sonnet-4\" key is now dead data. matchPricingKey never reads pricing.fallback, and the old pricingFallback output field was removed from assembleCostResult. Nothing breaks, but a future editor skimming this file could reasonably believe it still controls a fallback price. Fix: drop the key or add a one-line _comment noting it's vestigial, in a follow-up.\n\n[LOW] crew/scripts/lib/cost-hygiene/emit-cost-report.mts:resolveRunId — the fallback run id (`${startedAt}_${completedAt}`, used only when run.runId is absent) combined with the duplicate-run_id+usd check means two distinct legacy runs sharing identical startedAt+completedAt+usd would be treated as duplicates and the second silently refused. The code's own comment only discusses the false-negative direction (\"an extra report gets written\") not this false-positive direction (a legitimate second write gets blocked). Pre-existing design tradeoff, not a regression from this diff — flagging for awareness, not blocking."
decision: approved
---
# Review Result: SLICE-50 review A (typescript)

- Created: 2026-11-06T04:18:20.887Z
- Reviewer: A
- Decision: approved
- Summary: SLICE-50 / FEAT-025 TypeScript review (scope: git diff 4debf1bc..0125f2c6,
22 files, plus the exactOptionalPropertyTypes fix in 5338fa5d). All six
checklist items were verified by reading the diff directly and running
tooling independently (not by trusting the builder's summary):

1. session-cost.mts's static pricing.json import typechecks under both
   crew/tsconfig.json and root tsconfig.json (both set
   resolveJsonModule: true). PRICING_PATH is read inside loadPricingTable(),
   called at invocation time, not module load -- a dedicated test proves
   override works from a directory path containing a space. The old
   import.meta.url / percent-decode path is fully removed.
2. matchPricingKey is exact-key or exact-key+"-YYYYMMDD" only; a regression
   test explicitly proves claude-opus-4-9 does NOT match claude-opus-4.
   matched: null propagates cleanly through priceByModel -> unpriced_models
   -> decideCostVerdict -> "verdict: unknown" in rendered frontmatter.
3. emit-cost-report.mts's three refuse paths are plain early returns placed
   after the read-only Promise.all (no writes happen in those calls) and
   before the only writeArtifact call -- no partial file write on any
   refusal. The duplicate run_id+usd check compares values that both
   originate from the same Number(totalUsd.toFixed(4)) computation, so the
   string comparison is sound, not approximate.
4. grade-parser.mts only exports a regex; grade-writer.mts (lib) throws
   Error with .code = GRADE_TEMPLATE_UNFILLED; only loop.mts (entry point,
   inside main().catch) reads error.code and sets process.exitCode. No
   process.exit from library code.
5. Spot-checked 2 of 10 updated grade fixtures -- each replaces
   "<fill title>" with a real string ("Real Title"), consistent with how
   the rest of the fixture already fills other placeholders. Genuine fill,
   not a dodge. The new grade-writer-unfilled.test.mts also covers a
   false-positive guard (ordinary <https://...> link must not trigger) and
   the CLI exit-2 path via Bun.spawn.
6. New relative imports follow the .mjs-specifier convention; crew biome
   complexity cap (<=15) passed clean for every new/changed function; the
   exactOptionalPropertyTypes spread fix in 5338fa5d is covered by a clean
   `crew/tsconfig.json` typecheck run directly.

Tooling run directly (not just trusted):
- cd crew && bunx tsc -p tsconfig.json --noEmit -> clean, exit 0 (this lane
  is NOT covered by root `bun run typecheck`).
- Root `bun run typecheck` -> clean, exit 0.
- crew test suite --parallel: 1785 pass, 117 skip, 4 fail + 1 error, all
  confined to tests/validate-contracts.test.mts (redocly subprocess timeout
  under parallel load); re-ran that file alone -> 5/5 pass. Pre-existing
  flake, file untouched by this diff.
- crew/tests/pricing.test.mts + cost-report-honesty.test.mts +
  cost-report-emission.test.mts -> 29/29 pass.
- src/tests/grade.test.mts + grade-writer-unfilled.test.mts +
  post-builder-fanout.test.mts -> 38/38 pass.
- bun run validate:imports, validate-repo-boundary.mts -> both OK.
- Root biome lint: 65 pre-existing warnings repo-wide, none inside lines
  this diff touched (checked by grep against every changed file). Not a
  regression.
- crew biome lint/format -> clean.

Decision: approved. Three low-severity, non-blocking nits noted in
findings (stale eslint-disable comment, vestigial pricing.json fallback
key, a narrow duplicate-run_id false-positive edge case).
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: crew tsc clean (crew/tsconfig.json + root); crew test --parallel 1785 pass/4 fail (pre-existing validate-contracts.test.mts parallel-timeout flake, re-ran isolated 5/5 pass); pricing.test.mts+cost-report-honesty.test.mts+cost-report-emission.test.mts 29/29 pass; grade.test.mts+grade-writer-unfilled.test.mts+post-builder-fanout.test.mts 38/38 pass; validate:imports OK; validate-repo-boundary OK; crew biome lint/format clean; root biome lint pre-existing warnings only, none in diff lines
- Risks: -
- Required Follow-up: -

