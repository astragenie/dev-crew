# Self-prompt: produce the devcrew merge plan

> Paste this prompt into a fresh session (repo: runner-plugin or a planning worktree).
> It assumes the 2026-08-18 structure audit (this file's parent run) as input.

---

## PROMPT

You are planning the consolidation of two Claude Code plugins into one plugin named **devcrew**:

- **crew** (repo `C:\work\mega\dev-team`, id `crew`, v0.66.0 local / v0.67.0 marketplace) — dispatcher-guided engineering workflow: 34+4 commands, 23+9 agents, 71 skills (4 tiers), 22 hooks, ~34 script entries + 62 lib modules, 212 Bun/Node tests, GEPA eval harness (`evals/`, `gepa.config.json`), Langfuse + OTel observability. Runtime: Bun primary (no `--parallel`, scheduler-bug workaround) with Node 22.6 `--experimental-strip-types` fallback (ADR-002).
- **runner** (repo `C:\work\mega\runner-plugin`, marketplace name `loop`, id `runner`, v0.78.0) — Wiggin Loop autonomous layer on top of crew: 20 commands, 6+5 agents, 12 skills, 7 hooks, ~178 lib modules under `src/scripts/lib/` (+7 subdirs), 331 Bun tests (`--parallel`), 18-19 CI gates, AstraRunner webhook telemetry. Runtime: Bun-only, `.mts` sources, biome.

Known coupling (verified 2026-08-18):
- runner→crew HARD: `src/scripts/lib/plugin-identity.mts` (`MIN_CREW_VERSION = "0.57.0"`, `findCrewCli()` resolving crew CLI from the plugin cache, `CREW_MARKETPLACE_NAME` env override); `src/scripts/lib/slice-linker/crew-bridge.mts` (725-line `execFile` bridge for cost-report/cost-advise/write-run-brief); `crew-workflow-reader.mts`, `crew-bundle-parser.mts`, `review-gate.mts`, `artifact-verdict.mts`, `specialist-pause-detector.mts` all interpret crew-authored artifacts; 122 src files reference crew; 7 commands + 5 agents + `skills/workflow/using-crew` reference `crew:*` dispatch tokens.
- crew→runner SOFT: reads `.claude/loop.json` as shared contract (11+ files); names runner-plugin explicitly in `commands/{build,fix,orchestrate-slice}.md`, `agents/{qa-expert,test-automator,document-writer}.md`, `skills/workflow/validator-gate`; `scripts/e2e-smoke.ts` drives sibling `../runner-plugin` with graceful SKIP. Crew works standalone; runner does not.
- Historical seam pain: crew agent renames silently phantom runner dispatch tokens (crew:inspector→crew:reviewer, FEAT-240); `MIN_CREW_VERSION` floor raised 3× (0.47→0.48→0.57); 12 open files in `docs/upstream-requests/`; orchestrator `lead` mode removed (v0.43) over an upstream pause bug; `validate-marketplace-sync.mts` exists solely to catch cross-repo version drift; plugins-common shared-registry proposal (DEC filed 2026-07-08) to stop rename phantoming.

Overlap requiring dedupe: agents `document-writer`, `researcher` exist in both; skills `universal/{writing-claude-md,writing-task-handoffs}`, `workflow/{review-gates,systematic-debugging?}`, `domain/{prompt-engineering,security-advisory}`, `meta/skill-creator` duplicated; scripts `validate-org-refs`, `validate-agent-refs`, `validate-manifests`, worktree-manager, slice-linker concepts duplicated; both have `cost-setup` and `install` commands.

Hard constraints:
1. Machine-read contracts must survive: runner's CLAUDE.md clause registry (`clause-registry.mts`), CI-gate count parser (`generate-metrics-band.mts`), agent-ref sweep, `<!-- runner:start/end -->` installer marker blocks in EVERY adopter repo.
2. Adopter repos have installed HARD RULE blocks referencing `/runner:*` and `crew:*` tokens — namespace changes break installed repos until re-install.
3. Marketplace `astra` currently registers `loop` and `crew` separately; existing installs must have a deprecation/migration path.
4. Both repos dogfood themselves (`.claude/` state, backlogs 196+ done FEATs, GEPA trial state, grades) — history and state must not be lost.
5. Baseline commit discipline: no commits without explicit approval; production/marketplace promotion always needs explicit user approval.

Produce a plan document with these sections:
1. **Target architecture** — devcrew repo layout (monorepo dirs), single plugin manifest, namespace decision (`/devcrew:*` vs keeping `/crew:*` + `/runner:*` as command names inside one plugin — evaluate both; note Claude Code allows one namespace per plugin), agent naming map (old→new, full table), skill/hook dedupe map.
2. **Runtime unification** — Bun-only vs Bun+Node fallback; test-runner strategy (runner needs `--parallel`, crew can't use it — decide shard vs split suites); tsconfig/biome harmonization; `.mts` vs `.ts` convention.
3. **Seam elimination inventory** — every `execFile` crew-CLI call in crew-bridge.mts replaced by direct import; `findCrewCli`/`MIN_CREW_VERSION` deletion; `.claude/loop.json` + crew config merge into one config schema; artifact dir unification (`.claude/artifacts/{crew,loop}/` → `.claude/artifacts/devcrew/`? or keep both for adopter compat).
4. **Migration path** — phased: (P0) monorepo import preserving both git histories (git subtree/filter-repo), two plugins still shipped; (P1) shared internal packages, dedupe validators/skills/agents; (P2) single devcrew manifest + alias/compat shims for old command names; (P3) adopter migration tooling (`/devcrew:install --migrate-from loop+crew` rewrites marker blocks), marketplace deprecation entries; (P4) remove shims. Each phase independently shippable + rollback story.
5. **CI harmonization** — merge ~19 runner gates + ~20 crew validate scripts into one numbered gate list; keep metrics-band contract or retire it deliberately.
6. **Risk register** — per risk: likelihood, blast radius, mitigation, tripwire. Must include: adopter breakage, context bloat from 50+ commands / 40+ agents in one plugin surface (evaluate lazy/deferred loading or install profiles `--profile crew-only|full`), GEPA state portability, release-train coupling (crew hotfix now forces devcrew release), loss of crew-standalone tier.
7. **Go/no-go gates** — measurable criteria per phase before proceeding.
8. **Effort estimate** — per phase, in slices sized for the existing wave machinery.

Non-goals: do not write code; do not commit; plan artifact only. Deliver plan to `.claude/artifacts/crew/runs/` and file FEATs for phase 0 via `/runner:intake` only after user approves the plan.
