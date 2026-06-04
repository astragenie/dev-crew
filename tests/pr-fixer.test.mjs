// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { assertPrViewShape, categorizePrIssues, fetchPrStatus, runPrFix } from "../scripts/lib/pr-fixer.mjs";
// --- categorizePrIssues tests ---
test("categorizePrIssues returns ['ci_failure'] when statusCheckRollup has FAILURE", () => {
    const raw = {
        statusCheckRollup: [{ name: "build", conclusion: "FAILURE" }],
        reviews: [],
        comments: []
    };
    const result = categorizePrIssues(raw);
    assert.deepEqual(result, ["ci_failure"]);
});
test("categorizePrIssues includes 'lint' when failed check name contains 'lint'", () => {
    const raw = {
        statusCheckRollup: [{ name: "ESLint", conclusion: "FAILURE" }],
        reviews: [],
        comments: []
    };
    const result = categorizePrIssues(raw);
    assert.ok(result.includes("lint"), "should include lint");
});
test("categorizePrIssues includes 'review_comment' when review has CHANGES_REQUESTED", () => {
    const raw = {
        statusCheckRollup: [],
        reviews: [{ state: "CHANGES_REQUESTED" }],
        comments: []
    };
    const result = categorizePrIssues(raw);
    assert.ok(result.includes("review_comment"), "should include review_comment");
});
test("categorizePrIssues returns empty array for clean PR", () => {
    const raw = {
        statusCheckRollup: [{ name: "tests", conclusion: "SUCCESS" }],
        reviews: [{ state: "APPROVED" }],
        comments: []
    };
    const result = categorizePrIssues(raw);
    assert.deepEqual(result, []);
});
// --- runPrFix tests ---
test("runPrFix with circuitBroken=true when priorAttempts exceeds threshold", async () => {
    const mockGhExec = () => JSON.stringify({
        title: "Test PR",
        state: "OPEN",
        statusCheckRollup: [{ name: "test", conclusion: "FAILURE" }],
        reviews: [],
        comments: []
    });
    const result = await runPrFix(".", 42, {
        ghExec: mockGhExec,
        maxAttemptsPerCategory: 3,
        priorAttempts: { test_failure: 3 }
    });
    assert.equal(result.prNumber, 42);
    assert.equal(result.ciGreen, false);
    // "test" name matches both ci_failure and test_failure — find the test_failure plan
    const plan = result.plans.find((p) => p.category === "test_failure");
    assert.ok(plan, "expected a test_failure plan");
    assert.equal(plan.attemptCount, 3);
    assert.equal(plan.circuitBroken, true);
});
test("runPrFix with circuitBroken=false when priorAttempts is below threshold", async () => {
    const mockGhExec = () => JSON.stringify({
        title: "Test PR",
        state: "OPEN",
        statusCheckRollup: [{ name: "test", conclusion: "FAILURE" }],
        reviews: [],
        comments: []
    });
    const result = await runPrFix(".", 42, {
        ghExec: mockGhExec,
        maxAttemptsPerCategory: 3,
        priorAttempts: { test_failure: 1 }
    });
    assert.equal(result.prNumber, 42);
    const plan = result.plans.find((p) => p.category === "test_failure");
    assert.ok(plan, "expected a test_failure plan");
    assert.equal(plan.attemptCount, 1);
    assert.equal(plan.circuitBroken, false);
});
// --- fetchPrStatus tests ---
test("fetchPrStatus returns gh_unavailable when ghExec throws", async () => {
    const mockGhExec = () => {
        throw new Error("gh: command not found");
    };
    const result = await fetchPrStatus(".", 1, { ghExec: mockGhExec });
    assert.deepEqual(result, { raw: null, haltReason: "gh_unavailable" });
});
test("fetchPrStatus throws when JSON is missing required field title", async () => {
    const mockGhExec = () => JSON.stringify({ state: "OPEN", reviews: [], comments: [] });
    await assert.rejects(() => fetchPrStatus(".", 1, { ghExec: mockGhExec }), (err) => {
        assert.ok(err.message.includes("title"), `expected "title" in message: ${err.message}`);
        return true;
    });
});
test("fetchPrStatus throws when reviews field is not an array", async () => {
    const mockGhExec = () => JSON.stringify({ title: "PR", state: "OPEN", reviews: "nope", comments: [] });
    await assert.rejects(() => fetchPrStatus(".", 1, { ghExec: mockGhExec }), (err) => {
        assert.ok(err.message.includes("reviews"), `expected "reviews" in message: ${err.message}`);
        return true;
    });
});
test("fetchPrStatus succeeds and returns parsed data for well-formed JSON", async () => {
    const payload = {
        title: "Good PR",
        state: "OPEN",
        reviews: [{ state: "APPROVED" }],
        comments: [],
        statusCheckRollup: []
    };
    const mockGhExec = () => JSON.stringify(payload);
    const result = await fetchPrStatus(".", 1, { ghExec: mockGhExec });
    assert.equal(result.haltReason, null);
    assert.deepEqual(result.raw, payload);
});
// --- assertPrViewShape direct unit tests ---
test("assertPrViewShape throws on non-object input", () => {
    assert.throws(() => assertPrViewShape(null), (err) => {
        assert.ok(err.message.includes("root"), `expected "root" in message: ${err.message}`);
        return true;
    });
});
test("assertPrViewShape throws when title is missing", () => {
    assert.throws(() => assertPrViewShape({ state: "OPEN", reviews: [], comments: [] }), (err) => {
        assert.ok(err.message.includes("title"), `expected "title" in message: ${err.message}`);
        return true;
    });
});
test("assertPrViewShape throws when state is missing", () => {
    assert.throws(() => assertPrViewShape({ title: "PR", reviews: [], comments: [] }), (err) => {
        assert.ok(err.message.includes("state"), `expected "state" in message: ${err.message}`);
        return true;
    });
});
test("assertPrViewShape throws when reviews is not an array", () => {
    assert.throws(() => assertPrViewShape({ title: "PR", state: "OPEN", reviews: null, comments: [] }), (err) => {
        assert.ok(err.message.includes("reviews"), `expected "reviews" in message: ${err.message}`);
        return true;
    });
});
test("assertPrViewShape throws when comments is not an array", () => {
    assert.throws(() => assertPrViewShape({ title: "PR", state: "OPEN", reviews: [], comments: "bad" }), (err) => {
        assert.ok(err.message.includes("comments"), `expected "comments" in message: ${err.message}`);
        return true;
    });
});
