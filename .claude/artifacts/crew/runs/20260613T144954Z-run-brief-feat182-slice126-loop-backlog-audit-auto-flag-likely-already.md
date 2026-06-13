---
feature: FEAT-182
status: active
---
# Run Brief: FEAT182 SLICE126: loop backlog audit — auto-flag likely-already-satisfied FEATs with evidence

- Created: 2026-06-13T14:49:54.449Z
- Tier: full
- Goal: Adopt ao beads audit (C:/work/mega/agentops cli beads audit): scan triaged/pending FEATs and cross-check acceptance hints against the current codebase + done/ siblings; flag (not auto-close) FEATs whose ACs appear already satisfied, each with file:line evidence. Keeps long-lived queues honest — stale FEATs survive triage because nobody re-derives them against shipped code.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New `src/scripts/lib/backlog-auditor.mts`: `auditBacklog(repoPath
  - opts?): Promise<AuditResult[]>` — for each triaged/pending FEAT
  - extracts AC bullet keywords and searches `src/` and `done/` siblings; returns `{id
  - verdict: 'likely_satisfied'|'partially'|'open'
  - evidence: string[]}` per FEAT
- New `loop backlog audit [--repo] [--json]` CLI subcommand
- `src/tests/backlog-auditor.test.mts` ≥5 tests using synthetic FEAT + source file temp directories
- Out Of Scope:
  - - Auto-close or auto-move FEATs to `done/`
- `--apply` flag (requires per-FEAT confirmation)
- Fuzzy/semantic matching (simple keyword search only)
- Planned Files: -
- Next Step: Begin implementation

