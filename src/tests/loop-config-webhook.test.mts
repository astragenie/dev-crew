import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readNotifyConfig } from "../scripts/lib/event-notifier.mjs";

async function withTempRepo(loopJson: object): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-webhook-cfg-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify(loopJson));
  return dir;
}

describe("readNotifyConfig — webhook fields", () => {
  test("reads tenantId / appId / bearer / url / disabled when present", async () => {
    const repo = await withTempRepo({
      loop: {
        notifications: {
          enabled: true,
          mode: "webhook",
          webhook: {
            url: "https://runner.local/api/v2/ingest/loop-events",
            tenantId: "tenant-x",
            appId: "app-y",
            bearer: "tok-123",
            disabled: false
          }
        }
      }
    });
    const cfg = await readNotifyConfig(repo);
    expect(cfg.mode).toBe("webhook");
    expect(cfg.webhook).toMatchObject({
      url: "https://runner.local/api/v2/ingest/loop-events",
      tenantId: "tenant-x",
      appId: "app-y",
      bearer: "tok-123",
      disabled: false
    });
  });

  test("falls back to legacy webhookUrl when no webhook block present", async () => {
    const repo = await withTempRepo({
      loop: { notifications: { mode: "webhook", webhookUrl: "https://legacy.local/hook" } }
    });
    const cfg = await readNotifyConfig(repo);
    expect(cfg.webhookUrl).toBe("https://legacy.local/hook");
    expect(cfg.webhook).toBeUndefined();
  });
});
