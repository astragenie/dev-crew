---
findings: "[MINOR] crew/scripts/lib/ci/consumer-ci.mts:34-40 — `KNOWN_TEST_COMMAND_PATTERNS` covers `bun test`/`npm test`/`dotnet test`/`pytest`/`go test` per the FEAT-027 spec, but omits `vitest`/`jest`, two very common JS test runners a consumer repo might run instead of `npm test`. Fix: not required for this slice's AC (the spec enumerates the exact pattern list and it was honored exactly) — flagging as a follow-up candidate for a future FEAT if adoption hits a JS-stack consumer repo using vitest/jest directly in CI without an npm script wrapper.\n\n[MINOR] crew/scripts/lib/ci/consumer-ci.mts:103-112 — `runsTestCommand` matches a configured `stack.test` command via a plain `content.includes(cmd)` substring check after flattening `cmd`+`args` with a single space join. A workflow step that invokes the same command with different quoting or argument order (e.g. `bun test --parallel --bail` vs configured `bun test --parallel`) would still match via substring-contains, which is correct for the common case, but a reordered-args workflow (`bun test --bail --parallel`) would NOT match even though it runs semantically the same configured test command. Fix: not required now — no AC exercises this ordering edge case, and over-engineering a command-equivalence parser here would be scope creep beyond FEAT-027."
decision: approved
---
# Review Result: SLICE-53 review A (typescript)

- Created: 2026-11-06T16:32:55.459Z
- Reviewer: A
- Decision: approved
- Summary: Independent TypeScript/stack-quality review of SLICE-53 / FEAT-027 (`git diff 5fe21f91..08fd9ac5`, 13 files). The deliverable makes the `deriveValidationGate` `satisfiedByReview` delegation (`src/scripts/lib/validation-gate.mts`) conditional on a new `hasConsumerCi` detector (`crew/scripts/lib/ci/consumer-ci.mts`), adds a `crew.mts has-consumer-ci` subcommand, and aligns five policy docs + two test suites to the corrected conditional policy and `ci.yml` filename.

Verification performed:
- `bun run typecheck` (root tsconfig.json + tsconfig.test.json): PASS, rc=0.
- `cd crew && bunx tsc --noEmit`: PASS, rc=0.
- `cd crew && bunx biome lint scripts/ hooks/`: PASS, 198 files, 0 findings.
- `bunx biome lint src/scripts/lib/validation-gate.mts src/scripts/validate-repo-boundary.mts src/tests/validation-gate.test.mts`: PASS, 0 findings (root `biome lint src/` has 65 pre-existing warnings, all in files untouched by this diff, e.g. crew-bundle-parser.mts).
- `cd crew && bun test tests/consumer-ci.test.mts tests/command-gate-policy.test.mts tests/validation-gate-delegation.test.mts`: 26 pass, 0 fail.
- `bun test src/tests/validation-gate.test.mts`: 29 pass, 0 fail.
- `bun src/scripts/validate-agent-refs.mts`: OK.
- `cd crew && bun scripts/validate-skills.mts`: OK, 79 skills checked (pre-existing warnings are in unrelated skill files, not the two touched here).
- `cd crew && bun scripts/validate-routing-table.mts --coverage-only`: OK.
- `bun src/scripts/validate-content-length.mts`: OK (both touched SKILL.md files, 40 and 56 lines, well under the 200-line cap).

Builder claims verified independently:
- `hasConsumerCi` correctly requires BOTH a push/pull_request trigger AND a matching test command; verified by manually parsing sample workflow YAML with the `yaml@2.9.0` package used — confirmed the bare `on:` key is NOT folded to a boolean by this package's default core schema (so the defensive `record["true"]` fallback in `hasPushOrPullRequestTrigger` is dead code for this parser, but harmless and correctly reasoned as defensive).
- `deriveValidationGate` only reaches the `satisfiedByReview` branch when `hasConsumerCi(repoPath).present` is true, confirmed by reading the code and by the passing AC-2 tests (`approved review but NO consumer CI does NOT satisfy`, `consumer CI workflow with no push/pull_request trigger does NOT satisfy`).
- The 3 updated assertions in `crew/tests/validation-gate-delegation.test.mts` tighten rather than loosen coverage: they add positive assertions for `has-consumer-ci` prose and a new negative assertion (`.not.toMatch(/test\.yml/)`) alongside the existing assertions, rather than removing checks.

Type safety: `exactOptionalPropertyTypes` is on in both tsconfigs; `consumer-ci.mts`'s optional-field interfaces (`LoopJsonStackTestEntry`) are read-only shapes for parsed JSON and never construct objects with explicit `undefined`, so no violation surfaces.

Cross-repo-boundary import: `src/scripts/lib/validation-gate.mts`'s new dynamic `import("../../../crew/scripts/lib/ci/consumer-ci.mjs")` is registered in `ALLOWED_CROSS_IMPORTS` in `src/scripts/validate-repo-boundary.mts`, mirroring the pre-existing `phase-gate.mts` pattern — not a new precedent. The `yaml` package consumer-ci.mts imports is a direct dependency of `crew/package.json` (`^2.9.0`); Node/Bun resolution is based on the importing file's location (`crew/scripts/lib/ci/`), so root's own `package.json` need not declare it.

Test quality: both new/updated suites (`consumer-ci.test.mts`, `validation-gate.test.mts`, `validation-gate-delegation.test.mts`) exercise real temporary repos via `fs.mkdtemp(os.tmpdir())` and real file writes, not mocks — matching the repo's established pattern for this gate family.

Scope discipline: diff stays inside the FEAT-027 scope line (the five docs, `crew/scripts/crew.mts`, `crew/scripts/lib/ci/`, `src/scripts/lib/validation-gate.mts`, `crew/tests/`, `src/tests/`); `commands/build.md` and `agents/` are untouched as the spec requires.

No BLOCKER or MAJOR findings. Two MINOR observations noted below, neither gating.
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: bun run typecheck (root, 2 projects) rc=0; cd crew && bunx tsc --noEmit rc=0; cd crew && bunx biome lint scripts/ hooks/ rc=0 (198 files, 0 findings); bunx biome lint on the 3 touched root files rc=0 (0 findings); cd crew && bun test tests/consumer-ci.test.mts tests/command-gate-policy.test.mts tests/validation-gate-delegation.test.mts: 26 pass/0 fail; bun test src/tests/validation-gate.test.mts: 29 pass/0 fail; bun src/scripts/validate-agent-refs.mts: OK; cd crew && bun scripts/validate-skills.mts: OK (79 skills); cd crew && bun scripts/validate-routing-table.mts --coverage-only: OK; bun src/scripts/validate-content-length.mts: OK
- Risks: -
- Required Follow-up: -

