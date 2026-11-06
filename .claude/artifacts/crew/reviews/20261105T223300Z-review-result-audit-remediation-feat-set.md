---
kind: review-result
reviewer: crew:reviewer (model: fable)
subject: FEAT-022..032 + docs/superpowers/plans/2026-11-05-audit-remediation-waves.md
decision: rejected
created_at: 2026-11-05T22:33:00Z
confidence: high
---

# Independent review — audit remediation FEAT set

**review_decision: rejected** (5 blockers, 23 majors). Structurally sound as
a wave plan; five FEATs carry ACs that cannot pass on this tree, two violate
listed never-do rules, three cited file paths do not exist here.

## BLOCKERS

1. **FEAT-028 AC-1/AC-5** — `STATUS: DONE|...` block matches neither
   `incomplete-detector.mts:19` `/^(DONE|BLOCKED|HELP|HELP-REQUEST|IN-PROGRESS)\s*:/im`
   nor `subagent-gate-guard.mts:52` `/^DONE\s*:/im` → every builder blocked
   as "no terminal state", gate-guard never fires. Fix: line 1 =
   `DONE: <headline>` (marker first), then FILES / TESTS / NEXT.
2. **FEAT-030** — constitution include is inside `<!-- crew:start -->`
   (CLAUDE.md:201), "First action" line inside `<!-- runner:start -->`
   (221); both installer-owned, never-hand-edit. Source:
   `crew/scripts/lib/installer/templates.mts:15`,
   `templates/claude-md-hard-rules.md` (product surface). Rescope to
   templates + `/devcrew:install` re-run; hand-edit only line 227.
3. **FEAT-030 AC-1** — 12,288 B budget equals CLAUDE.md's size to the byte;
   chain after removing both includes ≈ 27,705 B incl. ~/.claude files →
   non-hermetic. Fix: repo-rooted includes only, budget 24,576 B.
4. **FEAT-022 vs FEAT-026** — fixed CLI list runs `crew.mts`; FEAT-026
   defers the rewrite → smoke stays red; FEAT-026 AC-1 unreachable. Fix:
   derive CLI entries from `bun "${CLAUDE_PLUGIN_ROOT}/<path>"` strings in
   commands/*.md + agents/*.md; FEAT-026 AC-1 = hooks only + declared
   expected-fail list.
5. **FEAT-032** — `claude plugin install --from` does not exist on 2.1.270;
   "add-local-path" fallback registers a local marketplace (listed
   never-do). Fix: `claude --plugin-dir <pluginCopy>` with
   stageConsumerCopy output; AC-4 "pluginCopy has no node_modules and
   events.jsonl shows zero hook_error rows". Delete the fallback sentence.

## MAJOR (23)

- FEAT-024: `--status in-progress` stubs and `--scaffold` carry no decision
  and tests assert exit 0 (`artifact-stub-and-update.test.mts:155-180,
  296-320`); a stub registers verdict undefined → review_passed. AC-1 → exit
  2 only when `--status completed`/absent and no `--scaffold`; AC-6 →
  stub/scaffold exit 0, gates.review unchanged. Scope += `write.mts`
  (:112, :283). `--required-reviewers` = second source of truth vs
  `reviewers.ladder` (loop.json:66-70); default from ladder via
  workflow-config.mts. GateEntry (workflow-state-gates.mts:22-27) gains
  reviewers?/validators?; validate-badges + review-gate.mts must stay green.
- FEAT-025: real transcript model ids are `claude-fable-5-1`,
  `claude-sonnet-5` — not `-5-5`; prefix match makes `claude-opus-4-9` hit
  `claude-opus-4`; §3.7 has no cache-write rates. `<fill title>` writer is
  `src/scripts/lib/grade-writer.mts:203` (not write.mts); decide.mts:31 enum
  pass|warn needs `unknown`. pricing.json under dist/ → inline via
  `with { type: "json" }`.
- FEAT-026: hooks.json rewrite empties the crew-path inventory (gate 9);
  new gate in CLAUDE.md fails gate 20 until README band regen; byte-compare
  flakes across Bun versions (pin + normalise CRLF/banner + build-info);
  OTel-enabled path still crashes (AC-6); `.mjs` copies are dead (bun entries
  only); fast-gate is the reusable workflow at ci.yml:125 → new gate 21,
  renumber 21-42 in both lists.
- FEAT-027: `docs/routing-table.md` is `crew/docs/routing-table.md:64`;
  dispatcher-routing SKILL says "reviewer + verifier concurrently" (:36,41),
  "No verifier dispatch" is fix.md:116; orchestrate-slice cites test.yml
  (:509,537,548). Skip decision is config-driven already
  (`validation-gate.mts:243 deriveValidationGate`,
  `config-resolver.mts:213 satisfiedByReview`) → make deriveValidationGate
  honour satisfiedByReview only when hasConsumerCi present. AC-3 is prose.
- FEAT-028: no-relative-script-path fires on 11 lines, 7 in agents outside
  scope (architect.md:158,196; reviewer.md:116,180; verifier.md:170;
  aiplugin-dev.md:156,158). backend-dev.md is 299/300 lines.
  `crew/scripts/validate-agent-refs.mts` does not exist (it is
  `src/scripts/validate-agent-refs.mts`, gate 6) — also wrong in FEAT-029 and
  the wave plan.
- FEAT-029: repo-path-exists dry run → 29 missing paths (routing-table,
  model-selection, badge-catalog, code-reviewer, backlog-enrich,
  git-commit, placeholders DEC-NNN / feat-NNN). Needs NNN/`<` exemption +
  allowlist. Codex #6 (peer-dispatch rule only fires when `tools:` lists
  Agent; `validate-agents.mts:155-215`) and #13 (jq fail-open,
  build.md:53,64; fix.md:55,66) have no deliverable anywhere.
- FEAT-030: no e2e job (ci.yml:49); only retry is slow-tests
  max_attempts=2 with cause at :205-212; `capture-perf.test.mts` missing —
  second bench is `log-event-async-bench.test.mts`; test:crew runs
  `bun test tests/` so a perf/ subdir excludes nothing; root `bench` exists.
- FEAT-031: `onFailure:"block"` honoured only on PreToolUse,
  UserPromptSubmit, UserPromptExpansion, ConfigChange, PreCompact,
  PreModelSwitch — ignored on SubagentStop; no hyperfine on host; no baseline
  here; proposed_slices miss build-dist/dist/inventory; SLICE-5 tests after
  untested code; `commands`/`agents` dirs as touches_files; `crew/hooks/
  hooks.json` dead rump; nothing writes PreToolUse/PostToolUse/Stop rows →
  dispatcher must log `hook_dispatch` rows.
- FEAT-022: six `log_event.sh` entries have no runtime prefix; runtime
  "bash" branch + skip message; AC-2 asserts the distinct file set.
- FEAT-032: only 6 baseline rows literally say FAIL → AC-1 "every row not
  PASS/n/a"; skill discovery undeclared and 44 MB cache have NO FEAT.

## MINOR

FEAT-023 AC-4 fold into docs-only test; AC-5 literal strings; FEAT-026
`.mjs` copies dead; FEAT-030/031 both "create" audits README → "create if
absent"; FEAT-027 AC-3 is an LLM-prose claim; FEAT-022 red test turns gate
41 red through wave 1 (survivable; say so); line-drift notes
(handleReviewResult 425-444, legacy comment 418-424); depends_on
026→023 and 030→026 are conflict-avoidance only; FEAT-031 AC-3 must cite
FEAT-028 block format; Codex #18-#23 all covered.

## Coverage (smoke-baseline row → closing FEAT)

node_modules absent → 026/022/032 · pre-tool-use-agent, otel-post-tool-use
(disabled path), subagent-gate-guard, pre-push-gate → 026 · crew.mts
brief-me / show-workflow-state → 026 + path rewrite · timeout/onFailure →
031 (PreToolUse only) · CI exemption + gate → 023 · --decision + last-writer
→ 024 · parallel target, fix badge, light path, reviewer path, stub
analyzers → 029 · **skill discovery undeclared → NONE** · **44 MB cache →
NONE** · **Codex #6, #13 → NONE** (cited as closed by 029/032).

## Still broken for a consumer if every AC passes

1. Slash commands crash until the path rewrite. 2. `.sh` hook entries
untested on Windows. 3. Data-file reads under dist/ ENOENT. 4. OTel-enabled
installs crash. 5. SubagentStop never fail-closed at runtime level. 6.
Skills undeclared + 44 MB cache. 7. Installed runner "First action" path
drift unchanged.

## Top 5 edits

1. FEAT-028 block: marker first. 2. FEAT-022/026: command-derived CLI
entries + expected-fail list + dist data-file AC. 3. FEAT-030: templates
scope, 24,576 B repo-rooted budget, drop e2e, real bench files to
crew/bench/. 4. FEAT-032: `--plugin-dir`, corrected closure list, AC-1
wording. 5. FEAT-024: scaffold exemption, ladder as source of truth, fix
three validate-agent-refs path citations.
