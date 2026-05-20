---
description: Print the full body + frontmatter of a single decision by id.
---

# Decisions Show

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/autonomous-loop.mjs" decisions show \
  --repo "$PWD" \
  --id DEC-001
```

Returns the parsed decision file: `{ id, title, status, introduced_by_slice,
introduced_at, superseded_by, filePath, frontmatter, body }`.

For cross-slice analysis (which slices introduced which decisions), use
`decisions list` to get the full inventory and grep / jq from there.
