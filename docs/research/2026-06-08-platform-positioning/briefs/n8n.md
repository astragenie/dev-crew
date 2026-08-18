---
competitor: n8n
category: workflow-platform
sources:
  - https://n8n.io/
  - https://docs.n8n.io/advanced-ai/
  - https://docs.n8n.io/advanced-ai/intro-tutorial/
  - https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/
  - https://docs.n8n.io/integrations/builtin/credentials/github/
  - https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/
  - https://docs.n8n.io/flow-logic/error-handling/
  - https://docs.n8n.io/workflows/executions/
  - https://docs.n8n.io/user-management/rbac/
  - https://docs.n8n.io/log-streaming/
  - https://docs.n8n.io/source-control-environments/
  - https://docs.n8n.io/external-secrets/
  - https://docs.n8n.io/insights/
  - https://docs.n8n.io/hosting/scaling/
  - https://docs.n8n.io/api/
  - https://n8n.io/enterprise/
  - https://n8n.io/integrations/linear/
  - https://github.com/n8n-io/n8n
date: 2026-06-08
---

## Scores

| Axis | Score | Evidence |
| --- | --- | --- |
| 1. Planning | 1 | No pre-flight design/spec/decomposition phase. Workflow design is the artifact - designer-as-IDE, not designer-as-planner. AI Agent node executes intent inside one run; no separate spec-to-decompose-to-implement gate. Tutorial frames building as direct canvas-drag, not plan-then-build (docs.n8n.io/advanced-ai/intro-tutorial/). |
| 2. Multi-Agent | 2 | AI Agent node supports tool-using single agent plus sub-agents via the AI-Agent-as-a-tool pattern. The LangChain integration exposes chains and agents but n8n own primitive is one agent node per role; multi-agent cooperation is hand-wired by chaining nodes, not a first-class team abstraction (docs.n8n.io/advanced-ai/, docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/). |
| 3. Shared Memory | 2 | Memory sub-nodes (Simple Memory in-process, plus external stores via vector-DB / Redis / Postgres memory nodes) attach to AI Agent. Memory is per-agent and per-session - no cross-workflow shared knowledge layer without user-built persistence (intro-tutorial step 8 Adding persistence). |
| 4. Workflow Visibility | 3 | Canvas shows live node state; execution view shows per-node inputs/outputs/timing; logs panel for AI nodes shows system prompt and tool calls. Executions list with status, mode, redaction (docs.n8n.io/workflows/executions/). Strongest dimension for n8n. |
| 5. Knowledge Base | 2 | Vector store nodes (Pinecone, Qdrant, Postgres pgvector, Supabase) are first-class for RAG, but knowledge is per-workflow data plumbing, not a structured repo-knowledge primitive. No built-in decisions/lessons artifact model. |
| 6. Human Approval Gates | 2 | Wait node supports pause-until-webhook, pause-for-time, pause-until-date; can resume via signed URL - usable as approval gate but unnamed (not approval as a typed primitive). Form-trigger plus wait pattern is the canonical human-in-the-loop recipe (docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/). |
| 7. GitHub Integration | 2 | First-class GitHub node (issues, PRs, files, releases) with OAuth2 and PAT credentials. Source-control feature uses Git/GitHub for workflow versioning across environments. No sub-issue primitive - GitHub sub-issue API surfaces only via raw REST (docs.n8n.io/integrations/builtin/credentials/github/, docs.n8n.io/source-control-environments/). |
| 8. Linear Integration | 2 | Native Linear node with Trigger plus Create/Update Issue operations (n8n.io/integrations/linear/). Coverage is CRUD-grade, not deep workflow sync (no cycle/project/roadmap automation primitives observed). |
| 9. Architecture Governance | 0 | No ADR or decision-tracking primitive. Source control gives workflow diffs, not architectural-decision artifacts. Governance happens via review-in-PR if user wires it. |
| 10. Standards Enforcement | 1 | Code node lint via Monaco editor; no convention/content-length/lint gate on workflow structure itself. RBAC and credential scoping enforce access, not code-style standards (docs.n8n.io/user-management/rbac/). |
| 11. Learning From Past Runs | 1 | Execution history is browsable and re-runnable. Insights dashboard tracks failure rate and time-saved over rolling window. No grade-into-next-run loop; no retrospective primitive (docs.n8n.io/insights/). |
| 12. Cost Tracking | 1 | Time-saved metric on Insights dashboard (fixed or dynamic per-execution) is the closest. No native LLM token-cost rollup per run; user wires it via custom Code node. Execution-quota tracking exists for cloud plans (docs.n8n.io/workflows/executions/, docs.n8n.io/insights/). |
| 13. Agent Analytics | 1 | Per-execution timing and per-node logs visible. No per-agent latency/token/outcome panel - AI Agent logs show prompt and response, not aggregated KPIs. Workflow-level Insights covers run-time average and failure rate (docs.n8n.io/insights/). |
| 14. Loop Execution | 2 | Cron and Schedule triggers, queue-mode workers, sub-workflow loops, Loop-Over-Items node enable autonomous walks. Workflow can self-trigger via webhook chain. No higher-level walk-a-backlog-until-exhausted primitive - user assembles it (docs.n8n.io/hosting/scaling/). |
| 15. Self-Healing | 2 | Error Trigger plus error-workflow assignment provides retry/notify/compensate hooks; per-node Retry-On-Fail setting; Stop-and-Error node for controlled failure. No circuit-breaker primitive; no autofix (docs.n8n.io/flow-logic/error-handling/). |
| 16. Enterprise Readiness | 3 | SSO/SAML/LDAP, RBAC with projects and roles, audit-log streaming (webhook/syslog/sentry), external secrets (1Password/Vault/AWS Secrets Manager/Azure KV/GCP), SOC 2 (Trust Center confirms), self-host plus isolated cloud, execution-data redaction (docs.n8n.io/user-management/rbac/, docs.n8n.io/log-streaming/, docs.n8n.io/external-secrets/, n8n.io/enterprise/, n8n.io/legal/). |

## Strengths (top 3)

1. **Workflow visibility and observability.** Canvas-level live state, per-node input/output replay, execution lists with redaction, log streaming to Sentry/Syslog/Webhook destinations. Strongest dimension and a clear show-your-work model.
2. **Enterprise hardening.** RBAC, SSO/SAML/LDAP, audit-log streaming, external-secrets vaults, project-scoped credentials, SOC 2 attestation, self-host plus isolated cloud, and a Git-based source-control plus environments story - far ahead of most agent-shaped competitors on production governance.
3. **Integration surface area.** 400+ pre-built integrations including a first-class GitHub node, Linear node, Slack, Jira, plus a generic HTTP node, plus a LangChain-based AI Agent node with tool/memory/vector-store sub-nodes - the glue layer is dense.

## Weaknesses (top 3)

1. **No planning or governance primitives.** No spec-decompose, no ADR, no retrospective, no lessons-into-next-run loop. n8n optimizes for executing automations, not evolving a system - the architectural-memory layer is empty.
2. **No coding-agent shape.** AI Agent is single-agent plus tool-using; multi-agent collaboration is hand-wired node-chain. No team-of-specialists abstraction (builder/reviewer/validator). No backlog-to-slice-to-close ceremony primitive. A coding-agent workflow on n8n is buildable but the platform offers no opinion on how.
3. **Weak cost and agent analytics.** No per-run LLM cost rollup, no per-agent token/latency dashboard. Insights tracks workflow-level metrics (run-time, failure rate, time-saved) but not the AI-economics layer Crew/Loop care about.

## Features Crew/Loop should NOT copy (and why)

1. **The canvas-as-IDE design surface.** n8n interactive node-graph is its product moat; Crew/Loop value is opinionated agent ceremony driven by slash commands and markdown artifacts. A visual designer would dilute that and create a maintenance burden (custom UI runtime plus drift between graph and prompt).
2. **The 400-integration node library model.** n8n catalog is amortized across SaaS verticals; Crew/Loop should stay focused on the engineering-OS slice (review/validate/deploy gates, ADRs, retros) and integrate sideways via gh CLI and MCP servers rather than maintain N hand-coded nodes.
3. **The Sustainable Use fair-code license posture.** n8n license restricts hosting and competing-product use; Crew/Loop are Claude Code plugins distributed under permissive terms - adopting a fair-code clause would conflict with plugin-distribution norms and create user friction.
4. **The Insights time-saved metric.** It optimizes for executive-justification storytelling, not engineering signal. Crew/Loop already track grade dimensions (architecture_quality, observability) - those map cleaner to is-the-system-getting-better than minutes-saved.

## Open questions / low-confidence cells

- **Linear depth (axis 8, score 2).** Verified Trigger plus Create/Update Issue exist; did not enumerate full operation list (cycles, projects, roadmap). Confidence: medium. Next: fetch n8n.io/integrations/linear operations page.
- **Multi-agent first-class abstraction (axis 2, score 2).** Found AI-Agent-as-a-tool pattern but did not verify whether n8n has a higher-level team/crew abstraction shipped after the v1.82.0 agent-type unification. Confidence: medium. Next: read docs.n8n.io/advanced-ai/examples/agent-chain/ (404 in this pass - link rot or moved).
- **SOC 2 type (1 vs 2).** Trust Center confirms SOC 2 but did not verify Type II vs Type I in this pass. Confidence: medium. Score 3 holds either way for the SOC2/SSO/RBAC bundle.
- **Token-cost tracking via community node.** Did not check whether a community-maintained LLM cost tracker node exists; if yes, score 12 could move 1 to 2. Confidence: low on absence.
- **Sub-issue support via GitHub node (axis 7).** GitHub node exposes Issues operations but sub-issue API is a newer GH primitive - likely accessible only via HTTP-node plus REST, not the typed GitHub node. Confidence: medium; would require node-schema inspection.
