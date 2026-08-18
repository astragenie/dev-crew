---
competitor: Mastra
category: agent-framework
sources:
  - https://mastra.ai/
  - https://github.com/mastra-ai/mastra
  - https://mastra.ai/docs
  - https://mastra.ai/docs/agents/overview
  - https://mastra.ai/docs/workflows/overview
  - https://mastra.ai/docs/workflows/suspend-and-resume
  - https://mastra.ai/docs/memory/overview
  - https://mastra.ai/docs/observability/overview
  - https://mastra.ai/docs/evals/overview
  - https://mastra.ai/docs/auth
  - https://mastra.ai/pricing
date: 2026-06-08
confidence: high
---

## Scores

| Axis | Score | Evidence |
| --- | --- | --- |
| Planning | 1 | Agents framed as autonomous (LLM iterates internally); workflows are "tasks clearly defined upfront." No pre-flight design/spec/decomposition phase — encoded as workflow graph (`.then() / .branch() / .parallel()`). |
| Multi-Agent | 3 | "agents can be composed into workflows or multi-agent systems"; "multi-agent system uses multiple agents… split responsibilities across focused agents, coordinator brings results together." First-class primitive. |
| Shared Memory | 3 | Memory overview: working memory + semantic recall + conversation history. "You can share memory between agents by passing matching identifiers." Memory Gateway = paid SKU. |
| Workflow Visibility | 3 | `stream` mode "emits events during execution… monitor progress or trigger actions as steps complete"; Mastra Studio local dev UI. Observability: traces + metrics + logs with correlation IDs. |
| Knowledge Base | 2 | RAG documented primitive (`/docs/rag/overview`); semantic memory persists structured recall. No opinionated "repo-knowledge" store; teams BYO vector DB. |
| Human Approval Gates | 3 | First-class. Workflows can `suspend()` and `resume()` with persisted state: "Suspend an agent or workflow and await user input or approval before resuming. Mastra uses storage to remember execution state, so you can pause indefinitely." |
| GitHub Integration | 1 | No native GitHub issue/PR/sub-issue adapter in docs index. Users wire `@octokit/rest` as tool. |
| Linear Integration | 0 | No documented Linear adapter; community Slack mention only. |
| Architecture Governance | 0 | No ADR/decision-tracking primitive. Targets agent runtime, not engineering process. |
| Standards Enforcement | 0 | No lint/convention/content-length gates. Ships ESLint config for own monorepo; doesn't enforce on user code. |
| Learning From Past Runs | 2 | Scorers (formerly "evals") run live and in CI/CD; "use scorers to evaluate historical traces." No automatic feed-forward of grades into next agent run; iteration is human-driven. |
| Cost Tracking | 2 | Observability captures model interactions with token-bearing traces (OTel-style); pricing implies per-run consumption pricing on Mastra Cloud. No documented "$ budget alert" primitive in OSS. |
| Agent Analytics | 3 | "visibility into every agent run, workflow step, tool call, and model interaction" with three signals (metrics + traces + logs) sharing correlation IDs. Per-agent latency/token/outcome derivable. |
| Loop Execution | 2 | Agents loop autonomously ("iterate internally until model emits final answer or stopping condition met"). Workflow autonomy bounded — graph defines steps; no "walk a backlog" autonomous mode. |
| Self-Healing | 1 | Workflows: on lost server connection, run "can be restarted from last active step." No automatic retry/circuit-break/autofix primitive at agent level. |
| Enterprise Readiness | 3 | Enterprise tier: "RBAC, audit logs, support and uptime SLAs"; SSO + SOC2 mentioned; "On-prem platform deployments." `ee/` source-available enterprise license. YC W25 backed. |

**Total: 29 / 48**

## Strengths (top 3)
1. **TypeScript-native, batteries-included agent runtime.** One framework covers agents + graph workflows + memory + RAG + scorers + observability + MCP authoring + 40+ model providers. Closest TS analogue to LangChain/LlamaIndex with modern API.
2. **First-class suspend/resume for human-in-the-loop.** Storage-backed pause-indefinitely-and-resume is rare; most competitors model HITL as tool-call hack. Loop's "human approval gate" has direct primitive analogue here.
3. **Observability built in, not bolted on.** Traces/metrics/logs with shared correlation IDs + historical-trace scoring. Pricing surfaces Observability as Cloud SKU with retention tiers.

## Weaknesses (top 3)
1. **No engineering-process layer.** No ADR/governance, no standards enforcement, no spec→decomposition planning, no backlog walking. Runtime library, not delivery methodology — exactly Crew+Loop's gap.
2. **No first-class GitHub/Linear adapters in docs.** Issue/PR/sub-issue automation left to user-authored tools. Meaningful gap vs. competitors shipping native adapters.
3. **Learning loop is manual.** Scorers grade past runs but do not auto-feed forward into agent config. Iteration is engineer-driven via traces + CI, not closed-loop.

## Features Crew/Loop should NOT copy (and why)
- **Mastra Cloud / managed Studio as hosted SKU.** Loop is Claude Code plugin; renting infra for users contradicts "developer's own machine" model. Apache-2.0 + `ee/` dual-license dance heavier than needed.
- **`.then() / .branch() / .parallel()` workflow DSL.** Slice-ceremony + phase-gate runner is higher-level orchestration. Adopting graph DSL pushes toward general-purpose workflow engine territory.
- **40+ model-provider routing layer.** Claude Code already brokers model; duplicating in-plugin wastes surface area.
- **Memory Gateway / semantic recall as built-in.** `loop-snapshot.md` + decisions/grades are file-system-resident and grep-able — vector store buries auditability behind embeddings.
- **Source-available `ee/` licensing model.** Single OSS license; bifurcating "core OSS / enterprise source-available" adds compliance friction.

## Open questions / low-confidence cells
- **GitHub Integration** — `/docs/getting-started/installation` mentions GitHub in nav but no first-class adapter surfaced. Check templates + monorepo `packages/integrations/*`.
- **Linear Integration** — no docs hits. Verify via `npm search @mastra/integration` and monorepo `integrations/`.
- **Cost Tracking $ per run** — observability captures tokens via traces; named "budget alert" primitive not surfaced.
- **Self-Healing retries** — only workflow-restart-from-last-step documented. Tool-call retries/circuit-breakers require reading `@mastra/core` source.
- **Mastra Studio capabilities scope** — pricing-page SKU, `/docs/studio` returned 404; possibly moved under `/reference` or `/guides`.
- **SOC2 status** — "SOC" appears on Enterprise column; "SOC 2 Type II audited today" vs "in progress" not separable.
