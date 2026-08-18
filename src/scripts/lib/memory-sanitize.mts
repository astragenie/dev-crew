// Shared content/argv sanitizers for the astramem write paths.
//
// memory-sink.mts (`remember` for decisions/lessons/notes/failures) and
// memory-gepa.mts (`remember` for GEPA events, FEAT-223; migrated off the
// retired memory-bridge.mts by FEAT-235) both sanitize config- or
// event-sourced text before it reaches the provider payload. Extracted here
// — rather than one importing the other's private helper — to avoid a
// cross-module dependency for a pure text-shaping concern. Neither module
// has I/O or module-scope state, so this stays a pure-function leaf.

const CONTENT_MAX = 2000;
const ARG_MAX = 128;

/** Strip control chars and cap length so content can never forge extra
 * records or carry huge payloads. Callers already pass non-secret text. */
export function sanitizeContent(text: string, maxLen: number = CONTENT_MAX): string {
  return text
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .trim()
    .slice(0, maxLen);
}

/** Sanitize a short argv value (e.g. project id, object key) — strip control
 * chars and cap tightly. A config- or event-sourced value must not forge
 * extra args or log records. */
export function sanitizeArg(value: string, maxLen: number = ARG_MAX): string {
  return value
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .trim()
    .slice(0, maxLen);
}
