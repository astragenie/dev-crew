import { describe, expect, test } from "bun:test";
import {
  categorizeRejectionReason,
  summarizeRejections
} from "../../scripts/lib/wave/rejection-category.mjs";

describe("categorizeRejectionReason", () => {
  test("conflict_with_<path> reasons categorize as conflict", () => {
    expect(categorizeRejectionReason("conflict_with_src/foo.mts")).toBe("conflict");
  });

  test("missing_touches_files_solo_only categorizes as missing_confidence", () => {
    expect(categorizeRejectionReason("missing_touches_files_solo_only")).toBe("missing_confidence");
  });

  test("pre-flight reasons categorize as other", () => {
    expect(
      categorizeRejectionReason("pre-flight: autonomous_safe=false AND pm_risk_level=0.80 >= 0.7")
    ).toBe("other");
    expect(categorizeRejectionReason("pre-flight: depends_on unfinished [FEAT-1]")).toBe("other");
    expect(categorizeRejectionReason("pre-flight: help_request open")).toBe("other");
  });

  test("unrecognized reason strings fall back to other rather than throwing", () => {
    expect(categorizeRejectionReason("some_future_reason")).toBe("other");
  });
});

describe("summarizeRejections", () => {
  test("returns all-zero breakdown for an empty list", () => {
    expect(summarizeRejections([])).toEqual({ conflict: 0, missingConfidence: 0, other: 0 });
  });

  test("distinguishes conflict from missing-confidence in a mixed list — the core AC-5 ask", () => {
    const breakdown = summarizeRejections([
      { sliceId: "SLICE-A", reason: "conflict_with_src/a.mts" },
      { sliceId: "SLICE-B", reason: "conflict_with_src/b.mts" },
      { sliceId: "SLICE-C", reason: "missing_touches_files_solo_only" },
      { sliceId: "SLICE-D", reason: "pre-flight: help_request open" }
    ]);
    expect(breakdown).toEqual({ conflict: 2, missingConfidence: 1, other: 1 });
  });
});
