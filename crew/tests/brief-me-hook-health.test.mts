// tests/brief-me-hook-health.test.mjs
import { test, expect } from "bun:test";

import { formatHookHealthSection } from "../scripts/lib/briefing.mjs";

test("formatHookHealthSection returns green header when all hooks clean", () => {
  const health = {
    hooks: [
      { name: "check-redundant-read", errorCount24h: 0, status: "green" as const },
      { name: "record-read-content", errorCount24h: 0, status: "green" as const },
      { name: "preflight-shell", errorCount24h: 0, status: "green" as const },
      { name: "check-subagent-return", errorCount24h: 0, status: "green" as const }
    ]
  };
  const section = formatHookHealthSection(health);
  expect(section).toMatch(/##\s+Hook health/);
  expect(section).toMatch(/all hooks clean/i);
  expect(section).not.toMatch(/yellow/i);
});

test("formatHookHealthSection shows error count for yellow hooks", () => {
  const health = {
    hooks: [
      { name: "preflight-shell", errorCount24h: 3, status: "yellow" as const },
      { name: "check-redundant-read", errorCount24h: 0, status: "green" as const }
    ]
  };
  const section = formatHookHealthSection(health);
  expect(section).toMatch(/preflight-shell/);
  expect(section).toMatch(/3/);
});
