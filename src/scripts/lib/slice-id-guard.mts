// Shared sliceId validation guard used by marker modules.
//
// Extracted from fanout-marker.mts so all marker types use identical
// path-traversal protection. No I/O, no config, no side effects.

export const SLICE_ID_RE = /^[A-Za-z0-9_-]+$/;

export function safeSliceId(sliceId: string): string {
  if (!SLICE_ID_RE.test(sliceId)) {
    throw new Error(`Invalid sliceId for marker path: ${sliceId}`);
  }
  return sliceId;
}
