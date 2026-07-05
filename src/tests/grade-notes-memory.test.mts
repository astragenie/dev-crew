// @ts-nocheck
// FEAT-217 follow-up: writeGrade mirrors "## Surprises" / "## Followups" grade
// bullets into astramem as notes via recordNote. A capturing fake `astramem`
// CLI is injected through CLAUDE_PLUGIN_ROOT_MEMORY so no real process runs.
// POSIX captures argv and asserts the note payloads; Windows installs a no-op
// .cmd and only asserts the fail-silent contract (writeGrade never throws).

import { afterEach, beforeEach, test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import { SCORE_DIMENSIONS } from "../scripts/lib/grade-parser.mjs";
import { _resetCliCache } from "../scripts/lib/memory-bridge.mjs";

const isWin = process.platform === "win32";
let tmpDir: string;
let cliRoot: string;
let argsFile: string;
let origPluginRoot: string | undefined;

async function installCapturingCli(): Promise<void> {
  const binDir = path.join(cliRoot, "bin");
  await fs.mkdir(binDir, { recursive: true });
  if (isWin) {
    await fs.writeFile(path.join(binDir, "astramem.cmd"), "@echo off\n");
    return;
  }
  const cli = path.join(binDir, "astramem");
  await fs.writeFile(
    cli,
    `#!/bin/sh\nnode -e "require('fs').appendFileSync(process.argv[1], JSON.stringify(process.argv.slice(2))+'\\n')" "${argsFile}" "$@"\n`
  );
  await fs.chmod(cli, 0o755);
}

async function readCaptured(): Promise<string[][]> {
  try {
    const raw = await fs.readFile(argsFile, "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as string[]);
  } catch {
    return [];
  }
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
  _resetCliCache();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "grade-notes-"));
  cliRoot = await fs.mkdtemp(path.join(tmpDir, "cliroot-"));
  argsFile = path.join(tmpDir, "captured.jsonl");
  origPluginRoot = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = cliRoot;
  await installCapturingCli();
});

afterEach(async () => {
  _resetCliCache();
  if (origPluginRoot !== undefined) process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = origPluginRoot;
  else delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("writeGrade mirrors Surprises + Followups into astramem as notes", async () => {
  const repo = await seedGradeRepo();
  // Must not throw regardless of platform (fail-silent contract).
  await writeGrade(repo, "SLICE-01", { config: null });

  if (isWin) return; // no argv capture on Windows

  const captured = await readCaptured();
  const notes = captured.filter((argv) => argv.includes("--type") && argv.includes("note"));
  const contents = notes.map((argv) => argv[argv.indexOf("--content") + 1] ?? "");
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
});

test("writeGrade with memory disabled emits no notes (opt-in default)", async () => {
  const repo = await seedGradeRepo();
  // Override memory back off in this repo's config.
  const cfgPath = path.join(repo, ".claude/loop.json");
  const cfg = JSON.parse(await fs.readFile(cfgPath, "utf8"));
  cfg.memory = { enabled: "off" };
  await fs.writeFile(cfgPath, JSON.stringify(cfg));

  await writeGrade(repo, "SLICE-01", { config: null });

  if (isWin) return;
  const captured = await readCaptured();
  const notes = captured.filter((argv) => argv.includes("--type") && argv.includes("note"));
  assert.equal(notes.length, 0);
});
