// Test for grade-writer.mts's emitSliceCloseMemory project/agent threading
// (FEAT-263 follow-up, review finding LOW/MEDIUM: this wiring previously had
// no direct assertion — a swapped precedence bug here would not fail any
// existing test). Captures the GEPA wire payload via
// @astragenie/astramem-client's _setWireProvider seam (same pattern as
// memory-gepa.test.mts / memory-sink.test.mts) and asserts the writeGrade
// call's emitted slice_close event carries the expected project/agent.

import { afterEach, beforeEach, test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _resetResolveCache, _setWireProvider } from "@astragenie/astramem-client";
import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import { SCORE_DIMENSIONS } from "../scripts/lib/grade-parser.mjs";

interface CapturedCall {
  type: string;
  text: string;
  project?: string;
  agent?: string;
  metadata?: Record<string, unknown>;
}

function installCapturingProvider(): CapturedCall[] {
  const calls: CapturedCall[] = [];
  _setWireProvider({
    remember: async (req) => {
      calls.push(req as CapturedCall);
    },
    recall: async () => ({ hits: [] }),
    health: async () => ({ ok: true })
  });
  return calls;
}

beforeEach(() => {
  _setWireProvider(null);
  _resetResolveCache();
});

afterEach(() => {
  _setWireProvider(null);
  _resetResolveCache();
});

async function tmpRepo(prefix: string, loopJsonExtra: Record<string, unknown> = {}) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "typescript-plugin-dev",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        gradesRoot: ".claude/artifacts/loop/grades",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {},
      ...loopJsonExtra
    })
  );
  return repo;
}

async function scaffoldSlice(repo: string, sliceId: string) {
  await fs.mkdir(path.join(repo, ".claude/artifacts/loop/ai-loop/slices/in-progress"), {
    recursive: true
  });
  const slug = sliceId.replace(/[^A-Za-z0-9]/g, "_");
  await fs.writeFile(
    path.join(repo, `.claude/artifacts/loop/ai-loop/slices/in-progress/${slug}.md`),
    `---\nid: ${sliceId}\nfeature: FEAT-184\n---\n# ${sliceId}\n`
  );
}

/** Fill grade template with real scores + clean up placeholders so writeGrade won't reject. */
async function fillGrade(gradePath: string) {
  let content = await fs.readFile(gradePath, "utf8");
  for (const dim of SCORE_DIMENSIONS as string[]) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
  }
  content = content.replace(/- bullet 1\n- bullet 2/, "- Real lesson 1\n- Real lesson 2");
  content = content.replace("<fill title>", "Real Title");
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
  await fs.writeFile(gradePath, content);
}

test("emitSliceCloseMemory tags the slice_close GEPA event with project (via productName) and agent=devcrew:builder", async () => {
  const repo = await tmpRepo("grade-writer-memattr-project-", { productName: "runner-plugin" });
  try {
    const sliceId = "SLICE-92";
    await scaffoldSlice(repo, sliceId);
    const calls = installCapturingProvider();

    const { gradePath } = await createGradeFile(repo, sliceId);
    await fillGrade(gradePath);
    await writeGrade(repo, sliceId);

    const sliceClose = calls.find((c) => c.type === "lesson");
    assert.ok(sliceClose, "expected a slice_close (-> lesson kind) GEPA event to be emitted");
    assert.equal(sliceClose!.project, "runner-plugin");
    assert.equal(sliceClose!.agent, "devcrew:builder");
    assert.equal(sliceClose!.metadata?.project, "runner-plugin");
    assert.equal(sliceClose!.metadata?.agent, "devcrew:builder");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("emitSliceCloseMemory prefers explicit memory.project over productName", async () => {
  const repo = await tmpRepo("grade-writer-memattr-override-", {
    productName: "fallback-name",
    memory: { project: "explicit-project" }
  });
  try {
    const sliceId = "SLICE-93";
    await scaffoldSlice(repo, sliceId);
    const calls = installCapturingProvider();

    const { gradePath } = await createGradeFile(repo, sliceId);
    await fillGrade(gradePath);
    await writeGrade(repo, sliceId);

    const sliceClose = calls.find((c) => c.type === "lesson");
    assert.ok(sliceClose);
    assert.equal(sliceClose!.project, "explicit-project");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("emitSliceCloseMemory omits project when neither memory.project nor productName is set", async () => {
  const repo = await tmpRepo("grade-writer-memattr-noproject-");
  try {
    const sliceId = "SLICE-94";
    await scaffoldSlice(repo, sliceId);
    const calls = installCapturingProvider();

    const { gradePath } = await createGradeFile(repo, sliceId);
    await fillGrade(gradePath);
    await writeGrade(repo, sliceId);

    const sliceClose = calls.find((c) => c.type === "lesson");
    assert.ok(sliceClose);
    assert.equal(sliceClose!.project, undefined);
    // agent attribution is unconditional (GRADE_AGENT_TYPE), independent of project.
    assert.equal(sliceClose!.agent, "devcrew:builder");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("emitSliceCloseMemory does not emit at all when memory.enabled is never", async () => {
  const repo = await tmpRepo("grade-writer-memattr-disabled-", { memory: { enabled: "never" } });
  try {
    const sliceId = "SLICE-95";
    await scaffoldSlice(repo, sliceId);
    const calls = installCapturingProvider();

    const { gradePath } = await createGradeFile(repo, sliceId);
    await fillGrade(gradePath);
    await writeGrade(repo, sliceId);

    assert.equal(calls.length, 0, "memory.enabled: never must suppress the GEPA emission entirely");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
