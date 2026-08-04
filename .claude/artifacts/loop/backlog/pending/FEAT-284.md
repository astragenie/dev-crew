---
id: FEAT-284
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
---
## Description

git-anchored slice completion treats a prose mention of a slice in a commit message as proof that the slice shipped, silently dropping planned work. Reproduced live on 2026-08-04 against FEAT-259.

Mechanism. reconcileProposedSlicesAgainstGit in src/scripts/lib/slice-linker/git-anchored-completion.mts pre-filters commits with git log --grep <featureId>, then for each proposed slice builds the regex /FEAT-NNN[^\n]{0,80}?SLICE-<ordinal>\b|SLICE-<ordinal>\b[^\n]{0,80}?FEAT-NNN/i and tests it against the commit SUBJECT and BODY. Any match is recorded as shipped evidence. There is no examination of the commit's diff, no check that any file changed, and no check that the changed files bear any relationship to the slice. Commit text is the entire evidence base.

Live repro. Commit 71604bb4 is a docs-only commit: one new file under docs/research/ plus backlog frontmatter updates. It contains zero implementation. Its body includes the sentence 'run before committing FEAT-259's SLICE-1 to a design'. That single prose fragment matched the pattern, so reconcileProposedSlicesStartIndex advanced the materialization start index past -SLICE-1 and stamped proposed_slices_shipped: [-SLICE-1] with proposed_slices_shipped_commits: [71604bb4...] onto the FEAT. The subsequent slice from-feature run materialized only proposed slices 2 through 5 as SLICE-183 through SLICE-186. The SubagentStop report-gate hook -- the highest-ROI mechanism in the whole FEAT -- was never created, and nothing surfaced that it had been skipped. Independently verified that it had not shipped: no report-gate entry exists in .claude-plugin/hooks/hooks.json, whose SubagentStop array contains only emit-astrarunner-event.mjs and capture-at-close.mjs.

Why this is worse than an ordinary false positive. (a) It is silent -- the skip produces no warning, and a FEAT whose proposed slices were partly dropped looks fully sliced. (b) It is durable -- the stamp is deliberately written to FEAT frontmatter so the finding survives a fresh checkout, which means a wrong verdict also survives. (c) It is self-reinforcing -- discussing a slice in commit prose is exactly what planning, research and handoff commits do, so the more carefully a slice is designed before implementation, the more likely its design commits mark it shipped. (d) The prefix-advance model compounds it: a false positive on a low ordinal shifts the start index, so later legitimate slices materialize against the wrong proposed entries.

Secondary defect found in the same repro. materializeProposedSlices computes startAt = Math.max(existingSlices.length, opts.startIndex ?? 0), which assumes the Nth existing slice always corresponds to the Nth proposed entry. Once a middle entry is skipped that assumption breaks, and re-running slice from-feature re-materializes the LAST proposed slice as a duplicate rather than the missing one. Observed: a second from-feature invocation created a duplicate of -SLICE-5 (idle-ping suppression) and published a redundant GitHub issue for it, while -SLICE-1 remained missing. There is also no CLI flag to target a specific proposed slice, so this state cannot be repaired through the CLI at all -- the repair required calling createSlice through the BacklogStore API directly.

Proposed direction. Require diff-level corroboration before recording shipped evidence: a commit should only count if it actually modified files, and preferably files plausibly related to the slice (its touches_files when declared). Treat a text-only match as at most a warning that names the commit and asks for confirmation, never as a silent skip. Emit an explicit operator-visible line whenever any proposed slice is skipped, listing the ordinal, the title and the matched commit. Replace the contiguous-prefix start-index model with per-ordinal materialization keyed on id_suffix so a gap in the middle is repairable and re-runs are genuinely idempotent. Add a CLI escape hatch to materialize a named proposed slice.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.