---
filed: 2026-06-07
target_plugin: hero-crew
target_repo: astragenie/dev-team
status: superseded-by-resolver-cli
loop_tracking_feat: FEAT-075
loop_related_spec: docs/superpowers/specs/2026-06-07-preset-driven-skill-activation-design.md
resolved: 2026-06-07
resolved_by: hero-crew v0.19.0 — orchestrate-slice now calls node loop.mjs resolve-skills and prepends the resolved block to builder dispatch prompts. No FEAT-level stack/surface reader needed — loop's resolver CLI is the contract.
---

# Upstream-request: `/crew:orchestrate-slice` route builder variant by FEAT `surface` + `stack` frontmatter

## Filed against

- **Plugin:** hero-crew (`astra/crew/<version>`)
- **Surface:** `/crew:orchestrate-slice` command — specialist ladder dispatcher
- **Reason:** crew already ships `crew:frontend-dev` and `crew:backend-dev` specialist agents, but `/crew:orchestrate-slice` has no routing table that picks between them and the generic `crew:fullstack-dev`. Every slice falls through to the generic builder regardless of FEAT classification.

## Problem

Observed 2026-06-07 from a 57-agent activity report in this repo:

| Role | Total runs |
|---|---|
| `crew:fullstack-dev` | 63 |
| `crew:frontend-dev` | 1 (stub — 0 turns) |
| `crew:backend-dev` | 0 |

Loop's `/loop:backlog-enrich` already classifies every triaged FEAT with five routing fields written to FEAT frontmatter — the architect emits them and `src/scripts/lib/slice-linker/feature-lifecycle.mts::buildClassifyUpdates` writes them. As of this request:

```yaml
---
id: FEAT-NNN
status: triaged
tags: [api-change, infra]
needs_contract: true
needs_ux: false
surface: backend
stack: [typescript, node]
---
```

`surface` ∈ {`frontend`, `backend`, `mixed`, `none`} and `stack` is a known-vocab list. The loop side is shipping these fields. Crew's `/crew:orchestrate-slice` does not read them — it always dispatches the generic `crew:fullstack-dev`.

## Ask

Extend `/crew:orchestrate-slice` (or its underlying dispatcher) to read the SLICE / FEAT frontmatter and pick the builder variant:

| `surface` value | Dispatch |
|---|---|
| `frontend` | `crew:frontend-dev` |
| `backend` | `crew:backend-dev` |
| `mixed` | `crew:fullstack-dev` (generic — fall back to the joint builder if no FE/BE split agent exists yet) |
| `none` | `crew:fullstack-dev` (docs-only / config-only work) |
| absent / unparseable | `crew:fullstack-dev` (preserve current behavior — backwards-compatible) |

`stack` is informational for now (helps the builder-be / builder-fe pick the right toolchain prompt). No hard requirement to route on `stack` in this first pass.

## Existing loop-side state (already shipped on the loop branch as of this request)

- `src/scripts/lib/classify-parser.mts` — VALID_SURFACES, VALID_STACKS vocabularies + parser fields
- `src/scripts/lib/slice-linker/feature-lifecycle.mts::buildClassifyUpdates` — writes `surface`, `stack` into FEAT frontmatter
- `commands/backlog-enrich.md` — architect prompt instructs emission of `surface:` and `stack:`
- `CLAUDE.md` — Backlog discipline section documents the routing contract loop expects

## Backwards-compat

- FEATs filed before this change have no `surface` / `stack` fields. Treat absent as `crew:fullstack-dev` (generic) — same as today.
- Crew may also expose `surface` / `stack` as its own native frontmatter convention; loop's classify parser uses the same field names so the two layers agree without further translation.

## Related

- Loop research note: 2026-06-07 investigator-agent report identifying the gap (in conversation log, not yet a SPEC).
- Loop CLAUDE.md "Decommissioned roles" section also documents that `crew:lead` is no longer used in this repo — unrelated to this request, but mentioned because the same routing flow is the surface area both changes touch.
