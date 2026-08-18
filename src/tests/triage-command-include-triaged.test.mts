// FEAT-194 / SLICE-110 — /loop:triage --include-triaged flag documentation.

import fs from "node:fs/promises";
import path from "node:path";
import { test } from "bun:test";
import { strict as assert } from "node:assert";

import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

const TRIAGE_MD = path.resolve("commands/triage.md");

test("triage.md documents --include-triaged flag with overwrite semantics", async () => {
  const raw = await fs.readFile(TRIAGE_MD, "utf8");
  const { body } = parseFrontmatter(raw);
  assert.match(body, /--include-triaged/, "body must mention the --include-triaged flag");
  assert.match(
    body,
    /overwrite|in.place|no state move|STAY in/i,
    "body must explain triaged FEATs are re-scored in place (no state move)"
  );
});

test("triage.md still references pending/ as the default scope", async () => {
  const raw = await fs.readFile(TRIAGE_MD, "utf8");
  const { body } = parseFrontmatter(raw);
  assert.match(body, /pending\//, "body must keep documenting the default pending-only scope");
});
