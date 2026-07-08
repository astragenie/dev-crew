// FEAT-239 — normalize the `--grade-yaml` input into the grade markdown shape
// that writeGrade (grade-writer.mts) actually reads.
//
// The `--grade-yaml` flag accepts two shapes in the field:
//   1. A full grade markdown file: frontmatter + a populated `## Scores` body
//      list (the historical shape close-slice.test.mts fixtures produce).
//   2. A pure YAML doc carrying only frontmatter — a `scores:` map plus
//      optional `lessons:` / `decisions:` / `surprises:` / `followups:` arrays
//      and NO markdown body (the shape the autonomous close path emits).
//
// writeGrade validates scores via `parseScoresFromBody` and extracts decisions
// via `parseDecisionsFromBody` — both read the MARKDOWN BODY, not frontmatter.
// So shape (2) failed close with "missing dimension: *" for every score and
// never extracted decisions, half-closing the slice (files moved, no grade).
//
// This normalizer leaves shape (1) byte-identical (a populated `## Scores`
// body is detected and returned verbatim) and renders shape (2) into the
// template body so both close identically.

import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.mjs";
import { SCORE_DIMENSIONS, parseScoresFromBody } from "./grade-parser.mjs";

// Frontmatter keys we lift into the rendered markdown body. They are not part
// of the grade frontmatter schema, so they must be dropped from the frontmatter
// after rendering to avoid stray round-tripped keys.
const BODY_ONLY_ARRAY_KEYS = ["lessons", "surprises", "followups"] as const;

function renderScoresList(scores: unknown): string[] {
  const map =
    scores && typeof scores === "object" && !Array.isArray(scores)
      ? (scores as Record<string, unknown>)
      : {};
  const out = ["## Scores", ""];
  for (const dim of SCORE_DIMENSIONS) {
    const v = map[dim];
    out.push(`- ${dim}: ${typeof v === "number" ? v : 0}`);
  }
  out.push("");
  return out;
}

function renderBullets(heading: string, items: unknown): string[] {
  const arr = Array.isArray(items)
    ? items.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  if (arr.length === 0) return [];
  return [`## ${heading}`, "", ...arr.map((s) => `- ${s}`), ""];
}

function renderConsequences(consequences: unknown): string[] {
  if (typeof consequences === "string" && consequences.trim()) {
    return ["**Consequences**:", `- ${consequences.trim()}`, ""];
  }
  const bullets = Array.isArray(consequences)
    ? consequences.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    : [];
  if (bullets.length === 0) return [];
  return ["**Consequences**:", ...bullets.map((c) => `- ${c}`), ""];
}

// Render one decision object (`{ title, rationale?, consequences? }`) as a
// `### DEC-TBD:` block in exactly the shape parseDecisionsFromBody +
// extractDecisions (grade-writer.mts) expect. Returns [] for non-object /
// title-less entries.
function renderDecisionBlock(d: unknown): string[] {
  if (!d || typeof d !== "object" || Array.isArray(d)) return [];
  const rec = d as Record<string, unknown>;
  const title = typeof rec.title === "string" ? rec.title.trim() : "";
  if (!title) return [];
  const block = [`### DEC-TBD: ${title}`, ""];
  if (typeof rec.rationale === "string" && rec.rationale.trim()) {
    block.push(`**Rationale**: ${rec.rationale.trim()}`, "");
  }
  block.push(...renderConsequences(rec.consequences));
  return block;
}

// Allocate a real DEC-NNN id for each inline decision at writeGrade time.
function renderDecisions(decisions: unknown): string[] {
  const arr = Array.isArray(decisions) ? decisions : [];
  const blocks = arr.flatMap(renderDecisionBlock);
  if (blocks.length === 0) return [];
  return ["## Decisions", "", ...blocks];
}

function renderGradeBody(frontmatter: Record<string, unknown>): string {
  const sliceId = typeof frontmatter.slice === "string" ? frontmatter.slice : "SLICE";
  const parts: string[] = [`# ${sliceId}: Grade`, ""];
  parts.push(...renderScoresList(frontmatter.scores));
  parts.push(...renderBullets("Lessons", frontmatter.lessons));
  parts.push(...renderDecisions(frontmatter.decisions));
  parts.push(...renderBullets("Surprises", frontmatter.surprises));
  parts.push(...renderBullets("Followups", frontmatter.followups));
  return parts.join("\n");
}

// Returns true when `decisions` is an array carrying at least one inline
// decision object (as opposed to an empty array or a list of already-allocated
// DEC ids).
function hasInlineDecisionObjects(decisions: unknown): boolean {
  return (
    Array.isArray(decisions) &&
    decisions.some((d) => d && typeof d === "object" && !Array.isArray(d))
  );
}

/**
 * Normalize a `--grade-yaml` file's content into grade markdown.
 *
 * - If the body already carries a populated `## Scores` list, the content is
 *   returned unchanged (backward-compatible with full grade-markdown inputs).
 * - Otherwise the frontmatter `scores` / `lessons` / `decisions` / `surprises`
 *   / `followups` fields are rendered into the template body so writeGrade's
 *   body-reading validators and extractors see them.
 */
export function normalizeGradeYaml(content: string): string {
  const { frontmatter, body } = parseFrontmatter(content);
  if (Object.keys(parseScoresFromBody(body)).length > 0) return content;

  const cleaned: Record<string, unknown> = { ...frontmatter };
  for (const key of BODY_ONLY_ARRAY_KEYS) delete cleaned[key];
  // Inline decision objects move into the body as DEC-TBD blocks; writeGrade
  // rewrites `decisions:` frontmatter with the allocated id list, so reset it
  // to an empty array here (a list of already-allocated ids is left as-is).
  if (hasInlineDecisionObjects(cleaned.decisions)) cleaned.decisions = [];

  return serializeFrontmatter(cleaned, renderGradeBody(frontmatter));
}
