// Canonical slice-title handling.
//
// A slice's title is stored in frontmatter (`title:`) since the field was
// introduced; older slices only carry it in the H1 (`# SLICE-NN: <title>`).
// Every consumer (slice-plan, start/complete ceremony, github-sync) must go
// through resolveSliceTitle so the precedence is identical everywhere:
// frontmatter -> H1 -> bare slice id.
export const SLICE_TITLE_MAX = 120;
// "SLICE-42: ..." / "FEAT-007: ..." prefixes are display concerns — the
// stored/bare title never includes them. Strip when resolving so callers
// can prepend the id without double-prefixing.
const ID_PREFIX = /^[A-Z]+-\d+:\s*/;
/**
 * Clamp a title to SLICE_TITLE_MAX characters, cutting at a word boundary
 * where one exists, with a trailing ellipsis. Used on every auto-derived
 * title (e.g. from a feature heading) — derivation must never throw, so
 * over-long inputs are shortened rather than rejected.
 */
export function clampSliceTitle(title) {
    const trimmed = (title || "").trim();
    if (trimmed.length <= SLICE_TITLE_MAX)
        return trimmed;
    const cut = trimmed.slice(0, SLICE_TITLE_MAX - 1);
    const lastSpace = cut.lastIndexOf(" ");
    const head = lastSpace > 60 ? cut.slice(0, lastSpace) : cut;
    return `${head}…`;
}
/**
 * Resolve the bare (id-less) title of a slice: frontmatter `title` first,
 * then the H1 heading, then the slice id as last resort. Always returns a
 * clamped value.
 */
export function resolveSliceTitle(frontmatter, body, sliceId) {
    const fmTitle = typeof frontmatter?.title === "string" ? frontmatter.title.trim() : "";
    if (fmTitle)
        return clampSliceTitle(fmTitle.replace(ID_PREFIX, ""));
    const h1 = (body || "").match(/^#\s+(.+)$/m);
    const h1Title = h1 ? h1[1].trim().replace(ID_PREFIX, "").trim() : "";
    if (h1Title)
        return clampSliceTitle(h1Title);
    return sliceId;
}
/**
 * Display form used in plan artifacts, run briefs, and issue titles:
 * `SLICE-NN: <bare title>`, or just the id when no title is known.
 */
export function displaySliceTitle(frontmatter, body, sliceId) {
    const bare = resolveSliceTitle(frontmatter, body, sliceId);
    return bare === sliceId ? sliceId : `${sliceId}: ${bare}`;
}
