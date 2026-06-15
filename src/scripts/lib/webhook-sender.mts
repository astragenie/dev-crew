export interface WebhookSenderConfig {
  url: string;
  tenantId: string;
  appId: string;
  bearer: string;
  disabled?: boolean;
}

export type FetchFn = (url: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface WebhookSenderDeps {
  fetchFn?: FetchFn;
  retryDelayMs?: number;
  now?: () => number;
}

export interface SendResult {
  ok: boolean;
  status?: number;
  disabled?: boolean;
  skipped?: boolean;
  error?: string;
  attempts: number;
}

interface Envelope {
  tenantId: string;
  appId: string;
  kind: string;
  payload: Record<string, unknown>;
  sourcePath?: string;
  lineOffset?: number;
  emittedAt: string;
}

export interface WebhookSender {
  send(envelope: Envelope): Promise<SendResult>;
}

const MAX_ATTEMPTS_5XX = 2; // initial + 1 retry
const MAX_ATTEMPTS_429 = 3;
const BACKOFF_MS_429 = [1000, 2000, 4000];

export function createWebhookSender(
  config: WebhookSenderConfig,
  deps: WebhookSenderDeps = {}
): WebhookSender {
  const fetchFn = deps.fetchFn ?? ((url, init) => globalThis.fetch(url, init));
  const retryDelayMs = deps.retryDelayMs ?? 250;
  let sessionDisabled = false;

  async function sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function attempt(envelope: Envelope): Promise<Response> {
    return await fetchFn(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.bearer}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(envelope)
    });
  }

  async function send(envelope: Envelope): Promise<SendResult> {
    if (sessionDisabled) {
      return { ok: false, disabled: true, attempts: 0, error: "session-disabled" };
    }
    if (config.disabled) {
      return { ok: false, skipped: true, attempts: 0 };
    }

    let attempts = 0;

    while (true) {
      attempts += 1;
      let response: Response;
      try {
        response = await attempt(envelope);
      } catch (err) {
        return { ok: false, attempts, error: (err as Error).message };
      }

      if (response.status >= 200 && response.status < 300) {
        return { ok: true, status: response.status, attempts };
      }
      if (response.status === 401 || response.status === 403) {
        sessionDisabled = true;
        return { ok: false, disabled: true, status: response.status, attempts };
      }
      if (response.status === 429) {
        if (attempts >= MAX_ATTEMPTS_429) {
          return { ok: false, status: response.status, attempts };
        }
        await sleep(retryDelayMs > 0 ? retryDelayMs : (BACKOFF_MS_429[attempts - 1] ?? 0));
        continue;
      }
      if (response.status >= 500) {
        if (attempts >= MAX_ATTEMPTS_5XX) {
          return { ok: false, status: response.status, attempts };
        }
        await sleep(retryDelayMs);
        continue;
      }
      // 4xx other than 401/403/429 — no retry
      return { ok: false, status: response.status, attempts };
    }
  }

  return { send };
}
