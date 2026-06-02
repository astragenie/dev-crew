// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { getProvider, GithubProvider, LinearProvider, NoopProvider } from "../scripts/lib/task-store/index.mjs";
const REPO = "/tmp/test-repo";
// ---------------------------------------------------------------------------
// getProvider — default (no config)
// ---------------------------------------------------------------------------
test("getProvider returns NoopProvider when no config", () => {
    const p = getProvider({}, REPO);
    assert.ok(p instanceof NoopProvider);
});
test("getProvider returns NoopProvider when taskStore block absent and github.enabled falsy", () => {
    const p = getProvider({ github: { enabled: false } }, REPO);
    assert.ok(p instanceof NoopProvider);
});
// ---------------------------------------------------------------------------
// getProvider — explicit provider names
// ---------------------------------------------------------------------------
test("getProvider returns GithubProvider when taskStore.provider is 'github'", () => {
    const p = getProvider({ taskStore: { provider: "github" } }, REPO);
    assert.ok(p instanceof GithubProvider);
    assert.equal(p.repoPath, REPO);
});
test("getProvider returns LinearProvider when taskStore.provider is 'linear'", () => {
    const p = getProvider({ taskStore: { provider: "linear" } }, REPO);
    assert.ok(p instanceof LinearProvider);
    assert.equal(p.repoPath, REPO);
});
test("getProvider returns NoopProvider when taskStore.provider is 'noop'", () => {
    const p = getProvider({ taskStore: { provider: "noop" } }, REPO);
    assert.ok(p instanceof NoopProvider);
});
test("getProvider returns NoopProvider for unknown provider name", () => {
    const p = getProvider({ taskStore: { provider: "jira" } }, REPO);
    assert.ok(p instanceof NoopProvider);
});
// ---------------------------------------------------------------------------
// getProvider — back-compat: github.enabled === true
// ---------------------------------------------------------------------------
test("getProvider returns GithubProvider when no taskStore but github.enabled true", () => {
    const p = getProvider({ github: { enabled: true } }, REPO);
    assert.ok(p instanceof GithubProvider);
    assert.equal(p.repoPath, REPO);
});
test("getProvider taskStore.provider takes precedence over github.enabled back-compat", () => {
    const p = getProvider({ taskStore: { provider: "noop" }, github: { enabled: true } }, REPO);
    assert.ok(p instanceof NoopProvider);
});
// ---------------------------------------------------------------------------
// getProvider — taskStore.enabled false forces noop
// ---------------------------------------------------------------------------
test("getProvider returns NoopProvider when taskStore.enabled is false", () => {
    const p = getProvider({ taskStore: { enabled: false, provider: "github" } }, REPO);
    assert.ok(p instanceof NoopProvider);
});
// ---------------------------------------------------------------------------
// NoopProvider — all methods resolve silently
// ---------------------------------------------------------------------------
test("NoopProvider all methods resolve without throwing", async () => {
    const p = new NoopProvider();
    const results = await Promise.all([
        p.publishFeature({ id: "FEAT-001" }),
        p.publishSlice({ id: "SLICE-001" }, null),
        p.closeSlice(1, "done"),
        p.postSliceComment(1, "comment"),
        p.updateStatus(1, "in-progress"),
        p.syncPull(REPO),
        p.bootstrap(REPO),
    ]);
    assert.equal(results[0], null, "publishFeature should return null");
    assert.equal(results[1], null, "publishSlice should return null");
    assert.equal(results[2], undefined, "closeSlice should return undefined");
    assert.equal(results[3], undefined, "postSliceComment should return undefined");
    assert.equal(results[4], undefined, "updateStatus should return undefined");
    assert.deepEqual(results[5], { features: [], slices: [] }, "syncPull should return empty");
    assert.deepEqual(results[6], { features: [] }, "bootstrap should return empty");
});
// ---------------------------------------------------------------------------
// LinearProvider — all methods throw not-implemented
// ---------------------------------------------------------------------------
test("LinearProvider constructor stores repoPath and config", () => {
    const p = new LinearProvider(REPO, { token: "abc" });
    assert.equal(p.repoPath, REPO);
    assert.equal(p.config.token, "abc");
});
test("LinearProvider constructor defaults config to empty object", () => {
    const p = new LinearProvider(REPO);
    assert.deepEqual(p.config, {});
});
test("LinearProvider methods throw 'not implemented'", async () => {
    const p = new LinearProvider(REPO);
    const methods = [
        ["publishFeature", () => p.publishFeature({})],
        ["publishSlice", () => p.publishSlice({}, null)],
        ["closeSlice", () => p.closeSlice(1, "done")],
        ["postSliceComment", () => p.postSliceComment(1, "body")],
        ["updateStatus", () => p.updateStatus(1, "done")],
        ["syncPull", () => p.syncPull(REPO)],
        ["bootstrap", () => p.bootstrap(REPO)],
    ];
    for (const [name, call] of methods) {
        await assert.rejects(call, /not implemented/, `${name} should throw not implemented`);
    }
});
// ---------------------------------------------------------------------------
// getProvider — warn on unknown provider name
// ---------------------------------------------------------------------------
test("getProvider emits console.warn for unrecognised provider name", () => {
    const warns = [];
    const orig = console.warn;
    console.warn = (...args) => { warns.push(args.join(" ")); };
    try {
        const p = getProvider({ taskStore: { provider: "jira" } }, REPO);
        assert.ok(p instanceof NoopProvider);
        assert.equal(warns.length, 1);
        assert.ok(warns[0].includes("jira"), `warn should mention provider name, got: ${warns[0]}`);
        assert.ok(warns[0].includes("[task-store]"), `warn should have [task-store] prefix`);
    }
    finally {
        console.warn = orig;
    }
});
test("getProvider does NOT warn when provider is explicitly 'noop'", () => {
    const warns = [];
    const orig = console.warn;
    console.warn = (...args) => { warns.push(args.join(" ")); };
    try {
        getProvider({ taskStore: { provider: "noop" } }, REPO);
        assert.equal(warns.length, 0, "explicit noop should produce no warning");
    }
    finally {
        console.warn = orig;
    }
});
test("getProvider does NOT warn when no taskStore configured (default noop)", () => {
    const warns = [];
    const orig = console.warn;
    console.warn = (...args) => { warns.push(args.join(" ")); };
    try {
        getProvider({}, REPO);
        assert.equal(warns.length, 0, "unconfigured default should produce no warning");
    }
    finally {
        console.warn = orig;
    }
});
// ---------------------------------------------------------------------------
// Re-exports from index
// ---------------------------------------------------------------------------
test("index re-exports GithubProvider, LinearProvider, NoopProvider", () => {
    assert.equal(typeof GithubProvider, "function");
    assert.equal(typeof LinearProvider, "function");
    assert.equal(typeof NoopProvider, "function");
    assert.equal(typeof getProvider, "function");
});
