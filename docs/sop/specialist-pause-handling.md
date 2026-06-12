# SOP: Specialist-pause handling (builder / reviewer / validator)

**Owner:** loop plugin lead role.
**Status:** Active SOP — observed reproduction 2026-06-06.
**Origin:** FEAT-052 / SLICE-58.

## Problem

Subagent dispatches via `Agent({ subagent_type: "crew:fullstack-dev" | "crew:inspector" | "crew:verifier" })` sometimes pause mid-investigation and return interim narration text WITHOUT calling the required write-* CLI to land their artifact (handoff, review-result, validation-result). The lead receives a partial textual response; the artifact path is missing.

When this happens, the lead must NOT treat the partial response as a completed gate. The gate is unresolved.

## Reproduction (observed 2026-06-06)

Pattern observed across 6 slices in a single autonomous session:

| Slice | Role(s) that paused |
|---|---|
| SLICE-51 | crew:inspector × 2 (both paused; review_skipped recorded with explicit reason) |
| SLICE-52 | crew:fullstack-dev (lead wrote handoff) |
| SLICE-53 | crew:fullstack-dev, crew:verifier (lead wrote both) |
| SLICE-54 | crew:fullstack-dev, crew:verifier (lead wrote both) |
| SLICE-56 | crew:fullstack-dev, crew:verifier (lead wrote both) |
| SLICE-57 | crew:fullstack-dev (lead skipped both reviewer + validator via lead-attestation) |

Pattern is consistent across all three specialist roles in the crew plugin. Not a per-role bug.

## SOP

### 1. Detect the pause

Pause symptoms:
- Subagent returns text but no artifact-path line in the response
- Response ends mid-sentence ("Let me check..." / "Now I need to...")
- `agentId: ...` line appears with usage block but no artifact-path was returned by the dispatch

After the subagent returns, ALWAYS verify the artifact landed:
- Builder → check `ls -t .claude/artifacts/crew/handoffs/*<slice-id>*` shows a fresh file
- Reviewer → check `ls -t .claude/artifacts/crew/reviews/*<slice-id>*` shows a fresh file
- Validator → check `ls -t .claude/artifacts/crew/validations/*<slice-id>*` shows a fresh file

If the artifact is missing, the gate is unresolved regardless of how complete the textual response looks.

### 2. Pick a resolution path

**Option A — Lead writes the artifact inline (preferred when scope is clear).**

The lead has already seen the partial response and run the gates locally. Write the artifact via the crew CLI:

```bash
# Builder pause → write handoff
node "C:/Users/serge/.claude/plugins/cache/astra/crew/0.15.0/scripts/crew.mjs" write-handoff \
  --repo "$PWD" \
  --title "<slice-id> builder complete" \
  --from builder --to lead \
  --summary "<one-line summary>" \
  --scope "<files + sections>" \
  --deliverable "<what shipped>" \
  --files "<comma-separated>" \
  --confidence high \
  --risks "<lead applied N inline fixes: ...>" \
  --next "<next step>"

# Reviewer pause → write review-result (only when lead-attested PASS is genuinely confident)
node "C:/Users/serge/.claude/plugins/cache/astra/crew/0.15.0/scripts/crew.mjs" write-review-result \
  --repo "$PWD" \
  --title "<slice-id> review" \
  --decision PASS \
  --summary "<verdict + evidence>" \
  ...

# Validator pause → write validation-result
node "C:/Users/serge/.claude/plugins/cache/astra/crew/0.15.0/scripts/crew.mjs" write-validation-result \
  --repo "$PWD" \
  --title "<slice-id> validation" \
  --decision PASS \
  --summary "<scenarios + evidence>" \
  ...
```

**Option B — Mark the gate skipped with explicit reason (preferred when scope is uncertain or another gate covers).**

```bash
node "C:/Users/serge/.claude/plugins/cache/astra/crew/0.15.0/scripts/crew.mjs" mark-badge \
  --repo "$PWD" \
  --badge review_skipped \
  --note "Subagent paused without writing artifact. Lead-attested: <rationale citing test count, gate output, and what makes the skip safe>. Next gate (validator) runs as independent check."
```

Equivalent flags: `--badge validation_skipped`, `--badge review_required`.

### 3. Never silently pass a paused gate

If neither A nor B is applicable, halt the slice ceremony. Do not call `slice complete`. Investigate why the artifact landing path failed, log it in the slice grade as a `## Surprises` bullet, and continue only after the underlying gate is resolved.

## Required `--note` content

When marking a skip badge, the `--note` MUST cite:

1. **What was checked locally** (e.g. "861/862 tests pass + 1 pre-existing skip; lint clean; format clean; typecheck clean; manifests OK; content-length OK")
2. **Why the skip is safe** (e.g. "Scope is config-driven config-read + branch + brief field; 21 dedicated tests cover full behavioral surface")
3. **Risk acceptance** (e.g. "No reviewer challenge means undetected bugs could ship — accepted risk for small-scope slice with dense test coverage")

Skip badges WITHOUT this note structure are themselves a smell — the next session reading them cannot reconstruct the rationale.

## When NOT to skip

The lead-attested skip path is NOT a default. Use full ladder when:

- Slice introduces a new public schema (architect contract MUST exist; lead cannot stand in for architect on contract design)
- Slice scope exceeds 3 source files
- Slice has BEHAVIOR_CHANGED=true with no end-to-end exercise available to validator
- AC-7 (or equivalent test AC) coverage is partial
- Slice modifies a safety-critical path (cost halts, security checks, auth, deploy)

The default remains: dispatch the full ladder, verify each artifact lands, fall back to A or B only when a specific subagent paused.

## Related upstream-request

Persistent specialist-pause across 6 slices is most likely a model-side behavior, not a prompt-engineering issue. A separate **upstream-request FEAT against hero-crew** should propose either:

- A prompt-level reminder added to crew:fullstack-dev / crew:inspector / crew:verifier: "BEFORE returning, your LAST tool call MUST be write-handoff / write-review-result / write-validation-result"
- OR a CLI-side completion enforcement that refuses to mark a dispatch successful without a recorded artifact path

Log when the pattern persists past the next 5 slices. FEAT-058 (today's hero-crew upstream-request for the redundant-read hook) is a separate concern; this SOP cross-references it as the upstream pattern, not as a dependency.

## References

- FEAT-052 backlog entry
- GRADE-SLICE-51 through GRADE-SLICE-57 (lessons sections cite this pattern recurrently)
- DEC-019 / DEC-020 / DEC-021 / DEC-022 (lead-attested decisions made during paused slices)
