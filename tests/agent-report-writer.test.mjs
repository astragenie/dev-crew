// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { writeAgentReport } from "../scripts/lib/slice-linker/agent-report-writer.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { linkArtifactToSlice } from "../scripts/lib/artifact-linkage.mjs";
async function tmpRepo(prefix) {
    const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(path.join(repo, ".claude/loop.json"), JSON.stringify({
        loop: {
            aiLoopRoot: ".claude/artifacts/loop/ai-loop",
            backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
            slicesRoot: ".claude/artifacts/loop/ai-loop/slices"
        }
    }));
    return repo;
}
// Write a fake events.jsonl with subagent events and their payload files.
// agents: [{ agentType, agentId, sessionId, startTs, stopTs, transcriptPath?, backgroundTasks? }]
async function writeAgentEvents(repo, agents) {
    const logsDir = path.join(repo, ".claude", "logs");
    const payloadsDir = path.join(logsDir, "payloads");
    await fs.mkdir(payloadsDir, { recursive: true });
    const lines = [];
    for (const agent of agents) {
        const { agentType, agentId, sessionId, startTs, stopTs, transcriptPath, backgroundTasks } = agent;
        if (startTs) {
            const startPayloadPath = path.join(payloadsDir, `start-${agentId}.json`);
            await fs.writeFile(startPayloadPath, JSON.stringify({
                session_id: sessionId,
                agent_id: agentId,
                agent_type: agentType,
                hook_event_name: "SubagentStart"
            }));
            lines.push(JSON.stringify({
                schemaVersion: "1.0",
                source: "crew",
                timestamp: startTs,
                event: "subagent_start",
                repoPath: repo,
                payloadPath: startPayloadPath
            }));
        }
        const stopPayloadPath = path.join(payloadsDir, `stop-${agentId}.json`);
        await fs.writeFile(stopPayloadPath, JSON.stringify({
            session_id: sessionId,
            agent_id: agentId,
            agent_type: agentType,
            hook_event_name: "SubagentStop",
            agent_transcript_path: transcriptPath || null,
            background_tasks: backgroundTasks || [],
            stop_hook_active: false
        }));
        lines.push(JSON.stringify({
            schemaVersion: "1.0",
            source: "crew",
            timestamp: stopTs,
            event: "subagent_stop",
            repoPath: repo,
            payloadPath: stopPayloadPath
        }));
    }
    await fs.writeFile(path.join(logsDir, "events.jsonl"), lines.join("\n") + "\n");
}
// Write a fake agent transcript JSONL with given turns/tools/skills.
async function writeTranscript(filePath, { turns = 0, model = null, tools = {}, skills = [] } = {}) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const lines = [];
    for (let i = 0; i < turns; i++) {
        const content = [];
        // Add tool_use blocks from the tools map (each tool in first turn only)
        if (i === 0) {
            for (const [toolName, count] of Object.entries(tools)) {
                for (let j = 0; j < count; j++) {
                    content.push({ type: "tool_use", name: toolName, id: `t${j}`, input: {} });
                }
            }
            for (const skill of skills) {
                content.push({ type: "tool_use", name: "Skill", id: `sk-${skill}`, input: { skill } });
            }
        }
        lines.push(JSON.stringify({
            type: "assistant",
            message: { role: "assistant", content, model: model || undefined }
        }));
    }
    await fs.writeFile(filePath, lines.join("\n") + "\n");
}
test("happy path — 2 agents, full data → artifact written with agent_count: 2", async () => {
    const repo = await tmpRepo("al-arw-happy-");
    const transcriptA = path.join(repo, "transcripts", "agent-a.jsonl");
    const transcriptB = path.join(repo, "transcripts", "agent-b.jsonl");
    await writeTranscript(transcriptA, {
        turns: 5,
        model: "claude-sonnet-4-6",
        tools: { Read: 3, Bash: 2 }
    });
    await writeTranscript(transcriptB, {
        turns: 8,
        model: "claude-opus-4-7",
        tools: { Edit: 4 },
        skills: ["crew:build"]
    });
    await writeAgentEvents(repo, [
        {
            agentType: "Explore",
            agentId: "aaaa0001",
            sessionId: "sess-001",
            startTs: "2026-05-24T10:00:00.000Z",
            stopTs: "2026-05-24T10:04:12.000Z",
            transcriptPath: transcriptA
        },
        {
            agentType: "crew:builder",
            agentId: "bbbb0002",
            sessionId: "sess-001",
            startTs: "2026-05-24T10:04:15.000Z",
            stopTs: "2026-05-24T10:12:47.000Z",
            transcriptPath: transcriptB
        }
    ]);
    const result = await writeAgentReport(repo, {
        sliceId: "SLICE-10",
        featureId: "FEAT-042",
        phase: "R2"
    });
    assert.ok(result.reportPath);
    assert.match(path.basename(result.reportPath), /^\d{8}T\d{6}Z-agent-report-.+\.md$/);
    assert.equal(result.agentCount, 2);
    assert.equal(result.totalTurns, 13);
    const content = await fs.readFile(result.reportPath, "utf8");
    const { frontmatter, body } = parseFrontmatter(content);
    assert.equal(frontmatter.kind, "agent-report");
    assert.equal(frontmatter.agent_count, 2);
    assert.equal(frontmatter.total_turns, 13);
    assert.ok(body.includes("Explore"));
    assert.ok(body.includes("crew:builder"));
    assert.ok(body.includes("claude-sonnet-4-6"));
    assert.ok(body.includes("claude-opus-4-7"));
    assert.ok(body.includes("crew:build"));
    // Body starts with phase/feature/slice identification
    assert.ok(body.includes("**Phase:** R2"), "body has phase identification");
    assert.ok(body.includes("**Feature:** FEAT-042"), "body has feature identification");
    assert.ok(body.includes("**Slice:** SLICE-10"), "body has slice identification");
    // No diagnostic note when events exist
    assert.ok(!body.includes("No subagent events found"), "no diagnostic when events present");
    // Frontmatter ordering: phase before feature before slice
    const fmKeys = Object.keys(frontmatter);
    const phaseIdx = fmKeys.indexOf("phase");
    const featIdx = fmKeys.indexOf("feature");
    const sliceIdx = fmKeys.indexOf("slice");
    assert.ok(phaseIdx < featIdx, "frontmatter: phase before feature");
    assert.ok(featIdx < sliceIdx, "frontmatter: feature before slice");
});
test("zero agents in window → artifact written with agent_count: 0", async () => {
    const repo = await tmpRepo("al-arw-zero-");
    // Write events.jsonl with events BEFORE startedAt — they should be filtered out
    await writeAgentEvents(repo, [
        {
            agentType: "Explore",
            agentId: "cccc0001",
            sessionId: "sess-old",
            startTs: "2026-05-01T08:00:00.000Z",
            stopTs: "2026-05-01T08:05:00.000Z",
            transcriptPath: null
        }
    ]);
    const result = await writeAgentReport(repo, {
        sliceId: "SLICE-11",
        startedAt: "2026-05-24T00:00:00.000Z"
    });
    assert.equal(result.agentCount, 0);
    assert.equal(result.totalTurns, 0);
    const content = await fs.readFile(result.reportPath, "utf8");
    const { frontmatter, body } = parseFrontmatter(content);
    assert.equal(frontmatter.agent_count, 0);
    assert.ok(body.includes("No agents were dispatched"));
});
test("transcript not found → artifact written, model shows n/a, turns 0", async () => {
    const repo = await tmpRepo("al-arw-notranscript-");
    await writeAgentEvents(repo, [
        {
            agentType: "crew:researcher",
            agentId: "dddd0001",
            sessionId: "sess-002",
            startTs: "2026-05-24T09:00:00.000Z",
            stopTs: "2026-05-24T09:05:00.000Z",
            transcriptPath: path.join(repo, "nonexistent", "transcript.jsonl")
        }
    ]);
    const result = await writeAgentReport(repo, { sliceId: "SLICE-12" });
    assert.equal(result.agentCount, 1);
    assert.equal(result.totalTurns, 0);
    const content = await fs.readFile(result.reportPath, "utf8");
    assert.ok(content.includes("n/a"));
});
test("events.jsonl missing → artifact written with zero agents, diagnostic note, no throw", async () => {
    const repo = await tmpRepo("al-arw-noevents-");
    // Don't create events.jsonl at all
    const result = await writeAgentReport(repo, { sliceId: "SLICE-13" });
    assert.equal(result.agentCount, 0);
    assert.ok(result.reportPath);
    const content = await fs.readFile(result.reportPath, "utf8");
    const { frontmatter, body } = parseFrontmatter(content);
    assert.equal(frontmatter.agent_count, 0);
    assert.ok(body.includes("No subagent events found"), "diagnostic note when events.jsonl missing");
});
test("events exist but predate startedAt → no diagnostic note (not a hook problem)", async () => {
    const repo = await tmpRepo("al-arw-window-");
    await writeAgentEvents(repo, [
        {
            agentType: "Explore",
            agentId: "win001",
            sessionId: "sess-win",
            startTs: "2026-05-01T08:00:00.000Z",
            stopTs: "2026-05-01T08:05:00.000Z",
            transcriptPath: null
        }
    ]);
    const result = await writeAgentReport(repo, {
        sliceId: "SLICE-14B",
        startedAt: "2026-05-24T00:00:00.000Z"
    });
    assert.equal(result.agentCount, 0);
    const content = await fs.readFile(result.reportPath, "utf8");
    const { body } = parseFrontmatter(content);
    assert.ok(!body.includes("No subagent events found"), "no diagnostic when file exists but window filters events");
});
test("startedAt null → no time-window filter, all events included", async () => {
    const repo = await tmpRepo("al-arw-nonull-");
    const transcript = path.join(repo, "t.jsonl");
    await writeTranscript(transcript, { turns: 2 });
    await writeAgentEvents(repo, [
        {
            agentType: "Explore",
            agentId: "eeee0001",
            sessionId: "sess-003",
            startTs: "2020-01-01T00:00:00.000Z",
            stopTs: "2020-01-01T00:01:00.000Z",
            transcriptPath: transcript
        }
    ]);
    const result = await writeAgentReport(repo, { sliceId: "SLICE-14", startedAt: null });
    assert.equal(result.agentCount, 1);
});
test("parallel group detected → body names both agents in group", async () => {
    const repo = await tmpRepo("al-arw-parallel-");
    const ta = path.join(repo, "ta.jsonl");
    const tb = path.join(repo, "tb.jsonl");
    await writeTranscript(ta, { turns: 1 });
    await writeTranscript(tb, { turns: 1 });
    // Overlapping time windows
    await writeAgentEvents(repo, [
        {
            agentType: "Explore",
            agentId: "f001",
            sessionId: "sess-par",
            startTs: "2026-05-24T10:00:00.000Z",
            stopTs: "2026-05-24T10:05:00.000Z",
            transcriptPath: ta
        },
        {
            agentType: "crew:researcher",
            agentId: "f002",
            sessionId: "sess-par",
            startTs: "2026-05-24T10:02:00.000Z",
            stopTs: "2026-05-24T10:07:00.000Z",
            transcriptPath: tb
        }
    ]);
    const result = await writeAgentReport(repo, { sliceId: "SLICE-15" });
    const content = await fs.readFile(result.reportPath, "utf8");
    assert.ok(content.includes("Group 1"));
    assert.ok(content.includes("concurrent"));
    assert.ok(content.includes("Explore"));
    assert.ok(content.includes("crew:researcher"));
});
test("sequential agents → no parallel groups", async () => {
    const repo = await tmpRepo("al-arw-seq-");
    const ta = path.join(repo, "ta.jsonl");
    const tb = path.join(repo, "tb.jsonl");
    await writeTranscript(ta, { turns: 1 });
    await writeTranscript(tb, { turns: 1 });
    // Non-overlapping: A stops before B starts
    await writeAgentEvents(repo, [
        {
            agentType: "Explore",
            agentId: "g001",
            sessionId: "sess-seq",
            startTs: "2026-05-24T10:00:00.000Z",
            stopTs: "2026-05-24T10:02:00.000Z",
            transcriptPath: ta
        },
        {
            agentType: "crew:builder",
            agentId: "g002",
            sessionId: "sess-seq",
            startTs: "2026-05-24T10:03:00.000Z",
            stopTs: "2026-05-24T10:06:00.000Z",
            transcriptPath: tb
        }
    ]);
    const result = await writeAgentReport(repo, { sliceId: "SLICE-16" });
    const content = await fs.readFile(result.reportPath, "utf8");
    assert.ok(content.includes("No parallel groups detected"));
});
test("skill extraction from transcript → Skills column shows skill name", async () => {
    const repo = await tmpRepo("al-arw-skills-");
    const transcript = path.join(repo, "sk.jsonl");
    await writeTranscript(transcript, {
        turns: 3,
        tools: { Read: 1 },
        skills: ["loop:slice-start", "superpowers:writing-plans"]
    });
    await writeAgentEvents(repo, [
        {
            agentType: "crew:builder",
            agentId: "h001",
            sessionId: "sess-sk",
            startTs: "2026-05-24T11:00:00.000Z",
            stopTs: "2026-05-24T11:08:00.000Z",
            transcriptPath: transcript
        }
    ]);
    const result = await writeAgentReport(repo, { sliceId: "SLICE-17" });
    const content = await fs.readFile(result.reportPath, "utf8");
    assert.ok(content.includes("loop:slice-start"));
    assert.ok(content.includes("superpowers:writing-plans"));
});
test("idempotent — second call overwrites cleanly", async () => {
    const repo = await tmpRepo("al-arw-idem-");
    const result1 = await writeAgentReport(repo, { sliceId: "SLICE-18" });
    const result2 = await writeAgentReport(repo, { sliceId: "SLICE-18" });
    assert.equal(result1.reportPath, result2.reportPath);
    const stat = await fs.stat(result2.reportPath);
    assert.ok(stat.isFile());
});
test("linkArtifactToSlice accepts 'agents' kind without throwing", async () => {
    const repo = await tmpRepo("al-arw-link-");
    const slicesDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices");
    await fs.mkdir(slicesDir, { recursive: true });
    await fs.writeFile(path.join(slicesDir, "SLICE_19_test.md"), "---\nkind: slice\nstatus: pending\n---\n");
    const agentsDir = path.join(repo, ".claude", "artifacts", "crew", "agents");
    await fs.mkdir(agentsDir, { recursive: true });
    const artifactPath = path.join(agentsDir, "20260528T000000Z-agent-report-slice19.md");
    await fs.writeFile(artifactPath, "---\nkind: agent-report\n---\n");
    const result = await linkArtifactToSlice(repo, {
        sliceId: "SLICE-19",
        artifactPath,
        kind: "agents"
    });
    assert.equal(result.kind, "agents");
    assert.equal(result.alreadyLinked, false);
    const sliceContent = await fs.readFile(path.join(slicesDir, "SLICE_19_test.md"), "utf8");
    const { frontmatter } = parseFrontmatter(sliceContent);
    assert.ok(Array.isArray(frontmatter.agents));
    assert.equal(frontmatter.agents.length, 1);
});
test("slug format — TS-agent-report-feat021-slice36.md for FEAT-021 / SLICE-36", async () => {
    const repo = await tmpRepo("al-arw-slug-");
    const result = await writeAgentReport(repo, {
        sliceId: "SLICE-36",
        featureId: "FEAT-021",
        phase: null
    });
    const basename = path.basename(result.reportPath);
    assert.match(basename, /^\d{8}T\d{6}Z-agent-report-feat021-slice36\.md$/);
});
test("duration formatting — 127000ms renders as 2m 7s in table", async () => {
    const repo = await tmpRepo("al-arw-dur-");
    const transcript = path.join(repo, "dur.jsonl");
    await writeTranscript(transcript, { turns: 1 });
    // startTs → stopTs = exactly 127 000 ms apart
    await writeAgentEvents(repo, [
        {
            agentType: "Explore",
            agentId: "i001",
            sessionId: "sess-dur",
            startTs: "2026-05-24T12:00:00.000Z",
            stopTs: "2026-05-24T12:02:07.000Z",
            transcriptPath: transcript
        }
    ]);
    const result = await writeAgentReport(repo, { sliceId: "SLICE-20" });
    const content = await fs.readFile(result.reportPath, "utf8");
    assert.ok(content.includes("2m 7s"), `Expected "2m 7s" in:\n${content}`);
});
