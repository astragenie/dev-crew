// FEAT-239 — normalizeGradeYaml renders a frontmatter-only grade yaml into the
// grade markdown body writeGrade reads, and passes full grade markdown through
// unchanged.

import { test } from "bun:test";
import assert from "node:assert/strict";

import { normalizeGradeYaml } from "../scripts/lib/grade-yaml-normalizer.mjs";
import { parseScoresFromBody, parseDecisionsFromBody } from "../scripts/lib/grade-parser.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

const PURE_YAML = [
  "---",
  "id: GRADE-SLICE-1",
  "slice: SLICE-1",
  "feature: FEAT-239",
  "scores:",
  "  architecture_quality: 0.9",
  "  reliability: 0.88",
  "  observability: 0.82",
  "  production_readiness: 0.86",
  "  security: 0.9",
  "  test_confidence: 0.91",
  "  product_completeness: 0.84",
  "lessons:",
  "  - First lesson.",
  "  - Second lesson.",
  "decisions:",
  "  - title: A decision",
  "    rationale: Because.",
  "    consequences: A consequence.",
  "surprises:",
  "  - A surprise.",
  "followups:",
  "  - A followup.",
  "---",
  ""
].join("\n");

test("normalizeGradeYaml renders frontmatter scores into a `## Scores` body list", () => {
  const { body } = parseFrontmatter(normalizeGradeYaml(PURE_YAML));
  const scores = parseScoresFromBody(body);
  assert.equal(scores.architecture_quality, 0.9);
  assert.equal(scores.product_completeness, 0.84);
  assert.equal(Object.keys(scores).length, 7);
});

test("normalizeGradeYaml renders inline decisions as DEC-TBD blocks", () => {
  const { body } = parseFrontmatter(normalizeGradeYaml(PURE_YAML));
  const decisions = parseDecisionsFromBody(body);
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0]!.id, "DEC-TBD");
  assert.equal(decisions[0]!.title, "A decision");
  assert.equal(decisions[0]!.rationale, "Because.");
});

test("normalizeGradeYaml renders lessons / surprises / followups bullets", () => {
  const rendered = normalizeGradeYaml(PURE_YAML);
  assert.match(rendered, /## Lessons\n\n- First lesson\.\n- Second lesson\./);
  assert.match(rendered, /## Surprises\n\n- A surprise\./);
  assert.match(rendered, /## Followups\n\n- A followup\./);
});

test("normalizeGradeYaml drops body-only keys from frontmatter", () => {
  const { frontmatter } = parseFrontmatter(normalizeGradeYaml(PURE_YAML));
  assert.equal(frontmatter.lessons, undefined);
  assert.equal(frontmatter.surprises, undefined);
  assert.equal(frontmatter.followups, undefined);
  // Inline decision objects are reset (writeGrade rewrites this with DEC ids).
  assert.deepEqual(frontmatter.decisions, []);
  // Scores stay in frontmatter — other readers consume the map form.
  assert.equal(frontmatter.scores.security, 0.9);
});

test("normalizeGradeYaml passes full grade markdown through unchanged", () => {
  const fullMarkdown = [
    "---",
    "id: GRADE-SLICE-2",
    "slice: SLICE-2",
    "feature: FEAT-239",
    "scores:",
    "  architecture_quality: 0.8",
    "---",
    "# SLICE-2: Grade",
    "",
    "## Scores",
    "",
    "- architecture_quality: 0.8",
    ""
  ].join("\n");
  assert.equal(normalizeGradeYaml(fullMarkdown), fullMarkdown);
});
