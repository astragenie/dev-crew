# Competitive Audit — Astra Stack vs otta.build vs COG-second-brain

**Date:** 2026-07-18 · **Method:** 7 parallel read-only researchers (one per subject/surface), central synthesis and scoring by one pass · **Author:** Claude (Fable 5), operator sergey@astragenie.com

---

## 1. Executive summary

**Three most important competitor advantages:**

1. **otta's onboarding and presentation are category-best while ours are broken.** Three copy-paste install commands with inline failure-mode warnings, a setup wizard with a before/after readiness score, a live 10-second gate demo in a throwaway dir, and a full write-summary confirmation before touching disk (`otta-plugin@10756ef5:commands/setup.md:21-346`). Meanwhile our own stranger-facing `ADOPTION.md` instructs commands that no longer exist (`/loop:install`, preset `dotnet-aspire-python`) and dev-team's README states three different skill counts, all wrong (69, 34; actual 71).
2. **otta enforces gates in code; we enforce them in prose.** Their SubagentStop hook exits 2 and literally blocks a builder subagent from reporting "done" past a failing gate (`otta-plugin@10756ef5:hooks/subagent-gate-guard.sh:1-64`). Our equivalent is HARD RULE text that agents are asked to follow — and our measured 66.7% dispatch pause rate shows prose compliance failing in practice.
3. **COG's zero-infrastructure portability and memory-hygiene discipline.** Same knowledge base natively usable from Claude Code, Cursor, Kiro, Gemini CLI and any `AGENTS.md`-reading agent, with a scheduled trust sweep that re-verifies environment-dependent claims and stamps `last_verified` — a drift-detection habit astramem lacks entirely.

**Three most serious Astra gaps:**

1. **The memory feedback loop is built, diagnosed, fixed — and not turned on where it's measured.** runner-plugin's own snapshot shows served=862, used=14 (1.6%). The root cause (voluntary subagent crediting is structurally dead) was diagnosed in `dev-team/docs/contracts/dispatch-memory-credit-loop-v1.md`, the orchestrator-side `creditLoop` fix is merged, tested, and enabled in dev-team's config — but `runner-plugin/.claude/loop.json` has no `creditLoop` key at all. A config flip, not an engineering project.
2. **Positioning vs. measured reality.** "Autonomous loop" vs. 66.7% pause rate; cost reports averaging $1,524 against a $200 configured slice ceiling (unit ambiguity unresolved — see §4.2); "reflective prompt evolution" (GEPA) that by default performs deterministic string mutation unless an undocumented `GEPA_LIVE_GENERATOR=1` env var is set.
3. **Zero marketing surface across the entire stack.** No screenshots, no diagrams, no demo assets, no social proof, no landing page in any Astra repo — for a system whose orchestration depth (23 agents, 71 skills, wave mode, hierarchical dispatch, 14 halt badges) is objectively its strongest asset and completely invisible.

**Strongest defensible Astra advantage:** orchestration depth + incident-driven safety engineering. Nothing in either competitor approaches wave mode, hierarchical worktree dispatch, the reviewer ladder, the architect gate, 14 documented halt badges with observed firings, or 16 CI validators each born from a named production incident. otta's pipeline is a fixed 4-stage single-issue flow with no PM/backlog/architecture layer; COG has no orchestration at all. Also: our GEPA machinery is real (352 green tests, one auditable live promotion) — otta *markets* a "GEPA flywheel" with **zero** implementing code (grep-verified: the only occurrence of its claimed "auto-propose gate rules" behavior is the marketing sentence itself).

**Highest-priority action (next two weeks):** flip `memory.feedback.creditLoop.enabled: true` in runner-plugin + add a memory-config drift check; run a docs truth pass (ADOPTION.md, README test/CLI sections, dev-team skill counts); port otta's SubagentStop gate-guard pattern. All three are S/M effort with measured problems they directly close.

---

## 2. Methodology & baseline

Seven read-only researchers ran in parallel; all scores below were assigned centrally in one synthesis pass against the same anchors (0=absent … 10=category-leading). Researchers collected evidence only. No Astra repo was modified; writes confined to `docs/research/**`. Competitor repos were cloned to session scratch space and not executed.

| Repo | Branch | HEAD | Last commit | Dirty |
|---|---|---|---|---|
| dev-team | `feat/slice-b-wire-lead-to-dispatcher` | `955fb7ad` | 2026-07-16 | 4 (all crew artifacts, no source) |
| runner-plugin | `main` | `4920314a` | 2026-07-17 | 1 (this audit's own prompt file) |
| gepa-core | `feat/plugins-common-monorepo` | `c2bf2773` | 2026-07-04 | 0 |
| astramem-local | `fix/nightly-live-github-script-pin` | `ac64c255` | 2026-07-18 | 3 (artifacts/state, no source) |
| plugins-common | `main` | `2de3e758` | 2026-07-17 | 0 |
| otta-build/plugin (clone) | default | `10756ef5` | 2026-07-15 | — |
| huytieu/COG-second-brain (clone) | default | `dfbf9e9d` | 2026-07-10 | — |

Website access: https://otta.build walked live via Playwright MCP on 2026-07-18 (full DOM walk; no fallback needed). Screenshots saved beside this report (see §9).

**Known limitations:**
- dev-team was audited at a mid-refactor feature branch, not main. Its 117 test failures at this HEAD match a handoff note recording "117→1 fail" as since-fixed — the failure count is likely branch-stale, flagged not concluded.
- The gepa-core checkout is 4 minor versions behind what dev-team actually consumes (0.6.1 on disk vs `@astragenie/gepa-core@0.10.1` installed per `dev-team/package.json:48` + lockfile). Library-currency conclusions come from the installed package + dev-team consumer code, not the stale checkout.
- The $1,524/iteration cost figure's unit is ambiguous (per cost-report artifact, not verified per-loop-iteration — `runner-plugin/src/scripts/lib/memory-snapshot.mts:277`). Not quoted as a per-slice fact anywhere in this report.
- otta.build's dogfood metrics band and COG's usage stats ("120+ braindumps… 95%+ accuracy") are self-reported and externally unverifiable — labeled marketed, Medium/Low confidence.
- One unverifiable citation in COG (arXiv:2605.26112) noted and not relied on.

---

## 3. Scorecard

Scores 0–10; confidence (H)igh / (M)edium / (L)ow. N/A = genuinely outside subject scope, excluded from averages, never zero. GEPA is a **capability module** — dimension scores only, no product aggregate by design.

| Dimension | dev-team | runner-plugin | GEPA (capability) | astramem | otta | COG |
|---|---|---|---|---|---|---|
| 1. Install & onboarding | 5 (H) | 4 (H) | N/A — ships with crew | 6 (M) | **9 (H)** | 7 (M) |
| 2. Docs & README | 6 (H) | 5 (H) | 6 (M) | 6 (H) | 7 (H) | 7 (H) |
| 3. Marketing & promo | 2 (H) | 1 (H) | N/A — internal capability | 1 (H) | **8 (H)** | 7 (M) |
| 4. Orchestration depth | **9 (H)** | **9 (H)** | N/A | N/A — memory service | 5 (H) | 3 (M) |
| 5. Autonomy & safety | 8 (H) | 7 (H) | 8 (H) | 7 (H) | 7 (H) | 4 (M) |
| 6. Memory | 6 (M) | 4 (H) | N/A | 6 (H) | 3 (H) | 4 (H) |
| 7. Prompt/self-optimization | 5 (H) | N/A — delegated to crew | 4 (H) | N/A — not its domain | 1 (H) | 3 (M) |
| 8. Telemetry & observability | 8 (H) | 8 (H) | 5 (H) | 7 (H) | 8 (H) | 1 (H) |
| 9. Developer experience | 6 (H) | 7 (H) | 4 (H) | 6 (H) | 7 (H) | 5 (M) |
| 10. Community & distribution | 3 (M) | 3 (M) | N/A | 2 (M) | 2 (H) | 4 (M) |
| **Applicability-adjusted avg** | **5.8** | **5.3** | *no aggregate* | **5.1** | **5.7** | **4.5** |

The adjusted averages are deliberately NOT the headline. Category fit matters more: otta's 5.7 is presentation-heavy (9/8/8 on install/marketing/telemetry) sitting on a shallow engine (5/3/1 on orchestration/memory/self-optimization); dev-team's 5.8 is the mirror image (9/8/8 on orchestration/safety/telemetry, 2/3 on marketing/community). The strategic read: **they built the storefront first; we built the factory first.** Their storefront is real; our factory is real. Each is missing the other's half.

Key per-cell citations (compact; full evidence in researcher transcripts):
- dev-team install 5: Node 22.6+ AND Bun ≥1.3 dual prerequisite (`dev-team README.md:60,78`); 3-command onboarding split across plugin/global/repo concepts.
- dev-team docs 6: comprehensive 322-line README but skill count wrong 3 ways (README.md:40 "69", :313 "34", actual 71 on-disk `SKILL.md`).
- dev-team orchestration 9: 23 first-party agents, 38 commands, 71 skills, model-tier routing table (README.md:249-257), parallel review, `/crew:parallel` worktrees.
- dev-team safety 8: dispatch-size gate citing "8 agent deaths, every one from an oversized dispatch" (`hooks/pre-tool-use-dispatch-size.ts:8-11`), staged warn→block rollout, ship prod-approval gate (`commands/ship.md:9,149`).
- dev-team DX 6: rich script surface but 117 fail / 116 error at audited HEAD (directly executed `bun test`; likely branch-stale, unverified vs main).
- runner install 4: `commands/install.md` accurate but `ADOPTION.md:1-161` instructs nonexistent `/loop:install` + deleted preset — the onboarding doc fails its purpose.
- runner docs 5: `docs/halt-badges.md` (391 lines) excellent; README test section flatly false ("22 tests… `node --test`" vs ~300 Bun test files).
- runner orchestration 9: wave mode (README.md:202-230), `runner:swarm` depth-capped hierarchical dispatch with per-run trace artifacts (README.md:150-200), config-driven reviewer ladder.
- runner safety 7: 14 documented halt badges with observed firing (`.claude/state/loop/redundantReadStop`, 2026-07-16); but self-loosened thresholds ($200 vs $75 default ceiling; 6× vs 3× regression) and 66.7% measured pause rate.
- runner memory 4: served=862/used=14 (1.6%, measured); `creditLoop` absent from `.claude/loop.json` while dev-team's is enabled.
- runner telemetry 8: CI-gated snapshot freshness (`validate-snapshot-freshness.mts`), real per-dispatch pause metric (`pause-telemetry.mts:152`), 217-entry dispatch audit trail.
- GEPA self-opt 4: default candidate generation is synthetic string mutation (`dev-team/scripts/lib/gepa/candidate-generator-aiplugin.ts:16-19`); real LLM reflection only behind `GEPA_LIVE_GENERATOR=1` (:679); one live promotion ever (aiplugin-dev 1.2.3→1.2.4, CHANGELOG.md:596-609 + trial artifact `09fe64b5`); provenance writer broken (zero `gepa:` frontmatter blocks repo-wide); single-generation hill-climb, not multi-generation genetic-Pareto.
- GEPA safety 8: budget caps, file locking, no-winner-streak halt, critical-agent draft-PR gate — 352 tests green (directly executed).
- astramem memory 6: hybrid FTS5+sqlite-vec 8-term fusion (`src/search/fuse.ts:1-25`), usefulness live in ranking at ε=0.1 (`src/config/config.ts:1194`), propose-only reversible consolidation, bitemporal entity graph — implementation ~9; demonstrated usefulness ~2 (1.6% adoption); blended 6 per the built-vs-used rule.
- astramem safety 7: encrypted-at-rest default with verified plaintext migration (README.md:378-394), loud-fail on missing native prebuilt.
- otta install 9: 3 commands + point-of-failure inline warnings (observed live); wizard readiness score 0/8 → N/8, temp-dir gate demo, write-summary confirmation (`commands/setup.md:21-346`).
- otta marketing 8: animated hero pipeline with `$0.01 · 3s · LIVE` badge, 90-day dogfood DORA band (457 PRs, 7-min median cycle), 4-pillar architecture story, comparison table with hedge footnote (all observed live 2026-07-18; screenshots §9).
- otta self-opt 1: "GEPA flywheel… auto-proposes new gate rules" appears ONLY as a marketing sentence; grep across scripts/commands/skills finds no implementing code — implemented reality is ledger-append + read-LEARNINGS.md.
- otta orchestration 5: typed per-stage JSON schemas (`workflows/otta-build.mjs:27-52`) and bounded repair loop are genuinely good; but fixed 4-stage single-issue scope, no PM/backlog/architect layer, one reviewer.
- otta community 2: 0 stars/0 forks/0 watchers; one human maintainer under two aliases (same GitHub noreply id) plus bots; all pricing tiers waitlist-gated including Free.
- COG memory 4: recall = agent greps vault (`scout/SKILL.md:66-73`), no index/ranking/feedback; but portable, human-editable, disciplined consolidation with enforced source-links.
- COG telemetry 1: zero code, zero measurement; sole automation is a packaging-drift shell validator.

---

## 4. Per-subject analysis

### 4.1 dev-team (crew)

**Strengths.** Deepest orchestration surface in this audit by a wide margin (23 agents / 38 commands / 71 skills / 65k LOC, tiered model routing). Safety engineering is incident-driven and staged: the dispatch-size gate's code cites the concrete failure history that motivated it and ships warn-first with a promotion plan. Real observability investment (OTel hooks, Langfuse compose, `evals/` harness with LLM-judge gate). Self-disclosing CHANGELOG culture — v0.66.0 names its own memory-recall gap and the upstream blockers rather than hiding them.

**Gaps.** README self-contradicts on skill count (69/34/actual-71) — a stale-docs smell in the flagship doc. Test suite fails at the audited HEAD (117 fail/116 error, largely `node:test`-nested-in-`bun:test` API misuse) — likely fixed on main per handoff notes, but unverified here. Dual-runtime prerequisite (Node + Bun) and a 3-command, 2-concept onboarding path with no single entry point. Zero visual assets for the most diagram-worthy system in this audit.

**What otta does better:** onboarding wizard, hook-level gate enforcement, marketing presentation. **What crew does better:** everything below the presentation layer — breadth, model routing, review parallelism, eval infrastructure, safety telemetry.

### 4.2 runner-plugin (loop)

**Strengths.** `docs/halt-badges.md` is the best single safety document in this audit — 14 badges, each with fire condition, threshold, remedy, source, origin citation, and an add-a-badge checklist. Halt machinery demonstrably fires (redundantReadStop record dated 2026-07-16). Snapshot freshness is CI-enforced — telemetry that cannot silently rot. Wave mode + swarm dispatch are implemented with tests, not aspirational.

**Gaps.** (a) `ADOPTION.md` would actively fail a new adopter — dead commands, dead preset, dead paths. (b) The flagship word "autonomous" is contradicted by its own measurement: 66.7% of the last 15 dispatches paused. (c) Operational hygiene lags its own telemetry: 4 stale open dispatch runIds (oldest 33 days) with the system printing its own unheeded prune hint. (d) Cost figure ambiguity: $1,524 average per cost-report vs a $200 configured ceiling — either the unit is coarser than a slice (wave/session bundling) or the ceiling isn't binding; must be resolved before any cost number is published. (e) The repo whose snapshot records the 1.6% memory-usefulness number is the repo that hasn't enabled the shipped fix.

**Repo-hygiene note:** the `otta-landing.png` some may spot in repo root during this period was this audit's own Playwright screenshot mid-move (tool saves to CWD; since relocated to `docs/research/`). `tools/demo-seed/` remains unexplained-in-repo and worth a separate look.

### 4.3 GEPA (capability — no product aggregate)

**Verdict: integrated-but-diverged.** dev-team genuinely consumes `@astragenie/gepa-core@0.10.1` via 21 importing files — not vendored, not orphaned. But the local gepa-core checkout is 0.6.1, four minor versions stale (0.7.0–0.10.1 exist only as tags), and dev-team's own code carries a stale comment about 0.6.0's API gaps. Anyone auditing the checkout audits history.

**What's real:** Pareto strict-dominance ranking, budget metering, file locking, no-winner-streak halting, critical-agent draft-PR gating — 352 dev-team-side tests pass (directly executed), 27 gepa-core test files. One fully auditable live optimization: Groq LLM judge, winner trial `c948e52c`, aiplugin-dev promoted 1.2.3→1.2.4.

**What's not:** the *default* path. Without `GEPA_LIVE_GENERATOR=1`, candidates are deterministic string mutations of the champion — no reflection, no LLM. The provenance writer that should stamp promotions onto agent files fails validation; zero agents carry a `gepa:` block; the one real promotion is tracked in CHANGELOG prose. And the algorithm is single-generation champion hill-climbing, not the multi-generation genetic-Pareto search of the GEPA literature. The evidence base for "GEPA improves agents" is one narrow safety-eval win, not general capability gains.

### 4.4 astramem

**Strengths.** The most architecturally disciplined subject in the audit: policy/search/ranking/feedback each a separate module citing its motivating ADR; incidents documented in-place with dates and root cause (issue #190's canary bug); layered client seam (typed throwing client + opt-in fail-silent wrapper); encrypted SQLite by default with verified migration; bitemporal entity queries with explicit cloud-parity divergence notes; 343 vitest files across 12 CI workflows.

**Gaps.** (a) **The 1.6% usefulness rate is a rollout failure, not a design failure** — mechanism fully wired (ε=0.1 live in ranking), fix (`creditLoop`) merged and enabled in dev-team, absent in runner-plugin. (b) `usefulness.ts`'s header still claims feedback "does NOT feed ranking yet" — false vs. shipped config; a reader trusting it materially misunderstands the system. (c) The usefulness metric has a gameable history (854 self-consolidation corrections once impersonated a live loop) and still can't split outcome-backstop auto-credit from genuine crediting on the positive side. (d) Per-consumer opt-in config means fixes don't propagate — no CI guard flags a consumer on a stale memory-config shape, the exact failure that produced the headline number. (e) Entity-graph test depth thin (4 of 343 files).

**vs COG:** astramem wins on everything algorithmic (real retrieval, ranking, feedback, typed API, audit/history/erasure, encryption, tests). COG wins on portability, zero-failure-surface, human-editability, and hygiene rituals astramem never scheduled.

### 4.5 otta

**Read this subject as a warning shot, not a current threat.** Direct positional competitor: same pitch ("self-learning software factory"), same gate philosophy, even the same optimizer brand name (GEPA). One human maintainer (two aliases sharing a GitHub noreply id + bots), ~3.5 weeks old, 69 tags, 0 stars.

**Genuinely better than us:** onboarding (9/10 — the best flow in this audit end to end), presentation (animated hero pipeline demo, dogfood DORA metrics band as social-proof substitute, honest comparison table with hedge), hook-level hard enforcement (SubagentStop exit-2 gate block), repair-signature dedup, exact-SHA deploy-run correlation, dual-harness (Claude Code + Codex) parity, unusually transparent telemetry privacy disclosure.

**Shallower than us everywhere else:** fixed 4-stage single-issue pipeline; no PM, no backlog, no architecture gate, no multi-reviewer, no independent validator; memory is a flat ledger + one markdown file (explicitly "not a brain"); cost telemetry is visibility-only with no governance; CI is one thin test-loop job; **and the "GEPA" self-learning claim — their #4 architecture pillar, "35× fewer rollouts than RL" — has zero implementing code.** Their marketing writes checks their engine can't cash; ours is the reverse.

**Site defects observed live:** JS console error on every page load; all pricing tiers (including Free) waitlist-gated; one blog post; blank-section rendering in full-page capture (likely scroll-animation artifact).

### 4.6 COG-second-brain

A prompt-pack, not a memory system: 95 files of markdown skills + an Obsidian-style git vault; no daemon, DB, embeddings, or retrieval code. Recall is "the agent greps the vault" — will not scale. Zero tests, zero CI, single maintainer. But it packages judgment well: consolidation with mechanically enforced source-links ("a principle with no `[[source]]` is dropped"), scheduled memory-hygiene re-verification, tiered entity enrichment, mutation post-condition rule, multi-runtime portability, and README marketing (Mermaid diagram, FAQ, star-history, "$4.63 once → $0.11/run" distillation claim) far better than ours. Its best ideas are disciplines, and disciplines are cheap to steal.

---

## 5. Head-to-head

### astramem vs COG-second-brain

| Axis | astramem | COG | Winner |
|---|---|---|---|
| Feature breadth | recall/search/feedback/consolidation/entities/erasure/health | capture + prose-driven read-back + hygiene skills | astramem |
| Implementation depth | hybrid FTS5+vec, 8-term fusion, encrypted SQLite, 343 tests | no retrieval code at all | astramem, decisively |
| Usability/portability | Claude-MCP only, daemon + env wiring across 3 repos | any markdown-reading agent, zero infra | COG |
| Evidence of adoption | 1.6% usefulness where measured (rollout gap) | self-reported "120+ braindumps" (unverified) | neither proven |
| Positioning & packaging | none | strong README, marketplace listings, lineage branding | COG |

Verdict: astramem is the better system; COG is the better *product package*. Its portable ideas are discipline patterns (hygiene sweep, mutation post-condition, Compiled-Truth/Timeline), not features — evaluated and excluded from the adoption list per operator review (2026-07-18): prompt patterns we would rebuild from scratch, with only the hygiene sweep carrying clear product impact, revisitable if memory-drift pain grows.

### crew + loop + GEPA vs otta

| Axis | Astra stack | otta | Winner |
|---|---|---|---|
| Feature breadth | PM/triage/arch-gate/waves/swarm/ladder/ship + GEPA + memory | 4-stage pipeline on one issue | Astra, decisively |
| Implementation depth | deep, tested, incident-hardened; some defaults stubbed (GEPA) | thin but honest core; typed workflow schemas notable | Astra |
| Usability/onboarding | broken stranger docs, 3-command/2-concept install | best-in-audit wizard + inline failure defusal | otta, decisively |
| Evidence of adoption | own telemetry shows friction (66.7% pause, 1.6% memory use) | own dogfood metrics band (unverified), 0 external users | neither external; Astra at least measures honestly |
| Positioning & distribution | invisible | polished site, pricing, blog, demo — solo founder | otta, decisively |
| Self-optimization claim vs reality | real machinery, default-stubbed, 1 proven win | pure marketing, zero code | Astra |

Verdict: otta at 3.5 weeks old built the storefront we haven't built in 3.5 months; we built the factory they're pretending to have. The risk is not otta today (0 users) — it's that their packaging playbook applied to *anyone's* real engine (including a future otta) closes the gap fast. The playbook is fully steal-able; §6 does so.

---

## 6. Prioritized adoption list (top 7 — all from otta)

| # | Item | Source (evidence) | Verdict | Fit | Lands in | Effort | Impact | Risk |
|---|---|---|---|---|---|---|---|---|
| 1 | **SubagentStop gate-guard hook** — subagent cannot report done past a red gate (exit 2 blocks) | otta-plugin@10756ef5:hooks/subagent-gate-guard.sh:1-64 | Adapt | Directly attacks our measured 66.7% pause / specialist-pause SOP class: enforcement replaces prose HARD RULEs | dev-team (hooks/), loop consumes | M | High | Low — fail-open on hook error, mirrors our existing hook philosophy |
| 2 | **Repair-signature dedup** — stop bounded retry loops early when the same failure signature repeats | otta-plugin@10756ef5:workflows/repair-policy.mjs:1-24 | Adapt | We have several bounded loops (reviewer fix-loop, arch-gate 2-attempt, pr-fix circuit breaker) that burn full budgets on repeated identical failures | dev-team + runner-plugin | S | Med-High | Low |
| 3 | **Install wizard UX: readiness score + throwaway-dir live demo + write-summary confirmation** | otta-plugin@10756ef5:commands/setup.md:21-346 (observed live too) | Adapt | `/runner:install` and `/crew:init` write many files with no preview and no "it works" moment | runner-plugin + dev-team | M | High (first-impression conversion) | Low |
| 4 | **Docs truth pass + inline failure-mode install copy** — fix ADOPTION.md, README test/CLI sections, skill counts; add otta-style "these are three separate commands" warnings at point of failure | otta.build live (2026-07-18, otta-install.png); our defects: ADOPTION.md:1-161, dev-team README.md:40/313 | Copy the pattern | Our onboarding docs actively fail strangers today | both repos | S | High | None |
| 5 | **Dogfood metrics band as social proof** — publish our own 90-day delivery record (grades, slices closed, halt-badge saves, DORA when watcher lands) | otta.build landing (otta-landing.png): "457 merged PRs · 7 min median PR cycle" | Adapt | We already collect richer telemetry than otta shows; DORA two-track plan already approved (2026-07-07) | runner-plugin README + future landing | M | High | Med — numbers must survive the §4.2 cost-unit fix first |
| 6 | **Animated pipeline demo asset** — scripted terminal showing a real slice run with live cost/latency badge; embed in README (GIF) now, landing page later | otta.build hero (otta-demo.png): `$0.01 · 3s · LIVE` | Adapt | Our zero-visuals gap; wave/swarm runs are genuinely more impressive than otta's fake demo — we can record a real one | runner-plugin + dev-team READMEs | M | High | Low |
| 7 | **Honest comparison table with hedge footnote + README-as-docs consolidation** | otta.build landing ("Comparison reflects publicly documented positioning…"); otta README structure | Adapt | We have real differentiation to state (real GEPA vs claimed; 14 halt badges vs none) and no page stating it | runner-plugin README/landing | S-M | Med | Low — keep the hedge, avoid takedown tone |

**Explicitly rejected from stealing:**
- **Waitlist-gating everything (otta)** — their weakest conversion move; our plugin is installable today, keep it self-serve.
- **COG's grep-as-recall architecture** — regression vs astramem; portability is the interesting part, not the retrieval model.
- **COG discipline patterns (memory-hygiene sweep, mutation post-condition rule, Compiled-Truth/Timeline entity pattern)** — dropped per operator review 2026-07-18: prompt patterns, not features; would be built from scratch anyway. Hygiene sweep is the only one with clear product impact — revisit if memory-drift pain grows.
- **otta's claim-first marketing ("GEPA flywheel" with no code)** — the single clearest lesson in this audit is to *never* let our copy outrun our defaults; we already have the inverse problem and should fix positioning by shipping honest numbers, not by matching their vapor.

---

## 7. FEAT drafts (operator review — NOT filed to backlog)

### FEAT draft A — Enable memory creditLoop in runner-plugin + config-drift guard
- **Target repo:** runner-plugin
- **Problem:** Memory usefulness is 1.6% (served=862/used=14) in this repo's own snapshot. Root cause diagnosed (voluntary subagent crediting structurally dead, ~0.7% measured in `dev-team/docs/contracts/dispatch-memory-credit-loop-v1.md:14-22`); orchestrator-side fix merged and enabled in dev-team; runner-plugin's `.claude/loop.json` lacks the `creditLoop` key entirely.
- **Value:** The ε-usefulness ranking term starts learning from real signal; the flagship memory metric stops indicting the product.
- **Scope:** (1) Add `memory.feedback.creditLoop.enabled: true` (+ bounded ids/call config) to `.claude/loop.json`; (2) add a CI/doctor check that flags a consumer repo whose memory-feedback config shape is behind the current contract version (mirror of `validate-marketplace-sync` for config); (3) split outcome-backstop credits from explicit credits in the usefulness telemetry so the rate is interpretable.
- **AC:** Given a slice-build dispatch that reports `memories_used`, When the orchestrator receives the handoff, Then `submit_feedback` fires for those ids and `recall_used(signal='explicit')` events appear in the daemon. Given a consumer repo missing `creditLoop` config, When CI runs, Then the drift check warns with the contract doc link. 7-day usefulness rate reported with backstop/explicit split.
- **Exclusions:** daemon-side changes (upstream); heuristic implicit-positive pass enablement.
- **Evidence:** astramem researcher report; `runner-plugin/.claude/loop.json` (key absent); `astramem-local src/storage/usefulness.ts:161-197`, `src/config/config.ts:1194`.

### FEAT draft B — SubagentStop gate-guard hook (port of otta pattern)
- **Target repo:** dev-team (consumed by loop)
- **Problem:** Gate compliance is prose (HARD RULE blocks); measured 66.7% dispatch pause rate and the recurring specialist-pause SOP show prose failing. otta enforces the same contract in a hook: SubagentStop exits 2 when a builder reports done past a failing gate.
- **Value:** A builder physically cannot mark work complete with a red gate; converts our strongest convention into an enforced invariant.
- **Scope:** New SubagentStop hook that (1) detects a completing implementation subagent, (2) evaluates the slice's gate state (review badge / phase-gate result / validation artifact per existing contracts), (3) blocks completion with a structured reason on red, fail-open on any hook error (matches dispatch-size-gate philosophy, staged warn→block rollout).
- **AC:** Given a builder subagent finishing with a failing phase-gate artifact, When SubagentStop fires, Then completion is blocked with the gate's reason echoed. Given hook internal error, Then completion proceeds (fail-open) with a warn log. Warn-only mode config flag for the bake-in period.
- **Exclusions:** reviewer/validator subagents (phase 2); changing gate definitions themselves.
- **Evidence:** otta-plugin@10756ef5:hooks/subagent-gate-guard.sh:1-64; pause-rate: runner-plugin loop-snapshot + `pause-telemetry.mts:152`.

### FEAT draft C — Onboarding truth pass + install wizard UX
- **Target repo:** runner-plugin (primary), dev-team (counts fix)
- **Problem:** ADOPTION.md instructs nonexistent commands/presets; README test/CLI sections are false; dev-team README states three different skill counts. Meanwhile the competitor's install flow defuses failure modes inline and proves itself with a live demo.
- **Value:** A stranger succeeds in 10 minutes; first-impression parity with otta.
- **Scope:** (1) Rewrite ADOPTION.md against the current `/runner:install` reality; (2) fix README stale sections (tests, CLI entry, presets) in runner-plugin and skill/agent counts in dev-team (make counts CI-derived, not hand-written); (3) add readiness-report (checks before/after) + file-write summary confirmation to `/runner:install`; (4) inline failure-mode copy on install commands ("three separate commands…").
- **AC:** Given a fresh clone + docs-only knowledge, When a new operator follows ADOPTION.md, Then every command exists and completes. Given `/runner:install` runs, Then it prints a before/after readiness summary and a file-write list requiring confirmation. CI check fails when README counts drift from disk.
- **Exclusions:** landing page / demo GIF (draft D).
- **Evidence:** runner researcher (ADOPTION.md:1-161, README.md:135,234-239); dev-team researcher (README.md:40/313 vs 71 on disk); otta-plugin@10756ef5:commands/setup.md:21-346.

### FEAT draft D — Public proof surface: demo recording + dogfood metrics band
- **Target repo:** runner-plugin (README first; landing page later)
- **Problem:** Zero visual/marketing assets across the stack; deepest capabilities invisible. Competitor with 0 users looks more credible via an animated fake demo + self-reported delivery metrics.
- **Value:** The factory becomes visible; our metrics are real where theirs are staged.
- **Scope:** (1) Record a real wave-mode or slice-ceremony run as a terminal GIF/asciinema with cost/latency overlay; (2) add a "last 90 days" metrics band to README sourced from existing grade/telemetry artifacts (slices closed, grade averages, halt-badge saves; DORA once watcher lands); (3) comparison table (us vs generic agent platforms) with hedge footnote.
- **AC:** README shows a real recorded run (asset checked in or linked); metrics band regenerates from artifacts via script (CI-checked freshness like the snapshot); every number in the band traces to an artifact.
- **Exclusions:** paid site, pricing page, hosted anything. **Dependency:** resolve the cost-unit ambiguity (§4.2) before publishing any cost figure.
- **Evidence:** otta.build landing (otta-landing.png, otta-demo.png); runner researcher marketing findings.

---

## 8. Evidence appendix

**Source inventory:** 5 local repos (baselines §2), 2 cloned competitor repos (SHAs §2), 1 live site walk. Researcher-executed commands of note: `bun test tests/` in dev-team (117 fail observed), `bun test tests/gepa/` (352 pass observed), greps for otta "propose" claim (1 hit, marketing sentence only), `git shortlog`/alias analysis on otta-plugin, on-disk `SKILL.md` counts.

**Website pages visited (2026-07-18):** otta.build/ (+ #get-started, #pricing anchors — single-page site), otta.build/blog, github.com/otta-build/plugin README.

**Screenshot index** (this directory):
- `otta-landing.png` — full landing scroll (blank gaps = scroll-animation capture artifact, noted)
- `otta-demo.png` — hero + simulated live pipeline terminal
- `otta-install.png` — "Two ways in" install section, 3-command block
- `otta-pricing.png` — Free/Plus/Pro cards, all waitlist-gated
- `otta-docs.png` — GitHub README top

**Unresolved questions:** (1) $1,524 cost-report unit (per-slice vs per-wave/session) — blocking any public cost claim; (2) dev-team test-failure count on main vs audited branch; (3) share of the 14 "used" events attributable to outcome-backstop vs genuine crediting; (4) `tools/demo-seed/` provenance in runner-plugin root; (5) COG's arXiv:2605.26112 citation and both competitors' self-reported usage stats — unverified.

**Claims not verified:** otta dogfood metrics band; COG "120+ braindumps / 95%+ accuracy" and "$4.63→$0.11" distillation economics; astramem live daemon telemetry (figures taken from loop-snapshot, not queried live).
