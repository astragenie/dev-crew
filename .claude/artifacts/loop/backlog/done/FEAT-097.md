---
id: FEAT-097
status: done
closed: 2026-07-02
close_note: "AC list rewritten 2026-07-02 by inline defect review. Original ACs referenced non-existent `bun ... validate` subcommand and non-existent `model-routing.mts` file. Bigger finding: FEAT premise was architecturally wrong — Claude Code harness picks agent model via `model:` field in agent frontmatter (see agents/pm.md model: opus), NOT via plugin resolveModel(). MODEL_PHASES / resolveModel is used only by resolveArchitectModels for the two-model split in slice-start; no dispatch site consumes it for retrieval-shaped agents. Shipped as one-liners: model: haiku added to agents/researcher.md + agents/market-researcher.md. Immediate ~10x cost drop on retrieval-phase dispatches. resolveModel/MODEL_PHASES extension deferred as YAGNI — no caller."
priority: P2
category: competitor-gap
target_release: null
created: 2026-06-08
updated: 2026-07-02
depends_on: []
slices: []
derived_from: null
composite_score: 0.527
source_competitors: [Devin / SWE-Agent]
autonomous_safe: true
tags: [model-routing, cost-optimization]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.40
pm_effort_estimate: 0.55
pm_strategic_alignment: 0.55
pm_technical_risk: 0.45
pm_dependency_depth: 0.20
ac_clarity_rewrite: true
ac_clarity_rewrite_dispatch_ok: true
triage_notes: "Re-scored 2026-06-13 post AC rewrite (loop:spec-writer). PRIOR claim 'near-exact duplicate of FEAT-125' is INVALID — FEAT-125 does not exist anywhere in pending/triaged/in-progress/done. No real overlap detected (FEAT-179 retrieval is learnings-ledger, not model routing). Rewritten AC define a concrete modelRouting.retrieval phase + allowlist validation + back-compat — testable with concrete values (claude-haiku-4-5, claude-nonexistent-9, ≥60% HumanEval). Effort analog: SLICE-37 ($74.62 / 78min) added modelRouting greenfield; this extends it — slightly smaller. BUT: AC-001/AC-003 reference 'bun src/scripts/loop.mts validate' which does NOT exist (CLI returns 'Unknown command'); AC-005 pins src/scripts/lib/model-routing.mts but current file is model-router.mts. Builder will hit two infrastructure gaps. Weak grade dim (observability 0.82) — AC don't add observability for new code path. autonomous_safe=false: AC-005 asks builder to pick HumanEval threshold + cite benchmarks — judgment call needing human input. Pre-mortem risks captured below."
github_issue: 175
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/175"
---
# FEAT-097: Role-specialized model family (purpose-built review and retrieval models)

## Source

Competitor gap audit (2026-05-28). Surfaced by:
- Devin / SWE-Agent

## Description

Devin ships SWE-Check (review model matching Opus 4.6 at ~10x speed) and SWE-grep/mini (parallel retrieval specialist) as distinct models per role. loop model-router does phase-based routing but assigns general-purpose models. A purpose-built fast review model would reduce cost and latency at the review gate.

## PM Scoring

### 2026-06-08 (original — preserved for audit)

```json
{
  "featureId": "FEAT-097",
  "scores": {
    "customer_impact": 0.25,
    "effort_estimate": 0.60,
    "strategic_alignment": 0.45,
    "technical_risk": 0.65,
    "dependency_depth": 0.20
  },
  "compositePriority": "P3",
  "autonomousSafe": false,
  "demandEvidence": "none — inferred from Devin audit. SWE-Check and SWE-grep are proprietary Cognition models, not available to third-party plugins.",
  "scopeNotes": "Near-exact duplicate of FEAT-125. The actionable subset: update loop.json modelRouting to use haiku or a faster model for retrieval-only passes when that capability becomes available. Building purpose-built models is out of scope.",
  "risks": [
    "Near-exact duplicate of FEAT-125",
    "SWE-Check and SWE-grep are proprietary — cannot be adopted",
    "Smaller/faster models for review may have lower accuracy — needs benchmarking",
    "Dependent on Anthropic model API availability"
  ],
  "reasoning": "P3: proprietary models not adoptable; actionable subset (routing update) is low-impact config change."
}
```

### 2026-06-13 (re-scored post AC rewrite)

```json
{
  "featureId": "FEAT-097",
  "scores": {
    "customer_impact": 0.40,
    "effort_estimate": 0.55,
    "strategic_alignment": 0.55,
    "technical_risk": 0.45,
    "dependency_depth": 0.20
  },
  "compositePriority": "P2",
  "autonomousSafe": false,
  "demandEvidence": "Indirect — repo configures costStopThreshold: 25 and costSliceCeiling: 200 (.claude/loop.json), indicating active cost pressure. Haiku is ~10x cheaper than sonnet for retrieval-shaped reads. No explicit user grievance, but cost-axis demand is repo-internal.",
  "scopeNotes": "PRIOR 'duplicate of FEAT-125' claim is INVALID — FEAT-125 absent from all backlog folders (verified via Glob). AC rewrite by loop:spec-writer produced 5 GWT criteria with concrete values. Cost analog SLICE-37 ($74.62 / 78min) was greenfield modelRouting; this extends an existing 9-phase resolver. Weak grade dim (observability 0.82 last-5 avg) — AC don't add structured logs for the new resolver phase; should be added if promoted. Decomposition gate: effort_estimate 0.55 → ~5 Fibonacci points, below the 8-point threshold; single FEAT OK.",
  "risks": [
    "AC-001/AC-003 assume 'bun src/scripts/loop.mts validate' subcommand exists — it does NOT (verified, CLI returns 'Unknown command: validate'). Builder must EITHER add the subcommand (scope creep) OR the AC must be rewritten against an existing entry point (e.g. dispatcher-config or a new dedicated script). Material AC defect, not just typo.",
    "AC-005 pins constant location 'src/scripts/lib/model-routing.mts' but actual file is 'src/scripts/lib/model-router.mts'. Builder will need to choose: rename file (refactor cascade) or relocate constant (deviate from AC). Either choice is defensible — needs human or architect call.",
    "AC-002 dispatch wiring: no current caller routes loop:researcher through resolveModel(). Adding the 'retrieval' phase to MODEL_PHASES is one line; making it actually take effect requires identifying ALL retrieval-shaped dispatch sites and threading the resolved model in. Risk that builder lands the config-key surface (AC-001/003/004) but skips the actual routing wire-up (AC-002) and tests pass because there is no caller to validate against.",
    "AC-005 requires builder to pick a HumanEval ≥60% threshold AND cite the benchmark source in a code comment. This is editorial judgment under PM/architect scope, not builder scope — flips autonomous_safe to false.",
    "Pre-mortem #1 (two weeks later, slice fails review): most likely cause is AC-002 wired only at config-read level, no actual call site consumes the new phase, so reviewer flags 'dead code' or validator can't exercise the path. Mitigation: SLICE-A must include at least one concrete dispatch site that calls resolveModel('retrieval', ...) and has a regression test.",
    "Pre-mortem #2 (merged + broke loop): rollback is git revert only — no migration, no halt-badge contract, no published artifact. Low blast radius. Worst case: a user's loop.json with retrieval set falls back to default on revert, which is the pre-FEAT behavior.",
    "Pre-mortem #3 (regression coverage gap): no existing test exercises a 'retrieval' phase through resolveModel(). Existing model-router tests cover the 9 declared phases. AC must include a test asserting resolveModel('retrieval', cfg) returns the configured value when set, falls back to default otherwise — not just a config-schema test.",
    "Weak observability dim (last-5 avg 0.82): AC don't add structured logging for the new resolver phase. Recommend adding an AC requiring resolveModel to log {phase: 'retrieval', resolved: <model>, source: 'configured' | 'default-fallback'} once per dispatch in debug mode.",
    "Smaller/faster models for retrieval may degrade code-search quality (haiku has weaker code comprehension than sonnet). Benchmark cited in AC-005 helps but doesn't prove retrieval-task accuracy."
  ],
  "reasoning": "P2 band 0.5–0.7: real cost optimization for an internally-felt pain (repo runs costStopThreshold:25), AC are testable post-rewrite, technical_risk in 0.3–0.5 band (one module, no contract change, revert-only rollback). Not autonomous_safe: AC reference non-existent infrastructure (validate subcommand, model-routing.mts file path) AND AC-005 requires editorial judgment on HumanEval threshold. Needs architect pass + AC tightening before slicing. NOT a duplicate of FEAT-125 — that FEAT does not exist."
}
```

## Scoring

- Impact: 2
- Effort: 2
- Fit: 3
- Composite: 6 / 9

## References

- https://cognition.ai/blog (SWE-Check 04.14.26, SWE-grep 10.16.25)

## Acceptance Criteria (REWRITTEN 2026-07-02)

Original ACs assumed non-existent infrastructure (`bun ... validate` subcommand + `model-routing.mts` file) AND wrong architectural premise (plugin `resolveModel()` routes runtime dispatches — it does not; only `resolveArchitectModels()` reads it). Rewritten below to reflect the actual delivery.

**AC-1 — `runner:researcher` agent uses haiku**
- Given: `agents/researcher.md` frontmatter.
- When: Claude Code harness spawns the subagent.
- Then: `model: haiku` field present at top of frontmatter YAML. Harness dispatches on Claude Haiku 4.5 instead of default (sonnet). Cost drop ~10x per retrieval-phase dispatch.

**AC-2 — `runner:market-researcher` agent uses haiku**
- Given: `agents/market-researcher.md` frontmatter.
- When: harness spawns.
- Then: `model: haiku` present. Same rationale as AC-1 for outward-facing retrieval.

**AC-3 — No breaking changes to other agents**
- Given: all other owned agents under `agents/**/*.md`.
- When: inspected.
- Then: their `model:` field is unchanged. `pm` stays on `opus`. Agents without a `model:` field stay without one (harness default).

**AC-4 — No dead code added**
- Given: `src/scripts/lib/model-router.mts` MODEL_PHASES + resolveModel.
- When: inspected.
- Then: NOT extended with a `retrieval` phase. Rationale: `resolveModel` is only consumed by `resolveArchitectModels()` (`model-router.mts:37-46`) for the sliceStart architect-vs-editor split — no dispatch site would consume a new `retrieval` phase. Adding it would ship dead code.

## Not Shipped (deferred as YAGNI)

- **`bun ... validate` subcommand.** Would require new CLI surface + config schema validator + allowlist gate. Not needed — harness rejects invalid model strings at subagent spawn time (fail-fast, one layer up). Add if operator error rate justifies.
- **`loop.modelRouting.retrieval` config field.** Not needed — model choice lives in agent frontmatter, not in loop.json. Adding a config layer would be indirection without a caller.
- **HumanEval allowlist gate.** Editorial judgment (which HumanEval threshold?), no clear caller. Anthropic's model IDs page is authoritative surface; no benefit to duplicating it here.

## Consider rejecting because

Near-exact duplicate of FEAT-125. SWE-Check and SWE-grep are Cognition's proprietary models — this plugin cannot ship or access them. The actionable gap (using a faster/cheaper review model when one becomes available) is a one-line change to loop.json modelRouting, not a feature requiring a FEAT and slices.
