// watch/envelopes.mts — watch.tick / watch.reaction envelope shapes +
// emission via the existing fanoutEnvelope (contract §4).
//
// fanoutEnvelope resolves ROUTING tenant/bearer from repoPath's own
// loop.json — tier-2 watched repos have no loop.json at all, so routing
// cannot key off the watched entry. Resolution: always call fanoutEnvelope
// with RegistryFile.controlRepoPath (this machine's own loop install).
// Business attribution rides inside payload.tenantId/appId, sourced from
// the watched entry's registry record, independent of which repo's webhook
// config physically sent the HTTP call.

import { fanoutEnvelope } from "../webhook-fanout.mjs";
import type { ReactionAction, RegistryFile, SweepErrorKind } from "./types.mjs";

export interface WatchTickPayload {
  ghSlug: string;
  shard: number;
  tenantId: string;
  appId: string;
  tickAt: string; // ISO timestamp
  findingsCount: number;
  skippedCeilingCount: number;
  // B3 AC-2 — present only when this entry's gh detection failed this tick,
  // so a dashboard can see a repo went dark without polling per-repo state.
  sweepErrorKind?: SweepErrorKind;
  sweepErrorConsecutiveCount?: number;
}

export interface WatchReactionPayload {
  ghSlug: string;
  tenantId: string;
  appId: string;
  findingId: string;
  action: ReactionAction;
  attemptCount: number;
  costUsd: number;
  outcome: "spawned" | "circuit-broken" | "skipped-ceiling";
}

export async function emitWatchTickEnvelope(
  registry: RegistryFile,
  payload: WatchTickPayload
): Promise<void> {
  await fanoutEnvelope(
    registry.controlRepoPath,
    "watch.tick",
    payload as unknown as Record<string, unknown>
  );
}

export async function emitWatchReactionEnvelope(
  registry: RegistryFile,
  payload: WatchReactionPayload
): Promise<void> {
  await fanoutEnvelope(
    registry.controlRepoPath,
    "watch.reaction",
    payload as unknown as Record<string, unknown>
  );
}
