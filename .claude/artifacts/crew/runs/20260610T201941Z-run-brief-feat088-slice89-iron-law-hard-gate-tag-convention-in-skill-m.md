---
feature: FEAT-088
---
# Run Brief: FEAT088 SLICE89: Iron Law hard-gate tag convention in skill Markdown

- Created: 2026-06-10T20:19:41.169Z
- Goal: Adopt the superpowers-style `<HARD-GATE>` / `<EXTREMELY-IMPORTANT>` XML tag convention across owned skill Markdown so enforcement severity is explicit and self-documenting. The convention itself and the bulk retrofit already shipped under SLICE-07 (`docs/code-conventions.md` § "HARD-GATE tag convention" + `authoring-slices`, `loop-discipline`) and SLICE-09 (`verification-before-completion`). This slice closes FEAT-088 by extending the convention to the remaining prominent prose gate — `systemati
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - Wrap the `systematic-debugging` SKILL.md Iron Law block
  ("NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST") in `<HARD-GATE>` tags
  per `docs/code-conventions.md`.
- Confirm the convention is documented and ≥3 owned SKILL.md files already
  carry the XML tags (acceptance evidence for FEAT-088).
- Out Of Scope:
  - - Retrofitting skills whose only "HARD RULE" mention is a prose reference to a
  CLAUDE.md rule (e.g. `triage`) — no standalone gate block to wrap.
- Any runtime/behavioral change. Doc-only.
- A new validator for the tags (content-length cap already enforces line caps).
- Planned Files: -
- Next Step: Begin implementation

