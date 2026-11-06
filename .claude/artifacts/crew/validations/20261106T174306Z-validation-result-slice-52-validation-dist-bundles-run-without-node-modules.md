---
decision: pass
---
# Validation Result: SLICE-52 validation (dist bundles run without node_modules)

- Created: 2026-11-06T17:43:06.268Z
- Validator: verifier
- Environment: local
- Decision: pass
- Scenario: FEAT-026/SLICE-52 ("Audit T2: self-contained dist bundles so hook entry
points run without node_modules") validated end to end at worktree HEAD
2041ce35 (full diff vs base 5fe21f91; fix delta b1dd6148..2041ce35).

All five acceptance criteria PASS. No regressions in either test suite
beyond the one designed-red ratchet assertion (DEC-044), which is present
identically on the main checkout (5cc59c58) and is explicitly scoped to
stay red until W2.5 clears the commands/*.md CLI path rewrite.

AC-1 (consumer-smoke / hook entries clean): PASS. `bun test
src/tests/install/consumer-smoke.test.mts` -> 2 pass, 1 fail. The one
failure is the designed-red "(c) Stay red while EXPECTED_FAIL is
non-empty" assertion in the ratchet test itself (DEC-044) -- not a hook
regression. `newlyBroken` and `nowPassing` both resolved to `[]`: no HOOK
entry is broken, and every entry still in EXPECTED_FAIL (all CLI-only,
`crew.mts`/`loop.mts`/`prune-artifacts.mts`/`watch-tick.mts`) is still
genuinely crashing without node_modules, as designed -- none belongs to
a hooks.json `bun` command.

AC-2 (dist/crew.js, dist/loop.js run without node_modules): PASS. Staged
a full node_modules-free copy of the worktree (everything except
node_modules/.git/.worktrees, mirroring stageConsumerCopy's own exclusion
rule) under a scratch temp dir, set CLAUDE_PLUGIN_ROOT to that staged
root. `install-global`, `init --repo <tmp> --allow-existing`,
`cost-setup --repo <tmp>` against dist/crew.js and `list-presets`,
`install --repo <tmp2> --preset dotnet-python` against dist/loop.js all
returned rc 0 with real JSON output, no ENOENT. Caveat: a staging
attempt that copied ONLY dist/+templates/+hooks/hooks.json (not the full
tree) failed loop.js's preset commands with ENOENT scanning
`<root>/scripts/presets` -- `scripts/presets/*.json` is plain data that
ships as ordinary repo content (not bundled into dist/, not copied by
build-dist.mts), so a correct consumer-footprint staging must carry the
whole non-node_modules tree, matching exactly what
shipped-entrypoints.mts's own stageConsumerCopy does. Not a product bug,
a staging-scope correction.

With CLAUDE_PLUGIN_ROOT unset (documented per instructions, not a PASS/
FAIL condition -- spec requires only the set case): `loop.js list-presets`
and `loop.js install --preset dotnet-python` both rc 1, ENOENT scanning a
nonsensical path three directories above the staged root
(`config-resolver.mts`'s unset-env fallback resolves relative to the
bundled dist/loop.js's own dirname, which under the single-file bundle
no longer sits at the pre-bundle depth assumed by that fallback chain).
This only matters if CLAUDE_PLUGIN_ROOT is ever omitted in production,
which the hook/CLI contract does not do.

AC-3 (otel-post-tool-use.js, no @opentelemetry packages): PASS. Verified
zero `@opentelemetry` paths anywhere in the staged tree. With
CREW_OTEL_ENABLED=1, a consumer `.claude/crew/telemetry.yaml` containing
`enabled: true`, CLAUDE_PROJECT_DIR and the payload's `cwd` both set to
the consumer directory as a native Windows backslash path, two separate
invocations of `bun dist/hooks/otel-post-tool-use.js` each returned rc 0
and each appended exactly one `otel_unavailable` line to
`.claude/logs/events.jsonl` (2 runs -> 2 lines total). The in-process
`warnedMissingDeps` one-shot guard is per-process, so "exactly one line"
holds per invocation as the AC requires; it does not dedupe across
separate hook invocations, which is expected (every hook call is a fresh
Bun process).

AC-4 (build:dist --check staleness + Bun-version pin): PASS. Clean tree:
`bun run build:dist -- --check` -> rc 0, "dist/ is up to date". A
behavioral (non-comment, non-dead-code) edit to `hooks/pre-push-gate.mts`
(added a branch to `isPushCommand`'s regex) -> rc 1, correctly naming
`hooks/pre-push-gate.js` as stale; reverted (`git checkout --`) -> rc 0
again. Note for future edits to this check: a comment-only addition and
an unused top-level `const` both did NOT trip staleness detection in two
earlier attempts -- Bun's bundler evidently drops both as part of normal
bundling even with `minify:false`, so `--check`'s byte-compare only
detects edits that change bundled, reachable code, consistent with the
AC's own wording ("non-comment edit"). Bun-version mismatch: temporarily
set `.bun-version` to `9.9.9` -> both `build:dist` and `build:dist
--check` rc 1 with a clear "Bun version mismatch" message naming pinned
vs running versions; reverted -> rc 0 again.

AC-5 (hooks.json / repo-boundary / metrics-band / gate-count agreement):
PASS. All 20 `bun` commands in `hooks/hooks.json` match
`bun "${CLAUDE_PLUGIN_ROOT}/dist/hooks/<name>.js"` and every named file
exists under `dist/hooks/`. All 17 non-bun (`node`/`bash`) commands are
byte-identical to `git show 5fe21f91:hooks/hooks.json`.
`validate-repo-boundary.mts` -> rc 0; `--write-inventory` rewrote
`docs/planning/hooksjson-crew-path-inventory.json` with an empty `git
diff` afterward (byte-identical). `generate-metrics-band.mts --check` ->
rc 0. `docs/ci-gates.md` and `CLAUDE.md`'s `## CI gates` list both
enumerate exactly 43 contiguous gates (1-43), and gate 21 is
`build-dist.mts --check` in both.

Regression: `bun run typecheck` (3 tsc projects: root tsconfig.json,
tsconfig.test.json, crew/tsconfig.json) -> all rc 0, no errors. `bun test
src/tests/ --parallel --timeout 60000` -> 3502 pass, 7 skip, 1 fail
(3510 total, 344 files); the 1 failure is the same designed-red AC-1
ratchet assertion discussed above. Confirmed the identical single
failure (same assertion, same file) also occurs on the main checkout
(C:\work\mega\devcrew, read-only, HEAD 5cc59c58) when run standalone --
not a regression introduced by this slice. `cd crew && bun test
--timeout 60000 tests/ --parallel` -> 1793 pass, 117 skip, 0 fail (1910
total, 182 files) -- fully clean.
- Evidence Collected:
  - Commands run and key output (worktree C:\work\mega\devcrew\.claude\worktrees\agent-a9ce58c806db416b7
  - HEAD 2041ce35
  - except staged-copy commands as noted):

AC-1: `bun test src/tests/install/consumer-smoke.test.mts`
  -> 2 pass
  - 1 fail. newlyBroken=[]
  - nowPassing=[]; only designed-red
  assertion (c) failed (EXPECTED_FAIL non-empty
  - 42 CLI-only entries
  - DEC-044).

AC-2 (staged full non-node_modules copy
  - CLAUDE_PLUGIN_ROOT=<staged root>):
  `bun --no-install dist/crew.js install-global` -> rc 0
  - JSON welcome output.
  `bun --no-install dist/crew.js init --repo <tmp1> --allow-existing` -> rc 0
  - 15 files written.
  `bun --no-install dist/crew.js cost-setup --repo <tmp1>` -> rc 0
  - feature list JSON.
  `bun --no-install dist/loop.js list-presets` -> rc 0
  - 5 presets listed.
  `bun --no-install dist/loop.js install --repo <tmp2> --preset dotnet-python` -> rc 0
  - writes list incl. .claude/loop.json.
  Same two loop.js commands with CLAUDE_PLUGIN_ROOT unset -> both rc 1
  - "ENOENT: no such file or directory
  - scandir '...\\claude\\scripts\\presets'"
  (documented; spec requires only the set case).

AC-3 (CREW_OTEL_ENABLED=1
  - consumer .claude/crew/telemetry.yaml enabled:true
  - CLAUDE_PROJECT_DIR + payload cwd = native Windows path to consumer dir
  - staged copy has zero @opentelemetry anywhere):
  Run 1: `bun --no-install dist/hooks/otel-post-tool-use.js < payload.json`
    -> rc 0; stderr "[features] otel-telemetry: enabled" + "crew-otel:
    telemetry deps not installed
  - bridge disabled. ... Cannot find module
    '@opentelemetry/api' ..."; events.jsonl: 1 line
  - type otel_unavailable.
  Run 2: same command again -> rc 0; events.jsonl: 2 lines total (1 new
    line appended)
  - both type otel_unavailable.

AC-4:
  `bun run build:dist -- --check` (clean tree) -> rc 0 "dist/ is up to date".
  After editing hooks/pre-push-gate.mts isPushCommand() regex (added a real
    alternation branch) -> rc 1 "stale dist/ output for: hooks/pre-push-gate.js".
  `git checkout -- hooks/pre-push-gate.mts` -> rc 0 again.
  `.bun-version` set to "9.9.9" -> `build:dist` rc 1 and `build:dist --check`
    rc 1
  - both: "Bun version mismatch — .bun-version pins 9.9.9
  - running 1.3.14."
  `.bun-version` restored to "1.3.14" -> rc 0 again.

AC-5:
  hooks.json: 20/20 bun commands match `bun "${CLAUDE_PLUGIN_ROOT}/dist/hooks/<name>.js"`
  - all 20 target files exist under dist/hooks/. 17/17 non-bun commands
    byte-identical to `git show 5fe21f91:hooks/hooks.json` (0 mismatches).
  `bun src/scripts/validate-repo-boundary.mts` -> rc 0 "validate-repo-boundary: OK".
  `bun src/scripts/validate-repo-boundary.mts --write-inventory` -> rc 0;
    `git diff --stat docs/planning/hooksjson-crew-path-inventory.json` empty.
  `bun src/scripts/generate-metrics-band.mts --check` -> rc 0 "README.md metrics band is up to date".
  docs/ci-gates.md numbered list: 43 entries (1-43)
  - contiguous; gate 21 = build-dist.mts --check.
  CLAUDE.md `## CI gates` list: 43 entries (1-43)
  - contiguous; gate 21 = build-dist.mts --check.

Regression:
  `bun run typecheck` -> rc 0 (root tsconfig.json + tsconfig.test.json).
  `cd crew && bunx tsc --project tsconfig.json --noEmit` -> rc 0.
  `bun test src/tests/ --parallel --timeout 60000` -> 3502 pass
  - 7 skip
  - 1 fail
  - 1686 expect() calls
  - 3510 tests / 344 files. Sole failure:
    src/tests/install/consumer-smoke.test.mts assertion (c)
  - same as AC-1.
  Same test file run standalone on main checkout (C:\work\mega\devcrew
  - read-only
  - HEAD 5cc59c58): also 2 pass / 1 fail
  - identical assertion —
    confirms pre-existing
  - not a regression from this slice.
  `cd crew && bun test --timeout 60000 tests/ --parallel` -> 1793 pass
  - 117 skip
  - 0 fail
  - 4340 expect() calls
  - 1910 tests / 182 files.
- Files / Surfaces Checked: -
- Risks: -
- Required Follow-up: -

