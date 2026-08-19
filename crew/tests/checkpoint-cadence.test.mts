// dev-team#174: checkpoint-cadence PostToolUse hook tests.
import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCheckpointCadenceHook } from "../hooks/lib/checkpoint-cadence.mjs";

async function makeTempRepo() {
  return fs.mkdtemp(path.join(os.tmpdir(), "checkpoint-cadence-"));
}
async function cleanup(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
}
function input(cwd: string, tool: string, session = "sess-1") {
  return JSON.stringify({ session_id: session, cwd, tool_name: tool });
}

test("does not nudge before the first Edit/Write (read-heavy phase)", async () => {
  const repo = await makeTempRepo();
  try {
    process.env["CREW_CHECKPOINT_CADENCE_N"] = "3";
    for (let i = 0; i < 10; i++) {
      const out = await runCheckpointCadenceHook(input(repo, "Read"));
      expect(out, `Read #${i} must not nudge before any edit`).toBe(null);
    }
  } finally {
    delete process.env["CREW_CHECKPOINT_CADENCE_N"];
    await cleanup(repo);
  }
});

test("nudges once the threshold of post-edit tool calls is reached", async () => {
  const repo = await makeTempRepo();
  try {
    process.env["CREW_CHECKPOINT_CADENCE_N"] = "3";
    // First Edit arms the counter and is itself call #1.
    expect(await runCheckpointCadenceHook(input(repo, "Write"))).toBe(null);
    expect(await runCheckpointCadenceHook(input(repo, "Read"))).toBe(null);
    const out = await runCheckpointCadenceHook(input(repo, "Bash")); // call #3 → fire
    expect(out, "expected a nudge at the threshold").toBeTruthy();
    const parsed = JSON.parse(out!);
    expect(parsed.decision).toBe("approve");
    expect(parsed.systemMessage).toMatch(/checkpoint/i);
    expect(!("hookSpecificOutput" in parsed), "must not use hookSpecificOutput (#176 trap)").toBeTruthy();
  } finally {
    delete process.env["CREW_CHECKPOINT_CADENCE_N"];
    await cleanup(repo);
  }
});

test("counter resets after firing — nudges on a fixed cadence, not every call", async () => {
  const repo = await makeTempRepo();
  try {
    process.env["CREW_CHECKPOINT_CADENCE_N"] = "2";
    await runCheckpointCadenceHook(input(repo, "Edit")); // #1
    const first = await runCheckpointCadenceHook(input(repo, "Bash")); // #2 → fire
    expect(first, "first nudge at call 2").toBeTruthy();
    const between = await runCheckpointCadenceHook(input(repo, "Bash")); // #1 after reset
    expect(between, "no nudge immediately after reset").toBe(null);
    const second = await runCheckpointCadenceHook(input(repo, "Bash")); // #2 → fire again
    expect(second, "second nudge one cadence later").toBeTruthy();
  } finally {
    delete process.env["CREW_CHECKPOINT_CADENCE_N"];
    await cleanup(repo);
  }
});

test("respects the disable flag in crew.json", async () => {
  const repo = await makeTempRepo();
  try {
    process.env["CREW_CHECKPOINT_CADENCE_N"] = "1";
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "crew.json"),
      JSON.stringify({ features: { "checkpoint-cadence": { enabled: false } } })
    );
    await runCheckpointCadenceHook(input(repo, "Edit"));
    const out = await runCheckpointCadenceHook(input(repo, "Edit"));
    expect(out, "disabled feature must never nudge").toBe(null);
  } finally {
    delete process.env["CREW_CHECKPOINT_CADENCE_N"];
    await cleanup(repo);
  }
});

test("malformed input returns null (never throws)", async () => {
  expect(await runCheckpointCadenceHook("not json")).toBe(null);
  expect(await runCheckpointCadenceHook(JSON.stringify({ foo: 1 }))).toBe(null);
});
