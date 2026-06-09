// @ts-nocheck
import { test } from "node:test";
import assert from "node:assert/strict";
import { DispatchDepthExceeded, DispatchFanoutExceeded, DispatchWorktreeError, DispatchConfigError, } from "../scripts/lib/dispatch-types.mjs";
test("DispatchDepthExceeded is an Error with .name set", () => {
    const e = new DispatchDepthExceeded("depth 3 >= cap 3");
    assert.ok(e instanceof Error);
    assert.equal(e.name, "DispatchDepthExceeded");
    assert.equal(e.message, "depth 3 >= cap 3");
});
test("DispatchFanoutExceeded carries plan count", () => {
    const e = new DispatchFanoutExceeded("9 > 8");
    assert.ok(e instanceof Error);
    assert.equal(e.name, "DispatchFanoutExceeded");
});
test("DispatchWorktreeError carries git context", () => {
    const e = new DispatchWorktreeError("dirty tree on slice/SLICE-90");
    assert.equal(e.name, "DispatchWorktreeError");
});
test("DispatchConfigError carries config detail", () => {
    const e = new DispatchConfigError("duplicate child id: FE");
    assert.equal(e.name, "DispatchConfigError");
});
