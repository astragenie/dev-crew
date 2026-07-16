export {
  sliceFromFeature,
  featureSimplify,
  AcceptanceCriteriaRequiredError,
  assertAcceptanceCriteria,
  extractAcceptanceCriteria,
  SliceAlreadyShippedError
} from "./slice-linker/feature-lifecycle.mjs";
export { completeSlice } from "./slice-linker/complete-slice.mjs";
export { closeSlice } from "./slice-linker/close-slice.mjs";
export type { CloseSliceOpts, CloseSliceResult } from "./slice-linker/close-slice.mjs";
export {
  startSlice,
  resolveRecallCapMs,
  wrapLearningsDigestTaskScoped
} from "./slice-linker/start-slice.mjs";
export {
  buildDispatchInstruction,
  pickBuilderVariant,
  readFeatureExcerpt,
  extractSection,
  TASK_SCOPED_ORDER_KEYWORDS
} from "./slice-linker/dispatch.mjs";
export type { OrchestratorMode, BuilderVariant } from "./slice-linker/dispatch.mjs";
export { renderIdentification } from "./slice-linker/agent-report-writer.mjs";
export { checkpointCommit } from "./checkpoint-commit.mjs";
