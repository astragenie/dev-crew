import fs from "node:fs/promises";
import path from "node:path";

import { fanoutEnvelope } from "./webhook-fanout.mjs";
import { appendJsonl } from "./jsonl-append.mjs";

// Append-only JSONL telemetry. Safe-by-construction: no shell, just JSON
// stringification. Best-effort — failures (e.g. read-only filesystem)
// don't crash the caller.

export function telemetryPath(repoPath: string) {
  return path.join(repoPath, ".claude", "logs", "loop.jsonl");
}

export async function logEvent(repoPath: string, event: Record<string, unknown>) {
  if (!event || typeof event !== "object") return { logged: false, reason: "invalid event" };
  const target = telemetryPath(repoPath);
  const record = { timestamp: new Date().toISOString(), ...event };
  try {
    await appendJsonl(target, record);
  } catch (error) {
    return { logged: false, reason: error instanceof Error ? error.message : String(error) };
  }

  // M1: fan out to runner via webhook if configured. Fail-silent.
  if (typeof event.command === "string" && event.command.length > 0) {
    const kind = `loop.${(event.command as string).replace(/\s+/g, ".")}`;
    const { command: _c, ...rest } = event;
    await fanoutEnvelope(repoPath, kind, rest as Record<string, unknown>);
  }

  return { logged: true, path: target };
}

export async function readEvents(repoPath: string, { limit = null }: Record<string, unknown> = {}) {
  const target = telemetryPath(repoPath);
  let content;
  try {
    content = await fs.readFile(target, "utf8");
  } catch {
    return [];
  }
  const lines = content.split("\n").filter((l) => l.trim());
  const events: any[] = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch {
      /* skip malformed */
    }
  }
  if (limit) return events.slice(-limit);
  return events;
}
