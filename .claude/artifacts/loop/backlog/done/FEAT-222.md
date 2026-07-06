---
id: FEAT-222
status: done
priority: P2
category: architecture
target_release: null
created: 2026-07-06
updated: 2026-07-06
depends_on: [FEAT-220, FEAT-221]
slices: []
derived_from: null
tags: [architecture, backend, memory, learning-loop, gepa, cross-plugin]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: null
triage_notes: "Operator-requested from continuous-learning-loop gap analysis (2026-07-06); REWORKED after architect-review. The one genuinely-missing component: turn a captured/clustered failure into a machine-manufactured crew EVAL-SPEC (evals/agents/*.yaml, loadable by evals/cli.ts) so GEPA optimizes against real mistakes. Architect-review resolved the target: eval-spec YAML, NOT the gepa-core Trial JSONL (whose `source` Zod enum is closed [eval|captured|soak] and would force an upstream gepa-core PR). Two-repo dependency (runner -> crew eval-spec schema). needs_contract, NOT autonomous_safe. Highest value in trio, last by dependency. HARD-GATED on capture flowing (issue #325 / dev-team FEAT-188) AND FEAT-220/221."
---
# FEAT-222: EvalGenerator — failure → machine-manufactured eval spec

## Origin

Continuous-learning-loop gap analysis (2026-07-06), **reworked** after
architect-review. Of the 10 loop components, this is the only genuinely-absent
one: crew has mature GEPA (optimize / eval / promotion-gate / soak / provenance)
and runner has capture + curation, but nothing converts a **failed run into a
replay eval case**. Today eval specs are hand-authored. The insight: *the memory
engine should manufacture evals from mistakes* — else "learning" is accumulation,
not improvement.

## Target artifact — RESOLVED (was the review's biggest rework finding)

The first draft conflated two crew-side artifacts. They are distinct:

- **`evals/agents/*.yaml`** — hand-authored eval SPECS (fixture file + llm-rubric
  judge prompt), run via `bun run evals` / `evals/cli.ts`. A "manufactured eval"
  is naturally one of THESE — a new test the agent must pass, derived from the
  failure's `recommended_fix`.
- **`.claude/artifacts/crew/gepa/trials/<agent>.jsonl`** — structured
  execution-OUTCOME records (`gepa-core::TrialSchema`), consumed by the optimizer
  via `TrialStore.recall()`. Trials are outputs of runs, not test specs.

**This FEAT targets the eval-spec YAML format** (loadable by `evals/cli.ts`). It
does NOT write Trial JSONL. Rationale: (a) it matches the intent (manufacture a
test, not fake a run outcome); (b) it avoids the closed-enum blocker — the Trial
`source` field is `z.enum(["eval","captured","soak"])` with no
"manufactured"/"synthetic" value, so a Trial-targeting design would REQUIRE an
upstream PR to `@astragenie/gepa-core` (a third repo). The eval-spec YAML is
crew-owned and more flexible; the machine-manufactured marker is a YAML
field/convention we define with crew (single-hop cross-plugin, not two-hop).

## Scope

`src/scripts/lib/eval-generator.mts` + entry command that:

1. Consumes a `FailureCluster` (FEAT-221) or a high-value learning entry
   (FEAT-220, `status: candidate|validated`).
2. Produces a **minimal eval spec** in the crew `evals/agents/*.yaml` schema:
   fixture/context, agent-under-test, an expected-behavior rubric derived from the
   lesson's `recommended_fix`, plus provenance (`source_run_id`, learning id,
   cluster hash) and a `manufactured: true` marker (convention pinned with crew in
   the contract step).
3. Writes it to the crew eval-spec location — targeting the EXISTING schema; must
   not invent a parallel format.
4. Marks cases machine-manufactured so a human reviews/prunes before they gate
   promotion (mirrors FEAT-220's candidate→validated lesson lifecycle).

Non-goals: running GEPA (`/crew:gepa-optimize` owns that); promoting prompts;
editing production prompts; writing Trial JSONL. This FEAT only *manufactures the
spec*, which then flows into crew's EXISTING regression + promotion gates.

## Cross-plugin / cross-repo contract note

Single-hop as chosen (runner → crew eval-spec schema). Before build, an
architect/contract step MUST pin against crew `evals/cli.ts` +
`evals/agents/*.yaml` (real example: `crew-refactor.yaml`): exact YAML fields,
per-agent file routing, and the `manufactured` marker convention. If crew's
eval-spec schema can't carry provenance + the marker cleanly, raise an
`docs/upstream-requests/` doc to crew — do NOT fork the format.

If a future FEAT instead wants failures as **Trials** (optimizer input), that is a
SEPARATE two-hop path requiring a `@astragenie/gepa-core` `source`-enum extension
PR first — out of scope here, recorded as a known constraint.

## Acceptance criteria

- AC-1: GIVEN a FailureCluster with a representative `root_cause` +
  `recommended_fix`, WHEN the generator runs, THEN it emits a valid eval spec in
  the crew `evals/agents/*.yaml` schema that `evals/cli.ts` loads without error.
- AC-2: GIVEN the generated spec, WHEN inspected, THEN it carries provenance
  (`source_run_id` / learning id / cluster hash), a `manufactured: true` marker,
  and a rubric traceable to the lesson's `recommended_fix`.
- AC-3: GIVEN the same cluster is processed twice, WHEN the generator runs again,
  THEN no duplicate spec is created (idempotent on provenance hash — the hash is a
  dedup key inside the spec, NOT the file id).
- AC-4: GIVEN a cluster whose `failure_class` has no mapped agent-under-test,
  WHEN the generator runs, THEN it skips with a logged reason and writes no
  malformed spec — never throws.
- AC-5: GIVEN generated specs exist, WHEN a human runs crew's existing eval
  suite, THEN manufactured specs participate exactly like hand-authored ones (no
  special-casing) and are visibly marked machine-manufactured.
- AC-6: A DEC-* record captures the eval-spec-schema contract decision (incl. the
  YAML-vs-Trial choice and the two-hop Trial path being deferred).
- AC-7: Full suite green; typecheck + lint + format clean; snapshot-freshness
  passes.

## Blocked by (external)

- **Capture flowing** (issue #325 / dev-team FEAT-188) AND **FEAT-220 + FEAT-221**
  — with no clustered failures there is nothing to manufacture from.
- **dev-team FEAT-188 status is a hard gate**, not an assumption. It is
  in-progress (revised 2026-07-06), its own next slice is a placeholder needing
  decomposition, and it flags the GEPA trial JSONL as a "derived duplicate" slated
  for astramem-store replacement. Do NOT start build until it has landed its
  capture slices. Track via an `docs/upstream-requests/` doc.

## Risks / open questions

- **Cross-repo coupling** — eval-spec schema lives in crew. Schema mismatch → an
  upstream request or a fragile adapter. Pin in the contract step; do not fork.
- **Manufactured-eval quality** — a bad manufactured spec entering the regression
  gate can block good prompt promotions. Mitigate with the `manufactured` marker +
  human-review-before-gating (candidate status).
- **Agent-under-test mapping** — `failure_class` → which crew agent's prompt does
  this eval exercise? Needs an explicit table; undefined mappings skip (AC-4).
- **Volume control** — cap manufactured specs per run and per cluster so a noisy
  class can't flood the corpus.

## Contract (pinned — DEC-068)

Full investigation + rationale: `.claude/artifacts/loop/decisions/DEC-068.md`.
Summary the builder needs:

- **No crew-side change required.** `evals/lib/run-eval.ts` parses specs via
  a bare `parseYaml(raw) as EvalSpec` cast (no Zod) — additive fields are
  silently tolerated. Precedent: `held_out: true` already appears on test
  entries in 3 real files despite not being in the `EvalTest` interface.
- **Routing: append, never fork.** Write into the EXISTING
  `evals/agents/crew-<agent>.yaml` file's `tests:` array for the mapped
  agent. `findSpecByPromptId` returns only the first file matching a
  `prompt_id` — a second file sharing that id would be silently ignored by
  `bun run evals --prompt <id>`.
- **Cross-repo write target is a NEW config key, not yet added:**
  `loop.crewRepoPath` in `.claude/loop.json`, pointing at a local crew
  (`dev-team`) checkout. Absent/missing `evals/agents/` → skip all clusters
  with a logged reason, same never-throw contract as AC-4.
- **failure_class → agent-under-test** (4 of 9 mapped; rest intentionally
  undefined/skip — see DEC-068 §5 for full rationale):
  - `review_fail` → `reviewer` (`evals/agents/crew-reviewer.yaml`)
  - `validation_fail` → `verifier` (`evals/agents/crew-verifier.yaml`)
  - `hallucinated_ref` → `refactor` (`evals/agents/crew-refactor.yaml`)
  - `bad_patch` → `fullstack-dev` (`evals/agents/crew-fullstack-dev.yaml`)
  - `bad_tool_use`, `ignored_policy`, `stale_context`, `subagent_incomplete`,
    `other` → undefined, skip with logged reason (AC-4).

Concrete generated-test YAML template (appended to the target file's
`tests:` array):

```yaml
  - name: manufactured-<failure_class>-<cluster_hash>
    manufactured: true
    provenance:
      generator: loop-eval-generator
      failure_class: <FailureClass>
      cluster_hash: <sha256(failure_class + "::" + normalizeRootCause(representative_root_cause)).hex.slice(0,16)>
      source_run_id: <FailureCluster.exemplar_ids[0]>
      generated_at: <ISO-8601>
    fixture: file://evals/fixtures/manufactured-<cluster_hash>.txt
    assert:
      - type: llm-rubric
        rubric: "<derived from representative_fix / recommended_fix>"
```

Dedup (AC-3): before writing, parse the target file's existing `tests[]`
and skip (no write) if any `provenance.cluster_hash` already matches the
computed hash — `cluster_hash` is the dedup key, not the file/test id.

## Refs

- crew `evals/cli.ts`, `evals/agents/*.yaml` (e.g. `crew-refactor.yaml`) — target
  schema (cross-plugin contract surface).
- `@astragenie/gepa-core` `src/types/trial.ts` (`TrialSchema`, closed `source`
  enum) — the deferred Trial path's blocker.
- `src/scripts/lib/failure-classifier.mts` (FEAT-221 — input).
- `src/scripts/lib/learnings.mts` (FEAT-220 enriched entries — input).
- `docs/upstream-requests/` (raise here for crew schema and/or gepa-core enum).
- Architect-review: this session (2026-07-06).
