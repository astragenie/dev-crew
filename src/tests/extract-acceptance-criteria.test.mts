import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  extractAcceptanceCriteria,
  AcceptanceCriteriaRequiredError,
  assertAcceptanceCriteria
} from "../scripts/lib/slice-linker/feature-lifecycle.mjs";
import { findFeatureById } from "../scripts/lib/backlog-writer.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";

// --- Unit tests for extractAcceptanceCriteria ---

test("extractAcceptanceCriteria returns AC lines from a standard FEAT body", () => {
  const body = [
    "## Some section",
    "",
    "Some text.",
    "",
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: First criterion",
    "- [ ] AC-2: Second criterion",
    "",
    "## Notes",
    "",
    "trailing content"
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, ["- [ ] AC-1: First criterion", "- [ ] AC-2: Second criterion"]);
});

test("extractAcceptanceCriteria returns empty array when no AC section present", () => {
  const body = [
    "## Goal",
    "",
    "Some goal text.",
    "",
    "## Notes",
    "",
    "No acceptance criteria here."
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, []);
});

test("extractAcceptanceCriteria returns empty array when AC section is empty", () => {
  const body = ["## Acceptance criteria", "", "## Notes", "", "trailing"].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, []);
});

test("extractAcceptanceCriteria returns empty array when AC section has no checkbox lines (malformed)", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "Some prose without checkboxes.",
    "- bullet without checkbox",
    "",
    "## Notes"
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, []);
});

test("extractAcceptanceCriteria normalizes checked boxes to unchecked per AC-3", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: unchecked criterion",
    "- [x] AC-2: already checked criterion",
    ""
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  // AC-3 from SLICE-53: slice scaffold ACs start as work-to-do, even if the
  // parent FEAT had check marks. `[x]` normalized to `[ ]`.
  assert.deepEqual(result, [
    "- [ ] AC-1: unchecked criterion",
    "- [ ] AC-2: already checked criterion"
  ]);
});

test("extractAcceptanceCriteria handles body that is null or empty", () => {
  assert.deepEqual(extractAcceptanceCriteria(""), []);
  assert.deepEqual(extractAcceptanceCriteria(null as unknown as string), []);
  assert.deepEqual(extractAcceptanceCriteria(undefined as unknown as string), []);
});

test("extractAcceptanceCriteria stops at next section heading", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: First",
    "- [ ] AC-2: Second",
    "",
    "## Done When",
    "",
    "- [ ] AC-3: should NOT be included (belongs to Done When section)"
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, ["- [ ] AC-1: First", "- [ ] AC-2: Second"]);
});

test("extractAcceptanceCriteria is case-insensitive on heading name", () => {
  const body = ["## acceptance criteria", "", "- [ ] AC-1: lowercase heading"].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, ["- [ ] AC-1: lowercase heading"]);
});

test("extractAcceptanceCriteria accepts the FEAT-277 qualified heading '## Acceptance criteria (Given-When-Then)' (#370)", () => {
  const body = [
    "## Acceptance criteria (Given-When-Then)",
    "",
    "- GIVEN a slice closes, WHEN the ceremony completes, THEN a learnings entry is appended.",
    "- AC-2: Second criterion",
    "",
    "## Notes"
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, [
    "- [ ] GIVEN a slice closes, WHEN the ceremony completes, THEN a learnings entry is appended.",
    "- [ ] AC-2: Second criterion"
  ]);
});

test("extractAcceptanceCriteria still accepts the bare '## Acceptance criteria' heading (regression, #370)", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: First criterion",
    "- [ ] AC-2: Second criterion"
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, ["- [ ] AC-1: First criterion", "- [ ] AC-2: Second criterion"]);
});

test("extractAcceptanceCriteria does NOT match a heading with no space ('## Acceptancecriteria') (#370)", () => {
  const body = ["## Acceptancecriteria", "", "- [ ] AC-1: should not be collected"].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, []);
});

test("extractAcceptanceCriteria collects FEAT-277 Given-When-Then prose bullets (no checkbox)", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- GIVEN a slice closes, WHEN the ceremony completes, THEN a learnings entry is appended.",
    "- **GIVEN** a review-FAIL artifact, WHEN written, THEN a failure entry is captured.",
    ""
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, [
    "- [ ] GIVEN a slice closes, WHEN the ceremony completes, THEN a learnings entry is appended.",
    "- [ ] **GIVEN** a review-FAIL artifact, WHEN written, THEN a failure entry is captured."
  ]);
});

test("extractAcceptanceCriteria collects bullets grouped under per-slice ### SN subheadings", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "### S1 — Capture repair",
    "- GIVEN X, WHEN Y, THEN Z.",
    "",
    "### S2 — Interface",
    "- AC-1: provider constructs without error",
    "",
    "## Notes",
    "- GIVEN this belongs to Notes and must be excluded"
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, [
    "- [ ] GIVEN X, WHEN Y, THEN Z.",
    "- [ ] AC-1: provider constructs without error"
  ]);
});

test("extractAcceptanceCriteria accepts hyphenless/space-separated AC markers (#475)", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- AC1: hyphenless form",
    "- AC 1: space-separated form",
    "- AC-1: hyphenated form (existing)",
    ""
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, [
    "- [ ] AC1: hyphenless form",
    "- [ ] AC 1: space-separated form",
    "- [ ] AC-1: hyphenated form (existing)"
  ]);
});

test("extractAcceptanceCriteria accepts hyphenless AC markers with bold wrapping (#475)", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- **AC1 — Root cause, not a bandage.** Fix the underlying issue.",
    "- **AC 2 — Second criterion.** Some detail.",
    ""
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, [
    "- [ ] **AC1 — Root cause, not a bandage.** Fix the underlying issue.",
    "- [ ] **AC 2 — Second criterion.** Some detail."
  ]);
});

test("extractAcceptanceCriteria still rejects a plain non-AC bullet under the heading (#475 over-widen guard)", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- just a note, not an acceptance criterion",
    "- acquire more context before shipping",
    ""
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, []);
});

test("extractAcceptanceCriteria rejects prose bullets starting with 'AC<digits>' but no delimiter after the number (#475 review follow-up)", () => {
  // These start with the same "AC" + digits shape the widened marker
  // matches, but the digits run straight into prose with no `:`/`-`/`—`
  // delimiter — a real AC always has one, so these must stay rejected.
  // Without the delimiter check, the widened regex would wrongly promote
  // them to testable criteria.
  const body = [
    "## Acceptance criteria",
    "",
    "- AC2000 legacy format",
    "- AC130 gunship reference",
    "- AC42 is a system code, not a test",
    ""
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, []);
});

test("extractAcceptanceCriteria mixes checkbox + prose bullets in one section", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- [x] AC-1: already checked",
    "- GIVEN a nudge, WHEN sent, THEN no fork.",
    "- a plain non-AC bullet that must be ignored",
    ""
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, [
    "- [ ] AC-1: already checked",
    "- [ ] GIVEN a nudge, WHEN sent, THEN no fork."
  ]);
});

// --- Wrapped (multi-physical-line) AC bullets (runner-plugin#630) ---
//
// Ordinary markdown lets an AC bullet's text wrap across several physical
// lines. Before this fix, extraction captured only the first physical line,
// so every wrapped AC was silently truncated mid-clause (no `Then` clause
// reached a builder). These tests pin the fixed accumulation behavior;
// every pre-existing (non-wrapped) test above must keep passing unchanged.

test("extractAcceptanceCriteria accumulates a checkbox bullet's wrapped continuation lines", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: Given a FEAT whose AC text wraps across physical lines, When",
    "  the extractor runs, Then it accumulates every continuation line back",
    "  onto the bullet instead of stopping at the first line.",
    "- [ ] AC-2: Second criterion, unwrapped."
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, [
    "- [ ] AC-1: Given a FEAT whose AC text wraps across physical lines, When the extractor runs, Then it accumulates every continuation line back onto the bullet instead of stopping at the first line.",
    "- [ ] AC-2: Second criterion, unwrapped."
  ]);
});

test("extractAcceptanceCriteria accumulates a GIVEN-prose bullet's wrapped continuation lines", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- GIVEN a slice closes, WHEN the ceremony completes and every gate has",
    "  reported PASS, THEN a learnings entry is appended with the grade and",
    "  the lessons captured during the run.",
    ""
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, [
    "- [ ] GIVEN a slice closes, WHEN the ceremony completes and every gate has reported PASS, THEN a learnings entry is appended with the grade and the lessons captured during the run."
  ]);
});

test("extractAcceptanceCriteria stops continuation at the next bullet, not just the heading", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- AC-1: First bullet wraps onto a",
    "  second physical line here.",
    "- AC-2: Second bullet also wraps onto a",
    "  second physical line here.",
    ""
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, [
    "- [ ] AC-1: First bullet wraps onto a second physical line here.",
    "- [ ] AC-2: Second bullet also wraps onto a second physical line here."
  ]);
});

test("extractAcceptanceCriteria stops continuation at a blank line followed by non-indented prose", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- AC-1: A wrapped bullet whose continuation",
    "  ends properly here.",
    "",
    "Some unrelated paragraph that must NOT be folded into AC-1.",
    "",
    "## Notes"
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.deepEqual(result, ["- [ ] AC-1: A wrapped bullet whose continuation ends properly here."]);
});

// AC-2 (SLICE-206): fixture with deliberately wrapped ACs — the extracted
// text must match the source verbatim (modulo the newline -> single-space
// join markdown itself performs when rendering a wrapped bullet), not merely
// "look longer" than the truncated form.
test("extractAcceptanceCriteria: wrapped AC fixture matches source text byte for byte, not truncated mid-clause (SLICE-206 AC-2)", () => {
  const sourceAc1 =
    "AC-1: GIVEN a slice tagged `stack:csharp` + `concern:security`, WHEN the " +
    "dispatcher resolves skills, THEN it returns only skill IDs that EXIST in the " +
    "live crew catalog (no `csharp-pro`/`vue-engineering`-style dead IDs), matched " +
    "to the task signals.";
  const body = [
    "## Acceptance criteria",
    "",
    "- AC-1: GIVEN a slice tagged `stack:csharp` + `concern:security`, WHEN the",
    "  dispatcher resolves skills, THEN it returns only skill IDs that EXIST in the",
    "  live crew catalog (no `csharp-pro`/`vue-engineering`-style dead IDs), matched",
    "  to the task signals.",
    ""
  ].join("\n");
  const result = extractAcceptanceCriteria(body);
  assert.equal(result.length, 1);
  assert.equal(result[0], `- [ ] ${sourceAc1}`);
  // Not truncated mid-clause: the reconstructed text must reach its own
  // "Then" clause and its trailing full stop, not stop at "WHEN the".
  assert.match(result[0], /THEN it returns only skill IDs/);
  assert.match(result[0], /to the task signals\.$/);
});

// AC-3 (SLICE-206): assertAcceptanceCriteria's presence gate must see the
// FULL bullet text, not a first-line fragment — a FEAT whose ACs all wrap
// must not be able to pass the presence check while every stored criterion
// ends mid-clause.
test("assertAcceptanceCriteria: a FEAT whose ACs all wrap does not pass with truncated fragments (SLICE-206 AC-3)", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- AC-1: GIVEN a wrapped criterion, WHEN the extractor runs, THEN it must",
    "  reach this full Then-clause rather than stopping at the word 'the'.",
    "- AC-2: GIVEN a second wrapped criterion, WHEN it is extracted, THEN it",
    "  must also reach its own complete Then-clause and trailing punctuation."
  ].join("\n");
  // Presence check passes (real ACs exist) ...
  assert.doesNotThrow(() => assertAcceptanceCriteria("FEAT-630", body));
  // ... and critically, what's stored is the complete criterion, not a
  // fragment ending mid-clause on the wrap point ("WHEN the", "THEN it").
  const extracted = extractAcceptanceCriteria(body);
  assert.equal(extracted.length, 2);
  for (const ac of extracted) {
    assert.doesNotMatch(ac, /\b(WHEN|THEN)\s+(the|it)$/);
  }
  assert.match(
    extracted[0],
    /reach this full Then-clause rather than stopping at the word 'the'\.$/
  );
  assert.match(
    extracted[1],
    /must also reach its own complete Then-clause and trailing punctuation\.$/
  );
});

// --- AcceptanceCriteriaRequiredError message differentiation (#475) ---

test("assertAcceptanceCriteria: heading absent produces the original typo'd-heading guidance", () => {
  const body = ["## Goal", "", "No AC heading here at all."].join("\n");
  assert.throws(
    () => assertAcceptanceCriteria("FEAT-475", body),
    (err: unknown) => {
      assert.ok(err instanceof AcceptanceCriteriaRequiredError);
      assert.equal(err.headingFound, false);
      assert.match(err.message, /check for a typo'd.*heading first/);
      return true;
    }
  );
});

test("assertAcceptanceCriteria: heading present but zero bullets classify produces the new distinct error (#475)", () => {
  const body = ["## Acceptance criteria", "", "- **AC1 — Root cause, not a bandage.**", ""]
    .join("\n")
    // Deliberately break the AC marker so nothing classifies, to isolate the
    // "heading found, no valid bullets" path from the widened-parser path
    // exercised elsewhere in this file.
    .replace("AC1", "not a criterion");
  assert.throws(
    () => assertAcceptanceCriteria("FEAT-475", body),
    (err: unknown) => {
      assert.ok(err instanceof AcceptanceCriteriaRequiredError);
      assert.equal(err.headingFound, true);
      assert.doesNotMatch(err.message, /check for a typo'd.*heading first/);
      assert.match(err.message, /none of the bullets under it were recognized/);
      assert.match(err.message, /AC-1: \.\.\.`, `- AC1: \.\.\.`, `- AC 1: \.\.\./);
      return true;
    }
  );
});

// --- Integration tests: sliceFromFeature scaffold population ---

async function tmpRepo(prefix: string) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

test("sliceFromFeature injects FEAT ACs verbatim into slice scaffold when FEAT has AC section", async () => {
  const repo = await tmpRepo("eff-with-ac-");
  const feat = await addFeature(repo, {
    title: "FEAT with ACs",
    priority: "P2"
  });
  // Append an AC section to the feature file using the returned filePath
  const existing = await fs.readFile(feat.filePath, "utf8");
  await fs.writeFile(
    feat.filePath,
    existing + "\n## Acceptance criteria\n\n- [ ] AC-1: Login works\n- [ ] AC-2: Logout works\n"
  );

  const result = await sliceFromFeature(repo, feat.id, { noClassify: true });
  const sliceContent = await fs.readFile(result.slice.path, "utf8");

  assert.match(sliceContent, /- \[ \] AC-1: Login works/);
  assert.match(sliceContent, /- \[ \] AC-2: Logout works/);
  // Placeholder should NOT appear
  assert.doesNotMatch(sliceContent, /<replace with/);
});

test("sliceFromFeature throws AcceptanceCriteriaRequiredError when FEAT has no AC section", async () => {
  const repo = await tmpRepo("eff-no-ac-");
  const feat = await addFeature(repo, {
    title: "FEAT without ACs",
    priority: "P2"
  });

  // Placeholder AC auto-generation was removed — an AC-less FEAT is a hard
  // error, not a template-filled stub.
  await assert.rejects(
    () => sliceFromFeature(repo, feat.id, { noClassify: true }),
    (err: unknown) => err instanceof AcceptanceCriteriaRequiredError && err.featureId === feat.id
  );

  // Refuse is checked before the in-progress move — backlog state untouched.
  const still = await findFeatureById(repo, feat.id);
  assert.equal(still?.state, "pending");
});

test("sliceFromFeature throws when FEAT AC section is malformed (no checkbox lines)", async () => {
  const repo = await tmpRepo("eff-malformed-ac-");
  const feat = await addFeature(repo, {
    title: "FEAT with malformed ACs",
    priority: "P2"
  });
  const existing = await fs.readFile(feat.filePath, "utf8");
  await fs.writeFile(
    feat.filePath,
    existing + "\n## Acceptance criteria\n\nSome prose, no checkboxes.\n- plain bullet\n"
  );

  // A heading with no checkbox lines extracts to zero ACs → hard error, no
  // placeholder degrade.
  await assert.rejects(
    () => sliceFromFeature(repo, feat.id, { noClassify: true }),
    AcceptanceCriteriaRequiredError
  );
});

test("sliceFromFeature preserves all FEAT ACs verbatim (checkbox state preserved — all unchecked)", async () => {
  const repo = await tmpRepo("eff-checkbox-");
  const feat = await addFeature(repo, {
    title: "FEAT checkbox test",
    priority: "P2"
  });
  const existing = await fs.readFile(feat.filePath, "utf8");
  await fs.writeFile(
    feat.filePath,
    existing +
      "\n## Acceptance criteria\n\n- [ ] AC-1: First unchecked\n- [ ] AC-2: Second unchecked\n- [ ] AC-3: Third unchecked\n"
  );

  const result = await sliceFromFeature(repo, feat.id, { noClassify: true });
  const sliceContent = await fs.readFile(result.slice.path, "utf8");

  assert.match(sliceContent, /- \[ \] AC-1: First unchecked/);
  assert.match(sliceContent, /- \[ \] AC-2: Second unchecked/);
  assert.match(sliceContent, /- \[ \] AC-3: Third unchecked/);
  // No placeholder
  assert.doesNotMatch(sliceContent, /<replace with/);
});

// Regression: CRLF bodies. Found by the SLICE-206 review. `body.split("\n")`
// left a trailing \r on every physical line. The prose-bullet branch of
// classifyAcceptanceCriteriaLine absorbs it (its regex ends `\s*$`), but the
// CHECKBOX branch is a bare `.replace()` with no trim — so `- [ ] AC-1: ...`
// kept a dangling \r, and a wrapped one embedded a literal \r mid-sentence
// where the continuation was joined. Checkbox is the form every generated
// slice uses. This repo runs on Windows, and extraction runs against
// freshly-authored bodies before .gitattributes (eol=lf) normalizes them.
test("extractAcceptanceCriteria: wrapped checkbox AC over CRLF has no embedded CR", () => {
  const body = [
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: Given a wrapped criterion, When it spans",
    "  more than one physical line, Then it joins.",
    ""
  ].join("\r\n");

  const [first] = extractAcceptanceCriteria(body);

  assert.ok(first, "expected one criterion");
  assert.doesNotMatch(first, /\r/);
  assert.match(first, /spans more than one physical line/);
});

test("extractAcceptanceCriteria: unwrapped checkbox AC over CRLF has no trailing CR", () => {
  const body = ["## Acceptance criteria", "", "- [ ] AC-1: Given X, When Y, Then Z.", ""].join(
    "\r\n"
  );

  const [first] = extractAcceptanceCriteria(body);

  assert.ok(first, "expected one criterion");
  assert.doesNotMatch(first, /\r/);
});

test("extractAcceptanceCriteria: CRLF and LF checkbox bodies extract identically", () => {
  const parts = [
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: Given a criterion, When it wraps",
    "  across lines, Then both encodings agree.",
    "- [ ] AC-2: Given a second criterion, When read, Then it is separate.",
    ""
  ];

  assert.deepEqual(
    extractAcceptanceCriteria(parts.join("\r\n")),
    extractAcceptanceCriteria(parts.join("\n"))
  );
});
