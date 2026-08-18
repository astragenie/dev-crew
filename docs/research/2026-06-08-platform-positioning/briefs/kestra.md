---
competitor: Kestra
category: workflow-platform
sources:
  - https://kestra.io/
  - https://kestra.io/docs/concepts
  - https://kestra.io/docs/workflow-components/retries
  - https://kestra.io/docs/enterprise
  - https://kestra.io/plugins/plugin-ai
  - https://kestra.io/plugins/plugin-github
  - https://github.com/kestra-io/kestra
  - https://github.com/kestra-io/plugin-ai
  - https://github.com/kestra-io/plugin-github
  - https://github.com/kestra-io/plugin-linear
  - https://github.com/kestra-io/mcp-server-python
  - https://github.com/kestra-io/agent-skills
date: 2026-06-08
confidence: medium-high
---

## Identity

Open-source declarative event-driven orchestration platform (Apache-2.0, Java, ~27k stars, first commit 2019). Workflows authored as YAML. ~600+ plugins. 2025 added first-class AI agents via `plugin-ai` (AIAgent, ChatCompletion, RAG/Embedding, Memory, Tool tasks) + MCP server. Workflow platform, NOT coding-agent harness — scored from "could developer build Crew/Loop-style coding-agent workflow on top?"

## Scores

| Axis | Score | Evidence |
| --- | --- | --- |
| Planning | 1 | YAML declarative DAG authored by hand. No pre-flight design/spec/decomposition agent phase. Developer could model SPEC→FEAT→SLICE as nested subflows; Kestra ships no opinion. |
| Multi-Agent | 2 | `plugin-ai` provides `AIAgent` task with tool-calling and memory; multiple agent tasks composable (subflows, parallel, sequential). Cross-agent handoff is workflow-mediated, not native role-aware. |
| Shared Memory | 2 | `AIAgent.memory` block for per-agent conversation memory; flow-level state via `outputs` + KV Store (namespace-scoped, persisted). No semantic "shared agent memory" abstraction — wire yourself. |
| Workflow Visibility | 3 | Topology view, Gantt timeline, live logs, per-task outputs, real-time execution UI. Headline selling point. |
| Knowledge Base | 1 | KV Store + Files for persistent data; RAG/Embedding tasks in `plugin-ai` enable vector-store knowledge. No native "repo knowledge" abstraction (no ADRs, FEATs, grades schema). DIY on KV + namespaces. |
| Human Approval Gates | 3 | `Pause` task is first-class flowable: pause workflow, await human resume via UI/API, optional timeout. Strong primitive. |
| GitHub Integration | 2 | `kestra-io/plugin-github` — "Tasks that search GitHub and manage issues, pulls, and workflows" (6 stars, official). Issues + PRs at task level. No sub-issue / project board first-class model. |
| Linear Integration | 2 | `kestra-io/plugin-linear` exists. Coverage depth not inspected; assume basic CRUD on issues. |
| Architecture Governance | 0 | No ADR / decision-record primitives. Workflow YAML version-controlled in Git, no "decision tracking" concept. |
| Standards Enforcement | 1 | YAML schema validation at flow registration; namespace-scoped pluginDefaults enforce common config. No lint/convention/content-length style gates. Enterprise may have policy rules. |
| Learning From Past Runs | 1 | Execution history + outputs queryable; logs and metrics persisted. No grade/retro/lesson abstraction feeding next run. Developer builds on KV Store. |
| Cost Tracking | 1 | No native $-per-run / token-cost UI. `plugin-ai` tasks likely emit token counts in outputs (inferred), roll your own. Enterprise may have richer metrics. |
| Agent Analytics | 2 | Per-task execution metrics (duration, state, attempts) first-class. For AI tasks, token/latency surfaces via task outputs. No per-agent dashboard out of box. |
| Loop Execution | 3 | Triggers (schedule, webhook, flow-event, realtime stream), `ForEach`, `Subflow`, `WaitFor`, conditional branches. Built for autonomous walks. Marathon-style loops trivially expressible. |
| Self-Healing | 3 | Retries (constant/exponential/random), `allowFailure`, `errors:` branch, automatic restart policies, circuit-break-equivalent via retry budgets. |
| Enterprise Readiness | 3 | Enterprise docs explicitly list SOC 2, SSO, OIDC, LDAP, RBAC, Audit Log, Namespace, Secret Manager. On-prem default (self-host Java app). |

**Total: 30 / 48**

## Strengths (top 3)
1. **Best-in-class workflow visibility + UI.** Topology, Gantt, live logs, real-time outputs. If Loop's auto-mode telemetry feels invisible to operators, Kestra's UI is reference design.
2. **Production-grade self-healing + autonomous loops.** Retries with multiple strategies, error branches, `allowFailure`, triggers including realtime streams. Crew/Loop autonomous-run engine could model on these primitives without reinvention.
3. **Enterprise readiness on day one.** SOC 2, SSO/OIDC/LDAP, RBAC, audit log, namespaced secrets, self-host. Clears procurement bar most coding-agent tools fail.

## Weaknesses (top 3)
1. **Zero coding-agent opinion.** No SPEC/FEAT/SLICE/ADR/grade abstractions. `plugin-ai` gives LLM tasks; the *methodology* is entirely on developer. Crew + Loop ship that opinion.
2. **No native cost/governance for AI tasks.** Token cost tracking, per-agent budget alerts, decision-record lineage — all DIY on KV Store and outputs. Meaningful build for AI-heavy coding-agent workload.
3. **YAML-author surface is wrong shape for code agents.** Operator-authored declarative DAGs. Coding agents need dynamic re-planning mid-flow. `Pause` + `Subflow` can simulate but not native idiom.

## Features Crew/Loop should NOT copy (and why)
1. **Heavyweight YAML schema with hundreds of task types.** ~600+ plugins. Crew/Loop "agent + skill + slice" surface intentionally narrower; plugin proliferation dilutes methodology focus.
2. **Java-based JVM-deployed server architecture.** Postgres/Elasticsearch/Kafka backends. Adopting server runtime breaks "live inside editor" property.
3. **Topology/Gantt graphical authoring UI.** Beautiful for ops; wrong for code agents whose "workflow" is codebase + git history. Artifact files (`handoffs/`, `reviews/`, `runs/`) ARE visibility layer.
4. **`Pause` task as only approval primitive.** Monolithic ("wait for any human"). Role-typed pauses (reviewer PASS, validator PASS, lead approval, user-confirmation) carry more semantic weight.

## Open questions / low-confidence cells
- **Cost tracking depth** — does `plugin-ai` emit token counts + dollar estimates as structured outputs, or only raw counts? Plugin-ai task schemas not loaded.
- **Enterprise policy/governance** — Kestra Enterprise may have policy rules (OPA-style); landing page hints "governance," specific feature set not loaded.
- **`agent-skills` repo (11 stars)** — "Kestra's collection of agent skills" — Crew-skill-like surface emerging? Did not inspect contents. Follow up if Kestra moves toward agent-methodology layer.
- **GitHub plugin sub-issue coverage** — `plugin-github` mentions issues/pulls/workflows; parent/sub-issue, projects v2, discussions coverage not verified.
- **Linear plugin depth** — `plugin-linear` exists; README/task list not inspected. Score 2 is presence-based estimate.
- **Multi-agent coordination idiom** — whether `AIAgent` tasks can hand off mid-conversation to another `AIAgent` (delegate pattern) or only via flow-level subflow boundaries unclear from homepage.
