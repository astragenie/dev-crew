export { sliceFromFeature, featureSimplify } from "./slice-linker/feature-lifecycle.mjs";
export { completeSlice } from "./slice-linker/complete-slice.mjs";
export { closeSlice } from "./slice-linker/close-slice.mjs";
export type { CloseSliceOpts, CloseSliceResult } from "./slice-linker/close-slice.mjs";
export { startSlice } from "./slice-linker/start-slice.mjs";
export {
  buildDispatchInstruction,
  pickBuilderVariant,
  readFeatureExcerpt,
  extractSection
} from "./slice-linker/dispatch.mjs";
export type { OrchestratorMode, BuilderVariant } from "./slice-linker/dispatch.mjs";
export { renderIdentification } from "./slice-linker/agent-report-writer.mjs";
export { checkpointCommit } from "./checkpoint-commit.mjs";
