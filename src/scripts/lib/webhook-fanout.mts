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
    if (!cfg.webhook?.url) return;

    const fetchFn = _internals.fetch as unknown as FetchFn;
    const senderConfig: {
      url: string;
      tenantId: string;
      appId: string;
      bearer: string;
      disabled?: boolean;
    } = {
      url: cfg.webhook.url,
      tenantId: cfg.webhook.tenantId,
      appId: cfg.webhook.appId,
      bearer: cfg.webhook.bearer
    };
    if (cfg.webhook.disabled !== undefined) {
      senderConfig.disabled = cfg.webhook.disabled;
    }
    const sender = createWebhookSender(senderConfig, { fetchFn });
    const emittedAt =
      (payload.ts as string | undefined) ??
      (payload.timestamp as string | undefined) ??
      new Date().toISOString();
    await sender.send({
      tenantId: cfg.webhook.tenantId,
      appId: cfg.webhook.appId,
      kind,
      payload,
      emittedAt
    });
  } catch {
    // Fail-silent contract: JSONL on disk is authoritative.
  }
}
