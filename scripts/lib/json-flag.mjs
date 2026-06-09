// CLI JSON-flag parser tolerant of PowerShell quoting.
//
// pwsh callers frequently pass `--scores '{\"a\":0.5}'` — single quotes are
// literal in PowerShell, so the backslash-escaped double quotes reach the
// process verbatim and plain JSON.parse rejects them. Retry once with the
// `\"` → `"` normalization; surface the ORIGINAL parse error if both fail
// so the caller sees the diagnosis for what they actually typed.
export function parseJsonFlag(raw, flagName) {
    try {
        return JSON.parse(raw);
    }
    catch (err) {
        try {
            return JSON.parse(raw.replace(/\\"/g, '"'));
        }
        catch {
            throw new Error(`--${flagName} must be valid JSON: ${err.message}`);
        }
    }
}
