# Review Result: SLICE-75: bench harness + perf wins 1-5

- Created: 2026-06-07T13:26:10.095Z
- Reviewer: reviewer
- Decision: rejected
- Summary: Win 1 (frontmatter-cache) ships the cache module but never wires readFrontmatterCached into any production caller — backlog-parser.mts still calls parseFrontmatter directly, making the entire memoization win a dead letter.
- Evidence Checked:
  - 1. frontmatter-cache.mts exports readFrontmatterCached and clearFrontmatterCache — confirmed by grep across all src/scripts/ and scripts/. Zero production callers. backlog-parser.mts line 36 still calls parseFrontmatter() directly (unchanged). 2. clearFrontmatterCache() is never called from loop.mts or any top-level handler — only in unit tests. 3. bench-runner.mts: regression gate correctly calls process.exit(1) on breach (line 91) — PASS. 4. backlog-parser.mts Promise.all correctness: readStateEntries uses pathExists guard (line 53) before readdir — ENOENT safe — PASS. 5. bench.mts spawnSync: no check on result.status — failed command still records wall-clock time
  - making perf numbers silently wrong on failure (noted
  - not blocking). 6. baseline.json keys brief_p50_ms and triage_p50_ms match bench-runner.mts interface exactly — PASS. 7. p50 formula Math.floor(runs/2) with runs=10 gives sorted[5] — upper median
  - self-consistently applied across baseline and gate runs — acceptable. 8. Unit tests exercise production code path via injected readFile/parse mocks — no bypass of cache Map — PASS. AC-7 monotonic-counter simulation absent: tests call clearFrontmatterCache() directly
  - which is functionally equivalent and acceptable. 9. validate-manifests.mjs: PASS (loop@0.25.1 OK). validate-content-length.mjs: PASS. npm test: 912 pass per builder attestation (5 new tests
  - from 907 baseline).
- Files Reviewed:
  - src/scripts/lib/frontmatter-cache.mts
  - scripts/lib/frontmatter-cache.mjs
  - src/tests/frontmatter-cache.test.mts
  - tests/frontmatter-cache.test.mjs
  - src/tests/perf/bench.mts
  - tests/perf/bench.mts
  - src/tests/perf/bench-runner.mts
  - tests/perf/bench-runner.mjs
  - src/scripts/lib/backlog-parser.mts
  - scripts/lib/backlog-parser.mjs
  - package.json
  - .claude/artifacts/loop/perf/baseline.json
- Test Adequacy: 5 frontmatter-cache unit tests added covering cache hit, mtime-change miss, clearFrontmatterCache cold-miss, independent-path slots, and key-collision guard — all exercise live Map through injected stubs, no production-caller bypass. No bench harness tests (intentionally excluded from npm test per AC).
- Risks: Win 1 is entirely dead code: frontmatter-cache.mts is never imported by any production module. The p50 improvement claimed (77.2ms → 76.2ms, -1.3%) is within noise — no measurable win has actually landed. Bench timing silently includes failed-command wall-clock if spawnSync returns non-zero status, which could mask a broken command as a passing bench.
- Required Follow-up: Builder must wire readFrontmatterCached into backlog-parser.mts readEntry() (replace parseFrontmatter call), thread mtime from fs.stat, and call clearFrontmatterCache() at each top-level command entry in loop.mts. Re-run bench after wiring to confirm a real p50 drop. spawnSync non-zero exit check is a secondary note — handle or document as known gap before SLICE-76.

