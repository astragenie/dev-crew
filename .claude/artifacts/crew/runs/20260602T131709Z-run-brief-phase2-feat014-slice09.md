---
phase: "2"
feature: FEAT-014
---
# Run Brief: PHASE2 FEAT014 SLICE09

- Created: 2026-06-02T13:17:09.422Z
- Goal: Ship verification-before-completion skill with Iron Law + claim->evidence table; enforce mid-task evidence requirement before completion claims
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New skill file `skills/verification-before-completion/SKILL.md` with:
  - Iron Law banner in `<HARD-GATE>` block (matches FEAT-013 convention)
  - Claim→evidence table covering: tests pass
  - lint clean
  - build green
  - bug fixed
  - feature works
  - deploy success
  - Pre-completion checklist agent must run before any "done/passing/fixed" claim
- Wire skill into `loop:loop-discipline` SKILL.md so it's surfaced alongside the existing discipline gates
- Brief mention in `docs/code-conventions.md` to anchor the convention
- Out Of Scope:
  - - Hook-based enforcement (post-Stop validation) — skill is prompt-level only this slice
- Modifying existing crew validation gate at slice close — separate concern
- Auto-detection of claim language in agent output
- Planned Files: -
- Next Step: Begin implementation

