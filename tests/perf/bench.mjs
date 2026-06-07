import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
/**
 * Benchmark a CLI command using spawnSync.
 *
 * @param label  Human-readable label for this benchmark.
 * @param cmd    Executable to run (e.g. "node").
 * @param args   Arguments array (e.g. ["scripts/loop.mjs", "brief", "--repo", "."]).
 * @param opts   Optional: warmup (default 3) and runs (default 10).
 */
export async function benchCommand(label, cmd, args, opts) {
    const warmup = opts?.warmup ?? 3;
    const runs = opts?.runs ?? 10;
    const samples = [];
    // Warm-up iterations (discarded)
    for (let i = 0; i < warmup; i++) {
        spawnSync(cmd, args, { shell: false, encoding: "utf8" });
    }
    // Measured iterations
    for (let i = 0; i < runs; i++) {
        const start = performance.now();
        const result = spawnSync(cmd, args, { shell: false, encoding: "utf8" });
        const elapsed = performance.now() - start;
        if (result.status !== 0) {
            throw new Error(`benchCommand "${label}": process exited ${result.status}. stderr: ${result.stderr}`);
        }
        samples.push(elapsed);
    }
    // Sort ascending for percentile computation
    const sorted = [...samples].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(runs / 2)];
    const p90 = sorted[Math.floor(runs * 0.9)];
    return {
        label,
        p50_ms: Math.round(p50 * 10) / 10,
        p90_ms: Math.round(p90 * 10) / 10,
        samples: samples.map((s) => Math.round(s * 10) / 10)
    };
}
