// CLI JSON-flag parser tolerant of PowerShell quoting.
//
// pwsh callers frequently pass `--scores '{\"a\":0.5}'` — single quotes are
// literal in PowerShell, so the backslash-escaped double quotes reach the
// process verbatim and plain JSON.parse rejects them. Retry once with the
// `\"` → `"` normalization; surface the ORIGINAL parse error if both fail
// so the caller sees the diagnosis for what they actually typed.

export function parseJsonFlag<T = Record<string, unknown>>(raw: string, flagName: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (err: unknown) {
    try {
      return JSON.parse(raw.replace(/\\"/g, '"')) as T;
    } catch {
      throw new Error(`--${flagName} must be valid JSON: ${(err as Error).message}`);
    }
  }
}
