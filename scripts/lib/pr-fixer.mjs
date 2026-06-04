// PR issue categorizer and fix plan builder for autonomous PR repair.
// Polls PR status from GitHub, categorizes unfixed issues, and emits
// fix plans with circuit breaker (max N attempts per category).
// Note: github-sync modules are .mjs files (JavaScript), not TypeScript.
// We use dynamic imports for the gh module to avoid hard TypeScript dependencies.
/**
 * Assert that a parsed `gh pr view` JSON response has the expected shape.
 * Tolerant of unknown additional fields.
 * Throws with a descriptive message identifying the failing field.
 */
export function assertPrViewShape(parsed) {
    if (typeof parsed !== "object" || parsed === null) {
        throw new Error("gh pr view returned unexpected JSON shape: root must be object");
    }
    const p = parsed;
    if (typeof p["title"] !== "string") {
        throw new Error("gh pr view returned unexpected JSON shape: title must be string");
    }
    if (typeof p["state"] !== "string") {
        throw new Error("gh pr view returned unexpected JSON shape: state must be string");
    }
    if (!Array.isArray(p["reviews"])) {
        throw new Error("gh pr view returned unexpected JSON shape: reviews must be array");
    }
    if (!Array.isArray(p["comments"])) {
        throw new Error("gh pr view returned unexpected JSON shape: comments must be array");
    }
}
/**
 * Fetch PR status from GitHub using gh CLI.
 *
 * @param {string} repoPath - repo root directory
 * @param {number | string} prNumber - PR number
 * @param {object} options
 * @param {function} options.ghExec - gh CLI executor (default: loaded dynamically)
 * @param {string} options.repo - repo string (owner/name) for gh (default: auto-detect)
 * @returns {Promise<{ raw: any; haltReason: string | null }>}
 */
export async function fetchPrStatus(repoPath, prNumber, options = {}) {
    const { ghExec = undefined, repo = undefined } = options;
    // Dynamic import to match github-sync pattern
    // Use dynamic import path to avoid TypeScript path resolution issues
    let resolvedGhExec = ghExec;
    if (!resolvedGhExec) {
        try {
            const ghModule = await import("./github-sync/gh.mjs");
            resolvedGhExec = ghModule.defaultGhExec;
        }
        catch {
            return { raw: null, haltReason: "gh_unavailable" };
        }
    }
    const args = [
        "pr",
        "view",
        String(prNumber),
        "--json",
        "title,state,reviews,statusCheckRollup,comments"
    ];
    if (repo) {
        args.push("--repo", repo);
    }
    let result;
    try {
        result = resolvedGhExec(args);
    }
    catch (err) {
        return {
            raw: null,
            haltReason: err?.message?.includes("not found") ? "gh_unavailable" : "gh_error"
        };
    }
    const raw = typeof result === "string" ? JSON.parse(result) : result;
    assertPrViewShape(raw);
    return { raw, haltReason: null };
}
/**
 * Categorize unfixed issues from gh pr view output.
 *
 * @param {any} raw - gh pr view output (title, state, reviews, statusCheckRollup, comments)
 * @returns {PrIssueCategory[]} - unique categories of unfixed issues
 */
export function categorizePrIssues(raw) {
    const categories = [];
    if (!raw) {
        return categories;
    }
    // CI failures: statusCheckRollup has FAILURE or ERROR entries
    if (raw.statusCheckRollup && Array.isArray(raw.statusCheckRollup)) {
        const hasCiFailure = raw.statusCheckRollup.some((c) => c.conclusion === "FAILURE" || c.conclusion === "ERROR");
        if (hasCiFailure) {
            categories.push("ci_failure");
        }
        // Test failures: look for "test" in failed check names
        const hasTestFailure = raw.statusCheckRollup.some((c) => (c.conclusion === "FAILURE" || c.conclusion === "ERROR") &&
            c.name?.toLowerCase().includes("test"));
        if (hasTestFailure) {
            categories.push("test_failure");
        }
        // Lint failures: look for "lint" in failed check names
        const hasLintFailure = raw.statusCheckRollup.some((c) => (c.conclusion === "FAILURE" || c.conclusion === "ERROR") &&
            c.name?.toLowerCase().includes("lint"));
        if (hasLintFailure) {
            categories.push("lint");
        }
        // Security: look for "security" in failed check names
        const hasSecurityFailure = raw.statusCheckRollup.some((c) => (c.conclusion === "FAILURE" || c.conclusion === "ERROR") &&
            c.name?.toLowerCase().includes("security"));
        if (hasSecurityFailure) {
            categories.push("security");
        }
    }
    // Review comments: reviews requesting changes
    if (raw.reviews && Array.isArray(raw.reviews)) {
        const hasReviewRequest = raw.reviews.some((r) => r.state === "CHANGES_REQUESTED");
        if (hasReviewRequest) {
            categories.push("review_comment");
        }
    }
    // Deduplicate and return
    return [...new Set(categories)];
}
/**
 * Run PR fix planning: fetch status, categorize issues, emit plans with circuit breaker.
 *
 * @param {string} repoPath - repo root directory
 * @param {number | string} prNumber - PR number
 * @param {object} options
 * @param {function} options.ghExec - gh CLI executor (default: loaded dynamically)
 * @param {string} options.repo - repo string for gh (default: auto-detect)
 * @param {number} options.maxAttemptsPerCategory - circuit breaker threshold (default: 3)
 * @param {Record<PrIssueCategory, number>} options.priorAttempts - previous attempt counts
 * @returns {Promise<PrFixResult>}
 */
export async function runPrFix(repoPath, prNumber, options = {}) {
    const { ghExec, repo, maxAttemptsPerCategory = 3, priorAttempts = {} } = options;
    // Fetch PR status
    const { raw, haltReason } = await fetchPrStatus(repoPath, prNumber, { ghExec, repo });
    if (haltReason) {
        return {
            prNumber,
            ciGreen: false,
            plans: [],
            haltReason,
            walkedCategories: []
        };
    }
    // Check if CI is green (no FAILURE/ERROR in statusCheckRollup)
    const ciGreen = !raw.statusCheckRollup ||
        !raw.statusCheckRollup.some((c) => c.conclusion === "FAILURE" || c.conclusion === "ERROR");
    // Categorize issues
    const categories = categorizePrIssues(raw);
    // Build plans for each category
    const plans = categories.map((category) => {
        const attemptCount = priorAttempts[category] ?? 0;
        const circuitBroken = attemptCount >= maxAttemptsPerCategory;
        return {
            category,
            description: `Fix ${category} issues in PR #${prNumber}`,
            dispatchPrompt: `Fix ${category} issues in PR #${prNumber}. Run the failing checks and apply fixes.`,
            attemptCount,
            circuitBroken
        };
    });
    return {
        prNumber,
        ciGreen,
        plans,
        haltReason: null,
        walkedCategories: categories
    };
}
