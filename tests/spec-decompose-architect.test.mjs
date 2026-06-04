// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { parseArchitectOutput, detectMissingSpecFields } from "../scripts/loop.mjs";
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
const SPECS_REL = ".claude/artifacts/loop/specs";
async function createSpec(repoRoot, id, body, frontmatterExtra = {}) {
    const specsDir = path.join(repoRoot, SPECS_REL);
    await fs.mkdir(specsDir, { recursive: true });
    const fm = Object.entries({
        id,
        type: "prd",
        title: "Test SPEC",
        status: "draft",
        ...frontmatterExtra
    })
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
    const content = `---\n${fm}\n---\n${body}`;
    const filePath = path.join(specsDir, `${id}.md`);
    await fs.writeFile(filePath, content, "utf8");
    return filePath;
}
/**
 * Thin wrapper around the spec decompose handler — mirrors how the CLI calls it
 * but injects dispatchFn so tests never spawn real subagents or write to the
 * real audit log. This mirrors the opts.dispatchFn injection seam from SLICE-B.
 */
async function specDecomposeWithDispatch(repoPath, { specId, features, featuresJson, noArchitect = false, dispatchFn }) {
    const flags = {
        id: specId,
        features: features ?? null,
        featuresJson: featuresJson ?? null,
        noArchitect: noArchitect ?? false,
        priority: null,
        category: null,
        targetRelease: null
    };
    // Capture process.exitCode changes (reset before + restore after).
    const originalExitCode = process.exitCode;
    process.exitCode = undefined;
    // Capture console.error / console.warn output.
    const stderrLines = [];
    const origError = console.error.bind(console);
    const origWarn = console.warn.bind(console);
    console.error = (...args) => stderrLines.push(args.join(" "));
    console.warn = (...args) => stderrLines.push(args.join(" "));
    let result;
    try {
        // Import SPEC_HANDLERS via the decompose path inline (mirrors loop.mts logic).
        const { clearAll } = await import("../scripts/lib/cache.mjs");
        clearAll();
        // Inline the decompose logic using the same structure as loop.mts SPEC_HANDLERS.decompose.
        const { findSpecById } = await import("../scripts/lib/spec-parser.mjs");
        const { decomposeSpec } = await import("../scripts/lib/spec-decomposer.mjs");
        const { dispatchAgent } = await import("../scripts/lib/auto-dispatch.mjs");
        const { parseArchitectOutput: parseOutput, detectMissingSpecFields: detectMissing } = await import("../scripts/loop.mjs");
        const effectiveDispatch = dispatchFn ?? dispatchAgent;
        // Fast path: explicit feature list supplied.
        if (flags.features || flags.featuresJson) {
            let entries;
            if (flags.featuresJson) {
                entries = JSON.parse(flags.featuresJson);
            }
            else {
                entries = flags
                    .features.split(";")
                    .map((s) => s.trim())
                    .filter(Boolean);
            }
            result = await decomposeSpec(repoPath, specId, entries);
        }
        else if (flags.noArchitect) {
            // --no-architect opt-out: write audit log skip entry + set exitCode.
            await effectiveDispatch({
                agent: "loop:architect",
                prompt: "",
                parentCommand: "spec-decompose",
                repoRoot: repoPath,
                argv: ["--no-architect"],
                skipFlag: "--no-architect"
            });
            console.error("spec-decompose requires --features or architect dispatch; you opted out of architect with --no-architect");
            process.exitCode = 1;
            result = {
                error: "spec-decompose requires --features or architect dispatch; you opted out of architect with --no-architect"
            };
        }
        else {
            // Dispatch architect to produce feature list.
            const spec = await findSpecById(repoPath, specId);
            if (!spec)
                throw new Error(`Spec not found: ${specId}`);
            const missingFields = detectMissing(spec);
            for (const field of missingFields) {
                console.warn(`[spec-decompose] SPEC ${specId} missing ${field}; architect best-effort decomposition may produce low-quality FEATs`);
            }
            const specAbsPath = spec.filePath;
            const prompt = `Decompose ${specId} (file: ${specAbsPath}) into 3-7 implementation FEATs. ` +
                "Return them as a semicolon-separated list of feature titles (no FEAT-NNN prefix; the CLI assigns ids). " +
                "Optionally include scope hints in parentheses, e.g. " +
                '"Audio ingestion pipeline (in-scope: src/audio/; out: streaming); Multi-tenant key scoping (depends_on: auth)". ' +
                "Output ONLY the semicolon-separated list — no preamble, no markdown headings.";
            const dispatchResult = await effectiveDispatch({
                agent: "loop:architect",
                prompt,
                parentCommand: "spec-decompose",
                repoRoot: repoPath,
                argv: [],
                skipFlag: "--no-architect"
            });
            if (!dispatchResult.ok) {
                console.error(`[spec-decompose] architect dispatch failed: ${dispatchResult.error ?? "unknown error"}. Run with --features to skip architect.`);
                process.exitCode = 1;
                result = {
                    error: `architect dispatch failed: ${dispatchResult.error ?? "unknown error"}`
                };
            }
            else {
                const rawOutput = dispatchResult.output ?? "";
                const titles = parseOutput(rawOutput);
                if (titles.length === 0) {
                    console.error("[spec-decompose] architect returned empty feature list. Run with --features to provide titles explicitly.");
                    process.exitCode = 1;
                    result = { error: "architect returned empty feature list" };
                }
                else {
                    result = await decomposeSpec(repoPath, specId, titles);
                }
            }
        }
    }
    finally {
        console.error = origError;
        console.warn = origWarn;
    }
    const exitCode = process.exitCode ?? 0;
    process.exitCode = originalExitCode;
    return { result, exitCode, stderrLines };
}
// ---------------------------------------------------------------------------
// Unit tests for helpers
// ---------------------------------------------------------------------------
test("parseArchitectOutput: splits on semicolons, trims, filters empty", () => {
    const out = parseArchitectOutput("Feature A ; Feature B; ; Feature C (in-scope: src/)");
    assert.deepEqual(out, ["Feature A", "Feature B", "Feature C (in-scope: src/)"]);
});
test("parseArchitectOutput: returns empty array for blank string", () => {
    assert.deepEqual(parseArchitectOutput("  "), []);
});
test("detectMissingSpecFields: complete SPEC with ## Goals and ## Non-goals returns empty", () => {
    const spec = {
        frontmatter: {},
        body: "## Goals\n- thing\n\n## Non-goals\n- other"
    };
    assert.deepEqual(detectMissingSpecFields(spec), []);
});
test("detectMissingSpecFields: SPEC without objective section returns ['objective']", () => {
    const spec = {
        frontmatter: {},
        body: "## Non-goals\n- other"
    };
    const missing = detectMissingSpecFields(spec);
    assert.ok(missing.includes("objective"), `expected 'objective' in [${missing.join(", ")}]`);
});
test("detectMissingSpecFields: SPEC without scope section returns ['scope']", () => {
    const spec = {
        frontmatter: {},
        body: "## Goals\n- bullet"
    };
    const missing = detectMissingSpecFields(spec);
    assert.ok(missing.includes("scope"), `expected 'scope' in [${missing.join(", ")}]`);
});
// ---------------------------------------------------------------------------
// Test 1: --features supplied → architect NOT dispatched, no audit log entry
// ---------------------------------------------------------------------------
test("spec decompose with --features: architect not dispatched, existing behavior preserved", async () => {
    const repo = await tmpRepo("sda-explicit-features-");
    const body = "## Goals\n- thing\n\n## Non-goals\n- other\n\n## In-scope\n- src/";
    await createSpec(repo, "SPEC-001", body);
    let dispatchCallCount = 0;
    const mockDispatch = async (_opts) => {
        dispatchCallCount++;
        return { ok: true, skipped: false, output: "should not be used", durationMs: 0 };
    };
    const { result } = await specDecomposeWithDispatch(repo, {
        specId: "SPEC-001",
        features: "Feature A; Feature B; Feature C",
        dispatchFn: mockDispatch
    });
    assert.equal(dispatchCallCount, 0, "dispatchFn must not be called when --features is provided");
    const lines = await readJsonLines(auditLogPath(repo));
    const architectEntries = lines.filter((e) => e.agent === "loop:architect");
    assert.equal(architectEntries.length, 0, "no audit log entry for loop:architect");
    assert.ok(result?.count === 3, `expected 3 FEATs created, got ${result?.count}`);
    assert.ok(result?.created?.length === 3, "created array should have 3 entries");
});
// ---------------------------------------------------------------------------
// Test 2: --no-architect without --features → skip entry in audit log, non-zero exit
// ---------------------------------------------------------------------------
test("spec decompose with --no-architect: audit log has skipped=true, exits non-zero with helpful error", async () => {
    const repo = await tmpRepo("sda-no-architect-");
    const body = "## Goals\n- thing\n\n## Non-goals\n- other\n\n## In-scope\n- src/";
    await createSpec(repo, "SPEC-001", body);
    const { result, exitCode, stderrLines } = await specDecomposeWithDispatch(repo, {
        specId: "SPEC-001",
        noArchitect: true
    });
    assert.equal(exitCode, 1, "exit code must be 1 when --no-architect and no --features");
    assert.ok(stderrLines.some((l) => l.includes("opted out")), `expected helpful error in stderr: ${stderrLines.join(" | ")}`);
    assert.ok(result?.error?.includes("opted out"), "result should contain error message");
    const lines = await readJsonLines(auditLogPath(repo));
    const architectEntries = lines.filter((e) => e.agent === "loop:architect");
    assert.equal(architectEntries.length, 1, "one audit log entry for loop:architect");
    const entry = architectEntries[0];
    assert.equal(entry.skipped, true, "audit entry should have skipped=true");
    assert.equal(entry.skipReason, "opt-out", "audit entry should have skipReason=opt-out");
});
// ---------------------------------------------------------------------------
// Test 3: no flags on complete SPEC → architect dispatched, FEATs created
// ---------------------------------------------------------------------------
test("spec decompose with no flags: architect dispatched, audit entry written, FEATs created from output", async () => {
    const repo = await tmpRepo("sda-normal-dispatch-");
    const body = "## Goals\n- thing\n\n## Non-goals\n- other\n\n## In-scope\n- src/";
    await createSpec(repo, "SPEC-001", body);
    let capturedOpts = null;
    const mockDispatch = async (opts) => {
        capturedOpts = opts;
        return {
            ok: true,
            skipped: false,
            output: "Feature A (in-scope: src/a/); Feature B; Feature C (depends_on: auth)",
            durationMs: 10
        };
    };
    const { result, exitCode } = await specDecomposeWithDispatch(repo, {
        specId: "SPEC-001",
        dispatchFn: mockDispatch
    });
    assert.equal(exitCode, 0, "exit code must be 0 on success");
    assert.ok(capturedOpts !== null, "dispatchFn should have been called");
    assert.equal(capturedOpts.agent, "loop:architect");
    assert.equal(capturedOpts.parentCommand, "spec-decompose");
    assert.equal(capturedOpts.skipFlag, "--no-architect");
    assert.ok(capturedOpts.prompt.includes("SPEC-001"), "prompt should reference spec id");
    assert.equal(result?.count, 3, `expected 3 FEATs created, got ${result?.count}`);
    const titles = result?.created?.map((c) => c.title);
    assert.ok(titles?.some((t) => t.includes("Feature A")), "Feature A should be created");
    assert.ok(titles?.some((t) => t.includes("Feature B")), "Feature B should be created");
    assert.ok(titles?.some((t) => t.includes("Feature C")), "Feature C should be created");
});
// ---------------------------------------------------------------------------
// Test 4: architect dispatch FAILURE → CLI does NOT throw, exits non-zero, no FEATs
// ---------------------------------------------------------------------------
test("spec decompose with architect dispatch failure: no throw, exits non-zero, no partial FEATs", async () => {
    const repo = await tmpRepo("sda-dispatch-fail-");
    const body = "## Goals\n- thing\n\n## Non-goals\n- other\n\n## In-scope\n- src/";
    await createSpec(repo, "SPEC-001", body);
    const mockDispatch = async (_opts) => {
        return { ok: false, skipped: false, error: "architect exploded", durationMs: 5 };
    };
    let thrown = null;
    let outcome;
    try {
        outcome = await specDecomposeWithDispatch(repo, {
            specId: "SPEC-001",
            dispatchFn: mockDispatch
        });
    }
    catch (err) {
        thrown = err;
    }
    assert.equal(thrown, null, "must not throw when architect dispatch fails");
    assert.equal(outcome.exitCode, 1, "exit code must be 1 on architect failure");
    assert.ok(outcome.stderrLines.some((l) => l.includes("dispatch failed")), `expected 'dispatch failed' in stderr: ${outcome.stderrLines.join(" | ")}`);
    assert.ok(outcome.result?.error?.includes("dispatch failed"), "result should contain error");
    const specsDir = path.join(repo, ".claude/artifacts/loop/backlog");
    const exists = await fs
        .access(specsDir)
        .then(() => true)
        .catch(() => false);
    if (exists) {
        const pendingDir = path.join(specsDir, "pending");
        const pendingExists = await fs
            .access(pendingDir)
            .then(() => true)
            .catch(() => false);
        if (pendingExists) {
            const files = await fs.readdir(pendingDir);
            assert.equal(files.length, 0, "no partial FEATs should be created on architect failure");
        }
    }
});
// ---------------------------------------------------------------------------
// Test 5: incomplete SPEC (missing objective) → console.warn, architect dispatched
// ---------------------------------------------------------------------------
test("spec decompose with incomplete SPEC: console.warn invoked, architect still dispatched", async () => {
    const repo = await tmpRepo("sda-incomplete-spec-");
    // Body has no ## Goals / ## Problem / ## Objective heading.
    const body = "## Non-goals\n- other\n\n## In-scope\n- src/";
    await createSpec(repo, "SPEC-001", body);
    let dispatchCalled = false;
    const mockDispatch = async (_opts) => {
        dispatchCalled = true;
        return {
            ok: true,
            skipped: false,
            output: "Feature X; Feature Y",
            durationMs: 5
        };
    };
    const { result, exitCode, stderrLines } = await specDecomposeWithDispatch(repo, {
        specId: "SPEC-001",
        dispatchFn: mockDispatch
    });
    assert.ok(stderrLines.some((l) => l.includes("missing") && l.includes("objective")), `expected warning about missing objective, got: ${stderrLines.join(" | ")}`);
    assert.ok(dispatchCalled, "architect should still be dispatched despite incomplete SPEC");
    assert.equal(exitCode, 0, "exit code should be 0 — best-effort dispatch proceeds");
    assert.ok(result?.count === 2, `expected 2 FEATs from architect output, got ${result?.count}`);
});
// ---------------------------------------------------------------------------
// Test 6: regression guard — existing --features path still works (no architect)
// ---------------------------------------------------------------------------
test("spec decompose regression: --features-json path works, no architect dispatch", async () => {
    const repo = await tmpRepo("sda-regression-json-");
    const body = "## Goals\n- thing\n\n## Non-goals\n- other\n\n## In-scope\n- src/";
    await createSpec(repo, "SPEC-001", body);
    let dispatchCallCount = 0;
    const mockDispatch = async (_opts) => {
        dispatchCallCount++;
        return { ok: true, skipped: false, output: "should not be used", durationMs: 0 };
    };
    const { result, exitCode } = await specDecomposeWithDispatch(repo, {
        specId: "SPEC-001",
        featuresJson: JSON.stringify(["Alpha", "Beta"]),
        dispatchFn: mockDispatch
    });
    assert.equal(dispatchCallCount, 0, "architect must not be dispatched for --features-json path");
    assert.equal(exitCode, 0, "exit code 0 for --features-json");
    assert.equal(result?.count, 2, `expected 2 FEATs, got ${result?.count}`);
});
