import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readTouchesFiles } from "../../scripts/lib/wave/touches-files.mjs";

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
});
