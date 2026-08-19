// tests/model-profile-schema-parity.test.mts — SLICE-18 hardening.
//
// crew/models.yaml is the single source of truth for the tier-profile map
// (Decision 4). It has exactly two real readers: scripts/apply-model-profile.ts
// (via scripts/lib/models/schema.ts's Zod ModelsConfigSchema) and
// evals/lib/model-profile.ts (via a hand-rolled validateModelsConfig — the
// evals/ package boundary forbids importing scripts/lib or adding a zod
// dependency; see model-profile.mts's file-level doc comment).
//
// model-tiers-parity.test.mts already guards that the two files' *tier name
// lists* (MODEL_TIERS vs TIERS) never drift. It does NOT guard that the two
// files' *validation rules* (what counts as a well-formed models.yaml) agree
// — schema.ts's ModelsConfigSchema could grow a new required field or tighten
// a check and evals/lib/model-profile.ts would silently keep accepting the
// old shape, or vice versa. This file closes that gap: one fixture battery,
// asserted accept/reject-identical against both validators. Same enforcement
// pattern as model-tiers-parity.test.mts, extended from "tier names" to "the
// full accept/reject contract" — this is the single-source-of-truth guarantee
// for models.yaml made real, not just documented in a comment.
import { test } from "bun:test";
import assert from "node:assert/strict";
import { ModelsConfigSchema } from "../scripts/lib/models/schema.mjs";
import { validateModelsConfig, ModelProfileError } from "../evals/lib/model-profile.mjs";

function zodAccepts(data: unknown): boolean {
  return ModelsConfigSchema.safeParse(data).success;
}

function handRolledAccepts(data: unknown): boolean {
  try {
    validateModelsConfig(data);
    return true;
  } catch (err) {
    if (err instanceof ModelProfileError) return false;
    throw err;
  }
}

const VALID_ONE_PROFILE = {
  version: "1.0.0",
  default_profile: "claude",
  profiles: {
    claude: { reasoning: "opus", standard: "sonnet", light: "haiku" }
  }
};

const VALID_TWO_PROFILES = {
  version: "2.3.1",
  default_profile: "other",
  profiles: {
    claude: { reasoning: "opus", standard: "sonnet", light: "haiku" },
    other: { reasoning: "reasoning-model", standard: "standard-model", light: "light-model" }
  }
};

const FIXTURES: Array<{ name: string; data: unknown; expectAccept: boolean }> = [
  { name: "well-formed, single profile", data: VALID_ONE_PROFILE, expectAccept: true },
  { name: "well-formed, multiple profiles", data: VALID_TWO_PROFILES, expectAccept: true },
  { name: "non-object root (string)", data: "not an object", expectAccept: false },
  { name: "non-object root (null)", data: null, expectAccept: false },
  {
    name: "missing version",
    data: { default_profile: "claude", profiles: { claude: VALID_ONE_PROFILE.profiles.claude } },
    expectAccept: false
  },
  {
    name: "missing default_profile",
    data: { version: "1.0.0", profiles: { claude: VALID_ONE_PROFILE.profiles.claude } },
    expectAccept: false
  },
  {
    name: "missing profiles",
    data: { version: "1.0.0", default_profile: "claude" },
    expectAccept: false
  },
  {
    name: "default_profile not present in profiles",
    data: {
      version: "1.0.0",
      default_profile: "ghost",
      profiles: { claude: VALID_ONE_PROFILE.profiles.claude }
    },
    expectAccept: false
  },
  {
    name: "profile missing a tier (light)",
    data: {
      version: "1.0.0",
      default_profile: "claude",
      profiles: { claude: { reasoning: "opus", standard: "sonnet" } }
    },
    expectAccept: false
  },
  {
    name: "profile with a non-string tier value",
    data: {
      version: "1.0.0",
      default_profile: "claude",
      profiles: { claude: { reasoning: "opus", standard: "sonnet", light: 42 } }
    },
    expectAccept: false
  },
  {
    name: "non-semver version string",
    data: {
      version: "not-semver",
      default_profile: "claude",
      profiles: { claude: VALID_ONE_PROFILE.profiles.claude }
    },
    expectAccept: false
  }
];

for (const fixture of FIXTURES) {
  test(`schema.ts and model-profile.ts agree: ${fixture.name}`, () => {
    const zod = zodAccepts(fixture.data);
    const handRolled = handRolledAccepts(fixture.data);
    assert.equal(zod, fixture.expectAccept, `ModelsConfigSchema for "${fixture.name}"`);
    assert.equal(handRolled, fixture.expectAccept, `validateModelsConfig for "${fixture.name}"`);
    assert.equal(zod, handRolled, `schema.ts and model-profile.ts diverged on "${fixture.name}"`);
  });
}
