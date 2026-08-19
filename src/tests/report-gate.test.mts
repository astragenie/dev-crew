import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { LANE_TABLE_REL } from "../scripts/lib/agent-receipt.mjs";

// Tests for hooks/report-gate.mjs — the SubagentStop hook that blocks a
// dispatched agent from stopping when its dispatch prompt established a
// report-back contract ("SendMessage ... main") but no SendMessage tool_use
// appears anywhere in its transcript (FEAT-259 / SLICE-187, AC1 + AC2).
//
// Unlike hooks/capture-at-close.mjs, this hook never spawns a child CLI, so
// none of these tests are exposed to the FEAT-286 cold-start-shim flake
// (capture-at-close-hook.test.mts's known parallel-load flake, caused by a
// tight timeout racing a Windows .cmd shim's process-spawn overhead) — every
// test here spawns exactly one process (the hook itself) and reads its own
// stdout/exit code synchronously, no nested spawn to race.

function resolveHookPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "hooks", "report-gate.mjs");
}

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeLoopConfig(repo: string, config: unknown): Promise<void> {
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(path.join(repo, ".claude", "loop.json"), JSON.stringify(config, null, 2));
}

const GATE_ON = { features: { "report-gate": { enabled: true } } };

type TranscriptLine = Record<string, unknown>;

function userTurn(text: string): TranscriptLine {
  return { type: "user", message: { role: "user", content: [{ type: "text", text }] } };
}

function assistantText(text: string): TranscriptLine {
  return { type: "assistant", message: { role: "assistant", content: [{ type: "text", text }] } };
}

function assistantSendMessage(): TranscriptLine {
  return {
    type: "assistant",
    message: {
      role: "assistant",
      content: [{ type: "tool_use", name: "SendMessage", input: { to: "main", message: "done" } }]
    }
  };
}

const SAMPLE_RECEIPT = {
  status: "DONE",
  items: ["did the thing"],
  commit_shas: ["abc1234"],
  evidence_path: ".claude/artifacts/crew/validations/x.md",
  deviations: [],
  schema_version: 1
};

function assistantSendMessageWithReceipt(receipt: unknown = SAMPLE_RECEIPT): TranscriptLine {
  return {
    type: "assistant",
    message: {
      role: "assistant",
      content: [
        {
          type: "tool_use",
          name: "SendMessage",
          input: { to: "main", message: `DONE\n${JSON.stringify(receipt)}` }
        }
      ]
    }
  };
}

async function readLaneTableFile(repo: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(path.join(repo, LANE_TABLE_REL), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeTranscript(
  repo: string,
  name: string,
  lines: TranscriptLine[]
): Promise<string> {
  const p = path.join(repo, name);
  await fs.writeFile(p, `${lines.map((l) => JSON.stringify(l)).join("\n")}\n`);
  return p;
}

function runHook(
  payload: Record<string, unknown>,
  extraEnv: Record<string, string> = {}
): { status: number | null; stdout: string; stderr: string } {
  const hookPath = resolveHookPath();
  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: { ...process.env, ...extraEnv }
  });
  return { status: result.status, stdout: result.stdout || "", stderr: result.stderr || "" };
}

const REPORT_BACK_PROMPT =
  "Do the work, then report via SendMessage to main with your findings before you stop.";
const NO_CONTRACT_PROMPT = "Investigate the bug and tell me what you find.";

describe("report-gate.mjs — config gate (opt-in, default OFF)", () => {
  test("features block absent -> never blocks, even with a met block condition", async () => {
    const repo = await tmpRepo("report-gate-noconfig-");
    const transcript = await writeTranscript(repo, "agent.jsonl", [userTurn(REPORT_BACK_PROMPT)]);

    const result = runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcript
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  test('features["report-gate"].enabled = false -> never blocks', async () => {
    const repo = await tmpRepo("report-gate-off-");
    await writeLoopConfig(repo, { features: { "report-gate": { enabled: false } } });
    const transcript = await writeTranscript(repo, "agent.jsonl", [userTurn(REPORT_BACK_PROMPT)]);

    const result = runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcript
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  test("malformed features entry -> never blocks (fail open, not fail closed)", async () => {
    const repo = await tmpRepo("report-gate-malformed-");
    await writeLoopConfig(repo, { features: { "report-gate": "yes" } });
    const transcript = await writeTranscript(repo, "agent.jsonl", [userTurn(REPORT_BACK_PROMPT)]);

    const result = runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcript
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });
});

describe("report-gate.mjs — AC1: report-back contract not fulfilled -> block", () => {
  test("contract marker present, no SendMessage anywhere in transcript -> block with corrective reason", async () => {
    const repo = await tmpRepo("report-gate-block-");
    await writeLoopConfig(repo, GATE_ON);
    const transcript = await writeTranscript(repo, "agent.jsonl", [
      userTurn(REPORT_BACK_PROMPT),
      assistantText("Investigating..."),
      assistantText("Done, here is my summary of findings.")
    ]);

    const result = runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcript
    });
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.decision).toBe("block");
    expect(parsed.reason).toContain("SendMessage");
    expect(parsed.reason).toContain("main");
  });

  test("subsequent send-then-stop succeeds: SendMessage tool_use present -> approve", async () => {
    const repo = await tmpRepo("report-gate-resolved-");
    await writeLoopConfig(repo, GATE_ON);
    const transcript = await writeTranscript(repo, "agent.jsonl", [
      userTurn(REPORT_BACK_PROMPT),
      assistantText("Investigating..."),
      assistantText("Right, let me send my report now."),
      assistantSendMessage()
    ]);

    const result = runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcript
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });
});

describe("report-gate.mjs — AC2: no report-back contract -> never a false-positive block", () => {
  test("dispatch prompt has no SendMessage/main marker -> approve even with no SendMessage call", async () => {
    const repo = await tmpRepo("report-gate-nocontract-");
    await writeLoopConfig(repo, GATE_ON);
    const transcript = await writeTranscript(repo, "agent.jsonl", [
      userTurn(NO_CONTRACT_PROMPT),
      assistantText("Here is what I found: ...")
    ]);

    const result = runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcript
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  test("prompt mentions SendMessage but not main (e.g. a different target) -> approve", async () => {
    const repo = await tmpRepo("report-gate-othertarget-");
    await writeLoopConfig(repo, GATE_ON);
    const transcript = await writeTranscript(repo, "agent.jsonl", [
      userTurn('When done, SendMessage(to: "lead-review", message: "...") with your findings.'),
      assistantText("Here is what I found: ...")
    ]);

    const result = runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcript
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });
});

describe("report-gate.mjs — loop guard", () => {
  test("stop_hook_active = true -> never re-blocks, even with an otherwise-blocking transcript", async () => {
    const repo = await tmpRepo("report-gate-loopguard-");
    await writeLoopConfig(repo, GATE_ON);
    const transcript = await writeTranscript(repo, "agent.jsonl", [
      userTurn(REPORT_BACK_PROMPT),
      assistantText("Done.")
    ]);

    const result = runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcript,
      stop_hook_active: true
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });
});

describe("report-gate.mjs — fail-open paths", () => {
  test("malformed stdin -> exit 0, no block", () => {
    const hookPath = resolveHookPath();
    const result = spawnSync(process.execPath, [hookPath], {
      input: "not json",
      encoding: "utf8",
      env: { ...process.env }
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  test("hook_event_name is not SubagentStop -> never blocks", async () => {
    const repo = await tmpRepo("report-gate-wrongevent-");
    await writeLoopConfig(repo, GATE_ON);
    const transcript = await writeTranscript(repo, "agent.jsonl", [userTurn(REPORT_BACK_PROMPT)]);

    const result = runHook({
      cwd: repo,
      hook_event_name: "Stop",
      agent_transcript_path: transcript
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  test("agent_transcript_path missing from payload -> approve", async () => {
    const repo = await tmpRepo("report-gate-notranscript-");
    await writeLoopConfig(repo, GATE_ON);

    const result = runHook({ cwd: repo, hook_event_name: "SubagentStop" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  test("transcript file does not exist on disk -> approve", async () => {
    const repo = await tmpRepo("report-gate-deleted-");
    await writeLoopConfig(repo, GATE_ON);
    const goneTranscript = path.join(repo, "already-cleaned-up.jsonl");

    const result = runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: goneTranscript
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  test("transcript exceeds the byte cap -> approve without reading it", async () => {
    const repo = await tmpRepo("report-gate-oversized-");
    await writeLoopConfig(repo, GATE_ON);
    // A transcript that WOULD block if read (contract present, no SendMessage),
    // but the byte cap is set below its size so the hook must skip parsing.
    const transcript = await writeTranscript(repo, "agent.jsonl", [
      userTurn(REPORT_BACK_PROMPT),
      assistantText("Done, no SendMessage call here.")
    ]);
    const size = (await fs.stat(transcript)).size;

    const result = runHook(
      { cwd: repo, hook_event_name: "SubagentStop", agent_transcript_path: transcript },
      { REPORT_GATE_MAX_BYTES: String(size - 1) }
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  test("malformed JSONL lines are skipped, valid signal lines still found", async () => {
    const repo = await tmpRepo("report-gate-malformed-lines-");
    await writeLoopConfig(repo, GATE_ON);
    const p = path.join(repo, "agent.jsonl");
    await fs.writeFile(
      p,
      [
        "not json at all",
        JSON.stringify(userTurn(REPORT_BACK_PROMPT)),
        "{ broken json",
        JSON.stringify(assistantSendMessage()),
        ""
      ].join("\n")
    );

    const result = runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: p
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(""); // SendMessage present -> approve despite noise lines
  });

  test("scan exceeding the wall-clock cap -> approve (fail open), hook still exits promptly", async () => {
    const repo = await tmpRepo("report-gate-timeout-");
    await writeLoopConfig(repo, GATE_ON);
    // Enough lines that JSON-parsing all of them is not instantaneous, paired
    // with a near-zero timeout so the race is decided by the timer, not by
    // real slowness — deterministic because this is a CPU-bound in-process
    // parse loop, not a child-process spawn race (see file header).
    const lines: TranscriptLine[] = [userTurn(REPORT_BACK_PROMPT)];
    for (let i = 0; i < 20000; i++) {
      lines.push(assistantText(`padding line ${i} with some extra text to parse`));
    }
    const transcript = await writeTranscript(repo, "agent.jsonl", lines);

    const start = Date.now();
    const result = runHook(
      { cwd: repo, hook_event_name: "SubagentStop", agent_transcript_path: transcript },
      { REPORT_GATE_TIMEOUT_MS: "1" }
    );
    const elapsed = Date.now() - start;
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(elapsed).toBeLessThan(10000);
  });
});

// FEAT-008 / SLICE-43 — receipt detection + lane table. This side effect is
// independent of the block/approve gate tested above: it runs whether or
// not features["report-gate"].enabled is set, never touches stdout, and
// only ever writes .claude/state/loop/receipt-lane-table.json. Every test
// below asserts on that file, never on result.stdout/status, to keep the
// two mechanisms' test coverage observably distinct (AC-3).
describe("report-gate.mjs — receipt detection + lane table", () => {
  test("valid receipt + agent_id, report-gate feature absent -> lane table entry written anyway", async () => {
    const repo = await tmpRepo("report-gate-receipt-nogate-");
    // Deliberately no loop.json at all — this is the "gate is OFF/absent"
    // case the block decision fails open on, but receipt recording must
    // not depend on it (see report-gate.mjs's addendum comment).
    const transcript = await writeTranscript(repo, "agent.jsonl", [
      userTurn(NO_CONTRACT_PROMPT),
      assistantSendMessageWithReceipt()
    ]);

    runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcript,
      agent_id: "agent-1"
    });

    const table = await readLaneTableFile(repo);
    expect(table).not.toBeNull();
    expect(table?.["agent-1"]).toMatchObject({ receiptSeen: true, transcriptPath: transcript });
  });

  test("SendMessage present but no valid receipt inside it -> no lane table entry", async () => {
    const repo = await tmpRepo("report-gate-receipt-noreceipt-");
    const transcript = await writeTranscript(repo, "agent.jsonl", [
      userTurn(NO_CONTRACT_PROMPT),
      assistantSendMessage() // message: "done" — no JSON receipt inside
    ]);

    runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcript,
      agent_id: "agent-1"
    });

    const table = await readLaneTableFile(repo);
    expect(table === null || table["agent-1"] === undefined).toBe(true);
  });

  test("no SendMessage at all (the report-gate block case) -> lane table stays empty, block still fires", async () => {
    const repo = await tmpRepo("report-gate-receipt-noreport-");
    await writeLoopConfig(repo, GATE_ON);
    const transcript = await writeTranscript(repo, "agent.jsonl", [
      userTurn(REPORT_BACK_PROMPT),
      assistantText("Done, here is my summary of findings.")
    ]);

    const result = runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcript,
      agent_id: "agent-1"
    });

    // Distinctness (AC-3): the block decision still fires exactly as before...
    expect(JSON.parse(result.stdout).decision).toBe("block");
    // ...and the lane table records no receipt sighting for this agent.
    const table = await readLaneTableFile(repo);
    expect(table === null || table["agent-1"] === undefined).toBe(true);
  });

  test("missing agent_id in payload -> no lane table write even with a valid receipt", async () => {
    const repo = await tmpRepo("report-gate-receipt-noagentid-");
    const transcript = await writeTranscript(repo, "agent.jsonl", [
      userTurn(NO_CONTRACT_PROMPT),
      assistantSendMessageWithReceipt()
    ]);

    runHook({ cwd: repo, hook_event_name: "SubagentStop", agent_transcript_path: transcript });

    const table = await readLaneTableFile(repo);
    expect(table).toBeNull();
  });

  test("transcript missing from disk -> no throw, exit 0, no lane table write (fail-soft)", async () => {
    const repo = await tmpRepo("report-gate-receipt-notranscript-");
    const goneTranscript = path.join(repo, "already-gone.jsonl");

    const result = runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: goneTranscript,
      agent_id: "agent-1"
    });

    expect(result.status).toBe(0);
    expect(await readLaneTableFile(repo)).toBeNull();
  });

  test("corrupt JSONL lines around a valid receipt -> still detected, malformed lines skipped", async () => {
    const repo = await tmpRepo("report-gate-receipt-corruptlines-");
    const p = path.join(repo, "agent.jsonl");
    await fs.writeFile(
      p,
      [
        "not json at all",
        JSON.stringify(userTurn(NO_CONTRACT_PROMPT)),
        "{ broken json",
        JSON.stringify(assistantSendMessageWithReceipt()),
        ""
      ].join("\n")
    );

    runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: p,
      agent_id: "agent-1"
    });

    const table = await readLaneTableFile(repo);
    expect(table?.["agent-1"]).toMatchObject({ receiptSeen: true });
  });

  test("agent sends a draft then a corrected receipt -> the LAST valid receipt wins", async () => {
    const repo = await tmpRepo("report-gate-receipt-lastwins-");
    const firstReceipt = { ...SAMPLE_RECEIPT, evidence_path: "first.md" };
    const secondReceipt = { ...SAMPLE_RECEIPT, evidence_path: "second.md" };
    const transcript = await writeTranscript(repo, "agent.jsonl", [
      userTurn(NO_CONTRACT_PROMPT),
      assistantSendMessageWithReceipt(firstReceipt),
      assistantText("Wait, let me correct that."),
      assistantSendMessageWithReceipt(secondReceipt)
    ]);

    runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcript,
      agent_id: "agent-1"
    });

    const table = await readLaneTableFile(repo);
    expect(table?.["agent-1"]).toMatchObject({ receiptSeen: true, transcriptPath: transcript });
  });

  test("oversized transcript is skipped without being read -> no lane table write", async () => {
    const repo = await tmpRepo("report-gate-receipt-oversized-");
    const transcript = await writeTranscript(repo, "agent.jsonl", [
      userTurn(NO_CONTRACT_PROMPT),
      assistantSendMessageWithReceipt()
    ]);
    const size = (await fs.stat(transcript)).size;

    runHook(
      {
        cwd: repo,
        hook_event_name: "SubagentStop",
        agent_transcript_path: transcript,
        agent_id: "agent-1"
      },
      { REPORT_GATE_MAX_BYTES: String(size - 1) }
    );

    expect(await readLaneTableFile(repo)).toBeNull();
  });

  test("stop_hook_active = true -> no lane table write (loop guard applies here too)", async () => {
    const repo = await tmpRepo("report-gate-receipt-loopguard-");
    const transcript = await writeTranscript(repo, "agent.jsonl", [
      userTurn(NO_CONTRACT_PROMPT),
      assistantSendMessageWithReceipt()
    ]);

    runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcript,
      agent_id: "agent-1",
      stop_hook_active: true
    });

    expect(await readLaneTableFile(repo)).toBeNull();
  });

  test("second agent's sighting does not clobber a first agent's existing entry", async () => {
    const repo = await tmpRepo("report-gate-receipt-multiagent-");
    const transcriptA = await writeTranscript(repo, "agent-a.jsonl", [
      userTurn(NO_CONTRACT_PROMPT),
      assistantSendMessageWithReceipt()
    ]);
    const transcriptB = await writeTranscript(repo, "agent-b.jsonl", [
      userTurn(NO_CONTRACT_PROMPT),
      assistantSendMessageWithReceipt()
    ]);

    runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcriptA,
      agent_id: "agent-a"
    });
    runHook({
      cwd: repo,
      hook_event_name: "SubagentStop",
      agent_transcript_path: transcriptB,
      agent_id: "agent-b"
    });

    const table = await readLaneTableFile(repo);
    expect(Object.keys(table ?? {}).sort()).toEqual(["agent-a", "agent-b"]);
  });
});
