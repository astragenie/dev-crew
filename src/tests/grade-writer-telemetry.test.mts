import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
// @ts-ignore — grade-parser import for SCORE_DIMENSIONS
import { SCORE_DIMENSIONS } from "../scripts/lib/grade-parser.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string) {
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
      stack: {}
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
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
  await fs.writeFile(gradePath, content);
}

// ---------------------------------------------------------------------------
// AC-2a — wall_clock_seconds
// ---------------------------------------------------------------------------

test("AC-2a: wall_clock_seconds is populated from loop.jsonl slice-start event", async () => {
  const repo = await tmpRepo("grade-telemetry-wall-");
  try {
    const sliceId = "SLICE-92";
    await scaffoldSlice(repo, sliceId);

    // Write a slice-start event timestamped 30 seconds ago.
    const startTs = new Date(Date.now() - 30_000).toISOString();
    await fs.mkdir(path.join(repo, ".claude/logs"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude/logs/loop.jsonl"),
      JSON.stringify({ timestamp: startTs, command: "slice start", slice: sliceId }) + "\n"
    );

    const { gradePath } = await createGradeFile(repo, sliceId);
    await fillGrade(gradePath);
    await writeGrade(repo, sliceId);

    const raw = await fs.readFile(gradePath, "utf8");
    const { frontmatter } = parseFrontmatter(raw);
    const timing = frontmatter.timing as Record<string, unknown>;

    assert.ok(typeof timing.wall_clock_seconds === "number", "wall_clock_seconds must be a number");
    assert.ok(
      (timing.wall_clock_seconds as number) > 25,
      `wall_clock_seconds (${timing.wall_clock_seconds}) should be > 25`
    );
    assert.ok(
      (timing.wall_clock_seconds as number) < 60,
      `wall_clock_seconds (${timing.wall_clock_seconds}) should be < 60`
    );
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-2b — phase_gate_parallel (true + null cases)
// ---------------------------------------------------------------------------

test("AC-2b: phase_gate_parallel is true when gate file has parallel header", async () => {
  const repo = await tmpRepo("grade-telemetry-pgp-true-");
  try {
    const sliceId = "SLICE-92";
    await scaffoldSlice(repo, sliceId);

    // Write a phase-gate file with the parallel header.
    const validationsDir = path.join(repo, ".claude/artifacts/crew/validations");
    await fs.mkdir(validationsDir, { recursive: true });
    // Slug: "slice92" (same transform as phase-gate.mts)
    await fs.writeFile(
      path.join(validationsDir, "phaseslice92-gate.md"),
      "# Phase Gate Report (parallel) — phase slice92 — 2026-06-11T00:00:00Z\n"
    );

    const { gradePath } = await createGradeFile(repo, sliceId);
    await fillGrade(gradePath);
    await writeGrade(repo, sliceId);

    const raw = await fs.readFile(gradePath, "utf8");
    const { frontmatter } = parseFrontmatter(raw);
    const timing = frontmatter.timing as Record<string, unknown>;
    assert.strictEqual(timing.phase_gate_parallel, true);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("AC-2b: phase_gate_parallel is null when gate file is absent", async () => {
  const repo = await tmpRepo("grade-telemetry-pgp-null-");
  try {
    const sliceId = "SLICE-92";
    await scaffoldSlice(repo, sliceId);
    // No phase-gate file written.
    const { gradePath } = await createGradeFile(repo, sliceId);
    await fillGrade(gradePath);
    await writeGrade(repo, sliceId);

    const raw = await fs.readFile(gradePath, "utf8");
    const { frontmatter } = parseFrontmatter(raw);
    const timing = frontmatter.timing as Record<string, unknown>;
    // null means the file was absent — the placeholder seed from SLICE-91 is preserved.
    assert.strictEqual(timing.phase_gate_parallel, null);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-2c — reviewer_span_ms + serial_reviewer_warning
// ---------------------------------------------------------------------------

test("AC-2c: reviewer_span_ms and serial_reviewer_warning are set from review artifacts", async () => {
  const repo = await tmpRepo("grade-telemetry-review-span-");
  try {
    const sliceId = "SLICE-92";
    await scaffoldSlice(repo, sliceId);

    // Write two review artifact filenames 120 s apart.
    // detectSerialReviewer uses the hyphen-anchored pattern `-slice-92-` .
    const reviewsDir = path.join(repo, ".claude/artifacts/crew/reviews");
    await fs.mkdir(reviewsDir, { recursive: true });
    const t1 = "20260611T000000Z";
    const t2 = "20260611T000200Z"; // 120 seconds later
    await fs.writeFile(path.join(reviewsDir, `${t1}-review-slice-92-a.md`), "reviewer A\n");
    await fs.writeFile(path.join(reviewsDir, `${t2}-review-slice-92-b.md`), "reviewer B\n");

    const { gradePath } = await createGradeFile(repo, sliceId);
    await fillGrade(gradePath);
    await writeGrade(repo, sliceId);

    const raw = await fs.readFile(gradePath, "utf8");
    const { frontmatter } = parseFrontmatter(raw);
    const timing = frontmatter.timing as Record<string, unknown>;

    assert.ok(typeof timing.reviewer_span_ms === "number", "reviewer_span_ms must be a number");
    // Allow ±5 s tolerance around 120 000 ms
    assert.ok(
      (timing.reviewer_span_ms as number) >= 115_000 &&
        (timing.reviewer_span_ms as number) <= 125_000,
      `reviewer_span_ms (${timing.reviewer_span_ms}) should be ~120000`
    );
    assert.strictEqual(
      timing.serial_reviewer_warning,
      true,
      "serial_reviewer_warning must be true (span > 90s threshold)"
    );
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-4 — idempotency: second writeGrade call must not clobber first values
// ---------------------------------------------------------------------------

test("AC-4: writeGrade is idempotent — timing fields are not clobbered on second call", async () => {
  const repo = await tmpRepo("grade-telemetry-idempotent-");
  try {
    const sliceId = "SLICE-92";
    await scaffoldSlice(repo, sliceId);

    // Seed a slice-start event so wall_clock_seconds gets populated.
    const startTs = new Date(Date.now() - 30_000).toISOString();
    await fs.mkdir(path.join(repo, ".claude/logs"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude/logs/loop.jsonl"),
      JSON.stringify({ timestamp: startTs, command: "slice start", slice: sliceId }) + "\n"
    );

    const { gradePath } = await createGradeFile(repo, sliceId);
    await fillGrade(gradePath);

    // First write
    await writeGrade(repo, sliceId);
    const raw1 = await fs.readFile(gradePath, "utf8");
    const { frontmatter: fm1 } = parseFrontmatter(raw1);

    // Second write (all timing fields now populated — must not change)
    await writeGrade(repo, sliceId);
    const raw2 = await fs.readFile(gradePath, "utf8");
    const { frontmatter: fm2 } = parseFrontmatter(raw2);

    const t1 = fm1.timing as Record<string, unknown>;
    const t2 = fm2.timing as Record<string, unknown>;

    // wall_clock_seconds must be identical between the two calls.
    assert.strictEqual(
      t1.wall_clock_seconds,
      t2.wall_clock_seconds,
      "wall_clock_seconds must not be clobbered on second call"
    );
    // All other timing fields must match.
    assert.deepStrictEqual(t1, t2, "timing map must be identical between two writeGrade calls");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
