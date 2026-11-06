---
name: validator-gate
prompt_id: validator-gate
version: 1.1.0
tier: workflow
description: Verifier dispatch decision procedure — when devcrew:verifier is skipped in favor of the evidenced reviewer approval (satisfiedByReview), and the risk-gated exceptions where the dedicated full gate still runs.
owner: astra
last_reviewed: 2026-07-08
triggers: ["verifier dispatch", "validation gate", "validator gate", "skip validation", "devcrew:verifier", "satisfiedByReview"]
---

# Validator Gate

## Trigger

Load when the dispatcher needs to decide whether and how to dispatch `devcrew:verifier` after a code-bearing slice completes.

## Verifier Dispatch Decision (FEAT-202 / SLICE-112 — lean review gate)

**Default (LOW/MEDIUM risk): delegate to the evidenced reviewer approval only when consumer CI backs it — otherwise dispatch `devcrew:verifier`.** LOW-risk slices: one reviewer; verifier is replaced by `write-validation-result --decision skipped --skip-reason "delegated to CI: <workflow file>"` only when `has-consumer-ci` reports present; otherwise dispatch `devcrew:verifier`. `has-consumer-ci` (`crew/scripts/lib/ci/consumer-ci.mts`, FEAT-027 / SLICE-53) reports `present: true` only for a `.github/workflows/*.yml` that triggers on push/pull_request and runs a test command. `.claude/loop.json` sets `loop.validation.satisfiedByReview: true`; `deriveValidationGate` (runner-plugin `src/scripts/lib/validation-gate.mts`, shared via the loop plugin's `/devcrew:close` ceremony) resolves `satisfied: true` with a `review-badge:` reason from a real, evidenced `devcrew:reviewer` approval artifact — never from the tolerant absence/unproven fallthrough — and only when `has-consumer-ci` reports present. The whole-repo full gate (lint, `format:check`, complete test suite, `verify:all`) is NOT dropped: when consumer CI is present it is owned by CI (`.github/workflows/ci.yml`, unconditional on push + PR) instead of a per-slice dedicated agent; when absent, the dedicated `devcrew:verifier` owns it instead. (The `pre-push-verifier` hook only checks for a recent PASS validation artifact — behind a default-off `push-verify` flag — and does not itself run the suite; CI is the actual full-suite safety net when present.)

**Dispatch `devcrew:verifier`** when ANY of:

- `has-consumer-ci` reports `present: false` (no consumer CI test gate to delegate to), OR
- slice frontmatter `risk: high`, OR
- FEAT tags include `concern:security` or `concern:performance`, OR
- `SPLIT_BUILD = true`

On this path `devcrew:verifier` runs concurrently with the (possibly fanned-out — see `fan-out-review`) reviewer(s) and owns the mandatory full gate for that slice, per the Step 5 prompt in `commands/orchestrate-slice.md`.

The only validation gate that may be recorded as skipped when `devcrew:verifier` ran is one explicitly recorded via a `devcrew:document-writer` dispatch with `badge: validation_skipped` + `reason: <text>` (e.g. environment unavailable) — never an implicit skip on "tests already green". On the delegated path (consumer CI present), the skip is instead recorded via `write-validation-result --decision skipped --skip-reason "delegated to CI: <workflow file>"`.

## Done

Validator gate decision is complete when:

- `RISK_GATE` (Step 4.5 of `commands/orchestrate-slice.md`) has been computed before the reviewer/verifier dispatch
- `devcrew:verifier` was dispatched when `RISK_GATE = true` OR `has-consumer-ci` reports absent, and skipped (validation delegated to `satisfiedByReview`) only when `RISK_GATE = false` AND `has-consumer-ci` reports present
- any skip on the risk-gated path has been explicitly recorded via `devcrew:document-writer` with `badge: validation_skipped` + `reason: <text>`
- implicit skips on "tests already green" have been avoided
