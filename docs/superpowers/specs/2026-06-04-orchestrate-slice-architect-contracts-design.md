# `/crew:orchestrate-slice` command with architect-owned contracts — design

**Status**: draft
**Date**: 2026-06-04
**Owner**: loop maintainer
**Affects**: hero-crew `commands/` (new), loop `commands/slice-start.md`, loop `src/scripts/lib/slice-linker/dispatch.mts`, slice frontmatter schema (optional fields)
**Supersedes**: `2026-06-04-tool-restricted-lead-orchestrator-design.md` (lead-subagent approach hides child dispatches from the main window; user requires window visibility)

## Summary

Add a new `/crew:orchestrate-slice` command whose body IS the specialist ladder. The command runs in the main loop window, so every specialist dispatch is visible to the user. The ladder is conditional on slice tags: when a slice touches contracts (frontend + backend, new public API, new provider, cross-module refactor), the command dispatches `crew:architect` first to produce a canonical contract artifact, then dispatches downstream specialists (builder, uxdesigner, reviewer, validator, copywriter, docwriter) with the architect's contract path injected into each prompt.

## Why

Two problems with the current loop-dispatches-builder model:

1. **Specialist coverage gap** — audit of last 10 completed slices shows 6/10 would have benefited from at least one specialist beyond builder/reviewer/validator. Architect coverage was the biggest gap (4/10 slices touched new contracts with no architect pass).
2. **Window visibility** — the prior design (tool-restricted lead subagent) hides child specialist dispatches from the main window. Subagents encapsulate their tool calls. User requires every dispatch visible to the main thread for auditing, debugging, and trust.

A state-machine command in the main thread solves both: every Agent tool call surfaces in the window; the ladder is deterministic markdown logic, not lead judgment.

Architect-owned contracts solve a third problem: when uxdesigner and builder work the same slice, they need a shared interface to converge on. Free-form spec coordination drifts. Architect produces a canonical contract artifact (TS interfaces, API shapes, event schemas, data contracts) that both downstream specialists read.

## Mental Model

```
loop session (main thread, user sees every dispatch)
  ├─ /loop:slice start --id SLICE-NN
  ├─ /crew:orchestrate-slice --id SLICE-NN
  │     ├─ Step 0: read slice frontmatter, classify slice
  │     ├─ Step 1: IF needs_contract → dispatch crew:architect
  │     │           → writes designs/SLICE-NN-contracts.md
  │     ├─ Step 2: IF needs_ux → dispatch crew:uxdesigner (reads contracts)
  │     │           → writes designs/SLICE-NN-ux.md
  │     ├─ Step 3: dispatch crew:fullstack-dev (reads contracts + ux spec)
  │     │           → writes code, returns handoff
  │     ├─ Step 4: dispatch crew:inspector (reads contracts + diff)
  │     │           → checks conformance, writes review-result
  │     ├─ Step 5: IF behavior_changed → dispatch crew:verifier
  │     ├─ Step 6: IF release_content → dispatch crew:copywriter
  │     ├─ Step 7: IF docs_needed → dispatch crew:document-writer
  │     └─ Step 8: write-final-synthesis
  └─ /loop:slice complete --id SLICE-NN
```

All dispatches happen from the main thread. User sees `Agent(crew:architect)`, `Agent(crew:fullstack-dev)`, etc. as separate tool calls in their UI. Each specialist's child subagent context is isolated; their tool calls hide inside their own context, but the dispatch itself + the returned handoff path are fully visible.

## Components

- **`commands/orchestrate-slice.md`** (hero-crew). New command. Body contains the state-machine ladder. Reads slice file, classifies, dispatches each specialist in sequence with conditional logic + explicit prompts. The command itself is the orchestrator; no lead subagent involved.
- **Slice frontmatter schema** (loop). Optional fields read by the command:
  - `needs_contract: bool` — explicit override; when true, architect runs even if tags don't suggest it
  - `needs_ux: bool` — explicit override; when true, uxdesigner runs
  - `skip: [architect, uxdesigner, copywriter, docwriter]` — explicit opt-out for slices PM has triaged as not needing specialists
  - Defaults: heuristics from `tags:` array (e.g., `frontend` + `backend` → needs_contract; `frontend` → needs_ux)
- **`commands/slice-start.md`** (loop). Emit `/crew:orchestrate-slice --id SLICE-NN` as the dispatchInstruction. The current four-step "dispatch builder → reviewer → validator → close" guidance collapses to one step: invoke the orchestrate command.
- **`src/scripts/lib/slice-linker/dispatch.mts`** (loop). Emit the orchestrate-command invocation instead of a subagent dispatch text.
- **`src/scripts/lib/slice-linker/start-slice.mts`** (loop). `computeNextAction` returns "Run /crew:orchestrate-slice --id ${sliceId}; close with /loop:slice complete --id ${sliceId}."
- **`src/scripts/loop.mts`** (loop). Architect command output references the orchestrate flow.
- **Architect contract artifact convention**. Architect writes to `.claude/artifacts/crew/designs/<slice>-contracts.md`. Schema (required sections):
  - `## TypeScript Interfaces` (when applicable)
  - `## API Contracts` (HTTP routes, request/response shapes)
  - `## Event Schemas` (when async/event-based)
  - `## Data Contracts` (DB tables, message payloads)
- **Tests**. `src/tests/orchestrate-slice.test.mts` covers: ladder execution order, conditional skip, frontmatter override, missing slice file handling, architect-contract path propagation.

## How It Works Together

1. User runs `/loop:slice start --id SLICE-NN`. Loop returns a dispatchInstruction containing the literal command invocation `/crew:orchestrate-slice --id SLICE-NN`.
2. User (or autonomous loop) runs the orchestrate command. The command markdown is loaded into the main thread.
3. Command Step 0: read slice file via `Read`, parse frontmatter, classify slice (needs_contract, needs_ux, behavior_changed, release_content, docs_needed). Classification combines explicit frontmatter overrides with tag heuristics.
4. Command Step 1: IF `needs_contract`, the main thread dispatches `crew:architect` via the `Agent` tool with a prompt naming the slice + the required contract sections + the output path. Architect runs in its own subagent context, writes `designs/<slice>-contracts.md`, returns the path. Main thread reads the path.
5. Command Step 2: IF `needs_ux`, main thread dispatches `crew:uxdesigner` with the contract path injected into the prompt. UXdesigner reads the contract, produces UI spec at `designs/<slice>-ux.md`.
6. Command Step 3: main thread dispatches `crew:fullstack-dev` with contract path + ux spec path. Builder implements code per both. Returns handoff artifact path.
7. Command Step 4: main thread dispatches `crew:inspector` with contract path + builder handoff path + diff. Reviewer checks code conforms to contract.
8. Command Steps 5-7: conditional dispatches for validator, copywriter, document-writer.
9. Command Step 8: main thread writes final synthesis via `scripts/crew.mjs write-final-synthesis`, referencing every child handoff path.
10. User runs `/loop:slice complete --id SLICE-NN`. Loop closes the slice based on the synthesis.

## Key Technical Decisions

- **Command body holds the ladder, not an agent**. Markdown is the source of truth for orchestration. Easier to audit, easier to test, deterministic. Agent judgment is unreliable for routing across many slices.
- **Architect runs first when contracts needed**. Resolves uxdesigner-vs-builder interface drift. Architect owns the interface; both downstream specialists implement against it. Reviewer enforces conformance.
- **Slice frontmatter overrides + tag heuristics**. PM may already know a slice needs architect (sets `needs_contract: true` at triage). Tags handle the unannotated case. Explicit `skip:` field lets PM opt out of architect for pure-plumbing slices that touch a tag but don't need a contract.
- **Architect contract artifact has a fixed schema**. Required sections — TS Interfaces, API Contracts, Event Schemas, Data Contracts — even if empty. Predictable structure for downstream agents to grep.
- **No lead subagent**. Lead remains the entry point for `/crew:build` standalone (non-slice work). For slice work, the orchestrate command replaces it. lead.md unchanged.
- **No new hooks**. Command-level dispatches are already visible. Advisory hooks defer until real misses appear.
- **Each Agent call is a separate top-level subagent**. No nesting through lead. Each specialist context is independent. Matches today's loop-direct-dispatch isolation.

## Edge Cases

- **Slice with no relevant specialists beyond builder + reviewer**. ~40% of slices per audit. The command's classification step yields `{ needs_contract: false, needs_ux: false, ... }`; only steps 3 (builder), 4 (reviewer), 5 (validator if behavior changed) fire. Same shape as today, no overhead penalty.
- **Architect produces an incomplete contract**. Builder reads contract, finds gaps, returns a `help_request` in its handoff. Main thread reads handoff, decides: re-dispatch architect with the gap question, OR proceed and accept the gap (rare). The state-machine command doesn't need a feedback loop branch — main thread handles via standard handoff inspection.
- **UXdesigner and builder disagree on a contract detail**. Both read the same architect contract; if either flags a conflict, they emit `help_request`. Main thread escalates by re-dispatching architect to revise the contract. Cycle bounded by the existing `marathonMode` cost cap.
- **PM mis-tags a slice**. e.g., slice tagged `backend` only but actually adds a new HTTP route the frontend will consume. The command classifies as no-contract-needed. Mitigation: reviewer reads diff and can flag missing architect pass in its review-result. Loop's existing `escalated_to_human` badge surfaces it.
- **Architect already ran in a prior slice for related work**. Re-running produces near-duplicate contract artifact. Mitigation: architect prompt includes "check `designs/` for prior contracts in the same FEAT, extend or reference rather than re-author."
- **Concurrent slice runs (`team run` mode)**. Out of scope. Single-slice orchestrate today; concurrent slices use existing crew claim primitives.

## Fail Modes

- **Command markdown drifts from `agents/lead.md` routing intent**. Two sources of truth for "which specialist for which work". Mitigation: command body cites lead.md routing table by reference, doesn't restate. Reviewer for command-body edits checks against lead.md.
- **Architect contract is wrong**. Builder implements per wrong contract. Mitigation: validator catches behavior mismatch; reviewer catches contract-vs-diff mismatch. If both miss, that's the same blast radius as a bad architecture decision today.
- **Conditional logic in command body becomes complex and hard to audit**. Mitigation: keep classification step as a single block of decisions at Step 0; downstream steps are flat "IF flag THEN dispatch agent X" — no nested branching.
- **Architect subagent doesn't exist or fails to load**. The architect agent already ships in hero-crew. Bump `MIN_CREW_VERSION` to current crew release; loop's `/loop:install` will refuse against older crew that lacks the orchestrate command.
- **User wants to run a slice WITHOUT orchestration** (debugging, manual control). Mitigation: `/loop:slice start --no-dispatch` already exists; the user can then dispatch agents directly without the orchestrate command.

## What Working Properly Means

- Running `/crew:orchestrate-slice --id SLICE-NN` in a test repo produces visible Agent tool calls in the main window for each dispatched specialist
- Architect's contract artifact at `.claude/artifacts/crew/designs/<slice>-contracts.md` contains the four required sections
- Builder's prompt includes the contract path; builder's completion handoff cites the contract path in `evidence`
- Reviewer's review-result includes a "conformance to contract" check
- A slice with `{ needs_contract: false, needs_ux: false }` runs only builder + reviewer + validator (when behavior changed); no extra dispatches
- A slice with `{ needs_contract: true, needs_ux: true }` runs architect → uxdesigner → builder → reviewer → validator → copywriter (if release tag) in sequence, visible in window
- Cost telemetry per slice shows architect overhead as a separate line item

## What Done Means

- [ ] `hero-crew/commands/orchestrate-slice.md` written with the state-machine ladder
- [ ] Architect contract artifact schema documented in `hero-crew/agents/architect.md` (Deployment guidance schema section pattern)
- [ ] Slice frontmatter schema documented in `loop/docs/code-conventions.md` with `needs_contract`, `needs_ux`, `skip` field definitions and tag heuristics
- [ ] `loop/commands/slice-start.md` updated to emit the orchestrate command
- [ ] `loop/src/scripts/lib/slice-linker/dispatch.mts` emits the command invocation text
- [ ] `loop/src/scripts/lib/slice-linker/start-slice.mts` returns updated nextAction
- [ ] `loop/src/scripts/loop.mts` architect command output references orchestrate flow
- [ ] `loop/src/tests/orchestrate-slice.test.mts` written and passing — classification logic, ladder execution order, conditional skip, frontmatter override
- [ ] Existing loop tests updated for new dispatchInstruction regex
- [ ] Existing hero-crew tests pass unchanged
- [ ] `loop/scripts/lib/plugin-identity.mjs::MIN_CREW_VERSION` bumped to the crew release shipping the orchestrate command
- [ ] One real autonomous slice run completes end-to-end through the orchestrate command, producing the full ladder of artifacts for a contract-bearing slice
- [ ] PM agent prompt updated to set `needs_contract` / `needs_ux` during triage based on FEAT description (separate slice; not blocking this one)

## Open Questions

- Should classification logic live in the command markdown (Bash + grep against frontmatter) or in a new CLI subcommand on `scripts/crew.mjs classify-slice` (returns JSON the command reads)? Markdown is simpler; CLI is testable.
- Architect contract artifact: one file per slice, or one per FEAT (slices in same FEAT share)? Per-slice is simpler; per-FEAT reduces duplication but requires architect to extend prior contracts.
- Should reviewer's review-result schema add a required `Contract Conformance` section? Or trust the reviewer's free-form narrative to call out mismatches? Structured field is more auditable.
- How does the orchestrate command interact with `dev.stable: true` auto-commit policy? Auto-commit should fire AFTER step 8 synthesis if all gates green. Confirm the existing build.md auto-continue logic flows here too.

## Visuals

```
Before (today):
loop ─dispatch─> crew:fullstack-dev
              ─dispatch─> crew:inspector
              ─dispatch─> crew:verifier (if behavior changed)
              ─close───> /loop:slice complete
(only builder/reviewer/validator ever fire; specialists missed on 60% of slices)

After (this design):
loop ─dispatchInstruction: /crew:orchestrate-slice --id SLICE-NN
       │
       └─ main thread runs orchestrate command body
              ├─ classify slice
              ├─ IF needs_contract  → Agent(crew:architect)   ─writes─> designs/<slice>-contracts.md
              ├─ IF needs_ux        → Agent(crew:uxdesigner)  ─reads contract, writes─> designs/<slice>-ux.md
              ├─                      Agent(crew:fullstack-dev)     ─reads contract + ux spec, implements─> handoff
              ├─                      Agent(crew:inspector)    ─reads contract + diff, conformance check─> review-result
              ├─ IF behavior_changed → Agent(crew:verifier)
              ├─ IF release_content  → Agent(crew:copywriter)
              ├─ IF docs_needed      → Agent(crew:document-writer)
              └─                       write-final-synthesis
       │
       └─ /loop:slice complete
       (every dispatch visible to user; architect-owned contract is shared spec for ux + builder)

Slice classification heuristics (defaults, overridable via frontmatter):
  tags include "frontend" AND "backend"          → needs_contract = true,  needs_ux = true
  tags include "frontend" only                    → needs_contract = false, needs_ux = true
  tags include "backend" only + new public API   → needs_contract = true,  needs_ux = false
  tags include "infra-feature" + new provider    → needs_contract = true,  needs_ux = false
  tags include "competitor-gap" with UI surface  → needs_contract = true,  needs_ux = true
  tags include "tests-only" or "plumbing"        → needs_contract = false, needs_ux = false  (builder-only)
```
