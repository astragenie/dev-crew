import { test } from "bun:test";
import { strict as assert } from "node:assert";
import { validatePreset, SchemaError } from "../scripts/lib/preset-schema.mjs";

test("validatePreset accepts a minimal split=false preset", () => {
  const preset = {
    schemaVersion: 1,
    presetName: "tpd",
    projectType: "claude-plugin",
    split: false,
    skills: ["typescript-pro"]
  };
  const out = validatePreset(preset);
  assert.equal(out.split, false);
  assert.deepEqual(out.skills, ["typescript-pro"]);
});

test("validatePreset accepts a minimal split=true preset", () => {
  const preset = {
    schemaVersion: 1,
    presetName: "dr",
    projectType: "saas",
    split: true,
    fe: { skills: ["react-engineering"] },
    be: { skills: ["csharp-pro"] }
  };
  const out = validatePreset(preset);
  assert.equal(out.split, true);
});

test("validatePreset throws on missing schemaVersion", () => {
  assert.throws(
    () => validatePreset({ presetName: "x", projectType: "saas", split: false, skills: [] }),
    SchemaError
  );
});

test("validatePreset throws on unsupported schemaVersion", () => {
  assert.throws(
    () =>
      validatePreset({
        schemaVersion: 99,
        presetName: "x",
        projectType: "saas",
        split: false,
        skills: []
      }),
    SchemaError
  );
});

test("validatePreset rejects preset carrying both skills and fe/be blocks", () => {
  assert.throws(
    () =>
      validatePreset({
        schemaVersion: 1,
        presetName: "x",
        projectType: "saas",
        split: true,
        skills: ["a"],
        fe: { skills: ["b"] },
        be: { skills: ["c"] }
      }),
    SchemaError
  );
});

test("validatePreset rejects split=true without both fe and be blocks", () => {
  assert.throws(
    () =>
      validatePreset({
        schemaVersion: 1,
        presetName: "x",
        projectType: "saas",
        split: true,
        fe: { skills: ["b"] }
      }),
    SchemaError
  );
});

test("validatePreset rejects unknown projectType", () => {
  assert.throws(
    () =>
      validatePreset({
        schemaVersion: 1,
        presetName: "x",
        projectType: "spaceship",
        split: false,
        skills: ["a"]
      }),
    SchemaError
  );
});

test("validatePreset accepts optional roles block", () => {
  const preset = {
    schemaVersion: 1,
    presetName: "tpd",
    projectType: "claude-plugin",
    split: false,
    skills: ["typescript-pro"],
    roles: {
      pm: { skills: ["pm-skill-a"] },
      architect: { skills: ["arch-a", "arch-b"] }
    }
  };
  const out = validatePreset(preset);
  assert.deepEqual(out.roles?.pm?.skills, ["pm-skill-a"]);
});

test("validatePreset accepts all four valid role keys", () => {
  const preset = {
    schemaVersion: 1,
    presetName: "x",
    projectType: "saas",
    split: false,
    skills: ["a"],
    roles: {
      pm: { skills: ["p"] },
      researcher: { skills: ["r"] },
      architect: { skills: ["a"] },
      "document-writer": { skills: ["d"] }
    }
  };
  validatePreset(preset);
});

test("validatePreset rejects unknown role key", () => {
  assert.throws(
    () =>
      validatePreset({
        schemaVersion: 1,
        presetName: "x",
        projectType: "saas",
        split: false,
        skills: ["a"],
        roles: { ceo: { skills: ["a"] } }
      }),
    SchemaError
  );
});

test("validatePreset rejects role block with non-array skills", () => {
  assert.throws(
    () =>
      validatePreset({
        schemaVersion: 1,
        presetName: "x",
        projectType: "saas",
        split: false,
        skills: ["a"],
        roles: { pm: { skills: "not-an-array" } }
      }),
    SchemaError
  );
});

// FEAT-218 Phase 1 found loop.*/stack.*/reviewers/mandatoryDocs were read at
// runtime but never schema-checked. These close that gap.

function baseFixture(extra: Record<string, unknown>) {
  return {
    schemaVersion: 1,
    presetName: "x",
    projectType: "saas",
    split: false,
    skills: ["a"],
    ...extra
  };
}

test("validatePreset accepts a fully-populated stack/reviewers/loop block", () => {
  const preset = baseFixture({
    loop: { aiLoopRoot: ".claude/artifacts/loop/ai-loop" },
    stack: {
      build: [{ cmd: "bun", args: ["run", "lint"] }],
      test: [{ cmd: "bun", args: ["test"] }],
      frontendBuild: null,
      infraPlan: { cmd: "terraform", args: ["plan"], cwd: "infra" },
      aspireBoot: null,
      healthchecks: []
    },
    reviewers: { ladder: ["A", "B"], strictParallel: true },
    mandatoryDocs: ["README.md"],
    productName: "Thing",
    productDescription: "A thing.",
    stackDescription: "- bun"
  });
  const out = validatePreset(preset);
  assert.equal(out.stack?.build?.[0]?.cmd, "bun");
});

test("validatePreset rejects a non-array stack.build", () => {
  assert.throws(
    () => validatePreset(baseFixture({ stack: { build: { cmd: "bun" } } })),
    SchemaError
  );
});

test("validatePreset rejects a stack stage missing cmd", () => {
  assert.throws(
    () => validatePreset(baseFixture({ stack: { build: [{ args: ["run"] }] } })),
    SchemaError
  );
});

test("validatePreset rejects reviewers.ladder with an invalid entry", () => {
  assert.throws(
    () => validatePreset(baseFixture({ reviewers: { ladder: ["A", "C"] } })),
    SchemaError
  );
});

test("validatePreset rejects a non-string-array mandatoryDocs", () => {
  assert.throws(() => validatePreset(baseFixture({ mandatoryDocs: [1, 2] })), SchemaError);
});

test("validatePreset rejects a non-string productName", () => {
  assert.throws(() => validatePreset(baseFixture({ productName: 42 })), SchemaError);
});
