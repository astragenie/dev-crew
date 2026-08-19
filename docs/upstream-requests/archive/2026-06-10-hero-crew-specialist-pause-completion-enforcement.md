---
filed: 2026-06-10
target_plugin: hero-crew
target_repo: astragenie/dev-team
status: merged
resolved: 2026-07-06
partially_resolved: 2026-07-02
resolved_note: >-
  Final residual (aiplugin-dev anti-pause contract, PR #150) SHIPPED in crew
  0.48.0. Loop-side MIN_CREW_VERSION raised 0.47.0 → 0.48.0
  (plugin-identity.mts) so the contract is guaranteed present. Archived.
resolved_by: >-
  FEAT-161 (dev-team) scaffold-first HARD OUTPUT CONTRACT — SLICE-A
  (b31ca77) + SLICE-B (83fb35e) landed 2026-06-11 and SHIPPED in
  released crew 0.47.0 for `devcrew:inspector` (reviewer) and
  `devcrew:verifier` (validator) only — confirmed present in
  agents/inspector.md and agents/verifier.md. Builder-tier
  (`devcrew:fullstack-dev` / `devcrew:frontend-dev` / `devcrew:backend-dev`) took
  a different fix in the same release: builders were redesigned to never
  write a handoff artifact, closing the pause gap by removing the
  artifact step rather than scaffolding it. The `aiplugin-dev` contract
  extension (dev-team PR #150) is MERGED to dev-team main but
  UNRELEASED as of 0.47.0 — pause-events.jsonl shows aiplugin-dev
  pausing on 2026-07-02 without the contract. This is the Option 2
  front-loaded-stub fallback, not the Option 1 harness re-prompt — for
  inspector/verifier only, per FEAT-176/SLICE-134. Loop pinned the
  floor at `MIN_CREW_VERSION = "0.47.0"` (src/scripts/lib/plugin-identity.mts)
  to pick up the released inspector/verifier coverage.
  `docs/sop/specialist-pause-handling.md` §2 manual fallback marked
  retired/optional for inspector/verifier dispatches only; remains
  ACTIVE for builder-tier (no scaffold by design) and aiplugin-dev
  (contract not yet released).
upstream_feat: FEAT-161 (hero-crew)
upstream_commit_slice_a: b31ca77 (2026-06-11) — HARD OUTPUT CONTRACT block in lead/builder/reviewer/validator prompts
upstream_commit_slice_b: 83fb35e (2026-06-11) — stub-artifact pattern (write --scaffold or --status in-progress first, --update at end); SHIPPED in released 0.47.0 for reviewer/validator only, builder path redesigned to skip artifact-writing entirely
upstream_pr_aiplugin_dev: dev-team PR #150 (merged to dev-team main 2026-07-02) — extends scaffold contract to aiplugin-dev agents; NOT YET in a released crew version as of 0.47.0
loop_tracking_feat: FEAT-176 / SLICE-134 (partial close 2026-07-02 — see residual tracking row below)
loop_related_slice: SLICE-87 (observed 3 pauses), SLICE-51..57 (original 2026-06-06 repro), SLICE-95..96 (devcrew:lead coverage 2026-06-11), SLICE-134 (partial closeout)
related_sop: docs/sop/specialist-pause-handling.md
last_updated: 2026-07-02
---

> **Partially resolved 2026-07-02 via FEAT-176/SLICE-134.** Option 2
> (front-loaded stub) shipped in released crew 0.47.0 for
> `devcrew:inspector` / `devcrew:verifier` only; loop re-pinned
> `MIN_CREW_VERSION` to 0.47.0 and narrowed the SOP's manual-fallback
> retirement to those two roles. Builder-tier closed the same gap via a
> different mechanism (no artifact step at all). `aiplugin-dev` coverage
> (dev-team PR #150) is merged upstream but **not yet released** — the
> SOP manual fallback stays active for it; see the residual tracking row
> below for the next re-pin trigger. Option 1 (harness re-prompt /
> `incomplete: true` signal) remains unimplemented.

# Upstream-request: specialist-dispatch completion enforcement (builder / reviewer / validator)

## Filed against

- **Plugin:** hero-crew (`astra/crew/<version>`)
- **Component:** the agent-dispatch loop / agent prompts for `devcrew:fullstack-dev`, `devcrew:frontend-dev`, `devcrew:backend-dev`, `devcrew:inspector`, `devcrew:verifier`.
- **Reason:** the dispatch loop and specialist agent definitions live in hero-crew, not loop. Loop tracks the request for visibility and applies the `specialist-pause-handling.md` SOP as a workaround.

## Problem

Specialist dispatches via `Agent({ subagent_type: "devcrew:fullstack-dev" | "devcrew:inspector" | "devcrew:verifier" })` regularly **pause mid-investigation and return without completing the mandatory `write-handoff` / `write-review-result` / `write-validation-result` step**. The parent receives partial results; no artifact path is recorded, so the gate is unresolved.

This is **structural, not instructional**. The dispatch exits in two modes:

1. **Voluntary tool-less exit**: The specialist emits a next-step narration turn (e.g. _"Let me check the auto command:"_) with no tool call attached. The agentic loop's standard termination condition is "model returned an assistant message containing no tool call," so the loop reads this as the final answer and returns — even though the agent intended to continue.

2. **Hard mid-tool-use termination**: The specialist is cut while actively working, with its final message being a `tool_use` block (e.g. executing `npm test`) still pending execution (`stop_reason: null`). The dispatch harness terminates the thread before the tool completes or before the agent can emit its artifact step.

In both cases, because the `write-*` artifact step is positioned LAST in the intended flow, the dispatch ends before it fires.

## Evidence

Observed across ≥9 slices in two sessions:

| Session    | Slices                  | Roles that paused                                              |
| ---------- | ----------------------- | -------------------------------------------------------------- |
| 2026-06-06 | SLICE-51..57 (6 slices) | reviewer ×2, builder ×5, validator ×4 (parent wrote artifacts) |
| 2026-06-10 | SLICE-87                | builder ×2, reviewer ×1 — all ended mid-sentence, no artifact  |

SLICE-87 verbatim final turns (each is a preamble to a tool call that never fired):

- builder #1: `"Let me check the auto command:"`
- builder #2: `"Let me check `.claude/loop.json` is properly fixed first:"`
- reviewer: `"Let me spot-check by looking at the AC-4 integration test:"`

**Prompt-level mitigation already proven insufficient.** On SLICE-87 every dispatch prompt included an explicit hard rule: _"Your FINAL action MUST be writing the artifact … Do NOT end on narration."_ All three still paused. Instructions do not gate the loop's exit condition.

**Turn-economy contributor.** Long dispatches burn budget on redundant gate re-runs. In session d2294cf4 (2026-06-10):

- builder (agent-a569): 76 turns, ran `npm test` ×6 (~78s each, ~468s total). Frontmatter `maxTurns: 40`; actual turns ~190% of cap.
- reviewer (agent-a721): 92 turns, ran `npm test` ×3 + `git show` ×18 (repeated file inspection). Frontmatter `maxTurns: 35`; actual turns ~263% of cap.

These redundancies suggest specialists lack guidance to converge and emit their report. When the dispatch does finally pause, the paused specialist consumes a replacement dispatch (builder resend: 37 turns, completed cleanly), amplifying cost.

**`maxTurns` is not the binding constraint.** The Agent-tool dispatches that paused had frontmatter `maxTurns` caps (builder: 40, reviewer: 35) yet ran ~2× their limit (76 and 92 turns respectively). This confirms the doc's "structural, not tunable" thesis: raising `maxTurns` will not prevent pauses or mid-tool kills. The binding constraint is the agentic loop's termination condition (tool-less exit) and the harness's hard timeout (mid-tool kill), not the prompt's turn limit.

## Requested behavior (one of)

**Option 1 — completion enforcement in the dispatch harness (preferred, self-healing).**
A specialist dispatch is not "complete" until an artifact path has been recorded. When a voluntary tool-less exit occurs without an artifact, the harness re-prompts the agent once:

> `You returned without writing your required artifact. Your next action MUST be the write-handoff / write-review-result / write-validation-result tool call. Do not return text without it.`

Re-prompt fires on voluntary tool-less exits only (Option 2 handles hard mid-tool terminations). If the agent still exits without an artifact after the single re-prompt, surface that to the parent as an explicit `dispatch_incomplete` signal (not a silent partial success).

**Option 2 — front-loaded artifact (degrades gracefully).**
Have specialists write a _stub_ artifact early (status `in-progress`) and update it at the end. A premature exit then leaves a landed (partial) artifact the parent can detect and finish, instead of nothing.

Option 1 is the real fix; Option 2 is a cheaper partial mitigation.

## Suggested ACs for hero-crew implementation

- **AC-1**: dispatch harness records whether a `write-handoff` / `write-review-result` / `write-validation-result` ran during the dispatch.
- **AC-2**: on a voluntary tool-less termination with no artifact recorded, harness injects exactly one re-prompt instructing the agent to write the artifact now. (Hard mid-tool-use terminations are handled by AC-7 stub artifact.)
- **AC-3**: if the re-prompted turn writes the artifact, dispatch returns success with the artifact path.
- **AC-4**: if the re-prompt still yields no artifact, the dispatch result carries an explicit `incomplete: true` / `artifactPath: null` flag so the parent never mistakes narration for a passed gate.
- **AC-5**: re-prompt fires at most once (no infinite loop); count the re-prompt against the dispatch budget.
- **AC-6**: tests cover: normal completion (no re-prompt), tool-less exit → re-prompt → artifact written → success, tool-less exit → re-prompt → still no artifact → `incomplete: true`.
- **AC-7**: at ~80% of the agent's turn budget, dispatch harness injects a wrap-up nudge: _"You are approaching your turn limit. Finish your investigation and emit your artifact now."_ Encourages specialists to converge and write their report before budget exhaustion causes hard termination.
- **AC-8** (prerequisite for Option 2): builder self-writes its handoff artifact (today: lead writes builder handoff). Option 2's stub artifact implies a ownership change — only the specialist can write mid-work state if it may be interrupted. Decide whether builder becomes responsible for its own handoff before implementing front-loaded stubs.

## Loop-side workaround (in place today, not a substitute)

`docs/sop/specialist-pause-handling.md`: parent verifies the artifact landed after every dispatch (`ls -t .claude/artifacts/crew/{handoffs,reviews,validations}/*<slice-id>*`); on a miss, parent either writes the artifact inline (Option A) or marks a skip badge with a structured rationale note (Option B). This is manual, costs parent tokens, and does not scale — on SLICE-87 it cost ~150k tokens across 3 dead dispatches and pushed slice cost to $43.49 (184% over median).

## Tracking

| Date       | Event                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-10 | Filed (this doc) — pattern persisted past the SOP's 5-slice threshold (now ≥9 slices)                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-06-11 | Amended — `devcrew:lead` added (orchestrator pauses on SLICE-95 + SLICE-96); AC-9 + AC-10 added                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-06-11 | Loop-side local prototype mitigation landed at loop commit `2c41272` then reverted at `a9fde62` after user pushback on bloat — replaced by upstream fix below                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-06-11 | **Upstream FEAT-161 filed against hero-crew** at `.claude/artifacts/loop/backlog/pending/FEAT-161.md` (hero-crew repo); SLICE-A landed at hero-crew commit `b31ca77` — HARD OUTPUT CONTRACT block inserted into `agents/{lead,builder,builder-be,builder-fe,reviewer,validator}.md` immediately after each identity section                                                                                                                                                                                                                          |
| 2026-06-11 | **SLICE-B landed** at hero-crew commit `83fb35e` — stub-artifact pattern in builder/reviewer/validator prompts. Builders run `write-handoff --status in-progress --confidence low` as first action; reviewers/validators run `write-{review,validation}-result --scaffold` as first action. All run `--update <stub-path>` as last action with final verdict. Mid-run pause now leaves a detectable stub. Built on existing CLI flags (`--update`, `--scaffold`); no `scripts/crew.ts` changes required. Tests: 690/690 pass (full hero-crew suite). |
| TBD        | SLICE-C (FEAT-161, optional): instrument `crew write-*` to emit structured "artifact updated from pending" log so parent distinguishes normal completion from stub promotion. Defer until observed parent-side detection ambiguity.                                                                                                                                                                                                                                                                                                                  |
| 2026-07-02 | dev-team PR #150 merged to dev-team main — scaffold contract extended to aiplugin-dev agents, but not yet in a released crew version                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-07-02 | **Partial close (SLICE-134).** Verified installed crew 0.47.0: scaffold contract shipped for `devcrew:inspector`/`devcrew:verifier` only (`agents/{inspector,verifier}.md`); builder-tier closed the gap differently (no handoff artifact at all — `agents/{frontend,backend,fullstack}-dev.md`); `aiplugin-dev` still pauses today per `pause-events.jsonl` (2026-07-02, FEAT-204/205/208/209/210/211/212/213/214) since PR #150 is unreleased. Loop bumped `MIN_CREW_VERSION` to `0.47.0` to pick up the inspector/verifier fix; narrowed SOP §2 retirement to inspector/verifier dispatches only, keeping manual fallback ACTIVE for builder-tier and aiplugin-dev. `status:` set to `partial` above.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| TBD        | **Residual — next crew release re-pin.** When a crew release ships the aiplugin-dev contract (dev-team PR #150), re-pin `MIN_CREW_VERSION` to that version, retire SOP §2 for aiplugin-dev, and re-evaluate whether `status:` can move to `merged`. Builder-tier's no-artifact design is expected to be permanent — that row of this request is considered resolved-by-different-mechanism, not pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
