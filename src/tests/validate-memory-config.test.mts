import { test, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { checkMemoryConfig } from "../scripts/validate-memory-config.mjs";

const fullConfig = {
  memory: {
    enabled: true,
    project: "runner-plugin",
    feedback: { enabled: true, timeoutMs: 20000, creditLoop: { enabled: true, k: 5 } }
  }
};

test("full current-contract config passes", () => {
  expect(checkMemoryConfig(fullConfig).status).toBe("ok");
});

test("memory.enabled: 'auto' counts as enabled and is validated", () => {
  const cfg = structuredClone(fullConfig) as Record<string, any>;
  cfg.memory.enabled = "auto";
  expect(checkMemoryConfig(cfg).status).toBe("ok");
});

test("missing creditLoop key is drift naming the credit-loop contract", () => {
  const cfg = structuredClone(fullConfig) as Record<string, any>;
  delete cfg.memory.feedback.creditLoop;
  const result = checkMemoryConfig(cfg);
  expect(result.status).toBe("drift");
  if (result.status === "drift") {
    expect(result.missing.map((m) => m.keyPath)).toContain("memory.feedback.creditLoop.enabled");
    expect(result.missing[0]?.contract ?? "").not.toBe("");
  }
});

test("creditLoop.enabled: false still passes — explicit choice, not drift", () => {
  const cfg = structuredClone(fullConfig) as Record<string, any>;
  cfg.memory.feedback.creditLoop.enabled = false;
  expect(checkMemoryConfig(cfg).status).toBe("ok");
});

test("memory.enabled: false opts the repo out entirely", () => {
  expect(checkMemoryConfig({ memory: { enabled: false } }).status).toBe("memory-disabled");
});

test("absent memory block opts out", () => {
  expect(checkMemoryConfig({ loop: {} }).status).toBe("memory-disabled");
});

test("missing project is drift", () => {
  const cfg = structuredClone(fullConfig) as Record<string, any>;
  delete cfg.memory.project;
  const result = checkMemoryConfig(cfg);
  expect(result.status).toBe("drift");
  if (result.status === "drift") {
    expect(result.missing.map((m) => m.keyPath)).toContain("memory.project");
  }
});

test("this repo's own live loop.json passes the gate", async () => {
  const raw = await readFile(
    fileURLToPath(new URL("../../.claude/loop.json", import.meta.url)),
    "utf8"
  );
  expect(checkMemoryConfig(JSON.parse(raw)).status).toBe("ok");
});
