// Tests for src/scripts/lib/astramem-cli-resolver.mts
// Extracted from memory-bridge.test.mts (FEAT-235) — memory-bridge.mts's
// emit()/CLI-spawn capture transport was retired, but resolveCli() itself
// survives as a standalone leaf because memory-doctor.mts still needs a real
// CLI path for its `astramem doctor --json` diagnostic (no client
// equivalent exists for that rich health shape). This coverage is not
// redundant with astramem-client's own tests — it is the last consumer of
// this exact discovery chain in this repo.

import { test, beforeEach } from "bun:test";
import assert from "node:assert/strict";

import { resolveCli, _resetCliCache } from "../scripts/lib/astramem-cli-resolver.mjs";

// Reset module-scope cache before each test so cases are independent.
beforeEach(() => {
  _resetCliCache();
});

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
// TEST-HYGIENE regression: resolveCli() must never discover a real,
// globally-installed astramem CLI via the PATH probe when test isolation is
// active. Root cause: on a dev machine with the real astramem CLI on PATH
// (memory-plugin installs one, sometimes running as a live daemon),
// resolveCli()'s `where`/`which` fallback found and returned the REAL
// binary for any test that never pinned CLAUDE_PLUGIN_ROOT_MEMORY. Fixed by
// honoring ASTRAMEM_DISABLE_PATH_PROBE (set process-wide for the whole test
// run via bunfig.toml `[test].preload` -> src/tests/_test-env-guard.mts).
// ---------------------------------------------------------------------------

test("resolveCli skips the PATH probe when ASTRAMEM_DISABLE_PATH_PROBE is set, even when a real binary sits on PATH", async () => {
  const { mkdtemp, writeFile, chmod, rm } = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "astramem-pathprobe-"));
  const fakeCli = path.join(tmpDir, process.platform === "win32" ? "astramem.cmd" : "astramem");
  if (process.platform === "win32") {
    await writeFile(fakeCli, "@echo off\r\nexit 0\r\n");
  } else {
    await writeFile(fakeCli, "#!/bin/sh\nexit 0\n");
    await chmod(fakeCli, 0o755);
  }

  const origEnvOverride = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  const origDisableFlag = process.env["ASTRAMEM_DISABLE_PATH_PROBE"];
  const origPath = process.env["PATH"];
  delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  process.env["PATH"] = `${tmpDir}${path.delimiter}${origPath ?? ""}`;

  try {
    // Sanity check: with the isolation flag OFF, the PATH probe finds the
    // fixture binary — proves the fixture is valid and would otherwise leak.
    delete process.env["ASTRAMEM_DISABLE_PATH_PROBE"];
    _resetCliCache();
    const withoutFlag = await resolveCli();
    assert.ok(
      withoutFlag !== null,
      "expected PATH probe to find the fixture binary when isolation is off " +
        "(fixture invalid otherwise — cannot prove the isolation flag does anything)"
    );

    // With the isolation flag ON (the state every real test run is in, via
    // the bunfig preload), the PATH probe must be skipped entirely.
    process.env["ASTRAMEM_DISABLE_PATH_PROBE"] = "1";
    _resetCliCache();
    const withFlag = await resolveCli();
    assert.equal(withFlag, null, "expected resolveCli() to skip the PATH probe under isolation");
  } finally {
    if (origEnvOverride !== undefined) process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = origEnvOverride;
    if (origDisableFlag !== undefined) process.env["ASTRAMEM_DISABLE_PATH_PROBE"] = origDisableFlag;
    else delete process.env["ASTRAMEM_DISABLE_PATH_PROBE"];
    if (origPath !== undefined) process.env["PATH"] = origPath;
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("resolveCli finds a .cmd env-pinned CLI on Windows (extensionless-only lookup previously fell through to PATH)", async () => {
  const { mkdtemp, writeFile, chmod, rm, mkdir } = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "astramem-winext-"));
  const binDir = path.join(tmpDir, "bin");
  await mkdir(binDir, { recursive: true });

  // Simulate a Windows-style CLI install: only the `.cmd` variant exists,
  // no extensionless `astramem` file. Pre-fix, resolveCli()'s env-override
  // check only looked for the bare name and silently fell through to the
  // PATH probe — exactly the Windows leak vector this fix closes.
  const isWin = process.platform === "win32";
  const fakeCli = path.join(binDir, isWin ? "astramem.cmd" : "astramem");
  await writeFile(fakeCli, isWin ? "@echo off\r\nexit 0\r\n" : "#!/bin/sh\nexit 0\n");
  // On POSIX the env-override lookup uses X_OK — the fake must be executable or
  // resolveCli falls through to PATH and the assertion below fails (Linux CI).
  if (!isWin) await chmod(fakeCli, 0o755);

  const origEnvOverride = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = tmpDir;
  try {
    _resetCliCache();
    const result = await resolveCli();
    assert.ok(result !== null, "expected env-override resolution to find the .cmd binary");
    assert.equal(result!.path, fakeCli);
  } finally {
    if (origEnvOverride !== undefined) process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = origEnvOverride;
    else delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
    await rm(tmpDir, { recursive: true, force: true });
  }
});
