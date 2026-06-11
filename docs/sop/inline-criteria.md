# SOP: Inline-path criteria for slice ceremony

**Status:** active.
**Origin:** SLICE-94 (FEAT-throughput-2x).

## Purpose

When a slice's changed-file set fits one of the shapes below, the loop ceremony may take the inline path — lead writes review + validation artifacts inline rather than dispatching specialist subagents. The path is advisory; the orchestrator can override with rationale logged to grade.

## Shape rules

| Shape | Rule |
|---|---|
| `doc-update` | All changed files match `*.md` or live under `docs/**`. |
| `config-tweak` | All changed files are `.claude/loop.json`, `.eslintrc*`, `prettier.config.*`, or `tsconfig*.json`. |
| `single-module-edit` | Exactly 1 source file, gross LOC delta (added + removed) <= 50, no exported symbols added or removed, file not on the public-surface guard list. |
| `test-only` | All changed files match `src/tests/**`. |
| `none` | Anything else. |

## Public-surface guard list

These files cannot qualify for `single-module-edit` because they participate in the cross-plugin contract (SPEC-003) or carry behavior other modules consume directly:

- `src/scripts/lib/auto-dispatch.mts`
- `src/scripts/lib/halt-badges.mts`
- `src/scripts/lib/auto-walker.mts`

Audit this list quarterly. Add modules when they grow public surface.

## Integration

Call from slice ceremony:

```bash
bun src/scripts/loop.mts classify-slice-shape --files "<comma-separated paths>"
```

If the returned shape is in `loop.json.dispatchLimits.preferInlineFor`, the orchestrator should consider the inline path.
