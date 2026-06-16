---
name: runner:verification-before-completion
description: Use before making any completion claim ("tests pass", "bug fixed", "feature works", etc.). Loads the Iron Law and the claim→evidence lookup table. Trigger automatically when the agent is about to assert that work is done, passing, or fixed without having run the verification command in the current turn.
trigger: "always_on"
---

# Verification Before Completion

This skill enforces the Evidence-Before-Claims contract for all loop
agents. Before any completion claim is made, fresh command output from
this session — not memory, not a prior turn, not "should be" — is
required.

## The Iron Law

<HARD-GATE>
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.

A "completion claim" is any statement of the form:
- "tests pass" / "all tests green"
- "lint clean" / "no lint errors"
- "build green" / "compiles"
- "bug fixed" / "regression resolved"
- "feature works" / "working end-to-end"
- "deploy succeeded" / "deployed successfully"
- or any equivalent that asserts a verification outcome

Before making such a claim, the agent MUST have run the corresponding
verification command in the **current turn** and posted the full
output (exit code + stdout/stderr excerpt). Assertions based on prior
turns, memory of earlier runs, or inference ("the change looks correct")
are prohibited.

Violation of this law means the acceptance criterion is unverified and
must not be marked PASS.
</HARD-GATE>

## Claim → Evidence Lookup Table

Every claim type has exactly one acceptable evidence form. Run the
command, capture the output, post it inline before the claim.

| Claim | Required evidence |
|---|---|
| "tests pass" | Full output of `npm test` (or repo's test command) in this turn — includes pass count and exit code 0 |
| "lint clean" | Full output of `npm run lint` in this turn — zero warnings, exit code 0 |
| "build green" | Full output of `npm run build` / `tsc` in this turn — zero errors, exit code 0 |
| "bug fixed" | Failing reproducer first reproduced in this session; same reproducer now exits 0 with the fix applied |
| "feature works" | Live invocation output, screenshot, or curl response from this turn showing the expected behavior |
| "deploy succeeded" | Deploy command exit code + post-deploy health check output (HTTP 200 or equivalent) in this turn |
| "format clean" | Full output of `npm run format:check` in this turn — no diff output, exit code 0 |
| "manifest valid" | Full output of `node ./scripts/validate-manifests.mjs` in this turn — "Manifests OK" message |
| "type-checks" | Full output of `npm run typecheck` in this turn — zero errors, exit code 0 |
| "function/module added" | `grep` or `Read` of the compiled file in `scripts/` showing the exported symbol exists in this turn |

## Pre-Completion Checklist

Before writing any completion report or marking an AC as PASS, run
through this checklist:

<EXTREMELY-IMPORTANT>
1. Identify every acceptance criterion that involves a verifiable outcome.
2. For each such criterion, locate the matching row in the table above.
3. Run the listed command in the current turn.
4. Post the command + full output inline.
5. Only then assert the claim.

If the command cannot be run (environment unavailable, credential
missing), do NOT assert the claim — escalate with the blocker reason.
</EXTREMELY-IMPORTANT>

## Unacceptable Evidence Forms

These phrases in a completion report indicate missing evidence. Do not
use them:

- "should pass" / "should work"
- "I believe this is correct"
- "implemented conceptually"
- "TODO: verify"
- "based on the previous run"
- "the logic looks right"
- "no obvious issues"

## Relationship to Loop Discipline

This skill is invoked alongside [runner:loop-discipline](../loop-discipline/SKILL.md).
The loop-discipline skill governs when to stop and how to run the loop;
this skill governs the quality of evidence required before any stop or
completion assertion. Both apply at every slice close.
