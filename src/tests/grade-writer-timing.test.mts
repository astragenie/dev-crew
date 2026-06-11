import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { createGradeFile } from "../scripts/lib/grade-writer.mjs";

test("grade prefill includes timing + shape frontmatter blocks", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "grade-timing-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "typescript-plugin-dev",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        gradesRoot: ".claude/artifacts/loop/grades"
      },
      stack: {}
    })
  );
  await fs.mkdir(path.join(repo, ".claude/artifacts/loop/grades"), { recursive: true });
  await fs.mkdir(path.join(repo, ".claude/artifacts/loop/ai-loop/slices/in-progress"), {
    recursive: true
  });
  await fs.writeFile(
    path.join(repo, ".claude/artifacts/loop/ai-loop/slices/in-progress/SLICE_91_test.md"),
    "---\nid: SLICE-91\nfeature: FEAT-001\n---\n# SLICE-91\n"
  );
  const { gradePath } = await createGradeFile(repo, "SLICE-91");
  const content = await fs.readFile(gradePath, "utf8");
  assert.match(content, /timing:/);
  assert.match(content, /wall_clock_seconds:/);
  assert.match(content, /phase_gate_parallel:/);
  assert.match(content, /post_builder_fanout:/);
  assert.match(content, /reviewer_span_ms:/);
  assert.match(content, /serial_reviewer_warning:/);
  assert.match(content, /shape:/);
  assert.match(content, /classified:/);
  assert.match(content, /inline_path_used:/);
  await fs.rm(repo, { recursive: true, force: true });
  assert.ok(gradePath);
});
