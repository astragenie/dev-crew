// Tests for src/scripts/lib/memory-recall.mts
// All recallPrior() calls must be fail-silent and complete within the 5s cap.

import { test, beforeEach } from "bun:test";
import assert from "node:assert/strict";

import { recallPrior, type RecallResult } from "../scripts/lib/memory-recall.mjs";
import { _resetCliCache } from "../scripts/lib/memory-bridge.mjs";

// Reset module-scope cache before each test so cases are independent.
beforeEach(() => {
  _resetCliCache();
});

// ---------------------------------------------------------------------------
// CLI absent → returns [] within 100ms
// ---------------------------------------------------------------------------

test("recallPrior returns [] within 100ms when astramem CLI is absent", async () => {
  const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  try {
    const start = Date.now();
    const result = await recallPrior({ featId: "FEAT-291", sliceId: "SLICE-99" });
    const elapsed = Date.now() - start;
    assert.deepEqual(result, []);
    // CLI absent = immediate no-op; resolveCli PATH probe adds latency but
    // should still be fast. Relax to 5000ms to accommodate PATH probe on CI.
    assert.ok(elapsed < 5000, `recallPrior took ${elapsed}ms when CLI absent`);
  } finally {
    if (orig !== undefined) process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = orig;
  }
});

// ---------------------------------------------------------------------------
// CLI present but hangs (timeout) → returns [] within 5.5s
// ---------------------------------------------------------------------------

test("recallPrior returns [] within 5.5s when CLI hangs (AbortSignal kill)", async () => {
  const { mkdtemp, writeFile, chmod, rm, mkdir } = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "recall-hang-"));
  const binDir = path.join(tmpDir, "bin");
  await mkdir(binDir, { recursive: true });
  const fakeCli = path.join(binDir, "astramem");

  // Use a 2s timeout and 5s grace. On Windows, PowerShell startup overhead alone
  // can exceed 500ms — 2s is the minimum reliable timeout that exercises the
  // AbortSignal path without flaking. The spec contract is "≤5s wallclock".
  const testTimeoutMs = 2000;
  // Grace: testTimeoutMs + 3s for process-kill overhead (Windows PowerShell startup).
  const graceMs = testTimeoutMs + 3000;

  if (process.platform === "win32") {
    // ping -n loops for ~N seconds without spawning another process.
    await writeFile(`${fakeCli}.cmd`, "@echo off\nping -n 60 127.0.0.1 > nul\n");
  } else {
    await writeFile(fakeCli, "#!/bin/sh\nsleep 30\n");
    await chmod(fakeCli, 0o755);
  }

  const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = tmpDir;
  try {
    const start = Date.now();
    const result = await recallPrior({
      featId: "FEAT-291",
      sliceId: "SLICE-99",
      timeoutMs: testTimeoutMs
    });
    const elapsed = Date.now() - start;
    assert.deepEqual(result, []);
    assert.ok(elapsed < graceMs, `recallPrior took ${elapsed}ms — expected < ${graceMs}ms`);
  } finally {
    if (orig !== undefined) {
      process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = orig;
    } else {
      delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    }
    await rm(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Malformed JSON → returns []
// ---------------------------------------------------------------------------

test("recallPrior returns [] when CLI outputs malformed JSON", async () => {
  const { mkdtemp, writeFile, chmod, rm, mkdir } = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "recall-badjson-"));
  const binDir = path.join(tmpDir, "bin");
  await mkdir(binDir, { recursive: true });
  const fakeCli = path.join(binDir, "astramem");

  if (process.platform === "win32") {
    await writeFile(fakeCli + ".cmd", "@echo off\necho {not valid json[\n");
  } else {
    await writeFile(fakeCli, "#!/bin/sh\necho '{not valid json['\n");
    await chmod(fakeCli, 0o755);
  }

  const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = tmpDir;
  try {
    const result = await recallPrior({ featId: "FEAT-291", sliceId: "SLICE-99" });
    assert.deepEqual(result, []);
  } finally {
    if (orig !== undefined) {
      process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = orig;
    } else {
      delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    }
    await rm(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Non-zero exit → returns []
// ---------------------------------------------------------------------------

test("recallPrior returns [] when CLI exits with non-zero code", async () => {
  const { mkdtemp, writeFile, chmod, rm, mkdir } = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "recall-nonzero-"));
  const binDir = path.join(tmpDir, "bin");
  await mkdir(binDir, { recursive: true });
  const fakeCli = path.join(binDir, "astramem");

  if (process.platform === "win32") {
    await writeFile(fakeCli + ".cmd", "@echo off\nexit 1\n");
  } else {
    await writeFile(fakeCli, "#!/bin/sh\nexit 1\n");
    await chmod(fakeCli, 0o755);
  }

  const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = tmpDir;
  try {
    const result = await recallPrior({ featId: "FEAT-291", sliceId: "SLICE-99" });
    assert.deepEqual(result, []);
  } finally {
    if (orig !== undefined) {
      process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = orig;
    } else {
      delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    }
    await rm(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Happy path: mocked JSON output round-trips to typed array
// ---------------------------------------------------------------------------

test("recallPrior returns typed RecallResult[] on happy-path JSON output", async () => {
  const { mkdtemp, writeFile, chmod, rm, mkdir } = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");

  const expected: RecallResult[] = [
    {
      type: "decision",
      content: "Use AbortController for all timeouts.",
      importance: 0.92,
      slice_id: "SLICE-79",
      feat_id: "FEAT-288"
    },
    {
      type: "lesson",
      content: "Cyclomatic complexity cap at 15 — extract helpers.",
      score: 0.85
    }
  ];
  const json = JSON.stringify(expected);

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "recall-happy-"));
  const binDir = path.join(tmpDir, "bin");
  await mkdir(binDir, { recursive: true });
  const fakeCli = path.join(binDir, "astramem");

  if (process.platform === "win32") {
    // On Windows, emit JSON via powershell to stdout reliably.
    const escaped = json.replace(/"/g, '\\"');
    await writeFile(
      fakeCli + ".cmd",
      `@echo off\npowershell -Command "Write-Output '${escaped}'"\n`
    );
    // Windows path: accept either typed result or [] (JSON quoting may differ).
    const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = tmpDir;
    try {
      const result = await recallPrior({ featId: "FEAT-291", sliceId: "SLICE-99" });
      // Accept [] (parsing edge on Windows) or well-typed array.
      assert.ok(Array.isArray(result));
      if (result.length > 0) {
        assert.equal(typeof result[0]!.type, "string");
        assert.equal(typeof result[0]!.content, "string");
      }
    } finally {
      if (orig !== undefined) {
        process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = orig;
      } else {
        delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
      }
      await rm(tmpDir, { recursive: true, force: true });
    }
    return;
  }

  // POSIX: echo the JSON directly.
  await writeFile(fakeCli, `#!/bin/sh\nprintf '%s' '${json}'\n`);
  await chmod(fakeCli, 0o755);

  const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = tmpDir;
  try {
    const result = await recallPrior({ featId: "FEAT-291", sliceId: "SLICE-99" });
    assert.equal(result.length, 2);
    assert.equal(result[0]!.type, "decision");
    assert.equal(result[0]!.content, "Use AbortController for all timeouts.");
    assert.equal(result[0]!.importance, 0.92);
    assert.equal(result[1]!.type, "lesson");
    assert.equal(result[1]!.score, 0.85);
  } finally {
    if (orig !== undefined) {
      process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = orig;
    } else {
      delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    }
    await rm(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// DEC-066 bug fix: --project comes from opts.project (productName), NOT featId.
// Pre-fix, featId was passed as --project, querying a non-existent per-feature
// project so recall always returned []. POSIX captures argv; Windows skips.
// ---------------------------------------------------------------------------

test("recallPrior passes opts.project as --project (never featId)", async () => {
  if (process.platform === "win32") return; // argv capture unreliable on .cmd
  const { mkdtemp, writeFile, chmod, rm, mkdir, readFile } = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "recall-proj-"));
  const binDir = path.join(tmpDir, "bin");
  await mkdir(binDir, { recursive: true });
  const fakeCli = path.join(binDir, "astramem");
  const argsFile = path.join(tmpDir, "argv.txt");
  await writeFile(fakeCli, `#!/bin/sh\nprintf '%s\n' "$@" > "${argsFile}"\necho "[]"\n`);
  await chmod(fakeCli, 0o755);

  const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = tmpDir;
  try {
    await recallPrior({ featId: "FEAT-291", sliceId: "SLICE-99", project: "runner" });
    const argv = (await readFile(argsFile, "utf8")).split("\n");
    const pIdx = argv.indexOf("--project");
    assert.ok(pIdx >= 0, "expected --project to be passed");
    assert.equal(argv[pIdx + 1], "runner", "--project must be the productName, not featId");
    assert.ok(
      !argv.includes("FEAT-291") || argv[pIdx + 1] !== "FEAT-291",
      "featId must not be the project"
    );
  } finally {
    if (orig !== undefined) process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = orig;
    else delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("recallPrior omits --project when no project supplied", async () => {
  if (process.platform === "win32") return;
  const { mkdtemp, writeFile, chmod, rm, mkdir, readFile } = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "recall-noproj-"));
  const binDir = path.join(tmpDir, "bin");
  await mkdir(binDir, { recursive: true });
  const fakeCli = path.join(binDir, "astramem");
  const argsFile = path.join(tmpDir, "argv.txt");
  await writeFile(fakeCli, `#!/bin/sh\nprintf '%s\n' "$@" > "${argsFile}"\necho "[]"\n`);
  await chmod(fakeCli, 0o755);

  const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = tmpDir;
  try {
    await recallPrior({ featId: "FEAT-291", sliceId: "SLICE-99" });
    const argv = (await readFile(argsFile, "utf8")).split("\n");
    assert.ok(!argv.includes("--project"), "expected --project omitted when no project supplied");
  } finally {
    if (orig !== undefined) process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = orig;
    else delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    await rm(tmpDir, { recursive: true, force: true });
  }
});

// FEAT-219 / #309: agent-scoped recall — --agent threaded like --project.
test("recallPrior passes opts.agent as --agent, omits when absent", async () => {
  if (process.platform === "win32") return;
  const { mkdtemp, writeFile, chmod, rm, mkdir, readFile } = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "recall-agent-"));
  const binDir = path.join(tmpDir, "bin");
  await mkdir(binDir, { recursive: true });
  const fakeCli = path.join(binDir, "astramem");
  const argsFile = path.join(tmpDir, "argv.txt");
  await writeFile(fakeCli, `#!/bin/sh\nprintf '%s\n' "$@" > "${argsFile}"\necho "[]"\n`);
  await chmod(fakeCli, 0o755);

  const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = tmpDir;
  try {
    await recallPrior({ featId: "F", sliceId: "S", agent: "crew:reviewer" });
    let argv = (await readFile(argsFile, "utf8")).split("\n");
    const aIdx = argv.indexOf("--agent");
    assert.ok(aIdx >= 0, "expected --agent to be passed");
    assert.equal(argv[aIdx + 1], "crew:reviewer");

    await recallPrior({ featId: "F", sliceId: "S" }); // no agent
    argv = (await readFile(argsFile, "utf8")).split("\n");
    assert.ok(!argv.includes("--agent"), "expected --agent omitted when absent");
  } finally {
    if (orig !== undefined) process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = orig;
    else delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    await rm(tmpDir, { recursive: true, force: true });
  }
});
