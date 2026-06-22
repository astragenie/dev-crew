import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import { GRADE_JSONL_RELATIVE } from "../scripts/lib/grade-jsonl-writer.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";
import { SCORE_DIMENSIONS } from "../scripts/lib/grade-parser.mjs";

async function tmpRepo(prefix: string): Promise<string> {
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
        phaseGateArtifactDir: ".claude/artifacts/crew/validations",
        notifications: {
          mode: "webhook",
          webhook: {
            url: "https://runner.local/h",
            tenantId: "T",
            appId: "A",
            bearer: "B"
          }
        }
      },
      stack: {}
    })
  );
  return repo;
}

async function scaffoldSlice(repo: string, sliceId: string): Promise<void> {
  await fs.mkdir(path.join(repo, ".claude/artifacts/loop/ai-loop/slices/in-progress"), {
    recursive: true
  });
  const slug = sliceId.replace(/[^A-Za-z0-9]/g, "_");
  await fs.writeFile(
    path.join(repo, `.claude/artifacts/loop/ai-loop/slices/in-progress/${slug}.md`),
    `---\nid: ${sliceId}\nfeature: FEAT-9\n---\n# ${sliceId}\n`
  );
}

/** Fill grade template with real scores + clean up placeholders so writeGrade won't reject. */
async function fillGrade(gradePath: string): Promise<void> {
  let content = await fs.readFile(gradePath, "utf8");
  for (const dim of SCORE_DIMENSIONS as string[]) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.90`);
  }
  content = content.replace(/- bullet 1\n- bullet 2/, "- Real lesson 1\n- Real lesson 2");
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
  await fs.writeFile(gradePath, content);
}

describe("writeGrade — grades.jsonl + webhook fanout", () => {
  test("appends grades.jsonl row AND posts envelope kind grade.recorded", async () => {
    const repo = await tmpRepo("loop-grade-fanout-");
    try {
      const sliceId = "SLICE-1";
      await scaffoldSlice(repo, sliceId);

      const { gradePath } = await createGradeFile(repo, sliceId);
      await fillGrade(gradePath);

      const calls: { init?: RequestInit }[] = [];
      const originalFetch = fanoutInternals.fetch;
      fanoutInternals.fetch = (async (_url, init) => {
        calls.push({ init });
        return new Response(null, { status: 202 });
      }) as typeof fanoutInternals.fetch;
      try {
        await writeGrade(repo, sliceId);
      } finally {
        fanoutInternals.fetch = originalFetch;
      }

      // grades.jsonl exists with at least one row
      const jsonlPath = path.join(repo, GRADE_JSONL_RELATIVE);
      const jsonlContent = await fs.readFile(jsonlPath, "utf8");
      const rows = jsonlContent.trim().split("\n");
      expect(rows.length).toBeGreaterThanOrEqual(1);
      const row = JSON.parse(rows[0]);
      expect(row.sliceId).toBe(sliceId);
      expect(row.scores.architecture_quality).toBe(0.9);

      // Webhook fanout — find the grade.recorded post (logEvent also fires kind loop.slice.grade-write)
      const gradePost = calls.find((c) => {
        const body = JSON.parse(String(c.init?.body));
        return body.kind === "grade.recorded";
      });
      expect(gradePost).toBeDefined();
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });
});
