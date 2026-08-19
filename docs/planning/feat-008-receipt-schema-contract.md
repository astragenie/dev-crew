# FEAT-008 contract — agent receipt schema + idle-ping suppression

Status: draft, for builder handoff. Source: `.claude/artifacts/loop/backlog/triaged/FEAT-008.md`.

## Current state (evidence)

- **Report format today is free text, not structured.** `agents/fullstack-dev.md:230-241`
  ("Final step — report to the dispatcher (MANDATORY)"): last action MUST be
  `SendMessage` to `main` carrying a `STATUS` line (`DONE|BLOCKED|HELP|IN-PROGRESS`),
  "what changed", and "evidence" — prose, no field schema. Same pattern,
  shorter, in `agents/pm.md:335` and `agents/swarm.md:129-131`. 7 templates
  total mention `SendMessage`/final-report: `aiplugin-dev.md`, `backend-dev.md`,
  `frontend-dev.md`, `fullstack-dev.md`, `market-researcher.md`, `pm.md`,
  `swarm.md` (grep, repo-wide).
- **`hooks/report-gate.mjs`** (SubagentStop hook) — real, shipped, scans the
  live transcript JSONL for a `SendMessage` `tool_use` block; detection
  regex `REPORT_BACK_CONTRACT_RE` (`report-gate.mjs:83`) pairs "SendMessage"
  with "main" in the dispatch prompt's first user turn. Opt-in via
  `loop.json` → `features["report-gate"].enabled === true` (`report-gate.mjs:100-102`),
  default OFF. This hook checks *whether* a report was sent, never its shape
  — it has no opinion on `{status, items[], commit_shas[], evidence_path, deviations[]}`.
- **`src/scripts/lib/orchestrator-watchdog.mts`** — pure decision functions
  (`classifyLaneCondition`, `decideWatchdogAction`) for `idle_without_report`
  detection + auto-nudge-once. Header (lines 8-25) explicitly states it is
  **NOT WIRED to any execution point** because "no orchestrator-side
  execution point... can observe a dispatched subagent's live idle/stop
  state" from a scriptable Bun CLI entry.
- **That claim is only half true — a real hook event exists and is unused
  for this purpose.** `.claude-plugin/hooks/hooks.json:151-159` defines a
  `TeammateIdle` hook, currently wired to a single passive
  `crew/scripts/log_event.sh teammate_idle` call — no consumer inspects its
  payload or acts on it. This is the actual scriptable idle-observation
  point `orchestrator-watchdog.mts`'s header says doesn't exist; it exists,
  it's just never been used for suppression logic. **This is the load-bearing
  finding for this contract**: idle-ping suppression should be a new
  `TeammateIdle` hook (mirroring `report-gate.mjs`'s transcript-scan
  pattern), not a change to the un-wired `orchestrator-watchdog.mts`.
- **Existing prose-only mitigation** already exists at the *prompt* layer:
  `commands/build.md:118` — "Idle-ping guidance: a `teammate_idle`
  notification (payload `{"type":"idle_notification"}`) from a reviewer that
  already delivered its artifact is noise, not a signal to act on." Same
  language in `commands/fix.md`, `commands/review.md`. This is exactly the
  "template content alone is insufficient coverage" case FEAT-008's own
  AC-4 calls out — it's advisory text an orchestrator LLM might ignore, not
  an enforced hook.

## Receipt schema

```ts
export interface AgentReceipt {
  status: "DONE" | "BLOCKED" | "HELP" | "IN-PROGRESS"; // required — same vocabulary as today's STATUS line
  items: string[];              // required, may be empty — what changed, one bullet per item
  commit_shas: string[];        // required, may be empty — [] when no commit made (e.g. read-only agent)
  evidence_path: string | null; // required — artifact path, or null when genuinely none (e.g. HELP before any work)
  deviations: string[];         // required, may be empty — scope/plan deviations, "[]" is the normal case
  schema_version: 1;            // required — versioning per the assignment; bump on shape change
}
```

Target ≤15 lines serialized (per AC-2) — a compact single-line JSON object
after the STATUS line, not pretty-printed, e.g.:
`SendMessage(to: "main", message: "DONE\n" + JSON.stringify(receipt))`.
`schema_version` lets `report-gate.mjs`/a future validator reject a
malformed or pre-schema receipt without a hard repo-wide cutover.

## Which templates emit it

The 7 templates above get their "Final step" section rewritten to require
the JSON receipt inline with the STATUS line. `agents/reviewer.md`,
`agents/verifier.md`, `agents/architect.md` etc. (no `SendMessage` mention
found) are out of scope for this FEAT — they don't currently carry a
report-back contract at all; adding one is a separate decision, not implied
by FEAT-008.

## How idle-ping suppression consumes it

New `hooks/idle-suppress.mjs`, registered on `TeammateIdle` in
`.claude-plugin/hooks/hooks.json` alongside the existing `log_event.sh` call
(additive, don't replace the logger). Mirrors `report-gate.mjs`'s bounded
JSONL scan: if the agent's transcript already contains a `SendMessage`
`tool_use` whose payload parses as a valid `AgentReceipt`, suppress —
`{"decision": "approve"}` and skip whatever downstream nudge/re-injection
path exists. AC-3 requirement: a subagent that stops with **no** receipt at
all must NOT be suppressed by this hook — that is `report-gate.mjs`'s
territory (SubagentStop, not TeammateIdle), and the two hooks must stay
observably distinct in tests (different fixture: receipt-present-then-idle
vs never-reported-then-stop).

## Open questions

- `TeammateIdle`'s hook payload shape is undocumented in this repo (no
  consumer exists to infer it from, unlike `SubagentStop`'s payload which
  `report-gate.mjs`'s header cites a prior empirical-spike doc for). Before
  writing `idle-suppress.mjs`, run the same kind of live-spike-and-document
  step `docs/research/2026-08-04-subagentstop-hook-empirical-contract.md`
  did for `SubagentStop` — confirm `TeammateIdle` payload actually carries
  (or can be joined to) `agent_transcript_path`; if it doesn't, this whole
  design needs a fallback (e.g. correlate by `agentId` against a
  loop-maintained lane table) before AC-1 is buildable.
- Should `orchestrator-watchdog.mts` be wired to this same `TeammateIdle`
  hook now that a real execution point is confirmed to exist, superseding
  its own header's "not wired" disclosure? Out of this FEAT's stated scope
  (FEAT-008 only asks for receipt schema + idle suppression) but flagged for
  a follow-up FEAT rather than silently left stale.

## Amendment (2026-08-19 spike)

**Spike result.** `TeammateIdle` has **never fired** in this harness: zero
`events.jsonl` lines and zero payload files under `C:\work\mega\.claude\logs`
across a session with ~60 idling named teammates, while `SubagentStop` /
`SessionStart` / `SubagentStart` all fired normally in the same session. Two
untested hypotheses recorded: (a) `TeammateIdle` targets a different
teammate primitive than Agent-tool-dispatched teammates (this repo's
dispatch model); (b) project-local `.claude/settings.json` hook
registrations — which omit `TeammateIdle` — mask the plugin's `hooks.json`
registration for that event. Separately, `SubagentStop`'s payload is now
**empirically confirmed**: `session_id`, `transcript_path`, `cwd`,
`agent_id`, `agent_type`, `stop_hook_active`, `agent_transcript_path`,
`last_assistant_message` are all real fields — `report-gate.mjs`'s three
load-bearing reads (`stop_hook_active`, `cwd`, `agent_transcript_path`) are
confirmed, not assumed.

**Revised execution design — supersedes "How idle-ping suppression consumes
it" above.** `SubagentStop`, not `TeammateIdle`, is the primary (and for now
only) execution point for receipt detection: extend `report-gate.mjs` (or a
sibling `SubagentStop` hook) to run the same `agent_transcript_path` JSONL
scan it already does, additionally checking for a valid `AgentReceipt`
block. The correlation mechanism this doc's Open Questions previously
hedged as a fallback (§ line ~97-99, "correlate by `agentId` against a
loop-maintained lane table") is **promoted from hedge to the actual
mechanism**: the `SubagentStop` hook writes `agent_id -> {receiptSeen, transcriptPath}`
into a persisted lane table the moment it detects a valid receipt, so any
future idle-suppression consumer looks up `agent_id` there instead of
depending on an unverified `TeammateIdle` payload.

**`TeammateIdle` demoted.** Do not build any hook registered on
`TeammateIdle` until a live provocation spike proves it fires in this
harness at all. That spike's first test must be hypothesis (b): add an
explicit `TeammateIdle` entry to project-local `.claude/settings.json`
(not just the plugin's `hooks.json`) and re-run the same idling-teammate
scenario — if it fires under `settings.json` but not under `hooks.json`
alone, that confirms masking and the fix is a registration change, not new
hook logic. Until that spike resolves, `TeammateIdle`-based suppression is
out of scope; the `SubagentStop`-based receipt detection above is the whole
of what FEAT-008 should ship.

**Revised implementation slices:**
1. Receipt schema + rewrite the 7 templates' "Final step" sections (unchanged).
2. Extend `report-gate.mjs` (or a new sibling `SubagentStop` hook) to detect
   and record `AgentReceipt` via the lane table, keyed by `agent_id`.
3. `TeammateIdle` provocation spike (settings.json-masking test) — gates any
   further idle-suppression work; tracked as its own follow-up, not part of
   this FEAT's build scope.
4. *(Deferred, blocked on #3)* `TeammateIdle`-based suppression hook, only
   if the spike proves the event fires.
