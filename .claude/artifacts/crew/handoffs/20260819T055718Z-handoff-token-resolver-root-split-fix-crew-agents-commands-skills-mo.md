# Task Handoff: Token-resolver root split: fix crew/agents-commands-skills monorepo-move drift

- Created: 2026-08-19T05:57:18.958Z
- From: fullstack-dev
- To: lead
- Objective: createTokenResolver now splits surfaceRoot (agents/commands/skills — monorepo root) from docsRoot (routing-table.yaml/models.yaml — crew/), fixing validate-configs.mts (46->2 errors) and validate-agent-refs.mts (13->6, and now genuinely scans commands/skills/agents/.claude-loop instead of silently scanning nothing). Investigated crew/.claude deletion per lead's decision; found workflow-config.mts's default repoPath resolution reads crew/.claude/workflows.yaml at runtime (37 test failures on delete) so restored it instead of deleting -- reporting back rather than deleting, contradicting the lead's initial call. Remaining 2/6 findings are pre-existing content debt (5 prose false-positives negating a token, 1 dead crew:using-crew reference from the original subtree import), individually justified, not fixed (out of bounded scope).
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - crew/scripts/lib/dispatch/resolve-token.mts
  - crew/scripts/validate-configs.mts
  - crew/scripts/validate-agent-refs.mts
- Confidence: high
- Risks: crew/.claude/ was NOT deleted (reversing the lead's tentative decision) -- workflow-config.mts's default repoPath resolution reads crew/.claude/workflows.yaml when repoPath=crew/ (its cwd-relative default), confirmed by 37 test failures on delete, restored via git checkout, re-verified 0 diff and full suite green. 2 validate-configs errors + 6 validate-agent-refs findings remain, individually justified as pre-existing content debt unrelated to the root-cause fix (not addressed -- editorial decision needed from lead: rename/allowlist crew:using-crew, decide on crew:brief-me references in commands/brief.md docs).
- Suggested Next Handoff: Lead: decide disposition of crew:using-crew (routing-table.yaml line 62 -- no matching skill exists anywhere in the repo, likely dead content from the original dev-team subtree import) and crew:brief-me (commands/brief.md references a retired command name in prose). Both are cosmetic/content, not code-path bugs.

