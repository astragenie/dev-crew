// @ts-nocheck
// FEAT-217 follow-up: writeGrade mirrors "## Surprises" / "## Followups" grade
// bullets into astramem as notes via recordNote. A fake WireProvider is
// injected via @astragenie/astramem-client's _setWireProvider test seam
// (FEAT-235 — the CLI-spawn fallback this test used to exercise was retired)
// so no real astramem process is ever run.

import { afterEach, beforeEach, test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _resetResolveCache, _setWireProvider } from "@astragenie/astramem-client";
import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import { SCORE_DIMENSIONS } from "../scripts/lib/grade-parser.mjs";

let tmpDir: string;

/** A single captured provider.remember() call. */
interface CapturedCall {
  type: string;
  text: string;
  metadata?: Record<string, unknown>;
}

/** Inject a capturing fake provider; returns the array calls are pushed to. */
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

async function seedGradeRepo(): Promise<string> {
  const repo = await fs.mkdtemp(path.join(tmpDir, "repo-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  const config = {
    preset: "dotnet-python",
    productName: "runner",
    memory: { enabled: "on" },
    loop: {
      aiLoopRoot: ".claude/artifacts/loop/ai-loop",
      backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
      slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
      phaseGateArtifactDir: ".claude/artifacts/crew/validations"
    },
    stack: {}
  };
  await fs.writeFile(path.join(repo, ".claude/loop.json"), JSON.stringify(config));
  const created = await createGradeFile(repo, "SLICE-01");
  let content = await fs.readFile(created.gradePath, "utf8");
  for (const dim of SCORE_DIMENSIONS) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
  }
  content = content.replace(/- bullet 1\n- bullet 2/, "- A real lesson");
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Prod config drifted");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Add a regression test");
  await fs.writeFile(created.gradePath, content);
  return repo;
}

beforeEach(async () => {
  _setWireProvider(null);
  _resetResolveCache();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "grade-notes-"));
});

afterEach(async () => {
  _setWireProvider(null);
  _resetResolveCache();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("writeGrade mirrors Surprises + Followups into astramem as notes", async () => {
  const repo = await seedGradeRepo();
  const calls = installCapturingProvider();
  // Must not throw regardless of platform (fail-silent contract).
  await writeGrade(repo, "SLICE-01", { config: null });

  const notes = calls.filter((c) => c.type === "note");
  const contents = notes.map((c) => c.text);
  assert.ok(
    contents.some((c) => c.includes("surprise:") && c.includes("Prod config drifted")),
    `expected a surprise note, got: ${JSON.stringify(contents)}`
  );
  assert.ok(
    contents.some((c) => c.includes("followup:") && c.includes("Add a regression test")),
    `expected a followup note, got: ${JSON.stringify(contents)}`
  );
  assert.ok(
    contents.every((c) => c.startsWith("[SLICE-01] ")),
    "notes should carry the slice trace tag"
  );
  // SLICE-1b: grade-derived notes are agent-tagged as the slice implementer.
  assert.ok(
    notes.every((c) => c.metadata?.["agent"] === "devcrew:builder"),
    `notes should carry agent metadata devcrew:builder, got: ${JSON.stringify(notes)}`
  );
});

test("writeGrade with memory disabled emits no notes (opt-in default)", async () => {
  const repo = await seedGradeRepo();
  const calls = installCapturingProvider();
  // Override memory back off in this repo's config.
  const cfgPath = path.join(repo, ".claude/loop.json");
  const cfg = JSON.parse(await fs.readFile(cfgPath, "utf8"));
  cfg.memory = { enabled: "off" };
  await fs.writeFile(cfgPath, JSON.stringify(cfg));

  await writeGrade(repo, "SLICE-01", { config: null });

  const notes = calls.filter((c) => c.type === "note");
  assert.equal(notes.length, 0);
});
