---
id: FEAT-075
status: triaged
priority: P2
composite_priority: P2
category: feature
target_release: null
created: 2026-06-07
updated: 2026-06-07
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.3
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.55
pm_technical_risk: 0.2
pm_dependency_depth: 0.1
composite_score: 0.525
autonomous_safe: true
triage_notes: Low-risk mechanical mirror of just-shipped Phase 1 pattern; no external demand but strong internal coherence win; safe to autonomously slice.
---
## Context

Phase 1 of preset-driven skill activation just landed on main (slice: feat/preset-skill-activation, commits 9891905..2aa7c33). Builder agents (crew:builder, crew:builder-fe, crew:builder-be) now get a 'Required skills (resolved)' block injected into their dispatch prompts via the new node scripts/loop.mjs resolve-skills CLI.

The three other owned agents — pm, researcher, architect — do not yet consume skills at all. Their prompts list 'Required skills to invoke via Skill tool at start of every dispatch' as static routing tables (see agents/architect.md:68 onward), but those tables are agent-prompt static, not preset-driven and not orchestrator-injected.

## Proposal

Extend the same preset-driven activation pattern to the three loop-owned agents. The preset shape already has top-level skills / fe.skills / be.skills for builder variants. Add equivalent role-based skill lists for non-builder agents — likely a roles block in the preset:

```json
{
  "roles": {
    "pm":         { "skills": [...] },
    "researcher": { "skills": [...] },
    "architect":  { "skills": [...] }
  }
}
```

Extend the resolver CLI with a matching variant (or a new --role flag): node scripts/loop.mjs resolve-skills --role pm. Slash flows that dispatch these agents (/loop:backlog-enrich for architect, /loop:backlog-add for researcher, /loop:pm-triage for pm, etc.) call the CLI and embed the resolved block into the dispatch prompt — same shape as builder dispatch.

## Acceptance criteria

- Preset schema v2 (or v1+roles optional block) accepts roles.{pm,researcher,architect}.skills.
- resolver CLI returns role loadout: --role pm | researcher | architect.
- Static 'Required skills' tables in agents/pm.md, agents/researcher.md, agents/architect.md, agents/document-writer.md become fallback only (keep for back-compat through Phase 2).
- Slash flows that dispatch role agents inject the resolved block (start with /loop:backlog-enrich → architect; iterate from there).
- Tests: resolver --role variant returns expected shape; CLI exits 0/1/2 cleanly.
- CHANGELOG + CLAUDE.md mention the role-skill activation surface alongside the builder-skill one.

## Out of scope

- Crew-side equivalent for crew:reviewer / crew:validator / crew:deployer / crew:lead (decommissioned in this repo anyway). File upstream-request if useful.
- Per-role skill registry / lint — opaque strings continue, same as builder side.

## Why now

Skill activation pattern just shipped and is fresh. PM and architect agents fire frequently on every triage / enrich cycle — getting their skill loadout aligned with the builder side keeps the dispatch behavior coherent across the owned-agent set. Defer this and the divergence grows.