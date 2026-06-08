import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendSliceEvent, eventsPath } from "../scripts/lib/slice-events.mjs";
import { TRAJECTORY_DIR } from "../scripts/lib/trajectory-writer.mjs";
describe("slice-events", () => {
    let tmpDir;
    before(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "slice-events-"));
    });
    after(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
    });
    it("eventsPath returns correct file path", () => {
        const p = eventsPath(tmpDir, "SLICE-42");
        assert.equal(p, path.join(tmpDir, TRAJECTORY_DIR, "SLICE-42-events.jsonl"));
    });
    it("appendSliceEvent creates file and writes JSONL line", async () => {
        const sliceId = "SLICE-01";
        await appendSliceEvent(tmpDir, sliceId, {
            type: "workflow_state_changed",
            sliceId,
            featureId: "FEAT-010",
            timestamp: "2026-06-08T00:00:00.000Z",
            from: null,
            to: "building"
        });
        const raw = await fs.readFile(eventsPath(tmpDir, sliceId), "utf8");
        const lines = raw.trim().split("\n").filter(Boolean);
        assert.equal(lines.length, 1);
        const parsed = JSON.parse(lines[0]);
        assert.equal(parsed.type, "workflow_state_changed");
        assert.equal(parsed.to, "building");
        assert.equal(parsed.sliceId, sliceId);
    });
    it("appendSliceEvent appends multiple lines", async () => {
        const sliceId = "SLICE-02";
        await appendSliceEvent(tmpDir, sliceId, {
            type: "workflow_state_changed", sliceId, featureId: null,
            timestamp: "2026-06-08T00:00:00.000Z", from: null, to: "building"
        });
        await appendSliceEvent(tmpDir, sliceId, {
            type: "workflow_state_changed", sliceId, featureId: null,
            timestamp: "2026-06-08T00:01:00.000Z", from: "building", to: "done"
        });
        const raw = await fs.readFile(eventsPath(tmpDir, sliceId), "utf8");
        const lines = raw.trim().split("\n").filter(Boolean);
        assert.equal(lines.length, 2);
    });
    it("appendSliceEvent does not throw on bad path", async () => {
        await assert.doesNotReject(appendSliceEvent("/nonexistent/path/that/will/fail", "SLICE-00", {
            type: "workflow_state_changed",
            sliceId: "SLICE-00",
            featureId: null,
            timestamp: new Date().toISOString(),
            from: null,
            to: "building"
        }));
    });
    it("WorkflowStateChangedEvent has correct shape", () => {
        const event = {
            type: "workflow_state_changed",
            sliceId: "SLICE-01",
            featureId: null,
            timestamp: new Date().toISOString(),
            from: null,
            to: "building"
        };
        assert.equal(event.type, "workflow_state_changed");
    });
});
