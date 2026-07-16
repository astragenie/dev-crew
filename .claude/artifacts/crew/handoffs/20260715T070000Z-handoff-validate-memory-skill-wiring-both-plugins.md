# Handoff — Validate astramem memory skill+MCP wiring (runner-plugin + dev-team)

- **Created:** 2026-07-15
- **Objective:** Validate that owned agents in BOTH plugins recall/record memory
  via the registered `astramem:using-memory` skill + astramem MCP, on a fresh
  session after plugin reinstall.
- **Owner (next):** validator (fresh Claude Code session required)
- **Confidence:** medium — mechanism proven (`crew:reviewer` loaded the skill +
  recalled via `agent_profile`); the specific per-agent config changes are
  unvalidated because dispatched subagents use session-start agent defs and
  in-session cache edits do NOT hot-reload.

## PRs

- **runner-plugin:** https://github.com/astragenie/runner-plugin/pull/513
  (branch `feat/memory-agent-validation`, commit `03037ea3`)
- **dev-team:** https://github.com/astragenie/dev-team/pull/238
  (branch `feat/memory-agent-wiring`, commit `490829a9`)

## What was done

Every owned agent below now carries a skill-only `## Memory (astramem)` block
invoking `Skill(astramem:using-memory)` — **no `mcp__` tool names in any file**
(single source of truth = the skill; rename-safe). Tool access comes from a
**denylist / inherit-all** config (an explicit `tools:` allowlist gets
Skill/ToolSearch/MCP silently stripped on dispatch — proven; the denylist form
lets agents inherit them while read-only agents stay read-only).

**runner-plugin (6):** architect, researcher (deny Write/Edit/NotebookEdit);
market-researcher (deny Edit/NotebookEdit); pm, hierarchical-dispatcher (deny
Edit/NotebookEdit); document-writer (deny NotebookEdit).

**dev-team (17):** reviewer, architect-reviewer, verifier, qa-expert,
performance-engineer (deny Write/Edit/NotebookEdit); researcher (deny
Write/Edit); integrator, test-automator (deny Agent/NotebookEdit); backend-dev,
frontend-dev, fullstack-dev, aiplugin-dev, refactor, architect, uxdesigner,
document-writer, release-engineer (inherit-all).

Gates green in both repos (typecheck, agent validators, lint; runner full test
suite 2876 pass).

## Validation procedure (per repo)

1. **Reinstall the plugin** from its branch, then **start a FRESH Claude Code
   session** — dispatched subagents use the session-start agent registry;
   cache edits do not hot-reload (this is why in-session re-tests showed old
   tools).
2. Dispatch each listed agent with a memory task. Confirm:
   - `Skill(astramem:using-memory)` **loads** (no "Unknown skill").
   - `agent_profile({agent:"<role>"})` returns the role's ranked lessons.
   - Read-only agents (denylist) **cannot Write/Edit**.
3. Seed a role-tagged canary first if you want a deterministic check:
   `remember({type:lesson, projectId:<repo>, agentId:"crew:<role>", scope:team,
   content:"…CANARY-…"})`, then confirm the dispatched agent surfaces it.

## Recall status (checked 2026-07-15)

- **Daemon is unstable / currently DOWN.** Live check: `POST /recall` AND
  `GET /agents/:agent/profile` both returned HTTP 000 (connection refused) at
  ~2s — the daemon flaps (up→slow→down within minutes).
- Earlier in the session (daemon up): `agent_profile` was instant + correct
  (1121 atoms, canary recalled); `recall_memory` / `mark_memory_used` **hung at
  300s**.
- **So recall is NOT working end-to-end.** `agent_profile` works when the daemon
  is up; the semantic-search (`recall_memory`) + feedback (`mark_memory_used`)
  halves are blocked by daemon bugs. Validate the `agent_profile` half now;
  the rest is gated on the daemon fixes.

## Open blockers (astramem-local)

- **#341** — write path drops project/agent tags (also: runner's programmatic
  `rememberSilent` returns `no-cli` — wire provider unresolvable). Not on the
  skill+MCP path (MCP `remember` tags correctly), but relevant to the retired
  programmatic path.
- **#343** — daemon REST cold-connection penalty 2–14s/first-call + flapping.
- **#347** — `recall_memory` (`/recall`) + `mark_memory_used` hang ~300s while
  `agent_profile` is instant. **This is the current recall blocker.**

## Forbidden scope

- Do not revert to the programmatic DEC-009 client path (skills+MCP is the
  chosen direction for agent-facing recall).
- Do not add `mcp__` tool names to agent files (breaks rename-safety).

## Suggested next handoff

- After daemon #347/#343 land: re-run the canary e2e (recall_memory +
  mark_memory_used) and confirm usefulness moves off 0.5.
- Merge order: land daemon fixes → validate recall → merge both agent PRs.
