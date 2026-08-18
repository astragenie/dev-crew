// TEST-HYGIENE regression guard: no test may ever spawn a real, globally
// installed astramem CLI. Bun preloads this file (see `[test].preload` in
// bunfig.toml) before ANY test file runs, so the guard applies process-wide
// regardless of which test file (or future test file) forgets to isolate
// `CLAUDE_PLUGIN_ROOT_MEMORY`.
//
// Root cause (2026-07): resolveCli() (now src/scripts/lib/astramem-cli-resolver.mts
// — extracted from the since-deleted memory-bridge.mts by FEAT-235) falls
// back to a `where`/`which` PATH probe whenever CLAUDE_PLUGIN_ROOT_MEMORY is
// unset, or when the env-pinned bin can't be resolved (a separate Windows
// extension-mismatch bug, also fixed alongside this guard). On a dev machine
// with the real astramem CLI on PATH (memory-plugin installs one, and it may
// be running as a live daemon), that PATH probe found and returned the REAL
// binary — so memory-writing test paths (grade-writer's emitSliceCloseMemory,
// slice-start's recall, phase-gate's failure emit, etc.) actually spawned
// `astramem ingest` / `astramem recall` against the live store. Evidence:
// `astramem recall --query "slice lesson"` surfaced entries like
// "Real lesson [SLICE-01]" that trace directly to grade.test.mts fixtures.
//
// Fix: resolveCli() honors ASTRAMEM_DISABLE_PATH_PROBE to skip step 2 (the
// PATH probe) entirely. This preload sets it once, for the whole test
// process, before any test can import that resolver. Production dispatch
// code never sets this flag, so real PATH discovery is unaffected there.
// The same flag also gates @astragenie/astramem-client's own probeCliPath()
// (resolve.js) — one shared test-isolation contract, since FEAT-235 moved
// every hot capture/recall path onto that shared client.
//
// This does NOT disable the env-pinned override path (step 1) — tests that
// deliberately point CLAUDE_PLUGIN_ROOT_MEMORY at a throwaway fake CLI in a
// temp dir (astramem-cli-resolver.test.mts, memory-doctor.test.mts) continue
// to work exactly as before.
process.env["ASTRAMEM_DISABLE_PATH_PROBE"] = "1";
