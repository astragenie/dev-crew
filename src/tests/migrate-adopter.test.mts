// SLICE-26 (FEAT-006 P5 cutover) — migrate-adopter.mts + its lib modules.
// Fixture-based: every test builds an isolated temp "adopter repo" (never
// touches a real adopter on disk) covering marker-block replacement, token
// rewrite boundaries, config migration wiring, idempotence, and --dry-run.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  DEVCREW_MARKER_START,
  DEVCREW_MARKER_END,
  hasOnlyDevcrewMarker,
  renderDevcrewBlock,
  replaceMarkerBlocks
} from "../scripts/lib/migrate-adopter-markers.mjs";
import { rewriteDispatchTokens } from "../scripts/lib/migrate-adopter-tokens.mjs";
import { lineDiff } from "../scripts/lib/migrate-adopter-diff.mjs";
import { migrateAdopterRepo, enumerateAdopters } from "../scripts/migrate-adopter.mjs";
import { readDevcrewConfigIfPresent } from "../scripts/lib/devcrew-config.mjs";
import { resolveConfig } from "../scripts/lib/config-resolver.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude", "loop.json"),
    JSON.stringify({ productName: "fixture" })
  );
  return repo;
}

const RUNNER_BLOCK = [
  "<!-- runner:start -->",
  "<!-- Installed by /runner:install. -->",
  "",
  "## Autonomous Loop — HARD RULES (summary)",
  "",
  "Dispatch via `crew:fullstack-dev`, then `crew:reviewer`. Run `/runner:start` first.",
  "",
  "<!-- runner:end -->"
].join("\n");

const CREW_BLOCK = [
  "<!-- crew:start -->",
  "<!-- Crew framework memory. -->",
  "@.claude/crew/constitution.md",
  "<!-- crew:end -->"
].join("\n");

// Third legacy marker pair (pre-runner-plugin-rename "Wiggin Loop"
// installer). Deliberately carries a raw `/crew:build` dispatch token so
// tests can assert it does NOT survive (rewritten in place) once the span is
// recognized and collapsed — reviewer-caught gap, SLICE-26 review.
const LOOP_BLOCK = [
  "<!-- loop:start -->",
  "<!-- Installed by /loop:install. -->",
  "",
  "## Autonomous Loop — HARD RULES (summary)",
  "",
  "This repo runs the Wiggin Loop autonomously. Run `/crew:build` first.",
  "",
  "<!-- loop:end -->"
].join("\n");

// ---------------------------------------------------------------------------
// migrate-adopter-markers.mts
// ---------------------------------------------------------------------------

test("replaceMarkerBlocks: runner-only block is replaced with the devcrew block", () => {
  const content = `# CLAUDE.md\n\nProse before.\n\n${RUNNER_BLOCK}\n\nProse after.\n`;
  const result = replaceMarkerBlocks(
    content,
    `${DEVCREW_MARKER_START}\nbody\n${DEVCREW_MARKER_END}`
  );
  assert.ok(result.includes(DEVCREW_MARKER_START));
  assert.ok(!result.includes("<!-- runner:start -->"));
  assert.ok(result.includes("Prose before."));
  assert.ok(result.includes("Prose after."));
});

test("replaceMarkerBlocks: crew-only block is replaced with the devcrew block", () => {
  const content = `# CLAUDE.md\n\n${CREW_BLOCK}\n`;
  const result = replaceMarkerBlocks(
    content,
    `${DEVCREW_MARKER_START}\nbody\n${DEVCREW_MARKER_END}`
  );
  assert.ok(result.includes(DEVCREW_MARKER_START));
  assert.ok(!result.includes("<!-- crew:start -->"));
});

test("replaceMarkerBlocks: both crew and runner blocks collapse into one devcrew block", () => {
  const content = `# CLAUDE.md\n\n${CREW_BLOCK}\n\n${RUNNER_BLOCK}\n\nTail.\n`;
  const result = replaceMarkerBlocks(
    content,
    `${DEVCREW_MARKER_START}\nbody\n${DEVCREW_MARKER_END}`
  );
  const devcrewStarts = result.split(DEVCREW_MARKER_START).length - 1;
  assert.equal(devcrewStarts, 1);
  assert.ok(!result.includes("<!-- crew:start -->"));
  assert.ok(!result.includes("<!-- runner:start -->"));
  assert.ok(result.includes("Tail."));
});

// Reviewer-caught gap (SLICE-26 review, 2026-08-19): a third legacy marker
// pair (`loop:`, from the pre-runner-plugin-rename "Wiggin Loop" installer)
// was left unrecognized, surviving as a duplicate stale section with
// half-rewritten dispatch tokens in 7/16 real adopters. These three tests
// fail on the pre-fix code (loop: absent from LEGACY_MARKER_PAIRS).

test("replaceMarkerBlocks: loop-only block (no crew/runner) is replaced with the devcrew block", () => {
  const content = `# CLAUDE.md\n\nProse.\n\n${LOOP_BLOCK}\n\nTail.\n`;
  const result = replaceMarkerBlocks(
    content,
    `${DEVCREW_MARKER_START}\nbody\n${DEVCREW_MARKER_END}`
  );
  assert.ok(result.includes(DEVCREW_MARKER_START));
  assert.ok(!result.includes("<!-- loop:start -->"));
  assert.ok(!result.includes("<!-- loop:end -->"));
  assert.ok(result.includes("Tail."));
});

test("replaceMarkerBlocks: loop and crew blocks both present collapse into exactly one devcrew block", () => {
  const content = `# CLAUDE.md\n\n${CREW_BLOCK}\n\n${LOOP_BLOCK}\n\nTail.\n`;
  const result = replaceMarkerBlocks(
    content,
    `${DEVCREW_MARKER_START}\nbody\n${DEVCREW_MARKER_END}`
  );
  const devcrewStarts = result.split(DEVCREW_MARKER_START).length - 1;
  assert.equal(devcrewStarts, 1);
  assert.ok(!result.includes("<!-- crew:start -->"));
  assert.ok(!result.includes("<!-- loop:start -->"));
  assert.ok(result.includes("Tail."));
});

test("migrateAdopterRepo: a dispatch token embedded inside a loop: block does not survive half-rewritten (no /devcrew:build or /loop: residue)", async () => {
  const repo = await tmpRepo("mig-loop-token-");
  await writeClaudeMd(repo, `# CLAUDE.md\n\n${CREW_BLOCK}\n\n${LOOP_BLOCK}\n\n## Tail\n`);

  const result = await migrateAdopterRepo(repo, { dryRun: false });
  const claudeChange = result.changes.find((c) => c.file === "CLAUDE.md");
  assert.equal(claudeChange?.changed, true);

  const onDisk = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");
  // The whole loop: span (including its distinguishing sentence and raw
  // `/crew:build` token) is removed by replaceMarkerBlocks BEFORE
  // rewriteDispatchTokens ever runs — so neither the untouched original
  // sentence nor a naive whole-file rewrite of it should appear anywhere in
  // the output. (Checking the exact sentence, not the bare `/devcrew:build`
  // token in isolation — the real devcrew template legitimately mentions
  // `/devcrew:build` elsewhere as its own build-entry-point doc line.)
  assert.ok(!onDisk.includes("Run `/crew:build` first"));
  assert.ok(!onDisk.includes("Run `/devcrew:build` first"));
  assert.ok(!onDisk.includes("Wiggin Loop"));
  assert.ok(!onDisk.includes("<!-- loop:start -->"));
  assert.ok(!onDisk.includes("<!-- loop:end -->"));
  const devcrewStarts = onDisk.split(DEVCREW_MARKER_START).length - 1;
  assert.equal(devcrewStarts, 1);
});

test("replaceMarkerBlocks: already-devcrew content is a structural no-op when the rendered block is unchanged", () => {
  const block = `${DEVCREW_MARKER_START}\nbody\n${DEVCREW_MARKER_END}`;
  const content = `# CLAUDE.md\n\nProse.\n\n${block}\n`;
  const result = replaceMarkerBlocks(content, block);
  assert.equal(result, content);
});

test("replaceMarkerBlocks: repeated calls with trailing content after the block do not grow trailing blank lines (AC-2 regression)", () => {
  const block = `${DEVCREW_MARKER_START}\nbody\n${DEVCREW_MARKER_END}`;
  const content = `# CLAUDE.md\n\nProse.\n\n${block}\n\n## Project state\n\n@snapshot.md\n`;
  const once = replaceMarkerBlocks(content, block);
  const twice = replaceMarkerBlocks(once, block);
  const thrice = replaceMarkerBlocks(twice, block);
  assert.equal(once, twice);
  assert.equal(twice, thrice);
});

test("hasOnlyDevcrewMarker: true only when exactly one devcrew span and zero legacy spans exist", () => {
  assert.equal(hasOnlyDevcrewMarker(`${DEVCREW_MARKER_START}\nx\n${DEVCREW_MARKER_END}`), true);
  assert.equal(hasOnlyDevcrewMarker(RUNNER_BLOCK), false);
  assert.equal(
    hasOnlyDevcrewMarker(`${DEVCREW_MARKER_START}\nx\n${DEVCREW_MARKER_END}\n${CREW_BLOCK}`),
    false
  );
});

test("renderDevcrewBlock: renders via the installer template, wrapped in the devcrew marker, not runner:", async () => {
  const repo = await tmpRepo("mig-render-");
  const config = await resolveConfig(repo);
  const block = await renderDevcrewBlock(repo, config);
  assert.ok(block.startsWith(DEVCREW_MARKER_START));
  assert.ok(block.endsWith(DEVCREW_MARKER_END));
  assert.ok(!block.includes("<!-- runner:start -->"));
  assert.ok(!block.includes("<!-- runner:end -->"));
  assert.ok(block.includes("Autonomous Loop"));
});

test("renderDevcrewBlock: deterministic across repeated calls against unchanged config (AC-2 precondition)", async () => {
  const repo = await tmpRepo("mig-render-idem-");
  const config = await resolveConfig(repo);
  const first = await renderDevcrewBlock(repo, config);
  const second = await renderDevcrewBlock(repo, config);
  assert.equal(first, second);
});

// ---------------------------------------------------------------------------
// migrate-adopter-tokens.mts
// ---------------------------------------------------------------------------

test("rewriteDispatchTokens: slash-command tokens are rewritten to /devcrew:", () => {
  const { text } = rewriteDispatchTokens("Run `/runner:start` then `/crew:review`.", "CLAUDE.md");
  assert.ok(text.includes("/devcrew:start"));
  assert.ok(text.includes("/devcrew:review"));
  assert.ok(!text.includes("/runner:"));
  assert.ok(!text.includes("/crew:"));
});

test("rewriteDispatchTokens: backtick-wrapped agent-dispatch tokens are rewritten", () => {
  const { text } = rewriteDispatchTokens(
    "Dispatch `crew:fullstack-dev` then `runner:pm`.",
    "CLAUDE.md"
  );
  assert.ok(text.includes("`devcrew:fullstack-dev`"));
  assert.ok(text.includes("`devcrew:pm`"));
});

test("rewriteDispatchTokens: subagent_type: literal is rewritten", () => {
  const { text } = rewriteDispatchTokens('Agent(subagent_type: "crew:reviewer")', "CLAUDE.md");
  assert.ok(text.includes('subagent_type: "devcrew:reviewer"'));
});

test("rewriteDispatchTokens: prose, repo names, and URLs are left untouched", () => {
  const input =
    "See the runner-plugin repo (marketplace slug `loop`) and https://github.com/astragenie/dev-team for history.";
  const { text, ambiguous } = rewriteDispatchTokens(input, "CLAUDE.md");
  assert.equal(text, input);
  assert.equal(ambiguous.length, 0);
});

test("rewriteDispatchTokens: a bare unwrapped namespace token is left unrewritten and reported ambiguous", () => {
  const input = "Legacy note: runner:pm used to score every FEAT.";
  const { text, ambiguous } = rewriteDispatchTokens(input, "AGENTS.md");
  assert.ok(text.includes("runner:pm"));
  assert.equal(ambiguous.length, 1);
  assert.equal(ambiguous[0]?.file, "AGENTS.md");
  assert.equal(ambiguous[0]?.line, 1);
});

// ---------------------------------------------------------------------------
// migrate-adopter-diff.mts
// ---------------------------------------------------------------------------

test("lineDiff: identical text produces an empty diff", () => {
  assert.deepEqual(lineDiff("a\nb\nc", "a\nb\nc"), []);
});

test("lineDiff: reports additions and removals", () => {
  const diff = lineDiff("a\nb\nc", "a\nx\nc");
  assert.deepEqual(diff, ["-b", "+x"]);
});

// ---------------------------------------------------------------------------
// migrate-adopter.mts — migrateAdopterRepo integration
// ---------------------------------------------------------------------------

async function writeClaudeMd(repo: string, body: string) {
  await fs.writeFile(path.join(repo, "CLAUDE.md"), body);
}

test("migrateAdopterRepo: --dry-run writes nothing to disk", async () => {
  const repo = await tmpRepo("mig-dry-");
  const before = `# CLAUDE.md\n\n${RUNNER_BLOCK}\n`;
  await writeClaudeMd(repo, before);

  const result = await migrateAdopterRepo(repo, { dryRun: true });

  const claudeChange = result.changes.find((c) => c.file === "CLAUDE.md");
  assert.equal(claudeChange?.changed, true);
  assert.ok((claudeChange?.diff?.length ?? 0) > 0);

  // Nothing written: CLAUDE.md unchanged on disk, no devcrew.json created.
  const onDisk = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");
  assert.equal(onDisk, before);
  const devcrewExists = await fs
    .access(path.join(repo, ".claude", "devcrew.json"))
    .then(() => true)
    .catch(() => false);
  assert.equal(devcrewExists, false);
  assert.equal((result.config as { action: string }).action, "would-migrate");
});

test("migrateAdopterRepo: applies marker regen + config migration, then a second run is a no-op (AC-2)", async () => {
  const repo = await tmpRepo("mig-apply-");
  // Trailing content after the marker block (mirrors real adopter CLAUDE.md
  // files, which always have a "## Project state" section afterward) —
  // regression coverage for the trailing-blank-line-growth bug this test
  // previously missed by ending the fixture right at the marker block.
  await writeClaudeMd(
    repo,
    `# CLAUDE.md\n\n${CREW_BLOCK}\n\n${RUNNER_BLOCK}\n\n## Project state\n\n@snapshot.md\n`
  );

  const first = await migrateAdopterRepo(repo, { dryRun: false });
  const firstClaudeChange = first.changes.find((c) => c.file === "CLAUDE.md");
  assert.equal(firstClaudeChange?.changed, true);
  assert.equal((first.config as { written: boolean }).written, true);

  const afterFirst = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");
  assert.ok(afterFirst.includes(DEVCREW_MARKER_START));
  assert.ok(!afterFirst.includes("<!-- crew:start -->"));
  assert.ok(!afterFirst.includes("<!-- runner:start -->"));
  assert.equal(await readDevcrewConfigIfPresent(repo).then((c) => c !== null), true);

  // Second pass: zero file diffs.
  const second = await migrateAdopterRepo(repo, { dryRun: false });
  const secondClaudeChange = second.changes.find((c) => c.file === "CLAUDE.md");
  assert.equal(secondClaudeChange?.changed, false);
  assert.equal((second.config as { reason: string }).reason, "already-migrated");

  const afterSecond = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");
  assert.equal(afterSecond, afterFirst);
});

test("migrateAdopterRepo: already-devcrew repo is a no-op on first encounter too", async () => {
  const repo = await tmpRepo("mig-noop-");
  const config = await resolveConfig(repo);
  const block = await renderDevcrewBlock(repo, config);
  await writeClaudeMd(repo, `# CLAUDE.md\n\nProse.\n\n${block}\n`);

  const result = await migrateAdopterRepo(repo, { dryRun: false });
  const claudeChange = result.changes.find((c) => c.file === "CLAUDE.md");
  assert.equal(claudeChange?.changed, false);
});

test("migrateAdopterRepo: AGENTS.md dispatch tokens are rewritten alongside CLAUDE.md", async () => {
  const repo = await tmpRepo("mig-agents-");
  await writeClaudeMd(repo, `# CLAUDE.md\n\n${RUNNER_BLOCK}\n`);
  await fs.writeFile(path.join(repo, "AGENTS.md"), "Dispatch via `crew:fullstack-dev`.\n");

  const result = await migrateAdopterRepo(repo, { dryRun: false });
  const agentsChange = result.changes.find((c) => c.file === "AGENTS.md");
  assert.equal(agentsChange?.changed, true);

  const onDisk = await fs.readFile(path.join(repo, "AGENTS.md"), "utf8");
  assert.ok(onDisk.includes("`devcrew:fullstack-dev`"));
});

test("migrateAdopterRepo: a repo with no resolvable config skips CLAUDE.md (no guessed rendering)", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "mig-noconfig-"));
  await writeClaudeMd(repo, `# CLAUDE.md\n\n${CREW_BLOCK}\n`);

  const result = await migrateAdopterRepo(repo, { dryRun: true });
  assert.ok(result.claudeMdSkippedReason);
  const claudeChange = result.changes.find((c) => c.file === "CLAUDE.md");
  assert.equal(claudeChange, undefined);
});

// ---------------------------------------------------------------------------
// enumerateAdopters
// ---------------------------------------------------------------------------

test("enumerateAdopters: finds repos with a legacy marker block, skips excluded names and linked worktrees", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mig-enum-"));

  const adopter = path.join(root, "adopter-one");
  await fs.mkdir(adopter, { recursive: true });
  await fs.writeFile(path.join(adopter, "CLAUDE.md"), RUNNER_BLOCK);

  const excluded = path.join(root, "devcrew");
  await fs.mkdir(excluded, { recursive: true });
  await fs.writeFile(path.join(excluded, "CLAUDE.md"), RUNNER_BLOCK);

  const noMarker = path.join(root, "unrelated-repo");
  await fs.mkdir(noMarker, { recursive: true });
  await fs.writeFile(path.join(noMarker, "CLAUDE.md"), "# nothing here\n");

  const worktree = path.join(root, "adopter-one-wt-feature");
  await fs.mkdir(worktree, { recursive: true });
  await fs.writeFile(path.join(worktree, "CLAUDE.md"), RUNNER_BLOCK);
  await fs.writeFile(
    path.join(worktree, ".git"),
    "gitdir: /somewhere/.git/worktrees/adopter-one-wt-feature\n"
  );

  const found = await enumerateAdopters([root], ["devcrew"]);
  assert.deepEqual(found, [adopter]);
});

test("enumerateAdopters: finds a repo carrying only a loop: block (no crew:/runner:)", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mig-enum-loop-"));

  const loopOnly = path.join(root, "loop-only-adopter");
  await fs.mkdir(loopOnly, { recursive: true });
  await fs.writeFile(path.join(loopOnly, "CLAUDE.md"), LOOP_BLOCK);

  const found = await enumerateAdopters([root], []);
  assert.deepEqual(found, [loopOnly]);
});
