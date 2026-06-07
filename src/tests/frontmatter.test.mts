import test from "node:test";
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
