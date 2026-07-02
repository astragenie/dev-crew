// Unit tests for src/scripts/lib/halt-badge-state.mts (issue #297).

import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  diffHaltBadgeTransitions,
  resolveResolverAgentRole
} from "../scripts/lib/halt-badge-state.mjs";

async function makeTempRepo(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "halt-badge-state-"));
}

describe("diffHaltBadgeTransitions", () => {
  test("first call with an open badge records it but reports no transitions", async () => {
    const repo = await makeTempRepo();
    const resolved = await diffHaltBadgeTransitions(repo, {
      stuckDetected: { ts: "2026-06-15T00:00:00.000Z", sliceId: "SLICE-1" }
    });
    expect(resolved).toEqual([]);
  });

  test("badge that clears on the next call is reported as resolved with the original ts", async () => {
    const repo = await makeTempRepo();
    await diffHaltBadgeTransitions(repo, {
      stuckDetected: { ts: "2026-06-15T00:00:00.000Z", sliceId: "SLICE-1" }
    });
    const resolved = await diffHaltBadgeTransitions(repo, {});
    expect(resolved).toEqual([
      { badgeKind: "stuckDetected", ts: "2026-06-15T00:00:00.000Z", sliceId: "SLICE-1" }
    ]);
  });

  test("badge kept open across repeated calls preserves the original opened ts", async () => {
    const repo = await makeTempRepo();
    await diffHaltBadgeTransitions(repo, {
      stuckDetected: { ts: "2026-06-15T00:00:00.000Z", sliceId: "SLICE-1" }
    });
    await diffHaltBadgeTransitions(repo, {
      stuckDetected: { ts: "2026-06-15T00:10:00.000Z", sliceId: "SLICE-1" }
    });
    const resolved = await diffHaltBadgeTransitions(repo, {});
    // ts must be the FIRST call's ts, not the second (open-again) call's ts.
    expect(resolved).toEqual([
      { badgeKind: "stuckDetected", ts: "2026-06-15T00:00:00.000Z", sliceId: "SLICE-1" }
    ]);
  });

  test("no transition when nothing was ever open", async () => {
    const repo = await makeTempRepo();
    const resolved = await diffHaltBadgeTransitions(repo, {});
    expect(resolved).toEqual([]);
  });

  test("malformed state file degrades to no prior transitions rather than throwing", async () => {
    const repo = await makeTempRepo();
    const stateDir = path.join(repo, ".claude", "state", "loop");
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(path.join(stateDir, "halt-badge-state.json"), "{not json", "utf8");
    await expect(diffHaltBadgeTransitions(repo, {})).resolves.toEqual([]);
  });
});

describe("resolveResolverAgentRole", () => {
  test("returns undefined when auto-dispatch.jsonl is absent", async () => {
    const repo = await makeTempRepo();
    expect(await resolveResolverAgentRole(repo)).toBeUndefined();
  });

  test("strips the namespace prefix from the last entry's agent field", async () => {
    const repo = await makeTempRepo();
    const dir = path.join(repo, ".claude", "artifacts", "loop");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "auto-dispatch.jsonl"),
      `${[JSON.stringify({ agent: "loop:architect" }), JSON.stringify({ agent: "crew:reviewer" })].join("\n")}\n`,
      "utf8"
    );
    expect(await resolveResolverAgentRole(repo)).toBe("reviewer");
  });

  test("returns undefined when the last entry has no agent field", async () => {
    const repo = await makeTempRepo();
    const dir = path.join(repo, ".claude", "artifacts", "loop");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "auto-dispatch.jsonl"), `${JSON.stringify({})}\n`, "utf8");
    expect(await resolveResolverAgentRole(repo)).toBeUndefined();
  });

  test("returns undefined on malformed JSONL rather than throwing", async () => {
    const repo = await makeTempRepo();
    const dir = path.join(repo, ".claude", "artifacts", "loop");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "auto-dispatch.jsonl"), "not json\n", "utf8");
    await expect(resolveResolverAgentRole(repo)).resolves.toBeUndefined();
  });
});
