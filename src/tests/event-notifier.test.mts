// @ts-nocheck
import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { notifyEvent, readNotifyConfig, _internals } from "../scripts/lib/event-notifier.mjs";
import type { LoopEvent, NotifyConfig } from "../scripts/lib/event-notifier.mjs";

const WEBHOOK_URL = "https://hooks.example.com/loop";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<LoopEvent> = {}): LoopEvent {
  return {
    type: "slice-complete",
    sliceId: "SLICE-042",
    featureId: "FEAT-099",
    details: "SLICE-042 completed",
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

async function tmpRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "event-notifier-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Test 1: enabled: false → early return, no dispatch
// ---------------------------------------------------------------------------

describe("notifyEvent: enabled guard", () => {
  it("returns immediately when enabled is false", async () => {
    // Spy on _internals.spawnSync to ensure it is never called
    const calls: string[] = [];
    const orig = _internals.spawnSync;
    _internals.spawnSync = (cmd: string) => {
      calls.push(cmd);
      return { pid: 0, output: [], stdout: "", stderr: "", status: 0, signal: null };
    };
    try {
      const config: NotifyConfig = {
        enabled: false,
        mode: "osNotification"
      };
      await notifyEvent(makeEvent(), config);
      assert.equal(calls.length, 0, "spawnSync must not be called when disabled");
    } finally {
      _internals.spawnSync = orig;
    }
  });

  it("returns immediately when enabled is absent (undefined)", async () => {
    const calls: string[] = [];
    const orig = _internals.spawnSync;
    _internals.spawnSync = (cmd: string) => {
      calls.push(cmd);
      return { pid: 0, output: [], stdout: "", stderr: "", status: 0, signal: null };
    };
    try {
      const config: NotifyConfig = {};
      await notifyEvent(makeEvent(), config);
      assert.equal(calls.length, 0, "spawnSync must not be called when config is empty");
    } finally {
      _internals.spawnSync = orig;
    }
  });
});

// ---------------------------------------------------------------------------
// Test 2: events filter — type not in list → no dispatch
// ---------------------------------------------------------------------------

describe("notifyEvent: events filter", () => {
  it("skips notification when event type is not in the events list", async () => {
    const calls: string[] = [];
    const orig = _internals.spawnSync;
    _internals.spawnSync = (cmd: string) => {
      calls.push(cmd);
      return { pid: 0, output: [], stdout: "", stderr: "", status: 0, signal: null };
    };
    try {
      const config: NotifyConfig = {
        enabled: true,
        mode: "osNotification",
        events: ["halt-badge", "cost-alert"] // does NOT include "slice-complete"
      };
      await notifyEvent(makeEvent({ type: "slice-complete" }), config);
      assert.equal(calls.length, 0, "spawnSync must not be called for filtered event type");
    } finally {
      _internals.spawnSync = orig;
    }
  });

  it("fires notification when event type IS in the events list", async () => {
    const calls: string[] = [];
    const orig = _internals.spawnSync;
    _internals.spawnSync = (cmd: string) => {
      calls.push(cmd);
      return { pid: 0, output: [], stdout: "", stderr: "", status: 0, signal: null };
    };
    try {
      const config: NotifyConfig = {
        enabled: true,
        mode: "osNotification",
        events: ["slice-complete", "halt-badge"]
      };
      await notifyEvent(makeEvent({ type: "slice-complete" }), config);
      assert.ok(calls.length > 0, "spawnSync should be called for matching event type");
    } finally {
      _internals.spawnSync = orig;
    }
  });
});

// ---------------------------------------------------------------------------
// Test 3: osNotification mode on Windows calls powershell
// ---------------------------------------------------------------------------

describe("notifyEvent: osNotification mode", () => {
  it("calls powershell on win32 platform (via _internals spy)", async () => {
    const calls: Array<{ cmd: string; args: string[] }> = [];
    const orig = _internals.spawnSync;
    _internals.spawnSync = (cmd: string, args: string[]) => {
      calls.push({ cmd, args });
      return { pid: 0, output: [], stdout: "", stderr: "", status: 0, signal: null };
    };

    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });

    try {
      const config: NotifyConfig = { enabled: true, mode: "osNotification" };
      await notifyEvent(makeEvent({ type: "slice-complete", details: "done" }), config);
      const powershellCall = calls.find((c) => c.cmd === "powershell.exe");
      assert.ok(powershellCall, "expected powershell.exe to be called on win32");
      // The command arg should include the details text
      const cmdArg = powershellCall.args.join(" ");
      assert.ok(cmdArg.includes("done"), `expected 'done' in powershell args: ${cmdArg}`);
    } finally {
      _internals.spawnSync = orig;
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        configurable: true
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Test 4: webhook mode calls fetch with correct payload
// ---------------------------------------------------------------------------

describe("notifyEvent: webhook mode", () => {
  it("calls fetch with POST + JSON payload matching the event", async () => {
    const capturedRequests: Array<{ url: string; init: any }> = [];
    const orig = _internals.fetch;
    _internals.fetch = async (url: string, init?: any) => {
      capturedRequests.push({ url, init });
      return new Response(null, { status: 200 });
    };

    try {
      const event = makeEvent({ type: "halt-badge", details: "session-drift" });
      const config: NotifyConfig = {
        enabled: true,
        mode: "webhook",
        webhookUrl: WEBHOOK_URL
      };
      await notifyEvent(event, config);

      assert.equal(capturedRequests.length, 1, "fetch called exactly once");
      const req = capturedRequests[0]!;
      assert.equal(req.url, WEBHOOK_URL);
      assert.equal(req.init.method, "POST");
      assert.equal(req.init.headers["Content-Type"], "application/json");
      const body = JSON.parse(req.init.body);
      assert.equal(body.type, "halt-badge");
      assert.equal(body.details, "session-drift");
    } finally {
      _internals.fetch = orig;
    }
  });

  it("swallows fetch errors and does not throw", async () => {
    const orig = _internals.fetch;
    _internals.fetch = async () => {
      throw new Error("network failure");
    };
    const stderrLines: string[] = [];
    const origErr = console.error;
    console.error = (...args: any[]) => stderrLines.push(args.join(" "));

    try {
      const config: NotifyConfig = {
        enabled: true,
        mode: "webhook",
        webhookUrl: WEBHOOK_URL
      };
      await assert.doesNotReject(notifyEvent(makeEvent(), config));
      assert.ok(
        stderrLines.some((l) => l.includes("webhook")),
        "expected stderr log for failure"
      );
    } finally {
      _internals.fetch = orig;
      console.error = origErr;
    }
  });
});

// ---------------------------------------------------------------------------
// Test 5: customCommand mode interpolates {type} token
// ---------------------------------------------------------------------------

describe("notifyEvent: customCommand mode", () => {
  it("interpolates {type} and other tokens in the command", async () => {
    const calls: Array<{ cmd: string; args: string[] }> = [];
    const orig = _internals.spawnSync;
    _internals.spawnSync = (cmd: string, args: string[]) => {
      calls.push({ cmd, args });
      return { pid: 0, output: [], stdout: "", stderr: "", status: 0, signal: null };
    };

    try {
      const event = makeEvent({
        type: "cost-alert",
        sliceId: "SLICE-007",
        featureId: "FEAT-042",
        details: "cost spike"
      });
      const config: NotifyConfig = {
        enabled: true,
        mode: "customCommand",
        command: "echo {type} {sliceId} {featureId} {details}"
      };
      await notifyEvent(event, config);

      assert.ok(calls.length > 0, "spawnSync should have been called");
      const spawnedArgs = calls[0]!.args;
      // The last argument (the interpolated command) should contain the values
      const commandStr = spawnedArgs[spawnedArgs.length - 1]!;
      assert.ok(commandStr.includes("cost-alert"), `expected 'cost-alert' in: ${commandStr}`);
      assert.ok(commandStr.includes("SLICE-007"), `expected 'SLICE-007' in: ${commandStr}`);
      assert.ok(commandStr.includes("FEAT-042"), `expected 'FEAT-042' in: ${commandStr}`);
      assert.ok(commandStr.includes("cost spike"), `expected 'cost spike' in: ${commandStr}`);
    } finally {
      _internals.spawnSync = orig;
    }
  });
});

// ---------------------------------------------------------------------------
// Test 6: any mode — errors are swallowed, function does not throw
// ---------------------------------------------------------------------------

describe("notifyEvent: error resilience", () => {
  it("does not throw when spawnSync throws on osNotification", async () => {
    const orig = _internals.spawnSync;
    _internals.spawnSync = () => {
      throw new Error("simulated spawn failure");
    };
    try {
      const config: NotifyConfig = { enabled: true, mode: "osNotification" };
      await assert.doesNotReject(notifyEvent(makeEvent(), config));
    } finally {
      _internals.spawnSync = orig;
    }
  });

  it("does not throw when spawnSync throws on customCommand", async () => {
    const orig = _internals.spawnSync;
    _internals.spawnSync = () => {
      throw new Error("simulated spawn failure");
    };
    try {
      const config: NotifyConfig = {
        enabled: true,
        mode: "customCommand",
        command: "echo {type}"
      };
      await assert.doesNotReject(notifyEvent(makeEvent(), config));
    } finally {
      _internals.spawnSync = orig;
    }
  });
});

// ---------------------------------------------------------------------------
// Test 7: readNotifyConfig returns {} when loop.json absent
// ---------------------------------------------------------------------------

describe("readNotifyConfig", () => {
  it("returns empty object when loop.json is absent", async () => {
    const repo = await tmpRepo();
    try {
      const cfg = await readNotifyConfig(repo);
      assert.deepEqual(cfg, {});
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });

  it("returns the notifications block when loop.json has it", async () => {
    const repo = await tmpRepo();
    try {
      const loopJson = {
        loop: {
          notifications: {
            enabled: true,
            mode: "webhook",
            events: ["slice-complete"],
            webhookUrl: WEBHOOK_URL
          }
        }
      };
      await fs.writeFile(path.join(repo, ".claude", "loop.json"), JSON.stringify(loopJson));
      const cfg = await readNotifyConfig(repo);
      assert.equal(cfg.enabled, true);
      assert.equal(cfg.mode, "webhook");
      assert.deepEqual(cfg.events, ["slice-complete"]);
      assert.equal(cfg.webhookUrl, WEBHOOK_URL);
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });

  it("returns empty object when loop.json has no notifications key", async () => {
    const repo = await tmpRepo();
    try {
      await fs.writeFile(
        path.join(repo, ".claude", "loop.json"),
        JSON.stringify({ loop: { autoMode: true } })
      );
      const cfg = await readNotifyConfig(repo);
      assert.deepEqual(cfg, {});
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });

  it("returns empty object when loop.json is malformed JSON", async () => {
    const repo = await tmpRepo();
    try {
      await fs.writeFile(path.join(repo, ".claude", "loop.json"), "{ not valid json }");
      const cfg = await readNotifyConfig(repo);
      assert.deepEqual(cfg, {});
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });
});
