// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tmpRepo } from "./dispatch-test-helpers.mjs";
import { readDispatchConfig } from "../scripts/lib/dispatch-config.mjs";

test("readDispatchConfig: missing file returns defaults", () => {
  const dir = tmpRepo();
  const cfg = readDispatchConfig(path.join(dir, "loop.json"));
  assert.equal(cfg.maxDepth, 3);
  assert.equal(cfg.maxChildrenPerBatch, 8);
  assert.equal(cfg.worktreeRoot, null);
  assert.equal(cfg.pruneStaleAfterDays, 7);
});

test("readDispatchConfig: explicit override honored", () => {
  const dir = tmpRepo();
  const cfgPath = path.join(dir, "loop.json");
  fs.writeFileSync(
    cfgPath,
    JSON.stringify({
      dispatchLimits: { maxDepth: 5, maxChildrenPerBatch: 12 }
    })
  );
  const cfg = readDispatchConfig(cfgPath);
  assert.equal(cfg.maxDepth, 5);
  assert.equal(cfg.maxChildrenPerBatch, 12);
  assert.equal(cfg.pruneStaleAfterDays, 7);
});

test("readDispatchConfig: malformed JSON throws DispatchConfigError", () => {
  const dir = tmpRepo();
  const cfgPath = path.join(dir, "loop.json");
  fs.writeFileSync(cfgPath, "{ not json");
  assert.throws(
    () => readDispatchConfig(cfgPath),
    (e) => e.name === "DispatchConfigError"
  );
});
