import fs from "node:fs/promises";
import path from "node:path";
const COST_INSIGHTS_DIR_PARTS = [".claude", "artifacts", "crew", "cost-insights"];
const COST_DIR_PARTS = [".claude", "artifacts", "crew", "cost"];
// Module-scope regex constants for hot-path functions (Win 6 — perf).
const CRLF_SPLIT_RE = /\r?\n/;
const FM_KEY_VALUE_RE = /^([\w_]+):\s*(.*)$/;
const HIGH_SEVERITY_HEADING_RE = /^###\s+\[HIGH\]\s+([\w-]+)/i;
const COST_ADVISE_FILE_RE = /-cost-advise-.+\.md$/;
const COST_REPORT_AGGREGATE_FILE_RE = /-cost-report-aggregate-.+\.md$/;
async function parseFrontmatter(text) {
    if (!text.startsWith("---"))
        return { fm: null, body: text };
    const end = text.indexOf("\n---", 3);
    if (end < 0)
        return { fm: null, body: text };
    const block = text.slice(3, end).trim();
    const body = text.slice(end + 4);
    const fm = {};
    for (const line of block.split(CRLF_SPLIT_RE)) {
        const m = line.match(FM_KEY_VALUE_RE);
        if (!m)
            continue;
        let v = m[2].trim();
        if (v.startsWith('"') && v.endsWith('"')) {
            try {
                v = JSON.parse(v);
            }
            catch {
                /* keep raw string on parse failure */
            }
        }
        fm[m[1]] = v;
    }
    return { fm, body };
}
function extractHighSeverityFindings(body) {
    const findings = [];
    const lines = body.split(CRLF_SPLIT_RE);
    for (const line of lines) {
        const m = line.match(HIGH_SEVERITY_HEADING_RE);
        if (m) {
            findings.push({ id: m[1], severity: "high" });
        }
    }
    return findings;
}
async function loadCostAdviseFiles(repoPath, limit = 20) {
    const dir = path.join(repoPath, ...COST_INSIGHTS_DIR_PARTS);
    const files = [];
    let entries;
    try {
        entries = await fs.readdir(dir);
    }
    catch {
        return [];
    }
    for (const e of entries) {
        if (COST_ADVISE_FILE_RE.test(e))
            files.push({ dir, name: e });
    }
    files.sort((a, b) => b.name.localeCompare(a.name));
    const top = files.slice(0, limit);
    const results = [];
    for (const { dir: d, name } of top) {
        const f = path.join(d, name);
        try {
            const text = await fs.readFile(f, "utf8");
            const { fm, body } = await parseFrontmatter(text);
            results.push({ path: f, fm: fm || {}, body });
        }
        catch {
            /* skip unreadable / malformed files silently */
        }
    }
    return results;
}
export async function getHighSeverityCostAlerts(repoPath, windowSlices = 3) {
    const adviseFiles = await loadCostAdviseFiles(repoPath, windowSlices);
    const alerts = [];
    for (const file of adviseFiles) {
        const findings = extractHighSeverityFindings(file.body);
        for (const f of findings) {
            alerts.push({
                id: f.id,
                severity: f.severity,
                reportPath: file.path,
                slice: file.fm.run_title || file.fm.slice || null
            });
        }
    }
    return alerts;
}
// Count high-severity cost alerts across recent reports.
// Used by checkStopConditions to decide whether to halt.
export async function countHighSeverityCostAlerts(repoPath, windowSlices = 3) {
    const alerts = await getHighSeverityCostAlerts(repoPath, windowSlices);
    return alerts.filter((a) => a.severity === "high").length;
}
// ---------------------------------------------------------------------------
// Aggregate cost report loader (SLICE-52)
// ---------------------------------------------------------------------------
function parseUsd(raw) {
    if (typeof raw === "number")
        return Number.isFinite(raw) ? raw : null;
    if (typeof raw === "string") {
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
function parseSourceCount(raw) {
    if (typeof raw === "number")
        return Number.isInteger(raw) ? raw : null;
    if (typeof raw === "string") {
        const n = Number.parseInt(raw, 10);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
/**
 * Parse a single markdown file into an AggregateCostReport.
 * Returns null when the file cannot be read or frontmatter is missing/invalid.
 */
async function parseAggregateReportFile(filepath) {
    let text;
    try {
        text = await fs.readFile(filepath, "utf8");
    }
    catch {
        return null;
    }
    // Re-use the inline parseFrontmatter pattern (same shape as slice-cost-ceiling.mts)
    if (!text.startsWith("---"))
        return null;
    const end = text.indexOf("\n---", 3);
    if (end < 0)
        return null;
    const block = text.slice(3, end).trim();
    const fm = {};
    for (const line of block.split(CRLF_SPLIT_RE)) {
        const m = line.match(FM_KEY_VALUE_RE);
        if (!m)
            continue;
        let v = m[2].trim();
        if (v.startsWith('"') && v.endsWith('"')) {
            try {
                v = JSON.parse(v);
            }
            catch {
                /* keep raw string */
            }
        }
        fm[m[1]] = v;
    }
    // Defense-in-depth: frontmatter must declare aggregate_all === true
    if (fm.aggregate_all !== true && fm.aggregate_all !== "true")
        return null;
    return {
        path: filepath,
        slice: typeof fm.slice === "string" ? fm.slice : null,
        runTitle: typeof fm.run_title === "string" ? fm.run_title : null,
        usd: parseUsd(fm.usd),
        createdAt: typeof fm.created_at === "string" ? fm.created_at : null,
        aggregateAll: true,
        sourceCount: parseSourceCount(fm.source_count)
    };
}
/**
 * Load aggregate cost reports from `.claude/artifacts/crew/cost/`.
 * Filename must match `/-cost-report-aggregate-.+\.md$/` and frontmatter
 * must declare `aggregate_all: true`. Sorted newest-first by filename.
 * Returns `{ current: null, reports: [], dir }` when the directory
 * does not exist or no reports match — callers MUST fail-open.
 */
export async function loadAggregateCostReport(repoPath, opts) {
    const dir = path.join(repoPath, ...COST_DIR_PARTS);
    const limit = opts?.limit ?? 10;
    let entries;
    try {
        entries = await fs.readdir(dir);
    }
    catch {
        return { current: null, reports: [], dir };
    }
    const candidates = entries
        .filter((e) => COST_REPORT_AGGREGATE_FILE_RE.test(e))
        .sort((a, b) => b.localeCompare(a)) // newest-first
        .slice(0, limit);
    const reports = [];
    for (const name of candidates) {
        const parsed = await parseAggregateReportFile(path.join(dir, name));
        if (parsed)
            reports.push(parsed);
    }
    return {
        current: reports.length > 0 ? reports[0] : null,
        reports,
        dir
    };
}
// ---------------------------------------------------------------------------
// Rolling median helper (SLICE-52)
// ---------------------------------------------------------------------------
/** Compute the median of a sorted numeric array (ascending). Pure function. */
function medianOfSorted(sorted) {
    const n = sorted.length;
    if (n === 0)
        return 0;
    const mid = Math.floor(n / 2);
    return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
/**
 * Compute rolling median of `reports.slice(1)` (excludes current at [0]).
 * Returns `{ median: null, sampleCount: 0, sampleValues: [] }` when no
 * historical reports are present — single-report fallback.
 * Pure function. Suitable for unit testing without filesystem I/O.
 */
export function computeRollingMedian(input) {
    // reports[0] = current slice; historical = reports[1..window]
    const historicalSlice = input.reports.slice(1, 1 + input.window);
    // Keep order (newest-first) for sampleValues audit; filter nulls for math
    const sampleValues = historicalSlice
        .map((r) => r.usd)
        .filter((u) => typeof u === "number" && Number.isFinite(u));
    if (sampleValues.length === 0) {
        return { median: null, sampleCount: 0, sampleValues: [] };
    }
    const sorted = [...sampleValues].sort((a, b) => a - b);
    return {
        median: medianOfSorted(sorted),
        sampleCount: sampleValues.length,
        sampleValues
    };
}
