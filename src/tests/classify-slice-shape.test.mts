import { test } from "bun:test";
import assert from "node:assert/strict";

import { classifySliceShape } from "../scripts/lib/classify-slice-shape.mjs";

test("doc-update: all markdown", () => {
  const r = classifySliceShape({ files: [{ path: "docs/foo.md", added: 10, removed: 2 }] });
  assert.equal(r.shape, "doc-update");
});

test("config-tweak: only loop.json", () => {
  const r = classifySliceShape({ files: [{ path: ".claude/loop.json", added: 3, removed: 1 }] });
  assert.equal(r.shape, "config-tweak");
});

test("single-module-edit: 1 source file, small delta, no export", () => {
  const r = classifySliceShape({
    files: [{ path: "src/scripts/lib/helper.mts", added: 20, removed: 5, exportDelta: 0 }]
  });
  assert.equal(r.shape, "single-module-edit");
});

test("test-only: all under src/tests", () => {
  const r = classifySliceShape({
    files: [{ path: "src/tests/a.test.mts", added: 50, removed: 0 }]
  });
  assert.equal(r.shape, "test-only");
});

test("none: mixed file types", () => {
  const r = classifySliceShape({
    files: [
      { path: "src/scripts/lib/a.mts", added: 5, removed: 0 },
      { path: "docs/x.md", added: 5, removed: 0 }
    ]
  });
  assert.equal(r.shape, "none");
});

test("none: public-surface file forbidden from single-module-edit", () => {
  const r = classifySliceShape({
    files: [{ path: "src/scripts/lib/auto-dispatch.mts", added: 10, removed: 0, exportDelta: 0 }]
  });
  assert.equal(r.shape, "none");
  assert.match(r.rationale, /public-surface/);
});

test("none: gross LOC delta over threshold", () => {
  const r = classifySliceShape({
    files: [{ path: "src/scripts/lib/x.mts", added: 60, removed: 10, exportDelta: 0 }]
  });
  assert.equal(r.shape, "none");
});

test("none: export delta non-zero", () => {
  const r = classifySliceShape({
    files: [{ path: "src/scripts/lib/x.mts", added: 10, removed: 0, exportDelta: 1 }]
  });
  assert.equal(r.shape, "none");
});
