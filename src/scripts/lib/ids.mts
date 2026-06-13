export type FeatId = string & { readonly __brand: "FeatId" };
export type SliceId = string & { readonly __brand: "SliceId" };
export type SpecId = string & { readonly __brand: "SpecId" };
export type DecId = string & { readonly __brand: "DecId" };
export type GradeId = string & { readonly __brand: "GradeId" };

const FEAT_RE = /^FEAT-(\d+)$/;
const SLICE_RE = /^SLICE-(\d+)$/;
const SPEC_RE = /^SPEC-(\d+)$/;
const DEC_RE = /^DEC-(\d+)$/;
const GRADE_RE = /^GRADE-(\d+)$/;

function validSuffix(digits: string): boolean {
  return digits === "0" || digits[0] !== "0";
}

export function parseFeatId(raw: string): FeatId | null {
  const m = FEAT_RE.exec(raw);
  if (m === null || !validSuffix(m[1] as string)) return null;
  return raw as FeatId;
}

export function parseSliceId(raw: string): SliceId | null {
  const m = SLICE_RE.exec(raw);
  if (m === null || !validSuffix(m[1] as string)) return null;
  return raw as SliceId;
}

export function parseSpecId(raw: string): SpecId | null {
  const m = SPEC_RE.exec(raw);
  if (m === null || !validSuffix(m[1] as string)) return null;
  return raw as SpecId;
}

export function parseDecId(raw: string): DecId | null {
  const m = DEC_RE.exec(raw);
  if (m === null || !validSuffix(m[1] as string)) return null;
  return raw as DecId;
}

export function parseGradeId(raw: string): GradeId | null {
  const m = GRADE_RE.exec(raw);
  if (m === null || !validSuffix(m[1] as string)) return null;
  return raw as GradeId;
}
