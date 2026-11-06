// CI docs-only exemption + fail-closed gate (FEAT-023, SLICE-48).
//
// Covers src/scripts/ci/docs-only.sh and src/scripts/ci/gate.sh by spawning
// bash directly — these are shell scripts consumed by .github/workflows/ci.yml,
// not .mts modules, so there is nothing to import.

import path from "node:path";
import { spawnSync } from "node:child_process";
import { test, expect } from "bun:test";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const DOCS_ONLY_SH = path.join(REPO_ROOT, "src/scripts/ci/docs-only.sh");
const GATE_SH = path.join(REPO_ROOT, "src/scripts/ci/gate.sh");

function runDocsOnly(stdin: string) {
  const result = spawnSync("bash", [DOCS_ONLY_SH], {
    input: stdin,
    encoding: "utf8"
  });
  return result.stdout.trim();
}

function runGate(code: string, fastGateResult: string) {
  const result = spawnSync("bash", [GATE_SH, code, fastGateResult], {
    encoding: "utf8"
  });
  return result.status;
}

test("docs-only.sh: agents/reviewer.md is code", () => {
  expect(runDocsOnly("agents/reviewer.md")).toBe("code=true");
});

test("docs-only.sh: skills/workflow/x/SKILL.md is code", () => {
  expect(runDocsOnly("skills/workflow/x/SKILL.md")).toBe("code=true");
});

test("docs-only.sh: commands/build.md is code", () => {
  expect(runDocsOnly("commands/build.md")).toBe("code=true");
});

test("docs-only.sh: docs/a.md + README.md is docs-only", () => {
  expect(runDocsOnly("docs/a.md\nREADME.md\n")).toBe("code=false");
});

test("docs-only.sh: CHANGELOG.md alone is docs-only", () => {
  expect(runDocsOnly("CHANGELOG.md")).toBe("code=false");
});

test("docs-only.sh: empty stdin is code (fail-safe)", () => {
  expect(runDocsOnly("")).toBe("code=true");
});

test("docs-only.sh: backlog markdown is code, not docs (OBJ-16)", () => {
  expect(runDocsOnly(".claude/artifacts/loop/backlog/triaged/FEAT-001.md")).toBe("code=true");
});

test("docs-only.sh: mixed docs + code diff is code", () => {
  expect(runDocsOnly("docs/a.md\nsrc/scripts/ci/gate.sh\n")).toBe("code=true");
});

test('gate.sh: ("", success) exits 1', () => {
  expect(runGate("", "success")).toBe(1);
});

test('gate.sh: ("true", failure) exits 1', () => {
  expect(runGate("true", "failure")).toBe(1);
});

test('gate.sh: ("true", success) exits 0', () => {
  expect(runGate("true", "success")).toBe(0);
});

test('gate.sh: ("false", skipped) exits 0', () => {
  expect(runGate("false", "skipped")).toBe(0);
});
