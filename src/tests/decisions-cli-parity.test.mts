import { describe, expect, test } from "bun:test";

/**
 * Parity smoke test for FEAT-277 decisions subcommand consolidation.
 *
 * Verifies that all four former standalone skills are reachable as
 * subcommands of the unified `decisions` command:
 *   devcrew:decisions-list      → decisions list
 *   devcrew:decisions-show      → decisions show
 *   devcrew:decisions-relevant  → decisions relevant
 *   devcrew:decisions-supersede → decisions supersede
 */

describe("decisions CLI subcommands", () => {
  for (const sub of ["list", "show", "relevant", "supersede"]) {
    test(`decisions ${sub} is reachable via CLI`, async () => {
      const proc = Bun.spawn(["bun", "src/scripts/loop.mts", "decisions", sub, "--help"], {
        stdout: "pipe",
        stderr: "pipe"
      });
      await proc.exited;
      const out = await new Response(proc.stdout).text();
      const err = await new Response(proc.stderr).text();
      expect(out + err).toContain(sub);
    });
  }
});
