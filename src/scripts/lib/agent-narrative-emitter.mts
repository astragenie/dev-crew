// agent-narrative-emitter.mts — fan out per-stage and per-tool events derived
// from a crew artifact bundle. Called at slice-close (L3-4) after the M1 grade
// fanout so that runner consumers receive a coherent narrative of what each
// crew agent did during the slice.
//
// Contract:
//   emitAgentNarrative(repoPath, sliceId, bundlePath) → counts
//
// One `slice.agent_progress` envelope per stage marker.
// One `agent.tool_call`     envelope per tool call.
// Bundle parse errors are swallowed (returns zero counts). Each fanout is
// fail-silent — handled by fanoutEnvelope.

import { fanoutEnvelope } from "./webhook-fanout.mjs";
import { parseCrewBundle, type CrewBundleParseResult } from "./crew-bundle-parser.mjs";

export interface EmitAgentNarrativeResult {
  progressCount: number;
  toolCount: number;
}

export async function emitAgentNarrative(
  repoPath: string,
  sliceId: string,
  bundlePath: string,
  fallbackTs: string = new Date().toISOString()
): Promise<EmitAgentNarrativeResult> {
  let parsed: CrewBundleParseResult;
  try {
    parsed = await parseCrewBundle(bundlePath);
  } catch {
    return { progressCount: 0, toolCount: 0 };
  }
  const agent = parsed.agent ?? "unknown";

  let progressCount = 0;
  for (const marker of parsed.progressMarkers) {
    await fanoutEnvelope(repoPath, "slice.agent_progress", {
      sliceId,
      agent,
      stage: marker.stage,
      description: marker.description,
      ts: marker.ts ?? fallbackTs
    });
    progressCount += 1;
  }

  let toolCount = 0;
  for (const tool of parsed.toolCalls) {
    const payload: Record<string, unknown> = {
      sliceId,
      agent,
      toolName: tool.toolName,
      ts: tool.ts ?? fallbackTs
    };
    if (tool.argsJson !== undefined) payload.argsJson = tool.argsJson;
    if (tool.durationMs !== undefined) payload.durationMs = tool.durationMs;
    await fanoutEnvelope(repoPath, "agent.tool_call", payload);
    toolCount += 1;
  }

  return { progressCount, toolCount };
}
