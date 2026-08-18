---
competitor: CrewAI
host: Python lib
language: Python
license: MIT
version_observed: 1.14.6a2
sources:
  - https://github.com/crewAIInc/crewAI
  - https://docs.crewai.com/introduction
  - https://docs.crewai.com/concepts/agents
  - https://docs.crewai.com/concepts/tasks
  - https://docs.crewai.com/concepts/crews
  - https://docs.crewai.com/concepts/flows
  - https://docs.crewai.com/concepts/memory
  - https://docs.crewai.com/concepts/training
  - https://docs.crewai.com/concepts/llms
  - https://docs.crewai.com/concepts/planning
  - https://docs.crewai.com/installation
  - https://github.com/crewAIInc/crewAI/releases
brief_version: 1
---

# CrewAI -- competitor brief

## Identity

- **Name**: CrewAI
- **Host**: Python library (pip/uv installable)
- **Language**: Python >=3.10, <3.14
- **Install model**: `uv pip install crewai` or `uv tool install crewai`; project scaffold via `crewai create crew <name>`
- **Version observed**: 1.14.6a2 (pre-release, tagged 2026-05-27)
- **License**: MIT

CrewAI is a Python framework for orchestrating multi-agent AI workflows, built entirely from scratch and independent of LangChain. Its two primary abstractions are **Crews** (collaborative teams of role-playing agents executing Tasks sequentially or hierarchically under a manager agent) and **Flows** (event-driven workflow graphs that orchestrate Crews and standalone tasks with conditional branching, state management, and human-approval hooks). CrewAI targets production Python applications and provides a CLI for project scaffolding, training, and execution.

**Disambiguation**: CrewAI (crewAIInc/crewAI, MIT, Python) is unrelated to the `crew` plugin in this repository. The `crew` plugin is a Claude Code workflow harness providing role-based development gates, structured artifact discipline, and badge-driven workflow state for software engineering sessions inside Claude Code. CrewAI is a general-purpose Python library for multi-model agent orchestration running outside any IDE. They share the word "crew" but have different authors, runtime models, installation paths (pip vs. Claude Code plugin), and design goals (generic agent orchestration vs. structured dev-loop governance).

## Matrix row

| Axis                   | Symbol | 1-line note                                                                          |
| ---------------------- | ------ | ------------------------------------------------------------------------------------ |
| Workflow phases        | ◐      | Planning + Flows give sequential/hierarchical phases, but no named frame/build/review/validate/ship gates |
| Roles / dispatch       | ●      | Agents have explicit role, goal, backstory; hierarchical process adds manager agent with delegation |
| Artifacts / state      | ◐      | CrewOutput (raw/JSON/Pydantic), output_log_file, checkpoint files; no durable run/review/handoff artifact taxonomy |
| Memory / retention     | ●      | Unified Memory class with LanceDB vector backend; scoped, cross-session, configurable storage path |
| Model routing          | ●      | Per-agent LLM assignment; separate function-calling LLM; provider-agnostic via LiteLLM; cost right-sizing guidance |
| Cost / telemetry       | ◐      | usage_metrics attribute post-run; OpenTelemetry tracing flag; no per-phase cost budget or alert system |
| Backlog / spec         | ○      | No FEAT/SPEC primitives; no backlog management; tasks are runtime units not planning artifacts |
| Validation / gates     | ◐      | Task guardrails (function-based + LLM-based) with retry; human_input flag; no structured review or validation artifact |
| Deployment             | ◐      | Enterprise SaaS console (CrewAI AMP), RBAC, safe redeploy, live monitoring; no environment-evidence gate or approval chain for self-hosted |
| Install / distribution | ●      | uv-first install; CLI scaffolding; upgrade via uv tool install crewai --upgrade; version-pinned deps in pyproject.toml |

Legend: ● = full coverage, ◐ = partial, ○ = absent.

## Strengths vs loop / crew

- **Cross-session vector memory**: Unified LanceDB-backed Memory class with scoped, composite-scored retrieval persists knowledge between runs without manual artifact write-back; loop/crew rely on file-based handoff artifacts.
- **Per-agent model routing at runtime**: Each agent independently selects its LLM (including a separate function-calling model); model routing in loop is phase-level and static per dispatch.
- **Task guardrails with auto-retry**: Function-based and LLM-based validators chain on task output with configurable retry budgets; loop/crew validation is a human-gated artifact step, not an automated retry loop.
- **Hierarchical manager agent**: A dedicated manager LLM coordinates task delegation and outcome validation across the crew; loop/crew hierarchy is human-declared role assignment, not a runtime agent.
- **Training with human feedback**: CLI-driven iterative training appends consolidated human feedback to agent prompts permanently; loop/crew have no equivalent feedback-persistence mechanism.
- **Event-driven Flows with @router branching**: Conditional workflow routing based on method output enables complex non-linear execution; loop slices are linear with manual phase escalation.
- **Enterprise SaaS and RBAC**: CrewAI AMP provides hosted deployment, team access controls, and native integrations (Slack, Gmail, Salesforce); loop/crew have no deployment or team-access layer.
- **Async parallel crew execution**: akickoff() and parallel async variants are first-class; loop dispatches subagents sequentially unless the lead orchestrates parallelism manually.

## Weaknesses vs loop / crew

- **No backlog or spec primitives**: CrewAI has no FEAT/SPEC concept; work items are runtime Tasks with no planning-artifact lifecycle, priority, or autonomous_safe gating.
- **No durable artifact taxonomy**: No structured run/handoff/review/validation/deployment artifact directories; CrewOutput is transient unless manually persisted.
- **No software-engineering workflow gates**: No frame/build/review/validate/ship phase sequence, no independent review gate, no deployment evidence chain.
- **No grade or retrospective system**: Loop tracks slice grades, trend analysis, and retrospectives; CrewAI has no equivalent quality-trend or lessons-learned mechanism.
- **No slice ceremony or autonomous-loop discipline**: Loop HARD RULES enforce /loop:slice-start|complete|grade ceremonies for scope and stop/go discipline; CrewAI autonomy is unconstrained.
- **Python only**: Not a Claude Code plugin; cannot operate inside a Claude Code session with session context, tool permissions, or Claude API access natively.
- **No per-phase cost budget enforcement**: loop/crew have model routing budgets and dispatch discipline rules; CrewAI reports usage_metrics but does not block on cost thresholds.
- **Blocking human-input gate**: human_input=True blocks in non-interactive environments; loop human gates are artifact-based and can be deferred.

## Gap candidates

### GAP-1: Persistent cross-session vector memory

- Description: CrewAI Unified Memory stores agent knowledge in LanceDB across sessions with scoped retrieval and composite scoring. loop/crew rely on hand-written handoff files and MEMORY.md; there is no vector-indexed, automatically retrieved session memory.
- Source: https://docs.crewai.com/concepts/memory
- Impact (0-3): 3 -- contextual recall without manual artifact write-back would significantly reduce cold-start cost and lost-context risk.
- Effort (0-3): 3 -- requires integrating a vector store and hooking into slice-start/close ceremonies; new infrastructure.
- Fit (0-3): 2 -- compatible with artifact discipline; would augment rather than replace handoff artifacts.
- Composite: 3 + (3 - 3) + 2 = **5**

### GAP-2: Automated task output guardrails with retry

- Description: Tasks define function-based or LLM-based validators that run on output; on failure the agent retries up to guardrail_max_retries times automatically. loop/crew validation is a manual human-gated step with no auto-retry loop.
- Source: https://docs.crewai.com/concepts/tasks
- Impact (0-3): 2 -- auto-retry on validation failure reduces human gate interruptions for well-specified acceptance criteria.
- Effort (0-3): 2 -- slice acceptance_criteria already exist; wiring an automated LLM-based check at slice-close is moderate effort.
- Fit (0-3): 3 -- directly extends the existing validation gate without architectural conflict.
- Composite: 2 + (3 - 2) + 3 = **6**

### GAP-3: Per-agent runtime model selection

- Description: Each CrewAI agent independently specifies its LLM and an optional separate function-calling LLM, enabling fine-grained cost and capability routing at the role level. loop model router operates at dispatch phase as a static mapping; individual subagents cannot override.
- Source: https://docs.crewai.com/concepts/llms
- Impact (0-3): 2 -- allows cost-optimal model selection without changing dispatch phase logic.
- Effort (0-3): 2 -- model-router.mjs exists; extending to accept per-role YAML overrides is moderate.
- Fit (0-3): 3 -- directly extends the model router already present.
- Composite: 2 + (3 - 2) + 3 = **6**

### GAP-4: Training and human-feedback persistence

- Description: crewai train CLI collects human feedback per agent role across iterations and appends consolidated guidance to future prompts, improving agent behavior durably. loop/crew have no mechanism to capture and replay human corrections across slices.
- Source: https://docs.crewai.com/concepts/training
- Impact (0-3): 2 -- durable feedback would reduce repeated corrections for the same agent behaviors.
- Effort (0-3): 3 -- requires a feedback store, CLI integration, and prompt injection at slice-start.
- Fit (0-3): 1 -- partially conflicts with loop rules.md and CLAUDE.md as single source of agent instruction truth.
- Composite: 2 + (3 - 3) + 1 = **3**

### GAP-5: Async parallel crew execution primitive

- Description: CrewAI provides akickoff() and kickoff_for_each_async() as first-class async primitives for parallel crew runs. loop parallelism relies on the lead manually dispatching multiple subagents; there is no framework primitive.
- Source: https://docs.crewai.com/concepts/crews
- Impact (0-3): 2 -- parallel slice execution would reduce wall-clock time for independent work items.
- Effort (0-3): 2 -- the harness would need a parallel-dispatch primitive at the lead level.
- Fit (0-3): 2 -- compatible with existing crew role model; parallelism is already used informally.
- Composite: 2 + (3 - 2) + 2 = **5**

### GAP-6: Structured post-run usage metrics object

- Description: After any crew run, crew.usage_metrics exposes token counts and LLM performance data as a structured object. loop/crew have cost-insights artifacts but no in-process programmatic metrics object accessible after a dispatch.
- Source: https://docs.crewai.com/concepts/crews
- Impact (0-3): 1 -- cost-insights artifacts already cover most of this; a structured object primarily helps programmatic aggregation.
- Effort (0-3): 1 -- the crew CLI could emit a JSON metrics blob at run-end with low effort.
- Fit (0-3): 3 -- directly compatible with existing cost-insights artifact path.
- Composite: 1 + (3 - 1) + 3 = **6**

### GAP-7: Pre-execution planning phase via AgentPlanner

- Description: When planning=True, CrewAI runs an AgentPlanner before agent execution that decomposes tasks into step-by-step roadmaps injected into each task description. loop has PM decomposition as a human skill; there is no automated pre-execution planning LLM call.
- Source: https://docs.crewai.com/concepts/planning
- Impact (0-3): 2 -- automated decomposition at slice-start could improve first-pass implementation quality.
- Effort (0-3): 2 -- could be wired as an optional step in /loop:slice-start using the existing model router.
- Fit (0-3): 2 -- complementary to slice acceptance criteria; does not conflict with existing ceremony.
- Composite: 2 + (3 - 2) + 2 = **5**

## Inadvisable mimics

- **Enterprise SaaS / CrewAI AMP**: A hosted deployment console with RBAC and native SaaS integrations fights the local-first, Claude-Code-embedded philosophy of loop/crew. The value proposition depends on a persistent server, not a session-scoped plugin.
- **@router event-driven branching for dev loop**: Non-linear conditional flows add complexity that conflicts with the linear slice-discipline HARD RULES. The engineering dev loop benefits from predictable phase sequencing, not dynamic branching.
- **Training CLI with pickle persistence**: Appending consolidated feedback to prompts via .pkl files introduces a mutable prompt layer outside version control; this conflicts with loop rules.md and CLAUDE.md as the single source of agent instruction truth.
- **Hierarchical manager agent auto-delegation**: A runtime LLM deciding which agent handles which task removes human-declared role ownership, which violates the crew constitution rule of one explicit owner per task.