// QA gate mode config reader (FEAT-264 SLICE-2, AC-2 / AC-6, #527).
//
// Mirrors the `orchestratorMode` idiom in `slice-linker/start-slice.mts`
// (`resolveOrchestratorModeConfig`): read one explicit config key, validate
// it against the known-good union, and fall back to the safe default for
// everything else — absent key, absent `loop` block, null config, an
// unknown string, or a wrong type. No preset interaction (DEC-069); this
// reads only `config.loop.qa_gate`.
//
// "post-build" is today's behavior (QA runs after the builder), so an
// unconfigured repo must resolve to it unchanged — that equivalence is
// AC-2/AC-6 of #527. Consuming this reader in the slice ceremony is
// SLICE-3, a later wave; this module only exposes the pure resolver.

export type QaGateMode = "pre-build" | "post-build" | "off";

/**
 * Resolve `loop.qa_gate` from a parsed `.claude/loop.json` config object.
 *
 * Precedence:
 *   1. `config.loop.qa_gate === "pre-build"` or `"off"` — explicit, pass through.
 *   2. Everything else — `"post-build"` (back-compat default).
 */
export function resolveQaGateMode(config: Record<string, any> | null | undefined): QaGateMode {
  const explicit = config?.loop?.qa_gate;
  if (explicit === "pre-build" || explicit === "off") {
    return explicit;
  }
  return "post-build";
}
