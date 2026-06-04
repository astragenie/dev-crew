// Deterministic confidence heuristic for slice-start. No LLM, no IO.
// Used by start-slice.mts to emit a traffic-light signal + reason in the
// ceremony return. See FEAT-010 SLICE-36 for design rationale.
// First match wins. Null grade history is treated as neutral (does not
// trigger the grade-trend branch) — avoids penalizing first-ever slices
// before any grade data exists.
export function computeConfidence(inputs) {
    const { autonomousSafe, acCount, recentGradeAvg, dependsOnCount } = inputs;
    if (acCount === 0) {
        return { confidence: "red", reason: "no acceptance criteria — slice not testable" };
    }
    if (autonomousSafe === false) {
        const compound = redCompoundReason(acCount, recentGradeAvg, dependsOnCount);
        if (compound) {
            return {
                confidence: "red",
                reason: `high-risk compound: not autonomous-safe AND ${compound}`
            };
        }
        return { confidence: "yellow", reason: "autonomous_safe: false — review recommended" };
    }
    if (typeof recentGradeAvg === "number" && recentGradeAvg < 0.85) {
        return {
            confidence: "yellow",
            reason: `recent grade trend ${recentGradeAvg.toFixed(2)} below 0.85`
        };
    }
    const gradeNote = typeof recentGradeAvg === "number" ? "grade trend healthy" : "no grade history yet — neutral";
    return {
        confidence: "green",
        reason: `autonomous-safe, AC count ${acCount}, ${gradeNote}`
    };
}
function redCompoundReason(acCount, recentGradeAvg, dependsOnCount) {
    if (acCount < 2)
        return `AC count ${acCount} (< 2)`;
    if (typeof recentGradeAvg === "number" && recentGradeAvg < 0.8) {
        return `grade trend ${recentGradeAvg.toFixed(2)} (< 0.80)`;
    }
    if (dependsOnCount > 0)
        return `${dependsOnCount} unresolved depends_on`;
    return null;
}
