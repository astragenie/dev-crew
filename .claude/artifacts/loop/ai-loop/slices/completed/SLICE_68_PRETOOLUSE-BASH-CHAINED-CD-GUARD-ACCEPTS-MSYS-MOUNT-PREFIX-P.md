---
id: SLICE-68
status: completed
feature: FEAT-068
phase: null
priority: P2
target_release: null
requires_validation: false
created: 2026-06-07
updated: 2026-06-07
completed_at: 2026-06-07
---
# SLICE-68: PreToolUse:Bash chained-cd guard accepts MSYS mount-prefix paths on Windows

Implements FEAT-068. See [feature file](../../../backlog/in-progress/FEAT-068.md) for product context.

## Objective

On Windows Git Bash / MSYS, the natural path syntax for chained `cd` is `cd /c/work/mega/loopobserver && <cmd>`. The PreToolUse:Bash hook today calls `fs.existsSync` against the raw string and reports `chained cd target does not exist: /c/work/mega/loopobserver` even when the Windows path `C:\work\mega\loopobserver` is valid and the same `cd` would succeed in the shell. This forces operators into the longer-form workaround `git -C "C:/path" <cmd>` or sidesteps the hook entirely.

**SCOPE NOTE**: source of the chained-cd guard is `~/.claude/plugins/cache/astra/crew/0.16.0/scripts/lib/preflight/checks.mjs:125` (hero-crew plugin). Loop cannot ship a hook fix to crew's source — same constraint that FEAT-057 originally hit. Re-route as upstream-request markdown (FEAT-064 pattern) so the fix request is tracked in this repo; the actual hook change lands in hero-crew.

## In scope

- New file `docs/upstream-requests/2026-06-07-hero-crew-preflight-chained-cd-msys-paths.md` describing the request
- Follow the existing upstream-request template (frontmatter shape from `2026-06-06-hero-crew-redundant-read-hook-deny.md` / `2026-06-07-hero-crew-brief-me-halt-badge-rendering.md`)
- Cite the exact file:line in hero-crew (`scripts/lib/preflight/checks.mjs:125`)
- Provide the suggested `normalizeCdTarget` helper code verbatim
- Reproduction + workaround documented

## Out of scope

- Modifying hero-crew source from this repo
- Cygwin `/cygdrive/c/...` and WSL `/mnt/c/...` translations (different prefixes, separate scope)
- Other preflight checks in the same hook (only the chained-cd existsSync site)
- Loop-side intercept of the guard (the guard correctly belongs to hero-crew)

## Acceptance criteria

- [ ] AC-1: New file at `docs/upstream-requests/2026-06-07-hero-crew-preflight-chained-cd-msys-paths.md`
- [ ] AC-2: Frontmatter matches the existing upstream-request template (filed, target_plugin, target_repo, status, loop_tracking_feat, loop_related_slice)
- [ ] AC-3: Doc cites the exact source line in hero-crew (`scripts/lib/preflight/checks.mjs:125`) and includes the suggested `normalizeCdTarget` helper code
- [ ] AC-4: Doc lists the 6 acceptance criteria from FEAT-068 verbatim so the upstream owner has a clear test surface
- [ ] AC-5: Doc explicitly states the current operator workaround (`git -C "C:/path" <cmd>`) so consumers can act before the upstream fix lands
- [ ] AC-6: `npm test` + `npm run lint` clean (no code changed)

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-068 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A (content accuracy): verify the file:line citation matches the actual hero-crew source; verify the `normalizeCdTarget` helper is syntactically correct and handles the AC-3 (POSIX no-op) + AC-4 (mixed slashes) cases.
- Reviewer B (request hygiene): verify frontmatter matches the existing upstream-request template; verify the doc is actionable for the hero-crew owner (concrete file:line + suggested code + AC list).
