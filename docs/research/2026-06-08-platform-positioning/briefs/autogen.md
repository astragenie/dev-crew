---
competitor: AutoGen
category: agent-framework
sources:
  - https://github.com/microsoft/autogen
  - https://microsoft.github.io/autogen/
  - https://github.com/microsoft/autogen/tree/main/python/packages/autogen-studio
  - https://github.com/microsoft/autogen/tree/main/python/packages/agbench
  - https://github.com/microsoft/agent-framework
date: 2026-06-08
status_flag: MAINTENANCE MODE (as of late 2025)
confidence: high
---

## Status flag

**AutoGen is in MAINTENANCE MODE.** Official README badge: "status-maintenance mode"; directs new users to Microsoft Agent Framework (MAF). Contributions limited to bug fixes/security/docs. Last Python release `python-v0.7.5` (2025-09-30). Strategic threat = deprecation event, not moving target. Scores reflect AutoGen v0.4+ as shipped, not MAF.

## Scores

| Axis | Score | Evidence |
| --- | --- | --- |
| Planning | 1 | No pre-flight design/spec/decomposition. Agents configured imperatively; reason at runtime inside chats. No spec-decompose/approved-slices analog. |
| Multi-Agent | 3 | Core differentiator. Layered API (Core message-passing + AgentChat group-chats + Extensions). AgentTool wraps agent as tool; group chat / two-agent / swarm. Magentic-One reference. |
| Shared Memory | 2 | AgentChat exposes message-history/conversation state per session; teams share conversation. No durable cross-run knowledge graph — persistence sits at Studio DB (SQLite/Postgres). |
| Workflow Visibility | 2 | `Console(agent.run_stream(...))` streams token-level events; AutoGen Studio GUI playground. Studio explicitly "not production-ready." No phase-gate/slice/halt-badge model. |
| Knowledge Base | 1 | No first-class structured repo knowledge. Conversation history is memory; long-term store via user-implemented Extensions (vector DBs, RAG as examples not primitives). |
| Human Approval Gates | 2 | `UserProxyAgent` injects human-in-loop turns inside chat; `termination_condition` halts. Conversational, not named gate. |
| GitHub Integration | 0 | No first-class GitHub primitive. Users wire GH via MCP or custom tools. |
| Linear Integration | 0 | No native Linear adapter. |
| Architecture Governance | 0 | No ADR/decision-tracking primitives. |
| Standards Enforcement | 0 | No lint/convention/content-length gates. agbench benchmarks task success, not code-quality. |
| Learning From Past Runs | 1 | agbench (AutoGen Bench) offline eval harness for performance; no built-in retro/grades pipeline biasing next run. |
| Cost Tracking | 2 | Per-message token usage via model-client response metadata; v0.4 `RequestUsage` on messages — manual aggregation. No native $-budget alert. |
| Agent Analytics | 2 | OpenTelemetry tracing supported (v0.4 Core `tracer` instrumentation). Per-agent token/latency via OTel exporter. Bring-your-own backend. |
| Loop Execution | 2 | Teams/GroupChat/Swarm patterns iterate until termination condition fires. Magentic-One demonstrates autonomous walk for web/code/file. No backlog-walk/approved-slices loop. |
| Self-Healing | 1 | Reflection patterns + `max_tool_iterations` retry configurable; no first-class circuit-breaker/autofix-on-failure. Failure handling = user composes retry agents. |
| Enterprise Readiness | 1 | Maintenance mode + Studio "not for production" + research-prototype language. .NET RuntimeGateway gRPC hints at distributed deploy; no SOC2/SSO/RBAC/audit claims. MAF is enterprise successor. |

**Total: 20 / 48**

## Strengths (top 3)
1. **Layered architecture (Core / AgentChat / Extensions).** Clean separation low-level message-passing runtime, opinionated chat API, pluggable model-client/tool extensions. Cross-language (.NET + Python) via gRPC.
2. **Multi-agent orchestration patterns as primitives.** Two-agent chat, group chat, swarm, AgentTool-wrap-agent-as-tool, Magentic-One. Mature vocabulary for cooperating agents.
3. **Studio + agbench tooling.** No-code GUI playground (Studio) + benchmark harness (agbench) for measuring agent task success. Benchmarking suite is missing piece in Crew/Loop.

## Weaknesses (top 3)
1. **Maintenance mode.** Strategic threat reduced from "competitor" to "legacy install base." Any FEAT chasing AutoGen parity should pivot to MAF parity instead.
2. **No software-engineering loop primitives.** Conversational multi-agent framework, not coding-agent platform. No plan→build→review→validate→ship, no GitHub/Linear, no ADR/standards, no grades feedback. Crew/Loop's entire engineering-OS layer is uncontested.
3. **Studio explicitly "not production-ready."** Repeated security warnings; most visible AutoGen surface to CTO is gated by research-prototype disclaimer.

## Features Crew/Loop should NOT copy (and why)
1. **Conversational human-in-the-loop via `UserProxyAgent`.** AutoGen embeds user as agent inside chat. For autonomous engineering loops, collapses gate semantics into chat turns — incompatible with Loop's named halt-badges + approval-gate model.
2. **No-code Studio GUI as primary surface.** Studio's caution callout shows the cost: GUI playground without authentication/RBAC/jailbreak hardening, walled off from production.
3. **Magentic-One-style generalist autonomous team.** Single fleet (web-browse + code-exec + file-handle) tackling open-ended tasks. Loop's single-FEAT slice + reviewer gate is opposite philosophy. Generalist swarms are demo-rich, grade-poor.
4. **Maintenance-mode framework as dependency.** Do not adopt AutoGen as upstream. If multi-agent runtime parity wanted, target MAF.

## Open questions / low-confidence cells
- **Cost Tracking** — verified `RequestUsage` token field; could not confirm v0.4 ships budget-alert hook.
- **Agent Analytics** — OTel tracing referenced; depth of per-agent dashboards vs raw spans not verified.
- **Enterprise Readiness** — .NET RuntimeGateway hints at distributed deploy; no SOC2/SSO/RBAC/on-prem statements. Check microsoft/agent-framework for current enterprise story.
- **Migration pull** — what fraction of AutoGen's 58k stars migrating to MAF vs LangGraph/CrewAI vs staying put? Drives whether AutoGen is competitive backdrop or irrelevant artifact.

## Strategic takeaway
Headline finding: maintenance-mode pivot. 58.7k stars on GitHub = large installed base, but Microsoft has effectively retired AutoGen for Agent Framework. Consider adding separate brief for `microsoft/agent-framework` and treat AutoGen as historical context.
