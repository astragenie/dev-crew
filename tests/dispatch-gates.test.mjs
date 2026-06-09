// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDepth, checkFanout, checkUniqueIds, validateBranchName } from "../scripts/lib/dispatch-gates.mjs";
test("checkDepth: at cap throws DispatchDepthExceeded", () => {
    assert.throws(() => checkDepth(3, { maxDepth: 3 }), (e) => e.name === "DispatchDepthExceeded");
});
test("checkDepth: below cap does not throw", () => {
    assert.doesNotThrow(() => checkDepth(2, { maxDepth: 3 }));
});
test("checkDepth: env var fallback when arg undefined", () => {
    process.env.LOOP_DISPATCH_DEPTH = "3";
    try {
        assert.throws(() => checkDepth(undefined, { maxDepth: 3 }), (e) => e.name === "DispatchDepthExceeded");
    }
    finally {
        delete process.env.LOOP_DISPATCH_DEPTH;
    }
});
test("checkFanout: at cap throws DispatchFanoutExceeded", () => {
    const plans = Array.from({ length: 9 }, (_, i) => ({
        id: `c${i}`,
        priority: 0,
        agentType: "x",
        prompt: ""
    }));
    assert.throws(() => checkFanout(plans, { maxChildrenPerBatch: 8 }), (e) => e.name === "DispatchFanoutExceeded");
});
test("checkFanout: below cap does not throw", () => {
    const plans = Array.from({ length: 5 }, (_, i) => ({
        id: `c${i}`,
        priority: 0,
        agentType: "x",
        prompt: ""
    }));
    assert.doesNotThrow(() => checkFanout(plans, { maxChildrenPerBatch: 8 }));
});
test("checkFanout: empty plans throws DispatchConfigError", () => {
    assert.throws(() => checkFanout([], { maxChildrenPerBatch: 8 }), (e) => e.name === "DispatchConfigError");
});
test("checkUniqueIds: duplicate id throws DispatchConfigError", () => {
    assert.throws(() => checkUniqueIds([
        { id: "FE", priority: 0, agentType: "x", prompt: "" },
        { id: "FE", priority: 1, agentType: "x", prompt: "" }
    ]), (e) => e.name === "DispatchConfigError" && /duplicate child id/.test(e.message));
});
test("validateBranchName: rejects names with shell special chars", () => {
    assert.throws(() => validateBranchName("bad~name"), (e) => e.name === "DispatchConfigError");
});
test("validateBranchName: accepts slice/SLICE-90", () => {
    assert.doesNotThrow(() => validateBranchName("slice/SLICE-90"));
});
