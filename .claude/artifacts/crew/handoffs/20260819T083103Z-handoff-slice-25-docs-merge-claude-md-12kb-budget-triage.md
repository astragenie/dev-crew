# Task Handoff: SLICE-25: docs merge + CLAUDE.md <=12KB budget triage

- Created: 2026-08-19T08:31:03.139Z
- From: fullstack-dev
- To: lead
- Objective: Rewrote CLAUDE.md (12274 bytes pre-include, under the 12288 cap), AGENTS.md, and README.md top section for the shipping dev-crew repo. Preserved the crew:start and runner:start marker blocks byte-identical (verified via byte-count diff: 169 and 3048 bytes, unchanged). Preserved the two live-cited clause ids (backlog-discipline, repo-conventions) plus 11 other clause markers ported/adapted from runner-plugin heritage. CLAUDE.md's CI gates numbered list matches docs/ci-gates.md's 19 gates exactly (SLICE-24 landed that file first). Corrected a stale docs/memory.md claim (reviewer ladder was documented as [A] but live .claude/loop.json has [A,B]) and its marker-block-owner note (two installers, not one). docs/README.md now records crew/docs/** (123 files) as an explicitly deferred, not-migrated disposition rather than silently omitting it.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - AGENTS.md
  - CLAUDE.md
  - README.md
  - docs/README.md
  - docs/memory.md
- Confidence: high
- Risks: crew/docs/** (123 files) bulk content migration deliberately deferred per task's explicit allowance -- a future FEAT must still do the move or formally retire the content. README.md's deeper sections (Marketplace, crew rump dependency, memory project-id example) were corrected for factual accuracy beyond the literal task list because they directly contradicted the new CLAUDE.md's Repo topology/Memory binding clauses; broader README sections (Quickstart, Configuration, presets, hierarchical dispatch, wave mode) were left untouched since they were already devcrew-branded and accurate. CLAUDE.md is only 14 bytes under the 12288 byte cap -- any future addition will require an offsetting trim.
- Suggested Next Handoff: SLICE-24's docs/ci-gates.md was read and matched exactly; no coordination gap found. Next docs-tree slice should scope the crew/docs/** migration (or explicit retirement) now that the map is honest about its deferred status.

