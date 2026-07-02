// FEAT-204: wave-mode cost report deduplication regression tests.
//
// Fixture shape mirrors the historical SLICE-115 wave evidence (retrospective
// 2026-07-02): two sibling FEATs (FEAT-165, FEAT-180) each closed against the
// same underlying crew session ~2s apart and each wrote a full-price
// $3.846 / 7,909,088-token cost report for it.

import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  dedupeCostReportsInDir,
  SESSION_DEDUP_WINDOW_MS
} from "../scripts/lib/slice-linker/cost-report-dedup.mjs";
import { loadCostReportUSDValues } from "../scripts/lib/memory-snapshot.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

async function tmpCostDir(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const dir = path.join(repo, ".claude/artifacts/crew/cost");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function costReportContent({
  feature,
  runTitle,
  usd,
  totalTokens,
  sourceProject,
  createdAt
}: {
  feature: string;
  runTitle: string;
  usd: number;
  totalTokens: number;
  sourceProject: string;
  createdAt: string;
}): string {
  return `---
kind: cost-report
feature: ${feature}
run_title: "${runTitle}"
usd: ${usd}
duration_ms: 1802350
total_tokens: ${totalTokens}
cache_hit_pct: 98.6
source_project: ${sourceProject}
aggregate_all: false
source_count: 1
created_at: ${createdAt}
---

# Cost Report: ${runTitle}

- Total USD: $${usd.toFixed(4)}
`;
}

// Writes the SLICE-115-shaped duplicate pair: FEAT-165 (earlier) and
// FEAT-180 (2s later), same source_project + total_tokens, same $3.846.
async function writeSlice115Fixture(dir: string): Promise<{ earlier: string; later: string }> {
  const earlierName = "20260613T092249Z-cost-report-slice-feat165-slice115.md";
  const laterName = "20260613T092251Z-cost-report-slice-feat180-slice115.md";
  await fs.writeFile(
    path.join(dir, earlierName),
    costReportContent({
      feature: "FEAT-165",
      runTitle: "FEAT165 SLICE115",
      usd: 3.846,
      totalTokens: 7909088,
      sourceProject: "C--work-mega-loop",
      createdAt: "2026-06-13T09:22:49.993Z"
    })
  );
  await fs.writeFile(
    path.join(dir, laterName),
    costReportContent({
      feature: "FEAT-180",
      runTitle: "FEAT180 SLICE115",
      usd: 3.846,
      totalTokens: 7909088,
      sourceProject: "C--work-mega-loop",
      createdAt: "2026-06-13T09:22:51.674Z"
    })
  );
  return { earlier: earlierName, later: laterName };
}

// --- dedupeCostReportsInDir ---

test("dedupeCostReportsInDir collapses the SLICE-115 duplicate pair into one primary + one reference", async () => {
  const dir = await tmpCostDir("al-cost-dedup-pair-");
  const { earlier, later } = await writeSlice115Fixture(dir);

  const result = await dedupeCostReportsInDir(dir);
  assert.equal(result.groups, 1, "the pair shares one session fingerprint");
  assert.deepEqual(result.deduped, [later], "only the later report is collapsed to a reference");

  const primaryText = await fs.readFile(path.join(dir, earlier), "utf8");
  const { frontmatter: primaryFm } = parseFrontmatter(primaryText);
  assert.equal(primaryFm.shared_with, undefined, "primary report is untouched");
  assert.equal(primaryFm.usd, 3.846);

  const refText = await fs.readFile(path.join(dir, later), "utf8");
  const { frontmatter: refFm } = parseFrontmatter(refText);
  assert.equal(refFm.shared_with, "FEAT-165", "reference points at the primary's feature id");
  assert.equal(refFm.shared_session_of, earlier, "reference names the primary file");
  assert.equal(refFm.usd, 3.846, "reference keeps its own usd as an orphan fallback");
});

test("dedupeCostReportsInDir leaves an unrelated report (different session) untouched", async () => {
  const dir = await tmpCostDir("al-cost-dedup-unrelated-");
  await writeSlice115Fixture(dir);
  const otherName = "20260613T100000Z-cost-report-slice-feat099-slice200.md";
  await fs.writeFile(
    path.join(dir, otherName),
    costReportContent({
      feature: "FEAT-099",
      runTitle: "FEAT099 SLICE200",
      usd: 1.2,
      totalTokens: 55000,
      sourceProject: "C--work-mega-loop",
      createdAt: "2026-06-13T10:00:00.000Z"
    })
  );

  const result = await dedupeCostReportsInDir(dir);
  assert.equal(result.groups, 2, "unrelated report forms its own singleton group");
  assert.equal(result.deduped.length, 1, "only the SLICE-115 pair is collapsed");

  const otherText = await fs.readFile(path.join(dir, otherName), "utf8");
  const { frontmatter: otherFm } = parseFrontmatter(otherText);
  assert.equal(otherFm.shared_with, undefined, "unrelated report keeps its full payload");
});

test("dedupeCostReportsInDir is idempotent -- a second sweep makes no further changes", async () => {
  const dir = await tmpCostDir("al-cost-dedup-idempotent-");
  await writeSlice115Fixture(dir);

  const first = await dedupeCostReportsInDir(dir);
  assert.equal(first.deduped.length, 1);

  const second = await dedupeCostReportsInDir(dir);
  assert.deepEqual(second.deduped, [], "already-deduped reference is excluded from candidacy");
});

test("dedupeCostReportsInDir does not merge same-session reports outside the dedup window", async () => {
  const dir = await tmpCostDir("al-cost-dedup-outside-window-");
  await writeSlice115Fixture(dir);

  // 1-minute window is narrower than the ~2s gap is wide -- sanity check
  // the option plumbs through -- then widen it below the actual gap.
  const result = await dedupeCostReportsInDir(dir, { windowMs: 0 });
  assert.deepEqual(result.deduped, [], "zero-width window rejects even a 2s-apart pair");

  const wider = await dedupeCostReportsInDir(dir, { windowMs: SESSION_DEDUP_WINDOW_MS });
  assert.equal(wider.deduped.length, 1, "default window comfortably covers the 2s gap");
});

// --- loadCostReportUSDValues ---

test("loadCostReportUSDValues counts a deduped session's usd exactly once (AC-2)", async () => {
  const dir = await tmpCostDir("al-cost-dedup-avg-once-");
  const repo = path.resolve(dir, "../../../.."); // .claude/artifacts/crew/cost -> repo root
  await writeSlice115Fixture(dir);
  await dedupeCostReportsInDir(dir);

  const values = await loadCostReportUSDValues(repo);
  assert.deepEqual(values, [3.846], "primary counted once, reference skipped");
});

test("loadCostReportUSDValues falls back to a reference's own usd when its primary is orphaned (AC-3)", async () => {
  const dir = await tmpCostDir("al-cost-dedup-orphan-");
  const repo = path.resolve(dir, "../../../..");

  // Only the reference is on disk -- its primary has rotated out of the
  // top-N window (or was pruned). shared_session_of points at a file that
  // does not exist in this directory.
  await fs.writeFile(
    path.join(dir, "20260613T092251Z-cost-report-slice-feat180-slice115.md"),
    (() => {
      const base = costReportContent({
        feature: "FEAT-180",
        runTitle: "FEAT180 SLICE115",
        usd: 3.846,
        totalTokens: 7909088,
        sourceProject: "C--work-mega-loop",
        createdAt: "2026-06-13T09:22:51.674Z"
      });
      return base.replace(
        "source_count: 1\n",
        "source_count: 1\nshared_with: FEAT-165\nshared_session_of: 20260613T092249Z-cost-report-slice-feat165-slice115.md\n"
      );
    })()
  );

  const warns: string[] = [];
  const orig = console.warn;
  console.warn = (...args: unknown[]) => {
    warns.push(args.join(" "));
  };
  let values: number[];
  try {
    values = await loadCostReportUSDValues(repo);
  } finally {
    console.warn = orig;
  }

  assert.deepEqual(values, [3.846], "orphaned reference's own usd counted as fallback");
  assert.ok(
    warns.some((w) => w.includes("[cost-dedup]") && w.includes("orphaned")),
    "orphan fallback is logged distinctly from a true-duplicate skip"
  );
});

// --- AC-4: end-to-end regression on the SLICE-115 wave fixture shape ---

test("SLICE-115 wave fixture: dedup + snapshot averaging matches the deduplicated total, not the doubled sum", async () => {
  const dir = await tmpCostDir("al-cost-dedup-e2e-");
  const repo = path.resolve(dir, "../../../..");
  await writeSlice115Fixture(dir);

  const dedupResult = await dedupeCostReportsInDir(dir);
  assert.equal(dedupResult.deduped.length, 1, "exactly one report is recorded as a reference");

  const values = await loadCostReportUSDValues(repo);
  assert.equal(values.length, 1, "exactly one report contributes cost");
  assert.equal(values[0], 3.846, "average reflects the deduplicated total ($3.846), not $7.692");
});
