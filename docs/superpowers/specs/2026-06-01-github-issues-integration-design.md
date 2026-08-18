# GitHub Issues Integration — Design Spec

**Date:** 2026-06-01  
**Status:** Approved  
**Phase:** 21 (proposed)  
**Scope:** Add bidirectional sync between the loop's file-based artifact model and GitHub Issues — Milestones for phases, Issues for FEATs, sub-issues for SLICEs, pull-on-demand for PM edits, ceremony-driven push.

---

## 1. Goals

- PMs can read and edit feature descriptions and acceptance criteria in GitHub Issues; those edits flow back into local FEAT files on demand.
- Ceremonies (slice start, slice complete) automatically update issue labels and post summary comments — no manual GitHub work required from developers.
- Zero behaviour change for users who do not opt in (`github.enabled: false` default).
- No new runtime dependencies beyond the `gh` CLI (already standard in dev environments).

## 2. Non-Goals

- Real-time / webhook-driven sync. Pull is manual (`/loop:sync`).
- Syncing slice acceptance criteria back from GitHub. SLICE body is read-only in GitHub.
- Linear, Jira, or any other tracker. GitHub Issues only.
- Storing or syncing grade detail, raw validation output, or full cost reports in GitHub. Summary only.

---

## 3. GitHub ↔ Loop Schema Mapping

| GitHub entity | Loop concept | Notes |
|---|---|---|
| Milestone | Phase (`feature.phase`) | Title: `"Phase 1"`, `"Phase 3 alpha"` etc. |
| Milestone `due_on` | `target_release` | Best-effort; omitted if not a date |
| Issue | FEAT | One issue per FEAT |
| Issue title | `FEAT-NNN: <first Description line>` | |
| Issue body | `## Description` + `## Acceptance criteria` sections | PM-editable; synced back by `/loop:sync` |
| Issue labels | `priority:P1`, `status:pending`, `category:tech-debt`, `autonomous-safe` | Auto-created on first publish |
| Issue state | `open` / `closed` | Closed when FEAT moves to `done` |
| Sub-issue | SLICE | Real GitHub Issue attached to parent FEAT via native sub-issues API |
| Sub-issue title | `SLICE-NN: <Objective>` | |
| Sub-issue labels | `slice`, `status:pending/in-progress/completed` | |
| Sub-issue body | Acceptance criteria checklist | Read-only; not pulled back |
| Issue comment | Slice complete summary | Posted by ceremony hook |

---

## 4. Frontmatter Additions

Two optional fields added to FEAT files (null by default, set on first publish):

```yaml
github_issue: 42        # GitHub issue number
github_milestone: 3     # GitHub milestone number (from phase)
```

One optional field added to SLICE files:

```yaml
github_issue: 87        # GitHub sub-issue number
```

All three fields are nullable. Existing files without these fields are treated as unpublished.

---

## 5. loop.json Config

```json
"github": {
  "enabled": false,
  "repo": null
}
```

- `enabled: false` — all sync calls are no-ops. Default. Existing users unaffected.
- `repo: null` — auto-detect from `git remote get-url origin` at runtime. Set `"org/repo"` to override.

---

## 6. New Files

```
scripts/lib/github-sync.mjs                 # Public API: publishAll(), syncPull(), postSliceComment(), updateIssueStatus()
scripts/lib/github-sync/repo-detect.mjs     # git remote origin → "org/repo"
scripts/lib/github-sync/milestone-sync.mjs  # Phase ↔ Milestone upsert
scripts/lib/github-sync/issue-sync.mjs      # FEAT ↔ Issue CRUD + label management
scripts/lib/github-sync/subissue-sync.mjs   # SLICE ↔ real Issue CRUD; attaches to parent via native sub-issues API
scripts/lib/github-sync/comment-sync.mjs    # Ceremony → summary comment
scripts/lib/github-sync/body-diff.mjs       # GitHub body → local section comparison + patch
tests/github-sync.test.mjs                  # Unit tests (gh CLI mocked)
.claude/skills/loop/publish.md              # /loop:publish skill
.claude/skills/loop/sync.md                 # /loop:sync skill
```

---

## 7. Existing Files Touched

| File | Change |
|---|---|
| `scripts/lib/slice-linker/complete-slice.mjs` | Call `postSliceComment()` after close if `github.enabled` |
| `scripts/lib/slice-linker/start-slice.mjs` | Call `updateIssueStatus("in-progress")` after start if `github.enabled` |
| `.claude/loop.json` | Add `"github": { "enabled": false, "repo": null }` |
| `docs/code-conventions.md` | Document `github_issue` / `github_milestone` frontmatter fields |

No changes to backlog-parser, frontmatter parser, or any ceremony logic beyond the two hook callsites above. Both callsites are guarded by `github.enabled` so existing behaviour is unchanged.

---

## 8. Push Flow — `/loop:publish`

Triggered manually. Idempotent: safe to run multiple times.

1. Read `loop.json` → assert `github.enabled: true`; detect repo from `git remote get-url origin` (or explicit `repo` field).
2. Collect all phases (unique `feature.phase` values across all FEATs in all states).
3. For each phase → upsert Milestone via `gh api`; write `github_milestone` back to all matching FEAT files.
4. For each FEAT without `github_issue` → create Issue (title, body rendered from Description + AC sections, labels, milestone); write `github_issue` back.
5. For each SLICE linked to a published FEAT and without `github_issue` → create a real GitHub Issue for the SLICE via `gh issue create`; attach it to the parent FEAT issue as a native sub-issue via `gh api repos/{repo}/issues/{parent}/sub_issues -f sub_issue_id={child}`; write `github_issue` back. Parent FEAT issue gains a native sub-issues progress indicator in the GitHub UI automatically.
6. Print summary: `3 milestones, 14 issues, 22 sub-issues created/updated`.

### Ceremony hooks (auto, only if `github.enabled: true`)

**On `/loop:slice start`:**
- Update SLICE sub-issue label: `status:pending` → `status:in-progress`
- Update parent FEAT issue label: `status:*` → `status:in-progress`

**On `/loop:slice complete`:**
- Post summary comment to FEAT issue (see Section 10).
- Close SLICE sub-issue; set label `status:completed`.
- If all linked SLICEs are completed → close FEAT issue; set label `status:done`.

---

## 9. Pull Flow — `/loop:sync`

Triggered manually by PM or developer after editing issues in GitHub.

1. Read `loop.json` → assert `github.enabled: true`; detect repo.
2. For each FEAT with `github_issue` set:
   a. `gh issue view <N> --json body --repo <org/repo>`
   b. Extract `## Description` and `## Acceptance criteria` sections from the fetched body.
   c. Compare (normalised whitespace) to the same sections in the local FEAT file.
   d. If different → overwrite only those two sections in the local file; update `updated:` date in frontmatter.
   e. Log: `FEAT-012: AC updated (3 lines changed)` or `FEAT-007: no changes`.
3. Print full diff summary at end.

**Conflict rule:** GitHub is authoritative for Description and Acceptance criteria body sections. Local file is authoritative for all frontmatter fields (priority, phase, slices, scores, etc.). Last-pull wins for body — no three-way merge.

**Does not touch:** SLICE files, artifact files, grades, cost reports, or any frontmatter field.

---

## 10. Summary Comment Format (Slice Complete)

Posted as an issue comment on the parent FEAT issue:

```markdown
## SLICE-NN Complete — <Objective one-liner>

**Outcome:** ✅ All AC passed

| Criterion | Status |
|---|---|
| AC-1: <text> | ✅ PASS |
| AC-2: <text> | ✅ PASS |

**Review:** Approved  
**Cost:** ~$0.42 (42k tokens)  
**Artifacts:** `.claude/artifacts/crew/runs/final-synthesis-feat012-slice05.md`
```

No raw grade, full validation dump, or cost breakdown. Outcome table + review status + cost + artifact path only.

---

## 11. Label Schema

Labels are auto-created in the target repo on first publish if they don't exist.

| Label name | Colour | Applied to |
|---|---|---|
| `priority:P0` … `priority:P3` | Red → Yellow | FEAT issues |
| `status:pending` | Grey | FEAT + SLICE |
| `status:in-progress` | Blue | FEAT + SLICE |
| `status:done` | Green | FEAT |
| `status:completed` | Green | SLICE |
| `category:tech-debt` | Orange | FEAT |
| `category:integration` | Purple | FEAT |
| `category:telemetry` | Teal | FEAT |
| `autonomous-safe` | Dark green | FEAT |
| `slice` | Light blue | SLICE sub-issues |

---

## 12. Error Handling

All GitHub sync failures are **non-blocking**. Ceremonies complete regardless.

| Error | Behaviour |
|---|---|
| `gh` not installed | Warn once at publish/sync start; skip all API calls |
| `gh` not authenticated | Detect `"not logged in"` in stderr; surface `"Run: gh auth login"` |
| API rate limit | Retry once after 5s; if still fails, log warning and skip that item |
| Issue already exists (re-publish) | `github_issue` set → skip creation; update labels and milestone only |
| GitHub body edited + local body edited | GitHub wins for Description/AC sections; log overwrite warning |
| Network timeout | Skip item; log; continue rest of batch |

---

## 13. Testing Strategy

`tests/github-sync.test.mjs` — unit tests using `child_process` stub to mock `gh` CLI output.

Test cases:
- `repo-detect`: parses SSH and HTTPS remote URLs correctly
- `milestone-sync`: creates milestone when missing; updates when title matches
- `issue-sync`: creates issue with correct title/body/labels; skips when `github_issue` already set
- `subissue-sync`: creates SLICE issue and attaches via sub-issues API; verifies parent linkage
- `body-diff`: detects changed AC section; ignores unchanged description; handles missing sections
- `postSliceComment`: renders correct markdown for all-pass, partial, and failed AC states
- `updateIssueStatus`: emits correct `gh` label commands for start and complete transitions
- Error paths: not installed, not authenticated, rate limit retry

All tests use `node --test` (existing test runner). No new test dependencies.

---

## 14. Implementation Sequence

Proposed as **Phase 21** — additive, no breaking changes.

1. Add `github` block to `loop.json` (`enabled: false`)
2. Implement `repo-detect.mjs` + tests
3. Implement `body-diff.mjs` + tests
4. Implement `milestone-sync.mjs`, `issue-sync.mjs`, `subissue-sync.mjs` + tests
5. Implement `comment-sync.mjs` + tests
6. Wire `github-sync.mjs` public API surface
7. Add ceremony hooks to `start-slice.mjs` and `complete-slice.mjs`
8. Write `/loop:publish` and `/loop:sync` skills
9. Update `docs/code-conventions.md` with new frontmatter fields
10. End-to-end smoke test against a real repo with `enabled: true`
