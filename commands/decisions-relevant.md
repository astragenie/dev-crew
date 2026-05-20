---
description: List retrospective decisions whose affects_files frontmatter matches any of the supplied changed files — surface prior architectural choices to reviewers.
---

# Decisions Relevant

Finds `docs/decisions/DEC-NNN.md` files whose `affects_files: [...]`
frontmatter array matches any of the changed files passed in. Match is
literal path-suffix:

- decision `affects_files: ["src/auth/middleware.cs"]`
- changed file `src/auth/middleware.cs` or `astragenie/src/auth/middleware.cs`
- → match

Usage:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/autonomous-loop.mjs" decisions relevant \
  --repo "$PWD" \
  --files "src/auth/middleware.cs,src/api/Controllers/AuthController.cs"
```

Returns:

```json
{
  "count": 2,
  "decisions": [
    {
      "id": "DEC-007",
      "title": "Server-side pagination for ingestion jobs",
      "status": "accepted",
      "introduced_by_slice": "SLICE-52",
      "filePath": "docs/decisions/DEC-007.md",
      "hits": [
        { "decisionFile": "src/auth/middleware.cs", "changedFile": "src/auth/middleware.cs" }
      ]
    }
  ]
}
```

## How to populate `affects_files`

When the agent extracts a decision via `slice grade-write`, the resulting
`docs/decisions/DEC-NNN.md` has no `affects_files` field. The agent should
edit the file post-extraction:

```yaml
---
id: DEC-007
title: Server-side pagination for ingestion jobs
status: accepted
introduced_by_slice: SLICE-52
affects_files:
  - src/MemoryService.Api/Controllers/IngestionJobsController.cs
  - src/MemoryService.Api/IngestionJobQueries.cs
---
```

Once populated, every future review touching those files surfaces this DEC
via `decisions relevant`.

## Reviewer workflow integration

The `/autonomous-loop:slice review-ladder` prompts include a step:
"surface prior decisions relevant to changed files via `decisions relevant`".
Reviewers cite matching decisions in their verdict to prevent re-litigating
solved problems.
