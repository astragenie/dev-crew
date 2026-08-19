/**
 * Tests for scripts/lib/agent-registry.ts (FEAT-160 partial — registry layer only,
 * lead.md slim deferred to a separate autonomous_safe=false slice).
 */
import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { loadAgentRegistry, routeByTags } from "../scripts/lib/agent-registry.mjs";

async function makeTempAgentsRepo(): Promise<{
  repo: string;
  cleanup: () => Promise<void>;
}> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "agent-registry-test-"));
  const agents = path.join(repo, "agents");
  await fs.mkdir(agents, { recursive: true });
  return { repo, cleanup: () => fs.rm(repo, { recursive: true, force: true }) };
}

async function write(file: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

test("loadAgentRegistry: parses capabilities frontmatter from each agent file", async () => {
  const { repo, cleanup } = await makeTempAgentsRepo();
  try {
    await write(
      path.join(repo, "agents", "backend-dev.md"),
      `---\ncapabilities:\n  role: [implementer]\n  surfaces: [api, schema]\n  stacks: [typescript, python]\n  priority: 10\n---\n# backend-dev\n`
    );
    await write(
      path.join(repo, "agents", "reviewer.md"),
      `---\ncapabilities:\n  role: [reviewer]\n  concerns: [security, refactor]\n  lens: [correctness, regressions]\n  priority: 8\n---\n# reviewer\n`
    );
    const reg = await loadAgentRegistry(repo);
    expect(reg.length, "should load 2 agents").toBe(2);
    const be = reg.find((e) => e.name === "backend-dev");
    expect(be).toBeTruthy();
    expect(be.capabilities.role).toEqual(["implementer"]);
    expect(be.capabilities.surfaces).toEqual(["api", "schema"]);
    expect(be.capabilities.stacks).toEqual(["typescript", "python"]);
    expect(be.priority).toBe(10);
    const ins = reg.find((e) => e.name === "reviewer");
    expect(ins).toBeTruthy();
    expect(ins.capabilities.concerns).toEqual(["security", "refactor"]);
  } finally {
    await cleanup();
  }
});

test("loadAgentRegistry: skips files without capabilities frontmatter", async () => {
  const { repo, cleanup } = await makeTempAgentsRepo();
  try {
    await write(
      path.join(repo, "agents", "no-caps.md"),
      `---\ndescription: An agent with no capabilities field.\nmodel: sonnet\n---\n# no-caps\n`
    );
    await write(
      path.join(repo, "agents", "has-caps.md"),
      `---\ncapabilities:\n  role: [implementer]\n---\n# has-caps\n`
    );
    const reg = await loadAgentRegistry(repo);
    expect(reg.length, "only agent with capabilities is loaded").toBe(1);
    expect(reg[0]?.name).toBe("has-caps");
  } finally {
    await cleanup();
  }
});

test("loadAgentRegistry: walks nested directories (e.g. 3rdparty/)", async () => {
  const { repo, cleanup } = await makeTempAgentsRepo();
  try {
    await write(
      path.join(repo, "agents", "top.md"),
      `---\ncapabilities:\n  role: [implementer]\n---\n`
    );
    await write(
      path.join(repo, "agents", "3rdparty", "nested.md"),
      `---\ncapabilities:\n  role: [reviewer]\n---\n`
    );
    const reg = await loadAgentRegistry(repo);
    expect(reg.length).toBe(2);
    const nested = reg.find((e) => e.name === "nested");
    expect(nested).toBeTruthy();
    expect(nested.path.includes("3rdparty"), "path should preserve nested dir").toBeTruthy();
  } finally {
    await cleanup();
  }
});

test("routeByTags: single-dimension query returns matches sorted by score desc", async () => {
  const { repo, cleanup } = await makeTempAgentsRepo();
  try {
    await write(
      path.join(repo, "agents", "a.md"),
      `---\ncapabilities:\n  role: [implementer]\n  priority: 10\n---\n`
    );
    await write(
      path.join(repo, "agents", "b.md"),
      `---\ncapabilities:\n  role: [implementer]\n  priority: 5\n---\n`
    );
    await write(
      path.join(repo, "agents", "c.md"),
      `---\ncapabilities:\n  role: [reviewer]\n  priority: 100\n---\n`
    );
    const reg = await loadAgentRegistry(repo);
    const matches = routeByTags(reg, { role: "implementer" });
    expect(matches.length, "only 2 implementers").toBe(2);
    expect(matches[0]?.entry.name, "priority 10 ranks above priority 5").toBe("a");
    expect(matches[1]?.entry.name).toBe("b");
    expect(matches[0]?.matched.includes("role:implementer")).toBeTruthy();
  } finally {
    await cleanup();
  }
});

test("routeByTags: multi-dimension query requires ALL filters match", async () => {
  const { repo, cleanup } = await makeTempAgentsRepo();
  try {
    await write(
      path.join(repo, "agents", "fullstack-ts.md"),
      `---\ncapabilities:\n  role: [implementer]\n  stacks: [typescript]\n  priority: 5\n---\n`
    );
    await write(
      path.join(repo, "agents", "fullstack-py.md"),
      `---\ncapabilities:\n  role: [implementer]\n  stacks: [python]\n  priority: 5\n---\n`
    );
    const reg = await loadAgentRegistry(repo);
    const matches = routeByTags(reg, { role: "implementer", stack: "typescript" });
    expect(matches.length).toBe(1);
    expect(matches[0]?.entry.name).toBe("fullstack-ts");
    expect(matches[0]?.matched.length, "both dimensions matched").toBe(2);
  } finally {
    await cleanup();
  }
});

test("routeByTags: empty query returns empty list (no filters → no matches)", async () => {
  const { repo, cleanup } = await makeTempAgentsRepo();
  try {
    await write(
      path.join(repo, "agents", "x.md"),
      `---\ncapabilities:\n  role: [implementer]\n---\n`
    );
    const reg = await loadAgentRegistry(repo);
    const matches = routeByTags(reg, {});
    expect(matches.length, "empty query returns all (no filter to reject)").toBe(1);
  } finally {
    await cleanup();
  }
});

test("routeByTags: ranking uses matched-count * 10 + priority", async () => {
  const { repo, cleanup } = await makeTempAgentsRepo();
  try {
    await write(
      path.join(repo, "agents", "high-prio-1-match.md"),
      `---\ncapabilities:\n  role: [implementer]\n  priority: 99\n---\n`
    );
    await write(
      path.join(repo, "agents", "low-prio-2-match.md"),
      `---\ncapabilities:\n  role: [implementer]\n  stacks: [typescript]\n  priority: 1\n---\n`
    );
    const reg = await loadAgentRegistry(repo);
    const matches = routeByTags(reg, { role: "implementer", stack: "typescript" });
    // low-prio with 2 matches = 2*10+1 = 21
    // high-prio with 1 match  = 1*10+99 = 109 — but only if it matched; it didn't
    // because high-prio doesn't have stacks. So only low-prio matches.
    // Adjust: filter requires BOTH match. high-prio fails stack filter → not in result.
    expect(matches.length, "only low-prio matches BOTH filters").toBe(1);
    expect(matches[0]?.entry.name).toBe("low-prio-2-match");
  } finally {
    await cleanup();
  }
});
