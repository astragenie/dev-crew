# Competitor analysis - Archon .archon/ directory

**Target:** https://github.com/coleam00/Archon/tree/dev/.archon
**Date:** 2026-06-08
**Analyst:** researcher (loop repo competitive intel)
**Scope:** Read-only inspection of the .archon/ folder. No claims about the broader Archon platform beyond what this folder reveals.

---

## 1. What Archon does (.archon/ purpose + layout)

.archon/ is the **in-repo control surface for Archons own self-hosted workflow runtime** - it ships the workflows, commands, scripts, and maintainer-tooling that Archon itself dogfoods. Archon (the product) is a self-hosted platform that remote-controls AI coding assistants (Claude Code, Codex, Pi) across Slack/Telegram/GitHub/Discord/CLI/Web UI, explicitly *single-developer, not multi-tenant* (source: maintainer-standup/direction.md at https://raw.githubusercontent.com/coleam00/Archon/dev/.archon/maintainer-standup/direction.md).

Layout (tree root: https://github.com/coleam00/Archon/tree/dev/.archon):

```
.archon/
- config.yaml                # manifest: base branch + docs path
- commands/                  # Claude-Code-style markdown command prompts (10 files + defaults/)
- workflows/                 # YAML DAG workflow definitions (defaults/ has 20, maintainer/ has 6, plus experimental/ test-workflows/)
- scripts/                   # bun/TS + JS/Python helper scripts (12 files; tests colocated)
- maintainer-standup/        # README + direction.md + per-maintainer profile/state/briefs
- test-loop-counter.txt      # test fixture
```

Manifest config.yaml (https://raw.githubusercontent.com/coleam00/Archon/dev/.archon/config.yaml) is intentionally minimal: worktree.base_branch=dev and docs.source=packages/docs-web/src/content/docs. No agent registry, no role/skill declarations.

## 2. Primitives offered

- **Workflows (YAML DAGs)** - declarative node graphs with depends_on, provider, model, runtime, timeout, bash:, script:, command:. ~30 workflows total (defaults dir: https://github.com/coleam00/Archon/tree/dev/.archon/workflows/defaults ; maintainer dir: https://github.com/coleam00/Archon/tree/dev/.archon/workflows/maintainer). Notable: archon-piv-loop (Plan-Implement-Validate), archon-feature-development, archon-comprehensive-pr-review, archon-adversarial-dev, archon-ralph-dag (fresh-context-per-iteration), archon-refactor-safely, archon-resolve-conflicts, archon-idea-to-pr, archon-interactive-prd, archon-workflow-builder (self-modifying).
- **Commands** - markdown prompt files invoked via command: in a workflow node (commands dir: https://github.com/coleam00/Archon/tree/dev/.archon/commands). Examples: maintainer-standup.md, maintainer-review-code-review.md, maintainer-review-test-coverage.md, maintainer-review-error-handling.md, maintainer-review-docs-impact.md, maintainer-review-comment-quality.md, maintainer-review-synthesize.md, maintainer-review-report.md. Each is a single LOAD -> ANALYZE -> WRITE -> RETURN prompt with strict output-artifact contract.
- **Scripts** - bun/TS data-gathering helpers (scripts dir: https://github.com/coleam00/Archon/tree/dev/.archon/scripts): maintainer-standup-{git-status,gh-data,read-context,persist,backfill-reviews}.ts, plus marketplace-{fetch-source,security-scan,validate-schema}.ts. These run as deterministic DAG nodes feeding LLM-synthesis nodes downstream.
- **Maintainer-standup mini-app** - committed README.md + direction.md, gitignored per-maintainer profile.md, state.json, briefs/YYYY-MM-DD.md (README: https://raw.githubusercontent.com/coleam00/Archon/dev/.archon/maintainer-standup/README.md).
- **No agents, no skills, no manifests** - there is no agents/, no skills/, no role taxonomy. Composition happens at the workflow-DAG level.

## 3. Methodology stance

- **DAG-over-orchestrator**: Workflows are YAML state machines, not agent conversations. Each node is bash, a script, or a single-shot LLM command - parallel where depends_on permits.
- **PIV loop** (archon-piv-loop.yaml: https://raw.githubusercontent.com/coleam00/Archon/dev/.archon/workflows/defaults/archon-piv-loop.yaml) - Explore -> Plan -> Implement -> Validate -> Finalize, with **explicit human approval gates** between Explore/Plan and Plan/Implement, and between Validate/Finalize. Signals via PLAN_READY-style promise tokens. Strong human-in-loop stance.
- **Ralph pattern** - fresh context per implementation iteration (no memory leakage); archon-ralph-dag ships it as a primitive.
- **No TDD enforcement** observed in DAGs sampled. archon-feature-development mentions validation loops but only chains implement -> create-pr -> verify-pr-base; no test-first gate.
- **No slice/phase backlog discipline**. No FEAT-NNN / SPEC-NNN / approved-slices format. Backlog state lives in GitHub issues/PRs, surfaced via maintainer-standup triage (P1 to P4 against direction.md).
- **Direction-as-policy**: PRs/issues get P4 polite-decline ONLY with explicit direction.md clause citation (e.g. single-developer-tool clause) - codified scope discipline at the *product* level, not the engineering-process level.
- **Autonomous loop**: present but bounded. archon-piv-loop is explicitly human-gated; maintainer-standup is fully autonomous (daily DAG run). Marathon/auto-mode equivalent not observed.

## 4. Overlap with loop

| Concern | Loop | Archon |
|---|---|---|
| Workflow definitions | Slash commands + skill markdown + JS preset resolver | YAML DAGs with nodes + depends_on |
| Code-review pipeline | crew:reviewer + slice-review-ladder (Reviewer A/B) | 6 specialised maintainer-review-* commands fanning into synthesize+report |
| Daily situational report | /loop:brief, /loop:snapshot-memory, loop-snapshot.md | maintainer-standup workflow + dated briefs |
| Fresh-context iteration | Subagent dispatch per phase | Ralph pattern in archon-ralph-dag |
| Direction/scope guardrails | CLAUDE.md + docs/code-conventions.md | direction.md with clause-citation discipline |
| PR review fan-out | Sequential reviewer agents | Parallel review-dimension nodes (code, tests, errors, docs, comments) -> synthesize |

## 5. Gaps in loop (what Archon ships that we lack)

- **Parallel multi-dimensional review** - 6 narrow review-dimension commands (test-coverage, error-handling, docs-impact, comment-quality, code-review) running concurrently then synthesized is more granular than our single reviewer + optional second pass. **Worth borrowing**: even one extra dimension (e.g. test-coverage as its own subagent) is a low-cost lift and would improve our test_confidence score.
- **Polite-decline-with-citation** as a first-class triage output - our PM scores backlog FEATs but does not produce a "decline because clause X" artifact. Could augment loop:pm for backlog hygiene.
- **YAML DAG with explicit depends_on** - declarative parallelism. Loop expresses sequencing via skill/slash narrative. A DAG would let us run reviewer + validator in parallel where safe. **Marginal value** at current scale; lock-in cost is real.
- **Maintainer-standup mini-app pattern** - committed direction + per-user gitignored profile/state - clean pattern for any tool that needs per-user context. We already approximate this via ~/.claude/projects/.../memory/MEMORY.md; not a gap.
- **archon-workflow-builder** - workflow that authors workflows. We have no self-modifying-skill equivalent; intentional given our content-length caps.

## 6. Gaps in Archon (what loop ships that they lack)

- **No backlog/slice/spec discipline**. No FEAT/SPEC frontmatter, no approved-slices ledger, no phase-gate runner, no triage -> in-progress -> done lifecycle. Backlog = GitHub issues. Our loop: namespace entire backlog-add/triage/promote/grade/decisions stack has no analogue.
- **No grade/retrospective signal aggregation**. Archon has dated standup briefs but no scored grades, no retrospective aggregation, no decisions-list / decisions-supersede chain.
- **No HARD RULE blocks / loop-discipline skill**. PIV is human-gated by design; loop marathon/auto-mode with stop-condition resolver is absent.
- **No role agents** (pm, architect, researcher, document-writer). Archon dispatches single-shot LLM commands inside DAG nodes; no role taxonomy, no agent prompts, no skill resolver.
- **No cost-advisor / cost trajectory tracking**.
- **No content-length / manifest validators**. Engineering-process-on-the-engineering-process is loop-specific.

## 7. Strategic read

**Archon is an adjacent tool, not a direct competitor.** Different abstraction layer:

- **Archon** = self-hosted remote-control runtime for AI coding agents. The .archon/ folder is the dogfooding layer for the Archon product teams own development. Their primitive is "YAML DAG that calls Claude Code with a prompt"; their methodology is PIV + Ralph + direction-as-policy.
- **Loop** = methodology layer that runs *inside* Claude Code on top of crew. Our primitive is "skill + slash command + role agent + backlog FEAT"; our methodology is slice + grade + decisions + HARD RULE + marathon-mode.

They could in principle host loop as one of their workflows; we could in principle dispatch into an Archon DAG. They are **complementary**, not contested.

**Recommendation: monitor + selectively borrow.**

- **Monitor** quarterly. .archon/workflows/defaults/ is where their methodology evolves visibly. Cheap signal.
- **Borrow now (high ROI):**
  1. **Parallel multi-dimensional reviewer** - split our reviewer into 3 narrow dimensions (correctness, test-coverage, conventions) dispatched in parallel, then synthesized. Maps cleanly to existing crew:reviewer infra; would raise our test_confidence and observability grade dims.
  2. **Direction-citation discipline for PM decline path** - when loop:pm rejects a FEAT as out-of-scope, require a direction.md-style clause citation. We already have CLAUDE.md sections - formalize them as citeable clauses.
- **Do not borrow:** YAML DAG runtime (massive rewrite, marginal benefit at our scale), self-modifying workflow builder (clashes with content-length caps), maintainer-standup mini-app (we already have loop-snapshot + MEMORY.md).
- **No threat.** Different audience (Archon = remote-control platform users; loop = Claude Code power users authoring methodology). No naming collision risk.

---

## Sources (all read 2026-06-08)

- Tree root: https://github.com/coleam00/Archon/tree/dev/.archon
- Manifest: https://raw.githubusercontent.com/coleam00/Archon/dev/.archon/config.yaml
- Direction doc: https://raw.githubusercontent.com/coleam00/Archon/dev/.archon/maintainer-standup/direction.md
- Standup README: https://raw.githubusercontent.com/coleam00/Archon/dev/.archon/maintainer-standup/README.md
- Standup command: https://raw.githubusercontent.com/coleam00/Archon/dev/.archon/commands/maintainer-standup.md
- Code-review command: https://raw.githubusercontent.com/coleam00/Archon/dev/.archon/commands/maintainer-review-code-review.md
- Standup workflow YAML: https://raw.githubusercontent.com/coleam00/Archon/dev/.archon/workflows/maintainer/maintainer-standup.yaml
- Feature-dev workflow YAML: https://raw.githubusercontent.com/coleam00/Archon/dev/.archon/workflows/defaults/archon-feature-development.yaml
- PIV-loop workflow YAML: https://raw.githubusercontent.com/coleam00/Archon/dev/.archon/workflows/defaults/archon-piv-loop.yaml
- Commands dir: https://github.com/coleam00/Archon/tree/dev/.archon/commands
- Defaults workflows dir: https://github.com/coleam00/Archon/tree/dev/.archon/workflows/defaults
- Maintainer workflows dir: https://github.com/coleam00/Archon/tree/dev/.archon/workflows/maintainer
- Scripts dir: https://github.com/coleam00/Archon/tree/dev/.archon/scripts