// FEAT-181: marathon session-scope checkpoint.
// Verifies the checkpoint gate counts grade files written AFTER the
// newest retrospective and escalates from advisory (>=every) to hard
// stop (>=2*every).

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  checkMarathonCheckpoint,
  DEFAULT_MARATHON_CHECKPOINT_EVERY,
  MARATHON_CHECKPOINT_HARD_MULTIPLIER
} from "../scripts/lib/marathon-checkpoint.mjs";

const GRADES_REL = ".claude/artifacts/loop/grades";
const RETROS_REL = ".claude/artifacts/loop/retrospectives";
const RETRO_NAME = "2026-06-10.md";

async function tmpRepoWithDirs(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, GRADES_REL), { recursive: true });
  await fs.mkdir(path.join(repo, RETROS_REL), { recursive: true });
  return repo;
}

async function writeGradeFile(repo: string, name: string, mtimeMs: number) {
  const p = path.join(repo, GRADES_REL, name);
  await fs.writeFile(p, "---\nid: grade\n---\n");
  await fs.utimes(p, new Date(mtimeMs), new Date(mtimeMs));
}

async function writeRetroFile(repo: string, name: string, mtimeMs: number) {
  const p = path.join(repo, RETROS_REL, name);
  await fs.writeFile(p, "# retrospective\n");
  await fs.utimes(p, new Date(mtimeMs), new Date(mtimeMs));
}

test("default every === 4, hard multiplier === 2", () => {
  assert.equal(DEFAULT_MARATHON_CHECKPOINT_EVERY, 4);
  assert.equal(MARATHON_CHECKPOINT_HARD_MULTIPLIER, 2);
});

test("returns null when fewer than every grades exist since the newest retro", async () => {
  const repo = await tmpRepoWithDirs("mc-quiet-");
  await writeRetroFile(repo, RETRO_NAME, 1_000_000);
  // 3 grades after the retro (< default every = 4)
  for (let i = 0; i < 3; i++) {
    await writeGradeFile(repo, `slice-0${i}-grade.md`, 2_000_000 + i);
  }
  const signal = await checkMarathonCheckpoint(repo, null);
  assert.equal(signal, null);
});

test("fires 'warn' at >= every grades since the newest retro", async () => {
  const repo = await tmpRepoWithDirs("mc-warn-");
  await writeRetroFile(repo, RETRO_NAME, 1_000_000);
  // 4 grades after the retro (== default every)
  for (let i = 0; i < 4; i++) {
    await writeGradeFile(repo, `slice-0${i}-grade.md`, 2_000_000 + i);
  }
  const signal = await checkMarathonCheckpoint(repo, null);
  assert.ok(signal, "warn signal must fire at threshold");
  assert.equal(signal!.level, "warn");
  assert.equal(signal!.closesSinceCheckpoint, 4);
  assert.equal(signal!.every, 4);
  assert.equal(signal!.hardThreshold, 8);
  assert.ok(signal!.lastRetroPath?.endsWith(RETRO_NAME));
});

test("escalates to 'hard' at >= 2 * every grades", async () => {
  const repo = await tmpRepoWithDirs("mc-hard-");
  await writeRetroFile(repo, RETRO_NAME, 1_000_000);
  // 8 grades after the retro (== 2 × default every)
  for (let i = 0; i < 8; i++) {
    await writeGradeFile(repo, `slice-0${i}-grade.md`, 2_000_000 + i);
  }
  const signal = await checkMarathonCheckpoint(repo, null);
  assert.ok(signal);
  assert.equal(signal!.level, "hard");
  assert.equal(signal!.closesSinceCheckpoint, 8);
  assert.equal(signal!.hardThreshold, 8);
});

test("respects config.loop.marathonCheckpointEvery override", async () => {
  const repo = await tmpRepoWithDirs("mc-override-");
  await writeRetroFile(repo, RETRO_NAME, 1_000_000);
  for (let i = 0; i < 2; i++) {
    await writeGradeFile(repo, `slice-0${i}-grade.md`, 2_000_000 + i);
  }
  const config = { loop: { marathonCheckpointEvery: 2 } };
  const signal = await checkMarathonCheckpoint(repo, config);
  assert.ok(signal, "lowered threshold must fire earlier");
  assert.equal(signal!.level, "warn");
  assert.equal(signal!.every, 2);
});

test("ignores grades older than the newest retro", async () => {
  const repo = await tmpRepoWithDirs("mc-old-grades-");
  // 5 old grades (before the retro)
  for (let i = 0; i < 5; i++) {
    await writeGradeFile(repo, `old-slice-0${i}-grade.md`, 500_000 + i);
  }
  await writeRetroFile(repo, RETRO_NAME, 1_000_000);
  // 1 new grade after the retro (< every = 4)
  await writeGradeFile(repo, "new-slice-grade.md", 2_000_000);

  const signal = await checkMarathonCheckpoint(repo, null);
  assert.equal(signal, null, "older grades must not count toward the post-retro window");
});

test("when no retrospective exists, counts ALL grades", async () => {
  const repo = await tmpRepoWithDirs("mc-no-retro-");
  // 4 grades, no retro file at all
  for (let i = 0; i < 4; i++) {
    await writeGradeFile(repo, `slice-0${i}-grade.md`, 2_000_000 + i);
  }
  const signal = await checkMarathonCheckpoint(repo, null);
  assert.ok(signal, "without a retro anchor, every grade should count");
  assert.equal(signal!.level, "warn");
  assert.equal(signal!.closesSinceCheckpoint, 4);
  assert.equal(signal!.lastRetroPath, null);
});

test("fail-open: returns null when grades dir is missing", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "mc-no-dir-"));
  // No grades or retrospectives dirs
  const signal = await checkMarathonCheckpoint(repo, null);
  assert.equal(signal, null);
});

test("non-integer or non-positive every → falls back to default", async () => {
  const repo = await tmpRepoWithDirs("mc-invalid-config-");
  await writeRetroFile(repo, RETRO_NAME, 1_000_000);
  for (let i = 0; i < 4; i++) {
    await writeGradeFile(repo, `slice-0${i}-grade.md`, 2_000_000 + i);
  }
  // negative + non-integer + string — all should fall back to default
  for (const bad of [-3, 1.5, "four" as unknown as number, 0]) {
    const signal = await checkMarathonCheckpoint(repo, { loop: { marathonCheckpointEvery: bad } });
    assert.ok(signal);
    assert.equal(signal!.every, DEFAULT_MARATHON_CHECKPOINT_EVERY);
  }
});

test("only files ending -grade.md count (filters stray markdown)", async () => {
  const repo = await tmpRepoWithDirs("mc-grade-filter-");
  await writeRetroFile(repo, RETRO_NAME, 1_000_000);
  // 4 valid grade files
  for (let i = 0; i < 4; i++) {
    await writeGradeFile(repo, `slice-0${i}-grade.md`, 2_000_000 + i);
  }
  // Stray .md that is NOT a grade file
  await writeGradeFile(repo, "README.md", 3_000_000);
  // The README ALSO matches because writeGradeFile doesn't enforce naming —
  // re-create it as a non-grade-suffix file via fs directly:
  await fs.writeFile(path.join(repo, GRADES_REL, "notes.md"), "# notes\n");

  const signal = await checkMarathonCheckpoint(repo, null);
  assert.ok(signal);
  // 4 grade files + writeGradeFile-helped README (ends in .md but not -grade.md)
  // notes.md also doesn't end in -grade.md so won't count.
  // The helper-written README ends in `README.md` (no -grade suffix) so does NOT count.
  assert.equal(
    signal!.closesSinceCheckpoint,
    4,
    "non -grade.md files must not inflate the counter"
  );
});
