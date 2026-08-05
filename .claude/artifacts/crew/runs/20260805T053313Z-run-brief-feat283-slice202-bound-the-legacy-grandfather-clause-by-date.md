---
feature: FEAT-283
status: active
---
# Run Brief: FEAT283 SLICE202: Bound the legacy grandfather clause by date/marker cutoff for frontmatter-less artifacts

- Created: 2026-08-05T05:33:13.077Z
- Tier: full
- Goal: Fix defect (3) of the three in FEAT-283: the legacy grandfather clause is unbounded, so it silently satisfies the gate for artifacts written today.  `review-gate.mts:109-118` treats ANY artifact with no `decision` frontmatter key as "legacy … grandfathered pre-P1.3" and returns `satisfied: true`. There is no date bound, so the clause applies to an artifact written this minute.  SLICE-181 and SLICE-182 both closed through this path on 2026-08-04. Neither review artifact has frontmatter at all — o
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/review-gate.mts` — delete the `verdict.decision === null`
  branch at `:109-118`. A frontmatter-less artifact must fall through to
  `unproven` (gate NOT satisfied) with a message saying the artifact carries no
  `decision` key and how to fix it.
- Remove the now-dead `legacy` field from `ReviewGateResult` (`:77-78`) and any
  consumer that reads it. Leaving a permanently-false flag behind is the kind of
  vestige this slice exists to remove.
- Update the module header comment at `:12-13`
  - which documents the
  grandfathering behavior.
- Tests: a frontmatter-less artifact is unproven; the SLICE-181/182 shape
  specifically (no frontmatter at all
  - prose `**Decision: PASS**` in the body) is
  unproven; artifacts WITH a decision key are unaffected in every branch.
- Out Of Scope:
  - - Verdict vocabulary (SLICE-200) and artifact sort order (SLICE-201).
- The absence-tolerated branch at `:142-150`. It is a different rule — no
  artifact at all
  - versus an artifact that proves nothing — and it carries its
  own P2 join-key reasoning. Do not fold it in.
- Do not rewrite or backfill existing review artifacts.
- Planned Files: -
- Next Step: Begin implementation

