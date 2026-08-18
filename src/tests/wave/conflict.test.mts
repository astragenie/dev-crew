import { describe, expect, test } from "bun:test";
import { normalizePath, pathsConflict, PathSet } from "../../scripts/lib/wave/conflict.mjs";

describe("normalizePath", () => {
  test("strips ./ prefix", () => {
    expect(normalizePath("./src/foo.mts")).toBe("src/foo.mts");
  });
  test("converts backslashes to forward", () => {
    expect(normalizePath("src\\foo.mts")).toBe("src/foo.mts");
  });
  test("preserves case on non-Windows; lowercases on Windows", () => {
    if (process.platform === "win32") {
      expect(normalizePath("SRC/Foo.mts")).toBe("src/foo.mts");
    } else {
      expect(normalizePath("SRC/Foo.mts")).toBe("SRC/Foo.mts");
    }
  });
});

describe("pathsConflict", () => {
  test("exact match conflicts", () => {
    expect(pathsConflict("src/a.mts", "src/a.mts")).toBe(true);
  });
  test("different files do not conflict", () => {
    expect(pathsConflict("src/a.mts", "src/b.mts")).toBe(false);
  });
  test("glob in A matches literal in B", () => {
    expect(pathsConflict("src/wave/*.mts", "src/wave/runner.mts")).toBe(true);
  });
  test("glob in B matches literal in A", () => {
    expect(pathsConflict("src/wave/runner.mts", "src/wave/*.mts")).toBe(true);
  });
  test("both touching loop.json conflicts (coarse-prefix)", () => {
    expect(pathsConflict(".claude/loop.json", ".claude/loop.json")).toBe(true);
  });
  test("both inside backlog/** conflicts (coarse-prefix)", () => {
    expect(
      pathsConflict(
        ".claude/artifacts/loop/backlog/triaged/FEAT-001.md",
        ".claude/artifacts/loop/backlog/pending/FEAT-002.md"
      )
    ).toBe(true);
  });
  test("non-coarse-prefix different files outside loop.json do not conflict", () => {
    expect(pathsConflict("src/a.mts", "docs/b.md")).toBe(false);
  });
  test("case-different files do NOT conflict on case-sensitive filesystems", () => {
    if (process.platform !== "win32") {
      expect(pathsConflict("src/Foo.mts", "src/foo.mts")).toBe(false);
    }
  });
  test("** glob matches across path separators", () => {
    expect(pathsConflict("src/**/foo.mts", "src/a/b/c/foo.mts")).toBe(true);
    expect(pathsConflict("src/**/foo.mts", "src/foo.mts")).toBe(true);
  });
  test("single * does NOT cross path separators", () => {
    expect(pathsConflict("src/*.mts", "src/a/b.mts")).toBe(false);
  });
  test("** does not over-match across unrelated trees", () => {
    expect(pathsConflict("src/**/foo.mts", "docs/foo.mts")).toBe(false);
  });
});

describe("PathSet", () => {
  test("addAll then conflictsWith returns true on overlap", () => {
    const s = new PathSet();
    s.addAll(["src/a.mts", "src/b.mts"]);
    expect(s.conflictsWith(["src/b.mts"])).toBe(true);
  });
  test("addAll then conflictsWith returns false on disjoint", () => {
    const s = new PathSet();
    s.addAll(["src/a.mts"]);
    expect(s.conflictsWith(["src/b.mts"])).toBe(false);
  });
  test("conflictingPath returns the colliding entry", () => {
    const s = new PathSet();
    s.addAll(["src/a.mts"]);
    expect(s.conflictingPath(["src/a.mts"])).toBe("src/a.mts");
  });
  test("conflictingPath returns null when no overlap", () => {
    const s = new PathSet();
    s.addAll(["src/a.mts"]);
    expect(s.conflictingPath(["src/b.mts"])).toBe(null);
  });
});
