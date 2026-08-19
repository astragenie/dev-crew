# Tool-restricted devcrew:lead subagent orchestrator — design

**Status**: draft
**Date**: 2026-06-04
**Owner**: loop maintainer
**Affects**: hero-crew `agents/lead.md`, loop `commands/slice-start.md`, loop `src/scripts/lib/slice-linker/dispatch.mts`

## Summary

Replace the current loop-drives-builder-directly dispatch with a `devcrew:lead` subagent that orchestrates every specialist a slice needs (builder, reviewer, validator, uxdesigner, copywriter, architect, docwriter). Enforce lead's "router only" boundary mechanically by restricting its `tools:` frontmatter to read-and-coordinate only — no `Edit`, no `Write`, no `NotebookEdit`. Lead routes via the static table already in `agents/lead.md`; each specialist runs in its own child subagent context.

## Why

Audit of the last 10 completed slices shows 6/10 would have meaningfully benefited from at least one specialist beyond builder/reviewer/validator. Architect coverage is the biggest gap (4/10 slices touched new contracts or cross-module refactors but never ran architect). The current loop-dispatches-builder model is fast on backend-only slices but systematically misses UX, design-doc, and release-content work.

Putting `devcrew:lead` back in the dispatch path restores specialist coverage. Tool restriction is the mechanism that prevents lead from regressing into "lead does it itself" — without it, lead has historically been tempted to edit code or write release notes inline, defeating the orchestration intent.

## Mental Model

```
loop session (Claude main thread)
  ├─ /loop:slice start --id SLICE-NN  → emits dispatchInstruction
  └─ dispatches devcrew:lead subagent  (fresh context, tool-restricted)
        ├─ reads slice file + feature excerpt (Read)
        ├─ applies lead.md static routing table by tag + file group
        ├─ dispatches devcrew:architect child subagent IF new contract/refactor
        ├─ dispatches devcrew:fullstack-dev child subagent for implementation
        ├─ dispatches devcrew:inspector child subagent for review gate
        ├─ dispatches devcrew:verifier child subagent IF behavior changed
        ├─ dispatches devcrew:uxdesigner child subagent IF UI surface touched
        ├─ dispatches devcrew:copywriter child subagent IF release content
        ├─ writes final synthesis artifact
        └─ returns synthesis path to loop
  └─ /loop:slice complete --id SLICE-NN
```

Each child subagent has fresh context. Lead reads each child's handoff artifact from disk, never inlines child output into its own window. Lead's window grows linearly with number of child specialists, not multiplicatively.

## Components

- **`agents/lead.md` frontmatter change** (hero-crew). Add explicit `tools:` array: `[Read, Grep, Glob, Bash, Agent, TaskCreate, TaskUpdate]`. Drop `Edit`, `Write`, `NotebookEdit`. Body unchanged — existing static routing table at lines 67-125 and lead-only/do-not-delegate block at line 248 already match the orchestrator role.
- **`commands/slice-start.md` body** (loop). Doc update — replace `devcrew:fullstack-dev` dispatch language with `devcrew:lead`. JSON example updated. Post-action steps shrink from four to two (dispatch lead, then close).
- **`src/scripts/lib/slice-linker/dispatch.mts`** (loop). Change `Dispatch devcrew:fullstack-dev subagent` → `Dispatch devcrew:lead subagent`. Replace the "implementation only, parent loop drives gates" prompt with "orchestrate per agents/lead.md routing table — dispatch architect/builder/reviewer/validator/uxdesigner/copywriter/docwriter as needed". Remove the builder-only scope sentence.
- **`src/scripts/lib/slice-linker/start-slice.mts`** (loop). `computeNextAction` returns "Dispatch devcrew:lead subagent for ${sliceId}; close with /loop:slice complete --id ${sliceId}." Two steps instead of four.
- **`src/scripts/loop.mts`** (loop). Architect command output references `devcrew:lead` instead of `devcrew:fullstack-dev`.
- **`src/tests/slice-linker.test.mts`, `src/tests/slice-start.test.mts`** (loop). Regex updates — match `Dispatch devcrew:lead subagent`.

## How It Works Together

The loop session never sees specialist work directly. It sees one subagent (devcrew:lead), gets one synthesis path back, then closes the slice. All routing decisions and specialist coordination happen in the lead subagent context, which is fresh per slice and tool-restricted.

Lead's static routing table (already in `agents/lead.md` lines 67-125) is the canonical decision logic. The table maps output type → specialist:

- ADR / system design / database schema / API contract → architect
- UI flow / component hierarchy / accessibility spec → uxdesigner
- API docs / release notes / README polish → copywriter
- Code change → builder

Lead reads slice frontmatter `tags:` plus the file groups it audits in the slice content. When multiple groups exist, lead splits and dispatches in parallel via a single message with multiple Agent tool calls (per the existing decomposition rule at lead.md lines 74-88).

## Key Technical Decisions

- **Tool restriction over prompt instruction**. Telling lead "do not edit code" is weaker than removing the Edit tool. Mechanical enforcement beats prompt enforcement every time.
- **Lead routes by existing table**, not by new frontmatter field. The `needs:[...]` per-slice schema (considered in brainstorming Option B) is rejected — would duplicate lead.md routing logic into PM agent scoring, drift risk.
- **Child subagents are siblings, not nested**. Each Agent tool call from lead creates a child subagent. The children's context isolation matches what loop achieves today by dispatching builder directly. No regression on isolation.
- **Loop drops its own review/validate dispatch logic**. That logic was added in the prior session when loop bypassed lead. With lead back in the loop, it owns gates. `commands/slice-complete.md` no longer needs to verify review/validation badges — lead's synthesis vouches for them.
- **No hook layer yet**. PostToolUse advisory hooks were discussed (brainstorming Option C). Defer until real misses appear in production. Adding hook surface increases moving parts without confirmed need.

## Edge Cases

- **Lead crashes mid-orchestration**. Whole slice stalls. Loop's existing escalation path (mark `escalated_to_human` badge) still applies — loop can detect a lead subagent timeout / error and badge accordingly. Same blast radius as a builder crash today.
- **Lead skips a specialist that should have fired**. Mitigation: loop's `devcrew:inspector` (still dispatched independently in `/loop:slice complete --review` flow if we keep one) can flag missing artifacts. Or accept that lead is the authority and trust its routing. Decision: trust lead by default; revisit if misses observed.
- **Slice with no relevant specialists beyond builder** (4/10 in audit). Lead still dispatches but only spawns builder + reviewer + validator. The tax is one extra subagent layer. Cost ≈ +10-20% turn budget on those slices.
- **Backward compatibility with in-flight slices**. SLICE-36 is in-progress. Should land this change after SLICE-36 closes to avoid mid-slice contract switch.
- **`/devcrew:build` standalone (non-loop) entry point**. Unchanged — `commands/build.md` already drives lead in single-session mode. The tool restriction applies there too, and lead.md is already designed for that flow.

## Fail Modes

- **Lead misroutes scope to wrong specialist**. User sees a weak handoff artifact — same as today when builder takes on uxdesigner work. Recoverable: re-dispatch with corrected prompt.
- **Tool restriction breaks legitimate lead Read/Bash needs**. Mitigation: keep `Read`, `Grep`, `Glob`, `Bash` in the tools array. Lead can still inspect repo state, run wake-up, mark badges, write run brief, write synthesis (the synthesis writer uses `Bash` to call `scripts/crew.mjs write-final-synthesis`, not `Write`).
- **Lead grows context reading too many child handoffs**. Lead is supposed to read each artifact via `Read` tool. For very large multi-specialist slices, lead context could approach compaction. Mitigation: artifact paths only in inline returns (already the contract per existing handoff protocol).
- **`devcrew:lead` subagent doesn't exist in user's installed version**. Hard dependency. Loop's `MIN_CREW_VERSION` already pins crew version; bump it for this change.

## What Working Properly Means

- Loop slice-start emits a `devcrew:lead` dispatch instruction (not `devcrew:fullstack-dev`)
- A real slice run shows the lead subagent dispatching multiple child subagents per its routing table — verified by inspecting `.claude/artifacts/crew/handoffs/` for child handoff artifacts named after architect/builder/reviewer/validator/uxdesigner/etc as appropriate
- Lead's final synthesis artifact references every child handoff path
- Loop's slice-complete reads lead's synthesis and closes the slice without separately driving review/validate
- Cost telemetry shows lead subagent overhead is +10-20% turn budget on average across a 10-slice sample

## What Done Means

- [ ] `hero-crew/agents/lead.md` frontmatter restricts `tools:` to read-and-coordinate set
- [ ] `loop/commands/slice-start.md` references `devcrew:lead` in body, JSON example, and post-action steps
- [ ] `loop/src/scripts/lib/slice-linker/dispatch.mts` emits `devcrew:lead` dispatch text with orchestration scope
- [ ] `loop/src/scripts/lib/slice-linker/start-slice.mts` `computeNextAction` returns the two-step sequence
- [ ] `loop/src/scripts/loop.mts` architect command output references `devcrew:lead`
- [ ] Loop tests (slice-linker + slice-start) updated to assert the new regex
- [ ] `loop/scripts/lib/plugin-identity.mjs::MIN_CREW_VERSION` bumped to the crew release that ships the lead tool restriction
- [ ] Full loop test suite passes (717+ tests)
- [ ] Hero-crew full test suite passes (287+ tests)
- [ ] One real autonomous slice run completes end-to-end with the new flow, producing child handoffs from at least one non-builder specialist when slice content demands it

## Open Questions

- Should loop's `/loop:slice complete` flow still independently verify review/validation badges as a belt-and-suspenders check, or fully trust lead's synthesis? Default position: trust lead; revisit if any missed-gate incident.
- Cost telemetry should track lead-orchestration overhead as a distinct line item. Existing per-slice cost report aggregates all subagent costs — does it break out by subagent type today? Verify before relying on the +10-20% estimate.
- For slices that are pure plumbing (4/10 in audit), is there value in a `--no-lead` opt-out on `/loop:slice start`? Or always-on lead is acceptable given the small tax? Default: always-on, simpler contract.

## Visuals

```
Before (today):
loop ─dispatch─> devcrew:fullstack-dev
              ─dispatch─> devcrew:inspector
              ─dispatch─> devcrew:verifier (if behavior changed)
              ─close───> /loop:slice complete

After (this design):
loop ─dispatch─> devcrew:lead (tool-restricted: no Edit/Write)
                    ├─dispatch─> devcrew:architect
                    ├─dispatch─> devcrew:fullstack-dev
                    ├─dispatch─> devcrew:inspector
                    ├─dispatch─> devcrew:verifier
                    ├─dispatch─> devcrew:uxdesigner
                    ├─dispatch─> devcrew:copywriter
                    └─writes──> final synthesis artifact
     ─close─> /loop:slice complete (reads lead synthesis only)
```
