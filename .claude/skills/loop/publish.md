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

3. Report the summary. Each FEAT file that was published will now have `github_issue: <N>` in its frontmatter.

## What gets created

- **GitHub Milestone** per unique `feature.phase` value (e.g. `"Phase 1"`, `"Phase 2 alpha"`)
- **GitHub Issue** per FEAT (title: `FEAT-NNN: <first description line>`, body: Description + AC sections, labels: priority/status/category/autonomous-safe, milestone if phase set)
- **GitHub native sub-issue** per SLICE linked to a published FEAT (title: `SLICE-NN: <objective>`, body: AC checklist, labels: `slice,status:pending`, attached to parent FEAT issue)

## Idempotency

FEATs and SLICEs with `github_issue` already set are skipped. Re-running updates labels and milestone assignments only.
