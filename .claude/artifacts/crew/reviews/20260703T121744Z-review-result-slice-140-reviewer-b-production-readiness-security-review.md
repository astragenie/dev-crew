---
findings: "🔴:0,🟡:1,❓:2"
status: completed
---
# Review Result: Review Result

- Created: 2026-07-03T12:22:56.486Z
- Reviewer: inspector
- Decision: approved_with_notes
- Status: completed
- Summary: No plaintext secret path, fail-silent everywhere, and confused-deputy widening is the ratified/tested DEC-062 tradeoff (not new) -- but ingest.url-without-ingest.env lets a shell-global ASTRARUNNER_ENV silently select the wrong token-store tier for a committed URL, and that combination is untested.
- Evidence Checked:
  - Read full diff of astrarunner-ingest.mts (+174)
  - agent-report-writer.mts (+1)
  - astrarunner-ingest.test.mts (+377
  - 24 tests
  - all AC-1..AC-8b covered incl. AC-8a bearer-literal-ignored). Ran: bun test src/tests/astrarunner-ingest.test.mts (24 pass/0 fail); bunx tsc --project tsconfig.json --noEmit and tsconfig.test.json (clean); bun run lint (0 findings in touched files; unrelated pre-existing complexity warnings elsewhere). Cross-read token-store.mts::resolveBearer (pre-existing cross-tier isolation: explicit-env lookup never falls back to default tokens.json) and event-notifier.mts (Pattern-B webhook path) to confirm the confused-deputy surface is symmetric
  - not widened in kind -- matches design doc .claude/artifacts/loop/design/FEAT-215-design.md risk section which explicitly flags 'Confused-deputy surface doubles (already flagged in the FEAT
  - not new)' under ratified DEC-062/AC-7. Grepped diff for hardcoded-secret pattern: no match. Test fixture tokens (lrt_resolved
  - lrt_a/b
  - lrt_staging
  - lrt_COMMITTED_SHOULD_NEVER_BE_USED
  - etc.) are all clearly synthetic.
- Files Reviewed:
  - src/scripts/lib/slice-linker/astrarunner-ingest.mts
  - src/scripts/lib/slice-linker/agent-report-writer.mts
  - src/tests/astrarunner-ingest.test.mts
- Test Adequacy: 24/24 new+existing tests pass covering every AC (1-9) including malformed-config fail-silent paths (5a-5d), token-miss (AC-6), appId inheritance both directions (7a/7b), and committed-bearer-literal-ignored (8a); no test exercises ingest.url-set/ingest.env-absent combined with a diverging shell ASTRARUNNER_ENV.
- Risks: MEDIUM: when a repo's loop.json sets ingest.url but omits ingest.env, resolveIngestToken (astrarunner-ingest.mts:250-276) still falls through resolveEffectiveEnv (line 146-148) to a shell-global ASTRARUNNER_ENV for the token-store tier lookup, while the URL is the fixed committed literal -- in a fleet CI runner where ASTRARUNNER_ENV is set org-wide, this can silently pair a wrong-tier bearer (e.g. staging) with a committed URL for a different tier (e.g. prod). Not attacker-exploitable (shell env isn't PR-controlled) but a real fleet-misconfiguration footgun; untested and undocumented as an operator caveat. LOW: readIngestBlock() re-reads+re-parses loop.json once from resolveIngestUrl and again from resolveIngestToken (2x fs.readFile+JSON.parse per postAgentCompletions call) -- minor IO redundancy, not correctness-affecting. LOW/informational: silent skip (no url/no token) emits zero observability signal (matches pre-existing Path 2 behavior, not a regression) -- a typo'd appId or url in a 20-repo fleet rollout would silently no-op with no debug trail.
- Required Follow-up: Non-blocking: (1) add a regression test + docstring/README caution for ingest.url-set/ingest.env-absent + diverging ASTRARUNNER_ENV, or tighten resolveEffectiveEnv so an ingest.url without ingest.env does not fall through to the shell-global env for token-tier selection; (2) optional: single-read the loop.json block and thread it into both resolvers instead of reading twice; (3) optional follow-up FEAT: debug-level (non-secret) skip-reason logging for the direct sink.

