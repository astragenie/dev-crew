---
id: FEAT-240
status: done
priority: P1
category: bug
target_release: null
created: 2026-07-08
updated: 2026-07-08
closed: 2026-07-08
depends_on: []
slices: []
derived_from: null
tags: [concern:reliability, area:dispatch, area:review-gate, cross-plugin]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: null
triage_notes: "Filed 2026-07-08. Verified in source: post-builder-fanout.mts:35 + :125 emit structured subagent_type: \"crew:inspector\", which no longer resolves — crew (dev-team) renamed the agent to crew:reviewer (2026-06-30-reviewer-rename-design.md). Every loop-driven review dispatch hits a phantom agent. validate-agent-refs.mts:129 allowlists the bare name \"inspector\", so the CI gate that was built to catch exactly this class (astragenie/runner-plugin#371 phantom crew:builder) does NOT flag it — cross-plugin rename gap."
---
## Description

Crew (dev-team) renamed its review agent `crew:inspector` -> `crew:reviewer`
(dev-team `2026-06-30-reviewer-rename-design.md`). runner-plugin still emits and
documents `crew:inspector` in multiple places, so every loop-driven review
dispatch targets a **phantom** subagent.

**Verified live in source (structured dispatch payload — highest severity):**
- `src/scripts/lib/post-builder-fanout.mts:35` — `subagent_type: "crew:inspector"` (type)
- `src/scripts/lib/post-builder-fanout.mts:125` — `subagent_type: "crew:inspector" as const` (the emitted reviewer-ladder task)

**Prose dispatch instructions (also wrong, lower severity — they are text the
parent loop reads):**
- `src/scripts/loop.mts:688`
- `src/scripts/lib/slice-linker/dispatch.mts:127,134,137,140`
- `src/scripts/lib/slice-linker/start-slice.mts:612`
- `commands/start.md:84,110,111`

**Why the CI gate misses it:** `src/scripts/validate-agent-refs.mts:129`
allowlists the bare name `"inspector"`. The gate (built for astragenie/runner-plugin#371,
the phantom `crew:builder`) resolves `crew:<name>` against a static known-name
set; `inspector` is in that set, so no dispatch of `crew:inspector` is ever
flagged. The set is a **local** list — it cannot see that crew renamed the
agent out from under loop. This is the cross-plugin name gap.

`crew:verifier` is NOT affected — it still exists in the crew agent registry.
Audit `crew:validator` references separately (CLAUDE.md HARD RULES mention it;
the crew registry exposes `crew:verifier`, not `crew:validator`).

## Acceptance criteria
- AC-1: Given the reviewer ladder fires, When `post-builder-fanout.mts` emits a review task, Then `subagent_type` is `crew:reviewer` (not `crew:inspector`), and a test asserts the emitted payload's agent name resolves to a real crew agent.
- AC-2: All prose dispatch-instruction strings (`loop.mts`, `dispatch.mts`, `start-slice.mts`, `commands/start.md`) say `crew:reviewer`, not `crew:inspector`.
- AC-3: `validate-agent-refs.mts` no longer allowlists a stale `inspector` bare name; the known-name set is reconciled against the crew agent registry so a future crew rename fails CI instead of silently dispatching a phantom (root-cause fix, not just a find/replace). If the registry cannot be read cross-plugin, document the limitation and, at minimum, drop `inspector` from the allowlist so `crew:inspector` is flagged.
- AC-4: `grep -rn "crew:inspector" src/ commands/` returns zero matches (docs/specs/CHANGELOG historical references may remain).

## Notes
Root cause is the absence of a shared, authoritative agent/skill name registry
across plugins (crew, runner, plugins-common). See the follow-up discussion on a
common-repo agent/skill manifest that `validate-agent-refs` could resolve
against instead of a hand-maintained local allowlist.
