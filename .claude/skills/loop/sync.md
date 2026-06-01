---
name: loop:sync
description: Pull GitHub Issue body edits (Description + Acceptance criteria) back into local FEAT files. Run after a PM edits issues in GitHub. GitHub is authoritative for these two sections; all frontmatter fields remain local-authoritative.
---

# /loop:sync

Pull GitHub issue body changes back into local FEAT markdown files.

## When to use

After a PM or stakeholder edits the **Description** or **Acceptance criteria** section of a FEAT issue in GitHub. Developers run `/loop:sync` to pull those changes into the local artifact files before the next slice starts.

## Prerequisites

1. `gh` CLI installed and authenticated (`gh auth login`)
2. `.claude/loop.json` has `"github": { "enabled": true }`
3. FEATs have been published via `/loop:publish` (they have `github_issue` in frontmatter)

## Steps

1. Confirm `github.enabled` is `true` in `loop.json`. If not, print guidance and stop.

2. Run the sync:

```js
import { syncPull } from "./scripts/lib/github-sync.mjs";
const result = await syncPull(process.cwd());
```

3. Review the output:
   - `FEAT-012: updated acceptance-criteria (2 lines changed)` — local file was updated
   - `FEAT-007: no changes` — in sync, nothing written

## Conflict rule

- **GitHub wins** for `## Description` and `## Acceptance criteria` body sections.
- **Local file wins** for all frontmatter fields (`priority`, `phase`, `slices`, PM scores, etc.).
- Last pull wins — there is no three-way merge.
- If both sides changed, GitHub's version is applied and a warning is logged.

## What is NOT synced back

- SLICE files (SLICE body is read-only in GitHub)
- Frontmatter fields of any kind
- Grades, cost reports, artifact files
