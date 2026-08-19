// tests/hook-error-events.test.mts
import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function parseEvents(dir: string) {
  const p = path.join(dir, ".claude", "logs", "events.jsonl");
  try {
    const text = await fs.readFile(p, "utf8");
    return text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

import { logHookError } from "../hooks/hook-error.mjs";

test("logHookError emits structured hook_error event to events.jsonl", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hook-err-"));
  await logHookError(dir, "check-redundant-read", new Error("test error"));
  const events = await parseEvents(dir);
  expect(events.length).toBe(1);
  expect(events[0].type).toBe("hook_error");
  expect(events[0].hook).toBe("check-redundant-read");
  expect(events[0].error).toMatch(/test error/);
  expect(events[0].ts).toBeTruthy();
  await fs.rm(dir, { recursive: true, force: true });
});

test("logHookError does not throw when logs dir does not exist", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hook-err2-"));
  await expect(logHookError(dir, "preflight-shell", new Error("oops"))).resolves.toBeUndefined();
  await fs.rm(dir, { recursive: true, force: true });
});
