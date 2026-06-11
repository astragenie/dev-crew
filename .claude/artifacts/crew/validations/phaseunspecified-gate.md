# Phase Gate Report (parallel) — phase unspecified — 2026-06-11T16:32:08.499Z

## Summary
- Status: PASS
- Preset: typescript-plugin-dev
- Started: 2026-06-11T16:30:45.492Z
- Ended: 2026-06-11T16:32:08.499Z

## lint
- exitCode: 0
- durationMs: 8794

## typecheck
- exitCode: 0
- durationMs: 5431

## test
- exitCode: 0
- durationMs: 82996

## Combined log

```text
[lint] $ eslint src eslint.config.mjs
[test] bun test v1.3.14 (0d9b296a) 20x PARALLEL
[test] src\tests\dispatch-trace.test.mts:
[test] [dispatch] marker parse failed for FE: JSON Parse error: Expected '}'
[test] src\tests\spec-decompose-architect.test.mts:
[test] loop CLI
[test] Usage:
[test]   bun src/scripts/loop.mts install --repo <path> [--preset <name>]
[test]   bun src/scripts/loop.mts phase-gate --repo <path> [--phase <N>] [--note <text>]
[test]   bun src/scripts/loop.mts status --repo <path>
[test]   bun src/scripts/loop.mts list-presets
[test]   bun src/scripts/loop.mts doctor --repo <path> [--check|--fix]
[test]   bun src/scripts/loop.mts dispatch <subcommand> [args...]   (see: dispatch --help)
[test] Hard dependency: the `crew` plugin must be installed. Phase-gate writes its
[test] artifact through `crew write-validation-result`.
[test] src\tests\auto-walker.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\cost-alert-stop.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-walker.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\cost-alert-stop.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-walker.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\cost-alert-stop.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-walker.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\slice-classify.test.mts:
[test] [slice from-feature] classify dispatch failed: Simulated dispatch error
[test] src\tests\dispatch-worktree.test.mts:
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] src\tests\auto-walker.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\feature-simplify.test.mts:
[test] warning: in the working copy of 'to-delete.mts', LF will be replaced by CRLF the next time Git touches it
[test] src\tests\halt-badge-schema.test.mts:
[test] [features] redundant-read-stop: enabled
[test] {"event":"cost-regression-check","timestamp":"2026-06-11T16:30:46.771Z","mode":"median","actual_usd":21.7345,"expected_usd":null,"median_usd_per_point":null,"effort_points":null,"threshold_usd":205.6797,"triggered":false,"multiplier":3,"window":5,"sample_count":5}
[test] [features] redundant-read-stop: enabled
[test] {"event":"cost-regression-check","timestamp":"2026-06-11T16:30:46.956Z","mode":"median","actual_usd":21.7345,"expected_usd":null,"median_usd_per_point":null,"effort_points":null,"threshold_usd":205.6797,"triggered":false,"multiplier":3,"window":5,"sample_count":5}
[test] src\tests\feature-simplify.test.mts:
[test] warning: in the working copy of 'test.mts', LF will be replaced by CRLF the next time Git touches it
[test] src\tests\auto-walker.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\features-service.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: disabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\stop-check-cost-ceiling.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\slice-complete-ceremony.test.mts:
[test] [slice complete] --no-doc-writer is deprecated and now a no-op (see DEC-011). Doc-writer auto-dispatch is already removed.
[test] src\tests\stop-check-cost-ceiling.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-walker.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\cost-regression.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\dispatch-merge.test.mts:
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'a.txt', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'b.txt', LF will be replaced by CRLF the next time Git touches it
[test] Already on 'slice/SLICE-MERGE'
[test] src\tests\cost-regression.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-walker.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\cost-regression.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\stop-conditions.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-walker.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\session-drift.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\crew-blocking-gates.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\stop-conditions.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\session-drift.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\crew-blocking-gates.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\slice-complete-ceremony.test.mts:
[test] [slice complete] --no-doc-writer is deprecated and now a no-op (see DEC-011). Doc-writer auto-dispatch is already removed.
[test] src\tests\stop-conditions.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-walker.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\session-drift.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-walker.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\session-drift.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-walker.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\backlog-enrich.test.mts:
[test] loop CLI
[test] Usage:
[test]   bun src/scripts/loop.mts install --repo <path> [--preset <name>]
[test]   bun src/scripts/loop.mts phase-gate --repo <path> [--phase <N>] [--note <text>]
[test]   bun src/scripts/loop.mts status --repo <path>
[test]   bun src/scripts/loop.mts list-presets
[test]   bun src/scripts/loop.mts doctor --repo <path> [--check|--fix]
[test]   bun src/scripts/loop.mts dispatch <subcommand> [args...]   (see: dispatch --help)
[test] Hard dependency: the `crew` plugin must be installed. Phase-gate writes its
[test] artifact through `crew write-validation-result`.
[test] Enriched: 0 / Already tagged: 2
[test] Enriched: 0 / Already tagged: 0
[test] src\tests\slice-complete-ceremony.test.mts:
[test] [slice complete] --no-doc-writer is deprecated and now a no-op (see DEC-011). Doc-writer auto-dispatch is already removed.
[test] src\tests\backlog-enrich.test.mts:
[test] Enriched: 0 / Already tagged: 0
[test] src\tests\auto-walker.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\hierarchical-dispatch.integration.test.mts:
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'A.txt', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'B.txt', LF will be replaced by CRLF the next time Git touches it
[test] Already on 'slice/HP'
[test] src\tests\dispatch-worktree.test.mts:
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] src\tests\task-store-index.test.mts:
[test] [task-store] Unknown provider "jira" — falling back to NoopProvider. Check taskStore.provider in loop.json. Valid values: github, noop, linear.
[test] src\tests\dispatch-merge.test.mts:
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
[test] Already on 'slice/SLICE-CONF'
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] Already on 'slice/SLICE-SKIP'
[test] src\tests\auto-mode.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[lint] C:\work\mega\loop\src\tests\agent-report-writer.test.mts
[lint]   148:18  warning  Define a constant instead of duplicating this literal 12 times  sonarjs/no-duplicate-string
[lint]   224:18  warning  Define a constant instead of duplicating this literal 5 times   sonarjs/no-duplicate-string
[lint]   376:16  warning  Define a constant instead of duplicating this literal 5 times   sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\auto-dispatch.test.mts
[lint]    35:31  warning  Define a constant instead of duplicating this literal 8 times  sonarjs/no-duplicate-string
[lint]    52:14  warning  Define a constant instead of duplicating this literal 9 times  sonarjs/no-duplicate-string
[lint]   230:16  warning  Define a constant instead of duplicating this literal 5 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\ceremonies.test.mts
[lint]   20:47  warning  Define a constant instead of duplicating this literal 6 times   sonarjs/no-duplicate-string
[lint]   38:56  warning  Define a constant instead of duplicating this literal 9 times   sonarjs/no-duplicate-string
[lint]   67:15  warning  Define a constant instead of duplicating this literal 10 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\competitor-audit-aggregate.test.mts
[lint]   272:15  warning  Define a constant instead of duplicating this literal 7 times   sonarjs/no-duplicate-string
[lint]   275:17  warning  Define a constant instead of duplicating this literal 10 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\config-resolver.test.mts
[lint]   20:49  warning  Define a constant instead of duplicating this literal 7 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\cost-regression.test.mts
[lint]   390:20  warning  Define a constant instead of duplicating this literal 5 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\crew-bridge.test.mts
[lint]   151:5  warning  Define a constant instead of duplicating this literal 9 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\effective-cwd.test.mts
[lint]   34:20  warning  Define a constant instead of duplicating this literal 5 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\extract-acceptance-criteria.test.mts
[lint]   19:5  warning  Define a constant instead of duplicating this literal 5 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\features-service.test.mts
[lint]   8:28  warning  Define a constant instead of duplicating this literal 14 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\github-sync.test.mts
[lint]   435:41  warning  Define a constant instead of duplicating this literal 8 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\hierarchical-dispatch.integration.test.mts
[lint]   39:40  warning  Define a constant instead of duplicating this literal 6 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\loop-installer-tokens.test.mts
[lint]   167:18  warning  Define a constant instead of duplicating this literal 8 times  sonarjs/no-duplicate-string
[lint]   247:42  warning  Define a constant instead of duplicating this literal 6 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\pattern-alerts.test.mts
[lint]   73:27  warning  Define a constant instead of duplicating this literal 11 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\read-guard-hook.test.mts
[lint]   79:22  warning  Define a constant instead of duplicating this literal 9 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\rule-loader.test.mts
[lint]   16:59  warning  Define a constant instead of duplicating this literal 9 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\session-drift.test.mts
[lint]    87:41  warning  Define a constant instead of duplicating this literal 7 times   sonarjs/no-duplicate-string
[lint]   128:35  warning  Define a constant instead of duplicating this literal 9 times   sonarjs/no-duplicate-string
[lint]   130:36  warning  Define a constant instead of duplicating this literal 10 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\skill-resolver.test.mts
[lint]   33:30  warning  Define a constant instead of duplicating this literal 17 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\slice-classify.test.mts
[lint]   54:34  warning  Define a constant instead of duplicating this literal 6 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\slice-complete-multi-slice.test.mts
[lint]   196:54  warning  Define a constant instead of duplicating this literal 5 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\slice-complete.test.mts
[lint]   63:26  warning  Define a constant instead of duplicating this literal 12 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\stop-conditions.test.mts
[lint]   37:17  warning  Define a constant instead of duplicating this literal 11 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\task-store-setup-writer.test.mts
[lint]   13:37  warning  Define a constant instead of duplicating this literal 6 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\validate-decline-citations.test.mts
[lint]   35:34  warning  Define a constant instead of duplicating this literal 9 times  sonarjs/no-duplicate-string
[lint] C:\work\mega\loop\src\tests\worktree-manager.test.mts
[lint]   61:21  warning  Define a constant instead of duplicating this literal 6 times  sonarjs/no-duplicate-string
[lint]   94:55  warning  Define a constant instead of duplicating this literal 6 times  sonarjs/no-duplicate-string
[lint] ✖ 36 problems (0 errors, 36 warnings)
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[lint] $ prettier --check "src/**/*.mts"
[test] src\tests\claims-stop.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-mode.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\claims-stop.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\redundant-read-detector.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-mode.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\redundant-read-detector.test.mts:
[test] [features] redundant-read-stop: enabled
[lint] Checking formatting...
[test] src\tests\task-store-github-provider.test.mts:
[test] [GithubProvider] gh CLI not found — skipping publishFeature
[test] [GithubProvider] gh CLI not found — skipping syncPull
[test] [GithubProvider] gh CLI not found — skipping publishSlice
[test] [GithubProvider] gh CLI not found — skipping closeSlice
[test] [GithubProvider] gh CLI not found — skipping updateStatus
[test] [GithubProvider] gh CLI not found — skipping postSliceComment
[test] [GithubProvider] gh CLI not found — skipping bootstrap
[test] src\tests\redundant-read-detector.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\task-store-github-provider.test.mts:
[test] [GithubProvider] gh CLI not found — skipping publishSlice
[test] [GithubProvider] gh CLI not found — skipping closeSlice
[test] [GithubProvider] gh CLI not found — skipping postSliceComment
[test] [GithubProvider] gh CLI not found — skipping updateStatus
[test] src\tests\redundant-read-detector.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-mode.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\claims-stop.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\redundant-read-detector.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\hierarchical-dispatch.test.mts:
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] src\tests\redundant-read-detector.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-mode.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\claims-stop.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\redundant-read-detector.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-mode.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\redundant-read-detector.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\claims-stop.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\redundant-read-detector.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-mode.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\redundant-read-detector.test.mts:
[test] [features] redundant-read-stop: disabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\auto-mode.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\loop-iteration.test.mts:
[test] [features] redundant-read-stop: enabled
[test] src\tests\hierarchical-dispatch.test.mts:
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'A.touch', LF will be replaced by CRLF the next time Git touches it
[test] Already on 'slice/SLICE-E2E'
[test] src\tests\loop-iteration.test.mts:
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] [features] redundant-read-stop: enabled
[test] src\tests\hierarchical-dispatch.integration.test.mts:
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'ok.txt', LF will be replaced by CRLF the next time Git touches it
[test] Already on 'slice/MIX'
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
[test] warning: in the working copy of 'shared.txt', LF will be replaced by CRLF the next time Git touches it
[test] Already on 'slice/CONF'
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[test] Already on 'slice/DC'
[test] warning: in the working copy of 'README.md', LF will be replaced by CRLF the next time Git touches it
[lint] All matched files use Prettier code style!
[lint] Manifests OK:
[lint]   plugin.json      loop@0.41.0
[lint]   package.json     loop-plugin@0.41.0
[lint]   marketplace.json (1 entries)
[lint]     - loop@0.41.0
[lint] Content length OK:
[lint]   agents (7 enforced, 7 exempt, cap=300 lines)
[lint]   skills (18 files, cap=200 lines)
[test] src\tests\auto-merge.test.mts:
[test] loop CLI
[test] Usage:
[test]   bun src/scripts/loop.mts install --repo <path> [--preset <name>]
[test]   bun src/scripts/loop.mts phase-gate --repo <path> [--phase <N>] [--note <text>]
[test]   bun src/scripts/loop.mts status --repo <path>
[test]   bun src/scripts/loop.mts list-presets
[test]   bun src/scripts/loop.mts doctor --repo <path> [--check|--fix]
[test]   bun src/scripts/loop.mts dispatch <subcommand> [args...]   (see: dispatch --help)
[test] Hard dependency: the `crew` plugin must be installed. Phase-gate writes its
[test] artifact through `crew write-validation-result`.
[test]  1266 pass
[test]  49 skip
[test]  0 fail
[test] Ran 1315 tests across 131 files. [82.98s]
```