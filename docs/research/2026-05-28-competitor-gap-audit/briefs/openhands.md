---
competitor: OpenHands
host: Python SDK + CLI + GUI + Cloud + Enterprise (Kubernetes)
language: Python
license: MIT
version_observed: v1.7.0 (2026-05-01); software-agent-sdk active as of 2026-05
sources:
  - https://github.com/All-Hands-AI/OpenHands
  - https://docs.openhands.dev/
  - https://docs.openhands.dev/sdk/arch/overview
  - https://docs.openhands.dev/llms.txt
  - https://github.com/OpenHands/software-agent-sdk
  - https://deepwiki.com/OpenHands/software-agent-sdk/3.3-sub-agent-delegation-and-task-management
  - https://deepwiki.com/OpenHands/software-agent-sdk/2.1-sdk-package-(openhands-sdk)
  - https://arxiv.org/html/2511.03690v2
  - https://www.openhands.dev/blog/openhands-product-update---may-2026
brief_version: 1
---

# OpenHands -- competitor brief

## Identity

- **Name**: OpenHands (formerly OpenDevin), by All-Hands-AI
- **Host**: Multi-tier -- Python SDK (`openhands-sdk`), CLI, local GUI (React + REST API), OpenHands Cloud (SaaS, Minimax model on free tier), OpenHands Enterprise (self-hosted Kubernetes + Helm)
- **Language**: Python (63% of repo); TypeScript GUI (35%)
- **Install model**: `pip install openhands-sdk`, Docker images, CLI binary, hosted SaaS at app.all-hands.dev, or enterprise Helm chart
- **Version observed**: v1.7.0 (released 2026-05-01); software-agent-sdk underpins v1.0.0+ (2025-12-16 onward); repo at 76.3k stars, ~6,836 commits, 102 releases
- **License**: MIT (core SDK and components)

OpenHands is a general-purpose autonomous coding-agent framework with a composable Python SDK at its core. The SDK exposes a reasoning-action loop, a tool system (Action/Observation/Executor with built-in security validation), a workspace abstraction (LocalWorkspace, DockerWorkspace, RemoteAPIWorkspace) that swaps execution environment without changing agent code, a Condenser for conversation-history compression, a Conversation lifecycle manager (with persistence + pause/resume), Skills (formerly "microagents") as keyword-triggered or manually-triggered specialized prompts, lifecycle Hooks, MCP integration, and sub-agent delegation via DelegateTool (parallel) and TaskToolSet (sequential). It ships with broad LLM provider support (OpenAI, Azure, Bedrock, Gemini, Groq, OpenRouter, LiteLLM proxy, local LLMs, ChatGPT subscription auth), metrics tracking (token usage, cost, latency), and source-control integrations (GitHub, GitLab, Bitbucket, Forgejo, Azure DevOps) plus ops integrations (Slack, Jira, Linear-coming, Confluence).

## Matrix row

| Axis                   | Symbol | 1-line note                        |
| ---------------------- | ------ | ---------------------------------- |
| Workflow phases        | ○      | Single reasoning-action loop per conversation; no named build/review/validate/deploy phases. v1.5.0 added a "planning agent" + task-list tab, but no slice-level phase scaffold |
| Roles / dispatch       | ◐      | Sub-agent delegation is generic, not role-typed -- no builder/reviewer/validator/deployer separation; DelegateTool (parallel) + TaskToolSet (sequential) provide spawn primitives without contract |
| Artifacts / state      | ◐      | Conversation state persisted (Pydantic-typed, immutable) with pause/resume; no structured handoff/review/validation artifact format; trajectory output is conversation log, not phase-gated artifact |
| Memory / retention     | ◐      | Condenser compresses conversation history for token mgmt; `.openhands/` repo-level customization + Skills/microagents act as long-term project memory; no cross-project methodology memory or grade-trend memory |
| Model routing          | ◐      | LLM Profile Store + multiple named configs let sub-agents pick different models; LiteLLM proxy + fallback strategies; no per-phase contract (no builder-vs-reviewer model policy) |
| Cost / telemetry       | ◐      | Built-in metrics: token usage, cost, latency per LLM call; cloud tier has usage reporting + budget enforcement; no per-phase cost slicing, no cost-advisor verdict, no per-iteration trend |
| Backlog / spec         | ○      | No FEAT/SPEC primitives, no priority scoring, no autonomous_safe flag; task intake is conversational or via Jira/Linear/Slack tickets (external systems) |
| Validation / gates     | ◐      | Security module performs action risk assessment + confirmation policies before execution; Stuck Detector for loops; Iterative Refinement (critique-based); no user-defined slice gates or test/lint phase-gate runner |
| Deployment             | ◐      | GitHub/GitLab/Bitbucket integrations open PRs; Cloud + Enterprise platforms handle agent deployment; no app deployment-evidence artifact chain (no deployer role) |
| Install / distribution | ●      | Multi-tier: pip SDK, Docker, CLI, local GUI, hosted SaaS (Cloud), self-hosted Kubernetes (Enterprise + Helm); 102 tagged releases; broad provider matrix |

Legend: ● = full coverage, ◐ = partial, ○ = absent.

## Strengths vs loop / crew

- **Workspace abstraction with execution isolation**: LocalWorkspace / DockerWorkspace / RemoteAPIWorkspace swap underneath the same agent code. Docker sandboxing per session is built-in. loop/crew runs in the host shell with no sandbox boundary.
- **Conversation persistence + pause/resume**: First-class lifecycle primitives let a conversation suspend (e.g. wait on CI) and resume exactly. loop has session-level state in `.claude/artifacts/` but no agent-level pause/resume contract.
- **Condenser for history compression**: Explicit conversation-history condenser as an SDK component for token budget management. loop relies on the harness compaction; no plugin-owned condenser primitive.
- **Pluggable Skills with keyword + manual triggers**: Skills (formerly microagents) are YAML-frontmatter markdown files with declared trigger keywords -- the agent auto-injects them when keywords appear. loop/crew skills are activated by slash commands or routing rules, not by content-aware keyword triggers.
- **Broad LLM provider matrix + LLM Profile Store**: Out-of-the-box: OpenAI, Azure, Bedrock, Gemini/Vertex, Groq, OpenRouter, local LLMs, LiteLLM proxy, ChatGPT-subscription auth, fallback strategies. loop has Claude-Code-native routing only.
- **Sub-agent parallelism**: DelegateTool runs multiple sub-agents concurrently in isolated conversations inheriting parent model + workspace. loop dispatch is sequential within a slice.
- **Multi-tier distribution**: SDK, CLI, local GUI, hosted Cloud, Enterprise K8s with RBAC + multi-user + budgeting. loop ships only as a Claude Code plugin.
- **Lifecycle Hooks**: Observable, logged, customizable execution-stage callbacks (v1.6.0+). loop has slice-level events but no SDK-level hook surface for third-party extension.
- **MCP-native + Custom Tools + parallel tool execution**: Tools follow Action/Observation/Executor with security validation; multiple tools run concurrently within a single LLM response.
- **Stuck Detector + Iterative Refinement**: First-class primitives for loop-detection and critique-feedback refinement. loop has the "phase-gate test suite" and "grade" cycle but not a runtime stuck-detector.

## Weaknesses vs loop / crew

- **No role-typed sub-agents**: DelegateTool and TaskToolSet spawn generic sub-agents -- no builder / reviewer / validator / deployer / researcher contract. Every delegation is freeform task assignment.
- **No structured handoff artifact**: Sub-agents return results; there is no `write-handoff` / `write-review-result` / `write-validation-result` / `write-final-synthesis` discipline. Loops artifact chain (objective + scope + deliverable + confidence + risks + next handoff) has no analogue.
- **No phase gate runner**: No equivalent to `/loop:phase-gate` -- the SDK has Security validation pre-action but not a user-configurable build->review->validate->deploy gate sequence with PASS/FAIL artifacts.
- **No backlog / spec primitives**: No FEAT-NNN / SPEC-NNN / SLICE-NNN scaffolding, no 5-dimension PM scoring, no autonomous_safe flag, no `composite_priority` ladder, no `loop:triage`, no slice rotation.
- **No grade / decision retention**: No per-slice grading (architecture / reliability / observability / production_readiness / security / test_confidence / product_completeness), no DEC-NNN decision ledger, no retrospective aggregation, no grade-trend memory.
- **No HARD RULE block / autonomous-loop discipline**: No equivalent to `.claude/loop/rules.md` -- the auto-mode contract, marathon mode, halt-badge registry, and cost-advisor verdict gates are loop-specific.
- **No deployer evidence chain**: GitHub integration opens PRs but no `.claude/artifacts/crew/deployments/` evidence artifact with explicit user-approval-gated production promotion.
- **No methodology memory across projects**: `.openhands/` is per-repo only; loop snapshot, learnings.jsonl, and MEMORY.md are durable cross-session methodology artifacts.
- **Generic cost telemetry only**: Token/cost/latency per LLM call, but no per-phase cost slice aggregation, no cost-advisor verdict, no per-iteration trend, no in-window trajectory.
- **No content/agent-line caps**: No analogue to loop validate-content-length.mjs (300-line agent cap, 200-line skill cap) -- so prompts can balloon.

## Gap candidates

### GAP-1: Workspace abstraction primitive (Local / Docker / RemoteAPI swap)
- Description: OpenHands lets the same agent code run against LocalWorkspace, DockerWorkspace, or RemoteAPIWorkspace by swapping config. loop/crew runs in host shell only; a "workspace" concept that allows builder dispatches into a sandboxed Docker would isolate destructive commands and harden auto-mode. Could ship as a `loop.workspace` setting that swaps Bash execution between `host` and `docker run -v ... claude-workspace` per slice.
- Source: https://docs.openhands.dev/sdk/arch/overview (workspace section)
- Impact (0-3): 2 -- meaningful for auto-mode safety; reduces blast radius of `rm -rf` mistakes during long unattended runs
- Effort (0-3): 3 -- would touch every script exec path + require crew-side Bash-tool indirection (Claude Code Bash tool runs on host; needs harness change or wrapper)
- Fit (0-3): 1 -- loop is a Claude Code plugin, not a runtime; sandbox layer is awkward without harness support
- Composite: 2 + (3 - 3) + 1 = **3**

### GAP-2: Pause / resume conversation lifecycle for async waits
- Description: OpenHands has first-class pause/resume so a conversation can suspend on CI/review delay and resume exactly. loop currently treats CI wait as either polling (`/loop:pr-fix`) or session-end-and-restart. A first-class "pause until external event" primitive -- emitting a halt-badge, persisting the slice state, and a `loop:resume <slice>` entry point -- would close this.
- Source: https://docs.openhands.dev/llms.txt (Pause/Resume + Persistence sections); v1.5.0 task-list tab
- Impact (0-3): 2 -- significantly improves marathon-mode reliability across CI gaps and async PR review
- Effort (0-3): 2 -- needs new state schema + entry-point CLI; reuses existing snapshot machinery
- Fit (0-3): 3 -- maps cleanly onto existing halt-badge + workflow-state primitives
- Composite: 2 + (3 - 2) + 3 = **6**

### GAP-3: Keyword-triggered skills (auto-inject prompt fragments by conversation content)
- Description: OpenHands Skills/microagents declare `trigger: keyword` with a keyword list. When any keyword appears in conversation, the skill body is auto-injected. loop skills are activated by slash command or by routing-table mapping, never by content-aware match. A `keywords:` frontmatter field on `skills/**/SKILL.md` plus a pre-dispatch scanner would let, e.g., a "kubernetes" or "azure" skill auto-activate.
- Source: https://github.com/OpenHands/OpenHands/blob/main/skills/README.md ; https://docs.openhands.dev/overview/skills
- Impact (0-3): 2 -- reduces user friction in cross-domain repos; closes a known UX gap
- Effort (0-3): 2 -- frontmatter field + scanner + activation hook; routing-table layer already exists
- Fit (0-3): 3 -- additive to existing skill discovery, no architectural conflict
- Composite: 2 + (3 - 2) + 3 = **6**

### GAP-4: Runtime stuck-detector + iterative-refinement primitive
- Description: OpenHands ships a Stuck Detector that auto-handles timeout/loop scenarios, plus an Iterative Refinement loop where the agent refines work based on critique feedback. loop has phase-gate failures and grade scoring but no in-slice loop-detection primitive -- a builder that gets stuck retries silently until cost-advisor catches it post-hoc. A `loop:stuck-check` + escalation-to-human badge wired into auto-dispatch would close this.
- Source: https://docs.openhands.dev/llms.txt (Stuck Detector + Iterative Refinement)
- Impact (0-3): 2 -- material for cost containment in marathon mode
- Effort (0-3): 2 -- heuristic + integration with existing badge system + auto-dispatch hook
- Fit (0-3): 3 -- complements existing cost-advisor + halt-badges
- Composite: 2 + (3 - 2) + 3 = **6**

### GAP-5: LLM Profile Store with named configs per sub-agent role
- Description: OpenHands has an LLM Profile Store -- reusable named LLM configurations referenced by sub-agents so each can pick a different provider/model. loop model routing is hardcoded per-phase in presets; named profile primitives (e.g. `profile: cheap-haiku`, `profile: premium-opus`) referenced from agent frontmatter would generalize this.
- Source: https://docs.openhands.dev/llms.txt (LLM Profile Store, Custom LLM Configs)
- Impact (0-3): 1 -- nice-to-have for cost control; current preset routing already covers main need
- Effort (0-3): 2 -- new schema + resolver
- Fit (0-3): 2 -- additive; some overlap with `scripts/presets/*.json`
- Composite: 1 + (3 - 2) + 2 = **4**

### GAP-6: Conversation Condenser as a first-class history-compression primitive
- Description: OpenHands has a Condenser component that compresses conversation history mid-session to manage token budgets, independent of the harness compaction. loop relies on Claude Code compaction and on snapshot-memory to re-bootstrap. A user-controllable "condense slice context now" primitive that summarizes prior tool turns into a compressed artifact and re-injects only that, mid-slice, would extend marathon-mode session length.
- Source: https://docs.openhands.dev/llms.txt (Context Condenser)
- Impact (0-3): 1 -- harness compaction already addresses most cases; helps long slices
- Effort (0-3): 3 -- requires harness cooperation or out-of-band context replay
- Fit (0-3): 1 -- intrudes on Claude Code harness territory
- Composite: 1 + (3 - 3) + 1 = **2**

### GAP-7: Budget enforcement at slice / iteration boundary
- Description: OpenHands Cloud has built-in usage reporting + budget enforcement (Cloud tier rejects further work above a configured spend ceiling). loop has cost-advisor verdicts that warn but no hard-stop budget. A `loop.budgetUsd` setting per FEAT or per slice that the cost-advisor enforces by emitting a halt-badge would close this.
- Source: https://docs.openhands.dev/ (Cloud + Enterprise tier features: usage reporting + budget enforcement)
- Impact (0-3): 3 -- critical for unattended auto-mode safety
- Effort (0-3): 1 -- cost-advisor already exists; adds a threshold check + badge emit
- Fit (0-3): 3 -- direct extension of the existing cost-advisor + halt-badge contract
- Composite: 3 + (3 - 1) + 3 = **8**

### GAP-8: Lifecycle hooks API for plugin authors
- Description: OpenHands v1.6.0 added Hooks -- "lifecycle hooks to observe, log, and customize agent execution". loop/crew has slice-events emit points but no documented hook API for third-party plugins to subscribe. Publishing the `slice-events.mts` event vocabulary as a documented contract (with a `loop.hooks.<event>.cmd` config) would let other Claude Code plugins react to slice/agent lifecycle.
- Source: https://docs.openhands.dev/llms.txt (Hooks); v1.6.0 release notes (2026-03-30)
- Impact (0-3): 1 -- mostly future-leverage for an ecosystem of plugins
- Effort (0-3): 1 -- events already emitted; needs doc + config-driven dispatcher
- Fit (0-3): 3 -- aligns with existing event emit infrastructure
- Composite: 1 + (3 - 1) + 3 = **6**

## Inadvisable mimics

- **Hosted SaaS tier**: OpenHands Cloud manages infra + auth + multi-user RBAC. loop is a Claude Code plugin -- running infra is out of scope, and Claude Code already handles auth/identity.
- **Kubernetes Enterprise distribution + Helm chart**: Enterprise-grade self-host is meaningful for OpenHands SDK + GUI surface area. loop has neither GUI nor long-running services -- a K8s distribution would be empty packaging.
- **Native React GUI**: Loop UX is the Claude Code terminal. Building a parallel single-page React app duplicates the harness UI and forks loop surface.
- **Generic sub-agent delegation primitive (DelegateTool / TaskToolSet)**: Loop intentionally enforces role-typed dispatch (builder / reviewer / validator / deployer / researcher) -- adding a generic "spawn arbitrary sub-agent" primitive would undercut the role contract and the artifact discipline that protects review/validation gates.
- **Provider-matrix expansion (OpenAI / Bedrock / Gemini / Groq / local LLM / LiteLLM proxy)**: Loop targets Claude Code; cross-provider routing is the harness job, not the plugin job. Building a provider matrix re-implements LiteLLM inside a Claude plugin.
- **MCP-server proliferation as core feature**: OpenHands SDK markets MCP as a primary extension point. Loop already inherits Claude Code MCP infrastructure -- shipping MCP servers in-plugin would duplicate the harness layer.
- **ACP-style "delegate to compatible servers"**: OpenHands has an ACP Agent that delegates to compatible servers instead of calling LLMs directly. Loop has no equivalent need: Claude Code is the only execution surface.