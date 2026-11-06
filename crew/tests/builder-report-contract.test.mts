// tests/builder-report-contract.test.mts — FEAT-028 AC-1
//
// The four builder-tier agent prompts (fullstack-dev, backend-dev,
// frontend-dev, aiplugin-dev) ship a single marker-first report contract:
// the final message is exactly 4 lines, DONE:/BLOCKED:/HELP:/IN-PROGRESS:
// first, then FILES:/TESTS:/NEXT:. No PR comment, no draft-PR push, and no
// SendMessage call precede the dispatcher's review gate — that bypass is
// what audit #7 / Codex #22 / reviewer BLOCKER 1 flagged against the prior
// contract (push + `gh pr create` + `node ./scripts/report-to-pr.ts` +
// SendMessage, all mandated before reporting). DEC-046 records the full
// decision; crew/scripts/validate-agents.mts's `no-prereview-publish` rule
// enforces the "no gh pr create / git push outside a ## Ship section" half
// mechanically for these same four agents — this file is the companion
// coverage for the report-block shape and the SendMessage absence, which
// that rule does not check.
import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";

const AGENTS_ROOT = path.join(import.meta.dir, "..", "..", "agents");

const BUILDER_AGENTS = ["fullstack-dev", "backend-dev", "frontend-dev", "aiplugin-dev"];

// Matches the literal 4-line marker-first block: DONE:/BLOCKED:/HELP:/
// IN-PROGRESS: on its own line, immediately followed by FILES:, TESTS:,
// NEXT: lines (optional leading whitespace, as it appears inside a fenced
// code block in the prompt source).
const MARKER_BLOCK_RE =
  /^[ \t]*(?:DONE|BLOCKED|HELP|IN-PROGRESS):.*\r?\n[ \t]*FILES:.*\r?\n[ \t]*TESTS:.*\r?\n[ \t]*NEXT:.*$/m;

const FORBIDDEN_SUBSTRINGS = ["report-to-pr", "gh pr create", "SendMessage", "git push"];

for (const name of BUILDER_AGENTS) {
  test(`${name}: carries exactly one marker-first report block`, async () => {
    const text = await fs.readFile(path.join(AGENTS_ROOT, `${name}.md`), "utf8");
    const global = new RegExp(MARKER_BLOCK_RE.source, "gm");
    const matches = text.match(global) ?? [];
    expect(
      matches.length,
      `expected exactly 1 marker-first block in ${name}.md, found ${matches.length}`
    ).toBe(1);
  });

  test(`${name}: never publishes or messages before the review gate`, async () => {
    const text = await fs.readFile(path.join(AGENTS_ROOT, `${name}.md`), "utf8");
    for (const needle of FORBIDDEN_SUBSTRINGS) {
      expect(text.includes(needle), `${name}.md unexpectedly contains "${needle}"`).toBe(false);
    }
  });

  test(`${name}: stays at or under the 300-line owned-agent cap`, async () => {
    const text = await fs.readFile(path.join(AGENTS_ROOT, `${name}.md`), "utf8");
    const lineCount = text.split(/\r?\n/).length;
    expect(lineCount, `${name}.md has ${lineCount} lines`).toBeLessThanOrEqual(300);
  });
}
