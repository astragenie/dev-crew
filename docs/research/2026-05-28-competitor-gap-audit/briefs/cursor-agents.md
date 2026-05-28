---
competitor: Cursor agents
host: IDE
language: TypeScript / JSON config
license: proprietary
version_observed: 3.5 (2026-05-20)
sources:
  - https://cursor.com/docs/agent/overview
  - https://cursor.com/docs/agent/plan-mode
  - https://cursor.com/docs/rules
  - https://cursor.com/changelog/1-0
  - https://cursor.com/changelog/2-5
  - https://cursor.com/changelog
  - https://cursor.com/blog/agent-sandboxing
  - https://cursor.com/blog/agent-best-practices
  - https://cursor.com/features
  - https://cursor.com/pricing
brief_version: 1
---

# Cursor agents -- competitor brief

## Identity

- **Name**: Cursor agents (Agent mode + Background Agents + Rules + Memories)
- **Host**: IDE (Cursor, a VS Code fork)
- **Language**: TypeScript / JSON config / Markdown (.mdc)
- **Install model**: Proprietary desktop app; distributed as platform installer (Win/macOS/Linux). Plugins (skills, subagents, MCP servers, hooks, rules) are bundled via a Cursor Marketplace and installed via /add-plugin. Version rollback possible via third-party archives; no built-in version pinning mechanism.
- **Version observed**: 3.5, released 2026-05-20
- **License**: Proprietary (SaaS subscription)

Cursor agents is the agentic surface inside the Cursor IDE comprising three tightly coupled subsystems: **Agent mode** (interactive, multi-step code execution with Plan Mode pre-flight and checkpoint rollback), **Background Agents** (asynchronous cloud agents running in isolated Ubuntu VMs/Docker containers that push work to a git branch and notify on completion), and a **Rules + Memories** governance layer (.mdc files in `.cursor/rules/`, per-project Memories stored by a background model). It is an integrated product experience rather than a composable methodology layer -- there are no named workflow roles, no durable artifact directories, and no concept of slices or backlog primitives. All tooling ships inside the IDE binary and companion cloud infrastructure.

## Matrix row

| Axis                   | Symbol | 1-line note                                                                                    |
| ---------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| Workflow phases        | ◐      | Plan Mode (pre-flight plan + approve) and execution exist; no named review/validate/ship phases |
| Roles / dispatch       | ○      | No distinct roles; single unified agent + async subagents; no handoff mechanics                |
| Artifacts / state      | ◐      | Checkpoint snapshots per session; plans saved to .cursor/plans/; no structured artifact dirs   |
| Memory / retention     | ◐      | Project-scoped Memories (beta, background-model-proposed, user-approved); cross-session not cross-project |
| Model routing          | ◐      | User picks model per session; subagent model configurable; no per-phase routing policy         |
| Cost / telemetry       | ◐      | Team Admin Dashboard with usage analytics + per-model stats; no per-run token log for agents   |
| Backlog / spec         | ○      | No backlog, FEAT, SPEC, or slice primitives; task intake via Jira integration or freeform chat |
| Validation / gates     | ◐      | Bugbot auto-reviews PRs; sandbox approval gates on destructive ops; no runnable slice gate     |
| Deployment             | ◐      | Vercel staging integration; cloud agents push to git branches; no explicit env-evidence gate   |
| Install / distribution | ◐      | Marketplace with one-click plugin install; no version pinning; upgrade is IDE auto-update      |

Legend: ● = full coverage, ◐ = partial, ○ = absent.

## Strengths vs loop / crew

- **Cloud sandbox isolation**: Background Agents run in isolated Ubuntu Docker VMs on AWS -- full OS, browser, terminal, UI interaction. No equivalent in loop/crew (local process only).
- **Approval-fatigue reduction**: Sandbox boundary design reduces agent stop-for-confirmation events by 40%; granular network egress controls (domain allowlists) per-user and per-enterprise.
- **Async hierarchical subagents**: Parent agents spawn child subagents that execute in parallel and asynchronously; loop/crew dispatches are sequential within a session.
- **Plan Mode with interactive editing**: Structured pre-execution plan surfaced as editable Markdown, with codebase research baked in before a single line is written.
- **Rules system expressiveness**: Four-tier hierarchy (User < Project < Team/AGENTS.md < Enterprise) with glob-scoped auto-attach, always-apply, and AI-relevance inference; git-synced and importable from remote repos.
- **Marketplace plugin ecosystem**: Bundles skills, subagents, MCP servers, hooks, and rules into a single installable unit with partners (AWS, Figma, Linear, Stripe).
- **Jira / GitHub integration**: Work items assigned to Cursor trigger cloud agents directly; Bugbot posts PR comments with Fix-in-Cursor buttons.
- **Multi-repo automations**: Single automation can span multiple repositories, enabling cross-repo reasoning in one agent run.

## Weaknesses vs loop / crew

- **No workflow role separation**: No builder/reviewer/validator/deployer distinction. One agent does everything; no independent review gate enforced by tooling.
- **No backlog or spec primitives**: No FEAT/SPEC objects, no priority scoring, no autonomous_safe flag, no phase-gate gating on spec completeness.
- **No durable artifact discipline**: No structured .claude/artifacts/ equivalent; checkpoint snapshots are session-local; plans are optional and user-managed.
- **No grade / retrospective loop**: No slice grading (accuracy, completeness, test coverage, etc.), no trend tracking, no retrospective ceremony.
- **No per-phase model routing policy**: Model selection is per-session user choice, not a declared policy (e.g., use Haiku for research, Sonnet for build, Opus for review).
- **Memory is per-project, not cross-project**: Memories do not travel across repos; no global engineering memory layer equivalent to CLAUDE.md + crew constitution.
- **No deployment evidence gate**: No explicit env promotion artifact or approval chain before production; cloud agents push to branches without a deployer evidence step.
- **Proprietary and IDE-bound**: Cannot be used outside Cursor IDE; no CLI-first workflow; no composition with other AI coding assistants.
- **No cost attribution per slice/role**: Admin dashboard shows aggregate usage; no per-run token log that an agent can reason over to optimize spend.

## Gap candidates

### GAP-1: Cloud sandbox isolation for agent execution

- Description: Background Agents run in fully isolated Ubuntu Docker VMs on AWS with OS, browser, and terminal access. Agents verify their own code changes visually (navigate to localhost, click through UI). Destructive ops and network egress trigger approval gates. Local loop/crew runs have no sandbox boundary.
- Source: https://cursor.com/blog/agent-sandboxing
- Impact (0-3): 3 -- execution safety is a top adoption blocker for autonomous loops in enterprise; sandbox reduces stop-for-confirmation events 40%
- Effort (0-3): 3 -- requires cloud infrastructure, platform-specific syscall sandboxes, and agent harness changes
- Fit (0-3): 2 -- loop/crew is a Claude Code plugin; cloud execution would require a companion service, but the approval-gate pattern is directly applicable
- Composite: 3 + (3-3) + 2 = **5**

### GAP-2: Async hierarchical subagent dispatch

- Description: Parent agents spawn child subagents that execute in parallel and asynchronously; subagents can spawn their own children. Enables concurrent multi-file features and large refactors without blocking the parent.
- Source: https://cursor.com/changelog/2-5
- Impact (0-3): 2 -- loop/crew dispatches are serialized within a session; parallelism would meaningfully cut wall-clock time on large slices
- Effort (0-3): 2 -- requires parallel task infrastructure in the Claude Code harness; TaskCreate/Monitor primitives partially exist
- Fit (0-3): 3 -- crew roles (builder/reviewer/validator) map naturally to parallel subagent lanes
- Composite: 2 + (3-2) + 3 = **6**

### GAP-3: Marketplace plugin distribution (bundled skills + subagents + MCP + hooks + rules)

- Description: A single installable Marketplace unit bundles skills, subagents, MCP servers, hooks, and rules together. Partners publish official integrations (AWS, Figma, Linear, Stripe). Users install via /add-plugin.
- Source: https://cursor.com/changelog/2-5
- Impact (0-3): 2 -- loop/crew has skill files and plugin directories but no unified install unit or marketplace; discovery is manual
- Effort (0-3): 2 -- loop already has plugin structure; a manifest format + registry index is the missing piece
- Fit (0-3): 3 -- crew plugin architecture (hooks, skills, roles) is a natural bundle target
- Composite: 2 + (3-2) + 3 = **6**

### GAP-4: Plan Mode with codebase-research pre-flight

- Description: Before writing any code, Plan Mode runs a codebase research pass, asks clarifying questions, generates an editable Markdown plan, and only executes after explicit user approval. Plans can be saved to workspace for team sharing.
- Source: https://cursor.com/docs/agent/plan-mode
- Impact (0-3): 2 -- loop has /loop:slice-start ceremony but no structured pre-execution codebase research + interactive plan approval step
- Effort (0-3): 1 -- loop already has slice scaffolding; a plan-generation sub-phase before build dispatch is additive
- Fit (0-3): 3 -- directly fits the frame-to-build boundary in the loop methodology
- Composite: 2 + (3-1) + 3 = **7**

### GAP-5: Glob-scoped auto-attach rules with remote import

- Description: .mdc rules in .cursor/rules/ auto-attach based on file globs, always-apply flag, or AI relevance inference. Rules can be imported from remote GitHub repos via .cursor/rules/imported/<repoName>/. Four-tier precedence (user < project < team < enterprise).
- Source: https://cursor.com/docs/rules
- Impact (0-3): 2 -- loop/crew uses CLAUDE.md + crew constitution for rules; no glob-scoped selective injection or remote rule import
- Effort (0-3): 1 -- loop already reads markdown rule files; adding frontmatter parsing and glob-matching is low effort
- Fit (0-3): 3 -- aligns with loop existing file-based context injection pattern
- Composite: 2 + (3-1) + 3 = **7**

### GAP-6: Project-scoped Memories with background-model proposal and user approval

- Description: A background model monitors conversations and proposes Memories (facts to retain); user approves before saving. Memories are per-project, cross-session, and manageable from Settings.
- Source: https://cursor.com/changelog/1-0
- Impact (0-3): 2 -- loop/crew relies on MEMORY.md manual write-backs; auto-proposed memories would reduce context loss between sessions
- Effort (0-3): 2 -- requires a background summarizer pass and a memory store keyed per project/repo
- Fit (0-3): 2 -- loop snapshot-memory skill partially covers this; upgrading to background-model proposals is incremental
- Composite: 2 + (3-2) + 2 = **5**

### GAP-7: Admin usage dashboard with per-model and per-tool analytics

- Description: Team/Enterprise admin dashboard surfaces usage metrics, per-model token stats, tool-specific statistics, spending data, and model access controls. Admins can block providers or model configs granularly.
- Source: https://cursor.com/changelog/1-0 ; https://cursor.com/pricing
- Impact (0-3): 1 -- loop has cost alert hooks; a structured dashboard with per-model breakdown would help teams optimize spend
- Effort (0-3): 2 -- requires a telemetry collection layer and a report format beyond current cost-insights artifacts
- Fit (0-3): 2 -- loop existing cost artifact schema is a foundation; aggregation + admin view is additive
- Composite: 1 + (3-2) + 2 = **4**

### GAP-8: Jira / GitHub issue to agent trigger integration

- Description: Work items can be assigned directly to Cursor, or @Cursor mentioned in a Jira/GitHub comment, to kick off a cloud agent run on that ticket automatically.
- Source: https://cursor.com/changelog (2026-05-19 Jira integration entry)
- Impact (0-3): 1 -- loop ingests backlog from markdown files; direct ticket-system integration would reduce friction for teams using Jira/GitHub Issues
- Effort (0-3): 2 -- requires webhook receivers and ticket-system OAuth; orthogonal to core loop methodology
- Fit (0-3): 1 -- loop is CLI/Claude Code native; IDE-level integrations do not map cleanly
- Composite: 1 + (3-2) + 1 = **3**

## Inadvisable mimics

- **IDE-bound distribution**: Cursor ships as a proprietary IDE fork. loop/crew is a Claude Code plugin -- IDE coupling would eliminate the CLI-first, editor-agnostic value proposition.
- **Session-only checkpoints instead of artifact discipline**: Checkpoint snapshots are session-local and not inspectable outside the IDE. loop/crew durable artifact directories are explicitly designed for cross-session and cross-agent audit trails; replacing them with ephemeral snapshots would degrade the handoff and review story.
- **Autonomous memory without human gate**: Background-model-proposed memories without a mandatory review step could accumulate incorrect or stale facts silently. loop explicit write-back discipline (snapshot-memory with human review on decisions) is more conservative and appropriate for the autonomous loop context.
- **No-role unified agent**: Cursor single-agent model (no builder/reviewer separation) optimizes for speed but sacrifices independent review integrity -- the core quality gate that crew enforces. Collapsing roles would remove the structural protection against the agent reviewing its own work.