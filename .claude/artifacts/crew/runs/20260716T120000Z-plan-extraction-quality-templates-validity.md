# Plan v2 — kill the chaff: extraction quality via enforced capture + validity horizons (2026-07-16)

- **Objective:** cut the two dominant chaff classes in distilled memory —
  transient run-state (~45% of today's 113-atom session audit) and instruction
  echo (~27%) — so per-agent profiles and recall surface durable engineering
  knowledge, not session residue.
- **v2 revision** after two independent architecture reviews:
  - architect deep-dive (sound-with-revisions, 9 findings):
    `20260716T125747Z-arch-review-extraction-quality-proposal.md`
  - architect-reviewer gate (needs_revision, 6-item revision list):
    `../reviews/20260716T140000Z-review-result-arch-extraction-quality-proposal.md`
  - Every HIGH finding is addressed below; the v1→v2 delta table is at the end.
- **Companion plans:** credit-loop
  (`20260716T110000Z-plan-memory-credit-loop-ceremony-neutral.md`), noise
  guard shipped in PR #517 (sink path; this plan targets the
  transcript-distillation path).

## Root cause model (unchanged — both reviews endorsed it)

Chaff is TRUE statements with the wrong **validity horizon**: "tests pass"
is session-truth, "do not commit" is task-truth, real lessons are
durable-truth. The store has one bucket, so horizon-less truth becomes
permanent noise. Fix = make horizon declarable (consumer) and classified
(upstream extraction).

## Workstream T — consumer side (runner-plugin; dev-team via upstream request)

**T1. `<task-scoped>` marker around dispatch order-blocks** — REFRAMED per
review: until upstream E3 teaches the extractor to skip marked regions, the
marker is a *structural convention with zero chaff effect*, not a fix. Ship
it as groundwork only, in the same slice that rewrites dispatch templates to
separate objective (prose) from orders (marked block). Known limits, accepted:
ad-hoc/3rdparty/user dispatches never carry it (partial coverage).
**R0 MEASUREMENT RESULT (2026-07-16, `20260716T160500Z-research-echo-origin-promote-memory.md`):
today's 30 echoed todos trace 0% to dispatch.mts templates — all came from
ad-hoc Agent() prompts hand-authored by the session lead; general-case
template ceiling ≈15-20% (builder leg only; reviewer/validator prompts are
composed ad-hoc, there is no template for them).** Consequence: T1's chaff
value is mostly T5 + convention infrastructure; the high-yield fix is
**T6 (new): the orchestrator/session-lead adopts the `<task-scoped>` marker
in every ad-hoc Agent() dispatch prompt** — a practice rule (one line in
CLAUDE.md dispatch guidance, added at merge-wave by the lead to avoid
mid-wave file conflict with B1's CLAUDE.md ownership). E3 honors markers
anywhere in a transcript, so ad-hoc adoption + E3 = the actual coverage.
**Companion echo rule (arch finding 2):** the echo evidence proves agents
re-quote dispatch bullets into their own output, which a marker at the origin
chunk cannot stop — so every rewritten template also states "never quote
task-scoped content back into a handoff/report" WITH a negative example, not
just a positive one. **Pre-task measurement (reviewer):** before the rewrite,
attribute the audited session's 30 echoed-todo atoms to templated-dispatch vs
ad-hoc origin — if mostly ad-hoc, T1's ceiling is low and the slice should
say so. CI check named concretely:
`src/scripts/validate-dispatch-markers.mts`, modeled on the existing
`validate-decline-citations.mts` family. Honest scope note: the validator IS
new runtime code and a 16th CI-gate entry — the *templates* carry no runtime
change, but the slice is not markdown-only.

**T2. Structured learnings capture — NOT a voluntary prose section.** Both
reviews killed v1 here (voluntary heading + "none" escape hatch = the same
mechanism the credit-loop plan already proved dead at 0.7%; and the "shared
handoff template" v1 assumed doesn't exist in any repo — it's prose in the
user's personal `~/.claude/crew/workflow.md`). v2 mechanism:
- runner's slice-close ceremony already runs a CLI writer chain
  (document-writer → write-final-synthesis / slice complete / grade). Add a
  structured `--learnings <file.json>` input (array of
  `{type: lesson|decision|fact, text, why}`) that the close ceremony writes
  through `memory-sink` (tagged, noise-guarded, scope:team) — orchestrator-
  enforced at the same point the grade is already mandatory. Cap 3 items;
  empty array is legal but must be explicit.
- Dispatched-agent handoffs: the orchestrator (not the agent) extracts
  learnings from the handoff and submits them — same pattern as the credit
  loop's `memories_used` (orchestrator does the tool calls). The personal
  `workflow.md` handoff prose is the user's to edit; this plan does not fork
  it into the repo (surfaced as an operator option, out of scope).

**T3. Review-template split** — kept, but as guidance prose in reviewer
dispatch prompts (owned by this repo's command templates), not a new
artifact spec. Constraint honored: `agents/pm.md` is at 332/335 lines —
template additions go to `commands/*.md` dispatch assembly, not agent files
near the content-length cap.

**T4. Explicit capture primary, distillation safety-net — now WITH a dedupe
rule** (review MEDIUM): every explicit write from T2 carries a content-hash
marker in metadata; the upstream ask (E6, new) requests the distiller
suppress atoms whose session already contains an explicit-capture atom with
high cosine overlap, so the dual path stops feeding the 768-proposal
consolidation backlog (astramem-local#372).

**T5 (new, architect finding 9). Recall-digest re-mint guard**: the
learnings digest that `start-slice.mts` prepends to dispatch quotes old
durable lessons into a fresh transcript — the distiller re-mints them as
near-duplicate atoms (#371's rephrase class). Fold the digest block into the
`<task-scoped>` region so E3 skips it.

## Workstream E — upstream (astramem-local#374, amended)

- **E1. Horizon label `durable|session|task`** — now explicitly LAST, built
  only if E3+E4 measurement says it's still needed (it's the heaviest piece:
  new field, migration, recall/profile/credit interactions).
- **E2. Type priors — now complete**: `todo`/`command`/`event` → session/task
  default; `lesson`/`decision` → durable; **`fact`/`note` → judged per-atom
  with a run-state heuristic (gate/test outcomes, status reports → session;
  contract/interface truths → durable)** — the v1 omission was the silent-
  knowledge-loss trap (review HIGH #2).
- **E3. Provenance-aware chunking + `<task-scoped>` skip** — FIRST, mechanical.
- **E4. Outcome-fact collapsing** — FIRST, mechanical.
- **E5. Contradiction pass — now the chosen invalidation mechanism (no
  TTL).** Explicit design choice per arch finding 4: durable facts that are
  code-contingent ("true until the code changes") are NOT aged by a clock —
  a second timer nobody tunes — they are invalidated by the contradiction
  judge against newer atoms, wired to the existing `supersede_memory` /
  `invalidate_memory` primitives. The v1 "(or TTL)" hedge is withdrawn.
- **E6 (new). Explicit-capture dedupe suppression** — see T4.
- **E7 (new). Credit×horizon composition rule**: a session/task-horizon atom
  that receives usefulness credit gets `promote_memory`'d to durable — the
  primitive already exists server-side; the rule just wires it. OPEN
  QUESTION (arch): is `promote_memory` wired to anything today or dormant?
  If dormant, E7 is its own small upstream workstream, not one sentence.
- **E8 (new). Backfill**: one-time migration pass labeling the ~36.9k
  existing atoms via E2's type priors (type field already present). No
  grandfathered landfill.

## Measurement — reframed (review HIGH #3)

No committed numeric target: the metric is a **manual re-audit** of a
session digest after the T-slice + upstream E3/E4 land, same method as
today's baseline (113 atoms: ~45% run-state, ~27% echo). Directional goal:
chaff share visibly down; profile `top_lessons` free of run-state atoms.
Two declared measurement prerequisites, both upstream:
- **subagent attribution** (filed as its own ask — without it, per-role
  profile assertions are unverifiable; today crew:fullstack-dev's builds all
  attributed to the parent `claude-code` session),
- **agent_profile project filter** (astramem-local#353).

## Sequencing (revised — simplest effective path first)

1. Amend #374 (E2 completion, E6/E7/E8, E3+E4-first staging) + file the
   subagent-attribution ask. ✅ this session
2. T-slice (runner): dispatch-template rewrite w/ marker + T5 digest fold-in
   + `validate-dispatch-markers.mts` + T2 structured `--learnings` on close.
3. dev-team mirror: append T1/T2-orchestrator-pattern to the existing
   upstream request file.
4. Upstream ships E3+E4 → manual re-audit → decide whether E1 is still
   worth its weight.

## v1 → v2 delta

| Finding | Change |
|---|---|
| Voluntary learnings section = dead mechanism (arch HIGH 1) | T2 → structured CLI input, orchestrator-enforced at close |
| T2 template doesn't exist in repos (rev HIGH 1) | T2 rehomed to runner close-ceremony CLI; personal workflow.md untouched |
| E2 missing fact/note defaults (rev HIGH 2) | E2 completed with per-atom heuristic |
| Metric unmeasurable/upstream-gated (rev HIGH 3, arch 6) | Manual directional audit + 2 named prerequisites; attribution ask filed |
| Marker standalone value overstated (arch 2/3) | T1 reframed as groundwork; chaff effect owned by E3 |
| Dual-path dedupe gap (rev MED 4) | T4 hash marker + new E6 |
| Credit×horizon silent (arch 5) | New E7 promote-on-credit |
| Migration silent (arch 7) | New E8 backfill via type priors |
| Digest re-mint (arch 9) | New T5 |
| Validator unnamed (arch 8) | `validate-dispatch-markers.mts` |
| pm.md line-cap headroom (rev) | T3 additions land in commands/, not agents/ |
