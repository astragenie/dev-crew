---
competitor: Windsurf
category: ai-coding
sources:
  - https://windsurf.com/
  - https://docs.windsurf.com/windsurf/cascade/cascade
  - https://docs.windsurf.com/windsurf/cascade/memories
  - https://docs.windsurf.com/windsurf/cascade/workflows
  - https://docs.windsurf.com/windsurf/cascade/mcp
  - https://docs.windsurf.com/windsurf/getting-started
  - https://windsurf.com/enterprise
  - https://devin.ai/desktop
date: 2026-06-08
confidence: high
notes: |
  Mid-2025 Windsurf/Cascade acquired by Cognition (Devin). Current product
  rebranded Devin Desktop; Cascade = in-IDE agent surface; Devin Cloud =
  autonomous async sibling. docs.windsurf.com still resolves; config still
  ~/.codeium/windsurf/. Marketing/enterprise pages route to devin.ai. Score
  reflects combined product as user/customer interacts with it today.
---

## Scores

| Axis | Score | Evidence |
| --- | --- | --- |
| Planning | 3 | Cascade ships specialized planning agent that "continuously refines long-term plan while your selected model focuses on short-term actions"; in-conversation Todo list; built-in `/plan` workflow template. |
| Multi-Agent | 3 | Devin Desktop Agent Command Center — Devin Local, Devin Cloud, Codex, Claude Agent, OpenCode, Cascade Local interoperate over Agent Client Protocol (ACP); Simultaneous Cascades with worktree isolation. |
| Shared Memory | 3 | Three-tier: auto Memories (`~/.codeium/windsurf/memories/`), versioned Rules (`.devin/rules/` or `.windsurf/rules/`, global/workspace/system scopes), AGENTS.md ingestion. Spaces share context + git worktrees across agents. |
| Workflow Visibility | 3 | Live Todo list, named checkpoints, per-step tool-call cards, real-time activity panel. Spaces dashboard shows multi-agent task state. |
| Knowledge Base | 2 | Rules + AGENTS.md provide structured persistent knowledge; codebase indexed via Context Awareness. No first-class wiki / decision-graph layer beyond markdown rules. |
| Human Approval Gates | 2 | Implicit per-tool-call accept/reject + named checkpoints + queued-message gating + Waiting-for-approval states for cloud agents. No named enumerable gate primitives (review/validate/deploy). |
| GitHub Integration | 2 | Devin Review is first-class PR reviewer product; `/address-pr-comments` workflow uses `gh pr checkout`, `gh api .../pulls/[id]/comments`. GitHub MCP one-click install. No native sub-issue primitive. |
| Linear Integration | 1 | Not documented as native adapter. Reachable via MCP servers (Linear community MCP). Marketing pages don't mention Linear by name. |
| Architecture Governance | 1 | No ADR / decision-graph primitives. Rules + AGENTS.md are convention files, not decision records. Cascade can be prompted to maintain ADR markdown, but nothing structural. |
| Standards Enforcement | 2 | Built-in Linter Integration: "Cascade can automatically fix linting errors on generated code … turned on by default"; edits made purely to fix Cascade-introduced lints are discounted/free. `/code-formatting` and `/run-tests-and-fix` workflow templates. No content-length / agent-shape gates. |
| Learning From Past Runs | 2 | Auto-generated Memories persist conversational facts; @-mention previous conversations surfaces prior trajectories with retrieved summaries. No grading rubric or aggregated retrospective primitive. |
| Cost Tracking | 2 | Prompt-credit model surfaced in product (each Continue = credit; auto-fix lint edits "may be discounted free"; tool-call cap = 20/prompt then continue costs credits). Per-user usage page. No per-run budget alerts in public docs. |
| Agent Analytics | 1 | No public docs surface per-agent latency/token/outcome dashboards. Enterprise audit-log framed as compliance not analytics. |
| Loop Execution | 3 | Devin Cloud + Devin CLI are autonomous async; Cascade has Auto-Continue; Nubank case study: Devin running unattended on ~100k subtasks. |
| Self-Healing | 2 | Auto-fix lint inside same trajectory; Explain-and-Fix one-click for editor errors; "Send problems to Cascade" pipes problems-panel diagnostics. No circuit-breaker / retry-budget primitive. |
| Enterprise Readiness | 3 | SOC 2 Type 2; VPC deploy (all major clouds); custom IdP / SSO; audit logs + fine-grained access controls; system-level Rules + Workflows deployed via `/etc/windsurf/` or `C:\ProgramData\Windsurf\`; Government tier; Forward Deployed Engineer. |

**Total: 35 / 48**

## Strengths (top 3)
1. **Tight IDE + autonomous-loop pair.** Cascade (local, real-time) + Devin Cloud/CLI (async, long-horizon) covers both "AI pair-programmer" and "delegate-and-walk-away" inside one product. ACP lets third-party agents (Codex, Claude Agent, OpenCode) plug into same Spaces/worktree harness — decoupled harness from model/agent vendor.
2. **Rules system as real spec primitive.** Four activation modes (`always_on`, `model_decision`, `glob`, `manual`) with explicit context-cost framing, three scopes (global/workspace/system-enterprise), AGENTS.md compatibility, version control by default. Most mature persistent-agent-instructions surface among IDE-agent vendors today.
3. **Enterprise story is real.** VPC deploy, SOC 2 Type 2, system-level rules + workflows deployable via OS-specific dirs, Nubank-scale case study (~100k automated migrations, 8-12x efficiency claim, 20x cost savings). Government tier.

## Weaknesses (top 3)
1. **No architecture-governance or grade-based-learning primitives.** Rules and Memories capture conventions and facts; no ADR ledger, no decision-graph, no grading rubric across runs, no retrospective aggregation. Loop's `decisions/` and `grades/` are net-new vs. Windsurf.
2. **Approval gates implicit, not named.** Tool-call accept/reject and checkpoints exist; no enumerable phase taxonomy (review/validate/deploy) with structured artifacts and PASS/FAIL gating like Crew enforces. Multi-step processes encoded as `/workflow` prompt templates — flexible but unverifiable.
3. **Brand turbulence + lock-in.** Cognition acquisition has left docs in mixed-branded state (Windsurf vs. Devin Desktop vs. Devin Cloud), config paths split between `.devin/` and legacy `.windsurf/`, feature parity unclear. Closed-source agent harness — extending/auditing requires accepting vendor's model + roadmap.

## Features Crew/Loop should NOT copy (and why)
1. **20-tool-call hard cap per prompt with "press Continue to resume" UX.** Manual interruption cadence Loop's marathon-mode rejects on principle. Cap exists for credit accounting, not safety. Bounded-iteration counter is better model.
2. **Auto-Memories stored only locally, never committed.** Docs warn "Auto-generated memories live only on your machine … ask Cascade to write it to a Rule." Two-tier knowledge with silent drift between teammates. `loop-snapshot.md` + grade trail is committed by default.
3. **One-Click MCP install deeplinks (`windsurf://...`).** Frictionless install of third-party MCP servers = security smell. Crew's hooks-validate-dispatch (`guard-feat-dispatch.mjs`) + explicit allowlist is right opposite default.
4. **Spaces sharing git worktrees across multiple unattended agents simultaneously.** Failure-mode-rich; docs advise "consider using worktrees to keep them isolated" — they haven't solved conflict-resolution they introduced. Loop's "one owner per task" constitutional rule is safer baseline.
5. **Discounted / free credit charges for self-induced lint fixes.** Pricing lever papers over root cause — model shouldn't introduce lint errors. Crew's lint-clean-as-gate (`validate-content-length`, zero-warning ESLint) is better fix.

## Open questions / low-confidence cells
- **Linear Integration** — no mention on marketing or docs. Likely community MCP only.
- **Agent Analytics** — Enterprise audit logs mentioned but not described in detail. Per-agent latency/token/outcome metrics vs just access events unclear.
- **Cost Tracking** — per-user prompt-credit balance visible; team-level/per-run budget alerts not described in public docs.
- **Cascade vs Devin Cloud feature parity** — Nubank case is Devin Cloud; Cascade docs cover in-IDE. Where Cascade ends and Devin Cloud begins not crisply documented post-acquisition.
- **Roadmap continuity** — Windsurf → Devin Desktop rename in progress; which Cascade-specific features deprecated vs carried forward is opaque. Re-audit in 90 days.
