---
name: loop:publish
description: Push all unpublished phases, FEATs, and SLICEs to GitHub Issues. Creates milestones for phases, issues for FEATs, native sub-issues for SLICEs. Idempotent — safe to run multiple times.
---

# /loop:publish

Publish all unpublished loop artifacts to GitHub Issues.

## Prerequisites

1. `gh` CLI installed and authenticated (`gh auth login`)
2. `.claude/loop.json` has `"github": { "enabled": true, "repo": "org/repo" }` — or `"repo": null` to auto-detect from `git remote get-url origin`

## Steps

1. Read `loop.json` and confirm `github.enabled` is `true`. If not, print:
   > GitHub sync is disabled. Set `"github": { "enabled": true }` in `.claude/loop.json` to enable.
   Then stop.

2. Run the publish:

```js
import { publishAll } from "./scripts/lib/github-sync.mjs";
const result = await publishAll(process.cwd());
console.log(`Published: ${result.milestones} milestones, ${result.issues} issues, ${result.subissues} sub-issues`);
```

3. Report the summary. Each FEAT file that was published will now have `github_issue: <N>` and `github_url: <full URL>` in its frontmatter; the same pair is written on every published SLICE.

## What gets created

- **GitHub Milestone** per unique `feature.phase` value (e.g. `"Phase 1"`, `"Phase 2 alpha"`)
- **GitHub Issue** per FEAT (title: `FEAT-NNN: <first description line>`, body: Description + AC sections, labels: priority/status/category/autonomous-safe, milestone if phase set)
- **GitHub native sub-issue** per SLICE linked to a published FEAT (title: `SLICE-NN: <objective>`, body: AC checklist, labels: `slice,status:pending`, attached to parent FEAT issue)

## Frontmatter fields written

| Field | Where | Value |
| --- | --- | --- |
| `github_issue` | FEAT + SLICE | numeric issue id, e.g. `42` |
| `github_milestone` | FEAT | numeric milestone id, when `phase` is set |
| `github_url` | FEAT + SLICE | full URL `https://github.com/<owner>/<repo>/issues/<N>` — composed at write time so downstream readers do not need to know the repo slug |

`github_url` is persisted alongside `github_issue` so that callers (release notes, dashboards, briefs) can link directly without re-deriving the repo slug from `loop.json.github.repo` (which may be `null` / auto-detected from `git remote get-url origin`).

## Idempotency

FEATs and SLICEs with `github_issue` already set are skipped on the create path. Re-running additionally **backfills `github_url`** for any entry that was published before the field was introduced, then updates labels and milestone assignments via `/loop:sync` or `syncMilestones`. A second run on a fully-linked FEAT performs no file writes.
