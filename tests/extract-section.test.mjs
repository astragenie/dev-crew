import test from "node:test";
import assert from "node:assert/strict";

import { extractSection } from "../scripts/lib/slice-linker.mjs";

const SLICE_CONTENT = [
  "# SLICE-01: Test slice",
  "",
  "## Objective",
  "",
  "Build the widget.",
  "",
  "## In scope",
  "",
  "- [ ] AC-1: Widget renders",
  "- [ ] AC-2: Widget accepts props",
  "",
  "## Out of scope",
  "",
  "- Performance optimization",
  "- Mobile layout",
  "",
  "## Acceptance criteria",
  "",
  "- [ ] AC-1: Widget renders correctly",
  "- [ ] AC-2: Widget handles edge cases",
  "",
  "## Done When",
  "",
  "All criteria PASS."
].join("\n");

test("extractSection returns null for missing section", () => {
  const result = extractSection(SLICE_CONTENT, /^##\s+Nonexistent\s*$/i);
  assert.equal(result, null);
});

test("extractSection extracts Objective section", () => {
  const result = extractSection(SLICE_CONTENT, /^##\s+Objective\s*$/i);
  assert.equal(result, "Build the widget.");
});

test("extractSection extracts In scope section", () => {
  const result = extractSection(SLICE_CONTENT, /^##\s+In\s+scope\s*$/i, {
    joinChar: "\n"
  });
  assert.ok(result.includes("AC-1: Widget renders"));
  assert.ok(result.includes("AC-2: Widget accepts props"));
});

test("extractSection extracts Out of scope section", () => {
  const result = extractSection(SLICE_CONTENT, /^##\s+Out\s+of\s+scope\s*$/i, {
    joinChar: "\n"
  });
  assert.ok(result.includes("Performance optimization"));
  assert.ok(result.includes("Mobile layout"));
});

test("extractSection stops at next ## heading", () => {
  const result = extractSection(SLICE_CONTENT, /^##\s+Out\s+of\s+scope\s*$/i, {
    joinChar: "\n"
  });
  assert.ok(!result.includes("AC-1: Widget renders correctly"));
  assert.ok(!result.includes("Done When"));
});

test("extractSection is case-insensitive on heading match", () => {
  const content = "## OBJECTIVE\n\nUpper case heading.";
  const result = extractSection(content, /^##\s+Objective\s*$/i);
  assert.equal(result, "Upper case heading.");
});

test("extractSection truncates at maxLen", () => {
  const longContent = "## Objective\n\n" + "x".repeat(1000);
  const result = extractSection(longContent, /^##\s+Objective\s*$/i, { maxLen: 50 });
  assert.equal(result.length, 50);
});

test("extractSection returns null for section with only whitespace", () => {
  const content = "## Objective\n\n   \n\n## Next";
  const result = extractSection(content, /^##\s+Objective\s*$/i);
  assert.equal(result, null);
});

test("extractSection handles alternate heading pattern", () => {
  const result = extractSection(SLICE_CONTENT, /^##\s+(In\s+scope|Acceptance\s+criteria)\s*$/i, {
    joinChar: "\n"
  });
  assert.ok(result.includes("AC-1: Widget renders"));
});

test("extractSection alternate pattern matches Acceptance criteria when In scope absent", () => {
  const content = [
    "# Slice",
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: Works",
    "",
    "## Done When"
  ].join("\n");
  const result = extractSection(content, /^##\s+(In\s+scope|Acceptance\s+criteria)\s*$/i, {
    joinChar: "\n"
  });
  assert.ok(result.includes("AC-1: Works"));
});
