# Handoff — dev-team v0.41 lead→dispatcher rename drift cleanup

- **Type**: handoff (cross-repo work performed in `C:\work\mega\dev-team`, artifact hosted here per convention)
- **Requested by**: team-lead
- **Objective**: finish the incomplete v0.41.0 `lead` → `dispatcher` rename in dev-team — drift cleanup only, no new renames.
- **Reference**: `.claude/artifacts/crew/runs/20260716T132510Z-research-lead-to-dispatcher-inventory.md` (this repo) — the cross-repo research inventory that scoped the fix list.

## Owner

This session, working in an isolated worktree/branch (no shared ownership).

## Scope

**Allowed** (mechanical drift fix, matches inventory's Slice A):
- `skills/workflow/dispatcher-routing/SKILL.md`, `skills/workflow/dispatcher-orchestration/SKILL.md` — stale H1 headings (`# Lead Routing` / `# Lead Orchestration Reference`) despite frontmatter/directory already saying `dispatcher-*`.
- `.claude-plugin/plugin.json` — marketplace `description` still said "lead-guided".
- `README.md` — self-contradiction (line 11 says no `lead` role exists; rest of file still addressed "the lead" + a stale 12-agent/model roster).
- Verify `tests/dispatch-timing-pre-tap.test.ts:82` (flagged in a 2026-06-22 review artifact as a possible unfixed regression).
- Run/extend `NO_LEAD_REF_REQUIRED` gate (`scripts/validate-agents.ts`) — did not need extension, already passes.

**Forbidden** (explicitly out of scope, left untouched):
- `scripts/crew.ts:768` (`to: flags.to ?? "lead"` handoff default) and `scripts/lib/approvals.ts:98` (role-classification return value `"lead"`) — live cross-plugin program values, separate pending decision.
- `escalated_to_lead`/`escalated_to_dispatcher` badge alias pair.
- Any agent rename, `CHANGELOG.md` history, `docs/upstream-requests/**`, `docs/design/**`, other artifacts.
- Any commit in the main dev-team working tree (worktree-only); no force-push.

## Deliverable

- Branch: `fix/lead-rename-drift` (worktree `C:\work\mega\dev-team-wt-drift`, based on `origin/main` @ `e53cf005`)
- PR: **https://github.com/astragenie/dev-team/pull/240** — "fix(docs): finish v0.41 lead->dispatcher rename drift"
- Commit: `1167d635` (single commit, conventional message, `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`)

## Changed files (7)

- `.claude-plugin/plugin.json` — description "lead-guided" → "dispatcher-guided"
- `README.md` — 5 "the lead" prose spots swept to "the dispatcher"; "Agent models" table and the `agents/` line in "Project structure" rebuilt from the real 23-agent roster (cross-checked against each agent's frontmatter `model:` field, not invented)
- `commands/design.md`, `commands/review.md`, `commands/validate.md` — H1s `# ... In The Lead Workflow` → `# ... — Dispatcher Workflow` (matches the convention already used by `build.md`/`fix.md`; found during a broader grep sweep, not in the original fix list — same drift class)
- `skills/workflow/dispatcher-routing/SKILL.md` — H1 fixed
- `skills/workflow/dispatcher-orchestration/SKILL.md` — H1 fixed, plus 2 leftover body-prose "Lead" mentions ("Lead runs on Sonnet…", "Lead-only (do NOT delegate)…") found while sweeping the same file — also fixed, same drift class

## Gate outputs

All run from the worktree after `npm ci` (fresh `node_modules`, none existed post `worktree add`):

| Gate | Result |
|---|---|
| `node ./scripts/validate-manifests.ts` | OK — `crew@0.66.0` |
| `node ./scripts/validate-skills.ts` | OK — 71 skills (10 pre-existing unrelated warnings) |
| `node ./scripts/validate-agents.ts` | OK — 23 agents + 9 3rdparty; `NO_LEAD_REF_REQUIRED` passes |
| `node ./scripts/validate-slices.ts` | OK (no output = pass) |
| `node ./scripts/validate-workflows.ts` | OK — 4 workflows |
| `node ./scripts/validate-agent-refs.ts` | OK — no phantom refs |
| `node ./scripts/validate-dispatch-graph.ts` | OK — clean DAG, 10 nodes |
| `CREW_VALIDATE_ROUTING_TABLE=1 node ./scripts/validate-routing-table.ts` | advisory warnings only, pre-existing, unrelated |
| `bun run lint` | clean |
| `bun run format:check` | clean |
| `bun run typecheck` | clean |
| `node ./scripts/e2e-smoke.ts` | all scenarios PASS |
| `bun test tests/dispatch-timing-pre-tap.test.ts` | **17/17 pass** |
| `SHARD_TOTAL=3 bun run test:shard` (×3, matches CI matrix) | **flaky locally** — see below |

### Test-5 verdict (the specifically-flagged regression)

`tests/dispatch-timing-pre-tap.test.ts:82` is **green**, not broken. The `crew:lead` test case referenced in the 2026-06-22 review artifact has already been replaced with a comment ("crew:lead removed in v0.41 hard cut — lookup now returns 'unknown'") plus a `lookupAgentModel("crew:nonexistent-agent-xyz") → "unknown"` style assertion. Nothing needed fixing here; the review artifact's concern was stale.

### Sharded suite flakiness (not a regression from this PR)

Running `SHARD_TOTAL=3 SHARD_INDEX={0,1,2} bun run test:shard` locally (Windows, Bun 1.3.14) produces `NotImplementedError: test() inside another test()` failures in shard 0 and (on a rerun) shard 2, with pass/fail flipping between runs on identical code. This reproduces **`bun#5090`**, which dev-team's own `CLAUDE.md` already documents as the reason `--parallel` was removed from `bun run test`. Confirmed pre-existing by `git stash`-ing all 7 changed files and re-running shard 0 against the *unmodified* base commit: identical failure signature. My changes touch only `.md`/`plugin.json` description text — no test or source file. CI runs these shards on a Linux self-hosted runner (`runs-on: self-hosted` in `.github/workflows/test.yml`), which may not reproduce this Windows-specific engine crash/race, but that could not be verified from this environment — **the PR's CI run itself is the authoritative check**, not this local repro.

## Confidence

High on the fix content (each edit is either a direct heading/description swap or cross-checked against the live agent roster on disk). Medium-high overall only because of the unresolved local test-shard flakiness — recommend checking the PR's actual CI run before merge, since local Windows Bun behavior diverges from the Linux self-hosted runner CI uses.

## Risks / open questions

- The three `commands/*.md` H1 fixes (`design.md`, `review.md`, `validate.md`) were **not** in the original team-lead fix list — found via an independent grep sweep of `commands/|skills/|agents/` (excluding `3rdparty/`) for the `NO_LEAD_REF_REQUIRED` regex pattern. Same drift class as the two SKILL.md H1s explicitly assigned; included as in-scope "drift cleanup," not a new rename. Flagging in case the operator wants to review this expansion of the literal fix list before merging.
- The two body-prose fixes inside `dispatcher-orchestration/SKILL.md` (beyond its H1) were similarly discovered mid-sweep, not pre-listed.
- Did **not** touch `docs/design/**`, `docs/research/**`, or `docs/upstream-requests/**` docs that the original research inventory flagged as also treating "lead" and "dispatcher" as live synonyms (inventory §4) — those are a separate, not-yet-scoped slice.
- Did **not** touch the personal `~/.claude/crew/constitution.md` Team Roles `lead:` line — the inventory notes this is outside repo scope, operator-only.

## Suggested next handoff

1. Operator/team-lead: watch PR #240's actual GitHub Actions run (Linux self-hosted) to confirm the `test` matrix job is green there, since local Windows reproduction of `bun#5090` couldn't be used as a clean signal.
2. If the `commands/*.md` scope expansion is unwanted, ask for those 3 files to be reverted from the PR before merge — otherwise merge as-is.
3. Separate, not-yet-scoped follow-up (inventory Slice B): decide + migrate the wire-relevant `"lead"` values in `scripts/crew.ts:768` and `scripts/lib/approvals.ts:98`, coordinated with runner-plugin's `escalated_to_lead`/`escalated_to_dispatcher` alias.
4. Separate follow-up (inventory §4): sweep `docs/design/**` / `docs/research/**` docs that still treat "lead" and "dispatcher" as synonyms.
