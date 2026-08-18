#!/usr/bin/env node
// validate-dispatch-markers.mts — <task-scoped> marker balance + keyword
// confinement check for dispatch-template producers (FEAT-263 T1 / T5,
// extraction-quality plan v2).
//
// Background: dispatch headers used to mix objective prose with hard orders
// (forbidden dispatches, return instructions, budget gates) in one
// continuous paragraph. dispatch.mts's buildDispatchInstruction and
// start-slice.mts's wrapLearningsDigestTaskScoped now separate objective
// prose from ALL task-scoped orders / re-presented digest content, wrapping
// the latter in a single, non-nested <task-scoped>...</task-scoped> region.
// This is groundwork for upstream astramem-local#374's E3 (extractor-side
// skip of marked regions) — the marker alone has zero chaff effect today,
// but a malformed marker (unbalanced, nested, or a leaking keyword) would
// silently defeat that future skip logic, hence this gate.
//
// Scope: ONLY the two template producers this slice rewrote —
// buildDispatchInstruction (dispatch.mts, all three routes: single-agent
// slice-build, parallel-fe-be, and orchestrate-slice) and
// wrapLearningsDigestTaskScoped (start-slice.mts, the T5 recall/learnings
// digest wrap). This validator does NOT scan arbitrary agent output, ad-hoc
// dispatch prose written by hand elsewhere, or 3rdparty agent templates —
// per the plan's "Known limits, accepted" note, ad-hoc/3rdparty/user
// dispatches never carry the marker at all, and validating free-form agent
// output is explicitly out of scope.
//
// validateDispatchMarkers() and checkMarkerBalance() are exported so tests
// can call them directly without spawning. The entry point sets
// process.exitCode on failure (never process.exit), matching
// validate-decline-citations.mts / validate-agent-refs.mts.

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDispatchInstruction,
  TASK_SCOPED_ORDER_KEYWORDS,
  wrapLearningsDigestTaskScoped
} from "./lib/slice-linker.mjs";

const OPEN_TAG = "<task-scoped>";
const CLOSE_TAG = "</task-scoped>";

export interface MarkerCheckResult {
  ok: boolean;
  errors: string[];
}

/**
 * Scans one producer's output string for balanced, non-nested
 * <task-scoped>/</task-scoped> markers: every open must have a matching
 * close, no unmatched close, and a region must fully close before a new one
 * opens (sibling/sequential regions are fine — a marker opening again before
 * the prior one's close is not). Returns the resolved [start, end) regions
 * alongside any balance errors, so a caller can reuse the regions for a
 * follow-up keyword-confinement check.
 */
function scanTaskScopedRegions(
  label: string,
  text: string
): { regions: Array<[number, number]>; errors: string[] } {
  const errors: string[] = [];
  const regions: Array<[number, number]> = [];
  let openCount = 0;
  let regionStart = -1;
  let cursor = 0;

  while (cursor < text.length) {
    const nextOpen = text.indexOf(OPEN_TAG, cursor);
    const nextClose = text.indexOf(CLOSE_TAG, cursor);
    if (nextOpen === -1 && nextClose === -1) break;

    const closeIsNext = nextClose !== -1 && (nextOpen === -1 || nextClose < nextOpen);
    if (closeIsNext) {
      if (openCount === 0) {
        errors.push(`${label}: unmatched </task-scoped> at offset ${nextClose}`);
      } else {
        openCount -= 1;
        regions.push([regionStart, nextClose + CLOSE_TAG.length]);
        regionStart = -1;
      }
      cursor = nextClose + CLOSE_TAG.length;
      continue;
    }

    if (openCount > 0) {
      errors.push(`${label}: nested <task-scoped> at offset ${nextOpen} (markers must not nest)`);
    } else {
      regionStart = nextOpen;
    }
    openCount += 1;
    cursor = nextOpen + OPEN_TAG.length;
  }

  if (openCount > 0) {
    errors.push(`${label}: unclosed <task-scoped> marker (${openCount} still open)`);
  }
  return { regions, errors };
}

/**
 * Every known order-block keyword (sourced from dispatch.mts's
 * TASK_SCOPED_ORDER_KEYWORDS, so this list can never drift out of sync with
 * what the templates actually emit) must appear only inside a marked
 * region — a "FORBIDDEN:"/"GATES:"/"RETURN:"/"ECHO:" label sitting outside
 * any <task-scoped> region would leak a task-scoped order into the
 * un-marked, extractable part of the dispatch text.
 */
function findKeywordLeaks(label: string, text: string, regions: Array<[number, number]>): string[] {
  const errors: string[] = [];
  for (const keyword of TASK_SCOPED_ORDER_KEYWORDS) {
    const re = new RegExp(`\\b${keyword}:`, "g");
    let match: RegExpExecArray | null = null;
    while ((match = re.exec(text)) !== null) {
      const idx = match.index;
      const inside = regions.some(([start, end]) => idx >= start && idx < end);
      if (!inside) {
        errors.push(
          `${label}: keyword "${keyword}:" found outside a <task-scoped> region at offset ${idx}`
        );
      }
    }
  }
  return errors;
}

/** Combines scanTaskScopedRegions (balance/nesting) + findKeywordLeaks (confinement) into one pass/fail result. */
export function checkMarkerBalance(label: string, text: string): MarkerCheckResult {
  const { regions, errors: balanceErrors } = scanTaskScopedRegions(label, text);
  const keywordErrors = findKeywordLeaks(label, text, regions);
  const errors = [...balanceErrors, ...keywordErrors];
  return { ok: errors.length === 0, errors };
}

interface Fixture {
  label: string;
  build: () => string;
}

// Representative invocations covering every buildDispatchInstruction route
// this slice rewrote, plus wrapLearningsDigestTaskScoped. repoPath points at
// a nonexistent directory on purpose — every fixture's sliceContent omits
// needs_contract, so needsContractPreflight() short-circuits before any
// filesystem read (see dispatch.mts), keeping this a pure in-memory check.
const FIXTURE_REPO_PATH = path.join("__validate-dispatch-markers-fixture__", "repo");

function buildFixtures(): Fixture[] {
  const common = {
    sliceId: "SLICE-FIXTURE-1",
    title: "Fixture slice",
    sliceFile: null as string | null,
    repoPath: FIXTURE_REPO_PATH,
    resolvedGoal: "Fixture goal for marker validation"
  };
  const dispatchLimits = { maxSubagentsPerSlice: 3, preferInlineFor: ["test-fix"] };

  return [
    {
      label: "buildDispatchInstruction (single-agent, no dispatchLimits)",
      build: () => buildDispatchInstruction({ ...common, orchestratorMode: "slice-build" })
    },
    {
      label: "buildDispatchInstruction (single-agent, with dispatchLimits)",
      build: () =>
        buildDispatchInstruction({
          ...common,
          orchestratorMode: "slice-build",
          dispatchLimits
        })
    },
    {
      label: "buildDispatchInstruction (parallel-fe-be, no dispatchLimits)",
      build: () =>
        buildDispatchInstruction({
          ...common,
          orchestratorMode: "slice-build",
          sliceContent: "---\ntags: [surface:ui, surface:api]\n---\n# Fixture\n"
        })
    },
    {
      label: "buildDispatchInstruction (parallel-fe-be, with dispatchLimits)",
      build: () =>
        buildDispatchInstruction({
          ...common,
          orchestratorMode: "slice-build",
          sliceContent: "---\ntags: [surface:ui, surface:api]\n---\n# Fixture\n",
          dispatchLimits
        })
    },
    {
      label: "buildDispatchInstruction (orchestrate-slice mode)",
      build: () => buildDispatchInstruction({ ...common, orchestratorMode: "orchestrate-slice" })
    },
    {
      label: "wrapLearningsDigestTaskScoped (non-empty digest)",
      build: () =>
        wrapLearningsDigestTaskScoped(
          "## Operational learnings\n- recurring-flake: Retry the daemon check before marking unreachable."
        )
    },
    {
      label: "wrapLearningsDigestTaskScoped (null digest)",
      build: () => wrapLearningsDigestTaskScoped(null)
    }
  ];
}

export interface ValidateDispatchMarkersResult {
  ok: boolean;
  results: Array<{ label: string; ok: boolean; errors: string[] }>;
}

export function validateDispatchMarkers(): ValidateDispatchMarkersResult {
  const results = buildFixtures().map(({ label, build }) => {
    const { ok, errors } = checkMarkerBalance(label, build());
    return { label, ok, errors };
  });
  return { ok: results.every((r) => r.ok), results };
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainEntry()) {
  const { ok, results } = validateDispatchMarkers();
  if (!ok) {
    console.error("Dispatch-marker validation failed:");
    for (const r of results) {
      if (r.ok) continue;
      for (const err of r.errors) {
        console.error(`  - ${err}`);
      }
    }
    process.exitCode = 1;
  } else {
    console.log(
      `Dispatch-marker validation OK — ${results.length} producer fixture(s) checked, all balanced and confined.`
    );
  }
}
