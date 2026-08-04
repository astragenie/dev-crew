---
slice: SLICE-184
feature: FEAT-259
kind: review-result
status: completed
decision: approved_with_notes
reviewer: independent (crew:reviewer)
date: 2026-08-04
---

## Summary

Reviewed commit `d805f944` (parent `885d0482`) — the "Final act (mandatory)"
line added to all six owned agents (`agents/{pm,architect,researcher,
market-researcher,document-writer,swarm}.md`). Scope is doc-only, confirmed
via `git show --stat`: only the six agent files plus ceremony artifacts
(handoff, plan, shape-marker, trajectory) changed. No `src/`, `hooks/`,
`scripts/`, `CLAUDE.md`, `AGENTS.md`, or `agents/3rdparty/**` touched.
`bun ./src/scripts/validate-content-length.mts` passes as-is.

## 1. Wording strength

The canonical sentence — "Your plain final text is NOT delivered to the
orchestrator — your last action MUST be `SendMessage(to: 'main', ...)` with
your report, or the work is invisible and unfinished." — matches the shape
FEAT-259's own evidence (`.claude/artifacts/loop/backlog/in-progress/
FEAT-259.md` lines 80-82) validates as effective: it names the exact tool
(`SendMessage`), the exact target (`main`), and frames it as the mandatory
last action, not a soft "report back" / "return findings" phrasing the FEAT
explicitly records as producing silent idles. It also states the negative
consequence ("invisible and unfinished"), which the weaker phrasings tested
did not include. Final-section placement is sound — recency plus a
dedicated heading in five of six files makes it the last thing the model
reads before acting, and grep-verifiability doesn't depend on position.
Verdict: strong, on the right side of the FEAT's own phrasing-strength
evidence.

## 2. Surface selection

Confirmed against `CLAUDE.md`'s "Owned agents" list: exactly `runner:pm`,
`runner:architect`, `runner:researcher`, `runner:market-researcher`,
`runner:document-writer`, `runner:swarm` — six agents, all six touched, no
extra, no omission. Spot-checked dispatch paths (`commands/intake.md`) — pm
and architect are dispatched via direct `Agent(subagent_type: runner:*)`
calls, consistent with the builder's claim that none of these six has a
no-report invocation mode. No agent here should have been excluded.

## 3. pm.md headroom

`agents/pm.md` is now exactly 335/335 against its `AGENT_LINE_OVERRIDES`
cap in `src/scripts/validate-content-length.mts` (confirmed: `wc -l` = 335,
gate passes). History check (`git log -p` on that file) shows this override
has already been bumped twice — 300 (default) → 325 → 335 — and the 335
figure predates this slice (it was already 335 on the parent commit,
`885d0482`, with pm.md sitting at 333/335). SLICE-184's 2-line addition
consumed the last of that headroom. This is a real latent hazard: the very
next edit to pm.md — even a one-line fix — will fail
`validate-content-length` and force either a trim or a third override bump.
Given this is the second time headroom has been fully consumed, worth a
backlog note to consider restructuring/de-duplicating pm.md's contract
content rather than continuing to raise the override indefinitely — not a
blocker for this slice, but flagging so the next editor isn't surprised.

The compact bold-lead variant chosen for pm.md carries the identical core
sentence text as the other five files' full section (verified via grep —
byte-identical wording), just without the `## Final act (mandatory)` H2
heading (inline bold instead, immediately after a markdown table with no
separating heading). Since FEAT-259's evidence about phrasing strength was
about wording, not heading-level, I'd expect this variant to be close to as
effective as the full section — the instruction text itself is unchanged —
though a heading gives slightly more visual prominence for a model skimming
the file. Minor, not a rejection-worthy gap.

## 4. Coupling with SLICE-187 — determined

This is the load-bearing question and the answer is **no, they are not
mechanically coupled** — SLICE-184 does not make these six agents
contract-bearing in the report-gate hook's own detection sense, and the
two slices satisfy two independent items from FEAT-259's four-mechanism
scope (mechanism 2 "Agent template line" vs. mechanism 1 "SubagentStop
hook"), not one shared contract.

Evidence: `hooks/report-gate.mjs` itself states its detection target
precisely, in its own header (lines 37-39): "the subagent's FIRST
user-role transcript turn is **the literal prompt text handed to
`Agent(...)` at dispatch**." That is the dispatch prompt the orchestrator
writes at call time (the `prompt` parameter of the `Agent()` tool call) —
not the dispatched agent's own definition file. An owned agent's `.md`
content (`agents/pm.md`, etc.) is the subagent's persona/system-prompt
definition, a separate channel from the first user-role turn of its own
transcript. `scanTranscript()` (`hooks/report-gate.mjs:141-174`) only reads
`obj.type === "user"` lines via `firstUserMessageText()` — it never reads
system-prompt content, and there is no code path here that could route
`agents/pm.md`'s body into that field.

Practical consequence: the report-gate hook's contract-detection continues
to depend entirely on whatever ad-hoc dispatch text the orchestrator/lead
writes at `Agent()` call time (the "SendMessage to main" / `<task-scoped>`
phrasing convention this session's own dispatch already uses — see the
task prompt that dispatched this review, which itself deliberately
includes that phrasing). Adding the line to `agents/*.md` is a real,
independent improvement to each agent's own persona-level instructions
(FEAT-259 scope item 2, "Agent template line"), and is good practice on
its own merits, but it does **not** cause the hook to treat these six
agents specially, and it doesn't need to — the hook was never designed to
read agent-definition files. Say this plainly to avoid the team assuming
SLICE-184 tightened SLICE-187's coverage; it didn't, and doesn't need to.

**Independent verification, not taken on the lead's report alone.** The
lead supplied a probe result reaching the same conclusion; I re-derived it
from a separate source before folding it in — a `runner:researcher`
subagent transcript from an earlier session
(`C--work-mega-runner-plugin/80908d95-99e0-4673-bff0-aff1c76ffe47/
subagents/agent-a2d177a52128e1f6e.jsonl`, unrelated to today's probes):

- The transcript's line `type` values are `{'user': 66, 'assistant': 102}`
  — **no `system`-typed line exists at all.** Whatever the runtime does
  with the `runner:researcher` agent-definition content (i.e.
  `agents/researcher.md`) to seed that subagent, it is not written into
  this JSONL as any turn `report-gate.mjs` could parse — not as `user`,
  not under any other type.
- The transcript's first `user`-role turn is 2292 chars beginning "Read-only
  investigation in repo C:\work\mega\runner-plugin. Goal: map the COMPLETE
  read-side / feed-forward memory path..." — the dispatcher's task prompt,
  not agent-definition boilerplate.
- Cross-checked the contrast claim too: I ran `REPORT_BACK_CONTRACT_RE`
  (copied verbatim from `hooks/report-gate.mjs:97`) against the first user
  turn of today's `agent-abuilder-184-*`, `agent-areviewer-184-*`, and
  `agent-areviewer-187-*` transcripts (all dispatched today, all touching
  SLICE-184/187 work) — all three trip the regex, and in each case the
  match is inside the dispatcher's own ad-hoc prompt text, not anything
  from `agents/*.md`.

Both checks are from transcripts I read directly, independent of the
lead's probe. They agree with the lead's finding and with my reading of
`report-gate.mjs`'s own header comment (section above): **confirmed, not
just accepted.**

**On the lead's two follow-on points — I agree with both:**

1. SLICE-184 does not make the six owned agents contract-bearing under
   SLICE-187's regex. Independent, not reinforcing — as stated above.
2. SLICE-187's AC1 coverage is narrower than its own text implies: the
   hook can only ever see a report-back contract that the *calling*
   prompt wrote in; it has no visibility into instructions that live
   solely in the callee's agent-definition file. Concretely, if some
   future dispatch path invoked one of these six agents with a
   contract-free ad-hoc prompt (relying on the agent's own "Final act"
   line to carry the obligation), the hook would silently approve that
   stop even though the agent-level instruction was violated — AC1 as
   written ("Given a dispatched agent with a report-back contract...")
   reads as if the agent's own definition could establish that contract,
   but only the dispatch prompt can. Worth an explicit line in FEAT-259
   (the lead notes it's already recorded there) so closing on AC1+AC3
   alone isn't read as full coverage.

## 5. swarm.md's extra clause

The appended sentence — distinguishing "reporting to your caller" from
"the marker-file contract you enforce on your own children" — clarifies
rather than muddies. `swarm.md` already documents a DONE/marker-file
completion contract it enforces on its *own* dispatched children elsewhere
in the file (`agents/swarm.md:100-117`, "Return to caller" / "Failure
modes" sections); without the disambiguating sentence, a model reading
both contracts back-to-back could plausibly conflate "my children must
write a marker" with "I must SendMessage," or wonder whether marker-file
completion substitutes for its own SendMessage duty. The addition heads
that off.

It does not weaken grep-verifiability: I confirmed (`grep -c` across
`agents/*.md`) the canonical sentence "Your plain final text is NOT
delivered to the orchestrator..." appears **exactly once, byte-identical**,
in all six files, including swarm.md — the extra clause is appended as a
trailing sentence after the canonical text, not interleaved into it. A
grep for the canonical string still matches uniformly across all six.

## Decision rationale

`approved_with_notes` — the slice does what AC3 requires, is correctly
scoped to docs only, passes the content-length gate, and the wording is
evidence-aligned. Three notes carried forward, none blocking: (a) pm.md
now has zero headroom against its override cap and this is the second
time that's happened — worth a backlog follow-up on de-duplicating its
contract content; (b) the team should not read SLICE-184 as having
tightened SLICE-187's report-gate coverage — the two mechanisms are
independent, confirmed both by `report-gate.mjs`'s own header comment and
by direct inspection of a `runner:researcher` transcript (section 4); (c)
SLICE-187's AC1 wording overstates its own coverage — the hook can only
ever see contracts the *dispatcher's* prompt wrote in, never one carried
solely by the callee's agent-definition file — so FEAT-259 should not be
closed on AC1+AC3 alone without noting that gap explicitly.
