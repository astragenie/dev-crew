import { test } from "node:test";
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
    assert.throws(() => validatePreset({ presetName: "x", projectType: "saas", split: false, skills: [] }), SchemaError);
});
test("validatePreset throws on unsupported schemaVersion", () => {
    assert.throws(() => validatePreset({
        schemaVersion: 99,
        presetName: "x",
        projectType: "saas",
        split: false,
        skills: []
    }), SchemaError);
});
test("validatePreset rejects preset carrying both skills and fe/be blocks", () => {
    assert.throws(() => validatePreset({
        schemaVersion: 1,
        presetName: "x",
        projectType: "saas",
        split: true,
        skills: ["a"],
        fe: { skills: ["b"] },
        be: { skills: ["c"] }
    }), SchemaError);
});
test("validatePreset rejects split=true without both fe and be blocks", () => {
    assert.throws(() => validatePreset({
        schemaVersion: 1,
        presetName: "x",
        projectType: "saas",
        split: true,
        fe: { skills: ["b"] }
    }), SchemaError);
});
test("validatePreset rejects unknown projectType", () => {
    assert.throws(() => validatePreset({
        schemaVersion: 1,
        presetName: "x",
        projectType: "spaceship",
        split: false,
        skills: ["a"]
    }), SchemaError);
});
