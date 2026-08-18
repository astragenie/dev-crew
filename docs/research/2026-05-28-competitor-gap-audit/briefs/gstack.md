---
competitor: gstack
host: CC plugin
language: Markdown / shell
license: MIT
version_observed: 1.46.0.0
sources: [https://github.com/garrytan/gstack]
brief_version: 1
---

# gstack -- competitor brief

## Identity

- Name: gstack
- Host: Claude Code plugin (skills installed at ~/.claude/skills/gstack/)
- Language: Markdown skill files + compiled TypeScript/Bun binaries (browse daemon, PDF, design CLI)
- Install model: git clone + ./setup script; team mode via gstack-team-init; also supports OpenAI Codex CLI, Cursor, Factory Droid, Kiro, Hermes, GBrain
- Version observed: 1.46.0.0 (local install, 2026-05-28)
- License: MIT

gstack is an opinionated AI-coding workflow toolkit built by Garry Tan (Y Combinator CEO) that provides 30+ slash-command skills covering the full sprint lifecycle: product discovery, plan reviews (CEO / eng / design / DX), code review, QA with a persistent headless Chromium daemon, security audit (OWASP+STRIDE), release automation, post-deploy monitoring, documentation generation, and cross-session memory. Skills are plain Markdown files; the only compiled artifacts are the browse daemon binary and optional design/PDF CLIs. State persists in ~/.gstack/ per project slug. Proactive skill routing, continuous checkpoint commits, per-project learnings (JSONL), timeline events, opt-in telemetry to Supabase, and an optional GBrain semantic memory layer (Postgres/PGLite) differentiate it from raw Claude Code usage.

## Matrix row

| Axis                   | Symbol | 1-line note                                                                  |
| ---------------------- | ------ | ---------------------------------------------------------------------------- |
| Workflow phases        | ●      | Explicit Think -> Plan -> Build -> Review -> Test -> Ship -> Reflect sprint order |
| Roles / dispatch       | ◐      | Specialist personas per skill (CEO, Eng Mgr, QA Lead, CSO, etc.) but single-agent; no formal role handoff protocol |
| Artifacts / state      | ◐      | Per-project JSONL learnings, timeline, retro Markdown, design docs, checkpoint WIP commits; no structured artifact registry |
| Memory / retention     | ●      | /learn + learnings.jsonl, /context-save/restore, continuous checkpoint commits, GBrain semantic search, design taste profile |
| Model routing          | ◐      | Model-overlay patches per model family (claude.md, gpt.md, o-series.md, gemini.md); sidebar auto-routes Sonnet/Opus; no per-phase budget enforcement |
| Cost / telemetry       | ◐      | Opt-in Supabase telemetry (skill name, duration, outcome); local gstack-analytics JSONL dashboard; no token-count or dollar-cost reporting |
| Backlog / spec         | ○      | No FEAT/SPEC primitive; no backlog management; /office-hours produces a design doc but no structured feature IDs |
| Validation / gates     | ◐      | /qa closes a fix loop (find -> fix -> regression test -> verify); no formal PASS/FAIL gate blocking slice progression |
| Deployment             | ●      | /ship (test -> audit -> push -> PR), /land-and-deploy (merge -> CI wait -> prod verify), /canary (post-deploy monitoring), /setup-deploy |
| Install / distribution | ●      | git clone + shell setup, auto-update check per session, team mode, supports 10 AI agents, ClawHub for OpenClaw, gstack-upgrade self-updater |

Legend: ● = full coverage, ◐ = partial, ○ = absent.

## Strengths vs loop / crew

- Persistent headless Chromium daemon with sub-200ms commands, snapshot diffs, cookie import, responsive testing, and prompt-injection defense -- no equivalent in loop/crew.
- 30+ specialist persona skills covering the full sprint lifecycle in a single install; loop/crew focus on workflow orchestration and require the user to supply implementation capabilities.
- Cross-session memory stack (learnings JSONL + continuous checkpoint commits + GBrain semantic search + design taste profile) is deeper and more automated than loop/crew handoff artifacts.
- Multi-agent host support (Claude Code, Codex, Cursor, Factory, Kiro, Hermes, GBrain) + OpenClaw integration give gstack a much wider distribution surface.
- /autoplan chains CEO -> design -> eng -> DX review automatically, encoding domain expertise in a single command; loop/crew has no equivalent automated plan-review pipeline.
- Opt-in telemetry + local analytics dashboard gives the operator usage visibility; loop/crew have no telemetry at all.
- gstack-model-benchmark CLI cross-benchmarks Claude vs GPT vs Gemini; loop/crew have no benchmarking primitive.
- Proactive skill suggestion routing (configurable on/off per session) auto-invokes the right skill; loop/crew rely on explicit slash-command invocation.

## Weaknesses vs loop / crew

- No structured backlog: no FEAT/SPEC IDs, no priority scores, no autonomous_safe flag, no backlog promotion pipeline -- loop can autonomously walk a prioritized backlog; gstack cannot.
- No formal role-separation or handoff mechanics: all work runs in one agent session; loop/crew enforce builder -> reviewer -> validator ownership with durable handoff artifacts.
- No quantified validation gate: /qa verifies fixes but there is no PASS/FAIL criterion tied to acceptance criteria that blocks progression; loop slice-complete requires every AC to be PASS with evidence.
- No per-phase token/cost budget enforcement; model selection is a hint patch not a hard constraint.
- State lives in ~/.gstack/ (machine-local JSONL), not in the repo .claude/artifacts/ tree, making it harder to share with teammates or review in git history.
- No grade/retrospective scoring: /retro produces narrative Markdown but no numeric grade trend or per-axis scoring comparable to loop 5-dimension PM scoring.
- Install requires Bun + Node.js (Windows) and a compiled browse binary; loop/crew are pure Markdown/ESM with no build step.
- No autonomous loop mode: gstack is session-driven and interactive; it has no equivalent to loop marathon backlog walk.

## Gap candidates

### GAP-1: Persistent headless browser as a first-class validation tool

- Description: gstack ships a compiled Chromium daemon with ~100ms command latency, annotated screenshots, accessibility-tree snapshots, form interaction, cookie import, prompt-injection defense, and chain for multi-step flows. loop/crew have no runnable browser primitive; validation is limited to npm test or shell scripts.
- Source: C:/Users/serge/.claude/skills/gstack/SKILL.md (browse section), C:/Users/serge/.claude/skills/gstack/ARCHITECTURE.md
- Impact (0-3): 3 -- browser-driven validation dramatically increases confidence in shipped UI/web features; currently a total gap.
- Effort (0-3): 3 -- requires a compiled Playwright binary, daemon lifecycle management, and security stack; very high effort to replicate.
- Fit (0-3): 2 -- fits the validation gate in loop slice-complete; crew already has a validator role that would use it.
- Composite: 3 + (3-3) + 2 = 5

### GAP-2: Cross-session learnings with automatic recall

- Description: gstack logs per-project operational learnings as JSONL and auto-surfaces the top 3 at skill start. /learn lets the user review, prune, and export. loop/crew have handoff artifacts but no auto-recalled operational learnings that compound across sessions.
- Source: C:/Users/serge/.claude/skills/gstack/SKILL.md (preamble learnings block), C:/Users/serge/.claude/skills/gstack/learn/SKILL.md
- Impact (0-3): 2 -- reduces repeated discovery of project quirks; modest but cumulative value.
- Effort (0-3): 1 -- JSONL write + search script; low engineering complexity, mostly tooling discipline.
- Fit (0-3): 3 -- directly fits loop memory/retention gap and could be wired into wake-up context.
- Composite: 2 + (3-1) + 3 = 7

### GAP-3: Post-deploy canary monitoring loop

- Description: /canary runs a monitoring loop after deployment: periodic screenshots, console-error scanning, performance regression detection against pre-deploy baselines, and anomaly alerts. loop/crew have a deployment gate but no ongoing production health monitor.
- Source: C:/Users/serge/.claude/skills/gstack/canary/SKILL.md
- Impact (0-3): 2 -- catches regressions missed at deploy time; high value for production reliability.
- Effort (0-3): 2 -- requires browse daemon integration + baseline comparison; moderate effort.
- Fit (0-3): 2 -- fits after crew deployer gate; complements existing deployment evidence.
- Composite: 2 + (3-2) + 2 = 5

### GAP-4: Automated plan-review pipeline (/autoplan)

- Description: /autoplan chains CEO -> design -> eng -> DX review with encoded decision principles and surfaces only taste/architecture decisions for human approval, suppressing mechanical findings. loop/crew have no equivalent automated multi-perspective plan review before implementation starts.
- Source: C:/Users/serge/.claude/skills/gstack/autoplan/SKILL.md, C:/Users/serge/.claude/skills/gstack/README.md
- Impact (0-3): 2 -- reduces low-quality plan entry into the build phase; high value for feature quality.
- Effort (0-3): 2 -- orchestration skill composing existing review skills; moderate effort.
- Fit (0-3): 3 -- fits directly between loop PM triage and builder dispatch.
- Composite: 2 + (3-2) + 3 = 6

### GAP-5: Opt-in usage telemetry + local analytics dashboard

- Description: gstack logs skill name, duration, and outcome to both a local JSONL file and an opt-in Supabase remote. gstack-analytics renders a personal usage dashboard from local data. loop/crew collect no telemetry and have no analytics surface.
- Source: C:/Users/serge/.claude/skills/gstack/SKILL.md (telemetry section), C:/Users/serge/.claude/skills/gstack/README.md (Privacy and Telemetry section)
- Impact (0-3): 1 -- useful for operators and contributors; not directly user-facing.
- Effort (0-3): 1 -- JSONL + optional Supabase edge function; low complexity.
- Fit (0-3): 2 -- fits the cost/telemetry axis that loop/crew already recognize as important.
- Composite: 1 + (3-1) + 2 = 5

### GAP-6: Continuous checkpoint commits with WIP squash on ship

- Description: With checkpoint_mode continuous, skills auto-commit WIP with a prefix and structured context body (decisions, remaining work, failed approaches). /ship filter-squashes WIP commits before the PR so bisect stays clean. loop/crew have handoff artifacts but no auto-commit safety net for mid-session work.
- Source: C:/Users/serge/.claude/skills/gstack/README.md (Continuous checkpoint mode section)
- Impact (0-3): 2 -- prevents lost work on crash or context-switch; especially valuable in autonomous marathon runs.
- Effort (0-3): 1 -- git commit automation + filter-squash on ship; low complexity.
- Fit (0-3): 3 -- directly complements loop autonomous marathon mode.
- Composite: 2 + (3-1) + 3 = 7

### GAP-7: Cross-model benchmark CLI

- Description: gstack-model-benchmark runs the same prompt through Claude, GPT (via Codex CLI), and Gemini, comparing latency, tokens, cost, and optional LLM-judge quality score. loop/crew have model routing but no benchmarking primitive to validate routing decisions.
- Source: C:/Users/serge/.claude/skills/gstack/README.md (New binaries v0.19 section)
- Impact (0-3): 1 -- useful for optimizing model routing; indirect value.
- Effort (0-3): 2 -- requires multi-provider auth detection and LLM-judge integration.
- Fit (0-3): 2 -- fits loop model-routing axis.
- Composite: 1 + (3-2) + 2 = 4

## Inadvisable mimics

- Specialist persona skills (office-hours, plan-ceo-review, design-consultation, etc.): gstack value is encoded domain expertise in slash commands. loop/crew are methodology/orchestration layers -- adding opinionated product/design/DX personas fights the architecture and would balloon scope.
- Sidebar browser extension with prompt-injection ML classifier: The 22MB ML classifier + 721MB optional DeBERTa ensemble is a large binary dependency. loop/crew are Markdown-first; shipping binary ML models is architecturally opposed.
- Design taste profile and shotgun-to-HTML pipeline: UI/design generation (GPT Image, design-shotgun, design-html) is out of scope for a methodology harness focused on workflow orchestration and backlog management.
- Per-project GBrain semantic database: GBrain (Postgres/PGLite + embeddings) is a heavy optional dependency. loop/crew memory model (Markdown artifacts + handoff files) is intentionally lightweight and git-native; migrating to a database layer would increase operational complexity without clear workflow benefit.