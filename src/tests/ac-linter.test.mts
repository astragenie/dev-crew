import test from "node:test";
import assert from "node:assert/strict";

import { lintAcceptanceCriteria } from "../scripts/lib/ac-linter.mjs";

function makeContent(acs) {
  return [
    "# SLICE-01",
    "",
    "## Acceptance criteria",
    "",
    ...acs,
    "",
    "## Done When",
    "- all ACs pass"
  ].join("\n");
}

// --- Pass cases ---

test("lintAcceptanceCriteria passes concrete ACs", () => {
  const content = makeContent([
    "- [ ] AC-1: All tests pass (npm test) and linter is clean",
    "- [ ] AC-2: Login form submits and redirects to dashboard"
  ]);
  const result = lintAcceptanceCriteria(content);
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test("lintAcceptanceCriteria passes checked AC bullets", () => {
  const content = makeContent(["- [x] AC-1: Feature shipped and test green"]);
  const result = lintAcceptanceCriteria(content);
  assert.equal(result.ok, true);
});

// --- Fail cases ---

test("lintAcceptanceCriteria rejects AC-N: ... (dots)", () => {
  const content = makeContent(["- [ ] AC-1: ..."]);
  const result = lintAcceptanceCriteria(content);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  assert.match(result.violations[0], /AC-1/);
});

test("lintAcceptanceCriteria rejects AC-N: <describe...> (angle bracket)", () => {
  const content = makeContent([
    "- [ ] AC-2: <replace with a concrete, testable acceptance criterion>"
  ]);
  const result = lintAcceptanceCriteria(content);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
});

test("lintAcceptanceCriteria rejects AC-N: TBD", () => {
  const content = makeContent(["- [ ] AC-3: TBD"]);
  const result = lintAcceptanceCriteria(content);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
});

test("lintAcceptanceCriteria rejects AC-N: (empty)", () => {
  const content = makeContent(["- [ ] AC-4:"]);
  const result = lintAcceptanceCriteria(content);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
});

test("lintAcceptanceCriteria reports all violations at once", () => {
  const content = makeContent([
    "- [ ] AC-1: All tests pass",
    "- [ ] AC-2: ...",
    "- [ ] AC-3: <describe this>"
  ]);
  const result = lintAcceptanceCriteria(content);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 2);
});

test("lintAcceptanceCriteria errors when no AC section found", () => {
  const content = "# Slice\n\n## Objective\nDo something.\n";
  const result = lintAcceptanceCriteria(content);
  assert.equal(result.ok, false);
  assert.ok(result.error, "should have an error message");
  assert.match(result.error, /Acceptance criteria/);
});

test("lintAcceptanceCriteria errors when AC section is empty", () => {
  const content = makeContent([]);
  const result = lintAcceptanceCriteria(content);
  assert.equal(result.ok, false);
  assert.ok(result.error);
});

// --- Template test: AC-1 in generated template is concrete ---

test("default slice template AC-1 passes linter", async () => {
  // Reproduce the slice template exactly as written in slice-linker.mjs
  const templateContent = [
    "---",
    "id: SLICE-01",
    "status: pending",
    "---",
    "# SLICE-01: test",
    "",
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: All tests pass (npm test) and linter is clean (npm run lint)",
    "- [ ] AC-2: <replace with a concrete, testable acceptance criterion>",
    "",
    "## Done When",
    "- all ACs pass"
  ].join("\n");

  const result = lintAcceptanceCriteria(templateContent);
  // AC-1 is concrete; AC-2 is a placeholder → fails, which is expected
  // (agents must replace AC-2). But AC-1 itself must NOT appear in violations.
  const ac1Violation = result.violations.some((v) => /AC-1/.test(v));
  assert.equal(ac1Violation, false, "AC-1 in template must be concrete (not a placeholder)");
});
