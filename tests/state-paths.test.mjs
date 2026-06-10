import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { resolveStateRoots, assertStatePath } from "../scripts/lib/state-paths.mjs";
const repo = path.resolve("/tmp/fake-repo");
test("resolveStateRoots returns roots from config overrides + defaults", () => {
    const roots = resolveStateRoots(repo, { loop: { backlogRoot: "docs/backlog" } });
    assert.ok(roots.some((r) => r === path.join(repo, "docs/backlog")));
    assert.ok(roots.some((r) => r === path.join(repo, ".claude/artifacts/loop")));
});
test("assertStatePath accepts a target inside a resolved root", () => {
    assert.doesNotThrow(() => assertStatePath(repo, undefined, path.join(repo, ".claude/artifacts/loop/backlog/pending/FEAT-001.md")));
});
test("assertStatePath throws loudly for a target outside all roots", () => {
    assert.throws(() => assertStatePath(repo, undefined, path.join(repo, "src", "FEAT-001.md")), /outside the resolved state roots/);
});
