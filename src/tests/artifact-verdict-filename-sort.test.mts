// SLICE-201 / FEAT-283 defect 2 — readNewestArtifactVerdict must sort by the
// ISO timestamp encoded in the artifact filename, not filesystem mtime.
// mtime is not durable: git clone/checkout/cherry-pick/worktree materialization
// all assign arbitrary mtimes, so a superseded rejection can outrank its own
// later approval on a fresh clone (reproduced 2026-08-04, see SLICE-201).
//
// Every test below sets fixture mtimes DELIBERATELY OPPOSITE to filename
// order — a test where both orderings agree cannot detect this defect,
// which is exactly how it shipped.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { readNewestArtifactVerdict } from "../scripts/lib/artifact-verdict.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  return dir;
}

async function writeArtifact(
  dir: string,
  filename: string,
  decision: string,
  mtime: Date
): Promise<string> {
  const file = path.join(dir, filename);
  await fs.writeFile(file, `---\ndecision: ${decision}\n---\n# artifact\n`);
  await fs.utimes(file, mtime, mtime);
  return file;
}

test("AC-1/AC-3: compact ISO filename timestamp wins over an OPPOSITE mtime order", async () => {
  const dir = await tmpRepo("av-iso-");
  const now = new Date();
  const longAgo = new Date("2020-01-01T00:00:00Z");
  // Filename order: "new" (2026-06-01) is newer than "old" (2026-01-01).
  // mtime order is set to the OPPOSITE: "old" has the newer mtime.
  const oldByName = await writeArtifact(
    dir,
    "20260101T000000Z-review-result-slice-x-old.md",
    "approved",
    now // newest mtime, oldest filename
  );
  const newByName = await writeArtifact(
    dir,
    "20260601T000000Z-review-result-slice-x-new.md",
    "rejected",
    longAgo // oldest mtime, newest filename
  );
  const verdict = await readNewestArtifactVerdict([oldByName, newByName]);
  assert.ok(verdict, "expected a verdict");
  assert.equal(
    verdict!.decision,
    "rejected",
    "filename-newest artifact (rejected) must win despite its mtime being oldest"
  );
  assert.equal(path.basename(verdict!.file), "20260601T000000Z-review-result-slice-x-new.md");
});

test("AC-2: fresh-checkout simulation — identical mtimes across all files still resolves by filename order", async () => {
  const dir = await tmpRepo("av-checkout-");
  const checkoutTime = new Date(); // simulates every file getting the same checkout mtime
  const first = await writeArtifact(
    dir,
    "20260301T000000Z-review-result-slice-y-first.md",
    "rejected",
    checkoutTime
  );
  const second = await writeArtifact(
    dir,
    "20260701T000000Z-review-result-slice-y-second.md",
    "approved",
    checkoutTime
  );
  const verdict = await readNewestArtifactVerdict([first, second]);
  assert.ok(verdict);
  assert.equal(
    verdict!.decision,
    "approved",
    "with mtimes tied (fresh clone), filename order must still determine the newest"
  );
});

test("AC-1: hyphenated date-only filenames (real corpus shape) sort by filename, opposite mtime order", async () => {
  const dir = await tmpRepo("av-hyphen-");
  const oldByName = await writeArtifact(
    dir,
    "2026-01-05-review-slice-z-old.md",
    "approved",
    new Date() // newest mtime, oldest filename
  );
  const newByName = await writeArtifact(
    dir,
    "2026-08-04-review-slice-z-new.md",
    "rejected",
    new Date("2019-01-01T00:00:00Z") // oldest mtime, newest filename
  );
  const verdict = await readNewestArtifactVerdict([oldByName, newByName]);
  assert.ok(verdict);
  assert.equal(verdict!.decision, "rejected");
});

test("AC-1: compact date-only filenames (real corpus shape, e.g. 20260613-...) sort by filename, opposite mtime order", async () => {
  const dir = await tmpRepo("av-compact-date-");
  const oldByName = await writeArtifact(
    dir,
    "20260101-reviewer-a-slice-w-old.md",
    "approved",
    new Date() // newest mtime, oldest filename
  );
  const newByName = await writeArtifact(
    dir,
    "20260707-reviewer-a-slice-w-new.md",
    "rejected",
    new Date("2019-01-01T00:00:00Z") // oldest mtime, newest filename
  );
  const verdict = await readNewestArtifactVerdict([oldByName, newByName]);
  assert.ok(verdict);
  assert.equal(verdict!.decision, "rejected");
});

test("AC-4: mixed corpus — timestamped filename beats an untimestamped file's stale fallback mtime", async () => {
  const dir = await tmpRepo("av-mixed-a-");
  const untimestamped = await writeArtifact(
    dir,
    "slice-w-parent-review.md", // no parseable timestamp -> falls back to mtime
    "approved",
    new Date("2020-01-01T00:00:00Z") // stale fallback mtime
  );
  const timestamped = await writeArtifact(
    dir,
    "20260801T000000Z-review-result-slice-w.md",
    "rejected",
    new Date("2020-06-01T00:00:00Z") // mtime irrelevant — filename timestamp wins
  );
  const verdict = await readNewestArtifactVerdict([untimestamped, timestamped]);
  assert.ok(verdict);
  assert.equal(
    verdict!.decision,
    "rejected",
    "the timestamped filename's parsed epoch (2026-08) exceeds the untimestamped file's fallback mtime (2020)"
  );
});

test("AC-4: mixed corpus — an untimestamped file's fresh mtime fallback can still outrank an old timestamped filename", async () => {
  const dir = await tmpRepo("av-mixed-b-");
  const oldTimestamped = await writeArtifact(
    dir,
    "20200101T000000Z-review-result-slice-v.md",
    "rejected",
    new Date("2020-01-01T00:00:00Z")
  );
  const freshUntimestamped = await writeArtifact(
    dir,
    "slice-v-followup-review.md", // no parseable timestamp -> falls back to mtime
    "approved",
    new Date() // fresh fallback mtime, well after the timestamped file's parsed epoch
  );
  const verdict = await readNewestArtifactVerdict([oldTimestamped, freshUntimestamped]);
  assert.ok(verdict);
  assert.equal(
    verdict!.decision,
    "approved",
    "an untimestamped file's fallback mtime is a real ordering signal and can legitimately win " +
      "when it postdates a timestamped file's parsed epoch — mixed-corpus rule is a single " +
      "numeric sort key (filename timestamp when parseable, else mtime), not 'timestamped always wins'"
  );
});

test("AC-4: fully untimestamped corpus still resolves via mtime fallback", async () => {
  const dir = await tmpRepo("av-untimestamped-");
  const older = await writeArtifact(
    dir,
    "SLICE-90-reviewer-B.md",
    "rejected",
    new Date("2021-01-01T00:00:00Z")
  );
  const newer = await writeArtifact(
    dir,
    "slice-87-parent-review-validation.md",
    "approved",
    new Date("2022-01-01T00:00:00Z")
  );
  const verdict = await readNewestArtifactVerdict([older, newer]);
  assert.ok(verdict);
  assert.equal(verdict!.decision, "approved");
});
