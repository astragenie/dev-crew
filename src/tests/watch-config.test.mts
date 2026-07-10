import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_MACHINE_SHARD,
  readMachineConfig,
  resolveMachineShard
} from "../scripts/lib/watch.mjs";

async function tmpWatchHome(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "watch-config-test-"));
}

test("resolveMachineShard defaults to 1 when config.json is absent (zero-config single machine)", async () => {
  const watchHome = await tmpWatchHome();
  expect(await resolveMachineShard(watchHome)).toBe(DEFAULT_MACHINE_SHARD);
});

test("resolveMachineShard reads an explicit machineShard from config.json", async () => {
  const watchHome = await tmpWatchHome();
  await fs.writeFile(
    path.join(watchHome, "config.json"),
    JSON.stringify({ machineShard: 3 }),
    "utf-8"
  );
  expect(await resolveMachineShard(watchHome)).toBe(3);
});

test("readMachineConfig falls back to the default on a non-positive-integer machineShard", async () => {
  const watchHome = await tmpWatchHome();
  await fs.writeFile(
    path.join(watchHome, "config.json"),
    JSON.stringify({ machineShard: -1 }),
    "utf-8"
  );
  expect((await readMachineConfig(watchHome)).machineShard).toBe(DEFAULT_MACHINE_SHARD);
});

test("readMachineConfig falls back to the default on unparseable JSON", async () => {
  const watchHome = await tmpWatchHome();
  await fs.writeFile(path.join(watchHome, "config.json"), "{ not json", "utf-8");
  expect((await readMachineConfig(watchHome)).machineShard).toBe(DEFAULT_MACHINE_SHARD);
});
