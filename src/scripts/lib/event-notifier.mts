import { spawnSync as nodeSpawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { readProfile } from "./env-profiles.mjs";
import {
  resolveAstrarunnerEnvOption,
  resolveIngestTokenOption,
  resolveIngestUrlOption
} from "./plugin-options.mjs";
import { resolveBearer } from "./token-store.mjs";
import { createWebhookSender } from "./webhook-sender.mjs";

// Hook-driven notification surface for loop lifecycle events.
// Fires on slice-complete, halt-badge, cost-alert, and slice-start events.
// Configured via .claude/loop.json under loop.notifications.
//
// Fail-silent contract: errors in any mode must NOT propagate to the caller.
// The main loop wraps all notifyEvent calls in try/catch as an additional guard,
// but this module also catches internally so callers without try/catch are safe.

export type NotificationMode = "osNotification" | "webhook" | "customCommand";
export type LoopEventType = "slice-complete" | "halt-badge" | "cost-alert" | "slice-start";

export interface NotifyWebhookConfig {
  url: string;
  tenantId: string;
  appId: string;
  // Pattern B: bearer is OPTIONAL in committed config. When absent, the
  // reader resolves it from the user-level token store via appId. Webhook
  // sends are skipped if no bearer can be resolved.
  bearer?: string;
  disabled?: boolean;
}

export interface NotifyConfig {
  enabled?: boolean;
  mode?: NotificationMode;
  events?: LoopEventType[];
  webhookUrl?: string; // legacy
  webhook?: NotifyWebhookConfig;
  command?: string;
}

export interface LoopEvent {
  type: LoopEventType;
  sliceId?: string;
  featureId?: string;
  details?: string;
  timestamp: string;
}

// Exportable internals object for test injection (allows spy/replacement without
// patching frozen module exports like `node:child_process`).
export const _internals = {
  spawnSync: nodeSpawnSync,
  fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args)
};

/**
 * Apply env precedence in a single pass — fetches profile once and mutates
 * webhook.url + webhook.bearer in place.
 *
 * URL precedence (highest to lowest):
 *   1. LOOP_INGEST_URL / plugin-manager ingest_url  — explicit override
 *   2. ASTRARUNNER_ENV / plugin astrarunner_env → profiles.json[env].ingestUrl
 *   3. loop.json webhook.url                        — per-repo committed default
 *
 * Bearer precedence (only when not already committed in loop.json):
 *   1. Literal bearer in loop.json (kept as-is when present)
 *   2. appId → profile.tokensFile / default ~/.astrarunner/tokens.json (Pattern-B,
 *      requires webhook.appId; no fallback on miss; cross-tier guard)
 *   3. LOOP_INGEST_TOKEN / plugin-manager ingest_token — single-token fallback
 *      when no appId-bound token resolves (mirrors the direct sink; lets a
 *      pasted plugin-manager token drive the webhook path with no appId)
 */
async function applyEnvOverrides(webhook: NotifyWebhookConfig): Promise<void> {
  const activeEnv = resolveAstrarunnerEnvOption();
  const envOverrideUrl = resolveIngestUrlOption();

  let profileTokensFile: string | undefined;
  if (envOverrideUrl) {
    webhook.url = envOverrideUrl;
  } else if (activeEnv) {
    const profile = await readProfile(activeEnv);
    if (profile) {
      webhook.url = profile.ingestUrl;
      profileTokensFile = profile.tokensFile;
    }
  }

  if (webhook.appId && !webhook.bearer) {
    const resolved = await resolveBearer(webhook.appId, activeEnv, profileTokensFile);
    if (resolved) webhook.bearer = resolved;
  }

  // Single-token fallback: when no committed or appId-bound bearer resolved,
  // honor the plugin-manager ingest_token (or LOOP_INGEST_TOKEN). This is the
  // no-appId onboarding path — paste a token in the plugin manager and the
  // webhook notifier can send without a Pattern-B token-store entry.
  if (!webhook.bearer) {
    const optToken = resolveIngestTokenOption();
    if (optToken) webhook.bearer = optToken;
  }
}

/**
 * Read loop.json and extract loop.notifications. Returns {} on any error.
 * See applyEnvOverrides for URL + bearer precedence rules.
 *
 * Fail-silent contract: any error in profile/token resolution leaves the field
 * unchanged; downstream sends are skipped when no bearer can be resolved.
 */
export async function readNotifyConfig(repoPath: string): Promise<NotifyConfig> {
  let cfg: NotifyConfig;
  try {
    const configPath = path.join(repoPath, ".claude", "loop.json");
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    const notifications = parsed?.loop?.notifications;
    if (!notifications || typeof notifications !== "object") return {};
    cfg = notifications as NotifyConfig;
  } catch {
    return {};
  }

  if (cfg.webhook) await applyEnvOverrides(cfg.webhook);
  return cfg;
}

/** Shell-quote a string for POSIX sh (single-quote wrapping with embedded-quote escape). */
function shellQuotePosix(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

/** Shell-quote a string for PowerShell (single-quote wrapping with '' escape). */
function shellQuotePs(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'";
}

function interpolateCommand(
  template: string,
  event: LoopEvent,
  quote: (s: string) => string
): string {
  return template
    .replace(/\{type\}/g, quote(event.type))
    .replace(/\{sliceId\}/g, quote(event.sliceId ?? ""))
    .replace(/\{featureId\}/g, quote(event.featureId ?? ""))
    .replace(/\{details\}/g, quote(event.details ?? ""));
}

function fireOsNotification(event: LoopEvent): void {
  const title = `loop: ${event.type}`;
  const body = event.details ?? event.type;
  try {
    if (process.platform === "win32") {
      // Escape single quotes (PS string delimiter) to prevent injection
      const safeBody = body.replace(/'/g, "''");
      const safeTitle = title.replace(/'/g, "''");
      _internals.spawnSync("powershell.exe", [
        "-Command",
        `[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('${safeBody}', '${safeTitle}')`
      ]);
    } else if (process.platform === "linux") {
      // notify-send receives title and body as separate argv elements — no shell injection risk
      _internals.spawnSync("notify-send", [title, body]);
    } else {
      // darwin — escape backslashes then double-quotes in the AppleScript string
      const safeBody = body.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const safeTitle = title.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      _internals.spawnSync("osascript", [
        "-e",
        `display notification "${safeBody}" with title "${safeTitle}"`
      ]);
    }
  } catch {
    // Fail silently — notification is best-effort
  }
}

async function fireWebhook(event: LoopEvent, config: NotifyConfig): Promise<void> {
  // Pattern B guard: skip send when bearer could not be resolved.
  // Prevents wasted POST + 401 round-trip when token store is missing.
  const wh = config.webhook;
  if (wh?.url && wh.bearer) {
    const fetchFn = _internals.fetch as unknown as (
      url: string | URL | Request,
      init?: RequestInit
    ) => Promise<Response>;
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
    const { type, timestamp, ...rest } = event;
    const envelope = {
      tenantId: wh.tenantId,
      appId: wh.appId,
      kind: type,
      payload: rest as Record<string, unknown>,
      emittedAt: timestamp
    };
    try {
      await sender.send(envelope);
    } catch {
      // Fail-silent — JSONL on disk is authoritative; the webhook is best-effort.
      // webhook-sender already returns a SendResult instead of throwing, but we
      // guard here in case of unexpected runtime errors.
    }
    return;
  }

  // Legacy path: webhookUrl + no auth, raw event body
  if (!config.webhookUrl) return;
  try {
    await _internals.fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event)
    });
  } catch (err) {
    console.error(
      `[event-notifier] webhook POST failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

function fireCustomCommand(event: LoopEvent, config: NotifyConfig): void {
  if (!config.command) return;
  try {
    if (process.platform === "win32") {
      const interpolated = interpolateCommand(config.command, event, shellQuotePs);
      _internals.spawnSync("powershell.exe", ["-Command", interpolated]);
    } else {
      const interpolated = interpolateCommand(config.command, event, shellQuotePosix);
      _internals.spawnSync("sh", ["-c", interpolated]);
    }
  } catch {
    // Fail silently
  }
}

/**
 * Fire a loop lifecycle notification according to the provided config.
 *
 * Guard rails:
 * - Returns immediately when config.enabled is false or absent.
 * - Filters by config.events when provided; if omitted, all event types notify.
 * - Errors from any dispatch mode are swallowed — this function NEVER throws.
 */
export async function notifyEvent(event: LoopEvent, config: NotifyConfig): Promise<void> {
  if (!config.enabled) return;

  if (config.events && config.events.length > 0) {
    if (!config.events.includes(event.type)) return;
  }

  const mode: NotificationMode = config.mode ?? "osNotification";

  try {
    if (mode === "osNotification") {
      fireOsNotification(event);
    } else if (mode === "webhook") {
      await fireWebhook(event, config);
    } else if (mode === "customCommand") {
      fireCustomCommand(event, config);
    }
  } catch {
    // Final safety net — ensures any unhandled path never crashes the caller
  }
}
