---
decision: approved
reviewer: crew:reviewer
slice: FEAT-post-baseline-delta-port
reviewed_commits: [bb0dcbca]
---

# Review — port post-baseline dev-team delta (2d4fa713..7e4e1ba6)

## Summary

Commit `bb0dcbca` ports 6 of 24 post-baseline dev-team commits into devcrew's
`crew/` subtree: SubagentStop gate-guard + PreToolUse artifact-lock hooks
(flipped to block mode), a repair-signature dedup CLI wired into three
auto-fix retry loops, qa-expert/test-automator pre-build-QA-gate modes, an
orchestrate-slice preset-path fix (adapted for the unified plugin), and a
lead→dispatcher wire-value rename. Disposition table honesty verified by
direct spot-check against the read-only `dev-team` reference repo (not just
trusting the table's prose). Hook fidelity verified by full diff against
dev-team originals AND by live-exercising both newly block-mode-flipped
hooks with synthetic payloads (positive block + negative-control pass
cases) — this closes the "no live e2e smoke" residual risk the builder
flagged, rather than leaving it as an assessed-but-unverified risk.
**Decision: approved.**

## 1. Disposition table honesty — spot-checked, all accurate

- **Row 2-6 (SUPERSEDED, bun:test migration)**: claim is "0 files under
  `crew/tests` import from `node:test`, 181 import from `bun:test`" —
  independently reran both greps: `grep -rl '"node:test"' crew/tests/` = 0
  files, `grep -rl '"bun:test"' crew/tests/` = 181 files. Exact match.
- **Row 15/19 (SUPERSEDED, GEPA champion-provenance)**: claim is that
  `champion-provenance-writer.ts`/`optimize-runner.ts` (the auto-promotion
  pipeline) don't exist in devcrew, cut per DEC-021. Confirmed: neither file
  exists anywhere under `crew/`. `gepa-killswitch-cmds.mts` (also touched by
  dev-team's #260) DOES survive — but it's the kill-switch/revert/thaw
  surface DEC-021 explicitly keeps, not the optimize/promote pipeline it
  guards; no `commands/gepa-optimize.md` and no `"gepa-optimize"` entry in
  `crew.mts`'s `COMMANDS` map confirms the actual optimize/candidate-gen
  path is genuinely absent, matching DEC-021's title ("keeps eval/history/
  killswitch surface only; optimization pipeline deleted") read directly
  from `.claude/artifacts/loop/decisions/DEC-021.md`.
- **Row 9-13 (SKIP, forbidden `.github/workflows/*`)**: pulled the actual
  `--stat` for all 5 commits (`4c189e0f`, `81f4925c`, `3f65b394`,
  `1c8b85c9`, `93bc6ab0`) from dev-team directly — every one touches
  `.github/workflows/*.yml` exclusively. Confirmed forbidden-scope
  classification is correct, not a laundered skip.
- **Row 1 (PARTIAL PORT, lead→dispatcher rename)**: `approvals.ts` absence
  confirmed (`find crew/scripts -iname "approvals*"` → nothing). The ported
  pieces (`claims.mts`'s `normalizeOwnerAlias`, `deployment-guidance/
  write.mts`'s owner default, `validate-routing-table.mts`'s `"lead"` token
  removal) read cleanly on direct diff — the alias-normalization approach in
  `claims.mts` is a sensible touch beyond a bare find/replace (handles a
  session still holding claims under the pre-rename `"lead-session"`
  identity). The "zero live 'lead' hits in routing-table.md before removal"
  claim was independently reconfirmed via grep against the live file.
- **Row 14 (qa-expert/test-automator port, `loop.qa_gate: "pre-build"`
  dependency)**: this repo's own `.claude/loop.json` does NOT currently set
  `qa_gate: "pre-build"` (grep found nothing) — but the ledger's claim is
  about the *mechanism* being live in devcrew (implemented, documented,
  tested), not that this repo's own dogfood config has opted in. Confirmed:
  `src/scripts/lib/qa-gate-config.mts`, `docs/halt-badges.md:395-420`
  (`resolveQaGateMode`, default resolves to `"post-build"` when absent —
  opt-in by design) are real and match the doc's description exactly. Claim
  holds; not a defect.

## 2. Ported hook fidelity — behavior-identical, diffs are comment/import-only

Diffed every ported file against its dev-team original line-by-line:

- `crew/hooks/lib/subagent-gate-guard.mts` vs `hooks/lib/subagent-gate-guard.ts`:
  zero code differences — every line of logic, regex, and control flow is
  byte-identical; only two comment-string tweaks (header attribution, block
  reason text) and `.ts`→`.mjs` import specifiers.
- `crew/hooks/lib/pre-tool-use-artifact-lock.mts` vs the dev-team original:
  46-line diff, **entirely** comments/imports/prose (dev-team-specific
  terminology like "runner-plugin"/"runner:close" adapted to devcrew's own
  "runner subsystem"/"slice-close" language) — the matcher set, path
  resolution, lock-matching, and TTL logic are untouched, confirmed by the
  diff containing zero lines outside comment blocks and two import lines.
- `crew/hooks/lib/warn-first-flag.mts`: one comment-line diff only.
  `crew/hooks/{subagent-gate-guard,pre-tool-use-artifact-lock}.mts` shims:
  comment/import-only diffs against their dev-team counterparts; process-I/O
  structure (stdin read, `main().catch()` fail-open pattern) unchanged.
- **MultiEdit/NotebookEdit matcher + `notebook_path` handling**: confirmed
  present — `FILE_PATH_TOOLS = new Set(["Write", "Edit", "MultiEdit"])` plus
  an explicit `NotebookEdit` → `tool_input.notebook_path` branch, matching
  dev-team's #264 bypass-fix shape exactly.
- **`hooks.json` registrations**: `SubagentStop` gets `subagent-gate-guard.mts`
  appended into the existing hook chain (after `check-reviewer-decision.mts`/
  `check-builder-terminal-state.mts`, before the astrarunner-emit/capture/
  report-gate telemetry hooks — sensible ordering, gate checks before
  telemetry). `PreToolUse` gets a new `"Write|Edit|MultiEdit|NotebookEdit"`
  matcher block for `pre-tool-use-artifact-lock.mts`. Both entries use the
  same `bun "${CLAUDE_PLUGIN_ROOT}/crew/hooks/*.mts"` invocation shape and
  lack-of-explicit-`timeout` convention as every other `crew/hooks/*.mts`
  entry in the file — consistent, not a one-off.

## 3. Block-mode flip — live-smoked, not just risk-assessed

The builder correctly flagged that the block-mode flip (`.claude/crew.json`
`gate-guard.enabled: true`, `artifact-lock.enabled: true` — both confirmed
present) went in without a live e2e hook smoke. Rather than accepting that
as an open risk, I built one:

- **gate-guard, positive**: synthetic `.claude/state/crew/workflow-state.json`
  with `currentRun.gates.review.status: "failed"`, piped a `SubagentStop`
  payload for `crew:fullstack-dev` with `last_assistant_message: "DONE: ..."`
  through `crew/hooks/subagent-gate-guard.mts` → returned
  `{"decision":"block", "reason": "...review gate is \"failed\"..."}`
  and wrote a `gate-guard:blocked-red-gate` event to `.claude/logs/events.jsonl`.
- **gate-guard, negative controls**: same red gate, but (a) a `BLOCKED:`
  report and (b) a non-builder-tier agent (`crew:reviewer`) both produced
  empty output (pass-through) as designed — confirms the guard isn't
  blanket-blocking everything with the gate red.
- **artifact-lock, positive**: synthetic lock file at
  `.claude/state/loop/artifact-locks/SLICE-999.json` locking one path;
  `Write` to that exact path through `crew/hooks/pre-tool-use-artifact-lock.mts`
  → `{"decision":"block", "reason": "...locked by \"qa-gate\" for SLICE-999..."}`.
- **artifact-lock, negative control**: `Write` to an unlocked path → empty
  output (pass-through).
- **artifact-lock, #264 bypass-fix targets**: `NotebookEdit` with
  `tool_input.notebook_path` set to the locked path, and `MultiEdit` with
  `tool_input.file_path` set to the locked path — both correctly blocked,
  confirming the original bypass vectors dev-team#264 closed are genuinely
  closed here too, not just present in source but unexercised.

All fixture files were created under a scratch directory and removed after
the run; no repo state was left behind.

## 4. `repair-check` CLI — live-verified end to end

- `bun crew/scripts/crew.mts repair-check --help` → clean usage text,
  matches the module's documented contract.
- `bun test crew/tests/repair-signature.test.mts crew/tests/cli-repair-check.test.mts`
  → **17 pass, 0 fail**.
- Live-exercised the actual signature/shouldStop transition: first call
  (no `--prev-signature`) → `shouldStop: false`; second call with
  `--prev-signature` set to the first call's returned `.signature` (same
  failure text) → `shouldStop: true`, confirming the dedup logic fires
  exactly as documented, not just in the unit fixtures.
- `commands/fix.md`/`incident.md`/`ship.md` wiring reads coherently: the
  inserted `repair-check` step and its renumbered surrounding steps are
  self-consistent. One apparent inconsistency I chased down and ruled out:
  `ship.md`'s Step-2.5-equivalent "Profile injection" bullet references
  "Step 3 (Both PASS path)" and "Step 4 below" — these are **outer**
  `## Step 3 — Auto-fix loop` / `## Step 4 — Escalate on retry exhaustion`
  headings (a distinct numbering scheme from the inner `1./2./3./3a.`
  per-section lists the port renumbered), confirmed by grepping every
  `## Step N` and `Step N` reference across the file — not a broken
  cross-reference introduced by the renumbering.

## 5. `orchestrate-slice.md` Step 2.5 adaptation — live-verified

- `grep -n "LOOP_ROOT\|LOOP_PLUGIN_ROOT\|PRESET_NAME" commands/orchestrate-slice.md`
  → zero hits; the separate "loop plugin" discovery block is fully removed,
  as claimed.
- Real paths confirmed: `src/scripts/loop.mts` exists,
  `"resolve-skills"` is a real branch in its command dispatch.
- Live-ran the exact invocation the doc now specifies against this repo's
  own config: `bun src/scripts/loop.mts resolve-skills --variant single
  --preset .claude/loop.json` → returned a real `dispatchInstructionBlock`
  sourced from `preset.skills`. Also ran `--variant fe` (a variant this
  repo's own config has no explicit split for) → `warn: no skills resolved
  for this variant (split mismatch or empty array)`, exit code 2 — exactly
  matching the doc's documented "CLI exits 2 → empty block" fallback
  behavior, live-confirmed rather than assumed from reading the code.

## Findings

None blocking. No LOW/MEDIUM findings from this pass — every claim checked
resolved cleanly, and the live smoke tests (not originally planned by the
builder) came back clean on both hooks' positive and negative paths.

## Decision rationale

`approved`. This is a well-scoped, honestly-dispositioned port: every one
of the 24 upstream commits has a recorded, independently-verifiable reason,
the 6 ported commits are faithful adaptations (diffs are comment/import/
terminology-only where dev-team's logic was reused verbatim), and the
highest-risk piece — flipping two hooks to block mode without a prior live
smoke — has now been exercised end-to-end with both positive and negative
synthetic payloads, closing that residual risk rather than leaving it
theoretical. `repair-check` and the `orchestrate-slice` adaptation were
both run live against real repo state, not just read. Targeted test files
(not the full suite, per lead's instruction — full suite already verified
separately): `migrate-adopter` n/a to this review;
`repair-signature.test.mts` + `cli-repair-check.test.mts` (17/17),
`subagent-gate-guard.test.mts` + `pre-tool-use-artifact-lock.test.mts`
(36/36).
