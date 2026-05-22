# Design: Ceremonies & Tree Formatter

**Date:** 2026-05-22  
**Status:** approved  
**Scope:** scaffold only — no gate logic, no state mutation, no file writes

---

## Problem

The autonomous loop has no visible phase/feature boundary events. Slices are tracked,
but there is no ceremony for when a feature starts or ends, and no ceremony for when
a phase opens or closes. Progress is invisible above the slice level.

Additionally, there is no structured output format that shows the full
phase → feature → slice hierarchy in a human-readable tree.

---

## Decision

Add a single `scripts/lib/ceremonies.mjs` module that:

1. Exports 4 ceremony stub functions (phase-start, phase-end, feature-start, feature-end)
2. Exports a `renderTree` function that renders phase/feature/slice hierarchy as ASCII tree

This is a **scaffold** — stubs return structured objects, renderer produces valid output,
but no gate logic, no approvals, no file writes, and no wiring to the loop runner yet.
Logic slots in during a future FEAT.

---

## Module: `scripts/lib/ceremonies.mjs`

### Exports

```js
phaseStart(phase)    // { id: string, title: string } → CeremonyResult
phaseEnd(phase)      // { id: string, title: string } → CeremonyResult
featureStart(feat)   // { id: string, title: string, phase: string } → CeremonyResult
featureEnd(feat)     // { id: string, title: string, phase: string } → CeremonyResult
renderTree(phases)   // Phase[] → string
```

### CeremonyResult shape

```js
{
  type: 'phase-start' | 'phase-end' | 'feature-start' | 'feature-end',
  id: string,        // phase.id or feat.id
  timestamp: string, // ISO 8601
  status: 'scaffold'
}
```

### Constraints

- No `console.log` inside the module — caller decides output
- No file writes
- No state mutation
- No imports from other crew modules (pure utility)

---

## Tree Renderer

### Input: `Phase[]`

```js
[{
  id: string,        // e.g. '2' — matches FEAT frontmatter `phase:` value, stringified
  title: string,     // e.g. 'Domain build-out'
  status: string,    // 'pending' | 'in-progress' | 'done'
  features: [{
    id: string,      // e.g. 'FEAT-005'
    title: string,
    status: string,  // 'pending' | 'in-progress' | 'done'
    slices: [{
      id: string,    // e.g. 'slice-001'
      title: string,
      status: string // 'pending' | 'active' | 'done'
    }]
  }]
}]
```

### Output: string

```
Phase 2 — Domain build-out [in-progress]
├── FEAT-005 csharp-conventions [in-progress]
│   ├── slice-001 scaffold skill file [done]
│   └── slice-002 write acceptance tests [active]
└── FEAT-006 flutter-conventions [pending]

Phase 3 — Workflow polish [pending]
└── FEAT-008 routing-table cadence [pending]
```

### Rendering rules

- Phase header: `Phase {id} — {title} [{status}]`
- Feature line: `{prefix}── {id} {title} [{status}]`
- Slice line: `{indent}── {id} {title} [{status}]`
- Non-last sibling prefix: `├`; last sibling prefix: `└`
- Slice indent under non-last feature: `│   `; under last feature: `    `
- Features with empty slices render no children and no blank line
- Multiple phases separated by a blank line
- `renderTree([])` returns `''` — no crash on empty input

---

## Tests: `tests/ceremonies.test.mjs`

| Test | Assertion |
|------|-----------|
| `phaseStart` returns correct shape | `type === 'phase-start'`, `id === phase.id`, `status === 'scaffold'`, timestamp is ISO string |
| `phaseEnd` returns correct shape | same pattern |
| `featureStart` returns correct shape | `type === 'feature-start'`, `id === feat.id` |
| `featureEnd` returns correct shape | same pattern |
| `renderTree([])` | returns `''` |
| `renderTree` single phase + single feature + no slices | correct header + feature line |
| `renderTree` single phase + two features | first uses `├──`, last uses `└──` |
| `renderTree` feature with two slices | first slice `├──`, last slice `└──`, indent under `│   ` |
| `renderTree` last feature with slices | slice indent uses `    ` not `│   ` |
| `renderTree` two phases | blank line between them |

---

## Integration points (deferred — not in this FEAT)

| Call site | Trigger | Future behaviour |
|-----------|---------|-----------------|
| `brief.mjs` | brief-me output | render live tree from backlog state |
| `slice-linker.mjs` | slice start / close | call `featureStart` / `featureEnd` at boundaries |
| loop runner | phase boundary detection | call `phaseStart` / `phaseEnd` |

Wiring these is a separate FEAT. This spec covers only the module + tests.

---

## Out of scope

- PM approval gate logic
- Phase-close regression test trigger
- `autonomous_safe` enforcement
- Any file writes or artifact creation
- Loop runner changes
