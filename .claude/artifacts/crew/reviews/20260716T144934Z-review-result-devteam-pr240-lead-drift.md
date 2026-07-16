# Review result — dev-team PR #240 (v0.41 lead→dispatcher rename drift cleanup)

- **Type**: review result (independent, correctness + AC coverage)
- **Reviewed by**: this session (dt-drift-cleanup review)
- **Target**: `astragenie/dev-team` PR #240, branch `fix/lead-rename-drift`, commit `1167d635`, base `origin/main@e53cf005`
- **Repo inspected**: `C:\work\mega\dev-team-wt-drift` (builder's worktree, branch checked out)
- **Reference docs**: `.claude/artifacts/crew/runs/20260716T132510Z-research-lead-to-dispatcher-inventory.md`, `.claude/artifacts/crew/handoffs/20260716T144622Z-handoff-dev-team-v0-41-lead-dispatcher-rename-drift.md`

## review_decision: APPROVE

## Summary

Docs/manifest-only cleanup, exactly as scoped. All claims in the handoff were verified directly against the diff, the live agent roster on disk, the repo's own validators, and the PR's actual GitHub Actions run — no discrepancies found. The 3-file scope expansion (`design.md`/`review.md`/`validate.md`) is legitimate: it matches an existing convention exactly, not an invented one. Recommending merge.

## Findings

No blocking or non-blocking findings. Two observations, informational only:

- **[INFO]** `README.md` line ~215: the builder deliberately reworded "the lead should dispatch review" → "the dispatcher should route review" rather than a literal search-replace (which would have produced "the dispatcher should dispatch review"). This is a good call — the mechanical swap would have read oddly — and confirms the sweep was read for coherence, not blindly scripted.
- **[INFO]** The PR does not touch `docs/design/**`, `docs/research/**`, `docs/upstream-requests/**` synonym-drift spots the inventory flagged (§4) — correctly deferred as a separate, not-yet-scoped slice per the handoff; not a gap in this PR's stated scope.

## Verification detail

### 1. Prose-only claim — zero source/test/program-value changes

`git diff origin/main...HEAD --stat` — 7 files changed, all `.md` + `.claude-plugin/plugin.json`'s `description` string:

```
.claude-plugin/plugin.json                        |  2 +-
README.md                                         | 27 ++++++++++-------------
commands/design.md                                |  2 +-
commands/review.md                                |  2 +-
commands/validate.md                              |  2 +-
skills/workflow/dispatcher-orchestration/SKILL.md |  6 ++---
skills/workflow/dispatcher-routing/SKILL.md       |  2 +-
```

Confirmed via `git diff --name-only` grep: no `.ts`/`.test.ts` file and no `CHANGELOG.md` in the changed-file list. `scripts/crew.ts:768`, `scripts/lib/approvals.ts:98` (the `escalated_to_lead`/`escalated_to_dispatcher` alias pair lives in `workflow-state.ts`, not touched either) are untouched, matching the "Forbidden" section of the handoff. **PASS.**

### 2. README roster rebuild

Cross-checked every one of the 23 first-party agents' frontmatter `model:` field against disk (not a 6-agent spot-check — did all 23, since it was cheap):

- opus (4): `architect`, `architect-reviewer`, `cloud-architect`, `refactor` — matches the PR's "Design / architecture" row exactly.
- haiku (2): `document-writer`, `investigator` — matches the PR's "Lightweight / high-volume" row exactly.
- sonnet (17): `aiplugin-dev`, `backend-dev`, `csharp-reviewer`, `dev-lite`, `frontend-dev`, `fullstack-dev`, `integrator`, `performance-engineer`, `qa-expert`, `release-engineer`, `researcher`, `reviewer`, `reviewer-lite`, `test-automator`, `typescript-reviewer`, `uxdesigner`, `verifier` — matches the PR's "Implementation & review" row exactly, same 17 names, no omissions or extras.

4 + 2 + 17 = 23, matching the "23 first-party agents" line in the rebuilt "Project structure" section and `ls agents/*.md` (excluding `3rdparty/`) = 23 files. **No fabrication, no drift. PASS.**

### 3. Scope-expansion verdict — `design.md`/`review.md`/`validate.md`

Compared H1s directly:

```
commands/build.md:    # Build — Dispatcher Workflow
commands/fix.md:      # Fix — Dispatcher Workflow
commands/design.md:   # Design — Dispatcher Workflow     (was: # Design In The Lead Workflow)
commands/review.md:   # Review — Dispatcher Workflow     (was: # Review In The Lead Workflow)
commands/validate.md: # Validate — Dispatcher Workflow   (was: # Validate In The Lead Workflow)
```

The new headings are byte-for-byte the same pattern already live in `build.md` and `fix.md` (`# <Verb> — Dispatcher Workflow`), not a builder-invented convention. A repo-wide case-insensitive sweep for `\bthe lead\b|\bto the lead\b|\bby the lead\b|\bcrew:lead\b|standalone "Lead"` across `commands/`, `skills/`, `agents/` (excl. `3rdparty/`) returns **zero remaining hits**, confirming the expansion actually closes out the drift class rather than partially addressing it.

**Verdict: the expansion is safe to keep in this PR, not something to split out.** It's the same mechanical drift-fix pattern (a stale H1 that never got swept in the v0.41 hard cut), same low blast radius (doc heading only, no frontmatter/routing-table impact), and splitting it into a second PR would just relitigate an already-verified, already-tested change for no risk reduction.

### 4. Terminology correctness in context

Read all 5 README diff hunks and both `dispatcher-orchestration/SKILL.md` body-prose hunks in full (see diffs below) — every sentence reads coherently as "dispatcher," including the one spot where the builder reworded rather than mechanically substituted (see Findings above). No leftover "the lead"/dispatcher-dispatch nonsense.

### 5. Gates — spot-rerun in the worktree

| Gate | Result |
|---|---|
| `node ./scripts/validate-manifests.ts` | OK — `crew@0.66.0` |
| `node ./scripts/validate-agents.ts` | OK — 23 agents + 9 3rdparty; `NO_LEAD_REF_REQUIRED` passes |
| `node ./scripts/validate-agent-refs.ts` | OK — no phantom refs |
| `node ./scripts/validate-skills.ts` | OK — 71 skills (same 4 pre-existing unrelated warnings on `fullstack-cross-layer/SKILL.md`, unrelated to this diff) |
| `bun test tests/dispatch-timing-pre-tap.test.ts` | 17/17 pass — confirms the builder's claim that the flagged `crew:lead` case was already replaced with an "unknown"-lookup assertion, nothing to fix here |

**PR's actual CI run (`gh pr view 240`)**: `state: OPEN`, `mergeable: MERGEABLE`. All three `test (N) / test (self-hosted)` shard jobs plus `checks / test (self-hosted)` completed `SUCCESS` on the Linux self-hosted runner — the disclosed Windows-local `bun#5090` shard flakiness (`NotImplementedError: test() inside another test()`) does **not** reproduce there, confirming the builder's own read that it's a local-environment artifact, not a regression from this change. `gate` was still `IN_PROGRESS` at review time; `auto-merge` check itself reports `SUCCESS`. No CI signal contradicts the PR.

## AC table

| # | Acceptance criterion | Result | Evidence |
|---|---|---|---|
| 1 | Diff contains zero source/test/program-value changes; `scripts/crew.ts`, `scripts/lib/approvals.ts`, the `escalated_to_lead`/`escalated_to_dispatcher` alias, `CHANGELOG.md` untouched | PASS | `git diff --stat`/`--name-only`, §1 above |
| 2 | README Agent-models table + project-structure roster line match the real 23-agent roster with per-agent frontmatter `model:` values | PASS | §2 above, all 23 agents cross-checked (exceeds the 6-agent spot-check ask) |
| 3 | 3-file scope expansion (`design.md`/`review.md`/`validate.md`) follows the same H1 pattern as `build.md`; verdict on safety | PASS / SAFE-AS-IS | §3 above — pattern match confirmed byte-for-byte; recommend keeping in this PR |
| 4 | Swept terminology reads coherently as "dispatcher" (5 README spots + 2 skill-body spots) | PASS | §4 above, full-context read |
| 5 | Repo validators + gates spot-rerun clean; Windows shard flakiness not chased, PR CI is arbiter | PASS | §5 above — validators clean locally, PR CI green on Linux self-hosted for all 3 shards |

## Confidence

High. Every claim in the builder's handoff was independently re-derived rather than taken on faith: diff stat re-run, all 23 agent model fields re-read from disk (not sampled), H1 headings diffed byte-for-byte against `build.md`, a fresh repo-wide grep for remaining "lead" role-prose (zero hits), the specifically-flagged test re-run (17/17), and the PR's live GitHub Actions run pulled to confirm the Linux CI signal instead of relying on the builder's local-only report.

## Risks / open questions

- None blocking. The `gate` check was still `IN_PROGRESS` at review time — operator should confirm it completes green before merge, though nothing in the completed checks suggests it won't.
- Per the handoff's own "suggested next handoff": two separate, not-yet-scoped follow-ups remain open (wire-relevant `"lead"` value migration in `scripts/crew.ts`/`approvals.ts`, and the `docs/design/**`/`docs/research/**` synonym sweep) — correctly out of scope for this PR, flagging only so they aren't lost.

## Suggested next handoff

1. Team-lead/operator: merge PR #240 once the `gate` check completes (all substantive checks are already green).
2. File or pick up the two deferred follow-ups named in the original handoff (wire-value migration; docs/design & docs/research synonym sweep) as separate slices when ready.
