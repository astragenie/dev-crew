---
type: score-translation
source: docs/research/2026-05-28-competitor-gap-audit/briefs/
date: 2026-06-08
translator: lead (this session)
note: 10-axis (May 28) → 16-col scores. Translation, not re-audit. ◐ → 1 or 2 depending on prose; ● → 2 or 3; ○ → 0 or 1. Cells with no May 28 signal scored from brief prose.
---

# Score translation worksheet — 4 May 28 competitors → 16-col rubric

## Aider (ai-coding)

| Axis | Score | Evidence (from May 28 brief) |
| --- | --- | --- |
| Planning | 0 | "No named phases; one chat session covers ask/code/commit." |
| Multi-Agent | 1 | Architect+editor two-model split is partial role separation; not true multi-agent. |
| Shared Memory | 0 | Single-session; chat history flat; "no cross-session backlog or decisions log." |
| Workflow Visibility | 1 | `.aider.chat.history.md` + analytics JSONL; flat text, no live step state. |
| Knowledge Base | 2 | Repo-map (tree-sitter graph-ranking) gives whole-codebase structured knowledge. |
| Human Approval Gates | 1 | git auto-commit + /undo; no named in-flow pause points. |
| GitHub Integration | 1 | Git auto-commit only; no PR/issue/sub-issue API plumbing. |
| Linear Integration | 0 | None. |
| Architecture Governance | 0 | No ADR/decision-log primitive. |
| Standards Enforcement | 2 | Auto-lint default ON, fires per edit, triggers self-repair. Strong. |
| Learning From Past Runs | 0 | No grade/retro system; "institutional knowledge in commit messages only." |
| Cost Tracking | 1 | PostHog analytics tracks token counts; "no per-session budget or blocking alerts." |
| Agent Analytics | 1 | Same JSONL analytics; no per-agent (only one agent) metrics. |
| Loop Execution | 0 | "No marathon-mode backlog walker." |
| Self-Healing | 2 | Auto-lint + auto-test trigger self-repair on every edit. |
| Enterprise Readiness | 1 | OSS Apache-2.0 CLI; no SOC2/SSO/RBAC/audit-log. |

## CrewAI (agent-framework)

| Axis | Score | Evidence |
| --- | --- | --- |
| Planning | 2 | `AgentPlanner` flag runs pre-execution decomposition; Flows model phase-like graphs. |
| Multi-Agent | 3 | Explicit role/goal/backstory + hierarchical process + manager-agent delegation. |
| Shared Memory | 3 | Unified Memory class, LanceDB vector backend, scoped, cross-session. |
| Workflow Visibility | 2 | `output_log_file` + `usage_metrics` + OpenTelemetry tracing; no live UI. |
| Knowledge Base | 2 | Memory + Knowledge Sources; persistent vector-indexed. |
| Human Approval Gates | 1 | `human_input=True` flag is binary block; not in-flow named pause. |
| GitHub Integration | 1 | Generic webhook intake; no first-class PR/issue object. |
| Linear Integration | 0 | None native. |
| Architecture Governance | 0 | No ADR/decision-tracking primitive. |
| Standards Enforcement | 1 | Task guardrails (fn + LLM) on output; not code-lint. |
| Learning From Past Runs | 2 | `crewai train` CLI persists human feedback to prompts across iterations. |
| Cost Tracking | 1 | `usage_metrics` post-run; "no per-phase cost budget or alert system." |
| Agent Analytics | 2 | OpenTelemetry tracing flag exposes per-agent runtime. |
| Loop Execution | 2 | Flows event-driven; `akickoff()` parallel; no autonomous walker primitive. |
| Self-Healing | 2 | Task guardrails with `guardrail_max_retries` auto-retry. |
| Enterprise Readiness | 2 | CrewAI AMP SaaS console + RBAC + safe redeploy + live monitoring. |

## Cursor agents (ai-coding)

| Axis | Score | Evidence |
| --- | --- | --- |
| Planning | 2 | Plan Mode = pre-flight codebase research + editable markdown plan + approval. |
| Multi-Agent | 2 | Async hierarchical subagents (parent spawns children); no named-role protocol. |
| Shared Memory | 2 | Project-scoped Memories (beta, background-model-proposed, user-approved). |
| Workflow Visibility | 2 | Checkpoint snapshots per session + Admin Dashboard usage analytics. |
| Knowledge Base | 2 | `.cursor/rules/` glob-attach + Memories per project. |
| Human Approval Gates | 2 | Plan Mode approval gate + sandbox approval on destructive ops. |
| GitHub Integration | 3 | Bugbot PR comments + Fix-in-Cursor buttons + GH issue assign-to-Cursor. |
| Linear Integration | 3 | Native partner integration via Marketplace. |
| Architecture Governance | 0 | No ADR/decision primitive. |
| Standards Enforcement | 2 | `.mdc` rules with glob auto-attach + always-apply + AI-relevance inference. |
| Learning From Past Runs | 1 | Memories propose+approve loop; no grade/retro aggregation. |
| Cost Tracking | 2 | Team Admin Dashboard surfaces per-model token + spending stats. |
| Agent Analytics | 2 | Per-model stats + tool-specific statistics in admin dashboard. |
| Loop Execution | 2 | Background Agents (cloud Ubuntu VMs) run asynchronously, push to branches. |
| Self-Healing | 2 | Bugbot autofix on PR review; sandbox catches destructive ops. |
| Enterprise Readiness | 3 | Enterprise tier with SSO/SAML, RBAC, audit-log, deployment controls. |

## LangGraph (agent-framework)

| Axis | Score | Evidence |
| --- | --- | --- |
| Planning | 1 | Graph node sequencing models phase-like flow; no pre-flight design phase. |
| Multi-Agent | 3 | Supervisor pattern + subgraphs + handoff Commands; first-class multi-agent. |
| Shared Memory | 3 | Two-tier: thread checkpoints + `BaseStore` namespace + semantic search. |
| Workflow Visibility | 3 | LangSmith execution trace + state-transition viz + `get_state_history()` queryable. |
| Knowledge Base | 2 | `BaseStore` JSON documents per namespace + state channels. |
| Human Approval Gates | 3 | `interrupt()` at arbitrary nodes + `Command(resume=...)`; in-flow pause anywhere. |
| GitHub Integration | 0 | Library — no GH adapter built-in. |
| Linear Integration | 0 | None. |
| Architecture Governance | 1 | Typed `StateGraph` with reducer-based merges is light state-shape governance. |
| Standards Enforcement | 1 | Reducer fns enforce state-merge semantics; no code-lint gate. |
| Learning From Past Runs | 1 | Checkpoints retain history; no grade/retro primitive. |
| Cost Tracking | 1 | LangSmith reports metrics; "no built-in cost budget or alert gate." |
| Agent Analytics | 3 | LangSmith deep observability — per-node state, LLM call traces, performance. |
| Loop Execution | 3 | Durable execution; auto-resume from last checkpoint after failure. |
| Self-Healing | 3 | Mid-execution failure → resume from last super-step checkpoint, skip done nodes. |
| Enterprise Readiness | 2 | LangSmith Deployment (hosted SaaS) for stateful long-running agents. |

## Translation notes

- **Cells scored from May 28 prose** (not direct mapping): Workflow Visibility, Knowledge Base, GitHub Integration, Linear Integration, Architecture Governance, Standards Enforcement (code-lint specific), Learning From Past Runs, Self-Healing, Loop Execution.
- **Cells scored from rubric definition** where May 28 had no signal: cells defaulted to 0 unless brief prose hinted at adjacent capability.
- **Aggregate scores per competitor** (sum of 16 axes, max 48):
  - Aider: 13
  - CrewAI: 26
  - Cursor agents: 30
  - LangGraph: 30
