import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
