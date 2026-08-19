# SOP: Specialist-pause handling (builder / reviewer / validator)

**Owner:** loop plugin lead role.
**Status:** Active SOP — observed reproduction 2026-06-06.
**Origin:** FEAT-052 / SLICE-58.

## Problem

Subagent dispatches via `Agent({ subagent_type: "devcrew:fullstack-dev" | "devcrew:inspector" | "devcrew:verifier" })` sometimes pause mid-investigation and return interim narration text WITHOUT calling the required write-\* CLI to land their artifact (handoff, review-result, validation-result). The lead receives a partial textual response; the artifact path is missing.

When this happens, the lead must NOT treat the partial response as a completed gate. The gate is unresolved.

## Reproduction (observed 2026-06-06)

Pattern observed across 6 slices in a single autonomous session:

| Slice    | Role(s) that paused                                                              |
| -------- | -------------------------------------------------------------------------------- |
| SLICE-51 | devcrew:inspector × 2 (both paused; review_skipped recorded with explicit reason)   |
| SLICE-52 | devcrew:fullstack-dev (lead wrote handoff)                                          |
| SLICE-53 | devcrew:fullstack-dev, devcrew:verifier (lead wrote both)                              |
| SLICE-54 | devcrew:fullstack-dev, devcrew:verifier (lead wrote both)                              |
| SLICE-56 | devcrew:fullstack-dev, devcrew:verifier (lead wrote both)                              |
| SLICE-57 | devcrew:fullstack-dev (lead skipped both reviewer + validator via lead-attestation) |

Pattern is consistent across all three specialist roles in the crew plugin. Not a per-role bug.

## SOP

### 1. Detect the pause

Pause symptoms:

- Subagent returns text but no artifact-path line in the response
- Response ends mid-sentence ("Let me check..." / "Now I need to...")
- `agentId: ...` line appears with usage block but no artifact-path was returned by the dispatch

**Raw file existence is NOT sufficient to prove an artifact landed.** Since
FEAT-161 (dev-team, 2026-06-13) shipped the scaffold-first output contract,
builder/reviewer/validator agents write a stub artifact with
`status: in-progress` as their FIRST tool call — before any Read/Grep/Bash
investigation — then overwrite the same path with `status: completed` as
their LAST tool call (see `dev-team/agents/inspector.md:41-52,295` for the
reviewer contract; builder and validator follow the equivalent pattern). A
pause mid-run leaves the in-progress scaffold behind: the file exists, but
it is not a landed artifact. Treating file existence alone as "landed"
false-positives on exactly the failure mode this SOP exists to catch — this
is the primary defense the detection step below relies on.

After the subagent returns, ALWAYS verify BOTH that the artifact exists AND
that its `status` field reads `completed`:

- Builder → check `ls -t .claude/artifacts/crew/handoffs/*<slice-id>*` shows a fresh file, then read it and confirm `status: completed` (not `in-progress`)
- Reviewer → check `ls -t .claude/artifacts/crew/reviews/*<slice-id>*` shows a fresh file, then read it and confirm `status: completed` (not `in-progress`)
- Validator → check `ls -t .claude/artifacts/crew/validations/*<slice-id>*` shows a fresh file, then read it and confirm `status: completed` (not `in-progress`)

If the artifact is missing, OR the artifact exists but its `status` field
reads `in-progress`, the gate is unresolved regardless of how complete the
textual response looks — classify it as a pause and proceed to Section 2.

### 1a. Record the event

Once a pause is detected (Section 1) and again once it is resolved,
append a structured event so the pause rate is machine-queryable instead
of a hand-counted prose estimate (FEAT-212 — see
`src/scripts/lib/pause-telemetry.mts`). Both calls write to the same
append-only `.claude/artifacts/loop/pause-events.jsonl`:

```bash
# On detection (kind mirrors the symptom that fired — see Section 1):
bun -e "
import('./src/scripts/lib/pause-telemetry.mts').then(({ recordPauseEvent }) =>
  recordPauseEvent(process.cwd(), {
    sliceId: '<slice-id>',
    agentRole: 'devcrew:fullstack-dev', // or devcrew:inspector / devcrew:verifier
    kind: 'pause',
    detection: 'no_artifact' // or scaffold_in_progress / mid_sentence
  })
)"

# On resolution, once Option A or B below lands the artifact/skip badge:
bun -e "
import('./src/scripts/lib/pause-telemetry.mts').then(({ recordPauseEvent }) =>
  recordPauseEvent(process.cwd(), {
    sliceId: '<slice-id>',
    agentRole: 'devcrew:fullstack-dev',
    kind: 'resume_success',
    detection: 'no_artifact'
  })
)"
```

Separately, every dispatch (paused or not) should record its outcome so
a real per-dispatch pause rate is computable — not just per-slice
incidence:

```bash
bun -e "
import('./src/scripts/lib/pause-telemetry.mts').then(({ recordDispatchOutcome }) =>
  recordDispatchOutcome(process.cwd(), {
    sliceId: '<slice-id>',
    agentRole: 'devcrew:fullstack-dev',
    outcome: 'paused' // or 'completed'
  })
)"
```

`bun src/scripts/loop.mts snapshot-memory --repo <path>` surfaces the
resulting rate as a `Pause rate (last N dispatches): X%` bullet in the
Loop telemetry section once at least one dispatch outcome is recorded;
it is omitted (never an error) when the file is absent.

### 2. Pick a resolution path — partially retired for reviewer/validator since crew 0.47.0

**Status: narrow retirement, reviewer/validator only.** Since crew 0.47.0
(installed; floor bumped in `src/scripts/lib/plugin-identity.mts::MIN_CREW_VERSION`,
FEAT-176/SLICE-134), `devcrew:inspector` (reviewer) and `devcrew:verifier`
(validator) dispatches write a scaffold artifact (`--scaffold --status
in-progress`) as their FIRST tool call and overwrite it (`--update ...
--status completed`) as their LAST (Section 1 above, confirmed present in
`agents/inspector.md` and `agents/verifier.md`). A tool-less-exit pause on
these two roles now leaves that scaffold behind — Section 1's
existence-AND-status check already resumes/completes the gate from the
scaffold in most cases without the lead needing to write an artifact from
scratch.

**Builder-tier dispatches (`devcrew:fullstack-dev` / `devcrew:frontend-dev` /
`devcrew:backend-dev`) are NOT covered by the scaffold contract** — 0.47.0
redesigned builders to never write a handoff artifact at all ("Builders
do NOT write handoff artifacts ... NEVER invoke write-handoff"; inline
follow-up only). There is no scaffold to check for a paused builder;
Section 1's status-check guidance does not apply to this role. This is a
different fix for the same underlying problem, not scaffold coverage —
don't assume a missing builder artifact means a catastrophic pause.

**`aiplugin-dev` is NOT covered as of 0.47.0.** It is a first-party crew
agent (not a vendored `3rdparty/*` agent) and the contract extension for
it landed in dev-team main via PR #150 but is **unreleased** — it ships
with the next crew release above 0.47.0. `.claude/artifacts/loop/pause-events.jsonl`
records `aiplugin-dev` pausing repeatedly on 2026-07-02 (FEAT-204/205/208/
209/210/211/212/213/214) with `notes: "agent lacks scaffold-first HARD
OUTPUT CONTRACT"` — live evidence the manual fallback is still needed for
this role today.

Section 2's manual fallback (Option A / Option B below) stays **ACTIVE**
for:

- builder-tier dispatches (`devcrew:fullstack-dev` / `devcrew:frontend-dev` /
  `devcrew:backend-dev`) — no scaffold exists by design
- `aiplugin-dev` — contract merged upstream but not yet released; re-check
  this note after the next crew version bump
- any agent invoked without the HARD OUTPUT CONTRACT (e.g. a vendored
  `3rdparty/*` agent)
- a catastrophic kill that occurs before even the scaffold's first tool
  call lands (no stub, no artifact at all) — applies even to
  inspector/verifier

Only skip straight to Section 1's scaffold-status check (and treat
manual fallback as optional) for `devcrew:inspector` / `devcrew:verifier`
dispatches. For every other role, manual fallback remains the default
path until its own contract ships and this section is updated again.

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

- A prompt-level reminder added to devcrew:fullstack-dev / devcrew:inspector / devcrew:verifier: "BEFORE returning, your LAST tool call MUST be write-handoff / write-review-result / write-validation-result"
- OR a CLI-side completion enforcement that refuses to mark a dispatch successful without a recorded artifact path

Log when the pattern persists past the next 5 slices. FEAT-058 (today's hero-crew upstream-request for the redundant-read hook) is a separate concern; this SOP cross-references it as the upstream pattern, not as a dependency.

## References

- FEAT-052 backlog entry
- GRADE-SLICE-51 through GRADE-SLICE-57 (lessons sections cite this pattern recurrently)
- DEC-019 / DEC-020 / DEC-021 / DEC-022 (lead-attested decisions made during paused slices)
