---
feature: FEAT-014
---
# Run Brief: FEAT014 SLICE39: Resolve TS6-vs-TS7 compiler-API landmine (design decision + ADR)

- Created: 2026-08-19T21:51:30.170Z
- Tier: full
- Goal: crew/ flatten phase 2 — unify tsconfig + package.json: single root package.json/bun.lock and one tsconfig strategy for the 287 crew files. Blockers to resolve: crew pinned TS6 because openapi-typescript needs the JS compiler API (native tsc 7 lacks it — keep typescript 6 as a devDependency for that tool or replace the tool), NodeNext-vs-Bundler moduleResolution divergence, ~10 crew-only deps to merge. CI crew-tests job then collapses into the root suite invocation.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - bullet 1
- bullet 2
- Out Of Scope:
  - - bullet 1
- Planned Files: -
- Next Step: Begin implementation

