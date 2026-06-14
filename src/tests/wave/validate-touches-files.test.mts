import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateRepo } from "../../scripts/validate-slice-touches-files.mjs";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wave-validate-"));
  mkdirSync(join(tmp, ".claude/artifacts/loop/ai-loop/slices/pending"), { recursive: true });
  mkdirSync(join(tmp, "src/scripts/lib"), { recursive: true });
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function writeSlice(state: string, name: string, body: string): void {
  const dir = join(tmp, ".claude/artifacts/loop/ai-loop/slices", state);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), body, "utf8");
}

describe("validateRepo", () => {
  test("clean: declared touches_files paths whose parent dirs exist", () => {
    writeSlice(
      "pending",
      "SLICE-1.md",
      `---
id: SLICE-1
created: 2026-06-15
touches_files:
  - src/scripts/lib/foo.mts
touches_files_confidence: declared
---
`
    );
    const r = validateRepo(tmp, { warnCutoff: "2026-06-01" });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  test("warn: missing confidence on slice created after cutoff", () => {
    writeSlice(
      "pending",
      "SLICE-2.md",
      `---
id: SLICE-2
created: 2026-06-15
---
# body, no touches mentioned
`
    );
    const r = validateRepo(tmp, { warnCutoff: "2026-06-01" });
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain("SLICE-2");
    expect(r.errors).toEqual([]);
  });

  test("error: declared path whose parent dir does not exist", () => {
    writeSlice(
      "pending",
      "SLICE-3.md",
      `---
id: SLICE-3
created: 2026-06-15
touches_files:
  - bogus/path/foo.mts
touches_files_confidence: declared
---
`
    );
    const r = validateRepo(tmp, { warnCutoff: "2026-06-01" });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("bogus/path");
  });

  test("error: absolute path declared", () => {
    writeSlice(
      "pending",
      "SLICE-4.md",
      `---
id: SLICE-4
created: 2026-06-15
touches_files:
  - /etc/passwd
touches_files_confidence: declared
---
`
    );
    const r = validateRepo(tmp, { warnCutoff: "2026-06-01" });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("outside repo");
  });
});
