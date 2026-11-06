// FEAT-034: FEAT-level proposed_slices materialize all slices at once with
// no intra-FEAT ordering signal, so a FEAT whose slices are meant to run
// sequentially (a later slice depends on an earlier sibling's output) gets
// them packed in the same wave whenever their declared touches_files
// happen to be disjoint. `sequential: true` on the FEAT's frontmatter (next
// to `proposed_slices`) fixes that: feature-lifecycle.mts stamps every
// materialized sibling slice with `sequential_group: <FEAT id>`, and
// packWave refuses to place two candidates sharing a sequentialGroup in
// the same wave. Default stays parallel.

import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { packWave, loadCandidates } from "../../scripts/lib/wave/planner.mjs";
import type { SliceCandidate } from "../../scripts/lib/wave/types.mjs";
import { sliceFromFeature } from "../../scripts/lib/slice-linker.mjs";
import {
  addFeature,
  updateFeatureFrontmatter,
  findFeatureById
} from "../../scripts/lib/backlog-writer.mjs";
import { parseFrontmatter } from "../../scripts/lib/frontmatter.mjs";
import { AC_SECTION_BODY } from "../_fixtures.mjs";

const opts = { waveSize: 3, sliceCommand: "/devcrew:orchestrate-slice", waveId: "test-wave" };

function cand(id: string, paths: string[], over: Partial<SliceCandidate> = {}): SliceCandidate {
  return {
    sliceId: id,
    featureId: `FEAT-${id}`,
    slicePath: "",
    priority: "P2",
    compositeScore: 0.5,
    strategicFit: 0.5,
    touches: { paths, confidence: paths.length > 0 ? "declared" : "missing" },
    pmRiskLevel: 0,
    autonomousSafe: true,
    retryCount: 0,
    pendingFix: false,
    dependsOn: [],
    helpRequestOpen: false,
    ...over
  };
}

describe("packWave — sequential grouping (AC-3)", () => {
  test("at most one slice per sequentialGroup appears per wave, even with disjoint touches_files", () => {
    const ranked = [
      cand("S1", ["src/a.mts"], { sequentialGroup: "FEAT-SEQ" }),
      cand("S2", ["src/b.mts"], { sequentialGroup: "FEAT-SEQ" }),
      cand("S3", ["src/c.mts"])
    ];
    const p = packWave(ranked, opts);
    expect(p.items.map((i) => i.sliceId)).toEqual(["S1", "S3"]);
    expect(p.rejected.find((r) => r.sliceId === "S2")?.reason).toContain("FEAT-SEQ");
  });

  test("candidates with no sequentialGroup are unaffected and can both pack", () => {
    const ranked = [cand("S1", ["src/a.mts"]), cand("S2", ["src/b.mts"])];
    const p = packWave(ranked, opts);
    expect(p.items.map((i) => i.sliceId)).toEqual(["S1", "S2"]);
  });

  test("different sequentialGroups do not block each other", () => {
    const ranked = [
      cand("S1", ["src/a.mts"], { sequentialGroup: "FEAT-A" }),
      cand("S2", ["src/b.mts"], { sequentialGroup: "FEAT-B" })
    ];
    const p = packWave(ranked, opts);
    expect(p.items.map((i) => i.sliceId)).toEqual(["S1", "S2"]);
  });

  test("a third sibling in the same group is also rejected once one is picked", () => {
    const ranked = [
      cand("S1", ["src/a.mts"], { sequentialGroup: "FEAT-SEQ" }),
      cand("S2", ["src/b.mts"], { sequentialGroup: "FEAT-SEQ" }),
      cand("S3", ["src/c.mts"], { sequentialGroup: "FEAT-SEQ" })
    ];
    const p = packWave(ranked, opts);
    expect(p.items.map((i) => i.sliceId)).toEqual(["S1"]);
    expect(p.rejected.map((r) => r.sliceId).sort()).toEqual(["S2", "S3"]);
  });
});

describe("loadCandidates — sequential derivation (fallback path)", () => {
  let tmp: string;

  test("FEAT-level sequential:true derives sequentialGroup = featureId for every sibling slice", () => {
    tmp = mkdtempSync(join(tmpdir(), "wave-seq-load-"));
    try {
      mkdirSync(join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending"), { recursive: true });
      mkdirSync(join(tmp, ".claude/artifacts/loop/backlog/triaged"), { recursive: true });
      writeFileSync(
        join(tmp, ".claude/artifacts/loop/backlog/triaged/FEAT-SEQ.md"),
        "---\nid: FEAT-SEQ\npriority: P2\nsequential: true\nautonomous_safe: true\n---\n",
        "utf8"
      );
      writeFileSync(
        join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending/SLICE-A.md"),
        "---\nid: SLICE-A\nfeature: FEAT-SEQ\npriority: P2\ntouches_files:\n  - src/a.mts\n---\n",
        "utf8"
      );
      writeFileSync(
        join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending/SLICE-B.md"),
        "---\nid: SLICE-B\nfeature: FEAT-SEQ\npriority: P2\ntouches_files:\n  - src/b.mts\n---\n",
        "utf8"
      );
      const cands = loadCandidates(tmp);
      expect(cands).toHaveLength(2);
      for (const c of cands) {
        expect(c.sequentialGroup).toBe("FEAT-SEQ");
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("a stamped per-slice sequential_group wins over re-deriving from the FEAT flag", () => {
    tmp = mkdtempSync(join(tmpdir(), "wave-seq-stamp-"));
    try {
      mkdirSync(join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending"), { recursive: true });
      mkdirSync(join(tmp, ".claude/artifacts/loop/backlog/triaged"), { recursive: true });
      writeFileSync(
        join(tmp, ".claude/artifacts/loop/backlog/triaged/FEAT-STAMP.md"),
        "---\nid: FEAT-STAMP\npriority: P2\nautonomous_safe: true\n---\n",
        "utf8"
      );
      writeFileSync(
        join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending/SLICE-C.md"),
        "---\nid: SLICE-C\nfeature: FEAT-STAMP\npriority: P2\nsequential_group: FEAT-STAMP\ntouches_files:\n  - src/c.mts\n---\n",
        "utf8"
      );
      const cands = loadCandidates(tmp);
      expect(cands[0]!.sequentialGroup).toBe("FEAT-STAMP");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("sequential absent/false leaves sequentialGroup undefined", () => {
    tmp = mkdtempSync(join(tmpdir(), "wave-seq-off-"));
    try {
      mkdirSync(join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending"), { recursive: true });
      mkdirSync(join(tmp, ".claude/artifacts/loop/backlog/triaged"), { recursive: true });
      writeFileSync(
        join(tmp, ".claude/artifacts/loop/backlog/triaged/FEAT-PAR.md"),
        "---\nid: FEAT-PAR\npriority: P2\nautonomous_safe: true\n---\n",
        "utf8"
      );
      writeFileSync(
        join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending/SLICE-D.md"),
        "---\nid: SLICE-D\nfeature: FEAT-PAR\npriority: P2\ntouches_files:\n  - src/d.mts\n---\n",
        "utf8"
      );
      const cands = loadCandidates(tmp);
      expect(cands[0]!.sequentialGroup).toBeUndefined();
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(join(tmpdir(), prefix));
  await fs.mkdir(join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

describe("feature-lifecycle.mts — stamps sequential_group on materialization", () => {
  test("every sibling slice materialized from a sequential:true FEAT carries sequential_group", async () => {
    const repo = await tmpRepo("seq-stamp-");
    const feat = await addFeature(repo, { title: "Sequenced work", body: AC_SECTION_BODY });
    await updateFeatureFrontmatter(feat.filePath, {
      effort_points: 4,
      sequential: true,
      proposed_slices: [
        { id_suffix: "-SLICE-1", title: "Step one", points: 2 },
        { id_suffix: "-SLICE-2", title: "Step two", points: 2 }
      ]
    });

    const out = await sliceFromFeature(repo, feat.id);
    expect(out.slices).toHaveLength(2);

    for (const sl of out.slices as { path: string }[]) {
      const content = await fs.readFile(sl.path, "utf8");
      const { frontmatter } = parseFrontmatter(content);
      expect(frontmatter.sequential_group).toBe(feat.id);
    }

    const updated = await findFeatureById(repo, feat.id);
    expect(updated!.frontmatter.slices).toHaveLength(2);
  });

  test("a FEAT without sequential:true never stamps sequential_group", async () => {
    const repo = await tmpRepo("seq-off-");
    const feat = await addFeature(repo, { title: "Parallel work", body: AC_SECTION_BODY });
    await updateFeatureFrontmatter(feat.filePath, {
      effort_points: 4,
      proposed_slices: [
        { id_suffix: "-SLICE-1", title: "Part one", points: 2 },
        { id_suffix: "-SLICE-2", title: "Part two", points: 2 }
      ]
    });

    const out = await sliceFromFeature(repo, feat.id);
    for (const sl of out.slices as { path: string }[]) {
      const content = await fs.readFile(sl.path, "utf8");
      const { frontmatter } = parseFrontmatter(content);
      expect(frontmatter.sequential_group).toBeUndefined();
    }
  });
});
