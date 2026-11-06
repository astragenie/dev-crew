---
findings: "[MEDIUM] src/tests/install/consumer-smoke.test.mts — stageConsumerCopy() (src/scripts/lib/install/shipped-entrypoints.mts:244-279) is called from two separate tests with no afterAll/finally cleanup anywhere in the test file. Each call mkdtemp()s a fresh dir under os.tmpdir() and cp()s the ~269MB plugin tree into it; nothing ever removes it. On the persistent self-hosted \"slow-tests\" runner, with this test designed to stay permanently red until FEAT-026 lands and the CI retry wrapper re-running the suite up to 2 attempts per push, this leaks roughly 2-4 full plugin-tree copies (~0.5-1GB+) per push, indefinitely. Fix: add `afterAll(() => rm(base, { recursive: true, force: true }))` (or a per-test finally) around each stageConsumerCopy call.\n\n[LOW] src/tests/install/fixtures/prepush-bash.json is unused. fixtureForHookEvent() (src/scripts/lib/install/shipped-entrypoints.mts:43-47) only branches on the hook *event* name (PreToolUse/SubagentStop), never on the hook file or matcher, so every PreToolUse hook — including hooks/pre-push-gate.mts, the one this fixture's \"git push origin HEAD\" payload was presumably meant for — gets the generic pretooluse-bash.json (\"bun test ...\") instead. prepush-bash.json is listed in FEAT-022.md's fixture set and the remediation plan but is never referenced in src/. Doesn't affect correctness (hooks/pre-push-gate.mts still crashes on missing deps regardless of fixture content) but is dead code; either wire a matcher-scoped case for it or delete the file.\n\nVerified clean, no action needed: node_modules exclusion at any depth (shouldExcludeFromStaging, shipped-entrypoints.mts:220-229) checked against this repo's real crew/node_modules (true directory); fs.cp's default dereference:false means a junction/symlink named node_modules would not be dereferenced either, so the exclusion holds regardless of link type. hooks.json + commands/*.md + agents/*.md parsing is correct, dedupes by file+args+event for hooks and file+firstArg for CLI entries, and the CLI_LINE_RE/HOOK_COMMAND_RE regexes are simple anchored/negated-class patterns with no nested-quantifier ReDoS shape. The EXPECTED_FAIL ratchet (consumer-smoke.test.mts, test 1) correctly computes newlyBroken/nowPassing and unconditionally fails while EXPECTED_FAIL is non-empty, naming FEAT-022/FEAT-026 in the message. `.mjs` specifier on the relative import is correct, biome lint and `tsc --project tsconfig.test.json --noEmit` are both clean on the two new files, no process.exit, all promises awaited, 180s setDefaultTimeout present."
decision: approved_with_notes
---
# Review Result: SLICE-47 review A (typescript)

- Created: 2026-11-06T04:00:38.123Z
- Reviewer: A
- Decision: approved_with_notes
- Summary: Reviewer A (TypeScript) — SLICE-47 / FEAT-022, range a32f4f76..3da06c82.

Verdict: approved_with_notes. Core logic is correct and matches FEAT-022's
AC-1..AC-4: node_modules is excluded at every depth by path-segment match
(verified against this repo's real crew/node_modules, a true directory,
not a junction here — fs.cp's default dereference:false means a junction
would not be dereferenced in any case, so the exclusion holds either way);
the hooks.json + commands/agents markdown parsing is correct and dedupes
sensibly; the EXPECTED_FAIL ratchet correctly implements "newly broken" /
"now passing" / "stay red while non-empty" with a message naming
FEAT-022/FEAT-026. Lint, typecheck (tsconfig.test.json), `.mjs` specifiers,
awaited promises, and the 180s timeout are all clean.

Two actionable findings, neither blocking the ACs but worth tracking:

1. [LOW] src/tests/install/fixtures/prepush-bash.json is dead code.
   fixtureForHookEvent() only branches on the hook event name
   (PreToolUse/SubagentStop), never on which hook file or matcher fired, so
   every PreToolUse hook (crew/hooks/preflight-shell.mts,
   crew/hooks/pre-tool-use-bash-gate.mts, AND hooks/pre-push-gate.mts) all
   receive the generic pretooluse-bash.json ("bun test ..." command).
   prepush-bash.json ("git push origin HEAD") was created per the FEAT-022
   spec/plan fixture list but is never read anywhere in src/. It doesn't
   change the test's correctness (hooks/pre-push-gate.mts still crashes on
   missing deps regardless of which bash fixture it is fed), but it is an
   orphaned file that should either be wired to its own matcher-scoped case
   or deleted.

2. [MEDIUM] No cleanup of the mkdtemp() staging directories.
   stageConsumerCopy() creates a fresh os.tmpdir()/devcrew-install-smoke-*
   directory and copies the ~269MB plugin tree (minus node_modules/.git)
   into it, but nothing in the test file (no afterAll/finally, no rm) ever
   removes it. Two separate tests each call stageConsumerCopy independently
   (the ratchet test and the node_modules-exclusion test), so one test run
   leaks ~2 full copies; the CI slow-tests job retries up to 2 full
   attempts on failure, so each push can leak up to ~4 copies (~1GB+).
   This matters more than usual because slow-tests runs on a persistent
   self-hosted runner (not an ephemeral GitHub-hosted one), and this test
   is designed to stay permanently red until FEAT-026 lands, so the leak
   recurs on every push to this line indefinitely. Recommend adding
   afterAll/finally cleanup via rm(base, {recursive: true, force: true})
   before this merges further upstream, or at minimum opening a
   fast-follow.

Confirmed, not a defect: slow-tests (gate 41) will show red on every push
until FEAT-026 lands — this is explicitly called out and accepted in
FEAT-022.md's body ("this test is red on main through wave 1 -> gate 41
(slow-tests) red; fast-gate (the merge gate) unaffected"), and slow-tests
is not the required status check (fast-gate is), so this is intentional
debt, not a regression introduced by this diff.

Builder's reported gate results (consumer-smoke rc=1 designed-red,
hooks-discovery 4/4 pass, typecheck/lint/format/validate-imports/
validate-repo-boundary rc=0) match what I observed independently: biome
lint clean on both new files, tsc --project tsconfig.test.json clean.
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: builder gates rc=0 except the designed-red consumer-smoke (rc=1 by AC-1); hooks-discovery 4 pass, typecheck, lint, format:check, validate-imports, validate-repo-boundary
- Risks: -
- Required Follow-up: -

