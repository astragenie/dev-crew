// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { SLICE_TITLE_MAX, clampSliceTitle, resolveSliceTitle, displaySliceTitle } from "../scripts/lib/slice-title.mjs";
// --- clampSliceTitle ---
test("clampSliceTitle leaves short titles untouched", () => {
    assert.equal(clampSliceTitle("Walker composite-score scale normalization"), "Walker composite-score scale normalization");
});
test("clampSliceTitle trims whitespace", () => {
    assert.equal(clampSliceTitle("  padded  "), "padded");
});
test("clampSliceTitle leaves a title at exactly the limit untouched", () => {
    const title = "x".repeat(SLICE_TITLE_MAX);
    assert.equal(clampSliceTitle(title), title);
});
test("clampSliceTitle clamps over-limit titles to the limit with ellipsis", () => {
    const result = clampSliceTitle("word ".repeat(50));
    assert.ok(result.length <= SLICE_TITLE_MAX);
    assert.ok(result.endsWith("…"));
});
test("clampSliceTitle cuts at a word boundary when one exists late enough", () => {
    const result = clampSliceTitle(`${"alpha bravo ".repeat(12)}charliedeltaecho`);
    assert.ok(!result.slice(0, -1).endsWith(" "), "no trailing space before ellipsis");
    assert.ok(result.length <= SLICE_TITLE_MAX);
});
test("clampSliceTitle hard-cuts a single over-long word", () => {
    const result = clampSliceTitle("y".repeat(300));
    assert.equal(result.length, SLICE_TITLE_MAX);
    assert.ok(result.endsWith("…"));
});
// --- resolveSliceTitle ---
const BODY_WITH_H1 = "# SLICE-42: Walker scale normalization\n\n## Objective\n\nLong paragraph here.\n";
test("resolveSliceTitle prefers frontmatter title over H1", () => {
    const fm = { title: "Frontmatter wins" };
    assert.equal(resolveSliceTitle(fm, BODY_WITH_H1, "SLICE-42"), "Frontmatter wins");
});
test("resolveSliceTitle strips id prefix from frontmatter title", () => {
    const fm = { title: "SLICE-42: Frontmatter wins" };
    assert.equal(resolveSliceTitle(fm, BODY_WITH_H1, "SLICE-42"), "Frontmatter wins");
});
test("resolveSliceTitle falls back to H1 without id prefix", () => {
    assert.equal(resolveSliceTitle({}, BODY_WITH_H1, "SLICE-42"), "Walker scale normalization");
});
test("resolveSliceTitle falls back to slice id when no title anywhere", () => {
    assert.equal(resolveSliceTitle({}, "## Objective\n\nNo heading.\n", "SLICE-09"), "SLICE-09");
});
test("resolveSliceTitle clamps over-long frontmatter titles", () => {
    const fm = { title: "z".repeat(300) };
    const result = resolveSliceTitle(fm, "", "SLICE-01");
    assert.equal(result.length, SLICE_TITLE_MAX);
    assert.ok(result.endsWith("…"));
});
// --- displaySliceTitle ---
test("displaySliceTitle prefixes the slice id", () => {
    assert.equal(displaySliceTitle({}, BODY_WITH_H1, "SLICE-42"), "SLICE-42: Walker scale normalization");
});
test("displaySliceTitle returns bare id when no title is known", () => {
    assert.equal(displaySliceTitle({}, "", "SLICE-42"), "SLICE-42");
});
