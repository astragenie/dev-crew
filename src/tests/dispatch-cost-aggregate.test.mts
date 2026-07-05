// @ts-nocheck
// FEAT-220 SLICE-A — fixture tests for the dispatch-run cost aggregator.
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { aggregateDispatchCost } from "../scripts/lib/dispatch-cost-aggregate.mjs";

async function tmpRepo() {
  return fs.mkdtemp(path.join(os.tmpdir(), "loop-dca-"));
}

// Write a fake events.jsonl + payload files for N agent start/stop events.
// agents: [{ agentType, agentId, startTs, stopTs, transcriptPath }]
async function writeAgentEvents(repo, agents) {
  const logsDir = path.join(repo, ".claude", "logs");
  const payloadsDir = path.join(logsDir, "payloads");
  await fs.mkdir(payloadsDir, { recursive: true });

  const lines = [];
  for (const agent of agents) {
    const { agentType, agentId, startTs, stopTs, transcriptPath } = agent;

    const startPayloadPath = path.join(payloadsDir, `start-${agentId}.json`);
    await fs.writeFile(
      startPayloadPath,
      JSON.stringify({ agent_id: agentId, agent_type: agentType, hook_event_name: "SubagentStart" })
    );
    lines.push(
      JSON.stringify({
        schemaVersion: "1.0",
        source: "crew",
        timestamp: startTs,
        event: "subagent_start",
        repoPath: repo,
        payloadPath: startPayloadPath
      })
    );

    const stopPayloadPath = path.join(payloadsDir, `stop-${agentId}.json`);
    await fs.writeFile(
      stopPayloadPath,
      JSON.stringify({
        agent_id: agentId,
        agent_type: agentType,
        hook_event_name: "SubagentStop",
        agent_transcript_path: transcriptPath || null,
        background_tasks: [],
        stop_hook_active: false
      })
    );
    lines.push(
      JSON.stringify({
        schemaVersion: "1.0",
        source: "crew",
        timestamp: stopTs,
        event: "subagent_stop",
        repoPath: repo,
        payloadPath: stopPayloadPath
      })
    );
  }
  await fs.writeFile(path.join(logsDir, "events.jsonl"), `${lines.join("\n")}\n`);
}

// Write a fake transcript JSONL with N assistant turns, each contributing a
// fixed input/output token usage block, for a given model.
async function writeTranscript(filePath, { turns, model, inputPerTurn = 100, outputPerTurn = 50 }) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const lines = [];
  for (let i = 0; i < turns; i++) {
    lines.push(
      JSON.stringify({
        type: "assistant",
        message: {
          role: "assistant",
          model,
          content: [],
          usage: {
            input_tokens: inputPerTurn,
            output_tokens: outputPerTurn,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0
          }
        }
      })
    );
  }
  await fs.writeFile(filePath, `${lines.join("\n")}\n`);
}

test("distinct agentTypes → non-zero totals matching the synthetic fixture sum", async () => {
  const repo = await tmpRepo();
  const transcriptA = path.join(repo, "t", "a.jsonl");
  const transcriptB = path.join(repo, "t", "b.jsonl");
  // 2 turns * (100 in + 50 out) = 300 tokens for A; 3 turns * 150 = 450 for B.
  await writeTranscript(transcriptA, { turns: 2, model: "claude-sonnet-4-6" });
  await writeTranscript(transcriptB, { turns: 3, model: "claude-sonnet-4-6" });
  await writeAgentEvents(repo, [
    {
      agentType: "crew:fullstack-dev",
      agentId: "fe-agent",
      startTs: "2026-07-05T10:00:00.000Z",
      stopTs: "2026-07-05T10:05:00.000Z",
      transcriptPath: transcriptA
    },
    {
      agentType: "crew:backend-dev",
      agentId: "be-agent",
      startTs: "2026-07-05T10:00:10.000Z",
      stopTs: "2026-07-05T10:06:00.000Z",
      transcriptPath: transcriptB
    }
  ]);

  const plans = [
    { id: "FE", priority: 0, agentType: "crew:fullstack-dev", prompt: "" },
    { id: "BE", priority: 1, agentType: "crew:backend-dev", prompt: "" }
  ];

  const result = await aggregateDispatchCost(plans, {
    repoRoot: repo,
    startedAt: "2026-07-05T09:59:00.000Z",
    completedAt: "2026-07-05T10:10:00.000Z"
  });

  assert.equal(result.partialChildren.length, 0, "no ambiguity for distinct agentTypes");
  assert.equal(result.promptTokens, 2 * 100 + 3 * 100);
  assert.equal(result.completionTokens, 2 * 50 + 3 * 50);
  assert.equal(result.totalTokens, result.promptTokens + result.completionTokens);
  assert.ok(result.estimatedCostUsd > 0, "non-zero cost for a known model");
  assert.equal(result.model, "claude-sonnet-4-6");
});

test("2+ same-agentType children (concurrent) → partialChildren names both, no guessed sum", async () => {
  const repo = await tmpRepo();
  const transcriptA = path.join(repo, "t", "a.jsonl");
  const transcriptB = path.join(repo, "t", "b.jsonl");
  await writeTranscript(transcriptA, { turns: 2, model: "claude-sonnet-4-6" });
  await writeTranscript(transcriptB, { turns: 2, model: "claude-sonnet-4-6" });
  await writeAgentEvents(repo, [
    {
      agentType: "crew:fullstack-dev",
      agentId: "child-a",
      startTs: "2026-07-05T10:00:00.000Z",
      stopTs: "2026-07-05T10:05:00.000Z",
      transcriptPath: transcriptA
    },
    {
      agentType: "crew:fullstack-dev",
      agentId: "child-b",
      startTs: "2026-07-05T10:00:05.000Z",
      stopTs: "2026-07-05T10:05:05.000Z",
      transcriptPath: transcriptB
    }
  ]);

  const plans = [
    { id: "A", priority: 0, agentType: "crew:fullstack-dev", prompt: "" },
    { id: "B", priority: 1, agentType: "crew:fullstack-dev", prompt: "" }
  ];

  const result = await aggregateDispatchCost(plans, {
    repoRoot: repo,
    startedAt: "2026-07-05T09:59:00.000Z",
    completedAt: "2026-07-05T10:10:00.000Z"
  });

  assert.deepEqual(result.partialChildren.sort(), ["A", "B"]);
  assert.equal(result.totalTokens, 0, "ambiguous children contribute zero, not a guessed sum");
  assert.equal(result.estimatedCostUsd, 0);
});

test("missing events.jsonl → valid zeros + every child in partialChildren, never throws", async () => {
  const repo = await tmpRepo();
  // Deliberately do not create .claude/logs/events.jsonl.
  const plans = [
    { id: "FE", priority: 0, agentType: "crew:fullstack-dev", prompt: "" },
    { id: "BE", priority: 1, agentType: "crew:backend-dev", prompt: "" }
  ];

  const result = await aggregateDispatchCost(plans, {
    repoRoot: repo,
    startedAt: "2026-07-05T09:59:00.000Z",
    completedAt: "2026-07-05T10:10:00.000Z"
  });

  assert.equal(result.totalTokens, 0);
  assert.equal(result.promptTokens, 0);
  assert.equal(result.completionTokens, 0);
  assert.equal(result.estimatedCostUsd, 0);
  assert.equal(result.model, "unknown");
  assert.deepEqual(result.partialChildren.sort(), ["BE", "FE"]);
});

test("a child with no correlated transcript at all → partial, siblings still aggregate", async () => {
  const repo = await tmpRepo();
  const transcriptA = path.join(repo, "t", "a.jsonl");
  await writeTranscript(transcriptA, { turns: 1, model: "claude-sonnet-4-6" });
  await writeAgentEvents(repo, [
    {
      agentType: "crew:fullstack-dev",
      agentId: "fe-agent",
      startTs: "2026-07-05T10:00:00.000Z",
      stopTs: "2026-07-05T10:05:00.000Z",
      transcriptPath: transcriptA
    }
  ]);

  // BE never wrote a subagent event at all (e.g. it FAILED before hooks fired).
  const plans = [
    { id: "FE", priority: 0, agentType: "crew:fullstack-dev", prompt: "" },
    { id: "BE", priority: 1, agentType: "crew:backend-dev", prompt: "" }
  ];

  const result = await aggregateDispatchCost(plans, {
    repoRoot: repo,
    startedAt: "2026-07-05T09:59:00.000Z",
    completedAt: "2026-07-05T10:10:00.000Z"
  });

  assert.deepEqual(result.partialChildren, ["BE"]);
  assert.equal(result.promptTokens, 100);
  assert.equal(result.completionTokens, 50);
});

test("empty plan list → zero aggregate, no partialChildren, no throw", async () => {
  const repo = await tmpRepo();
  const result = await aggregateDispatchCost([], {
    repoRoot: repo,
    startedAt: "2026-07-05T09:59:00.000Z",
    completedAt: "2026-07-05T10:10:00.000Z"
  });
  assert.equal(result.totalTokens, 0);
  assert.deepEqual(result.partialChildren, []);
});
