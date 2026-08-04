---
slice: SLICE-187
feature: FEAT-259
kind: review-result
status: completed
decision: approved_with_notes
reviewer: independent (crew:reviewer)
date: 2026-08-04
---

## Summary

Reviewed commit `ff1c6d9a` (parent `76a2293d`, 3 files, 581 insertions, 0 deletions/modifications elsewhere): `hooks/report-gate.mjs`, `src/tests/report-gate.test.mts` (15 tests), one added `SubagentStop` entry in `.claude-plugin/hooks/hooks.json`. Verified against FEAT-259 AC1/AC2 and the live-probe empirical contract doc. **Approved with notes** — solid, correctly fail-open, in-scope implementation with one real but bounded-severity AC2 gap worth documenting before wider rollout, and one lower-priority robustness note.

## 1. AC2 (false-positive blocking) — real gap, bounded severity

`REPORT_BACK_CONTRACT_RE` (`report-gate.mjs:97`) fires on proximity of the literal tokens `sendmessage` and `main` (whole-word, either order, 80-char window) in the subagent's first user-role transcript turn — it cannot distinguish an *instruction to this agent* from *prose that merely discusses the mechanism*.

**Concrete false-positive prompt** (plausible, and elevated in likelihood right now because FEAT-259 is actively in flight across 7 slices in this repo, so near-term dispatch prompts investigating this very feature will often quote its own description text, which itself contains the marker — e.g. FEAT-259.md line 71-72, `.claude/artifacts/loop/backlog/in-progress/FEAT-259.md`, verbatim: *"has not called SendMessage(to: main) this session, block the stop"*):

> "Investigate why FEAT-259's SubagentStop hook exists. Background: the fix requires the agent to call SendMessage(to: 'main', ...) before stopping. Read hooks/report-gate.mjs and summarize the detection regex for me. This is a foreground call — I will read your returned text directly, no need to send anything."

This pairs `SendMessage` and `main` within an 8-char span (well inside the 80-char window), so detection fires — even though the same prompt explicitly instructs the agent *not* to send anything (a plain foreground `Agent()` dispatch, whose returned text the caller already receives directly per the tool's own delivery contract). The regex cannot parse negation ("no need to send anything"), so an agent that correctly follows its actual instructions (return text, never call `SendMessage`) is blocked with the reason "Your final action must be `SendMessage` to main…" — which directly contradicts what it was told to do.

A second, git-flavored variant is equally plausible in this repo: a prompt mentioning `main` as the **git branch** ("rebase onto main, then…") near an unrelated `SendMessage`-the-reviewer instruction. Note this second variant is *usually* harmless in practice: fulfillment (`hasSendMessageToolUse`, `report-gate.mjs:134`) checks only that a `SendMessage` tool_use exists anywhere in the transcript — it does **not** check the `to:` target — so an agent that sends to any recipient at all still passes. The false block only manifests when detection fires **and** the agent genuinely never calls `SendMessage` at all, which narrows the practical blast radius to synchronous/foreground/read-only dispatches whose prompt happens to quote this mechanism.

**Why this doesn't sink the slice**, and why the FEAT-284 parallel the dispatcher raised is thematically apt but not equally severe: FEAT-284's regex-over-prose defect (`SLICE-190`, just fixed) caused *silent, undetectable data loss* — a slice was dropped with no visible symptom. Here, the worst case is a single extra visible retry turn: the blocked agent gets a clear corrective reason, sends one (possibly redundant) message, and stops — cheap, visible, self-limiting (guarded by `stop_hook_active`), never data-destroying. Combined with the feature shipping **default OFF** (`reportGateEnabled`, `report-gate.mjs:116-119`, confirmed no `report-gate` key present in this repo's own `.claude/loop.json`), this is a documented-limitation-before-rollout item, not a blocking defect.

**Recommendation**: note in FEAT-259's SLICE-2 (receipt schema docs) or an operator-facing note that the detection signal is prompt-text proximity, not semantic intent, and that dispatchers should keep mechanism-describing prose (FEAT/slice bodies, doc excerpts) out of the literal first-turn task text where practical — or accept the residual rate and observe it during the opt-in bake period the hook's own header already calls for.

## 2. Infinite-block safety — verified correct

`stop_hook_active` is checked at `report-gate.mjs:199`, immediately after the event-name check and *before* the loop.json read, transcript stat, scan, or any block decision — genuinely first, as required. Confirmed: on the retry firing (which per the empirical doc carries `stop_hook_active: true`), the hook returns unconditionally at line 199 regardless of whether the agent actually sent a message this time. This is correct one-shot-nudge design and cannot infinite-loop.

One residual (non-blocking) observation: this means the mechanism gives exactly **one** forced retry. If the agent ignores the corrective reason and stops again without `SendMessage`, the second stop is approved silently — no log line, no telemetry marking "nudge failed." Given FEAT-259's own text notes builders currently emit no pause signal at all (`docs/sop/specialist-pause-handling.md` L128-131, cited in FEAT-259's "Downstream dependency discovered" section), this gap is consistent with known, already-tracked scope (FEAT-275) rather than something SLICE-187 introduced or was asked to close.

## 3. Fail-open completeness — verified, one minor robustness note

Traced every fail-open path against the header's claimed contract: malformed stdin (195), wrong event (196), `stop_hook_active` (199), gate disabled/missing/malformed config (202, via safe `?.` chaining in `reportGateEnabled`/`readLoopJsonSync`), missing/non-string transcript path (205), `statSync` throw i.e. deleted transcript (209-211), oversized transcript vs. the 30MB cap (213, skips read entirely), scan promise rejection/timeout via `withTimeout` (216-220), and the outer `main().catch()` last-resort swallow (230-232). All confirmed present and each has a corresponding test.

`withTimeout` (`report-gate.mjs:180-186`) clears its timer in a `.finally()` on whichever side of the race settles first — confirmed this prevents a dangling handle keeping the process alive past the fast path.

Minor note, not blocking: `scanTranscript` (146-174) consumes `createReadStream(transcriptPath)` via `readline` with no explicit `.on('error', ...)` handler attached directly to the stream. If the stream errors after `statSync` already succeeded (a narrow TOCTOU window — permission change, concurrent rotation, disk I/O fault), whether that surfaces as a rejected promise (caught safely at line 218-219) or as a raw stream `error` event depends on Node's async-iteration error-forwarding, which I did not verify empirically here. Even in the worst case, though, AC2's safety property still holds: a hook crash cannot emit the well-formed `{"decision":"block",...}` JSON the harness requires to force a block, so a crash still fails toward "approve" — just via an uninstrumented path (nonzero exit, stderr) rather than the intended graceful one. Worth a defensive `.on('error', ...)` in a follow-up, not worth blocking this slice.

## 4. Blocking mechanism — confirmed real and clear

`block()` (188-191) writes `{"decision":"block","reason":...}` to stdout at `exitCode = 0` — this matches the mechanism independently documented in `docs/research/2026-08-04-subagentstop-hook-empirical-contract.md` ("Blocking mechanics" section, not re-derived here, cross-checked against the shipped code) and is distinct from the exit-2 path `capture-at-close.mjs` deliberately avoids. The reason text is a complete, actionable instruction (names the exact tool call: `SendMessage(to: "main", message: "<your report>")`) rather than a vague nudge.

## 5. Live-proof residue / hooks.json well-formedness

No debug scaffolding, stray `console.log`, or leftover instrumentation found in `hooks/report-gate.mjs` — the only stdout write is the intentional block-JSON path. No temporary hook registration or scratch file left behind in the repo (the empirical spike's temp `.claude/settings.local.json` hook + scratch JSONL, per the research doc, are described as globally gitignored and removed after that run — nothing under version control here). `hooks.json`'s new entry (lines 90-99) is well-formed: valid JSON, a proper third sibling object in the `SubagentStop` array (matches the existing two entries' shape), consistent `${CLAUDE_PLUGIN_ROOT}` quoting, and its 10s external timeout comfortably exceeds the hook's own internal 4000ms scan deadline plus stat/IO overhead — the graceful internal timeout will fire before Claude Code's outer timeout could kill the process uncleanly.

## 6. Test quality — proves behavior, not implementation-mirroring

15 tests, black-box style: each spawns the real hook as a subprocess (`spawnSync(process.execPath, [hookPath], ...)`) with real stdin/env and asserts on actual stdout/exit code, never mocking internals. Coverage matches every documented path: config gate absent/false/malformed (3), AC1 block + subsequent resolved-send (2), AC2 no-contract + SendMessage-to-different-target (2), loop guard (1), and 7 fail-open paths including malformed stdin, wrong event, missing/deleted/oversized transcript, mixed-garbage JSONL lines, and a deterministic near-zero-timeout race. The header's stated reason for not inheriting the FEAT-286 `capture-at-close` flake holds up under inspection: this hook never shells out to an external CLI (no `.cmd` resolution), so there's no nested spawn to race — confirmed, `report-gate.mjs` has zero `child_process` usage.

Minor gaps (not blocking): no test exercises the regex's `\b` word-boundary correctness against a plausible near-miss (e.g. "maintain"/"domain" should NOT match — I verified this analytically, holds correctly, but it's untested); no test documents that `hasSendMessageToolUse` is target-agnostic (ignores `to:`) even though the AC2 "different target" test incidentally relies on this being true for a different reason. Neither affects current correctness.

## 7. Scope — clean

`git show --stat ff1c6d9a` confirms exactly the three files described, all-additions. No touches to SLICE-183/184/185/186, `CLAUDE.md`, `templates/`, `commands/`, `skills/`, `agents/`, or the sibling `scripts/` tree.

## Decision rationale

`approved_with_notes`: implementation is correct, fail-open is genuinely fail-open on every traced path, scope is clean, and tests are real behavioral coverage. The one substantive finding (§1, AC2 false-positive category) is real and should be written down for operators before broad rollout, but its worst-case impact is a cheap, visible, self-limiting retry — not the silent-data-loss class of defect FEAT-284 just fixed — and the feature ships default-OFF, which is the correct mitigation for a first release per the hook's own header rationale.
