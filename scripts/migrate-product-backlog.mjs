#!/usr/bin/env node

// One-off migration: parse a legacy docs/ai-loop/backlog/product-backlog.md
// (markdown checklist grouped by priority sections + sub-categories) into the
// new docs/backlog/pending/FEAT-NNN.md per-feature schema.
//
// Heuristics:
// - Section like "## P0 ..." sets priority for entries under it (P0..P3).
// - Sub-heading "### <Name>" becomes a category hint mapped to one of
//   feature|bugfix|ops|tech-debt.
// - Lines matching "- [ ] **Title** — description" become FEAT entries.
// - Completed entries "- [x]" go straight to docs/backlog/done/.
// - SLICE references in the description (e.g. "(SLICE-10)") get captured in
//   the `slices` frontmatter array.
//
// Usage:
//   node scripts/migrate-product-backlog.mjs --repo <path> [--dry-run]

import fs from "node:fs/promises";
import path from "node:path";

import { serializeFrontmatter } from "./lib/frontmatter.mjs";

function parseArgs(argv) {
  const flags = { repo: process.cwd(), dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--repo") {
      flags.repo = argv[i + 1];
      i += 1;
      continue;
    }
    if (argv[i] === "--dry-run") {
      flags.dryRun = true;
      continue;
    }
  }
  return flags;
}

const CATEGORY_HINTS = [
  { test: /observabil|metric|tracing|health|telemetry/i, cat: "ops" },
  { test: /infrastructure|deploy|terraform|aca|background|distributed/i, cat: "ops" },
  { test: /retry|reliabil|circuit|degrad|cancel/i, cat: "ops" },
  { test: /audit|security|pii|tenant suspension|compliance|api key/i, cat: "feature" },
  { test: /refactor|cleanup|debt/i, cat: "tech-debt" },
  { test: /bug|broken|fix/i, cat: "bugfix" }
];

function inferCategory(text) {
  for (const { test, cat } of CATEGORY_HINTS) {
    if (test.test(text)) return cat;
  }
  return "feature";
}

function extractSlices(line) {
  const matches = line.match(/SLICE-\d+/gi) || [];
  return matches.map((s) => s.toUpperCase());
}

function parseBacklog(content) {
  const lines = content.split("\n");
  const entries = [];
  let currentPriority = "P2";
  let currentCategoryHint = null;
  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    const p = line.match(/^##\s+(P[0-3])\b/);
    if (p) {
      currentPriority = p[1];
      currentCategoryHint = null;
      continue;
    }
    const sub = line.match(/^###\s+(.+)$/);
    if (sub) {
      currentCategoryHint = sub[1];
      continue;
    }
    const todo = line.match(/^-\s+\[( |x|X)\]\s+\*\*(.+?)\*\*\s*(?:—|--|—|:)?\s*(.*)$/);
    if (todo) {
      const done = todo[1].toLowerCase() === "x";
      const title = todo[2].trim();
      const desc = todo[3].trim();
      const inferText = `${title} ${desc} ${currentCategoryHint || ""}`;
      entries.push({
        title,
        description: desc || "(no description in source)",
        priority: currentPriority,
        category: inferCategory(inferText),
        section: currentCategoryHint || null,
        slices: extractSlices(line),
        done
      });
      continue;
    }
  }
  return entries;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function buildFeatureFile(id, entry) {
  const frontmatter = {
    id,
    status: entry.done ? "done" : "pending",
    priority: entry.priority,
    category: entry.category,
    target_release: null,
    created: today(),
    updated: today(),
    depends_on: [],
    slices: entry.slices,
    derived_from: null,
    source_section: entry.section
  };
  const body = [
    `# ${id}: ${entry.title}`,
    "",
    "## Description",
    "",
    entry.description,
    "",
    "## Acceptance hints",
    "",
    "- (populate during triage / decomposition)",
    "",
    "## Notes",
    "",
    `Migrated from legacy docs/ai-loop/backlog/product-backlog.md (${today()}).`,
    entry.section ? `Source section: **${entry.section}**.` : "",
    entry.slices.length > 0 ? `Linked slices: ${entry.slices.join(", ")}.` : "",
    ""
  ]
    .filter(Boolean)
    .join("\n");
  return serializeFrontmatter(frontmatter, body);
}

async function main() {
  const { repo, dryRun } = parseArgs(process.argv.slice(2));
  const sourcePath = path.join(repo, "docs/ai-loop/backlog/product-backlog.md");
  const content = await fs.readFile(sourcePath, "utf8");
  const entries = parseBacklog(content);
  const pendingDir = path.join(repo, "docs/backlog/pending");
  const doneDir = path.join(repo, "docs/backlog/done");
  if (!dryRun) {
    await fs.mkdir(pendingDir, { recursive: true });
    await fs.mkdir(doneDir, { recursive: true });
  }
  const created = [];
  let nextId = 1;
  for (const entry of entries) {
    const id = `FEAT-${String(nextId).padStart(3, "0")}`;
    nextId += 1;
    const targetDir = entry.done ? doneDir : pendingDir;
    const targetPath = path.join(targetDir, `${id}.md`);
    const contents = buildFeatureFile(id, entry);
    if (!dryRun) {
      await fs.writeFile(targetPath, contents);
    }
    created.push({
      id,
      title: entry.title,
      priority: entry.priority,
      category: entry.category,
      status: entry.done ? "done" : "pending",
      path: targetPath
    });
  }
  console.log(
    JSON.stringify(
      {
        repo,
        source: sourcePath,
        entriesParsed: entries.length,
        pending: created.filter((c) => c.status === "pending").length,
        done: created.filter((c) => c.status === "done").length,
        dryRun,
        created
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
