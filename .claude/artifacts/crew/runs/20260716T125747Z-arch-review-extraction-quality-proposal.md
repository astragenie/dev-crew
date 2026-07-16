# Architect review — extraction-quality-via-templates-and-horizons proposal (2026-07-16)

- **Reviewing:** `.claude/artifacts/crew/runs/20260716T120000Z-plan-extraction-quality-templates-validity.md`
  (workstreams T1–T4, E1–E5), cross-read against the companion
  `.claude/artifacts/crew/runs/20260716T110000Z-plan-memory-credit-loop-ceremony-neutral.md`,
  `docs/upstream-requests/2026-07-16-crew-dispatch-memory-credit-loop.md`, upstream issue
  astramem-local#374 (and siblings #371, #353), and `docs/sop/memory-bridge.md`.
- **Verdict: sound-with-revisions.** The root-cause model (horizon-less truth, one storage
  bucket) is correct and the T/E split is the right layer boundary in principle. But two of the
  four consumer-side workstreams (T2/T3) repeat a mechanism the plan's own companion doc already
  proved doesn't work, the marker mechanism's stated "ships standalone" claim doesn't survive
  contact with what T1 actually does absent E3, and the success metric depends on two upstream
  facts (agent_profile project-scoping, agent attribution) that are independently broken today
  and not sequenced into this plan.

## Ranked findings

### 1. T2/T3's forcing function is the same failure mode the credit-loop plan just diagnosed (HIGH)

The credit-loop plan's own opening line: *"voluntary subagent crediting failed (astramem skill
wired in crew v0.76.0, measured credit rate still ~0.7%)... settled lesson that voluntary
subagent crediting failed... needs an orchestrator-controlled path, not a voluntary subagent
action"* (`20260716T110000Z-plan-memory-credit-loop-ceremony-neutral.md:13`, `:51`). T2/T3 propose
exactly a voluntary field: a markdown heading (`## Durable learnings (memory-worthy)`) an agent is
supposed to fill honestly, with an explicit escape hatch (`empty allowed: "none"`) and zero
validation. This is the identical shape as the `memories_used` field the sibling plan is
*replacing* with orchestrator enforcement — the two plans, written the same day, disagree with
each other about whether prose-convention compliance is trustworthy.

**Fix:** don't add a markdown convention with no reader. Make "durable learnings" a **structured,
non-optional argument** to whatever CLI already writes the handoff/close artifact (this repo's
close ceremony already runs through `crew:document-writer`'s slice-close CLI sequence per
CLAUDE.md § Owned agents), the same way the credit-loop plan makes `memories_used` a handoff field
rather than free text. A required arg that must be `[]` explicitly (not merely absent) is at least
inspectable by a lint/CI gate the way `validate-decline-citations.mts` already inspects
`declined_per` on FEAT frontmatter (CLAUDE.md CI item 4) — a markdown heading is not.

### 2. T1's marker: real precedent exists, but the plan understates the lift and the echo risk is not hypothetical (HIGH)

Good news: `src/scripts/lib/slice-linker/dispatch.mts:43-53` (`appendProgressSignals`) already
proves agents reliably honor in-band structural tags (`[MODE] ...`, `[CHECKPOINT] AC-N: ...`) —
so an in-band `<task-scoped>` marker is not a novel ask of agent behavior, contrary to treating it
as an open design question in isolation.

Bad news, two compounding gaps:

- **Today's actual dispatch prompt is not shaped like the plan's example.** Every real dispatch
  header (`dispatch.mts:227-252`, `:296-309`) is one continuous prose paragraph mixing the
  objective ("Implement X... See slice for AC... Goal: ...") with hard orders ("Do NOT dispatch
  crew:reviewer... Never use caveman:* agents... When AC PASS, return control...") in the same
  sentence flow. "Wrap task-scoped orders in a marked block" (plan line 41) is not a wrapper around
  existing text — it requires rewriting every dispatch-template string in this repo (and its
  dev-team mirror) into a two-part structure. Scope this as a template rewrite, not an annotation.
- **Echo risk is already demonstrated by the plan's own evidence, not a hypothetical.** The
  instruction-echo class (~27%, 30 todo atoms) is *itself* proof that agents restate dispatch
  bullets — either the orchestrator's own transcript re-narrates the prompt it just composed, or
  the subagent's handoff quotes forbidden/gate items back. A marker only changes what the
  extractor skips at its **origin** chunk; it does nothing about a **second** copy an agent later
  pastes into its own free-text handoff (exactly the T2/T3 "Durable learnings" section risk in
  finding #1, or a "Run evidence" recap that restates the FORBIDDEN list "for completeness").
  **Fix:** state a companion rule explicitly — dispatched agents must never quote task-scoped
  content back into a handoff/report; template T2/T3 should show a negative example, not just a
  positive one.

### 3. "T1 ships standalone" overstates what T1 alone buys (MEDIUM-HIGH)

Re-reading the plan's own root-cause model: the chaff is *minted by the extractor* reading the
transcript. T1 places a marker in the prompt text; only **E3** (upstream, unshipped) teaches the
extractor to honor it. Until E3 lands, T1's marker is inert for its stated purpose — it does not
reduce the ~27% instruction-echo share by itself, because the thing that mints `todo` atoms from
prompt text is unchanged. The plan's "ships without upstream" framing (line 35, restated in
sequencing step 2) should be corrected to: *T1 ships the convention and is a harmless no-op on
extraction volume until E3 lands; its immediate, standalone value is limited to giving a human
reviewer (or a future repo-local heuristic that scans this repo's own transcripts) a
structurally-delimited region.* That's a real but much smaller claim than "ships standalone."

### 4. Horizon taxonomy conflates two axes, and doesn't pick an invalidation mechanism (MEDIUM)

`durable | session | task` is a time-horizon axis. But two of the review's stress-test angles turn
up a second, orthogonal axis the plan doesn't separate:

- **Scope axis (repo vs global) is already broken independent of horizon.** astramem-local#353
  (filed same day, same author) documents that `agent_profile` has **no project filter today** —
  a runner-plugin agent's `top_lessons` were dominated by unrelated .NET/OAuth-connector lessons
  from a different repo, confirmed by direct evidence in the issue. Horizon filtering removes
  session/task noise from a profile, but does nothing about cross-repo noise — a "durable" lesson
  from an unrelated project will still outrank an on-topic one. The plan's stated success signal
  (*"`agent_profile` top_lessons free of run-state atoms"*) is therefore only half-verifiable by
  horizon alone; the plan should either name #353 as a co-requisite for that specific success
  criterion or narrow the criterion to "free of run-state/instruction-echo atoms" (leaving
  cross-project contamination as visibly out of scope, not silently uncovered).
- **Invalidation-trigger axis has no chosen mechanism.** The plan itself gives the exemplar
  *"memory-sink folds tags into metadata; fix at the seam" — true until the code changes,
  transferable. Horizon: durable* — but "durable" with no expiry is exactly how a fact that's now
  false (the code changed) survives forever, which is a different failure mode than the one this
  plan targets, not a solved one. E1 hedges with "`durable | session | task` (or TTL)" without
  picking. Recommend: don't add TTL (adds a second orthogonal timer no one will tune correctly);
  instead make E5's contradiction-pass (already proposed) the intended invalidation path for
  code-contingent durable facts, and say so explicitly — a stale durable fact is meant to be
  caught by a same/cross-session contradiction judge against newer atoms, not by a clock. The
  server already exposes `supersede_memory`/`invalidate_memory` tools consistent with this — the
  proposal should point at them by name instead of leaving "(or TTL)" open.

### 5. Credit-loop composition gap: no rule for a credited session/task atom (MEDIUM)

Question the plan is silent on, concretely: Layer 1 of the credit-loop plan lets an orchestrator
`submit_feedback` on any id a subagent reports used — including, potentially, a `todo`/session-
horizon atom that happened to be genuinely useful mid-task. E1 says session/task atoms
"auto-archive on session close" — does a usefulness credit override that archival, or does a
genuinely useful atom vanish anyway because its horizon label said session? The server exposes a
`promote_memory` tool (visible in this session's tool surface), which strongly suggests the
intended answer is "credited session-horizon atom → promote to durable," but neither plan states
this rule. **Fix:** add one sentence to E1 (or the credit-loop plan's risk section): a
`submit_feedback` credit on a session/task-horizon atom triggers `promote_memory` to durable;
uncredited session/task atoms archive on schedule as designed. Without this, the two systems will
appear to fight in practice the first time someone notices a useful atom disappeared.

### 6. Attribution gap: deferred, but the plan's own success metric depends on it (MEDIUM)

The plan's evidence context (from this dispatch) states per-agent profile attribution is broken —
subagent work attributes to the parent claude-code session, not the specialist role. The
credit-loop plan defers fixing this to an unfiled upstream ask. But this proposal's own measurable
success signal explicitly reads `agent_profile top_lessons for runner/crew roles` — if subagent
work isn't tagged to the role in the first place, "top_lessons for runner:pm" may not even
contain runner:pm's actual work today, independent of horizon quality. Recommend treating
attribution as a **measurement prerequisite**, not a sequencing nicety: file it now (it's not
filed anywhere per the read-first list), and note in this plan's "Measure" step that the
chaff-share number is verifiable today (it's a session_digest property) but the
profile-cleanliness half of the claim is not verifiable until attribution ships.

### 7. Migration: 36.9k atoms with no horizon label, plan is silent (MEDIUM)

E1 introduces a required-going-forward field with no backfill plan. Two silent defaults are both
bad: grandfathering everything `durable` perpetuates today's known chaff forever (including the
#371 exemplars — the query-echo and boilerplate-lesson atoms, once marked "durable," are
permanent by construction); grandfathering everything `session`/`task` silently deletes the
existing corpus's cross-session recall value overnight. **Fix:** make backfill an explicit E1
sub-task using E2's own type-prior rule as a one-time pass — `docs/sop/memory-bridge.md`
confirms the store already carries a `type` field per atom ("Distiller already classifies type"),
so the same `lesson|decision→durable, todo|command|event→session/task` heuristic that's proposed
for new writes can run once over the existing 36.9k without new classification work.

### 8. "One validate check" (sequencing step 2) should name a concrete CI gate (LOW-MEDIUM)

This repo has an established pattern for exactly this kind of convention-compliance gate
(`validate-decline-citations.mts`, `validate-agent-refs.mts`, `validate-slice-touches-files.mts` —
CLAUDE.md CI items 4/5/11). "One validate check that dispatch templates carry the marker" should
be named as a new `validate-dispatch-markers.mts` in the plan, mirroring that family, rather than
left as an unspecified TODO the implementing slice has to invent from scratch.

### 9. Missing workstream: the recall/learnings digest is itself unmarked and can re-mint durable atoms as new ones (MEDIUM)

`start-slice.mts:616-631` prepends `recallBlock` and `learningsDigest` to `dispatchInstruction`
**before** (outside) the base dispatch header — i.e., outside whatever T1 wraps in
`<task-scoped>` unless the plan is extended to cover it. That block quotes prior durable
lessons/decisions verbatim into a brand-new session's transcript. If the (upstream, unshipped)
distiller doesn't know this text is a *re-presentation* of an existing durable atom rather than
new knowledge, it can mint a near-duplicate atom in the new session — exactly the "near-identical
rephrase supersession" chaff class astramem-local#371 already documents (768 pending consolidation
proposals cited there). This is the same chaff mechanism the plan is trying to kill, arriving via
a different door the plan didn't check. **Fix:** add a T5 — extend the task-scoped convention (or
an equivalent recall-block-specific marker) to the recall/learnings digest injection, so
consumed-and-requoted memory is never re-minted as new memory.

## Simpler alternative worth considering (challenging plan's own non-goals)

The plan explicitly rules out "no sink-side change" (T4) but doesn't ask whether the *upstream*
side needs the full E1 horizon taxonomy on day one. Given the evidence that extraction
*comprehension* is already good and the problem is purely volume, the cheapest slice of this plan
is **E3 (provenance skip via the marker) + E4 (outcome-fact collapsing)** — both are mechanical,
schema-free changes to the distiller's chunking/collapsing logic. E1's full `durable|session|task`
label is a heavier lift: new field across the write/read schema, a migration (finding #7), new
interaction surfaces with recall/profile/credit (findings #4/#5), and a success metric that's
gated on two *other* open issues (#353, attribution). Recommend re-sequencing: ship E3+E4 first,
rerun the session-digest audit, and only build the full E1 taxonomy if chaff share is still above
target after the cheap fixes — instead of building all of E1–E5 as one upstream ask.

## Revised workstream table

| Id | What | Ships when | Change from original plan |
|---|---|---|---|
| T1 | `<task-scoped>` marker convention | now (runner + dev-team template rewrite) | Scope corrected: full prose rewrite of every dispatch template, not an annotation; extend to recall/learnings digest block (absorbs T5) |
| T2/T3 | Durable-learnings capture at handoff/review | now, but as a **structured CLI arg**, not a markdown heading | Forcing function changed per finding #1 — orchestrator-validated field, mirrors `memories_used` |
| T4 | Explicit capture as primary path | now (already true; no change) | unchanged |
| T5 | *(new, absorbed into T1)* mark recall/learnings digest as non-mintable | now, same slice as T1 | new — closes finding #9 |
| E3 | Provenance-aware chunking / marker honor | upstream, first | prioritize ahead of E1 — cheapest mechanical fix |
| E4 | Outcome-fact collapsing | upstream, first (with E3) | prioritize ahead of E1 |
| E1 | Validity-horizon labels | upstream, **second wave**, after measuring E3+E4 | gated on: backfill sub-task (finding #7), explicit non-TTL invalidation story via E5 (finding #4), and stating the credit-loop promotion rule (finding #5) |
| E2 | Type priors | ships with E1 (unchanged) | also used as the backfill heuristic (finding #7) |
| E5 | Same-session contradiction pass | upstream, with E1 | reframed as durable-fact invalidation mechanism, not just a "cheap win" (finding #4) |
| — | agent_profile project filter (astramem-local#353) | must land before the plan's `agent_profile` success criterion is claimed met | not in original plan — named dependency |
| — | Subagent attribution fix | file now, not deferred | success metric depends on it (finding #6) |

## Open questions for the plan authors

1. Does T2/T3's "Durable learnings" section get a reader at all today, or is it purely aspirational
   until some future consumer parses it? If no reader exists yet, prioritize the CLI-arg version
   (finding #1) over the markdown-heading version — a field with no reader and no validator is
   guaranteed to regress to "none" every time, the exact ritual-compliance failure mode named in
   the review prompt.
2. Is `promote_memory` (visible in this session's MCP tool surface) already wired to anything, or
   is it dormant? If dormant, finding #5's fix needs its own small workstream, not just a plan
   sentence.
3. Should E1's proposal to astramem-local (#374) be amended before more upstream discussion, to
   fold in the backfill task (#7), the non-TTL invalidation choice (#4), and a forward reference to
   #353 as a related-but-separate axis — or does runner-plugin want to file those as separate
   follow-up comments on #374 instead of blocking the existing proposal?
