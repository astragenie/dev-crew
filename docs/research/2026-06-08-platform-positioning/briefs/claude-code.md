---
competitor: Claude Code
category: ai-coding
sources:
  - https://github.com/anthropics/claude-code
  - https://code.claude.com/docs/en/overview
  - https://code.claude.com/docs/en/sub-agents
  - https://code.claude.com/docs/en/agent-teams
  - https://code.claude.com/docs/en/hooks
  - https://code.claude.com/docs/en/skills
  - https://code.claude.com/docs/en/memory
  - https://code.claude.com/docs/en/permission-modes
  - https://code.claude.com/docs/en/checkpointing
  - https://code.claude.com/docs/en/monitoring-usage
  - https://code.claude.com/docs/en/iam
  - https://code.claude.com/docs/en/security
  - https://code.claude.com/docs/en/github-actions
  - https://code.claude.com/docs/en/output-styles
date: 2026-06-08
confidence: medium-high
---

## Scores
| Axis | Score | Evidence |
| --- | --- | --- |
| Planning | 2 | Built-in `Plan` subagent + plan-mode + Proactive output style; no spec/decomposition primitive |
| Multi-Agent | 3 | Subagents (built-in Explore/Plan/general-purpose + custom) + experimental Agent Teams (v2.1.32+) with shared task list and inter-agent messaging |
| Shared Memory | 2 | CLAUDE.md + auto memory (per-repo, shared across worktrees); subagents can have own auto memory; no formal cross-agent state store |
| Workflow Visibility | 2 | `claude agents` view with state/id fields, transcript view (Ctrl+O), checkpoint timeline; no DAG/phase dashboard |
| Knowledge Base | 2 | CLAUDE.md hierarchy + `.claude/rules/` scoped rules + auto memory (200 lines / 25KB) + skills as on-demand reference; no embeddings/RAG index |
| Human Approval Gates | 3 | Six permission modes (default/acceptEdits/plan/auto/dontAsk/bypassPermissions), per-tool prompts, PermissionRequest hook, protected paths |
| GitHub Integration | 3 | First-class `@claude` GitHub App + Actions, `/install-github-app`, auto-PR creation, GitHub Code Review action, repo issue/PR plumbing |
| Linear Integration | 1 | No native Linear adapter in docs; possible via generic MCP servers but not first-class (low confidence — no Linear page in docs index) |
| Architecture Governance | 0 | No ADR / decision-tracking / supersession primitives in base product |
| Standards Enforcement | 1 | CLAUDE.md instructions + PreToolUse hooks can block actions; no built-in lint/content-length gates — user must wire hooks themselves |
| Learning From Past Runs | 1 | Auto memory captures corrections/preferences across sessions; no grade aggregation, no retro/lessons surface |
| Cost Tracking | 2 | OTel metrics export (cost, tokens, sessions) via `CLAUDE_CODE_ENABLE_TELEMETRY`; no built-in budget alerting UI |
| Agent Analytics | 2 | OTel metrics + events (logs protocol) + optional traces beta; per-agent breakdown depends on user's backend (Grafana/Datadog) |
| Loop Execution | 2 | `auto` permission mode + Proactive output style + `claude -p` headless mode + background agents; no built-in marathon/iteration counter |
| Self-Healing | 2 | Auto-retry on fallback model (v2.1.166), `/rewind` checkpoints, hook-based recovery, `--safe-mode` (v2.1.169); no auto-fix-failed-test loop |
| Enterprise Readiness | 3 | SOC 2 Type 2 + ISO 27001 (Trust Center), SSO + RBAC via Claude for Enterprise, managed settings (MDM), Bedrock/Vertex/Foundry, sandboxing, audit via OTel |

## Strengths (top 3)
1. **Native multi-agent primitives at platform layer** — subagents (built-in + custom with per-agent tool restrictions and model selection) plus experimental agent teams with shared task list and direct inter-agent messaging; competitors mostly require user-built orchestration. Built-in `Explore`/`Plan`/`general-purpose` ship out of the box.
2. **First-class enterprise + GitHub posture** — SOC 2 Type 2, ISO 27001, SSO/RBAC, managed-settings via MDM, three cloud-provider auth paths (Bedrock/Vertex/Foundry), sandboxed bash, `@claude` GitHub App + Actions, GitHub Code Review action. Few competitors match this breadth in base product.
3. **Granular safety/permission surface** — six permission modes, PreToolUse/PostToolUse hooks, protected paths that even `auto` mode won't write, `--safe-mode` flag, checkpointing with `/rewind`, sandbox boundaries.

## Weaknesses (top 3)
1. **No architecture-governance or learning-loop primitives** — zero ADR/decision tracking, no supersession model, no grade/retro aggregation surfaced into next run. Auto memory captures corrections but is unstructured and per-repo. This is the gap Crew+Loop's DEC-/grade artifacts fill.
2. **No first-class Linear (or non-GitHub issue tracker) integration** — GitHub heavily favored; Linear/Jira/Asana are at best MCP-server bring-your-own. For shops standardized on Linear, the workflow story is thin.
3. **Loop execution is shallow** — `auto` mode + Proactive style + background agents enable long runs, but no native marathon walker, no iteration counter / cost-trajectory tracker, no backlog-walking primitive, no PASS-criterion gate.

## Features Crew/Loop should NOT copy (and why)
1. **Agent Teams' direct teammate-to-teammate messaging** — labeled experimental, known limitations on session resumption/shutdown, significantly more tokens. Crew's structured handoffs (objective/scope/forbidden/deliverable) are cheaper, deterministic, auditable.
2. **Output Styles as personality knob** — Crew/Loop deliberately keep role prompts versioned in `agents/*.md` with line caps and review. Freeform output-style overrides would re-introduce drift the content-length validator was built to prevent.
3. **Bundled skills like `/loop`, `/debug`, `/code-review`** — naming collision risk with Loop plugin's own `/loop:*` namespace; bundled implementations bypass Crew's review/validation gates.
4. **`bypassPermissions` mode** — for autonomous loop runs, existing `auto` + protected-paths model in Crew handoffs is safer; full bypass would invalidate the review-as-gate constitution rule.

## Open questions / low-confidence cells
- **Linear (score 1, low confidence)** — no Linear page surfaced in docs index search; possible MCP integration via marketplace not verified.
- **Cost Tracking budget alerts (score 2)** — OTel export confirmed; whether Claude Code surfaces native budget alert (vs. requiring user Grafana alert rules) unverified.
- **Self-Healing auto-fix loops** — `--safe-mode`, fallback model retry, `/rewind` confirmed; built-in failed-test → re-prompt loop unverified.
- **Agent Teams shared memory model** — docs reference shared task list and direct messaging; whether teammates have shared file-store or only message-passing unverified.
- **Cost per run attribution** — OTel exports tokens/cost metrics but per-subagent / per-phase attribution granularity not confirmed.
