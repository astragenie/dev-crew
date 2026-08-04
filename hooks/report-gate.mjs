#!/usr/bin/env node
// SubagentStop hook: report-gate for dispatched agents with a report-back
// contract (runner-plugin#504, FEAT-259 / SLICE-187).
//
// Why: dispatched agents routinely finish their work, write the report as
// plain final text — which is NOT delivered to the orchestrator (SendMessage
// is the only delivery path) — then go idle. Recorded 18 times in a single
// session (2026-08-04); the existing mitigation (docs/sop/specialist-pause-
// handling.md + prose lessons in astramem) is 100% manual and has shown zero
// decay in a month. This hook enforces the contract mechanically: an agent
// whose dispatch prompt established a report-back contract but has not
// actually called SendMessage is blocked from stopping, with a corrective
// reason; every other agent stops normally.
//
// Empirical contract (see docs/research/2026-08-04-subagentstop-hook-
// empirical-contract.md — a live spike run before this file was written,
// trust it over generic hook docs where they disagree):
//  - SubagentStop DOES fire for run_in_background:true dispatches (contra
//    github.com/anthropics/claude-code#25147 — re-verify after a CC
//    upgrade, that issue was closed "not planned" not "fixed").
//  - `agent_type` carries the caller-chosen dispatch NAME, not the role
//    ("arch-classify-281-283", not "runner:architect") — it cannot be used
//    to detect "was this agent dispatched with a report-back contract".
//    The only reliable signal available in-payload is the dispatch prompt
//    ITSELF, which is the subagent's own first transcript turn.
//  - No payload field enumerates tools called; "did it call SendMessage"
//    requires parsing `agent_transcript_path`, same as this hook does.
//  - Blocking mechanics: a Stop/SubagentStop hook can force a retry by
//    writing `{"decision":"block","reason":"..."}` to stdout (exit 0) — the
//    exit-2-plus-stderr path also blocks but is the sibling mechanism
//    hooks/capture-at-close.mjs deliberately never uses ("exit 2 would
//    force a stop-retry loop" on a hook that must never block); this hook
//    WANTS that stop-retry for exactly one detected condition, so it uses
//    the JSON-decision path rather than exit 2, keeping the exit code
//    itself always 0 (plumbing, not the block signal).
//
// Detection signal for "was this dispatched with a report-back contract":
// the subagent's FIRST user-role transcript turn is the literal prompt text
// handed to Agent(...) at dispatch. If that text pairs "SendMessage" with
// "main" within a short span — the phrasing this repo's own dispatch
// prompts, agent descriptions, and CLAUDE.md's HARD RULES actually use
// ("SendMessage to main", "SendMessage(to: main ...)") — the agent was given
// a report-back contract. Absent that marker the agent is treated as having
// NO contract and is never blocked: a false-positive block on an
// interactive/local/no-contract agent is strictly worse than the
// missing-report problem this hook exists to fix (a blocked hook gets
// disabled by users within a day), so uncertainty always resolves to
// "approve", never "block". `agent_type` is deliberately NOT consulted for
// detection, per the empirical finding above.
//
// Fulfillment check: scan the whole transcript (bounded — see caps below)
// for an assistant `tool_use` block named "SendMessage". If found anywhere,
// the contract is satisfied — regardless of what `last_assistant_message`
// says, since an agent's final plain text is exactly the channel FEAT-259
// distrusts (it is what's undelivered in the first place).
//
// Fail-open contract, matching hooks/capture-at-close.mjs: this hook NEVER
// blocks on uncertainty. Missing/malformed payload, wrong event, transcript
// missing/oversized/unreadable, JSONL parse error, or a scan that exceeds
// the wall-clock cap all resolve to "approve, do nothing". Blocking fires
// ONLY on the one positively-detected condition: contract-marker present in
// the first user turn AND no SendMessage tool_use anywhere in the
// transcript. `stop_hook_active` is checked first and wins unconditionally —
// if this firing was itself caused by a prior block, never block again
// (the stop-retry-loop guard both capture-at-close.mjs's header and the
// empirical-contract doc call out as non-negotiable).
//
// Gating: opt-in via `.claude/loop.json` -> `features["report-gate"].enabled
// === true` (absent/false/malformed -> OFF). Mirrors the shape of the
// existing `features.redundant-read-stop` block already in this repo's
// loop.json, reimplemented dependency-free here rather than imported from
// features-service.mts / feature-flag-lite.mjs's shared registry — same
// reason capture-at-close.mjs reimplements its own memory-enabled gate
// locally: hooks/*.mjs run via plain `node`, no build step, and the shared
// registry lives in the bun-oriented src/scripts/lib tree this file cannot
// import. Default is OFF for this first release: the false-positive risk of
// blocking an agent that never had a report-back contract is judged worse
// than shipping with the existing manual mitigation still in place, so
// operators must opt in explicitly once they've seen it behave correctly in
// their own session.

import { createReadStream, readFileSync, statSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

const DEFAULT_TIMEOUT_MS = 4000;
const TIMEOUT_MS = Number(process.env.REPORT_GATE_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
// A transcript can run tens of MB; skip parsing entirely (fail open) past
// this size rather than let a slow read delay every subagent's stop.
const MAX_TRANSCRIPT_BYTES = Number(process.env.REPORT_GATE_MAX_BYTES) || 30 * 1024 * 1024;

// Pairs "SendMessage" with the literal target this repo's dispatch prompts
// use ("to main" / "to: main") within a short span, either order — tight
// enough to skip an unrelated mention of the tool name, loose enough to
// match "SendMessage to main", `SendMessage(to: "main", ...)`, "Report via
// SendMessage to main", "your last action MUST be SendMessage to main".
const REPORT_BACK_CONTRACT_RE = /sendmessage[\s\S]{0,80}\bmain\b|\bmain\b[\s\S]{0,80}sendmessage/i;

function readHookPayload() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return null;
  }
}

function readLoopJsonSync(repoPath) {
  try {
    return JSON.parse(readFileSync(path.join(repoPath, ".claude", "loop.json"), "utf8"));
  } catch {
    return null;
  }
}

/** Opt-in gate: absent/false/malformed -> OFF. See header for rationale. */
function reportGateEnabled(repoPath) {
  const parsed = readLoopJsonSync(repoPath);
  return parsed?.features?.["report-gate"]?.enabled === true;
}

/** Extracts the plain text of a transcript line if it's a user-role turn,
 * else null. Handles both string content and the content-block array shape. */
function firstUserMessageText(obj) {
  if (obj?.type !== "user") return null;
  const content = obj.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  return content
    .filter((b) => b && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n");
}

function hasSendMessageToolUse(obj) {
  if (obj?.type !== "assistant") return false;
  const content = obj.message?.content;
  if (!Array.isArray(content)) return false;
  return content.some((b) => b?.type === "tool_use" && b?.name === "SendMessage");
}

/** Single bounded pass over the transcript JSONL: resolves the first user
 * turn's text (contract-detection signal) and whether a SendMessage
 * tool_use appears anywhere in the file (fulfillment signal). Stops reading
 * early once both answers are known. Never throws on a single bad line —
 * only I/O failure propagates, which the caller treats as fail-open. */
async function scanTranscript(transcriptPath) {
  let firstUserText = null;
  let sawSendMessage = false;
  const rl = readline.createInterface({
    input: createReadStream(transcriptPath),
    crlfDelay: Infinity
  });
  try {
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let obj;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        continue;
      }
      if (firstUserText === null) {
        const text = firstUserMessageText(obj);
        if (text !== null) firstUserText = text;
      }
      if (!sawSendMessage && hasSendMessageToolUse(obj)) sawSendMessage = true;
      if (firstUserText !== null && sawSendMessage) break;
    }
  } finally {
    rl.close();
  }
  return { firstUserText: firstUserText ?? "", sawSendMessage };
}

/** Races `promise` against a `ms` timer, clearing the timer on whichever
 * settles first — an uncleared timer would keep the process alive (and
 * every subagent stop waiting) up to the full timeout even on the fast
 * path where the scan finishes well within it. */
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error("report-gate: scan timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
  process.exitCode = 0;
}

async function main() {
  const payload = readHookPayload();
  if (!payload) return; // malformed stdin — fail open
  if (payload.hook_event_name !== "SubagentStop") return; // not our event

  // Loop guard: a firing caused by a prior block must never be re-blocked.
  if (payload.stop_hook_active === true) return;

  const repoPath = (typeof payload.cwd === "string" && payload.cwd) || process.cwd();
  if (!reportGateEnabled(repoPath)) return; // opt-in feature, off by default

  const transcriptPath = payload.agent_transcript_path;
  if (!transcriptPath || typeof transcriptPath !== "string") return;

  let stat;
  try {
    stat = statSync(transcriptPath);
  } catch {
    return; // transcript already gone — fail open, matches capture-at-close.mjs
  }
  if (stat.size > MAX_TRANSCRIPT_BYTES) return; // bounded work — skip, never block on this path

  let scan;
  try {
    scan = await withTimeout(scanTranscript(transcriptPath), TIMEOUT_MS);
  } catch {
    return; // parse error or timeout — fail open, never block on uncertainty
  }

  if (!REPORT_BACK_CONTRACT_RE.test(scan.firstUserText)) return; // AC2: no contract detected, never block
  if (scan.sawSendMessage) return; // contract fulfilled — approve

  block(
    'Your final action must be SendMessage to main before stopping — plain final text is not delivered to the orchestrator. Call SendMessage(to: "main", message: "<your report>") now, then stop.'
  );
}

main().catch(() => {
  // Absolute last-resort fail-open — this hook must never crash-block a stop.
});
