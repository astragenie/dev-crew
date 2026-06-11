---
filed: 2026-06-10
target_plugin: hero-crew
target_repo: sergeymilashico/hero-crew
status: pending-upstream-fix
loop_tracking_feat: TBD (assign loop FEAT for visibility)
loop_related_slice: SLICE-87 (observed 3 pauses), SLICE-51..57 (original 2026-06-06 repro), SLICE-95..96 (crew:lead coverage 2026-06-11)
related_sop: docs/sop/specialist-pause-handling.md
last_updated: 2026-06-11
---

# Upstream-request: specialist-dispatch completion enforcement (builder / reviewer / validator)

## Filed against

- **Plugin:** hero-crew (`astra/crew/<version>`)
- **Component:** the agent-dispatch loop / agent prompts for `crew:lead`, `crew:builder`, `crew:builder-fe`, `crew:builder-be`, `crew:reviewer`, `crew:validator`.
- **Reason:** the dispatch loop and specialist agent definitions live in hero-crew, not loop. Loop tracks the request for visibility and applies the `specialist-pause-handling.md` SOP as a workaround.

> **2026-06-11 amendment**: `crew:lead` added to the agent list. Originally scoped to specialists (builder/reviewer/validator); SLICE-95 and SLICE-96 (2026-06-11) repro'd the same voluntary-tool-less-exit pattern on the orchestrator role too. See evidence table below.

## Problem

Specialist dispatches via `Agent({ subagent_type: "crew:builder" | "crew:reviewer" | "crew:validator" })` regularly **pause mid-investigation and return without completing the mandatory `write-handoff` / `write-review-result` / `write-validation-result` step**. The parent receives partial results; no artifact path is recorded, so the gate is unresolved.

This is **structural, not instructional**. The dispatch exits in two modes:

1. **Voluntary tool-less exit**: The specialist emits a next-step narration turn (e.g. *"Let me check the auto command:"*) with no tool call attached. The agentic loop's standard termination condition is "model returned an assistant message containing no tool call," so the loop reads this as the final answer and returns — even though the agent intended to continue.

2. **Hard mid-tool-use termination**: The specialist is cut while actively working, with its final message being a `tool_use` block (e.g. executing `npm test`) still pending execution (`stop_reason: null`). The dispatch harness terminates the thread before the tool completes or before the agent can emit its artifact step.

In both cases, because the `write-*` artifact step is positioned LAST in the intended flow, the dispatch ends before it fires.

## Evidence

Observed across ≥9 slices in two sessions:

| Session | Slices | Roles that paused |
|---|---|---|
| 2026-06-06 | SLICE-51..57 (6 slices) | reviewer ×2, builder ×5, validator ×4 (parent wrote artifacts) |
| 2026-06-10 | SLICE-87 | builder ×2, reviewer ×1 — all ended mid-sentence, no artifact |
| 2026-06-11 | SLICE-95, SLICE-96 | **lead ×2** — orchestrator returned "I'll dispatch the builder directly via the Agent tool now" without calling Agent; parent fell back to direct builder dispatch |

**2026-06-11 SLICE-96 lead pause verbatim final turn**: `"I'll dispatch the builder directly via the Agent tool now:"` — followed by no tool call. Lead had spent 30 tool calls + 8 minutes orchestrating, then exited on a narration preamble. Pattern is identical to specialist pauses: voluntary tool-less termination mid-intent.

SLICE-87 verbatim final turns (each is a preamble to a tool call that never fired):
- builder #1: `"Let me check the auto command:"`
- builder #2: `"Let me check `.claude/loop.json` is properly fixed first:"`
- reviewer: `"Let me spot-check by looking at the AC-4 integration test:"`

**Prompt-level mitigation already proven insufficient.** On SLICE-87 every dispatch prompt included an explicit hard rule: *"Your FINAL action MUST be writing the artifact … Do NOT end on narration."* All three still paused. Instructions do not gate the loop's exit condition.

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
Have specialists write a *stub* artifact early (status `in-progress`) and update it at the end. A premature exit then leaves a landed (partial) artifact the parent can detect and finish, instead of nothing.

Option 1 is the real fix; Option 2 is a cheaper partial mitigation.

## Suggested ACs for hero-crew implementation

- **AC-1**: dispatch harness records whether a `write-handoff` / `write-review-result` / `write-validation-result` ran during the dispatch.
- **AC-2**: on a voluntary tool-less termination with no artifact recorded, harness injects exactly one re-prompt instructing the agent to write the artifact now. (Hard mid-tool-use terminations are handled by AC-7 stub artifact.)
- **AC-3**: if the re-prompted turn writes the artifact, dispatch returns success with the artifact path.
- **AC-4**: if the re-prompt still yields no artifact, the dispatch result carries an explicit `incomplete: true` / `artifactPath: null` flag so the parent never mistakes narration for a passed gate.
- **AC-5**: re-prompt fires at most once (no infinite loop); count the re-prompt against the dispatch budget.
- **AC-6**: tests cover: normal completion (no re-prompt), tool-less exit → re-prompt → artifact written → success, tool-less exit → re-prompt → still no artifact → `incomplete: true`.
- **AC-7**: at ~80% of the agent's turn budget, dispatch harness injects a wrap-up nudge: *"You are approaching your turn limit. Finish your investigation and emit your artifact now."* Encourages specialists to converge and write their report before budget exhaustion causes hard termination.
- **AC-8** (prerequisite for Option 2): builder self-writes its handoff artifact (today: lead writes builder handoff). Option 2's stub artifact implies a ownership change — only the specialist can write mid-work state if it may be interrupted. Decide whether builder becomes responsible for its own handoff before implementing front-loaded stubs.
- **AC-9** (added 2026-06-11): the same enforcement applies to `crew:lead` orchestrator dispatches. Lead's "artifact" is either the next `Agent` tool call (dispatching builder/reviewer/validator) or the `Bash` shell-out to `/loop:slice complete`. Voluntary tool-less exits during orchestration must trigger the same re-prompt path as specialist dispatches.
- **AC-10** (added 2026-06-11): pre-flight mode check option — optional dispatch flag `requireMode: true` causes the harness to inject a minimal probe ("respond with `[MODE] <single-session|assisted-single-session|team-run>`") and confirm a tool-call response before the full prompt body fires. Cheap (<$0.10) catch for specialists/leads that would have paused immediately. Opt-in to avoid double-spend on healthy dispatches.

## Loop-side workaround (in place today, not a substitute)

`docs/sop/specialist-pause-handling.md`: parent verifies the artifact landed after every dispatch (`ls -t .claude/artifacts/crew/{handoffs,reviews,validations}/*<slice-id>*`); on a miss, parent either writes the artifact inline (Option A) or marks a skip badge with a structured rationale note (Option B). This is manual, costs parent tokens, and does not scale — on SLICE-87 it cost ~150k tokens across 3 dead dispatches and pushed slice cost to $43.49 (184% over median).

## Tracking

| Date | Event |
|---|---|
| 2026-06-10 | Filed (this doc) — pattern persisted past the SOP's 5-slice threshold (now ≥9 slices) |
| 2026-06-11 | Amended — `crew:lead` added (orchestrator pauses on SLICE-95 + SLICE-96); AC-9 + AC-10 added; loop-side mitigation landed in `src/scripts/lib/slice-linker/dispatch.mts` (HARD OUTPUT CONTRACT block injected into all dispatchInstructions) + `start-slice.mts` (`expectedHandoff` glob emitted in start-slice result for parent-side artifact detection) |
| TBD | Assign loop FEAT (for autonomous loop visibility); link to `loop_tracking_feat:` frontmatter |
| TBD | Upstream issue / PR opened against `sergeymilashico/hero-crew` |
| TBD | Upstream merged / rejected — update `status:` frontmatter |
| TBD | Cache version bumped → loop session sees the fix → retire SOP §2 manual fallback + loop-side HARD CONTRACT injection |

## 2026-06-11 loop-side mitigations (in place)

Loop applied two prompt-level mitigations that do not require hero-crew changes:

1. **HARD OUTPUT CONTRACT injected into every dispatchInstruction** (`src/scripts/lib/slice-linker/dispatch.mts` — `appendHardOutputContract()`). Both lead-mode and direct-builder-mode prompts now end with:

   > Your LAST tool call before returning MUST be one of: [...]. Returning narration ("I'll now do X", "Let me check Y") without a final tool call is a contract violation.

   Variant-aware: lead gets `Agent` / `Bash slice complete` examples; specialists get `crew write-*` examples. This is prompt-level mitigation only — does not prevent hard mid-tool terminations (Option 2 territory) — but does shift the agent's incentive on voluntary tool-less exits.

2. **`expectedHandoff` glob emitted in start-slice result** (`src/scripts/lib/slice-linker/start-slice.mts`). Parent gets a deterministic `{ dir, glob, sliceSlug, featureSlug }` payload it can use after dispatch to verify the artifact landed. Schema:

   ```json
   { "dir": ".claude/artifacts/crew/handoffs", "glob": "*feat187-slice96*.md", "sliceSlug": "slice96", "featureSlug": "feat187" }
   ```

   Consumers: `slice complete` already detects missing artifacts via its validationGate; the new field gives slice-start and dashboard consumers the same hint pre-completion. Useful when parent wants to poll-and-fail-fast instead of waiting until `slice complete`.

Both mitigations retire automatically once hero-crew lands the harness-level enforcement — the prompt block becomes redundant noise rather than load-bearing.
