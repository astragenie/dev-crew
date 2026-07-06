// Shared content/argv sanitizers for the astramem write paths.
//
// memory-sink.mts (`remember` for decisions/lessons/notes/failures) and
// memory-bridge.mts (`remember` for GEPA events, FEAT-223) both spawn CLI
// argv from config- or event-sourced text. Extracted here — rather than one
// importing the other's private helper — because memory-sink.mts already
// imports `resolveCli` from memory-bridge.mts; the reverse import would be
// circular. Neither module has I/O or module-scope state, so this stays a
// pure-function leaf.

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
