# Prompt: Full Architecture Retrospective — runner-plugin + crew (dev-team) — v2 FINAL

> Paste this prompt into a fresh Claude Code session opened at `C:\work\mega\runner-plugin`.
> Dispatch read-only subagents liberally (`devcrew:researcher`, `devcrew:investigator`,
> `Explore`); budget ~2–4h of agent time.

---

## Role & Mission

You are a principal engineer doing a no-sacred-cows architecture retrospective of two
tightly coupled Claude Code plugins:

- **runner-plugin** (`C:\work\mega\runner-plugin`) — the dev-crew method layer:
  backlog intake/triage, slice ceremony, phase-gate runner, autonomous marathon loop,
  wave mode, GEPA optimization hooks, cost telemetry.
- **crew / dev-team** (`C:\work\mega\dev-team`) — the specialist-agent execution layer:
  builder/reviewer/validator agents, orchestrate-slice, ship, GEPA eval harness,
  workflow-state, artifacts, hooks.

Your deliverable is a **decision-ready report**, not a tour. Every claim must carry
evidence (`file:line` or artifact path). Every recommendation must state effort,
risk, cost/benefit, confidence, and whether it is a **quick win** (one slice) or
**structural** (needs ADR + FEAT decomposition).

## Methodology (apply to EVERY finding)

1. **Observe** — name the symptom precisely.
2. **Gather evidence** — file:line, artifact paths, telemetry numbers.
3. **Hunt contradictions** — actively search for evidence the current design is
   optimal or intentional (ADRs, DEC-* records, docs/upstream-requests, code
   comments). If conflicting evidence exists, present the tradeoff — do not
   assume redesign.
4. **Root cause** — never stop at symptoms; explain WHY the design ended up here.
5. **Alternatives** — at least 2 where structural, with tradeoffs.
6. **Cost estimate** — engineering hours (rough band).
7. **Expected improvement** — quantified where possible: $ cost reduction,
   reliability (pause/retry rate), latency, token/context reduction, maintenance.
8. **Confidence** — High / Medium / Low, plus evidence quality Strong / Moderate /
   Weak. Speculative findings MUST be labeled Low.

## Evaluation Principles (fixed rubric — score against these, not taste)

Single Responsibility · Information Hiding · Stable Dependencies · Explicit
Contracts · DRY · YAGNI · Testability · Operational Simplicity · Observability ·
Local Reasoning.

**Anti-purity guardrail:** Do not recommend architectural purity unless measurable
gains outweigh migration cost. Prefer evolutionary refactoring over greenfield
rewrites whenever practical. An LLM's love of microservices/kernels is not evidence.

## Ground Rules

1. **Read-only.** Output is one report:
   `docs/research/2026-07-02-architecture-retrospective.md` (runner-plugin repo).
2. **Evidence over vibes.** Where docs and code disagree, that disagreement IS a
   finding.
3. **Numbers over adjectives.** Never write "many commands duplicate logic" —
   measure: duplicate prompt blocks, duplicate LOC, duplicate agent definitions,
   shared-utility counts, average prompt size, artifact sizes, dispatch retry/pause
   rates, success rates, per-model cost. Use `.claude/artifacts/loop/` (112+ slice
   grades, cost reports ~$34.5/iteration, auto-dispatch.jsonl, learnings.jsonl,
   retrospectives) and `.claude/artifacts/crew/gepa/trials/*.jsonl`.
4. **Fan out.** One parallel read-only researcher per work package; you synthesize.
5. **Rank ruthlessly.** Report leads with top-10 ordered by (impact ÷ effort).

## Inputs to Read First (main thread, before fan-out)

- `runner-plugin/CLAUDE.md`, `docs/code-conventions.md`, `docs/halt-badges.md`,
  `docs/sop/specialist-pause-handling.md`, `.claude/loop.json`
- `dev-team/CLAUDE.md`, `dev-team/crew-architecture-analysis.md`,
  `dev-team/crew-optimization.md` (prior analyses — do NOT repeat; extend/refute)
- `runner-plugin/src/scripts/lib/plugin-identity.mts` (version coupling contract)
- Latest retrospective under `.claude/artifacts/loop/retrospectives/`

## Work Packages (dispatch one researcher each, parallel)

### WP1 — Greenfield Redesign: "what would we do differently"

Map the real module/dependency graph of both plugins (commands ↔ skills ↔ agents ↔
`src/scripts/lib/*` ↔ hooks ↔ artifacts on disk). Then answer:

- Which responsibilities live in the wrong layer? Known suspects to verify:
  - Orchestration logic embedded in Markdown slash-command prose
    (`commands/*.md`) instead of testable code. Quantify duplicated dispatch
    boilerplate across commands.
  - Two overlapping state stores: crew `workflow-state` vs loop backlog frontmatter
    vs `loop-snapshot.md` — who is source of truth, where do they drift? (Evidence:
    2026-06-10 workflow-state reconcileNote after a session hang.)
  - Duplicate agent rosters: `devcrew:researcher` vs `devcrew:researcher`,
    `devcrew:document-writer` vs `devcrew:document-writer`, `devcrew:architect` vs
    `devcrew:architect`, plus `3rdparty/` vendored agents in BOTH plugins. Measure the
    duplication; sketch a single shared agent registry.
  - Cross-plugin contract surface: `MIN_CREW_VERSION` pinning, `snapshot.*`
    halt-badges (SPEC-003), `docs/upstream-requests/` as ad-hoc RFC process.
    Is runner→crew dependency direction right, or should a shared kernel package
    exist? Apply the anti-purity guardrail before answering yes.
- **Subsystem scorecard**: score each major subsystem 0–10 on Maintainability,
  Coupling, Cohesion, Scalability, Testability, Discoverability, Performance,
  Developer Experience, Operational Complexity, Future Extensibility. Output as a
  table. Subsystems: backlog store, slice ceremony, dispatch layer, state stores,
  agent roster, GEPA harness, telemetry/cost, config, hooks, docs.
- Sketch the from-scratch architecture: layers, ownership, contracts, what dies.
  Concrete: package names, module boundaries, which Markdown becomes code.

### WP2 — Dispatch Reliability & Agent Performance (quick wins focus)

The recurring production failure is **specialist pause without artifact**
(SOP: `docs/sop/specialist-pause-handling.md`; lead mode killed over it,
SLICE-97..104). Investigate:

- Root-cause pattern across auto-dispatch.jsonl + grade lessons + learnings.jsonl:
  which agents pause, on which prompt shapes, at what context sizes? **Compute the
  pause rate and retry rate** — numbers, not anecdotes.
- Audit dispatch prompts (the `dispatchInstruction` templates from
  `/devcrew:slice start`, `commands/slice-review-ladder.md`, `/devcrew:orchestrate-slice`):
  measure length, redundancy, tool budgets, inline-output fallbacks. Propose a
  single shared dispatch-prompt builder with hard budgets (tool-call caps,
  "write artifact FIRST" ordering, structured-output schemas over artifact-file
  handshakes).
- Quick wins to enumerate and cost: structured output (schema) instead of
  file-artifact handoffs; tiered models for mechanical stages
  (`dev-lite`/`inspector-lite` generalized); context-diet for subagents (what do
  builder prompts carry that they never use — measure it); retry-with-fallback
  wrapper at dispatch time instead of SOP-manual recovery.

### WP3 — GEPA & Eval Quality

Read `dev-team` GEPA implementation (optimize/eval/history/invalidate/revert/thaw
skills + `C:\work\mega\gepa-core` if relevant) and trial data at
`.claude/artifacts/crew/gepa/trials/*.jsonl`. Assess:

- Eval validity: what do rubrics actually measure? Reproducibility (same prompt,
  same score)? Sample trial JSONL — **report variance, sample sizes, no-winner
  streaks, budget caps hit as numbers**.
- Metric gaming risk: can a candidate win by verbosity, rubric sycophancy, or
  overfitting the fixed eval set? Held-out set?
- Feedback loop: do the 112 slice grades (real production outcomes) feed GEPA, or
  is eval synthetic-only? Propose wiring: grade dimensions + pause/failure
  telemetry as fitness signal; per-agent eval suites from real failure transcripts;
  minimum-N + confidence intervals before promotion; champion soak metrics that
  auto-revert on production regression.
- Improvements ranked: eval-set curation pipeline, rubric-vs-outcome correlation
  check, pairwise-comparison judging over absolute scoring, seed/temperature
  controls.

### WP4 — Model vs Agent Separation (platform-agnostic agents)

Goal state: agent definitions (role, contract, skills, eval suite) are
**platform-agnostic assets**; the plugin is a thin Claude-Code adapter binding
them to a runtime (tools, dispatch, model selection). Assess distance:

- Inventory Claude-Code coupling inside `agents/*.md`: tool names, dispatch idioms
  (`Agent(subagent_type:...)`), hook assumptions, `${CLAUDE_PLUGIN_ROOT}`, model
  hints. **Count coupled references per agent file.**
- Propose layered agent spec: (a) portable core — role, IO schema, quality bar,
  eval suite, knowledge refs; (b) platform binding — tool mapping, model tier,
  budget; (c) generated artifact — the `.md` Claude Code consumes. Evaluate single
  source (YAML/JSON) → codegen to Claude Markdown, other adapters later. Where does
  GEPA optimize — portable core (good) or generated artifact (lock-in)?
- Model-tier policy as data: explicit capability→tier matrix (mechanical edit =
  small, review = mid, architecture = large) owned by the binding layer.
- Apply anti-purity guardrail: is full abstraction worth it NOW, or is a partial
  step (extract IO contracts only) the right 90-day move?

### WP5 — Performance, Cost & Reusability

- Decompose $34.5/iteration from cost reports + diagnostics (tool-fail rate,
  re-reads, compactions, preamble turns, cache hit%). **Top 3 cost sinks with
  numbers.**
- Reusability audit: how much of `src/scripts/lib/*` (both repos) is copy-adjacent?
  Measure duplicate LOC. Candidates for shared package: frontmatter parsing,
  artifact IO, jsonl stores, dispatch audit, config loading.
- Skill/command sprawl: count skills+commands per plugin, overlap matrix (triage
  vs retriage vs intake; close vs slice-complete vs slice-grade — some consolidated
  per FEAT-277, find the rest). Propose consolidated surface with before/after
  counts.
- Config sprawl: `.claude/loop.json` vs `crew.json` vs `gepa.config.json` vs
  presets — one schema-validated config with namespaces? Cost/benefit it.

### WP6 — Role-Prompt Validation (pm, architect, devs, reviewers)

For each of: `devcrew:pm`, `devcrew:architect`, `devcrew:backend-dev`,
`devcrew:frontend-dev`, `devcrew:fullstack-dev`, `crew:inspector`, `devcrew:verifier`
(and lite variants):

- Score the prompt 0–10 against: single responsibility, explicit output contract,
  good/bad output examples, scope fences, tool budget, failure/fallback
  instruction, length vs 300-line cap. **Report line counts.**
- Cross-check reality: do grade dimensions this agent owns (test_confidence for
  devs, security for inspector) show weakness in last-20 grade averages? Do PM
  `needs-review` escapes and P4-decline citations fire correctly
  (`validate-decline-citations`)?
- Prompt smells: duplicated methodology text belonging in a shared skill; stale
  references; contradictions with CLAUDE.md; missing structured-output schema.
- Output: per-agent verdict table (keep / trim / rewrite) + top 3 concrete diffs
  per rewrite candidate. Route rewrites through WP3's GEPA pipeline where an eval
  suite exists — do not hand-edit optimizable prompts.

### WP7 — "Anything Else" Sweep

- **Testing the methodology itself**: slash-command prose has no tests. Propose
  contract tests (golden dispatch-instruction snapshots, config-parse fixtures).
- **State-corruption recovery**: session hangs corrupted workflow-state once.
  Doctor/fsck for backlog+workflow+artifacts? (memory `doctor` shipped v0.58 —
  does it cover crew state?)
- **Security posture**: hooks execute code; 3rdparty vendored agents are
  unreviewed prompt supply chain; autonomous_safe items run unattended — threat
  model the marathon loop (prompt injection via FEAT bodies / web-research
  artifacts entering PM/architect context).
- **Observability**: end-to-end trace of one slice (dispatch → artifacts → grade
  → cost) queryable in one place?
- **Docs drift**: measure CLAUDE.md claims vs code; propose what moves to
  generated-only.
- Anything higher-leverage you find — flag it.

### WP8 — Future Architecture Vision (18–24 months)

Ignore the current implementation. Design what the system SHOULD look like after
another year of growth, then derive the migration:

- Multi-repository architecture and a shared kernel — what splits, what merges.
- Plugin ecosystem: extensibility API, third-party plugin SDK, governance model
  for community agents/skills.
- Model abstraction layer (builds on WP4) — multi-provider, tier routing, GEPA
  optimizing portable specs.
- MCP integration strategy — what becomes an MCP server vs stays a plugin.
- Cloud vs local split; what an enterprise edition would need (audit, RBAC,
  tenancy, cost governance).
- Migration strategy from today's state — evolutionary path, not big-bang;
  identify the first three irreversible decisions and when they must be made.
- Label everything here Confidence: Low-to-Medium by construction — it's vision,
  not finding. Still cite current-code constraints that shape it.

## Report Format (single file)

1. **Top-10 recommendations** — table: rank, title, quick-win|structural, effort
   (hours band), impact (quantified: $/tokens/reliability/latency), confidence,
   evidence quality, evidence pointer.
2. **Subsystem scorecard** (WP1) — 10 subsystems × 10 dimensions table.
3. **Greenfield sketch** (WP1) + **future vision** (WP8) — Mermaid + prose.
4. **Per-WP findings** — each: `[SEVERITY] claim — evidence — root cause —
   alternatives — fix — hours — expected improvement — confidence`.
5. **ADR drafts** — for EVERY structural recommendation: Context, Decision,
   Alternatives, Consequences, Migration plan, Rollback. Ready to land under
   `docs/adr/`.
6. **Proposed backlog items** — intake-ready FEAT stubs (title + 3-line body +
   priority + autonomous_safe) for every quick win.
7. **90-day roadmap** — Week 1, Week 2, Week 3–4, Month 2, Month 3; critical path,
   parallelizable tracks, dependencies between items.
8. **Explicitly rejected ideas** — considered and why not, including cases where
   contradiction-hunting showed the current design is actually right.

## Definition of Done

- Report at `docs/research/2026-07-02-architecture-retrospective.md`.
- Every top-10 item: file:line/artifact evidence + confidence + quantified impact.
- Subsystem scorecard complete; every structural rec has an ADR draft.
- ≥5 quick-win FEAT stubs intake-ready; 90-day roadmap present.
- Prior analyses cited where agreed, explicitly refuted where not — zero silent
  overlap.
