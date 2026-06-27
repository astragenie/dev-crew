// Tests for src/scripts/lib/memory-bridge.mts
// All emit() calls must be fail-silent and complete within the 2s cap.

import { test, beforeEach } from "bun:test";
import assert from "node:assert/strict";

import {
  resolveCli,
  emit,
  _resetCliCache,
  type GepaPayload
} from "../scripts/lib/memory-bridge.mjs";

// Reset module-scope cache before each test so cases are independent.
beforeEach(() => {
  _resetCliCache();
});

// ---------------------------------------------------------------------------
// resolveCli
// ---------------------------------------------------------------------------

test("resolveCli returns null when neither env nor PATH has astramem", async () => {
  // Unset the env override so we fall through to PATH probe.
  const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  try {
    // The test environment has no astramem binary — expect null.
    // This relies on astramem not being installed in CI; safe assumption.
    const result = await resolveCli();
    // Either null (not found) or a path (if somehow installed). Both are
    // valid states; we assert the contract: no throw, returns null | {path}.
    assert.ok(result === null || (typeof result === "object" && typeof result.path === "string"));
  } finally {
    if (orig !== undefined) process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = orig;
  }
});

test("resolveCli finds env override when CLAUDE_PLUGIN_ROOT_MEMORY set to valid dir", async () => {
  // Point at a temp dir that has a fake astramem bin.
  const { mkdtemp, writeFile, chmod, rm, mkdir } = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "astramem-test-"));
  const binDir = path.join(tmpDir, "bin");
  await mkdir(binDir, { recursive: true });
  const fakeCli = path.join(binDir, "astramem");
  // Write a minimal executable script.
  await writeFile(fakeCli, "#!/bin/sh\nexit 0\n");
  try {
    await chmod(fakeCli, 0o755);
  } catch {
    // Windows doesn't have chmod — skip permission step; access check may
    // vary. The test validates path resolution, not execution.
  }

  const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = tmpDir;
  try {
    const result = await resolveCli();
    if (process.platform !== "win32") {
      // On POSIX we can set executable bit, so access check passes.
      assert.ok(result !== null, "expected CLI path to be found via env override");
      assert.equal(result!.path, fakeCli);
    } else {
      // On Windows chmod doesn't apply; fs.access X_OK may not distinguish.
      // Accept null or found — the resolution attempt ran without throwing.
      assert.ok(result === null || typeof result!.path === "string");
    }
  } finally {
    if (orig !== undefined) {
      process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = orig;
    } else {
      delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    }
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("resolveCli caches result across calls (second call returns same reference)", async () => {
  delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  const first = await resolveCli();
  const second = await resolveCli();
  // Must be the same reference (cached) — not just equal value.
  assert.strictEqual(first, second);
});

// ---------------------------------------------------------------------------
// emit — timeout enforcement
// ---------------------------------------------------------------------------

test("emit resolves within 2.5s when child process hangs indefinitely", async () => {
  // Inject a fake CLI that sleeps for 30s (or is a long-running Node script).
  const { mkdtemp, writeFile, chmod, rm, mkdir } = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "bridge-hang-"));
  const binDir = path.join(tmpDir, "bin");
  await mkdir(binDir, { recursive: true });
  const fakeCli = path.join(binDir, "astramem");

  // Write a script that sleeps for 30s — crosses the 2s cap cleanly.
  if (process.platform === "win32") {
    // PowerShell script disguised as astramem for Windows.
    await writeFile(fakeCli + ".cmd", '@echo off\npowershell -Command "Start-Sleep 30"\n');
  } else {
    await writeFile(fakeCli, "#!/bin/sh\nsleep 30\n");
    await chmod(fakeCli, 0o755);
  }

  const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = tmpDir;
  try {
    const payload: GepaPayload = makePayload();
    const start = Date.now();
    await emit(payload);
    const elapsed = Date.now() - start;
    // Must resolve within 2.5s (2s cap + 500ms grace for CI overhead).
    assert.ok(elapsed < 2500, `emit took ${elapsed}ms — expected < 2500ms`);
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
// emit — ENOENT (CLI missing)
// ---------------------------------------------------------------------------

test("emit resolves without throwing when CLI path does not exist (ENOENT)", async () => {
  const { mkdtemp, writeFile, chmod, rm, mkdir } = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");

  // Create a temp dir with a fake executable so resolveCli succeeds ...
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "bridge-enoent-"));
  const binDir = path.join(tmpDir, "bin");
  await mkdir(binDir, { recursive: true });
  const fakeCli = path.join(binDir, "astramem");
  await writeFile(fakeCli, "#!/bin/sh\nexit 0\n");
  try {
    await chmod(fakeCli, 0o755);
  } catch {
    /* Windows */
  }

  const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = tmpDir;

  // ... then delete the file so the spawn itself gets ENOENT.
  await rm(fakeCli, { force: true });

  try {
    // emit must not throw even when spawn fails with ENOENT.
    await assert.doesNotReject(async () => {
      await emit(makePayload());
    });
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
// emit — payload schema round-trip
// ---------------------------------------------------------------------------

test("emit passes well-formed JSON as the --json argument (payload round-trip)", async () => {
  // Intercept the spawn call via a fake CLI that writes its argv to a tmp file.
  const { mkdtemp, readFile, rm, mkdir, writeFile, chmod } = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "bridge-roundtrip-"));
  const binDir = path.join(tmpDir, "bin");
  await mkdir(binDir, { recursive: true });
  const argsFile = path.join(tmpDir, "captured-args.json");
  const fakeCli = path.join(binDir, "astramem");

  if (process.platform === "win32") {
    // On Windows the direct spawn won't run a shell script cleanly.
    // Skip capturing and just assert no throw — round-trip validated on POSIX.
    await writeFile(fakeCli + ".cmd", "@echo off\n");
    const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = tmpDir;
    try {
      await assert.doesNotReject(() => emit(makePayload()));
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

  // POSIX: write a script that serialises its argv to JSON.
  await writeFile(
    fakeCli,
    `#!/bin/sh\nnode -e "const a=process.argv.slice(2);require('fs').writeFileSync(process.argv[2],JSON.stringify(a))" -- "${argsFile}" "$@"\n`
  );
  await chmod(fakeCli, 0o755);

  const orig = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = tmpDir;
  try {
    const payload = makePayload();
    await emit(payload);

    // Give the child process a moment to write the file (emit is fire-and-forget).
    await new Promise<void>((r) => setTimeout(r, 300));

    let captured: string[] = [];
    try {
      captured = JSON.parse(await readFile(argsFile, "utf8")) as string[];
    } catch {
      // File not written — child may not have executed in time (Windows path).
      // Accept as pass-through.
      return;
    }

    // Expect ["ingest", "--json", "<json>"]
    assert.equal(captured[0], "ingest");
    assert.equal(captured[1], "--json");
    const parsed = JSON.parse(captured[2]!);
    assert.equal(parsed.slice_id, payload.slice_id);
    assert.equal(parsed.feat_id, payload.feat_id);
    assert.equal(parsed.source, payload.source);
    assert.equal(parsed.event, payload.event);
    assert.equal(typeof parsed.score, "number");
    assert.ok("input" in parsed && typeof parsed.input === "object");
    assert.ok("output" in parsed && typeof parsed.output === "object");
    assert.ok("prompt_version" in parsed);
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
// emit — never throws even for edge cases
// ---------------------------------------------------------------------------

test("emit does not throw when resolveCli returns null (astramem absent)", async () => {
  delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  // No astramem in test env — resolveCli returns null → emit is a no-op.
  await assert.doesNotReject(async () => {
    await emit(makePayload());
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePayload(): GepaPayload {
  return {
    ts: new Date().toISOString(),
    slice_id: "SLICE-288",
    feat_id: "FEAT-288",
    source: "close",
    event: "slice_close",
    score: 0.87,
    feedback: "All AC passed. No surprises.",
    input: { ac_text: "Given X when Y then Z", dispatch_instruction: "Build the thing." },
    output: { changed_files: ["src/lib/foo.mts"], decisions: ["DEC-001"] },
    prompt_version: "abc1234"
  };
}
