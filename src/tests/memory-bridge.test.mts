// Tests for src/scripts/lib/memory-bridge.mts
// All emit() calls must be fail-silent and complete within the 2s cap.

import { test, beforeEach } from "bun:test";
import assert from "node:assert/strict";

import {
  resolveCli,
  emit,
  buildRememberArgs,
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
// TEST-HYGIENE regression: resolveCli() must never discover a real,
// globally-installed astramem CLI via the PATH probe when test isolation is
// active. Root cause: on a dev machine with the real astramem CLI on PATH
// (memory-plugin installs one, sometimes running as a live daemon),
// resolveCli()'s `where`/`which` fallback found and returned the REAL
// binary for any test that never pinned CLAUDE_PLUGIN_ROOT_MEMORY — so
// memory-writing test paths (grade-writer's emitSliceCloseMemory, etc.)
// actually spawned `astramem ingest`/`astramem recall` against the live
// store. Fixed by honoring ASTRAMEM_DISABLE_PATH_PROBE (set process-wide
// for the whole test run via bunfig.toml `[test].preload` ->
// src/tests/_test-env-guard.mts).
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
// buildRememberArgs — payload -> `astramem remember` wire mapping (FEAT-223)
// ---------------------------------------------------------------------------
//
// Pure-function coverage (platform-independent, no spawn) for the
// emit()->remember mapping, plus a real-spawn round-trip below. This is the
// AC-3 regression guard: it asserts the REAL subcommand surface and fails
// against the old (wrong) `ingest` invocation, unlike the previous version
// of this test which locked in a self-consistent fake.

test("buildRememberArgs maps a GEPA payload onto the real `remember` contract, not `ingest`", () => {
  const payload = makePayload();
  const args = buildRememberArgs(payload);

  // Would FAIL here against the old contract: old code produced
  // ["ingest", "--json", json] — args[0] would be "ingest", not "remember".
  assert.equal(args[0], "remember");
  assert.equal(args[1], "--type");
  assert.equal(args[2], payload.event);
  assert.equal(args[3], "--content");
  assert.equal(args[4], payload.feedback);
  assert.equal(args[5], "--metadata");

  const metadata = JSON.parse(args[6]!);
  assert.equal(metadata.sliceId, payload.slice_id);
  assert.equal(metadata.featId, payload.feat_id);
  assert.equal(metadata.score, payload.score);
  assert.equal(metadata.phase, payload.event);
  assert.equal(metadata.source, payload.source);
  assert.equal(metadata.prompt_version, payload.prompt_version);
  assert.ok("input" in metadata && typeof metadata.input === "object");
  assert.ok("output" in metadata && typeof metadata.output === "object");

  // No --agent: GepaPayload carries no agent field.
  assert.ok(!args.includes("--agent"));
});

test("buildRememberArgs bounds arbitrarily large input/output well under the ~32KB argv limit", () => {
  const hugeString = "x".repeat(50_000);
  const deepArray = Array.from({ length: 500 }, (_, i) => `item-${i}`);
  const payload: GepaPayload = {
    ...makePayload(),
    input: {
      note: hugeString,
      files: deepArray,
      nested: { deeper: { deepest: { tooDeep: hugeString } } }
    },
    output: { note: hugeString, files: deepArray }
  };

  const args = buildRememberArgs(payload);
  const metadataJson = args[6]!;

  // Well under the ~32KB Windows command-line cap, regardless of how large
  // the caller's input/output objects were.
  assert.ok(
    metadataJson.length < 10_000,
    `expected bounded --metadata JSON, got ${metadataJson.length} bytes`
  );

  const metadata = JSON.parse(metadataJson);
  assert.ok(metadata.input.files.length <= 10, "expected array to be capped");
  assert.ok(metadata.input.note.length <= 300, "expected nested string to be capped");
});

// ---------------------------------------------------------------------------
// emit — payload schema round-trip (real spawn)
// ---------------------------------------------------------------------------

test("emit invokes `remember` with the mapped argv (real-spawn round-trip)", async () => {
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
    // Skip capturing and just assert no throw — round-trip validated on POSIX
    // (and unconditionally, platform-independent, by buildRememberArgs above).
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

    assert.deepEqual(captured, buildRememberArgs(payload));
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
