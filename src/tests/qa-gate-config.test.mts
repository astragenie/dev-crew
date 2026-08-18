// Tests for qa-gate-config.mts — FEAT-264 SLICE-2 (AC-2 / AC-6, #527)

import { test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { resolveQaGateMode } from "../scripts/lib/qa-gate-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

test("resolveQaGateMode: explicit pre-build passes through", () => {
  assert.equal(resolveQaGateMode({ loop: { qa_gate: "pre-build" } }), "pre-build");
});

test("resolveQaGateMode: explicit off passes through", () => {
  assert.equal(resolveQaGateMode({ loop: { qa_gate: "off" } }), "off");
});

test("resolveQaGateMode: explicit post-build passes through", () => {
  assert.equal(resolveQaGateMode({ loop: { qa_gate: "post-build" } }), "post-build");
});

test("resolveQaGateMode: absent qa_gate key defaults to post-build", () => {
  assert.equal(resolveQaGateMode({ loop: {} }), "post-build");
});

test("resolveQaGateMode: absent loop block defaults to post-build", () => {
  assert.equal(resolveQaGateMode({}), "post-build");
});

test("resolveQaGateMode: null config defaults to post-build", () => {
  assert.equal(resolveQaGateMode(null), "post-build");
});

test("resolveQaGateMode: undefined config defaults to post-build", () => {
  assert.equal(resolveQaGateMode(undefined), "post-build");
});

test("resolveQaGateMode: unknown string value defaults to post-build", () => {
  assert.equal(resolveQaGateMode({ loop: { qa_gate: "sometimes" } }), "post-build");
});

test("resolveQaGateMode: wrong type (number) defaults to post-build", () => {
  assert.equal(resolveQaGateMode({ loop: { qa_gate: 1 } }), "post-build");
});

test("resolveQaGateMode: wrong type (boolean) defaults to post-build", () => {
  assert.equal(resolveQaGateMode({ loop: { qa_gate: true } }), "post-build");
});

test("resolveQaGateMode: live repo .claude/loop.json has no qa_gate key, resolves post-build", () => {
  const raw = readFileSync(join(REPO_ROOT, ".claude", "loop.json"), "utf8");
  const config = JSON.parse(raw);
  assert.equal(config?.loop?.qa_gate, undefined);
  assert.equal(resolveQaGateMode(config), "post-build");
});
