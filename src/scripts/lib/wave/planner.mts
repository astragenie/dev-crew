// src/scripts/lib/wave/planner.mts
// Greedy wave packer: given ranked slice candidates, fills up to waveSize
// slots whose touches_files don't conflict. Missing-confidence candidates
// never block later well-specified candidates from packing (FEAT-276/
// SLICE-179) -- they're deferred and only granted a solo slot as a last
// resort, when nothing else in the ranked list could be packed at all.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PathSet } from "./conflict.mjs";
import { readTouchesFiles } from "./touches-files.mjs";
import { classifySliceShape } from "../classify-slice-shape.mjs";
import type {
  SliceCandidate,
  SlicePriority,
  WavePlan,
  WavePlanItem,
  WaveRejection
} from "./types.mjs";

export type PackOpts = {
  waveSize: number;
  sliceCommand: string;
  waveId: string;
};

// Best-effort shape classification from declared/inferred touches_files.
// No diff stats exist at plan time (pre-dispatch), so added/removed/
// exportDelta default to 0 — same heuristic parseSliceFiles() uses in
// slice-linker/start-slice.mts. This under-counts "single-module-edit"
// LOC gates but never mis-classifies doc/config/test-only shapes, which
// only look at file paths.
function shapeForPaths(paths: string[]): string {
  const files = paths.map((path) => ({ path, added: 0, removed: 0, exportDelta: 0 }));
  return classifySliceShape({ files }).shape;
}

export function packWave(ranked: SliceCandidate[], opts: PackOpts): WavePlan {
  const picked: SliceCandidate[] = [];
  const rejected: WaveRejection[] = [];
  const pickedPaths = new PathSet();
  const missingQueue: SliceCandidate[] = [];

  for (const cand of ranked) {
    if (picked.length >= opts.waveSize) break;

    if (cand.touches.confidence === "missing") {
      // Defer: ranking position must never decide whether a missing-
      // confidence candidate poisons the whole pack. Resolved after the
      // full ranked list has been considered (see below).
      missingQueue.push(cand);
      continue;
    }

    const conflict = pickedPaths.conflictingPath(cand.touches.paths);
    if (conflict !== null) {
      rejected.push({
        sliceId: cand.sliceId,
        reason: `conflict_with_${conflict}`
      });
      continue;
    }

    picked.push(cand);
    pickedPaths.addAll(cand.touches.paths);
  }

  if (picked.length === 0 && missingQueue.length > 0) {
    // Nothing well-specified could be packed at all -- dispatch the
    // top-ranked missing-confidence candidate solo rather than starving
    // the wave forever. Any other missing-confidence candidates still
    // lose their slot, but with a visible reason rather than silently.
    const [solo, ...rest] = missingQueue as [SliceCandidate, ...SliceCandidate[]];
    picked.push(solo);
    for (const cand of rest) {
      rejected.push({ sliceId: cand.sliceId, reason: "missing_touches_files_solo_only" });
    }
  } else {
    for (const cand of missingQueue) {
      rejected.push({ sliceId: cand.sliceId, reason: "missing_touches_files_solo_only" });
    }
  }

  const items: WavePlanItem[] = picked.map((c) => ({
    sliceId: c.sliceId,
    featureId: c.featureId,
    worktreeBranch: `wave/${opts.waveId}/${c.sliceId}`,
    sliceCommand: opts.sliceCommand,
    shape: shapeForPaths(c.touches.paths)
  }));

  return {
    waveId: opts.waveId,
    size: items.length,
    items,
    rejected,
    config: { waveSize: opts.waveSize, sliceCommand: opts.sliceCommand }
  };
}

// ---------------------------------------------------------------------------
// loadCandidates — walks pending slices + joins parent FEATs from disk
// ---------------------------------------------------------------------------

const SLICES_PENDING = ".claude/artifacts/loop/ai-loop/slices/pending";
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

function parseFrontmatterPlanner(raw: string): Record<string, string | string[]> {
  const m = raw.match(FRONTMATTER_RE);
  if (!m || !m[1]) return {};
  const out: Record<string, string | string[]> = {};
  let key: string | null = null;
  let acc: string[] | null = null;
  for (const line of m[1].split("\n")) {
    if (line.startsWith("  - ") && key !== null && acc !== null) {
      acc.push(line.slice(4).trim());
      continue;
    }
    if (acc !== null && key !== null) {
      out[key] = acc;
      acc = null;
      key = null;
    }
    const kv = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!kv || !kv[1]) continue;
    const k = kv[1];
    const v = kv[2] ?? "";
    if (v === "") {
      key = k;
      acc = [];
    } else {
      out[k] = v.trim();
    }
  }
  if (acc !== null && key !== null) out[key] = acc;
  return out;
}

function loadFeatureMap(repoRoot: string): Map<string, Record<string, string | string[]>> {
  const map = new Map<string, Record<string, string | string[]>>();
  for (const state of ["triaged", "in-progress"]) {
    const dir = join(repoRoot, ".claude/artifacts/loop/backlog", state);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".md")) continue;
      const fm = parseFrontmatterPlanner(readFileSync(join(dir, name), "utf8"));
      const id = String(fm["id"] ?? name.replace(/\.md$/, ""));
      map.set(id, fm);
    }
  }
  return map;
}

function asPriority(v: unknown): SlicePriority {
  const s = String(v ?? "P3");
  if (s === "P0" || s === "P1" || s === "P2") return s;
  return "P3";
}

function asNumber(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asBoolean(v: unknown, fallback: boolean): boolean {
  if (v === "true" || v === true) return true;
  if (v === "false" || v === false) return false;
  return fallback;
}

function loadDoneFeatureSet(repoRoot: string): Set<string> {
  const set = new Set<string>();
  const dir = join(repoRoot, ".claude/artifacts/loop/backlog/done");
  if (!existsSync(dir)) return set;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".md")) continue;
    const id = name.replace(/\.md$/, "");
    set.add(id);
  }
  return set;
}

const PRE_FLIGHT_RISK_THRESHOLD = 0.7;

/**
 * Apply spec-required pre-flight drops before ranking + packing.
 * Returns `passed` candidates and `dropped` rejections with explanatory reasons.
 *
 * Currently enforced:
 *   - autonomousSafe=false AND pmRiskLevel >= 0.7 → unsafe-without-review
 *   - any unfinished dependsOn FEAT (not in backlog/done/) → blocked-by-dep
 *
 * Deferred (no clean signal source yet):
 *   - helpRequestOpen badge — needs crew-side workflow badge lookup
 *   - "FEAT already in-progress in another worktree" — needs git-worktree
 *     state inspection across the repo
 */
export function applyPreFlightDrops(
  cands: SliceCandidate[],
  repoRoot: string
): { passed: SliceCandidate[]; dropped: WaveRejection[] } {
  const passed: SliceCandidate[] = [];
  const dropped: WaveRejection[] = [];
  const doneFeatures = loadDoneFeatureSet(repoRoot);

  for (const c of cands) {
    if (!c.autonomousSafe && c.pmRiskLevel >= PRE_FLIGHT_RISK_THRESHOLD) {
      dropped.push({
        sliceId: c.sliceId,
        reason: `pre-flight: autonomous_safe=false AND pm_risk_level=${c.pmRiskLevel.toFixed(2)} >= ${PRE_FLIGHT_RISK_THRESHOLD}`
      });
      continue;
    }
    const unfinishedDeps = c.dependsOn.filter((d) => !doneFeatures.has(d));
    if (unfinishedDeps.length > 0) {
      dropped.push({
        sliceId: c.sliceId,
        reason: `pre-flight: depends_on unfinished [${unfinishedDeps.join(", ")}]`
      });
      continue;
    }
    if (c.helpRequestOpen) {
      dropped.push({
        sliceId: c.sliceId,
        reason: "pre-flight: help_request open"
      });
      continue;
    }
    passed.push(c);
  }
  return { passed, dropped };
}

export function loadCandidates(repoRoot: string): SliceCandidate[] {
  const slicesDir = join(repoRoot, SLICES_PENDING);
  if (!existsSync(slicesDir)) return [];
  const featureMap = loadFeatureMap(repoRoot);
  const out: SliceCandidate[] = [];

  for (const name of readdirSync(slicesDir)) {
    if (!name.endsWith(".md")) continue;
    const slicePath = join(slicesDir, name);
    const raw = readFileSync(slicePath, "utf8");
    const fm = parseFrontmatterPlanner(raw);
    const sliceId = String(fm["id"] ?? name.replace(/\.md$/, ""));
    const featureId = String(fm["feature"] ?? "");
    const feature = featureMap.get(featureId);
    if (!feature) continue;

    const touches = readTouchesFiles(slicePath, repoRoot);
    const dependsOnRaw = feature["depends_on"];
    const dependsOn = Array.isArray(dependsOnRaw) ? dependsOnRaw.map(String) : [];

    out.push({
      sliceId,
      featureId,
      slicePath,
      priority: asPriority(fm["priority"] ?? feature["priority"]),
      compositeScore: asNumber(feature["composite_score"], 0),
      strategicFit: asNumber(feature["pm_strategic_fit"], 0),
      touches,
      pmRiskLevel: asNumber(feature["pm_risk_level"], 0),
      autonomousSafe: asBoolean(feature["autonomous_safe"], false),
      retryCount: asNumber(fm["wave_attempts"], 0),
      pendingFix: asBoolean(fm["pending_fix"], false),
      dependsOn,
      helpRequestOpen: false
    });
  }
  return out;
}
