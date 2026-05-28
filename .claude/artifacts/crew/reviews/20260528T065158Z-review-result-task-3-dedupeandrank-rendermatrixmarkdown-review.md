# Review Result: Task 3: dedupeAndRank + renderMatrixMarkdown review

- Created: 2026-05-28T06:51:58.714Z
- Reviewer: reviewer
- Decision: rejected
- Summary: Two correctness defects found: composite is stale after cross-component merging, and the dedupeAndRank test does not exercise the MIN(effort) semantic.
- Evidence Checked:
  - 1. Composite inconsistency (aggregate.mjs:161): max(composite) is taken from stored per-researcher scores
  - but the merged impact/fit/effort triple can yield a strictly higher composite than any individual stored value; e.g. A(impact=3
  - fit=2
  - effort=1
  - composite=7) + B(impact=2
  - fit=3
  - effort=1
  - composite=7) -> merged components yield 3+3+2=8 but stored stays at 7. Sort order at line 180 is driven by stale composite. 2. Test coverage gap (tests line 173
  - 179): both instances of 'Verification guard' have effort=1; min(1
  - 1)==max(1
  - 1) so the MIN(effort) semantic is not verified. 3. normalizeTitle Unicode silent drop (line 127): accented/CJK chars are stripped to empty string and the gap is silently skipped (line 173 'if (!key) continue'). No warning emitted. 4. renderMatrixMarkdown base-cell asymmetry (line 195): competitor cells are .trim()ed but the base cell literal is not
  - leaving a trailing space in the Markdown cell when note is empty. Cosmetic but inconsistent. 5. All tests pass
  - lint clean
  - manifests valid. Plugin shape not touched; plugin-validator and skill-reviewer not applicable.
- Files Reviewed:
  - scripts/competitor-audit/aggregate.mjs
  - tests/competitor-audit-aggregate.test.mjs
- Test Adequacy: 8 tests pass; dedupeAndRank test added but does not cover MIN(effort) path (both effort values are 1) — this is a required fix before approval
- Risks: Stale composite corrupts sort order in production rankings; MIN(effort) being wrong could silently survive future refactors
- Required Follow-up: Builder must: (1) recompute composite from merged components in mergeGapInto (impact + fit + (3 - effort)) rather than taking max(stored); (2) add a test assertion for min-effort selection where one instance has effort=1 and another has effort=3; (3) either emit a console.warn for normalised-empty titles or document the silent-skip as intentional; (4) trim the base cell in the renderMatrixMarkdown row template.

