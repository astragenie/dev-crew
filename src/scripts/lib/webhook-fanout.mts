import { readNotifyConfig } from "./event-notifier.mjs";
import { createWebhookSender, type FetchFn } from "./webhook-sender.mjs";

export const _internals = {
  fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args)
};

export async function fanoutEnvelope(
  repoPath: string,
  kind: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const cfg = await readNotifyConfig(repoPath);
    // Pattern B guard: skip fan-out when bearer could not be resolved from
    // committed config OR user-level token store.
    const wh = cfg.webhook;
    if (!wh?.url || !wh.bearer) return;

    const fetchFn = _internals.fetch as unknown as FetchFn;
    const senderConfig: {
      url: string;
      tenantId: string;
      appId: string;
      bearer: string;
      disabled?: boolean;
    } = {
      url: wh.url,
      tenantId: wh.tenantId,
      appId: wh.appId,
      bearer: wh.bearer
    };
    if (wh.disabled !== undefined) {
      senderConfig.disabled = wh.disabled;
    }
    const sender = createWebhookSender(senderConfig, { fetchFn });
    const emittedAt =
      (payload.ts as string | undefined) ??
      (payload.timestamp as string | undefined) ??
      new Date().toISOString();
    await sender.send({
      tenantId: wh.tenantId,
      appId: wh.appId,
      kind,
      payload,
      emittedAt
    });
  } catch {
    // Fail-silent contract: JSONL on disk is authoritative.
  }
}
