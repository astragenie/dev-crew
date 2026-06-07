function isPlainObject(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isReplaceMarker(v) {
    return isPlainObject(v) && Array.isArray(v.$replace);
}
export function deepMerge(base, override) {
    const out = { ...base };
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
    return out;
}
function dedup(arr) {
    const seen = new Set();
    const out = [];
    for (const item of arr) {
        if (!seen.has(item)) {
            seen.add(item);
            out.push(item);
        }
    }
    return out;
}
