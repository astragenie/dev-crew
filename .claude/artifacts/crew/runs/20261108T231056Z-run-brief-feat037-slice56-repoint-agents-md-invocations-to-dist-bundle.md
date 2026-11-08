---
feature: FEAT-037
---
# Run Brief: FEAT037 SLICE56: Repoint agents/*.md invocations to dist/ bundles, excluding 3rdparty (53 refs, 19 files)

- Created: 2026-11-08T23:10:56.254Z
- Tier: full
- Goal: W2.5 path rewrite: point every shipped slash-command and agent prompt at the dist/ bundles so the plugin runs from a marketplace install without node_modules. FEAT-026 shipped self-contained dist bundles (dist/crew.js, dist/loop.js, dist/hooks/*.js) and migrated hooks/hooks.json, but commands/*.md (91 refs) and agents/*.md (42 refs) still invoke crew/scripts/crew.mts and src/scripts/loop.mts, which resolve @astragenie/*, zod and yaml from node_modules and crash in a consumer repo. The consumer-i
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

