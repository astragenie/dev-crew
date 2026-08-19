---
competitor: OpenHands
category: agent-framework
sources:
  - https://github.com/All-Hands-AI/OpenHands
  - https://docs.openhands.dev/
  - https://docs.all-hands.dev/openhands/usage/prompting/microagents-overview
  - https://docs.openhands.dev/openhands/usage/key-features
  - https://github.com/OpenHands/extensions
  - https://app.all-hands.dev
  - https://openhands.dev/enterprise
date: 2026-06-08
confidence: medium-high
---

## Identity

Formerly OpenDevin. OSS AI software-engineering agent maintained by All-Hands-AI. MIT core; source-available enterprise tier. **76.3k GitHub stars**, 9.7k forks — largest OSS dev-agent community by wide margin. SWE-Bench Verified 77.6. Four surfaces: SDK (Python) + CLI (Claude-Code-style) + Local GUI (React+REST) + Cloud (app.all-hands.dev) + Enterprise (K8s in customer VPC).

## Scores

| Axis | Score | Evidence |
| --- | --- | --- |
| Planning | 2 | Agent does inline planning inside chain-of-thought; CodeAct-style action loop. No first-class pre-flight spec/decomposition phase. "Prompting Best Practices" docs, no Loop-style spec-decompose ceremony. |
| Multi-Agent | 2 | SDK supports defining/running multiple agents ("scale to 1000s of agents in cloud"). Historically shipped delegation in OpenDevin core. Specialization freeform via Skills, not fixed role roster. |
| Shared Memory | 2 | Skills inject persistent context at global/org/user/repo scopes with keyword triggers. Cloud conversation sharing. Skills committed to repo + Cloud conversation history. Not a typed cross-agent blackboard. |
| Workflow Visibility | 3 | Local GUI + Cloud GUI stream agent actions live (file edits, shell, browser) — Devin/Jules-style timeline. CLI streams steps. |
| Knowledge Base | 3 | First-class Skills (formerly "microagents"): global registry github.com/OpenHands/extensions + org/user/repo-level skills with SKILL.md + frontmatter + keyword triggers. Repository Customization pins per-repo skills. Standout primitive. |
| Human Approval Gates | 1 | Local CLI/GUI ask confirmation on risky shell commands and pause for user input mid-loop, but no named structured approval-gate primitive (e.g. "review-required", "deploy-approval") in agent contract. Cloud RBAC governs who runs agents, not in-loop pauses. |
| GitHub Integration | 3 | Native GitHub login on Cloud; chrome extension; agent operates on GitHub repos directly (issues → PRs); "Automated Code Review" documented use case. |
| Linear Integration | 3 | Cloud-tier native integration alongside Slack + Jira. First-class adapter, not just MCP. |
| Architecture Governance | 0 | No ADR / decision-tracking. Skills can encode conventions; no "decision record" concept emitted by agent. |
| Standards Enforcement | 1 | Skills + Hooks can run lint/format/tests in agent flow, but no built-in convention-gate / content-length / manifest validator. Standards = whatever user wires into Skills + Hooks. |
| Learning From Past Runs | 1 | No formal grade/retro feedback loop in OSS. Cloud collects conversation history that can seed future runs; "Monitoring and Improving Skills" doc page exists, suggesting manual skill refinement. No automated grade-aggregation. |
| Cost Tracking | 2 | Cloud GUI shows per-conversation token + cost; LLM-configurable budget caps at CLI/SDK level (`max_iterations` / `max_budget_per_task`). Not as rich as per-run trajectory + alert framework. |
| Agent Analytics | 2 | Cloud surfaces per-conversation latency and token use; OSS evaluation infra (github.com/OpenHands/benchmarks) for batch grading. No first-class per-agent dashboard for production runs. |
| Loop Execution | 3 | Core design IS autonomous CodeAct loop — goal → action → observation → repeat until done or `max_iterations`. CLI/SDK run unattended; Cloud Automations triggered by Slack/Jira/Linear/cron. |
| Self-Healing | 2 | Loop retries failed actions and reasons over errors; Hooks + Skills can encode recovery patterns. No declared circuit-breaker / autofix primitive — recovery emergent from agent's reasoning. |
| Enterprise Readiness | 3 | Enterprise tier: self-host customer VPC via K8s; RBAC + permissions; multi-user; source-available `enterprise/` dir with paid license. Customer logos: Apple, Google, NVIDIA, Netflix, Mastercard, Amazon, MongoDB, TikTok, Red Hat, VMware, Roche, C3. SOC2 not explicitly cited; medium confidence. |

**Total: 32 / 48**

## Strengths (top 3)
1. **Skills / microagents ecosystem.** Biggest moat. Standardized SKILL.md (extended AgentSkills standard) + keyword triggers + global community registry (OpenHands/extensions) + four loading scopes (global/org/user/repo). Exactly the persistent-knowledge primitive Loop's CLAUDE.md tries to be — packaged, shareable, registry-backed.
2. **Full-stack product surface.** SDK + CLI + Local GUI + Cloud + Enterprise covers every buyer. Native Slack/Jira/Linear adapters reach non-engineer users. Logo wall (Apple, Google, NVIDIA, Netflix, Mastercard, Amazon, etc.) = strongest enterprise validation of any OSS dev-agent.
3. **Autonomous loop is canonical, not bolt-on.** CodeAct + `max_iterations` + `max_budget_per_task` is core. Cloud Automations trigger from external events. Proved autonomous walk viable in production.

## Weaknesses (top 3)
1. **No architecture-governance primitive.** Zero ADR / decision-tracking. Agent writes code but doesn't capture *why*. Loop's DEC-NNN ledger + grade ledger is defensible gap.
2. **No structured human-gate / phase-gate contract.** Approval implicit (CLI confirms risky commands; user interrupts). No equivalent of `/devcrew:review → /devcrew:validate → /devcrew:ship` with named pass/fail artifacts. For regulated buyers (financial, healthcare), Loop's gate ceremony is positioning win.
3. **Weak grade/retro learning loop.** "Monitoring and Improving Skills" is manual guidance; no automated per-slice grade aggregation feeding next run. Loop's grade ledger + cost trajectory + decisions structurally ahead — though OpenHands has ~100x run volume to mine if they choose.

## Features Crew/Loop should NOT copy (and why)
1. **Full local GUI + REST API + React SPA.** Massive surface to maintain. Loop/Crew live in Claude Code's UI; that's the moat. Building competing GUI dilutes focus on OpenHands' turf (76k stars momentum).
2. **Hosted Cloud tier with own auth/RBAC.** All-Hands-AI is now commercial vendor. Going there = becoming vendor, not methodology plugin. Stay in Claude Code; let Anthropic own auth.
3. **Browser-using / OS-using agent surface.** Adds attack surface; not aligned with "structured engineering work in repo" thesis.
4. **Generic Skills registry race.** OpenHands has 2-year head start + global community registry. Don't clone OpenHands/extensions; lean into Loop-specific phase-gate skills.
5. **Multi-modal agent canvas / rich GUI timeline.** Claude Code already streams tool use; re-implementing richer timeline = UX rabbit hole with no methodology payoff.

## Open questions / low-confidence cells
- **SOC2 / SSO / audit-log specifics** — Enterprise page mentions VPC + K8s self-host; SOC2 + SSO + audit-log specifics not on public README.
- **Per-run cost-tracking UX** — Cloud surfaces tokens/cost per conversation, unclear if budget *alerts* vs hard caps.
- **Per-agent analytics dashboard depth** — Cloud dashboards exist, depth (latency percentiles, success rate by skill) not verified.
- **Multi-agent coordination contract** — "scale to 1000s" claim; coordination protocol (blackboard? supervisor-worker?) needs SDK doc deep-dive.
- **Skill collision / precedence** — "Skill Loading Precedence" mentioned; exact merge semantics need full doc fetch. Useful input for Loop's skill-resolver design.
- **Linear integration depth** — listed as native; bidirectional sub-issue sync vs notification-only not verified.
