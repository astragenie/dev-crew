---
competitor: Cline
category: ai-coding
sources:
  - https://github.com/cline/cline
  - https://cline.bot/
  - https://cline.bot/enterprise
  - https://cline.bot/pricing
  - https://docs.cline.bot/
  - https://docs.cline.bot/core-workflows/plan-and-act.md
  - https://docs.cline.bot/core-workflows/checkpoints.md
  - https://docs.cline.bot/best-practices/memory-bank.md
  - https://docs.cline.bot/features/subagents.md
  - https://docs.cline.bot/customization/cline-rules.md
  - https://docs.cline.bot/customization/skills.md
  - https://docs.cline.bot/customization/hooks.md
  - https://docs.cline.bot/cli/agent-teams.md
  - https://docs.cline.bot/cli/scheduling.md
  - https://docs.cline.bot/cli/samples/github-integration.md
  - https://docs.cline.bot/enterprise-solutions/sso-setup.md
  - https://docs.cline.bot/enterprise-solutions/monitoring/opentelemetry.md
  - https://docs.cline.bot/enterprise-solutions/monitoring/prompt-storage.md
date: 2026-06-08
confidence: high
---

## Scores

| Axis | Score | Evidence |
| --- | --- | --- |
| Planning | 3 | First-class "Plan mode" before "Act mode": Cline explores codebase, asks clarifying questions, lays out strategy, then user toggles to Act. |
| Multi-Agent | 3 | Native multi-agent: `cline --team-name <name>` runs coordinator that delegates to specialists with own tools/context; team state persists across sessions. Parallel research Subagents. |
| Shared Memory | 3 | Memory Bank = structured documentation system Cline reads/writes across sessions. Team state persists. Hub-Spoke SDK: local daemon coordinates sessions across clients. |
| Workflow Visibility | 3 | Real-time tool/diff streaming with checkpoints; every file edit + terminal command requires approval by default. Kanban UI shows per-card live agent state. SDK runtime/session events. |
| Knowledge Base | 3 | Memory Bank persistent structured. `.clinerules` codify standards/architecture/deployment. Skills = modular instruction sets loaded on demand. |
| Human Approval Gates | 3 | Every file edit + terminal command requires approval by default; opt-in Auto-approve and YOLO Mode. Enterprise admins control YOLO Mode org-wide. Plan→Act toggle is itself a named gate. |
| GitHub Integration | 3 | First-class via headless CLI + GitHub Actions samples (auto-respond to issues via @cline mention), PR review, Issue RCA. Kanban auto-commits per worktree. No native sub-issue primitive. |
| Linear Integration | 2 | Connector exists alongside Telegram/Slack/Discord/Google Chat/WhatsApp. Conversational adapter — no bi-directional ticket state sync. |
| Architecture Governance | 1 | No ADR / decision-tracking primitive. `.clinerules` captures conventions but not versioned decision log. Plan-mode plans are conversational. |
| Standards Enforcement | 2 | `.clineignore` access control, `.clinerules` coding standards, Skills, Hooks for lifecycle interception, SDK plugin system for logging/auditing/policy. Auto-fixes linter/compiler errors as it works. No built-in content-length/manifest validators. |
| Learning From Past Runs | 1 | Memory Bank persists context but is context store, not graded retro/lesson system. No evidence of automatic grade aggregation or feeding past runs into next prompt. |
| Cost Tracking | 2 | Usage-based pricing; Cline provider unifies billing. Per-task token/cost shown. Enterprise has Centralized Billing. No documented hard-cap/budget-alert. |
| Agent Analytics | 3 | OpenTelemetry (OTLP) export of telemetry events; documented event reference. Prompt Storage to S3 / Cloudflare R2 for compliance/audit/analysis. |
| Loop Execution | 3 | Headless CLI runs zero-interaction in CI/CD. Scheduled Agents via cron. Kanban dependency chains run cards autonomously with per-worktree auto-commit. Auto-approve + YOLO Mode for full-auto. |
| Self-Healing | 2 | Monitors linter/compiler errors as it works, fixing missing imports/type mismatches/syntax errors before user sees. Long-running processes react to new output. No documented circuit-breaker/retry-budget. |
| Enterprise Readiness | 3 | Enterprise tier: SSO via WorkOS AuthKit, audit logs, on-prem/VPC/air-gapped, RBAC/member management, BYO Infrastructure + admin-controlled providers. Customers: Lockheed Martin, Sony, Roche, Reddit, Plaid, Credit Karma. SOC2 not explicitly stated. |

**Total: 37 / 48**

## Strengths (top 3)
1. **End-to-end autonomous-loop surface.** Plan/Act + Auto-Approve/YOLO + Scheduled Agents + headless CLI + Kanban worktrees with dependency chains covers full "human-supervised → fully autonomous" spectrum from one product.
2. **Enterprise depth uncommon in OSS-rooted tools.** OTLP-native observability, S3/R2 prompt storage for compliance, WorkOS SSO, on-prem/air-gapped, admin-controlled provider config, centralized MCP allowlisting.
3. **Open extensibility with stable contracts.** `@cline/sdk` exposes same engine that powers CLI/Kanban/IDE; Plugin + Hooks + Skills + MCP marketplace; multi-IDE (VS Code, JetBrains, Neovim/Zed via ACP).

## Weaknesses (top 3)
1. **No durable architecture-governance primitive.** `.clinerules` captures conventions but no ADR/decision log/superseded-by chain. Plans live in chat, not versioned governance artifact.
2. **No grades-into-next-run learning loop.** Memory Bank stores context; nothing documented for systematic retro/lesson aggregation that biases next slice's prompt.
3. **Linear / issue-tracker integration is conversational, not first-class sync.** No documented bidirectional ticket-state sync, sub-issue decomposition, or status-field mapping. GitHub story stronger but still lacks native sub-issue primitives.

## Features Crew/Loop should NOT copy (and why)
1. **YOLO Mode as separately branded toggle.** Crew/Loop already has `loop.marathonMode` and dispatch-discipline rules. Second user-facing "YOLO" knob fragments safety surface.
2. **Hub-Spoke daemon architecture for multi-client session coordination.** Cline runs local hub for CLI/IDE/Kanban shared session state. Plugin-on-Claude-Code model already inherits session host.
3. **Web-based Kanban board as product surface.** Requires Next.js app, networking, auth, per-worktree commit hygiene. Slice ceremony + backlog markdown already serves "see N tasks" need.
4. **Cross-platform chat connectors (Telegram/WhatsApp/Discord) at framework layer.** Useful for "agent as employee" pitch; off-mission for engineering-discipline plugin pair.
5. **Bundled multi-IDE clients (JetBrains, Neovim/Zed via ACP).** Distribution + maintenance cost high; value prop is methodology, not editor reach.

## Open questions / low-confidence cells
- **Cost Tracking budget alerts** — usage-based + centralized enterprise billing confirmed, no public doc shows hard-cap budget alerts.
- **SOC2 / compliance certifications** — Enterprise page lists Fortune 500 customers + "compliance" but does not name SOC2/ISO/HIPAA explicitly.
- **Learning-from-past-runs automation** — Memory Bank is closest primitive; unclear if automatic post-run summarization back into rules/skills.
- **GitHub sub-issue + Projects support** — Actions/PR review/RCA samples cover issues; sub-issue hierarchy and Projects v2 sync not mentioned.
- **Self-healing circuit-breaker semantics** — auto-fix documented; retry budget/max-iteration guardrails not.
- **Agent Analytics per-agent granularity** — OTLP events documented; per-sub-agent latency/token attribution not verified.
