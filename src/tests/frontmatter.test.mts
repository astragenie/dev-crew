import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  parseFrontmatter,
  serializeFrontmatter,
  mergeFrontmatter
} from "../scripts/lib/frontmatter.mjs";

test("parseFrontmatter handles flat key:value", () => {
  const input = "---\nid: FEAT-001\nstatus: pending\npriority: P1\n---\n\nbody";
  const { frontmatter, body } = parseFrontmatter(input);
  assert.equal(frontmatter.id, "FEAT-001");
  assert.equal(frontmatter.status, "pending");
  assert.equal(frontmatter.priority, "P1");
  assert.equal(body, "body");
});

test("parseFrontmatter handles inline arrays", () => {
  const input = "---\nderived_features: [FEAT-007, FEAT-008]\n---\nbody";
  const { frontmatter } = parseFrontmatter(input);
  assert.deepEqual(frontmatter.derived_features, ["FEAT-007", "FEAT-008"]);
});

test("parseFrontmatter handles block arrays", () => {
  const input =
    "---\nderived_features:\n  - FEAT-007\n  - FEAT-008\n  - FEAT-009\nstatus: decomposed\n---\nbody";
  const { frontmatter } = parseFrontmatter(input);
  assert.deepEqual(frontmatter.derived_features, ["FEAT-007", "FEAT-008", "FEAT-009"]);
  assert.equal(frontmatter.status, "decomposed");
});

test("parseFrontmatter handles null and empty values", () => {
  const input = "---\npriority: null\ncategory:\ntarget_release: ~\n---\nbody";
  const { frontmatter } = parseFrontmatter(input);
  assert.equal(frontmatter.priority, null);
  assert.equal(frontmatter.category, null);
  assert.equal(frontmatter.target_release, null);
});

test("parseFrontmatter handles quoted strings", () => {
  const input = `---\ntitle: "MemoryService v2"\nowner: 'pm-name'\n---\nbody`;
  const { frontmatter } = parseFrontmatter(input);
  assert.equal(frontmatter.title, "MemoryService v2");
  assert.equal(frontmatter.owner, "pm-name");
});

test("parseFrontmatter returns empty when no frontmatter present", () => {
  const input = "# just markdown\n\nno frontmatter here";
  const { frontmatter, body } = parseFrontmatter(input);
  assert.deepEqual(frontmatter, {});
  assert.equal(body, input);
});

test("parseFrontmatter tolerates CRLF line endings (Windows checkout regression)", () => {
  // Confirmed 2026-06-07: backlog files written with CRLF on Windows silently
  // returned {} from parseFrontmatter, so the auto-walker read autonomous_safe
  // as undefined and skipped every FEAT. Regex must accept \r?\n at every
  // frontmatter delimiter.
  const input =
    "---\r\nid: FEAT-001\r\nstatus: triaged\r\nautonomous_safe: true\r\npriority: P1\r\n---\r\n\r\nbody";
  const { frontmatter, body } = parseFrontmatter(input);
  assert.equal(frontmatter.id, "FEAT-001");
  assert.equal(frontmatter.status, "triaged");
  assert.equal(frontmatter.autonomous_safe, true);
  assert.equal(frontmatter.priority, "P1");
  assert.equal(body.trim(), "body");
});

test("parseFrontmatter handles mixed CRLF + LF (git autocrlf edge case)", () => {
  // Some files mix line endings — defensive check.
  const input = "---\r\nid: FEAT-002\nautonomous_safe: false\r\n---\nbody";
  const { frontmatter } = parseFrontmatter(input);
  assert.equal(frontmatter.id, "FEAT-002");
  assert.equal(frontmatter.autonomous_safe, false);
});

test("serializeFrontmatter round-trips a basic doc", () => {
  const input =
    "---\nid: FEAT-001\nstatus: pending\nderived_features: [FEAT-007, FEAT-008]\n---\nbody text";
  const { frontmatter, body } = parseFrontmatter(input);
  const out = serializeFrontmatter(frontmatter, body);
  const reparse = parseFrontmatter(out);
  assert.equal(reparse.frontmatter.id, "FEAT-001");
  assert.equal(reparse.frontmatter.status, "pending");
  assert.deepEqual(reparse.frontmatter.derived_features, ["FEAT-007", "FEAT-008"]);
  assert.match(reparse.body, /body text/);
});

test("mergeFrontmatter overlays updates onto existing frontmatter", () => {
  const input = "---\nid: FEAT-001\nstatus: pending\npriority: null\n---\nbody";
  const out = mergeFrontmatter(input, { status: "triaged", priority: "P1" });
  const { frontmatter } = parseFrontmatter(out);
  assert.equal(frontmatter.id, "FEAT-001");
  assert.equal(frontmatter.status, "triaged");
  assert.equal(frontmatter.priority, "P1");
});

test("serializeFrontmatter quotes values with special characters", () => {
  const fm = { title: "Has: colon and , comma" };
  const out = serializeFrontmatter(fm, "body");
  const parsed = parseFrontmatter(out);
  assert.equal(parsed.frontmatter.title, "Has: colon and , comma");
});

// FEAT-168 / SLICE-99 — arrays of mappings (proposed_slices shape).

test("parseFrontmatter handles arrays of mappings", () => {
  const input =
    "---\nproposed_slices:\n  - id_suffix: -SLICE-1\n    title: Lib\n    points: 5\n  - id_suffix: -SLICE-2\n    title: CLI\n    points: 3\n---\nbody";
  const { frontmatter } = parseFrontmatter(input);
  assert.ok(Array.isArray(frontmatter.proposed_slices));
  assert.equal(frontmatter.proposed_slices.length, 2);
  assert.deepEqual(frontmatter.proposed_slices[0], {
    id_suffix: "-SLICE-1",
    title: "Lib",
    points: 5
  });
  assert.deepEqual(frontmatter.proposed_slices[1], {
    id_suffix: "-SLICE-2",
    title: "CLI",
    points: 3
  });
});

test("serializeFrontmatter emits block form for arrays of mappings", () => {
  const fm = {
    proposed_slices: [
      { id_suffix: "-SLICE-1", title: "Lib", points: 5 },
      { id_suffix: "-SLICE-2", title: "CLI", points: 3 }
    ]
  };
  const out = serializeFrontmatter(fm, "body");
  assert.ok(!out.includes("[object Object]"), "must not stringify objects via toString");
  assert.match(out, /proposed_slices:\n {2}- id_suffix: -SLICE-1\n {4}title: Lib\n {4}points: 5/);
  // Round-trip identity.
  const reparsed = parseFrontmatter(out).frontmatter;
  assert.deepEqual(reparsed.proposed_slices, fm.proposed_slices);
});

test("serializeFrontmatter regression — string block arrays still round-trip", () => {
  const input =
    "---\nderived_features:\n  - FEAT-007\n  - FEAT-008\n  - FEAT-009\nstatus: decomposed\n---\nbody";
  const { frontmatter, body } = parseFrontmatter(input);
  const out = serializeFrontmatter(frontmatter, body);
  const reparsed = parseFrontmatter(out).frontmatter;
  assert.deepEqual(reparsed.derived_features, ["FEAT-007", "FEAT-008", "FEAT-009"]);
  assert.equal(reparsed.status, "decomposed");
});

// FU-6 — colon-bearing block-list items (surface:*/stack:* tag vocabulary,
// WS-3) were misread as a one-entry mapping instead of a plain string,
// because the array-item mapping check reused KEY_VALUE_RE's lenient `\s*`
// (zero-or-more) after the colon. Real YAML only treats a colon as a mapping
// indicator when followed by whitespace or end-of-line; `- surface:ui` has no
// space after the colon, so it must parse as the string "surface:ui", not
// {surface: "ui"}. This was found empirically: WS-3 propagates a FEAT's
// surface:*/stack:* tags onto its slice frontmatter, and dispatch.mts reads
// them back via extractTags -> pickBuilderVariant to decide whether the
// P0/P1 fullstack architect gate fires — a silent mis-parse here would drop
// the surface signal entirely and the gate would never fire.

test("parseFrontmatter reads an unquoted colon-bearing block-list item as a string, not a map", () => {
  const input = "---\ntags:\n  - surface:ui\n  - surface:api\n  - plain-tag\n---\nbody";
  const { frontmatter } = parseFrontmatter(input);
  assert.deepEqual(frontmatter.tags, ["surface:ui", "surface:api", "plain-tag"]);
});

test("parseFrontmatter reads an unquoted colon-bearing flow-list item as a string", () => {
  const input = "---\ntags: [surface:ui, surface:api, plain-tag]\n---\nbody";
  const { frontmatter } = parseFrontmatter(input);
  assert.deepEqual(frontmatter.tags, ["surface:ui", "surface:api", "plain-tag"]);
});

test("parseFrontmatter reads a quoted colon-bearing block-list item as a string", () => {
  const input = "---\ntags:\n  - \"surface:ui\"\n  - 'surface:api'\n---\nbody";
  const { frontmatter } = parseFrontmatter(input);
  assert.deepEqual(frontmatter.tags, ["surface:ui", "surface:api"]);
});

test("parseFrontmatter still parses a genuine nested-mapping block-list item as a map (mixed with plain items elsewhere)", () => {
  // proposed_slices-shaped mapping items (colon FOLLOWED BY a space) must
  // still become objects — only the no-space-after-colon case is a string.
  const input =
    "---\nproposed_slices:\n  - id_suffix: -SLICE-1\n    title: Has:colon inside\n    points: 5\ntags: [surface:ui]\n---\nbody";
  const { frontmatter } = parseFrontmatter(input);
  assert.deepEqual(frontmatter.proposed_slices, [
    { id_suffix: "-SLICE-1", title: "Has:colon inside", points: 5 }
  ]);
  assert.deepEqual(frontmatter.tags, ["surface:ui"]);
});

test("serializeFrontmatter -> parseFrontmatter round-trips surface:*/stack:* tags emitted by the slice-tag propagation path", () => {
  const fm = { tags: ["surface:ui", "surface:api", "stack:typescript"] };
  const out = serializeFrontmatter(fm, "body");
  const reparsed = parseFrontmatter(out).frontmatter;
  assert.deepEqual(reparsed.tags, ["surface:ui", "surface:api", "stack:typescript"]);
});

test("serializeFrontmatter leaves empty arrays inline (preserves prior shape)", () => {
  const fm = { tags: [] };
  const out = serializeFrontmatter(fm, "");
  assert.match(out, /tags: \[\]/);
});

// Newline-injection hardening — serializeScalar must not emit a raw line
// break inside a scalar, since the hand-rolled parser splits the frontmatter
// block on "\n" (parseFrontmatter's `block.split("\n")`) before it looks at
// individual lines. An un-escaped embedded newline would either desync the
// KEY_VALUE_RE walk or let injected text masquerade as an additional key.

test("serializeFrontmatter round-trips an embedded newline in a scalar", () => {
  const fm = { title: "line one\nline two" };
  const out = serializeFrontmatter(fm, "body");
  // Must stay on a single physical line inside the frontmatter block.
  const blockLines = out
    .split("---")[1]!
    .split("\n")
    .filter((l) => l.trim() !== "");
  assert.equal(blockLines.length, 1, `expected one line, got: ${JSON.stringify(blockLines)}`);
  const { frontmatter } = parseFrontmatter(out);
  assert.equal(frontmatter.title, "line one\nline two");
});

test("serializeFrontmatter round-trips embedded CRLF in a scalar", () => {
  const fm = { title: "line one\r\nline two" };
  const out = serializeFrontmatter(fm, "body");
  const { frontmatter } = parseFrontmatter(out);
  assert.equal(frontmatter.title, "line one\r\nline two");
});

test("serializeFrontmatter round-trips a leading newline in a scalar", () => {
  const fm = { title: "\nleading" };
  const out = serializeFrontmatter(fm, "body");
  const { frontmatter } = parseFrontmatter(out);
  assert.equal(frontmatter.title, "\nleading");
});

test("serializeFrontmatter round-trips a trailing newline in a scalar", () => {
  const fm = { title: "trailing\n" };
  const out = serializeFrontmatter(fm, "body");
  const { frontmatter } = parseFrontmatter(out);
  assert.equal(frontmatter.title, "trailing\n");
});

test("serializeFrontmatter round-trips a bare CR in a scalar", () => {
  const fm = { title: "line one\rline two" };
  const out = serializeFrontmatter(fm, "body");
  const { frontmatter } = parseFrontmatter(out);
  assert.equal(frontmatter.title, "line one\rline two");
});

test("mergeFrontmatter round-trips a newline injected via an update value", () => {
  // Guards against a caller writing attacker/LLM-controlled multi-line text
  // (e.g. a free-text note) straight into frontmatter and corrupting the
  // block for every key that follows it.
  const input = "---\nid: FEAT-001\nstatus: pending\n---\nbody";
  const out = mergeFrontmatter(input, { notes: "first line\nsecond line\nthird: not-a-key" });
  const { frontmatter } = parseFrontmatter(out);
  assert.equal(frontmatter.id, "FEAT-001");
  assert.equal(frontmatter.status, "pending");
  assert.equal(frontmatter.notes, "first line\nsecond line\nthird: not-a-key");
});
