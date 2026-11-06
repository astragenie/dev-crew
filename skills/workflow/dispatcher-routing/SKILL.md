---
name: dispatcher-routing
prompt_id: dispatcher-routing
version: 1.0.0
tier: workflow
description: Agent quick reference table and specialist routing rules for the dispatcher orchestrator — which crew agent to dispatch for each need, architect-mandatory triggers, and multi-need split rule.
owner: astra
last_reviewed: 2026-06-13
triggers: ["dispatch", "route", "which agent", "agent quick reference", "specialist", "routing"]
---

# Dispatcher Routing

## Trigger

Load when the dispatcher needs to pick an agent or decide how to split a multi-need slice.

## Agent Quick Reference

For most slices, pick from the main crew:

| Need | Agent | Stack |
|------|-------|-------|
| Backend code (API, DB, server) | `devcrew:backend-dev` | C#/.NET, Node, Python, Go |
| Frontend code (UI, React, CSS) | `devcrew:frontend-dev` | React, TypeScript |
| Mixed code (scripts, CI, agents, skills, infra) | `devcrew:fullstack-dev` | TypeScript, Python, Terraform |
| Architecture / ADR / schema design | `devcrew:architect` | agnostic |
| UX flow / a11y / wireframe | `devcrew:uxdesigner` | React |
| Customer docs (README, CHANGELOG, release notes) | `devcrew:document-writer` | Markdown |
| Independent code review | `devcrew:reviewer` | agnostic |
| Behavior validation / full-suite gate | `devcrew:verifier` | agnostic |
| FE+BE wire-up smoke after parallel fullstack-devs | `devcrew:integrator` | TypeScript, React |
| Deployment + environment evidence | `devcrew:release-engineer` | agnostic |
| Read-only investigation (persistent findings) | `devcrew:researcher` | agnostic |
| Cheap file:line lookup (no findings persist) | `devcrew:investigator` | agnostic |
| LOW-tier review+validate | `devcrew:reviewer` alone when `has-consumer-ci` reports present, else also `devcrew:verifier` | agnostic |
| Code quality sweep (stale refs, drift) | `devcrew:refactor` | TypeScript |
| Performance audit (latency, N+1, benchmarks) | `devcrew:performance-engineer` | agnostic |
| QA / test coverage gap analysis | `devcrew:qa-expert` | agnostic |

For specialist work (3rdparty agents, fan-out lenses, arbitration, scope-specific picks) rely on the Agent quick reference table above + the examples listed here; dispatch `devcrew:investigator` if you need a specific capability lookup. LOW-risk slices: one reviewer; verifier is replaced by `write-validation-result --decision skipped --skip-reason "delegated to CI: <workflow file>"` only when `has-consumer-ci` reports present; otherwise dispatch `devcrew:verifier`. (There is no combined reviewer+verifier agent.) Other specialist routing examples: `devcrew:csharp-reviewer` (stack:csharp lens), `devcrew:3rdparty:refactoring-specialist` (concern:refactor + scope:wide), `devcrew:test-automator` (concern:test-infra), `devcrew:3rdparty:critical-thinking` (ambiguity disambiguator), `devcrew:architect-reviewer` (reviewer disagreement tiebreaker). External caveman plugin agents (`caveman:cavecrew-builder` etc.) are NOT first-class crew specialists — do not route to them; they're owned by the caveman plugin and shipped with their own discipline.

**Architect-mandatory:** `surface:schema`, `concern:governance` (enforcement / process / methodology) MUST route to architect, never to fullstack-dev. `concern:governance` (customer-facing docs) routes to `devcrew:document-writer`; (in-prompt policy edits) routes to architect.

Multi-need slices → split into parallel bundles per Step 3; one agent per concern. No clear pick AND no obvious file pattern → dispatch `devcrew:3rdparty:critical-thinking` (read-only) to disambiguate intent before committing to a route.

The dispatched subagent loads its own skills — you don't need to enumerate them. If a specific skill MUST be loaded (e.g. a security-advisory consultation), name it in the dispatch prompt under `required skills:`.

## Done

Routing decision is complete when:

- the correct agent (or parallel bundle) has been identified from the table
- architect-mandatory triggers have been checked (schema, governance)
- multi-need slices have been split into one agent per concern
- the dispatch prompt contains only task framing (no identity leakage)
