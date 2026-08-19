// tests/crew-profile-cli.test.ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test, expect } from "bun:test";
import { buildProfileBlock } from "../scripts/lib/memory/index.mjs";
import { readInjectedAtoms } from "../scripts/lib/memory/injected-atoms.mjs";

async function tmp(p: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), p));
}

test("barrel re-exports buildProfileBlock and injected-atoms/feedback helpers", async () => {
  const mod = await import("../scripts/lib/memory/index.mjs");
  expect(typeof mod.buildProfileBlock).toBe("function");
  expect(typeof mod.submitOutcomeFeedback).toBe("function");
  expect(typeof mod.writeInjectedAtoms).toBe("function");
});

test("buildProfileBlock via barrel is byte-silent when disabled (integration guard)", async () => {
  const repo = await tmp("cli-profile-off-");
  try {
    const r = await buildProfileBlock({ repoPath: repo, agent: "crew:reviewer", rawConfig: {} });
    expect(r.block).toBe("");
    expect(await readInjectedAtoms(repo, "any")).toEqual([]);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});
