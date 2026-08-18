// scripts/lib/memory/index.ts — FEAT-188 S2 barrel export.
//
// W3b (dev-team consumes @astragenie/memory-provider, plugins-common#19):
// schema/types/config/noop-provider/ranking/legacy-adapter/file-provider/
// astramem-provider/resolve-provider now live in the published package —
// this barrel re-exports the package verbatim so every existing dev-team
// importer of "./lib/memory/index.ts" keeps working unchanged. Only
// capture-learning.ts, inject-recall.ts, and drift-check.ts stay
// dev-team-local (they write/read dev-team artifact paths + orchestration,
// not swappable provider internals) — re-exported explicitly below.
//
// Note: the package's own `appendJsonlEntry` (from its jsonl.ts) and this
// module's local capture-learning.ts `appendJsonlEntry` share a name. The
// explicit named re-export below wins over the `export *` for that name
// (local/explicit exports take precedence over star-export ambiguity) — so
// barrel consumers get the dev-team capture-learning.ts version, which is
// byte-parity-identical to the package's (same repoPath/segments/entry
// signature, same O_APPEND semantics) and writes into the same store.
export * from "@astragenie/memory-provider";
export {
  LEARNINGS_PATH,
  appendJsonlEntry,
  captureFailureLearning,
  type FailureEntryInput,
  type FailureSeverity
} from "./capture-learning.mjs";
export { checkDrift } from "./drift-check.mjs";
export type { DriftCheckOptions, DriftReport } from "./drift-check.mjs";
export type { InjectRecallOptions } from "./inject-recall.mjs";
export {
  buildRecallBlock,
  formatRecallBlock,
  injectRecall,
  loadMemoryConfig
} from "./inject-recall.mjs";
export type { AgentProfile, ProfileCapableProvider } from "./profile-types.mjs";
export {
  buildProfileBlock,
  formatProfileBlock,
  parseProfileConfig,
  type BuildProfileOptions,
  type ProfileConfig
} from "./inject-profile.mjs";
export { writeInjectedAtoms, readInjectedAtoms } from "./injected-atoms.mjs";
export { submitOutcomeFeedback } from "./profile-feedback.mjs";
export { recallEntries } from "./inject-recall.mjs";
export {
  buildHandoffDigest,
  parseCreditLoopConfig,
  type BuildHandoffDigestOptions,
  type CreditLoopConfig,
  type HandoffDigest
} from "./handoff-digest.mjs";
export { creditMemoriesUsed, type CreditMemoriesUsedOptions } from "./handoff-credit.mjs";
