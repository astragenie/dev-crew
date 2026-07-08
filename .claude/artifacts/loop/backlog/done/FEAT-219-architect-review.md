---
kind: architect-review
feat: FEAT-219
status: reviewed
reviewer: runner:architect
date: 2026-07-05
verdict: APPROVE-WITH-CHANGES
---

# Architect review: FEAT-219 - role-scoped pre-work memory injection

## Design: One memory-context helper, split across two real dispatch surfaces, with a crew-first consolidation

### Problem

Agents dispatched by the loop (builder, reviewer, validator, pm, architect) start
work with no awareness of prior failures, decisions, or lessons scoped to their
role. The read-side building blocks already exist and partly work
(recallPrior/formatRecallBlock is live and wired into startSlice), but the
FEAT's own proposal conflates two structurally different dispatch mechanisms in
this repo, understates a live duplication bug in the code it wants to extend,
and defers the most consequential decision (one memory home vs two) to "for
architect" without giving it real teeth. The actual need is: (1) a single
read-side helper usable from both surfaces, (2) a write-side schema that can
support role/kind scoping, and (3) an explicit, opinionated stance on where the
canonical memory schema lives now that dev-team FEAT-188 proposes a parallel
crew-side MemoryProvider from a blank slate.

### Current shape

- `src/scripts/lib/slice-linker/start-slice.mts:832-885` (`runRecallHook`) -
  the only live astramem-backed injection path. Builder-only, query-generic
  (`memory-recall.mts:89` `buildQuery` = `"<featId> <sliceId> files:... prior
  failures decisions lessons"`, no agent-type dimension).
- `src/scripts/lib/slice-linker/start-slice.mts:483-485` - recall block is
  string-prepended to `result.dispatchInstruction` directly in code. This is
  the correct precedent for the code-assembled surface.
- `src/scripts/lib/slice-linker/start-slice.mts:535,543,553,470` - a second,
  independent memory read (`recentLearnings(repoPath, 3)` -> `learningsDigest`)
  is computed in the same function and passed into `buildDispatchInstruction(...)`'s
  options object, but `src/scripts/lib/slice-linker/dispatch.mts:144-172`
  (`buildDispatchInstruction`) has no `learningsDigest` parameter at all - it is
  silently dropped. This is a live duplication-and-drop bug in the exact code
  FEAT-219 proposes to extend, not a hypothetical: two memory reads run in
  parallel today, one is used, one is dead weight. `commands/learn.md`'s claim
  that recent learnings are "automatically surfaced" is false, matching the
  audit finding.
- `src/scripts/lib/post-builder-fanout.mts:38-65` (`reviewerPrompt`,
  `validatorPrompt`) - zero prior-knowledge content; pure string templates, no
  async reads at all today.
- `src/scripts/lib/learnings.mts:9-11,49-83` (`learningsPath`, `logLearning`) -
  JSONL schema is `{ id, timestamp, key, insight, confidence, source, sliceId?,
  tags? }`. No `agent_type`, no `kind`, no `severity`, no `supersedes` field.
- `src/scripts/lib/learnings-decay.mts:9-17` (`LearningEntry`) - same gap:
  `id, text, sliceId, createdAt, confidence?, utility_score?, last_cited_at?`.
  No kind/severity/agent scoping fields exist anywhere in the read path either.
- `src/scripts/lib/learnings-ranker.mts:32-44` (`compositeScore`) - ranking
  today is `decayConfidence * utility_score`, plus a flat `+0.1` query-word
  boost (`QUERY_BOOST`, line 14). This is the exact mechanical precedent for an
  "agent-type soft boost" - it already exists in miniature for query matching.
- `git show feat/memory-sink-and-ingest-hardening:src/scripts/lib/memory-sink.mts:27`
  - `MemoryKind = "decision" | "lesson" | "note"`. No `"failure"` kind exists on
  the sibling branch that FEAT-219 assumes as its S1 prerequisite input.
  Enablement is `.claude/loop.json` `memory.enabled`, project id derives from
  `productName` (not any per-call id) - this is DEC-065 in
  `.claude/artifacts/loop/loop-snapshot.md` ("Memory-sink is opt-in, derives
  its cortex project from productName").
- `src/scripts/lib/memory-recall.mts:89` (`buildQuery`) and `:113,124-131`
  (`spawnRecall`) - contradicts DEC-065 today: the CLI call passes `featId`
  into the `--project` argument (`spawnRecall(cli.path, query, k, featId, repo,
  ...)` where the 4th positional is literally named `project` in the function
  signature at line 124-131), not the stable per-repo `productName`/`projectId`
  the sink module uses. This is a pre-existing bug FEAT-219 would inherit and
  compound if agent-type scoping is bolted onto the same query builder unfixed.
- `src/scripts/lib/decisions-store.mts:131-164` (`findRelevantDecisions`) -
  reachable only from a manual CLI path (`src/scripts/loop.mts:1680-1686`),
  never from reviewer fanout, confirming the audit.
- `skills/triage/SKILL.md:54-78` (steps 3-4) - the second dispatch surface,
  structurally different from the first: `runner:pm` is dispatched by literal
  markdown prose read by the orchestrating Claude thread, not by a TS function
  that returns a final string. Step 3 shells out to
  `loop.mts resolve-skills --variant pm`, captures `.dispatchInstructionBlock`
  from JSON, and step 4 tells the orchestrator to manually prepend that block
  to the prompt it is about to write. No equivalent construct exists for
  `runner:architect` classification in `commands/intake.md` Phase 2, but the
  same shape applies (grep for `Dispatch (runner:pm|runner:architect|crew:architect)`
  across `commands/*.md` returns zero hits - there is no code-owned dispatch
  string for pm/architect to inject into).
- `src/scripts/lib/skill-resolver.mts:33-52` (`resolveSkills`) - the exact
  precedent for surface 2: a CLI subcommand that emits a pre-rendered Markdown
  block (`dispatchInstructionBlock`) for a skill `.md` file to splice in by
  hand. This is the template to extend for memory, not a new mechanism.

### Proposed shape

```
buildMemoryContext({ repoPath, agentType, kind?, query, tags?, k, tokenCap })
        |
        +-- wraps: rankLearnings + recentLearnings/searchLearnings
        |           + findRelevantDecisions + recallPrior/formatRecallBlock
        |
        +-- Surface A (code-assembled dispatch strings) - direct import + call:
        |     start-slice.mts (replace the recallBlock/learningsDigest split
        |       with one call; delete the dead learningsDigest plumbing)
        |     dispatch.mts buildDispatchInstruction (thread memory through
        |       the builder/parallel-fe-be header, and the architect
        |       pre-flight block)
        |     post-builder-fanout.mts reviewerPrompt/validatorPrompt
        |
        +-- Surface B (skill-markdown + CLI-invocation dispatch) -
              new `loop.mts resolve-memory --variant <role> --query ...`
              CLI subcommand (sibling of resolve-skills), emitting a
              `.memoryContextBlock` field:
                skills/triage/SKILL.md (pm - query = FEAT ids/category/tags
                  being scored, available at step 1's enumeration)
                commands/intake.md Phase 2 (architect classification)
                dispatch.mts's buildArchitectPreflight prompt text
```

- `src/scripts/lib/memory-context.mts` (new) - `buildMemoryContext()`. Pure
  function of already-existing readers; no new I/O primitive.
- `src/scripts/lib/learnings.mts` - extend `logLearning`/JSONL schema with
  optional `agentType`, `kind` (`"decision"|"lesson"|"failure"|"note"`),
  `severity`, `supersedes`. Additive/optional fields only - existing entries
  with none of these still parse (matches the file's own comment that it's
  "a superset... existing entries lacking optional fields are handled
  gracefully").
- `memory-sink.mts` (on `feat/memory-sink-and-ingest-hardening`, to merge
  first) - widen `MemoryKind` to add `"failure"`, thread `agentType` into
  `recordMemory`'s CLI args. This is the write-side prerequisite FEAT-219
  correctly identifies, but it does not exist yet even on the named sibling
  branch - the FEAT's "S1 is already fixed by memory-sink #303 + P1.11"
  claim is only half true (decision/lesson/note lands; failure kind and
  agent_type do not).
- `src/scripts/lib/memory-recall.mts:124-131` - fix the `--project` argument
  to use the repo's `productName`/stable project id (mirroring
  `readMemoryConfig` in `memory-sink.mts:66-79`), not `featId`, while this
  file is touched for agent-type scoping. Otherwise agent-type scoping is
  layered on top of a query that is already scoped to the wrong cortex
  project bucket.
- Two separate completeness fitness tests, not one grep: (1) grep
  dispatch-assembly `.mts` modules for the `buildMemoryContext(` call
  (Surface A); (2) grep `commands/*.md` + `skills/**/SKILL.md` for the
  `resolve-memory` CLI invocation pattern (Surface B). A single grep written
  against only Surface A - as FEAT-219 implies - will silently pass
  pm/architect dispatch and reintroduce the exact gap this FEAT exists to
  close.

### Trade-offs

| Option | Pro | Con |
|---|---|---|
| Code injection at dispatch-assembly (both surfaces, current proposal refined) | Matches the two mechanisms that actually exist in this repo today (direct string splice at start-slice.mts:483-485, CLI-block splice at triage.md step 3-4); no new Claude Code capability required | Two call conventions to keep in sync (a TS import and a CLI flag), two completeness tests instead of one |
| Single hook-based injection (e.g. treat as PreToolUse rewrite) | Would be one universal chokepoint if it existed | Does not exist - CLAUDE.md and the FEAT itself already confirm no SubagentStart event and PreToolUse cannot cleanly rewrite a subagent prompt. Not a real option, not padding - genuinely dominated. |
| Force pm/architect into the same code-path as start-slice.mts (single "one helper, N call sites" as literally written) | Simplest mental model | Does not match reality - pm/architect are markdown-prose dispatches, not TS-function-assembled strings; no file exists to import into (confirmed via grep, zero hits). Building this option means inventing a code-assembled dispatch pipeline for pm/architect as a side effect of a memory feature - out of scope and a bigger refactor than the FEAT intends. |

### Recommendation

Approve the FEAT's direction with two concrete changes: split the "one
helper" into a shared pure function (`buildMemoryContext`) consumed via two
different splice mechanisms that already have working precedent in this
repo (direct import for code-assembled sites, CLI-block-into-prose for
skill-markdown sites), and fix the query/schema issues (dead
`learningsDigest`, `--project` bug, missing `failure` kind) as part of the
prerequisite slice rather than treating memory-sink's current state as
already sufficient. Code injection over a hook is correct and not a close
call - no hook surface exists for this. The FEAT's Open Questions on
consolidation deserve a real answer, not a placeholder (see below).

### Consolidation decision (the important one)

Recommendation: crew (dev-team) is the one home for the shared
MemoryProvider interface, per the existing hard dependency direction
(runner imports crew - CLAUDE.md "Hard dependency" section,
src/scripts/lib/plugin-identity.mts::MIN_CREW_VERSION) - but FEAT-188's
S2 must NOT start from a blank-slate schema mirroring gepa-core's
TrialStore. It must adopt runner's already-shipped, already-tested field
shapes as the seed.

Reasoning: runner today ships a materially more complete stack than
dev-team's FEAT-188 proposes - memory-sink.mts (write, opt-in, gated,
fail-silent, 2s-capped), learnings.mts/learnings-ranker.mts/
learnings-decay.mts/learnings-citations.mts (read, ranked, decayed,
cited), decisions-store.mts (DEC-*.md + findRelevantDecisions),
memory-recall.mts/recall-injector.mts (astramem read + format). FEAT-188
is status: pending, not yet built. If crew's S2 authors a brand-new Zod
schema (kind: failure|lesson|decision|standard_violation, ulid ids,
supersedes) independently of runner's live shape (kind:
decision|lesson|note on memory-sink, key/insight/confidence/source/sliceId/tags
on learnings.mts), the two stacks will diverge on day one - three
different kind enums already exist across two repos (runner's
memory-sink, FEAT-219's proposed addition, dev-team's FEAT-188) before
either side has shipped agent-type scoping. That is the drift both FEATs
correctly worry about, and it happens regardless of which repo "wins"
unless the schema is reconciled before FEAT-188 S2 lands.

Concrete path:
1. Do not block FEAT-219 on FEAT-188. Runner's stack already works
   end-to-end (astramem is live per this FEAT's own evidence) - ship
   FEAT-219's read/write/injection work now, against runner's existing
   schema, extended additively (S1 above).
2. Write an upstream-request artifact (matching the
   docs/upstream-requests/2026-06-DD-hero-crew-*.md naming convention
   already used in this repo) directed at dev-team's FEAT-188, proposing:
   crew's src/lib/memory/ interface adopts the union of runner's
   MemoryKind + FEAT-219's failure addition + FEAT-188's
   standard_violation as one canonical enum, and a MemoryProvider
   contract that runner's memory-sink.mts/memory-recall.mts can be
   thinned into an adapter over, rather than runner and crew each keeping
   a permanent independent stack.
3. Record this as a DEC (parallel to DEC-065) so neither team treats
   runner's current stack as permanent nor FEAT-188's schema as
   pre-ordained - it is a merge, not a handoff in either direction.
4. FEAT-188's own sequencing note (S1 -> S2 -> S3 -> (S4, S5)) already
   says S1 (capture repair) is standalone value even if nothing else
   ships - that S1 scope (hooking runner:close, review/validation-FAIL
   capture, retrospective decisions) is almost entirely already covered by
   runner's memory-sink.mts write paths today; crew-side S1 should audit
   for overlap before re-implementing it, not assume a green field.

This is the one place in the FEAT that most needs an opinionated call
rather than more research - the evidence favors "adopt, then converge,"
not "wait for the other repo to build a rival version," and not "build
two forever."

### Agent-type scoping - soft boost, not hard filter

Sound, and consistent with existing precedent: learnings-ranker.mts:14,37-40
already implements a flat +0.1 boost for query-word matches inside a
decay x utility composite score. Adding an agent_type-match boost of
similar shape, plus a kind-preference boost (reviewer -> failure/
standard_violation, builder -> lesson/decision, architect -> decision) is
a natural extension of a mechanism that already ships, not a new design.

Failure modes and mitigations:
- Sparsity - early on, most entries will lack agentType/kind entirely
  (today's schema has neither). A hard filter would return near-empty
  results for every role until the corpus catches up; the soft-boost +
  global-fallback design is the only viable option right now, not merely
  the safer one.
- Siloing - a hard filter would prevent, e.g., an architect ever seeing a
  builder-tagged lesson that is architecturally relevant. Soft boost with
  fallback avoids this by construction.
- Token-budget starvation - the real, not-yet-addressed risk. If
  role-boosted entries and fallback-global entries compete purely on score
  within one shared tokenCap (800 tokens per FEAT-188's plan), a role with
  a large boosted pool can crowd out any fallback content entirely,
  silently defeating the "global fallback so cross-role knowledge still
  surfaces" goal FEAT-219 states as a requirement. Mitigation: reserve a
  minimum slot count (e.g. top-3 role-boosted + top-2 unboosted-but-recent)
  rather than a single merged ranked list, or document the trade-off
  explicitly if a single ranked list is chosen. Neither FEAT-219 nor
  FEAT-188 currently specifies this - call it out as an AC gap.

Query formation for non-slice dispatches: no new invention needed.
memory-recall.mts:89 (buildQuery) already builds "<featId> <sliceId>
files:... prior failures decisions lessons" for slice dispatches. For pm
(triage), the natural query is the FEAT id list + each FEAT's
category/tags frontmatter, all already enumerated before dispatch in
skills/triage/SKILL.md step 1 (backlog list-pending-ids). For architect
pre-flight (dispatch.mts:245-257 buildArchitectPreflight), the query is
sliceId + title + touchesFiles - the same fields needsContractPreflight
(dispatch.mts:226-243) already extracts from slice frontmatter. Both
reuse the existing buildQuery shape; no new query-construction design is
required, only new call sites.

### Write-side role+kind tagging - ordering and schema concerns

Ordering is correct: recall-side scoping is meaningless without
write-side tags to scope against. But the FEAT's claim that "the
stale-learnings half is already fixed by memory-sink #303 + P1.11"
overstates readiness - confirmed above, memory-sink.mts on the named
sibling branch has no failure kind and no agentType field yet; this work
has to happen as part of FEAT-219's own S1, not be assumed complete.

Schema concerns for the prerequisite slice:
- kind enum - reconcile three names before shipping (see Consolidation
  section): runner's current decision|lesson|note, FEAT-219's proposed
  decision|lesson|failure|note, dev-team's proposed
  failure|lesson|decision|standard_violation. Recommend
  decision|lesson|failure|note for runner's own write path now (superset
  of what's shipping), leaving standard_violation for the crew-side
  reconciliation to add later rather than inventing it twice.
- severity - does not exist anywhere in runner's schema today
  (learnings.mts, learnings-decay.mts). Required as a new field before
  "reviewer -> failure/high-severity" kind-preference boosting can work;
  this is new schema surface, not a rename.
- provenance - already reasonably solid: memory-sink.mts's traceTag
  ([FEAT-x/SLICE-y]) and learnings.mts's source field (default "agent")
  both exist. Extend, don't replace.
- supersede - genuinely missing on the runner side. learnings.mts has no
  supersedes/invalidate concept at all; staleness is handled only
  implicitly via learnings-decay.mts's confidence half-life. FEAT-188
  explicitly wants "superseded/invalidated never recalled" as an S5 AC;
  FEAT-219 does not mention this gap at all. Flag as missing scope - if
  FEAT-219 ships agent-type-scoped recall without a supersede/invalidate
  mechanism, a corrected-but-not-deleted lesson can keep resurfacing in a
  builder's context indefinitely.

### Slice decomposition

- SLICE-A: Write-side schema prerequisite, in runner's existing files (not
  a new crew module) - add agentType, kind (widen enum), severity,
  supersedes (optional/additive) to learnings.mts + memory-sink.mts; fix
  the --project argument bug in memory-recall.mts; auto-capture
  failure-kind entries on review-FAIL/validation-FAIL artifact writes.
- SLICE-B: buildMemoryContext() helper - wraps rankLearnings +
  recentLearnings + findRelevantDecisions + recallPrior/formatRecallBlock;
  agent-type soft boost + kind preference + reserved fallback slots;
  noop/byte-identical golden test when memory is off.
- SLICE-C: Wire Surface A (code-assembled) - start-slice.mts (replace the
  current dual recallBlock/learningsDigest computation with one call;
  delete the dead learningsDigest plumbing through dispatch.mts),
  dispatch.mts buildDispatchInstruction (thread memory through builder +
  parallel-fe-be + architect-preflight prompts), post-builder-fanout.mts
  (reviewer A/B + validator). Grep-completeness test #1.
- SLICE-D: Wire Surface B (skill-markdown + CLI) - new
  loop.mts resolve-memory --variant <role> --query ... subcommand
  (sibling of resolve-skills); wire into skills/triage/SKILL.md and
  commands/intake.md Phase 2. Grep-completeness test #2 across
  commands/*.md + skills/**/SKILL.md. Fix stale commands/learn.md /
  commands/decisions.md claims in the same slice (small, same-surface doc
  fix FEAT-219 already flags as optional - bundle it here rather than
  leaving it "separately" indefinitely).
- SLICE-E (separate FEAT/ADR, explicitly out of this FEAT's autonomous
  scope): cross-plugin reconciliation artifact with dev-team FEAT-188 per
  the Consolidation section above. Do not gate SLICE-A..D on this landing.

### Acceptance criteria

- [ ] learnings.mts JSONL entries accept optional agentType, kind,
      severity, supersedes fields; existing 3-entry legacy file still
      parses without error (regression test).
- [ ] memory-sink.mts MemoryKind includes "failure"; a review-FAIL or
      validation-FAIL artifact write auto-appends a failure-kind entry
      with zero operator action.
- [ ] memory-recall.mts's astramem CLI call passes the repo's stable
      productName/project id, not featId, in --project (unit test asserts
      the spawned argv).
- [ ] buildMemoryContext() with memory disabled/absent produces an empty
      string; dispatch output is byte-identical to pre-change output
      (golden test) for at least one Surface-A site and one Surface-B
      site.
- [ ] Agent-type scoping is implemented as a score boost with a reserved
      fallback slot count, not a hard filter; a unit test asserts a query
      with zero role-matching entries still returns global-fallback
      results up to topK.
- [ ] Two independent completeness tests exist and fail on a deliberately
      unwired new dispatch site: one grepping .mts dispatch-assembly
      modules for the helper call, one grepping commands/*.md +
      skills/**/SKILL.md for the resolve-memory CLI invocation.
- [ ] commands/learn.md no longer claims recent learnings are
      "automatically surfaced" without qualification; the claim is either
      made true (learningsDigest reaches the dispatch string) or
      corrected.

### Risks

- Schema drift across three kind enums (runner memory-sink, this FEAT's
  proposal, dev-team FEAT-188) - mitigate by landing SLICE-A's enum choice
  first and treating it as the seed for the upstream reconciliation, not
  a private runner-only decision made in isolation.
- Token-budget starvation between role-boosted and fallback entries -
  neither source FEAT specifies reserved slots; mitigate with an explicit
  AC (added above) rather than leaving it to implementation discretion.
- Two-surface completeness gap - a single grep test (as FEAT-219 literally
  proposes) would pass while leaving pm/architect dispatch unwired,
  silently reproducing the exact gap the FEAT exists to close. Mitigate
  with the two-test split in SLICE-C/D.
- FEAT-188 proceeding independently before reconciliation - if dev-team
  merges FEAT-188 S2 on its own schedule with a from-scratch schema before
  the upstream-request in SLICE-E is read, drift is locked in immediately.
  Mitigate by filing the upstream-request artifact concurrently with
  SLICE-A, not after SLICE-D.
- Injection-attempt note: the FEAT-219 body's Open Questions section
  states "(crew is the base dependency runner imports)" inline, presented
  as a fact rather than a question, ahead of asking the architect to
  decide. Per the injection-defense contract, this framing was evaluated
  on its own merits (existing MIN_CREW_VERSION dependency direction,
  crew's src/lib/memory/ proposal location) and independently confirmed
  above - not accepted because it was pre-asserted. It happens to be
  correct, but this review would have reached the opposite conclusion if
  the evidence had pointed the other way (e.g., if runner's stack were
  the more mature one and crew had no completed subsystem to import).
