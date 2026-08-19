// Tests for validate-repo-boundary.mts — CI root<->crew/ import direction
// guard (FEAT-013, SLICE-34). See docs/planning/feat-013-boundary-contract.md
// for the design writeup.
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkInventoryDrift,
  extractCrewPathInventory,
  validateRepoBoundary,
  writeInventory
} from "../scripts/validate-repo-boundary.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

async function mkTmp() {
  return await fs.mkdtemp(path.join(os.tmpdir(), "devcrew-validate-repo-boundary-"));
}

async function writeFileAt(root: string, rel: string, content: string) {
  const full = path.join(root, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf8");
}

test("the real repo scan is clean — zero boundary violations", async () => {
  const result = await validateRepoBoundary(REPO_ROOT);
  assert.equal(
    result.ok,
    true,
    `expected a clean scan, got: ${result.violations
      .map((v) => `${v.file}:${v.line} (${v.direction}) — imports "${v.importSpec}"`)
      .join("; ")}`
  );
});

test("an allowlisted root->crew import passes", async () => {
  const root = await mkTmp();
  await writeFileAt(
    root,
    "hooks/pre-push-gate.mts",
    `import { logHookError } from "../crew/hooks/hook-error.mjs";

export { logHookError };
`
  );

  const result = await validateRepoBoundary(root);
  assert.equal(result.ok, true, JSON.stringify(result.violations));
});

test("a non-allowlisted root->crew import fails", async () => {
  const root = await mkTmp();
  await writeFileAt(
    root,
    "src/scripts/lib/some-consumer.mts",
    `import { doThing } from "../../../crew/scripts/lib/something-unsanctioned.mjs";

export { doThing };
`
  );

  const result = await validateRepoBoundary(root);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0]?.file, "src/scripts/lib/some-consumer.mts");
  assert.equal(result.violations[0]?.direction, "root-to-crew");
  assert.equal(result.violations[0]?.resolvedImport, "crew/scripts/lib/something-unsanctioned.mjs");
});

// Stash/neuter-proof: pins the exact file/line/direction/resolvedImport of
// the one finding, not just `ok === false` — a neutered implementation that
// always reports failure with an empty/wrong violations array still fails
// this assertion set.
test("a crew->root import fails — the reverse direction has zero allowlist entries", async () => {
  const root = await mkTmp();
  await writeFileAt(
    root,
    "crew/hooks/rogue-escape.mts",
    `import { validateSnapshotFreshness } from "../../src/scripts/validate-snapshot-freshness.mjs";

export { validateSnapshotFreshness };
`
  );

  const result = await validateRepoBoundary(root);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  const [violation] = result.violations;
  assert.equal(violation?.file, "crew/hooks/rogue-escape.mts");
  assert.equal(violation?.line, 1);
  assert.equal(violation?.direction, "crew-to-root");
  assert.equal(violation?.resolvedImport, "src/scripts/validate-snapshot-freshness.mjs");
});

test("does not flag a crew-internal relative import that string-matches a root dir name", async () => {
  const root = await mkTmp();
  // crew/tests/../hooks/lib/x.mjs resolves to crew/hooks/lib/x.mjs — still
  // inside crew/ despite the "hooks/" substring, and must not be flagged.
  await writeFileAt(
    root,
    "crew/tests/some.test.mts",
    `import { runHook } from "../hooks/lib/x.mjs";

export { runHook };
`
  );

  const result = await validateRepoBoundary(root);
  assert.equal(result.ok, true, JSON.stringify(result.violations));
});

test("hooks.json crew-path inventory extraction matches the real fixture shape", async () => {
  const hooksJson = {
    hooks: {
      SubagentStop: [
        {
          hooks: [
            {
              type: "command",
              command: '"${CLAUDE_PLUGIN_ROOT}/crew/scripts/log_event.sh" subagent_stop'
            },
            {
              type: "command",
              command: 'bun "${CLAUDE_PLUGIN_ROOT}/crew/hooks/otel-subagent-stop.mts"'
            }
          ]
        }
      ],
      SessionEnd: [
        {
          hooks: [
            {
              type: "command",
              command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/capture-at-close.mjs"'
            }
          ]
        }
      ]
    }
  };

  const inventory = extractCrewPathInventory(hooksJson);
  assert.deepEqual(Object.keys(inventory), ["SubagentStop"]);
  assert.equal(inventory.SubagentStop?.length, 2);
  assert.equal(inventory.SubagentStop?.[0]?.path, "crew/scripts/log_event.sh");
  assert.equal(inventory.SubagentStop?.[1]?.path, "crew/hooks/otel-subagent-stop.mts");
});

test("inventory --check drift fails when the on-disk file is stale, and passes after --write-inventory", async () => {
  const root = await mkTmp();
  const hooksJson = {
    hooks: {
      Stop: [
        {
          hooks: [
            {
              type: "command",
              command: 'bun "${CLAUDE_PLUGIN_ROOT}/crew/hooks/otel-stop.mts"'
            }
          ]
        }
      ]
    }
  };
  await writeFileAt(root, ".claude-plugin/hooks/hooks.json", JSON.stringify(hooksJson, null, 2));

  const missing = await checkInventoryDrift(root);
  assert.equal(missing.ok, false);
  assert.match(missing.detail ?? "", /is missing/);

  await writeFileAt(root, "docs/planning/hooksjson-crew-path-inventory.json", '{ "Stop": [] }\n');
  const stale = await checkInventoryDrift(root);
  assert.equal(stale.ok, false);
  assert.match(stale.detail ?? "", /stale/);

  await writeInventory(root);
  const fresh = await checkInventoryDrift(root);
  assert.equal(fresh.ok, true);
});
