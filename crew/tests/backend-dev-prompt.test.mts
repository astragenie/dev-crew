import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AGENT_PATH = path.join(REPO_ROOT, "agents", "backend-dev.md");

test("backend-dev.md exists and has frontmatter name=backend-dev", async () => {
  const md = await fs.readFile(AGENT_PATH, "utf8");
  expect(md).toMatch(/^---/);
  expect(md).toMatch(/name:\s*backend-dev/);
});

test("backend-dev.md declares server + DB scope and forbids FE code", async () => {
  const md = await fs.readFile(AGENT_PATH, "utf8");
  expect(md).toMatch(/Owned scope/);
  expect(md).toMatch(/api\//);
  expect(md).toMatch(/Forbidden/);
  expect(md).toMatch(/\*\.tsx/);
  expect(md).toMatch(/UX spec files/i);
});

test("backend-dev.md declares csharp stack capability", async () => {
  const md = await fs.readFile(AGENT_PATH, "utf8");
  expect(md).toMatch(/stacks:\s*\[csharp\]/);
  expect(md).toMatch(/\.NET/);
  expect(md).toMatch(/ASP\.NET Core/);
});

test("backend-dev.md mandates OpenAPI codegen as FIRST step", async () => {
  const md = await fs.readFile(AGENT_PATH, "utf8");
  expect(md).toMatch(/contract-codegen/);
  expect(md).toMatch(/FIRST step/i);
});

test("backend-dev.md mandates drift handling via help_request", async () => {
  const md = await fs.readFile(AGENT_PATH, "utf8");
  expect(md).toMatch(/help_request/);
  expect(md).toMatch(/do not invent/i);
});

test("backend-dev.md references the shared self-verify-gate skill", async () => {
  const md = await fs.readFile(AGENT_PATH, "utf8");
  expect(md).toMatch(/skills\/workflow\/self-verify-gate/);
});

test("self-verify-gate skill covers per-stack BE test runners", async () => {
  const skillPath = path.join(REPO_ROOT, "skills", "workflow", "self-verify-gate", "SKILL.md");
  const md = await fs.readFile(skillPath, "utf8");
  expect(md).toMatch(/dotnet test|pytest|bun test/);
});
