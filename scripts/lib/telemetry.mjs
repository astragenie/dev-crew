import fs from "node:fs/promises";
import path from "node:path";
// Append-only JSONL telemetry. Safe-by-construction: no shell, just JSON
// stringification. Best-effort — failures (e.g. read-only filesystem)
// don't crash the caller.
export function telemetryPath(repoPath) {
    return path.join(repoPath, ".claude", "logs", "loop.jsonl");
}
export async function logEvent(repoPath, event) {
    if (!event || typeof event !== "object")
        return { logged: false, reason: "invalid event" };
    const target = telemetryPath(repoPath);
    const line = JSON.stringify({
        timestamp: new Date().toISOString(),
        ...event
    });
    try {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.appendFile(target, `${line}\n`);
        return { logged: true, path: target };
    }
    catch (error) {
        return { logged: false, reason: error instanceof Error ? error.message : String(error) };
    }
}
export async function readEvents(repoPath, { limit = null } = {}) {
    const target = telemetryPath(repoPath);
    let content;
    try {
        content = await fs.readFile(target, "utf8");
    }
    catch {
        return [];
    }
    const lines = content.split("\n").filter((l) => l.trim());
    const events = [];
    for (const line of lines) {
        try {
            events.push(JSON.parse(line));
        }
        catch {
            /* skip malformed */
        }
    }
    if (limit)
        return events.slice(-limit);
    return events;
}
