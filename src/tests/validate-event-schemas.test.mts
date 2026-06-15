import { describe, expect, test } from "bun:test";
import { validateEventSchemas } from "../scripts/validate-event-schemas.mjs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");

describe("validate-event-schemas", () => {
  test("loads the schema directory without errors", async () => {
    const result = await validateEventSchemas(repoRoot);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("returns error when index references a missing schema file", async () => {
    const result = await validateEventSchemas(repoRoot, {
      indexOverride: {
        schemaVersion: "1.0.0",
        envelope: "envelope.schema.json",
        kinds: { bogus: "missing.schema.json" }
      }
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("missing.schema.json"))).toBe(true);
  });
});
