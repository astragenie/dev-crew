// FEAT-219 AC-9 (Surface-A only) — completeness/fitness test.
//
// "No dispatch-assembly site skips injection": every known code-assembled
// ("Surface A" per FEAT-219-architect-review.md) dispatch module must show
// evidence of wiring the shared memory-injection mechanism. This is a
// mechanical grep gate, not a behavioral test — it exists so a future
// dispatch-assembly module added to SURFACE_A_MODULES without any
// memory-context call fails CI and names the offending file, instead of
// silently shipping an agent that starts blind.
//
// Two wiring mechanisms currently coexist by design, not by oversight:
// - post-builder-fanout.mts calls `buildMemoryContext(` directly (AC-8,
//   this residual slice).
// - slice-linker/start-slice.mts predates the buildMemoryContext helper
//   (SLICE-2) and already splices its own equivalent — the
//   `learningsDigest`/`recallBlock` computation — into dispatchInstruction
//   (AC-7, PR #317). Replacing that with a literal `buildMemoryContext(`
//   call is a SLICE-C follow-up per the architect review, not part of this
//   residual's scope, so this test accepts either marker rather than
//   forcing a false failure on already-fixed code.
//
// Surface B (pm/architect markdown-prose dispatch via a `resolve-memory`
// CLI subcommand) is a separate, not-yet-built completeness gate — see
// FEAT-219-architect-review.md SLICE-D. Out of scope here.

import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");

const SURFACE_A_MODULES: Array<{ file: string; matchers: RegExp[]; evidence: string }> = [
  {
    file: "src/scripts/lib/slice-linker/start-slice.mts",
    matchers: [/buildMemoryContext\(/, /learningsDigest/],
    evidence: "buildMemoryContext( call, or the learningsDigest/recallBlock splice (AC-7)"
  },
  {
    file: "src/scripts/lib/post-builder-fanout.mts",
    matchers: [/buildMemoryContext\(/],
    evidence: "buildMemoryContext( call (AC-8)"
  }
];

test("FEAT-219 AC-9: every known Surface-A dispatch-assembly module wires memory-context injection", async () => {
  const unwired: string[] = [];
  for (const mod of SURFACE_A_MODULES) {
    const content = await fs.readFile(path.join(REPO_ROOT, mod.file), "utf8");
    const wired = mod.matchers.some((re) => re.test(content));
    if (!wired) unwired.push(`${mod.file} (expected: ${mod.evidence})`);
  }
  assert.deepEqual(
    unwired,
    [],
    `dispatch-assembly module(s) missing memory-context wiring: ${unwired.join("; ")}`
  );
});
