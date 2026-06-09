---
competitor: Trigger.dev
category: workflow-platform
sources:
  - https://trigger.dev/
  - https://trigger.dev/docs
  - https://trigger.dev/docs/wait-for-token
  - https://trigger.dev/docs/runs/metadata
  - https://trigger.dev/docs/realtime/overview
  - https://trigger.dev/docs/github-integration
  - https://trigger.dev/docs/run-usage
  - https://trigger.dev/docs/ai-chat/patterns/human-in-the-loop
  - https://trigger.dev/pricing
  - https://github.com/triggerdotdev/trigger.dev
date: 2026-06-08
confidence: medium-high
---

## One-line read

TypeScript-native durable-execution / background-jobs platform (v3 GA, v4.5 RC adds first-class `chat.agent()` AI surface) supplying runtime primitives — checkpointable long-running tasks, waitpoint tokens, run metadata, Realtime sync — to *build* a coding-agent workflow on, but ships zero opinionated agent / loop / decision / ADR scaffolding.

## Scores

| Axis | Score | Evidence |
| --- | --- | --- |
| Planning | 1 | `schemaTask` (Zod-typed inputs/outputs) + `trigger.config.ts` are only pre-flight surfaces; no spec/decompose/ADR phase. |
| Multi-Agent | 2 | v4.5 RC `chat.agent()` + child-task `triggerAndWait` + `batchTrigger` lets one agent fan out to subtasks/sub-agents, but no built-in role pattern (builder/reviewer/validator). |
| Shared Memory | 3 | `metadata` (≤256 KB structured, mutable mid-run, subscribable via Realtime) + `chat.local` (typed, run-scoped, "auto-hydrated into subtasks") + `runs.list({ tag })`. |
| Workflow Visibility | 3 | Full trace view per run; Realtime run subscription via Electric SQL Postgres sync; `useRealtimeRun` / `useRealtimeStream` React hooks. |
| Knowledge Base | 1 | No first-class repo-knowledge store. Tags + metadata + `runs.list` allow cross-run query, but persistence is your responsibility. |
| Human Approval Gates | 3 | `wait.createToken` / `wait.forToken` / `wait.completeToken` = explicit waitpoint primitive (timeout-capable, CORS-enabled public-access token for browser, server-to-server webhook URL). Plus v4.5 HITL pattern for chat agents. |
| GitHub Integration | 2 | Native GitHub App connects repo, auto-deploys on push, preview deploys on PRs, build-env vars via `TRIGGER_BUILD_*`. No first-class GH Issues/PRs/sub-issues — CI/CD-shaped, not work-item-shaped. |
| Linear Integration | 0 | No matches for "Linear" in llms-full.txt (51,741 lines). No native adapter or first-class sync. |
| Architecture Governance | 0 | No ADR / decision-tracking primitive. |
| Standards Enforcement | 1 | Zod schema validation on task payloads, deploy-time build checks. Nothing equivalent to lint/content-length gates. |
| Learning From Past Runs | 1 | Run history queryable (`runs.list`, tags, metadata, replay/bulk-actions); no grade/retro/learning aggregation. |
| Cost Tracking | 3 | `usage.getCurrent()` returns `costInCents` + `durationMs` (compute + base) live inside run; `usage.measure(fn)` wraps a block; `runs.retrieve()` exposes `costInCents` / `baseCostInCents` / `durationMs` per run. No per-task budget *alert*. |
| Agent Analytics | 2 | Per-run latency, logs, OTel traces, machine preset. Not aggregated per-agent (no agent-role concept in platform). |
| Loop Execution | 2 | Durable execution + checkpoint/resume + waits + cron + retries gives substrate for unattended loop, but no built-in marathon/backlog walker — you write orchestrator task. |
| Self-Healing | 2 | Automatic retries on uncaught error with retry policies, idempotency keys, queue concurrency rules, dashboard replay. No autofix or circuit-break primitive. |
| Enterprise Readiness | 2 | Cloud Enterprise tier markets SOC 2, SSO, HIPAA, dedicated, priority support, SLA. Self-host via Apache-2.0 Docker / official Helm chart. Multi-env (DEV/STAGING/PREVIEW/PROD). No public RBAC/audit-log docs page. |

**Total: 28 / 48** — weighted toward runtime primitives; light on agent-role, governance, learning.

## Strengths (top 3)
1. **Waitpoint tokens = clean first-class HITL primitive.** `wait.createToken({ timeout })` → `wait.forToken<T>(id)` → `wait.completeToken(id, payload)` with CORS-safe `publicAccessToken` for browser + server-side webhook URL. Exactly the explicit-named-pause-point shape Crew/Loop emulate with halt-badges + `escalated_to_human`.
2. **Per-run cost API at runtime, not just invoice.** `usage.getCurrent()` and `usage.measure(fn)` expose `costInCents` / `durationMs` *inside* the run, so agent can self-gate spending. Finer-grained than Loop's post-hoc trajectory.
3. **Realtime + metadata + chat.local = complete shared-state stack.** 256 KB mutable metadata streamed via Electric SQL Postgres sync to React hooks + `chat.local` "auto-hydrated into subtasks" — multi-agent shared memory + live dashboard for free, vs snapshot files.

## Weaknesses (top 3)
1. **Zero opinionated agent/governance scaffolding.** No agent roles, no ADR/decision tracking, no spec→slice decomposition, no grade aggregation, no convention/content-length gates. Platform is infrastructure; methodology is yours. Loop's value prop (HARD RULES, slice ceremony, phase-gate runner) has no analogue.
2. **No Linear; GitHub is CI/CD-shaped, not work-item-shaped.** GH App auto-deploys + preview PRs, but no native concept of GH Issues, PR comments, or sub-issues as workflow inputs/outputs. Linear absent entirely.
3. **AI-agent surface (`chat.agent`, HITL tools, actions, `chat.local`) is v4.5 release-candidate, not GA.** Every AI-Agents doc page carries Warning banner: "APIs may still change before 4.5.0 GA." Production-grade for background tasks (v3); not yet for new agent shape.

## Features Crew/Loop should NOT copy (and why)
1. **Full durable-execution runtime with checkpoint/resume + Electric-SQL Realtime sync.** Platform Trigger.dev *is*. Reimplementing checkpointing/machine presets/queues/Postgres sync = dwarfs project for zero user benefit. *Lesson to import instead:* waitpoint-token *shape* (token-id + timeout + completion endpoint) is cheap pattern Loop could mirror for `wait.forHuman({ timeout })`.
2. **Managed cloud + Helm self-host product surface.** Trigger.dev sells compute. Loop ships methodology + agent prompts in user's repo, zero infra. Building hosted backend changes product category + trust model.
3. **General-purpose `task()` SDK as primary interface.** Generalising to `task()` primitive would dilute discipline that is the product. *Lesson:* keep `schemaTask`-style typed inputs (partly present via FEAT frontmatter) but no open-ended runtime.
4. **v4.5 `chat.agent()` framework for chat UI.** Loop's surface is Claude-Code agent thread, not customer-facing chat. Adopting `chat.agent` shape invites UI/session/transport concerns we don't own.

## Open questions / low-confidence cells
- **Enterprise RBAC + audit-log specifics** — pricing surfaces "SOC 2"/"SSO"/"HIPAA" keywords; no dedicated docs page on RBAC roles or admin audit logs found.
- **Loop Execution** — primitives sufficient for marathon walker; no shipped reference loop pattern.
- **GitHub Issues / PR-comment primitive** — absence confirmed in llms-full.txt; possibly undocumented webhook integration exists.
- **Multi-Agent** — `chat.agent` + subtasks supports structurally; no named "multi-agent" doc page.
- **v4.5 GA timing** — currently RC; verify if brief consumed >30 days from now.
