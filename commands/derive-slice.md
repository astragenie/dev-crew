---
name: derive-slice
description: Derive a new slice from the highest-priority unmet requirement in product-backlog.md when approved-slices.md is empty.
auto_execute_steps: false
---

# Derive Next Slice

Implements the Cross-Slice Continuation HARD RULE's derivation path. Use when
`<backlogPath>/approved-slices.md` is empty but
`<backlogPath>/product-backlog.md` still has unmet requirements.

Workflow:

1. Pick the highest-priority unmet requirement from
   `<backlogPath>/product-backlog.md`. Read its category, user-visible outcome,
   and any context lines.
2. Author a slice file at `<slicesRoot>/pending/SLICE_<NN>_<SHORT_NAME>.md`
   using the canonical template at `<aiLoopRoot>/00-entry/SLICE_TEMPLATE.md`.
   - Fill objective, in-scope, out-of-scope, acceptance criteria, done-when,
     risks, open questions.
   - Reviewer A and Reviewer B are TBD at this stage (assigned during review).
3. Run Reviewer A pass:
   - Read the slice file as a senior engineer for the relevant area
   - Verify acceptance criteria are testable with evidence per EVIDENCE_RULES.md
   - Surface gaps; revise slice file inline
4. Run Reviewer B pass:
   - Read as a security / production-readiness reviewer
   - Verify hard rules from CLAUDE.md aren't violated
   - Verify the slice doesn't bypass architecture docs
   - Surface gaps; revise inline
5. After both reviews pass, move the slice file from
   `<slicesRoot>/pending/` to `<slicesRoot>/active/` and append an entry to
   `<backlogPath>/approved-slices.md` with status `Approved`.
6. Update the entry in `product-backlog.md` (strikethrough or remove) noting
   the slice number that now owns the requirement.
7. Hand off to `/loop:next-slice` (or just begin the loop
   immediately per the Cross-Slice Continuation HARD RULE).

Do NOT stop for user confirmation at any point in this derivation — the
autonomous rule applies. Only stop if the unmet requirement is itself
externally blocked or fundamentally underspecified, in which case mark it
BLOCKED in `product-backlog.md` and document the blocker.
