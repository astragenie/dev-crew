---
competitor: OpenAI Codex
category: ai-coding
sources:
  - https://github.com/openai/codex
  - https://developers.openai.com/codex/cli/features
  - https://developers.openai.com/codex/cloud
  - https://developers.openai.com/codex/security
  - https://developers.openai.com/codex/integrations/github
  - https://developers.openai.com/codex/integrations/linear
  - https://developers.openai.com/codex/subagents
  - https://developers.openai.com/codex/enterprise/admin-setup
  - https://developers.openai.com/codex/enterprise/governance
date: 2026-06-08
confidence: high
---

## Codex 2025 reborn

Codex CLI (Rust, `npm i -g @openai/codex` / brew) + IDE extension (VS Code/Cursor/Windsurf) + Codex Web/cloud (chatgpt.com/codex, OpenAI-managed containers) + ChatGPT-integrated coding (Plus/Pro/Business/Edu/Enterprise). NOT 2021 model. GPT-5.x family (default `gpt-5.5`, plus `gpt-5.3-codex-spark`, `gpt-5.4`, `gpt-5.4-mini`). Config: `~/.codex/config.toml`, project `.codex/`, repo `AGENTS.md`, admin `requirements.toml`.

## Scores

| Axis | Score | Evidence |
| --- | --- | --- |
| Planning | 2 | "Watch Codex explain its plan before making a change, and approve or reject steps inline." Plan implicit per turn, not separate artifact. Read-only `explorer`/`pr_explorer` subagents can map code paths — recipe, not built-in. |
| Multi-Agent | 3 | Dedicated subagents: `default`, `worker`, `explorer` built-ins + user-defined TOML agents. `agents.max_threads`=6, `agents.max_depth`=1, per-agent model/sandbox/MCP overrides. `spawn_agents_on_csv` for batch fan-out. |
| Shared Memory | 2 | `codex resume` / `codex resume --last` / `codex resume <id>` restores transcripts from `~/.codex/sessions/`. SQLite-backed via `sqlite_home`. Per-session local — no cross-agent structured KB. |
| Workflow Visibility | 2 | TUI live plan + diffs + `/status` + `/agent` thread switcher; approval overlay surfaces subagent requests. `codex exec --json` streams events. Cloud dashboard. Chat transcript with inline tool calls — not DAG/Gantt. |
| Knowledge Base | 2 | `AGENTS.md` canonical persistent repo knowledge (code review + subagents + local CLI). Skills under `skills/` + Team Config under `.codex/` checked into repo. No graph KB / vector store as first-class surface. |
| Human Approval Gates | 3 | Three named modes: Read-only / Auto (default) / Full Access (`--yolo`). `/permissions` switches mid-session. Admin enforced via `allowed_approval_policies` in `requirements.toml`. `prefix_rules` can mark commands `decision = "prompt"`. |
| GitHub Integration | 3 | `@codex review` PR-comment trigger; `@codex fix the P1 issue` continuation; auto-review toggle; ChatGPT GitHub Connector; cloud requires GitHub.com repos; Codex Security cloud scans commit-by-commit; opens PRs from cloud tasks back. |
| Linear Integration | 3 | First-party **Codex for Linear**: assign issue to Codex as teammate; `@Codex` in comments; Linear triage rules auto-delegate; env+repo auto-selection from context; activity stream posts back. Plus local-MCP via `mcp.linear.app/mcp`. |
| Architecture Governance | 1 | No ADR primitive. `/review` checks risks in diffs; `AGENTS.md` review guidelines steer reviewer. No durable decision artifact. Custom subagents authorable but no shipped governance scaffolding. |
| Standards Enforcement | 2 | `AGENTS.md` review guidelines applied by code review at PR time. `rules/` directory + `prefix_rules` at admin level. Team Config standardizes across users. Lint/format gates not built-in but can run. |
| Learning From Past Runs | 1 | `codex resume` reloads transcripts for user continuation, no grade/retro loop. Code Review activity surfaces in analytics (P0/P1/P2 priority, reactions) but no per-tenant fine-tune-on-feedback. |
| Cost Tracking | 2 | Analytics Dashboard + API: credit/token by surface/model, per-user, daily/weekly, CSV/JSON export. Compliance API exports token + request metadata. No per-run budget alert/hard cap/kill switch surfaced. CSV-fanout has `max_runtime_seconds` not $. |
| Agent Analytics | 3 | Analytics Dashboard: active users by surface (CLI/IDE/cloud/desktop/Code Review), threads/turns by client, credit/token by model, user-ranking, skill invocations, agent identity usage, access token usage, Code Review throughput + priority + sentiment. Analytics API `codex.enterprise.analytics.read` scope, 90-day lookback. |
| Loop Execution | 2 | `codex exec` non-interactive; Codex cloud queues tasks; Linear/GitHub triggers fire async; subagents fan out, orchestrator "waits until all requested results available". Not true backlog-walking auto-loop. |
| Self-Healing | 2 | `@codex fix the CI failures` follow-up; cloud `--attempts 1-4` for best-of-N; sandbox/approval errors surface back to parent. No documented circuit breaker / retry-with-backoff orchestration. |
| Enterprise Readiness | 3 | ChatGPT Enterprise: no training on enterprise data, ZDR for App/CLI/IDE, AES-256 at rest, TLS 1.2+, Compliance API audit logs (30-day retention), Analytics API. RBAC + SCIM groups, "Codex Admin" role, cloud-managed `requirements.toml` per-group. SSO via ChatGPT Enterprise. Internet allowlist + denied domains via `experimental_network`. |

**Total: 34 / 48**

## Strengths (top 3)
1. **Distribution and trust moat.** Preinstalled with ChatGPT Plus/Pro/Business/Edu/Enterprise. ChatGPT Enterprise admin surfaces (RBAC, SCIM, managed `requirements.toml`, Compliance + Analytics APIs) make rollout into Fortune-500 a checkbox.
2. **First-class platform integrations as teammate.** `@codex` in GitHub PR comments, `@Codex` in Linear comments, assign-issue-to-Codex, Linear triage rules, Slack posting on completion. Behaves like hireable identity inside project-management graph.
3. **Layered policy and sandbox model.** Three named approval modes + `prefix_rules` + `requirements.toml` admin overrides + per-subagent sandbox override + workspace internet allowlist = coherent layered safety model.

## Weaknesses (top 3)
1. **Vertical lock-in to OpenAI models + infrastructure.** All paths route to GPT-5.x; no documented Anthropic/Google/local option. Cloud requires GitHub.com — explicitly excludes GHES/on-prem/GitLab/Bitbucket. Model-agnostic Crew+Loop can address.
2. **No structured methodology / lifecycle scaffolding.** No ADR, no learning-from-grade loop, no backlog-walking auto-loop, no slice ceremony. General-purpose agent — every methodology layer is user's job.
3. **Subagent system recipe-driven, shallow on shared state.** `max_depth = 1` default. Fan-out works but no durable cross-agent KB, no decision log, no grade aggregation between runs. State lives in transcripts.

## Features Crew/Loop should NOT copy (and why)
1. **`spawn_agents_on_csv` batch fan-out** — inverts slice-ceremony discipline.
2. **Three discrete approval modes (Read-only / Auto / Full Access)** — coarser than Crew's gate-per-class; loses per-gate evidence chain.
3. **In-product image generation (`gpt-image-2`, `$imagegen`)** — burns budget on non-coding work; signals "kitchen sink" not "engineering OS."
4. **`--yolo` / Full Access mode by name** — brand name undermines safety-first tone. Use neutral name.
5. **Proprietary-model gating of features** — pinning differentiators to model version creates treadmill. Preset-driven activation is right pattern.

## Open questions / low-confidence cells
- **Cost-budget enforcement** — Analytics rich; per-run hard cap / kill-switch likely exists in admin surfaces not in public docs.
- **Learning From Past Runs** — unclear if OpenAI re-ingests Code Review reactions per-tenant or just reports metrics.
- **Architecture Governance** — no mention; custom subagents could emit ADRs by convention.
- **Codex cloud GA vs preview status** — Codex Security cloud "in research preview"; main Codex cloud treated GA.
- **`autonomous_safe` analogue** — closest is `auto` mode + `requirements.toml` `allowed_approval_policies`; no per-task safety classifier confirmed.
