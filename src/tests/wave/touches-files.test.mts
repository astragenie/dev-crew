import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readTouchesFiles } from "../../scripts/lib/wave/touches-files.mjs";
import { createFeature, createSlice } from "../../scripts/lib/backlog-store.mjs";
import { parseFrontmatter } from "../../scripts/lib/frontmatter.mjs";
import { makeTmpRepo, AC_SECTION_BODY } from "../_fixtures.mjs";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wave-touches-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function writeSlice(name: string, body: string): string {
  const p = join(tmp, name);
  writeFileSync(p, body, "utf8");
  return p;
}

describe("readTouchesFiles", () => {
  test("declared frontmatter wins", () => {
    const p = writeSlice(
      "SLICE-1.md",
      `---
id: SLICE-1
touches_files:
  - src/a.mts
  - src/b.mts
touches_files_confidence: declared
---
# body
`
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.confidence).toBe("declared");
    expect(r.paths).toEqual(["src/a.mts", "src/b.mts"]);
  });

  test("inferred from In scope body when frontmatter missing", () => {
    const p = writeSlice(
      "SLICE-2.md",
      `---
id: SLICE-2
---
# SLICE-2
## In scope
- Add helper to \`src/scripts/lib/brief.mts\`
- Update \`src/tests/brief.test.mts\` with 3 cases
`
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.confidence).toBe("inferred");
    expect(r.paths.sort()).toEqual(["src/scripts/lib/brief.mts", "src/tests/brief.test.mts"]);
  });

  test("missing when no frontmatter + no body matches", () => {
    const p = writeSlice(
      "SLICE-3.md",
      `---
id: SLICE-3
---
# SLICE-3
## In scope
- Update the configuration
- Write tests
`
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.confidence).toBe("missing");
    expect(r.paths).toEqual([]);
  });

  test("dedup duplicate paths from body", () => {
    const p = writeSlice(
      "SLICE-4.md",
      `---
id: SLICE-4
---
## In scope
- Edit \`src/a.mts\`
- Also edit \`src/a.mts\` again
`
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.confidence).toBe("inferred");
    expect(r.paths).toEqual(["src/a.mts"]);
  });

  test("normalizes backslashes from declared paths", () => {
    const p = writeSlice(
      "SLICE-5.md",
      `---
id: SLICE-5
touches_files:
  - src\\foo.mts
touches_files_confidence: declared
---
`
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.paths).toEqual(["src/foo.mts"]);
  });

  test("non-existent slice file throws", () => {
    expect(() => readTouchesFiles(join(tmp, "missing.md"), tmp)).toThrow();
  });

  // SLICE-203 AC-1: the writer (buildSliceMarkdown/serializeFrontmatter) emits
  // touches_files as a single-line inline array — `touches_files: [a, b]` —
  // not the block-style list these earlier fixtures hand-author. Before this
  // slice's fix, this exact shape parsed to the raw string
  // "[hooks/report-gate.mjs, .claude-plugin/hooks/hooks.json]" (Array.isArray
  // false), so readTouchesFiles fell through past "declared" to inference/
  // "missing" — reproducing the live bug astramem-local traced across all 10
  // currently-pending slices.
  test("declared inline-array frontmatter (the writer's actual output shape) parses to declared paths", () => {
    const p = writeSlice(
      "SLICE-6.md",
      `---
id: SLICE-6
touches_files: [hooks/report-gate.mjs, .claude-plugin/hooks/hooks.json]
---
# body
`
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.confidence).toBe("declared");
    expect(r.paths).toEqual(["hooks/report-gate.mjs", ".claude-plugin/hooks/hooks.json"]);
  });

  test("inline array with quoted entries strips the quotes", () => {
    const p = writeSlice(
      "SLICE-7.md",
      `---
id: SLICE-7
touches_files: ["src/a, b.mts", 'src/c.mts']
---
`
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.confidence).toBe("declared");
    expect(r.paths).toEqual(["src/a, b.mts", "src/c.mts"]);
  });

  test("empty inline array [] does not crash and falls through past declared", () => {
    const p = writeSlice(
      "SLICE-8.md",
      `---
id: SLICE-8
touches_files: []
---
## In scope
- Edit \`src/only-inferred.mts\`
`
    );
    const r = readTouchesFiles(p, tmp);
    // an empty declared array carries no paths, same as an empty block list —
    // falls through to body inference rather than reporting "declared" with
    // zero paths.
    expect(r.confidence).toBe("inferred");
    expect(r.paths).toEqual(["src/only-inferred.mts"]);
  });

  test("a clearly-malformed inline-looking value is not silently coerced into a path list", () => {
    const p = writeSlice(
      "SLICE-9.md",
      `---
id: SLICE-9
touches_files: [src/unterminated.mts
---
`
    );
    const r = readTouchesFiles(p, tmp);
    // missing closing bracket -> not recognized as an array -> declared value
    // stays a plain string -> Array.isArray is false -> falls through, same
    // as any other non-array declared value.
    expect(r.confidence).toBe("missing");
    expect(r.paths).toEqual([]);
  });

  // SLICE-203 AC-3: the whole point of the slice — exercise the REAL writer
  // (createSlice) and the REAL reader (readTouchesFiles) in one round trip,
  // instead of a hand-authored fixture on either side. This is the test that
  // must fail before the parseFrontmatter fix above and pass after it.
  test("round-trips touches_files through the real writer and the real reader", async () => {
    const repo = await makeTmpRepo("slice-203-roundtrip-");
    const featureBody = `# FEAT-001: Round trip feature\n\n${AC_SECTION_BODY}`;
    const feat = await createFeature(repo, { title: "Round trip feature", body: featureBody });
    const rawFeat = await readFile(feat.filePath, "utf8");
    const { frontmatter: featureFrontmatter, body: featureBodyParsed } = parseFrontmatter(rawFeat);

    const declaredTouches = ["hooks/report-gate.mjs", ".claude-plugin/hooks/hooks.json"];
    const created = await createSlice({
      repoPath: repo,
      featureId: "FEAT-001",
      featureFilePath: feat.filePath,
      featureFrontmatter,
      featureBody: featureBodyParsed,
      touchesFiles: declaredTouches
    });

    const result = readTouchesFiles(created.filePath, repo);
    expect(result.confidence).toBe("declared");
    expect(result.paths).toEqual(declaredTouches);
  });

  // FEAT-034 AC-4: widened inference regex — crew/, .github/, .claude-plugin/,
  // hooks/, dist/, templates/ sub-paths, plus bare root files cited with no
  // directory prefix at all (package.json, CLAUDE.md, AGENTS.md, .gitignore,
  // README.md, CHANGELOG.md).
  test("AC-4: infers crew/, .github/, and a bare root file (package.json) from the body", () => {
    const p = writeSlice(
      "SLICE-10.md",
      `---
id: SLICE-10
---
## In scope
- Update \`crew/scripts/crew.mts\`
- Sync \`.github/workflows/ci.yml\`
- Bump a dependency in \`package.json\`
`
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.confidence).toBe("inferred");
    expect(r.paths.sort()).toEqual([
      ".github/workflows/ci.yml",
      "crew/scripts/crew.mts",
      "package.json"
    ]);
  });

  test("widened regex also recognizes .claude-plugin/, hooks/, dist/, templates/ and the remaining root files", () => {
    const p = writeSlice(
      "SLICE-11.md",
      `---
id: SLICE-11
---
## In scope
- \`.claude-plugin/plugin.json\`
- \`hooks/hooks.json\`
- \`dist/bundle.js\`
- \`templates/claude-md-hard-rules.md\`
- \`CLAUDE.md\`
- \`AGENTS.md\`
- \`.gitignore\`
- \`README.md\`
- \`CHANGELOG.md\`
`
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.confidence).toBe("inferred");
    expect(r.paths.sort()).toEqual(
      [
        ".claude-plugin/plugin.json",
        "hooks/hooks.json",
        "dist/bundle.js",
        "templates/claude-md-hard-rules.md",
        "CLAUDE.md",
        "AGENTS.md",
        ".gitignore",
        "README.md",
        "CHANGELOG.md"
      ].sort()
    );
  });

  test("a bare root filename is not matched when it is a substring of a longer token", () => {
    const p = writeSlice(
      "SLICE-12.md",
      `---
id: SLICE-12
---
## In scope
- Edit \`mypackage.json\`, a config file unrelated to the real root manifest
- Reference \`src/notREADME.md.bak\` style filenames
`
    );
    const r = readTouchesFiles(p, tmp);
    expect(r.paths).not.toContain("package.json");
    expect(r.paths).not.toContain("README.md");
  });
});
