// TEST-HYGIENE regression guard: no test may ever spawn a real, globally
// installed astramem CLI. Bun preloads this file (see `[test].preload` in
// bunfig.toml) before ANY test file runs, so the guard applies process-wide
// regardless of which test file (or future test file) forgets to isolate
// `CLAUDE_PLUGIN_ROOT_MEMORY`.
//
// Root cause (2026-07): resolveCli() in memory-bridge.mts falls back to a
// `where`/`which` PATH probe whenever CLAUDE_PLUGIN_ROOT_MEMORY is unset, or
// when the env-pinned bin can't be resolved (a separate Windows
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
// process, before any test can import memory-bridge.mts. Production dispatch
// code never sets this flag, so real PATH discovery is unaffected there.
//
// This does NOT disable the env-pinned override path (step 1) — tests that
// deliberately point CLAUDE_PLUGIN_ROOT_MEMORY at a throwaway fake CLI in a
// temp dir (memory-bridge.test.mts, memory-recall.test.mts) continue to work
// exactly as before.
process.env["ASTRAMEM_DISABLE_PATH_PROBE"] = "1";
