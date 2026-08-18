import fs from "node:fs/promises";
import path from "node:path";

// Detects when the reviewer ladder ran serially (one reviewer at a time)
// instead of in parallel. The parallel-dispatch contract emitted by
// reviewer-ladder.mts asks callers to fire all reviewer Agent calls in a
// single message. When that contract is violated, review-result artifacts
// land with timestamps spread far apart instead of clustered.
//
// We treat the timestamp span between the earliest and latest review
// artifact for a slice as the signal. Span above `thresholdMs` -> serial.
// Default threshold lives in .claude/loop.json under
// `reviewers.serialTimingThresholdMs` (90s).

export type SerialReviewerResult = {
  serial: boolean;
  spanMs: number;
  reviewCount: number;
  threshold: number;
};

const TIMESTAMP_PREFIX_RE = /^(\d{8}T\d{6}Z)/;

function parseTimestamp(filename: string): number | null {
  const m = filename.match(TIMESTAMP_PREFIX_RE);
  if (!m) return null;
  const ts = m[1]!;
  // YYYYMMDDTHHMMSSZ -> YYYY-MM-DDTHH:MM:SSZ
  const iso = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 11)}:${ts.slice(11, 13)}:${ts.slice(13, 15)}Z`;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

export async function detectSerialReviewer(
  repoPath: string,
  sliceId: string,
  { thresholdMs = 90000 }: { thresholdMs?: number } = {}
): Promise<SerialReviewerResult> {
  const dir = path.join(repoPath, ".claude/artifacts/crew/reviews");
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return { serial: false, spanMs: 0, reviewCount: 0, threshold: thresholdMs };
  }
  const slug = sliceId.toLowerCase();
  // Anchor to surrounding hyphens — `slice-9` must not match `slice-90` etc.
  const needle = `-${slug}-`;
  const matching = entries.filter((f) => f.toLowerCase().includes(needle));
  const stamps = matching.map(parseTimestamp).filter((n): n is number => n !== null);
  if (stamps.length < 2) {
    return { serial: false, spanMs: 0, reviewCount: stamps.length, threshold: thresholdMs };
  }
  const spanMs = Math.max(...stamps) - Math.min(...stamps);
  return {
    serial: spanMs > thresholdMs,
    spanMs,
    reviewCount: stamps.length,
    threshold: thresholdMs
  };
}
