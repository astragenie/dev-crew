// FEAT-213 — injection defense for autonomous loop + PM tool-grant reconciliation.
//
// AC-3 canary (content-assertion form): loop's eval infrastructure for live
// agent dispatch does not yet have production data (per FEAT-210), so this
// test does not dispatch a live devcrew:pm agent against an engineered FEAT
// body. Instead it asserts the enforceable proxy: the injection-defense
// contract text exists on every in-scope agent, and PM's own boundary text
// explicitly instructs ignoring embedded imperatives and scoring on the
// frameworks regardless — the textual guarantee a live canary would exercise.

import fs from "node:fs/promises";
import path from "node:path";
import { test } from "bun:test";
import { strict as assert } from "node:assert";

import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

async function readAgent(
  relPath: string
): Promise<{ frontmatter: Record<string, any>; body: string }> {
  const raw = await fs.readFile(path.resolve(relPath), "utf8");
  return parseFrontmatter(raw);
}

const INJECTION_DEFENSE_AGENTS = [
  "agents/pm.md",
  "agents/architect.md",
  "agents/researcher.md",
  "agents/market-researcher.md"
];

// AC-2: each of pm/architect/researcher/market-researcher instructs treating
// untrusted content as data, never instructions.
for (const relPath of INJECTION_DEFENSE_AGENTS) {
  test(`${relPath} body contains an Injection defense section (FEAT-213 AC-2)`, async () => {
    const { body } = await readAgent(relPath);
    assert.match(
      body,
      /##\s*Injection defense/i,
      `${relPath} must contain an "Injection defense" heading`
    );
    assert.match(
      body,
      /(data|evidence to (weigh|evaluate)).{0,80}never.{0,20}instructions?/is,
      `${relPath} must instruct treating untrusted content as data, never instructions`
    );
    assert.match(
      body,
      /ignore/i,
      `${relPath} must instruct ignoring embedded imperatives found in scored/analyzed content`
    );
  });
}

// AC-3 canary proxy: PM's contract explicitly says an embedded imperative
// does not change the scoring outcome, and the attempt must be surfaced
// rather than silently obeyed.
test("agents/pm.md Injection defense section instructs scoring is unaffected by embedded imperatives (FEAT-213 AC-3 proxy)", async () => {
  const { body } = await readAgent("agents/pm.md");
  const section = body.match(/##\s*Injection defense[\s\S]*?(?=\n##\s|$)/i)?.[0] ?? "";
  assert.ok(section.length > 0, "agents/pm.md must contain an Injection defense section");
  assert.match(
    section,
    /(ignore prior scoring rules|set compositePriority to P0)/i,
    "section must cite a concrete embedded-imperative example matching FEAT-213's canary scenario"
  );
  assert.match(
    section,
    /score on the frameworks|score.{0,20}regardless/i,
    "section must state scoring proceeds on the frameworks regardless of embedded imperatives"
  );
  assert.match(
    section,
    /risks/i,
    "section must require the injection attempt to be surfaced (e.g. in risks[])"
  );
});

// AC-1: PM's tool grants are reconciled with its documented Boundaries — no
// unexplained gap between what's granted and what's documented.
// Denylist migration (see pm-agent-tool.test.mts): pm.md now carries no
// `tools:` allowlist at all — the Edit exclusion lives in `disallowedTools`
// instead of an absence from a positive grant list.
test("agents/pm.md frontmatter denies Edit via disallowedTools (FEAT-213 AC-1)", async () => {
  const { frontmatter } = await readAgent("agents/pm.md");
  const denied =
    typeof frontmatter.disallowedTools === "string"
      ? frontmatter.disallowedTools.split(",").map((s: string) => s.trim())
      : [];
  assert.ok(
    denied.includes("Edit"),
    `agents/pm.md disallowedTools must deny Edit (got ${JSON.stringify(frontmatter.disallowedTools)})`
  );
});

test("agents/pm.md Boundaries documents the narrow Write case matching its grant (FEAT-213 AC-1)", async () => {
  const { frontmatter, body } = await readAgent("agents/pm.md");
  const boundaries = body.match(/##\s*Boundaries[\s\S]*?(?=\n##\s|$)/i)?.[0] ?? "";
  assert.ok(boundaries.length > 0, "agents/pm.md must contain a Boundaries section");

  const denied =
    typeof frontmatter.disallowedTools === "string"
      ? frontmatter.disallowedTools.split(",").map((s: string) => s.trim())
      : [];
  if (!denied.includes("Write")) {
    assert.match(
      boundaries,
      /pm-reviews/,
      "Boundaries must name the pm-reviews artifact as the narrow case that justifies the Write grant"
    );
  } else {
    // If Write were also denied, Boundaries must not still claim a Write case.
    assert.doesNotMatch(boundaries, /Write is granted/i);
  }
});

// AC-4: provenance metadata on every vendored agents/3rdparty/*.md file.
const THIRDPARTY_DIR = path.resolve("agents/3rdparty");

test("every agents/3rdparty/*.md file has source, version, review_date frontmatter (FEAT-213 AC-4)", async () => {
  const files = (await fs.readdir(THIRDPARTY_DIR)).filter((f) => f.endsWith(".md"));
  assert.ok(files.length > 0, "expected vendored 3rdparty agent files to exist");

  for (const file of files) {
    const { frontmatter } = await readAgent(path.join("agents/3rdparty", file));
    for (const field of ["source", "version", "review_date"]) {
      assert.ok(
        typeof frontmatter[field] === "string" && frontmatter[field].length > 0,
        `agents/3rdparty/${file} frontmatter must declare a non-empty "${field}" field`
      );
    }
  }
});

// AC-4: upstream-request filed for dev-team's vendored tree + owned prompts.
test("upstream-request document exists for dev-team 3rdparty provenance + injection defense (FEAT-213 AC-4)", async () => {
  const { frontmatter, body } = await readAgent(
    "docs/upstream-requests/2026-07-02-hero-crew-3rdparty-provenance-and-injection-defense.md"
  );
  assert.equal(frontmatter.status, "open", "upstream-request must be filed with status: open");
  assert.equal(frontmatter.target_repo, "astragenie/dev-team");
  assert.match(body, /provenance/i);
  assert.match(body, /injection.defense/i);
});
