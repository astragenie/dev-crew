// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function tmpRepo(prefix) {
    return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}
function auditLogPath(repoRoot) {
    return path.join(repoRoot, ".claude/artifacts/loop/auto-dispatch.jsonl");
}
async function readJsonLines(filePath) {
    const raw = await fs.readFile(filePath, "utf8").catch(() => "");
    if (!raw.trim())
        return [];
    return raw
        .trim()
        .split("\n")
        .filter((l) => l.trim().length > 0)
        .map((l) => JSON.parse(l));
}
/**
 * Thin wrapper that exercises the same logic as the `backlog add` CLI handler
 * but with an injected dispatchFn so tests never touch real audit logs or
 * spawn real subagents.
 *
 * This mirrors the `opts.dispatchFn` injection seam added to
 * `runBacklogSubcommand` in loop.mts.
 */
async function backlogAddWithDispatch(repoPath, { title, body, noResearch = false, dispatchFn }) {
    // Build synthetic argv mirroring what the CLI would have.
    const argv = ["node", "loop.mjs", "backlog", "add", "--title", title];
    if (noResearch)
        argv.push("--no-research");
    if (body != null)
        argv.push("--body", body);
    const flags = {
        title,
        body: body ?? null,
        noResearch,
        priority: null,
        category: null,
        targetRelease: null
    };
    let resolvedBody = flags.body || "";
    if (!flags.body) {
        const { dispatchAgent: realDispatch } = await import("../scripts/lib/auto-dispatch.mjs");
        const dispatch = dispatchFn ?? realDispatch;
        const prompt = `Research repo context relevant to the new FEAT titled "${title}". ` +
            "Find prior FEATs in done/in-progress, recent grades mentioning this area, " +
            "decisions affecting it. Return a 200-400 word findings document with file:line " +
            "citations suitable for use as the FEAT body. Output only the body content " +
            "(no frontmatter, no title heading — those are added by the CLI).";
        try {
            const result = await dispatch({
                agent: "loop:researcher",
                prompt,
                parentCommand: "backlog-add",
                repoRoot: repoPath,
                argv,
                skipFlag: "--no-research"
            });
            if (result.ok && !result.skipped && result.output && result.output.trim()) {
                const sanitized = sanitizeResearcherBody(result.output);
                if (sanitized.length > 0) {
                    resolvedBody = sanitized;
                }
            }
        }
        catch {
            // Researcher failure must not block backlog add.
        }
    }
    return addFeature(repoPath, {
        title,
        priority: flags.priority,
        category: flags.category,
        target_release: flags.targetRelease,
        body: resolvedBody
    });
}
function sanitizeResearcherBody(raw) {
    let text = raw;
    if (text.trimStart().startsWith("---")) {
        const after = text.trimStart().slice(3);
        const endIdx = after.indexOf("---");
        if (endIdx !== -1) {
            text = after.slice(endIdx + 3);
        }
    }
    text = text.replace(/^\s*#[^\n]*\n/, "");
    return text.trim();
}
// ---------------------------------------------------------------------------
// Test 1: --body provided → researcher NOT dispatched
// ---------------------------------------------------------------------------
test("backlog add with --body: researcher not dispatched, FEAT body matches explicit text", async () => {
    const repo = await tmpRepo("bar-explicit-body-");
    const explicitBody = "Explicit body content supplied by the user.";
    let dispatchCallCount = 0;
    const mockDispatch = async (_opts) => {
        dispatchCallCount++;
        return { ok: true, skipped: false, output: "should not be used", durationMs: 0 };
    };
    const result = await backlogAddWithDispatch(repo, {
        title: "Explicit body test",
        body: explicitBody,
        dispatchFn: mockDispatch
    });
    // Researcher must NOT have been dispatched.
    assert.equal(dispatchCallCount, 0, "dispatchFn should not be called when --body is provided");
    // Audit log must have NO entry for loop:researcher.
    const lines = await readJsonLines(auditLogPath(repo));
    const researcherEntries = lines.filter((e) => e.agent === "loop:researcher");
    assert.equal(researcherEntries.length, 0, "no audit log entry expected for loop:researcher");
    // FEAT file must exist.
    const content = await fs.readFile(result.filePath, "utf8");
    const { body } = parseFrontmatter(content);
    assert.ok(body.includes(explicitBody), `FEAT body should contain explicit text, got:\n${body}`);
});
// ---------------------------------------------------------------------------
// Test 2: --no-research → researcher dispatched-with-skip
// ---------------------------------------------------------------------------
test("backlog add with --no-research: audit log has skipped=true entry, FEAT body is placeholder", async () => {
    const repo = await tmpRepo("bar-no-research-");
    // Use the real dispatchAgent but route its audit log to the tmp repo.
    const result = await backlogAddWithDispatch(repo, {
        title: "No research test",
        noResearch: true
    });
    // FEAT file must exist.
    assert.ok(result.filePath, "FEAT file should be created");
    const content = await fs.readFile(result.filePath, "utf8");
    assert.ok(content.length > 0, "FEAT file must not be empty");
    // Audit log must have exactly one entry for loop:researcher with skipped=true.
    const lines = await readJsonLines(auditLogPath(repo));
    const researcherEntries = lines.filter((e) => e.agent === "loop:researcher");
    assert.equal(researcherEntries.length, 1, "expected one audit entry for loop:researcher");
    const entry = researcherEntries[0];
    assert.equal(entry.skipped, true, "audit entry should have skipped=true");
    assert.equal(entry.skipReason, "opt-out", "audit entry should have skipReason=opt-out");
    // Body must be the placeholder template (no researcher output).
    const { body } = parseFrontmatter(content);
    assert.ok(body.includes("describe the feature") || body.includes("Acceptance hints"), `FEAT body should be placeholder template, got:\n${body}`);
});
// ---------------------------------------------------------------------------
// Test 3: no flags → researcher dispatched normally, body merged
// ---------------------------------------------------------------------------
test("backlog add with no flags: researcher dispatched, audit entry written, body from researcher output", async () => {
    const repo = await tmpRepo("bar-normal-dispatch-");
    const researcherOutput = "This is the citation-backed body from the researcher agent.";
    let capturedOpts = null;
    const mockDispatch = async (opts) => {
        capturedOpts = opts;
        return { ok: true, skipped: false, output: researcherOutput, durationMs: 10 };
    };
    const result = await backlogAddWithDispatch(repo, {
        title: "Normal dispatch test",
        dispatchFn: mockDispatch
    });
    // dispatchFn must have been called.
    assert.ok(capturedOpts !== null, "dispatchFn should have been called");
    assert.equal(capturedOpts.agent, "loop:researcher");
    assert.equal(capturedOpts.parentCommand, "backlog-add");
    assert.equal(capturedOpts.skipFlag, "--no-research");
    assert.ok(capturedOpts.prompt.includes("Normal dispatch test"), "prompt should include the FEAT title");
    // FEAT body should contain the researcher output.
    const content = await fs.readFile(result.filePath, "utf8");
    const { body } = parseFrontmatter(content);
    assert.ok(body.includes(researcherOutput), `FEAT body should contain researcher output, got:\n${body}`);
});
// ---------------------------------------------------------------------------
// Test 4: researcher dispatch FAILURE → FEAT still created, no throw
// ---------------------------------------------------------------------------
test("backlog add with researcher failure: FEAT created with placeholder body, no throw", async () => {
    const repo = await tmpRepo("bar-dispatch-fail-");
    const mockDispatch = async (_opts) => {
        return { ok: false, skipped: false, error: "researcher exploded", durationMs: 5 };
    };
    let thrown = null;
    let result = null;
    try {
        result = await backlogAddWithDispatch(repo, {
            title: "Dispatch failure test",
            dispatchFn: mockDispatch
        });
    }
    catch (err) {
        thrown = err;
    }
    // Must NOT have thrown.
    assert.equal(thrown, null, "backlog add must not throw when researcher dispatch fails");
    // FEAT file must still be created.
    assert.ok(result?.filePath, "FEAT file should be created even when researcher fails");
    const content = await fs.readFile(result.filePath, "utf8");
    assert.ok(content.length > 0, "FEAT file must not be empty");
    // Body must fall back to placeholder template.
    const { body } = parseFrontmatter(content);
    assert.ok(body.includes("describe the feature") || body.includes("Acceptance hints"), `FEAT body should be placeholder when researcher fails, got:\n${body}`);
});
// ---------------------------------------------------------------------------
// Test 5: body sanitization — frontmatter stripped, title heading stripped
// ---------------------------------------------------------------------------
test("sanitizeResearcherBody strips frontmatter block", () => {
    const raw = "---\nfoo: bar\n---\n\nActual body content here.";
    const sanitized = sanitizeResearcherBody(raw);
    assert.ok(!sanitized.includes("---"), "frontmatter markers should be stripped");
    assert.ok(sanitized.includes("Actual body content here."), "real content should remain");
});
test("sanitizeResearcherBody strips leading title heading", () => {
    const raw = "# My Feature Title\n\nBody paragraph here.";
    const sanitized = sanitizeResearcherBody(raw);
    assert.ok(!sanitized.includes("# My Feature Title"), "title heading should be stripped");
    assert.ok(sanitized.includes("Body paragraph here."), "body content should remain");
});
test("sanitizeResearcherBody returns trimmed output with no modifications for clean body", () => {
    const raw = "  This is a clean body paragraph.\n\nWith multiple lines.  ";
    const sanitized = sanitizeResearcherBody(raw);
    assert.equal(sanitized, "This is a clean body paragraph.\n\nWith multiple lines.");
});
