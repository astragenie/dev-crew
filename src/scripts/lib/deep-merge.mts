type Plain = Record<string, any>;

function isPlainObject(v: unknown): v is Plain {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isReplaceMarker(v: unknown): v is { $replace: unknown[] } {
  return isPlainObject(v) && Array.isArray((v as { $replace?: unknown }).$replace);
}

export function deepMerge<T extends Plain>(base: T, override: Plain): T {
  const out: Plain = { ...base };
  for (const key of Object.keys(override)) {
    const overrideVal = override[key];
    const baseVal = out[key];

    if (isReplaceMarker(overrideVal)) {
      out[key] = [...overrideVal.$replace];
      continue;
    }
    if (Array.isArray(overrideVal) && Array.isArray(baseVal)) {
      out[key] = dedup([...baseVal, ...overrideVal]);
      continue;
    }
    if (isPlainObject(overrideVal) && isPlainObject(baseVal)) {
      out[key] = deepMerge(baseVal, overrideVal);
      continue;
    }
    out[key] = overrideVal;
  }
  return out as T;
}

function dedup<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const item of arr) {
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}
