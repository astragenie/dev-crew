---
competitor: LangGraph
host: Python lib
language: Python
license: MIT
version_observed: 1.2.2
sources:
  - https://github.com/langchain-ai/langgraph
  - https://docs.langchain.com/oss/python/langgraph/overview
  - https://docs.langchain.com/oss/python/langgraph/interrupts
  - https://docs.langchain.com/oss/python/langgraph/memory
  - https://docs.langchain.com/oss/python/langgraph/durable-execution
brief_version: 1
---

# LangGraph -- competitor brief

## Identity

- **Name**: LangGraph
- **Host**: Python library (pip installable, also available as TypeScript via `@langchain/langgraph`)
- **Language**: Python (primary); TypeScript port available
- **Install model**: `pip install -U langgraph`; optional extras for checkpointers (`langgraph-checkpoint-sqlite`, `langgraph-checkpoint-postgres`)
- **Version observed**: 1.2.2 (released 2026-05-26)
- **License**: MIT

LangGraph is a low-level orchestration framework for building, managing, and deploying long-running, stateful agents. Its core abstraction is a `StateGraph` — a directed graph of typed state and processing nodes — compiled into an executable runtime that supports durable checkpointing (InMemorySaver, SqliteSaver, PostgresSaver, CosmosDBSaver), thread-based execution state, time-travel/replay, first-class `interrupt()` for human-in-the-loop pauses, and a two-tier memory model (short-term thread state via checkpoints + long-term cross-session store via `BaseStore`). LangGraph is framework-agnostic and integrates optionally with LangChain and LangSmith for observability and hosted deployment. It is not a Claude Code plugin; it runs as a standalone Python process.

## Matrix row

| Axis                   | Symbol | 1-line note                                                                                    |
| ---------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| Workflow phases        | ◐      | Nodes and conditional edges encode phase-like sequences, but no named frame/build/review/validate/ship gates |
| Roles / dispatch       | ◐      | Multi-agent supervisor pattern and subgraphs model role separation; no explicit named-role handoff protocol |
| Artifacts / state      | ●      | Checkpointed StateSnapshot at every super-step; full state history queryable via get_state_history(); durable across restarts |
| Memory / retention     | ●      | Two-tier: thread-scoped checkpoints (short-term) + namespace-scoped BaseStore with semantic search (long-term, cross-session) |
| Model routing          | ○      | No built-in per-node or per-phase model selection; callers bind models to nodes manually |
| Cost / telemetry       | ◐      | LangSmith integration provides execution trace, state transition visualization, and runtime metrics; no built-in cost budget or alert gate |
| Backlog / spec         | ○      | No FEAT/SPEC primitives; no backlog management; graphs are runtime constructs, not planning artifacts |
| Validation / gates     | ●      | interrupt() pauses at any node for human approval/edit; conditional edges encode automated gate logic; resume via Command(resume=...) |
| Deployment             | ◐      | LangSmith Deployment (hosted) handles stateful long-running agents at scale; no self-hosted environment-evidence gate or approval chain |
| Install / distribution | ●      | pip install -U langgraph; semver releases on PyPI; checkpointer extras as separate packages; JS port separately versioned |

Legend: ● = full coverage, ◐ = partial, ○ = absent.

## Strengths vs loop / crew

- **Durable execution with automatic failure recovery**: Checkpoints are written at every super-step boundary; a failed node mid-super-step resumes from exactly the last durable checkpoint, skipping already-completed nodes. loop/crew rely on manual handoff artifacts and do not auto-resume from mid-slice failures.
- **First-class interrupt() for human gates**: `interrupt()` can be placed at any point in any node, serializes state, and waits indefinitely for `Command(resume=...)`. loop human gates are artifact-based approval steps at slice boundaries, not in-process pauses at arbitrary execution points.
- **Two-tier persistent memory with semantic search**: Short-term thread state via checkpoints + long-term `BaseStore` with `search()` (semantic similarity + content filtering) across custom namespaces. loop/crew use file-based handoff artifacts and MEMORY.md; no vector-indexed cross-session retrieval.
- **Time-travel and replay**: Any prior `checkpoint_id` can be re-invoked to replay execution from that point, enabling alternative trajectory exploration and debugging. loop has no equivalent replay primitive.
- **Strongly typed stateful graph**: `StateGraph` with `TypedDict` state, explicit reducer functions, and channel-based merge semantics prevents unstructured state mutation; loop/crew state is passed through untyped markdown artifacts.
- **Production checkpointer backends**: SqliteSaver, PostgresSaver, CosmosDBSaver ship as official packages; no custom persistence infrastructure needed for production deployments.
- **LangSmith observability**: Deep integration provides execution-path visualization, state-transition capture, LLM call traces, and performance metrics across all graph runs without custom instrumentation.

## Weaknesses vs loop / crew

- **No backlog or spec primitives**: LangGraph has no FEAT/SPEC concept; there is no planning-artifact lifecycle, priority scoring, or `autonomous_safe` gating. Work items are runtime graphs, not tracked planning artifacts.
- **No software-engineering workflow gates**: No named frame/build/review/validate/ship sequence, no independent review artifact, no deployment evidence chain with approval gates.
- **No grade or retrospective system**: loop tracks slice grades, trend analysis (grade-parser), and retrospectives; LangGraph has no quality-trend or lessons-learned mechanism.
- **No model routing per phase**: Callers must manually bind models to nodes; there is no built-in phase-aware routing (e.g., haiku for trivial steps, sonnet for implementation) like loop's model-router.mjs.
- **No slice ceremony or autonomous-loop discipline**: loop HARD RULES enforce slice-start/complete/grade ceremonies for scope and stop/go discipline; LangGraph autonomy is unconstrained.
- **Not a Claude Code plugin**: Cannot operate inside a Claude Code session with tool permissions, session context, or the crew artifact discipline natively.
- **No cost budget enforcement**: LangSmith reports metrics but does not block execution on cost thresholds; loop/crew have dispatch-budget discipline rules and model routing to limit cost per phase.
- **interrupt() re-executes pre-interrupt code on resume**: Any code before `interrupt()` in the same node re-runs on resume; callers must make pre-interrupt code idempotent, adding design overhead.

## Gap candidates

### GAP-1: Durable mid-execution checkpointing with automatic failure recovery

- Description: LangGraph checkpoints state at every super-step boundary via a pluggable `BaseCheckpointSaver` (Sqlite, Postgres, CosmosDB); if a node fails, the graph resumes from the last durable checkpoint, skipping already-completed nodes without re-running them. loop/crew have no equivalent -- a failed slice must be restarted from the beginning, and there is no automatic recovery primitive.
- Source: https://docs.langchain.com/oss/python/langgraph/durable-execution
- Impact (0-3): 3 -- reduces wasted work and manual intervention when autonomous slices fail partway through multi-step builds.
- Effort (0-3): 3 -- requires a checkpoint store, a runner that can resume from named checkpoints, and integration into slice-start/complete ceremonies; substantial new infrastructure.
- Fit (0-3): 2 -- compatible with artifact discipline; checkpoints would supplement, not replace, handoff artifacts.
- Composite: 3 + (3 - 3) + 2 = **5**

### GAP-2: In-process interrupt() for human-gated approval at arbitrary execution points

- Description: LangGraph's `interrupt()` function pauses graph execution at any node, serializes the full state via the checkpointer, and waits indefinitely for `Command(resume=value)`. Humans can inspect and modify state before resumption. loop human gates are artifact-based approval steps at slice boundaries only -- there is no in-process pause at an arbitrary mid-slice decision point.
- Source: https://docs.langchain.com/oss/python/langgraph/interrupts
- Impact (0-3): 2 -- mid-slice human approval (e.g., approve a tool call before execution, review generated code before commit) is a meaningful safety improvement for non-`autonomous_safe` items.
- Effort (0-3): 2 -- the slice machinery already has ceremony hooks; wiring an interrupt primitive that pauses and writes a pending-approval artifact is moderate effort.
- Fit (0-3): 3 -- directly extends the existing validation gate and escalation mechanism without architectural conflict.
- Composite: 2 + (3 - 2) + 3 = **6**

### GAP-3: Long-term cross-session memory store with semantic search

- Description: LangGraph `BaseStore` (InMemoryStore / persistent backends) stores JSON documents scoped to custom namespaces with `put()`, `get()`, and `search()` (semantic similarity + content filtering). Memories are queryable across different thread IDs, enabling shared knowledge across sessions. loop/crew use file-based handoff artifacts and MEMORY.md; there is no vector-indexed, automatically retrieved cross-session memory.
- Source: https://docs.langchain.com/oss/python/langgraph/memory
- Impact (0-3): 3 -- automatic semantic recall at slice-start would reduce cold-start context cost and lost-context risk without requiring manual artifact write-back.
- Effort (0-3): 3 -- requires a vector/document store, hooking into slice-start for retrieval and slice-close for write-back, and a query interface.
- Fit (0-3): 2 -- compatible with artifact discipline; would augment rather than replace handoff artifacts.
- Composite: 3 + (3 - 3) + 2 = **5**

### GAP-4: Time-travel / checkpoint replay for debugging slice failures

- Description: LangGraph allows invoking a graph with a prior `checkpoint_id`, replaying all subsequent nodes from that point. This enables alternative trajectory exploration and debugging of divergent execution paths. loop has no replay primitive; debugging a failed slice requires re-reading handoff artifacts and re-running from scratch.
- Source: https://docs.langchain.com/oss/python/langgraph/durable-execution
- Impact (0-3): 2 -- replay would accelerate debugging of complex multi-step slice failures, especially for autonomous runs.
- Effort (0-3): 3 -- requires checkpoint storage and a replay invocation path; depends on GAP-1 infrastructure.
- Fit (0-3): 1 -- useful but a lower priority given that slice granularity already limits replay scope; depends on checkpointing being in place first.
- Composite: 2 + (3 - 3) + 1 = **3**

### GAP-5: Strongly typed stateful graph with reducer-based merge semantics

- Description: LangGraph `StateGraph` uses Python `TypedDict` with `Annotated` fields and explicit reducer functions (e.g., `operator.add` for list accumulation) to define how state channels merge across parallel branches. Conflicting updates are resolved deterministically. loop/crew state is passed through untyped markdown artifacts with no merge semantics; parallel dispatch can produce conflicting handoff artifacts with no resolution protocol.
- Source: https://github.com/langchain-ai/langgraph
- Impact (0-3): 2 -- typed state with explicit merge semantics would prevent silent data loss when parallel subagents update overlapping state keys.
- Effort (0-3): 2 -- a lightweight state schema for dispatch results (e.g., JSON with declared merge strategy) could be added to the crew CLI without full StateGraph infrastructure.
- Fit (0-3): 2 -- complementary to existing artifact discipline; does not conflict with handoff format.
- Composite: 2 + (3 - 2) + 2 = **5**

### GAP-6: Pluggable observability via LangSmith (execution trace + state transitions)

- Description: LangSmith integration provides execution-path visualization, per-node state capture, LLM call traces with token counts, and performance metrics across all graph runs without custom instrumentation. loop/crew have cost-insights artifacts and grade trend, but no per-step execution trace or state-transition visualization.
- Source: https://github.com/langchain-ai/langgraph
- Impact (0-3): 1 -- execution traces are useful for debugging autonomous runs, but grade artifacts and cost-insights already cover the most important observability signals for the dev loop.
- Effort (0-3): 2 -- emitting structured execution events (JSON lines) per slice step is moderate effort; an existing observer hook could be added to the crew CLI.
- Fit (0-3): 3 -- directly compatible with cost-insights artifact path; could be emitted alongside existing cost artifacts.
- Composite: 1 + (3 - 2) + 3 = **5**

## Inadvisable mimics

- **Full StateGraph runtime as loop execution model**: Replacing the loop's slice-ceremony + crew-dispatch model with a compiled StateGraph would require rewriting the entire execution harness in Python and abandoning the Claude Code plugin model. The complexity cost far outweighs the benefit for a dev-loop governance tool.
- **LangSmith hosted deployment as deployment gate**: LangSmith Deployment is a hosted SaaS for stateful agent production infrastructure. Adopting it as the loop deployment gate would introduce a hard external dependency on a paid service and conflict with the local-first, Claude-Code-embedded philosophy.
- **InMemorySaver as default checkpointer**: In-process memory checkpointing (InMemorySaver) has no durability guarantees across session restarts. Adopting it as a loop persistence layer would create false confidence in recovery while providing no real durability benefit over the existing handoff artifact approach.
- **Conditional edge routing as phase sequencing**: LangGraph conditional edges (`add_conditional_edges`) with router functions enable dynamic graph branching. Replacing the linear slice-discipline HARD RULES with dynamic graph routing would undermine the predictable phase sequencing that makes the autonomous loop auditable and safe to run unattended.