import { test, expect } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { validateBrandingScrub } from "../scripts/validate-branding-scrub.mjs";

async function makeRepo(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "branding-scrub-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content, "utf8");
  }
  return root;
}

test("clean tree with no wiggin hits passes", async () => {
  const root = await makeRepo({ "agents/foo.md": "# devcrew agent\nno banned term here" });
  try {
    const result = await validateBrandingScrub(root);
    expect(result.ok).toBe(true);
    expect(result.findings).toHaveLength(0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a hit on the product surface fails the gate", async () => {
  const root = await makeRepo({ "agents/foo.md": "still calls it the wiggin loop here" });
  try {
    const result = await validateBrandingScrub(root);
    expect(result.ok).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.file).toBe("agents/foo.md");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("hits inside .claude/artifacts/** are excluded (bucket A)", async () => {
  const root = await makeRepo({
    ".claude/artifacts/loop/grades/x.md": "the old wiggin loop grade record"
  });
  try {
    const result = await validateBrandingScrub(root);
    expect(result.ok).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("hits inside crew/.claude/loop/** are excluded (bucket B)", async () => {
  const root = await makeRepo({ "crew/.claude/loop/rules.md": "wiggin loop hard rules" });
  try {
    const result = await validateBrandingScrub(root);
    expect(result.ok).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("crew/CLAUDE.md and crew/CHANGELOG.md are excluded (bucket B)", async () => {
  const root = await makeRepo({
    "crew/CLAUDE.md": "legacy wiggin references pending Phase 5",
    "crew/CHANGELOG.md": "## wiggin v0.1"
  });
  try {
    const result = await validateBrandingScrub(root);
    expect(result.ok).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("hits inside docs/parents/** and docs/planning/** are excluded (bucket C)", async () => {
  const root = await makeRepo({
    "docs/parents/runner-plugin-CLAUDE.md": "wiggin loop snapshot",
    "docs/planning/unification-plan.md": "the wiggin -> devcrew rename"
  });
  try {
    const result = await validateBrandingScrub(root);
    expect(result.ok).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("matching is case-insensitive", async () => {
  const root = await makeRepo({ "README.md": "Wiggin and WIGGIN both count" });
  try {
    const result = await validateBrandingScrub(root);
    expect(result.ok).toBe(false);
    expect(result.findings).toHaveLength(1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
