---
name: spec-decompose
description: Derive FEAT-NNN files from a spec and wire the SPEC↔FEAT linkage.
auto_execute_steps: false
---

# Spec Decompose

For an approved spec, creates one FEAT-NNN.md in `docs/backlog/pending/` per
feature title provided, with `derived_from: SPEC-NNN` in frontmatter, and
appends each FEAT id to the spec's `derived_features` array.

Plugin does not call an LLM for this — the AGENT identifies feature titles
(by reading the spec body) and supplies them on the command line. This keeps
the plugin deterministic and lets the agent do the semantic reasoning where
it belongs.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" spec decompose \
  --repo "$PWD" \
  --id SPEC-001 \
  --features "Audio ingestion pipeline; Multi-tenant key scoping; Health propagation"
```

`--features` is a semicolon-separated list of feature titles. Each title
becomes one FEAT-NNN file in `pending/`.

Returns `{ spec, created: [{ id, title, filePath }, ...], count }`.

Side effects:
- Spec frontmatter updated: `status: approved` → `status: decomposed`,
  `derived_features: [FEAT-007, FEAT-008, FEAT-009]`.
- Each new FEAT inherits the spec's `priority` and `target_release` as
  defaults (overridable by editing the FEAT file).

## Workflow

```
PM adds SPEC-001 (status: draft)
   ↓
PM (or reviewer) flips status to approved
   ↓
Agent reads SPEC-001 body, identifies 3-5 features
   ↓
/runner:spec decompose --id SPEC-001 --features "..."
   ↓
3-5 FEAT-NNN files appear in docs/backlog/pending/
   ↓
Cross-Slice Continuation HARD RULE picks them up:
   triage → promote → slice → ship
```
