// FEAT-155: in-process tests for check-task-update-burst hook core.
import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCheckTaskUpdateBurstHook } from "../hooks/lib/check-task-update-burst.mjs";

async function makeRepo(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "task-burst-test-"));
}

async function cleanup(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

function makePayload(sessionId: string, cwd: string): string {
  return JSON.stringify({
    session_id: sessionId,
    cwd,
    tool_input: { taskId: "1", status: "in_progress" }
  });
}

async function readBurstLog(repo: string): Promise<string[]> {
  const file = path.join(repo, ".claude", "logs", "task-update-bursts.jsonl");
  try {
    const raw = await fs.readFile(file, "utf8");
    return raw.split("\n").filter((l) => l.length > 0);
  } catch {
    return [];
  }
}

test("FEAT-155: 1 TaskUpdate → no burst row", async () => {
  const repo = await makeRepo();
  try {
    await runCheckTaskUpdateBurstHook(makePayload("s1", repo));
    const lines = await readBurstLog(repo);
    expect(lines.length).toBe(0);
  } finally {
    await cleanup(repo);
  }
});

test("FEAT-155: 2 consecutive TaskUpdates → no burst row (below threshold)", async () => {
  const repo = await makeRepo();
  try {
    await runCheckTaskUpdateBurstHook(makePayload("s2", repo));
    await runCheckTaskUpdateBurstHook(makePayload("s2", repo));
    const lines = await readBurstLog(repo);
    expect(lines.length).toBe(0);
  } finally {
    await cleanup(repo);
  }
});

test("FEAT-155: 3 consecutive TaskUpdates → burst row written", async () => {
  const repo = await makeRepo();
  try {
    await runCheckTaskUpdateBurstHook(makePayload("s3", repo));
    await runCheckTaskUpdateBurstHook(makePayload("s3", repo));
    await runCheckTaskUpdateBurstHook(makePayload("s3", repo));
    const lines = await readBurstLog(repo);
    expect(lines.length).toBe(1);
    const row: unknown = JSON.parse(lines[0]!);
    expect((row as Record<string, unknown>).event).toBe("task-update-burst");
    expect((row as Record<string, unknown>).consecutive_count).toBe(3);
  } finally {
    await cleanup(repo);
  }
});

test("FEAT-155: 5 consecutive TaskUpdates → 3 burst rows (>=3, >=4, >=5)", async () => {
  const repo = await makeRepo();
  try {
    for (let i = 0; i < 5; i++) {
      await runCheckTaskUpdateBurstHook(makePayload("s4", repo));
    }
    const lines = await readBurstLog(repo);
    expect(lines.length).toBe(3);
    expect((JSON.parse(lines[2]!) as Record<string, unknown>).consecutive_count).toBe(5);
  } finally {
    await cleanup(repo);
  }
});

test("FEAT-155: cost-hygiene config feature disabled → no burst row, no state file", async () => {
  const repo = await makeRepo();
  try {
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "crew.json"),
      JSON.stringify({ features: { "cost-hygiene": { enabled: false } } }),
      "utf8"
    );
    await runCheckTaskUpdateBurstHook(makePayload("s5", repo));
    await runCheckTaskUpdateBurstHook(makePayload("s5", repo));
    await runCheckTaskUpdateBurstHook(makePayload("s5", repo));
    const lines = await readBurstLog(repo);
    expect(lines.length).toBe(0);
    const stateFile = path.join(repo, ".claude", "state", "task-update-burst", "s5.json");
    let stateExists = false;
    try {
      await fs.access(stateFile);
      stateExists = true;
    } catch {
      stateExists = false;
    }
    expect(stateExists).toBe(false);
  } finally {
    await cleanup(repo);
  }
});

test("FEAT-155: malformed payload → no throw, no burst row", async () => {
  const repo = await makeRepo();
  try {
    await runCheckTaskUpdateBurstHook("not-json");
    await runCheckTaskUpdateBurstHook(JSON.stringify({ session_id: 123 }));
    const lines = await readBurstLog(repo);
    expect(lines.length).toBe(0);
  } finally {
    await cleanup(repo);
  }
});
