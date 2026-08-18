---
competitor: Windsurf (Codeium, now Cognition)
host: IDE
language: TypeScript / Markdown (.md workflows + rules)
license: proprietary
version_observed: Windsurf 2 / SWE-1.5 era, 2026-03-19 pricing reset
sources:
  - https://windsurf.com/windsurf
  - https://docs.devin.ai/desktop/
  - https://docs.devin.ai/desktop/cascade/workflows
  - https://docs.devin.ai/desktop/cascade/memories
  - https://devin.ai/desktop
  - https://www.digitalapplied.com/blog/windsurf-2-deep-dive-cascade-agents-flows-2026
  - https://vibecoding.app/blog/windsurf-review
  - https://www.nxcode.io/resources/news/cognition-windsurf-acquisition-swe-1-5-codemaps-2026
  - https://devin.ai/blog/windsurf-pricing-plans
brief_version: 1
---

# Windsurf -- competitor brief

## Identity

- **Name**: Windsurf (Cascade + Workflows + Memories + Rules + Codemaps), rebranded as "Devin Desktop" after Cognition AI acquisition (December 2025, ~$250M).
- **Host**: Proprietary IDE (VS Code fork). Not a Claude Code plugin -- ships as a desktop application with embedded Devin cloud-agent dispatch.
- **Language**: TypeScript IDE shell; user-authored Workflows and Rules are Markdown with YAML frontmatter.
- **Install model**: Desktop installer (Win/macOS/Linux). No plugin marketplace registry in the loop/crew sense; extensibility via VS Code extensions + MCP servers. Auto-update only; no version pinning.
- **Version observed**: Windsurf 2 cycle, SWE-1.5 default model, March 19 2026 pricing reset (Pro $15 -> $20, new Max $200 tier, daily/weekly quota model replacing monthly credit pool).
- **License**: Proprietary SaaS subscription. Free / Pro / Max / Teams / Enterprise tiers.

Windsurf is an IDE-bound agentic surface built around three primitives: **Cascade** (multi-step agent that plans, edits multiple files, runs tools, surfaces per-step approval), **Workflows** (named Markdown recipes invoked via `/workflow-name` slash commands, stored in `.windsurf/workflows/`), and **Memories + Rules** (persistent context, with rules supporting `trigger: always_on | model_decision | glob | manual` activation modes via YAML frontmatter). Codemaps is a unique visual code-graph feature for repo onboarding. The default model is the proprietary SWE-1.5 (Cognition co-designed for "Fast Context" retrieval, claimed 13x faster than Sonnet 4.5); third-party frontier models (Claude, GPT) available on Pro+. There is no concept of slices, backlog, FEAT/SPEC primitives, grading, retrospectives, or named workflow roles -- it is an IDE product experience, not a methodology layer.

## Matrix row

| Axis                   | Symbol | 1-line note                                                                                       |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| Workflow phases        | ◐      | Plan-preview + per-step approval inside Cascade; no named review/validate/ship phases             |
| Roles / dispatch       | ○      | Single unified Cascade agent; embedded Devin for background runs but no role separation           |
| Artifacts / state      | ◐      | Session checkpoints + workflow .md files; no structured artifact directory per run                |
| Memory / retention     | ●      | Auto Memories at ~/.codeium/windsurf/memories/ + Rules with 4 activation triggers; well-developed |
| Model routing          | ◐      | User picks model; SWE-1.5 default with credit-friendly rate; no per-phase declared policy         |
| Cost / telemetry       | ◐      | Teams admin dashboard with usage analytics; daily/weekly quotas; no per-run cost artifact         |
| Backlog / spec         | ○      | No backlog, FEAT, SPEC, slice, or priority-scoring primitives                                     |
| Validation / gates     | ◐      | Per-file / per-hunk approval gates inside Cascade; no runnable validation slice                   |
| Deployment             | ◐      | "App Deploys" one-click via the IDE; no explicit env-evidence gate or promotion artifact          |
| Install / distribution | ◐      | IDE installer + MCP server bundles; no plugin marketplace registry; no version pinning            |

Legend: ● = full coverage, ◐ = partial, ○ = absent.

## Strengths vs loop / crew

- **Workflows as Markdown-with-frontmatter recipes**: `.windsurf/workflows/*.md` files with `auto_execute_steps`, title, description, ordered steps; nested workflow composition (`/workflow-a` can call `/workflow-b`); workspace / global / system / built-in precedence hierarchy. Closest external analogue to loop slice-templates but lives at the trajectory level (steps), not the slice level.
- **Rules with `trigger` field**: Four activation modes (`always_on`, `model_decision`, `glob`, `manual`) declared in YAML frontmatter. `model_decision` (description-only injection, full content fetched on relevance) is more sophisticated than loop CLAUDE.md always-on model.
- **Auto-generated Memories**: Cascade proactively writes Memories during conversations without consuming credits; user can prompt "create a memory of..."; cross-session in-workspace. loop / crew relies on manual snapshot-memory write-backs.
- **Codemaps**: AI-annotated visual code graph -- grouped sections, execution trace overlays, line-level linking. No equivalent in loop / crew; orthogonal to methodology but high-impact for onboarding and architect-phase research.
- **Proprietary fast-tier model with fixed per-message quota cost**: SWE-1.5 routes at a flat rate while third-party models scale with tokens. Useful for high-frequency cheap operations (formatting, trivial fixes). loop has no equivalent stratified cost model.
- **Embedded background Devin agent**: Long-running autonomous task runs within the IDE; user keeps coding. loop dispatches are serialized in the main thread.
- **MCP integration baked into IDE chrome**: Slack, Linear, Notion, Figma, Stripe, Datadog as first-class side panels, not agent text glue.
- **System-scope rules for enterprise IT**: A fourth precedence tier above workspace / global -- OS-deployed read-only rule files (`/etc/devin/rules/`, `/Library/Application Support/...`) that IT can ship to all developer machines. loop has no enterprise-policy surface.
- **Cascade per-file / per-hunk approval gates**: Granular review of agent edits with approval-fatigue-aware tooling; loop relies on the reviewer subagent + workflow-state badges, which is coarser.

## Weaknesses vs loop / crew

- **No workflow role separation**: Cascade is unified; no builder / reviewer / validator / deployer / researcher distinction; no independent review gate enforced by tooling. Cascade reviewing its own work is structurally weaker than crew parallel-reviewer dispatch.
- **No backlog or spec primitives**: No FEAT / SPEC objects, no priority scoring (loop PM 5-axis is unmatched), no `autonomous_safe` flag, no phase-gate gating on spec completeness, no derived-slice ceremony.
- **No grade / retrospective loop**: No structured slice grading (architecture_quality, reliability, observability, etc.), no trend tracking, no DEC-NNN decision capture, no retrospective ceremony.
- **No durable per-run artifact discipline**: Session checkpoints are local and ephemeral; no `.claude/artifacts/crew/{runs,handoffs,reviews,validations,deployments}` equivalent. Workflows persist as instructions, not as run evidence.
- **No deployment evidence gate**: "App Deploys" is one-click but there is no deployer evidence artifact, no production-promotion approval chain, no environment witness pattern.
- **No per-phase model routing policy**: Model choice is per-message user override; no declared policy ("Haiku for research, Sonnet for build, Opus for review"). loop resolver-driven `preset.roles.*` is more disciplined.
- **No per-slice cost attribution**: Quotas are tier-level and daily / weekly; no per-run cost artifact a loop agent can reason over to optimize spend, no cost-advisor trajectory.
- **Memories are not version-controlled or team-shareable**: Auto-Memories live in `~/.codeium/windsurf/memories/` (user-local). Cross-team durable knowledge has to go through Rules. loop MEMORY.md + snapshot-memory pattern is git-committed by default.
- **IDE-bound, proprietary**: Cannot be used outside the Windsurf desktop app; no CLI-first workflow; no composition with other AI coding assistants. loop / crew runs anywhere Claude Code runs.
- **Workflow file character cap (12,000 chars)**: Hard ceiling on Workflow size; loop slices have no equivalent cap.
- **No `autonomous_safe` flag or risk gate**: Cascade does not classify tasks by risk before background dispatch; loop differentiates autonomous-safe vs human-review-required via FEAT frontmatter.
- **No spec decomposition / derive-slice primitive**: No way to take a high-level spec and emit a queue of FEATs / slices automatically.

## Gap candidates

### GAP-1: Markdown Workflow recipes with frontmatter + slash invocation
- Description: `.windsurf/workflows/*.md` files with YAML frontmatter (`name`, `description`, `auto_execute_steps`), ordered numbered steps, nested workflow composition (`/workflow-a` calls `/workflow-b`), and a 4-tier scope precedence (system > workspace > global > built-in). Invoked via `/<workflow-name>` slash command. Workspace workflows are git-committed and travel with the codebase.
- Source: https://docs.devin.ai/desktop/cascade/workflows
- Impact (0-3): 2 -- loop has slices and skills but no first-class user-authored "recipe" primitive callable from any agent context; team-shareable repeat tasks (refresh-changelog, scan-secrets, rebuild-docs) currently require bespoke slice or skill wiring
- Effort (0-3): 1 -- loop already parses Markdown + frontmatter (FEAT files); a `.claude/workflows/` directory + slash-resolver is additive
- Fit (0-3): 3 -- loop preset / skill resolver architecture is already pattern-matched on Markdown discovery + frontmatter
- Composite: 2 + (3 - 1) + 3 = **7**

### GAP-2: Rule activation triggers (`always_on` | `model_decision` | `glob` | `manual`)
- Description: Rules declare a `trigger` field in YAML frontmatter that controls when they get injected into the agent context. `model_decision` (only description shown initially, full content fetched on relevance) is particularly powerful for context-budget discipline; `glob` ties rules to file patterns (`globs: **/*.test.ts`); `manual` activates only on `@rule-name` mention.
- Source: https://docs.devin.ai/desktop/cascade/memories
- Impact (0-3): 3 -- loop CLAUDE.md is always-on; large repos hit context pressure; selective rule injection is a direct context-cost lever
- Effort (0-3): 1 -- loop already has Markdown rule reading; adding trigger field parsing + glob matching + relevance injection is bounded
- Fit (0-3): 3 -- maps directly onto loop existing rule-file discipline; CLAUDE.md remains, individual rule files gain triggers
- Composite: 3 + (3 - 1) + 3 = **8**

### GAP-3: Auto-generated Memories with zero-credit cost
- Description: Cascade proactively writes Memories during the session ("auto-generated memories do NOT consume credits"); user can also prompt "create a memory of...". Memories are workspace-scoped, retrieved automatically on relevance, and stored at `~/.codeium/windsurf/memories/`. Reduces context loss across sessions without requiring explicit snapshot ceremony.
- Source: https://docs.devin.ai/desktop/cascade/memories
- Impact (0-3): 2 -- loop snapshot-memory is manual and slice-end-only; auto-proposed Memories with a lightweight approval step would reduce context loss between cross-slice sessions
- Effort (0-3): 2 -- requires a background summarizer or end-of-turn proposer + a per-workspace memory store; loop snapshot-memory is a foundation
- Fit (0-3): 2 -- loop has MEMORY.md as the destination; pairing it with auto-proposal + human gate fits the autonomous loop "leave durable artifacts" tenet
- Composite: 2 + (3 - 2) + 2 = **5**

### GAP-4: Stratified model routing -- fast-tier flat quota vs frontier per-token
- Description: SWE-1.5 consumes quota at a fixed per-message rate; Claude Sonnet 4.6 / GPT-5.4 consume quota proportional to tokens. Windsurf docs explicitly coach users to route trivial tasks to SWE-1.5 first to preserve frontier-model budget. loop preset.roles routing names a model per role but does not strategize about cost-tier per turn within a slice.
- Source: https://devin.ai/blog/windsurf-pricing-plans ; https://vibecoding.app/blog/windsurf-review
- Impact (0-3): 2 -- loop cost-advisor catches overspend after the fact; a per-turn "fast-tier first, escalate if confidence drops" policy would reduce cost prospectively
- Effort (0-3): 2 -- requires a router shim that considers task class + confidence + token estimate before each dispatch; data layer mostly exists (cost-advisor)
- Fit (0-3): 2 -- loop already has model selection per role via preset; adding intra-role escalation rules is incremental
- Composite: 2 + (3 - 2) + 2 = **5**

### GAP-5: Codemaps -- AI-annotated visual code graph
- Description: Codemaps generate AI-annotated visual representations of a codebase: grouped sections, execution trace overlays, line-level linking. Useful before any change in an unfamiliar codebase. No competitor (Cursor, Claude Code, loop) has a direct equivalent as of 2026-Q2.
- Source: https://vibecoding.app/blog/windsurf-review ; https://www.nxcode.io/resources/news/cognition-windsurf-acquisition-swe-1-5-codemaps-2026
- Impact (0-3): 1 -- loop architect agent already does code archaeology; a visual artifact is high-value for human reviewers but not core to autonomous loop execution
- Effort (0-3): 3 -- visualization layer is out of scope for a CLI plugin; would require an external renderer or browser surface
- Fit (0-3): 1 -- loop is CLI / Claude Code native; visual code graphs do not map cleanly into the methodology
- Composite: 1 + (3 - 3) + 1 = **2**

### GAP-6: Per-file / per-hunk approval gates with approval-fatigue awareness
- Description: Cascade surfaces edits with per-file or per-hunk granularity for approval before commit. Long runs of 20+ steps are flagged as "plan drift" risk and explicitly warned. UX designed to keep the user in the loop without overwhelming them.
- Source: https://www.digitalapplied.com/blog/windsurf-2-deep-dive-cascade-agents-flows-2026
- Impact (0-3): 1 -- loop reviewer agent gates already exist; per-hunk granularity is more relevant for interactive flows than autonomous ones
- Effort (0-3): 2 -- would require a builder-side patch staging mechanism and a reviewer interaction model that loop currently lacks
- Fit (0-3): 1 -- loop optimizes for autonomous runs; per-hunk human gates work against that
- Composite: 1 + (3 - 2) + 1 = **3**

### GAP-7: System-scope rule files for enterprise IT deployment
- Description: A fourth precedence tier above workspace / global / built-in -- OS-deployed read-only rule files (`/etc/devin/rules/`, `/Library/Application Support/...`) that enterprise IT can ship to all developer machines. Cannot be edited by the user; effectively a security / compliance backstop.
- Source: https://docs.devin.ai/desktop/cascade/memories
- Impact (0-3): 1 -- enterprise adoption signal; loop is currently developer-installed only, no IT-pushed rules
- Effort (0-3): 2 -- requires platform-specific path discovery + read-only enforcement
- Fit (0-3): 1 -- enterprise deployment is not the loop primary audience today
- Composite: 1 + (3 - 2) + 1 = **3**

## Inadvisable mimics

- **IDE-bound proprietary distribution**: Windsurf ships as a VS Code fork. loop strength is being a Claude Code plugin (CLI-first, editor-agnostic). Coupling to an IDE binary would eliminate the composition story and the per-repo `.claude/` artifact discipline that survives across hosts.
- **Single unified agent with no role separation**: Cascade collapses builder / reviewer / validator into one Cascade pass. Optimizes for speed inside the IDE but removes the structural quality gate that crew enforces -- the independent reviewer is loop primary defense against an autonomous loop deluding itself.
- **Ephemeral session checkpoints instead of durable artifacts**: Windsurf checkpoints are session-local and IDE-bound. loop `.claude/artifacts/crew/{runs,handoffs,reviews,validations,deployments}` directories are explicitly designed for cross-session and cross-agent audit; replacing them with snapshots would degrade the handoff / grade / retro story.
- **User-local auto-Memories without team sync**: Cascade auto-Memories live in `~/.codeium/windsurf/memories/` -- not git-committed, not team-shareable. loop MEMORY.md + snapshot-memory pattern is git-committed by default, which is correct for an autonomous loop where the next session may be a different agent or human.
- **12,000-character hard cap on Workflow files**: A fixed character cap is a sharp ceiling that forces splits in ways that hurt readability. loop slice templates have no such cap and rely on phase boundaries instead.
- **Daily / weekly rate-limit quotas instead of cost transparency**: The March 2026 pricing reset moved Windsurf to opaque daily / weekly quotas that "refresh automatically" with no monthly pool to reason over. loop cost-insights + per-iteration trajectory + advisor verdict is more transparent and more compatible with autonomous self-throttling.
