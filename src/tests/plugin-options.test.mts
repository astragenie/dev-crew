// @ts-nocheck
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  resolveAstrarunnerEnvOption,
  resolveIngestTokenOption,
  resolveIngestUrlOption
} from "../scripts/lib/plugin-options.mjs";

const KEYS = [
  "LOOP_INGEST_URL",
  "LOOP_INGEST_TOKEN",
  "ASTRARUNNER_ENV",
  "CLAUDE_PLUGIN_OPTION_INGEST_URL",
  "CLAUDE_PLUGIN_OPTION_INGEST_TOKEN",
  "CLAUDE_PLUGIN_OPTION_ASTRARUNNER_ENV"
];

function clearAll(): void {
  for (const k of KEYS) delete process.env[k];
}

beforeEach(clearAll);
afterEach(clearAll);

describe("plugin-options: ingest URL resolution", () => {
  test("undefined when neither env nor plugin option set", () => {
    expect(resolveIngestUrlOption()).toBeUndefined();
  });

  test("falls back to plugin option when env var absent", () => {
    process.env["CLAUDE_PLUGIN_OPTION_INGEST_URL"] = "https://api.astrarunner.com";
    expect(resolveIngestUrlOption()).toBe("https://api.astrarunner.com");
  });

  test("LOOP_INGEST_URL wins over plugin option (explicit override beats keychain)", () => {
    process.env["CLAUDE_PLUGIN_OPTION_INGEST_URL"] = "https://api.astrarunner.com";
    process.env["LOOP_INGEST_URL"] = "http://localhost:5137";
    expect(resolveIngestUrlOption()).toBe("http://localhost:5137");
  });

  test("empty-string env is treated as unset and falls through", () => {
    process.env["LOOP_INGEST_URL"] = "";
    process.env["CLAUDE_PLUGIN_OPTION_INGEST_URL"] = "https://api.astrarunner.com";
    expect(resolveIngestUrlOption()).toBe("https://api.astrarunner.com");
  });
});

describe("plugin-options: ingest token resolution", () => {
  test("undefined when neither set", () => {
    expect(resolveIngestTokenOption()).toBeUndefined();
  });

  test("falls back to plugin option ingest_token", () => {
    process.env["CLAUDE_PLUGIN_OPTION_INGEST_TOKEN"] = "lrt_from_plugin";
    expect(resolveIngestTokenOption()).toBe("lrt_from_plugin");
  });

  test("LOOP_INGEST_TOKEN wins over plugin option", () => {
    process.env["CLAUDE_PLUGIN_OPTION_INGEST_TOKEN"] = "lrt_from_plugin";
    process.env["LOOP_INGEST_TOKEN"] = "lrt_from_env";
    expect(resolveIngestTokenOption()).toBe("lrt_from_env");
  });
});

describe("plugin-options: astrarunner env resolution", () => {
  test("undefined when neither set", () => {
    expect(resolveAstrarunnerEnvOption()).toBeUndefined();
  });

  test("falls back to plugin option astrarunner_env", () => {
    process.env["CLAUDE_PLUGIN_OPTION_ASTRARUNNER_ENV"] = "prod";
    expect(resolveAstrarunnerEnvOption()).toBe("prod");
  });

  test("ASTRARUNNER_ENV wins over plugin option", () => {
    process.env["CLAUDE_PLUGIN_OPTION_ASTRARUNNER_ENV"] = "prod";
    process.env["ASTRARUNNER_ENV"] = "local";
    expect(resolveAstrarunnerEnvOption()).toBe("local");
  });
});
