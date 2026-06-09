import fs from "node:fs";
import path from "node:path";
export function readMarker(repoRoot, runId, childId) {
    const markerPath = path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId, `${childId}.result.json`);
    if (!fs.existsSync(markerPath)) {
        return null;
    }
    try {
        const raw = fs.readFileSync(markerPath, "utf8");
        return JSON.parse(raw);
    }
    catch (err) {
        process.stderr.write(`[dispatch] marker parse failed for ${childId}: ${err.message}\n`);
        return null;
    }
}
export function appendTrace(repoRoot, runId, entry) {
    const dir = path.join(repoRoot, ".claude/artifacts/loop/dispatch", runId);
    fs.mkdirSync(dir, { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
    fs.appendFileSync(path.join(dir, "trace.jsonl"), line);
}
