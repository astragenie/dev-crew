// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
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
 * Thin wrapper that exercises the actual backlog add logic from loop.mts.
 * Captures stderr output and exit code changes.
 */
async function backlogAdd(repoPath, { title, body, noResearch = false }) {
    const stderrLines = [];
    const origError = console.error.bind(console);
    console.error = (...args) => stderrLines.push(args.join(" "));
    let result;
    try {
        const { clearAll } = await import("../scripts/lib/cache.mjs");
        clearAll();
        // Resolve body using the same logic as loop.mts resolveBacklogAddBody
        let resolvedBody = body ?? null;
        if (!resolvedBody) {
            if (noResearch) {
                console.error("[backlog add] --no-research is deprecated and now a no-op (see DEC-011). " +
                    "Researcher auto-dispatch is already removed.");
            }
            // Researcher auto-dispatch removed — write audit log entry, empty body
            const { appendAuditLog } = await import("../scripts/lib/auto-dispatch.mjs");
            await appendAuditLog(repoPath, {
                timestamp: new Date().toISOString(),
                agent: "loop:researcher",
                parentCommand: "backlog-add",
                ok: false,
                skipped: true,
                skipReason: "cli-refusal-researcher-disabled",
                durationMs: 0
            });
            console.error("[backlog add] researcher auto-dispatch removed (see DEC-011). " +
                "Creating FEAT with empty body — run /loop:backlog-add for researcher enrichment, " +
                "or pass --body explicitly.");
            resolvedBody = "";
        }
        const { addFeature } = await import("../scripts/lib/backlog-writer.mjs");
        result = await addFeature(repoPath, {
            title,
            priority: null,
            category: null,
            target_release: null,
            body: resolvedBody
        });
    }
    finally {
        console.error = origError;
    }
    return { result, stderrLines };
}
// ---------------------------------------------------------------------------
// Test 1: --body provided → no researcher dispatch, no audit log, FEAT body matches
// ---------------------------------------------------------------------------
test("backlog add with --body: no researcher dispatch, FEAT body matches explicit text", async () => {
    const repo = await tmpRepo("bar-explicit-body-");
    const explicitBody = "Explicit body content supplied by the user.";
    const { result, stderrLines } = await backlogAdd(repo, {
        title: "Explicit body test",
        body: explicitBody
    });
    // No stderr about researcher removal when body is provided
    const stderrText = stderrLines.join(" ");
    assert.ok(!stderrText.includes("researcher auto-dispatch removed"), `should not warn about researcher when --body provided, got: ${stderrText}`);
    // Audit log must have NO entry for loop:researcher
    const lines = await readJsonLines(auditLogPath(repo));
    const researcherEntries = lines.filter((e) => e.agent === "loop:researcher");
    assert.equal(researcherEntries.length, 0, "no audit log entry expected for loop:researcher");
    // FEAT file must exist with explicit body
    const content = await fs.readFile(result.filePath, "utf8");
    const { body } = parseFrontmatter(content);
    assert.ok(body.includes(explicitBody), `FEAT body should contain explicit text, got:\n${body}`);
});
// ---------------------------------------------------------------------------
// Test 2: no --body → audit log written, stderr deprecation note, FEAT created (AC-3)
// ---------------------------------------------------------------------------
test("backlog add without --body: audit log written, stderr warns about DEC-011, FEAT created (AC-3)", async () => {
    const repo = await tmpRepo("bar-no-body-");
    const { result, stderrLines } = await backlogAdd(repo, {
        title: "No body test"
    });
    // FEAT file must exist
    assert.ok(result?.filePath, "FEAT file should be created");
    const content = await fs.readFile(result.filePath, "utf8");
    assert.ok(content.length > 0, "FEAT file must not be empty");
    // Stderr must include researcher removal warning
    const stderrText = stderrLines.join(" ");
    assert.ok(stderrText.includes("researcher auto-dispatch removed"), `stderr must include removal warning, got: ${stderrText}`);
    assert.ok(stderrText.includes("DEC-011"), `stderr must cite DEC-011, got: ${stderrText}`);
    assert.ok(stderrText.includes("/loop:backlog-add"), `stderr must name the slash flow, got: ${stderrText}`);
    // Audit log must have exactly one entry for loop:researcher with cli-refusal
    const lines = await readJsonLines(auditLogPath(repo));
    const researcherEntries = lines.filter((e) => e.agent === "loop:researcher");
    assert.equal(researcherEntries.length, 1, "expected one audit entry for loop:researcher");
    const entry = researcherEntries[0];
    assert.equal(entry.skipped, true, "audit entry should have skipped=true");
    assert.equal(entry.skipReason, "cli-refusal-researcher-disabled", "audit entry skipReason must be cli-refusal-researcher-disabled");
});
// ---------------------------------------------------------------------------
// Test 3: --no-research → deprecated no-op warning, FEAT still created
// ---------------------------------------------------------------------------
test("backlog add with --no-research: deprecated no-op warning, FEAT still created", async () => {
    const repo = await tmpRepo("bar-no-research-");
    const { result, stderrLines } = await backlogAdd(repo, {
        title: "No research test",
        noResearch: true
    });
    // FEAT file must exist
    assert.ok(result?.filePath, "FEAT file should be created");
    const content = await fs.readFile(result.filePath, "utf8");
    assert.ok(content.length > 0, "FEAT file must not be empty");
    // Stderr must include deprecated no-op note
    const stderrText = stderrLines.join(" ");
    assert.ok(stderrText.includes("deprecated") && stderrText.includes("no-op"), `stderr must include deprecated/no-op, got: ${stderrText}`);
    assert.ok(stderrText.includes("DEC-011"), `stderr must cite DEC-011, got: ${stderrText}`);
});
// ---------------------------------------------------------------------------
// Test 4: backlog add does NOT exit non-zero even when body is empty (graceful degrade)
// ---------------------------------------------------------------------------
test("backlog add without --body: exits 0 (graceful degrade, not a refusal)", async () => {
    const repo = await tmpRepo("bar-no-exit-1-");
    const originalExitCode = process.exitCode;
    process.exitCode = undefined;
    await backlogAdd(repo, { title: "Exit code test" });
    const exitCode = process.exitCode ?? 0;
    process.exitCode = originalExitCode;
    assert.notEqual(exitCode, 1, "backlog add must NOT set exitCode=1 when body is empty");
});
// ---------------------------------------------------------------------------
// Test 5: body sanitization helpers (regression guard)
// ---------------------------------------------------------------------------
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
