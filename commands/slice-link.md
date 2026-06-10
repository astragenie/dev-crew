---
description: Append a crew artifact path (review/validation/deployment) to a slice's frontmatter linkage array — replaces regex auto-prefill with deterministic walk.
---

# Slice Link

After writing a crew artifact for a slice, run this so the slice file
gains a frontmatter cross-reference. The grading system then walks
linkage arrays instead of scraping artifact bodies for slice mentions.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice link \
  --repo "$PWD" \
  --id SLICE-52 \
  --kind reviews \
  --artifact .claude/artifacts/crew/reviews/20260520-slice52.md
```

`--kind` is one of `reviews`, `validations`, `deployments`. Idempotent —
re-linking the same path is a no-op.

After linking:

- Slice frontmatter gains/extends an array, e.g.:
  ```yaml
  reviews:
    - .claude/artifacts/crew/reviews/20260520-slice52.md
    - .claude/artifacts/crew/reviews/20260520-slice52-second-pass.md
  ```
- `slice grade --id SLICE-52` reads linked artifacts directly (faster +
  more reliable than the body-mention fallback).

## Reviewer / validator workflow

Pattern crew agents should follow:

```
1. write artifact via crew CLI -> get path
2. /loop:slice link --id SLICE-NN --kind <kind> --artifact <path>
3. (optional) continue work
```

Embedded in the Reviewer / Validator subagent prompts emitted by
`/loop:slice review-ladder`.
