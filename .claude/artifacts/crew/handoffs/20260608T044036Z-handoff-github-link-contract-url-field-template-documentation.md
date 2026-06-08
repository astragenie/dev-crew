# Task Handoff: github-link contract: URL field + template documentation

- Created: 2026-06-08T04:40:36.845Z
- From: builder
- To: lead
- Objective: Implemented audit findings #5 and #6: github_url now persisted at publish time, templates document the linkage fields
- Allowed Scope:
  - templates/
  - scripts/lib/github-sync.mjs
  - tests/github-sync.test.mjs
  - .claude/skills/loop/publish.md
- Forbidden Scope: -
- Deliverable: Code: publishAll writes github_url for new FEATs/slices and backfills it for previously-published entries; bootstrapFromGithub adds github_url. Docs: feature-template.md (both copies) + slice-template.md document github_issue/milestone/url + sub-issue/pr. Tests: 4 new cases covering URL persistence, backfill, idempotency, bootstrap URL write. Skill: publish.md documents the new field contract.
- Changed Files:
  - templates/backlog/feature-template.md
  - docs/backlog/feature-template.md
  - templates/slice-template.md
  - scripts/lib/github-sync.mjs
  - tests/github-sync.test.mjs
  - .claude/skills/loop/publish.md
- Confidence: high
- Risks: Existing FEATs with github_issue but no github_url will be silently rewritten on next publish; rewrite only adds a single field via mergeFrontmatter so risk is low. Slice template now has YAML frontmatter where it previously had none — downstream tooling that read the old shape (heading + bullets) is unaffected because real slices always had frontmatter; the template was just out of sync.
- Suggested Next Handoff: Reviewer: confirm URL composition uses the same  slug detectRepo() resolves; confirm backfill branch does not fire when github_url is already set (test publishAll-leaves-github_url-untouched). Then validator can dry-run /loop:publish against a scratch repo to confirm field appears in frontmatter.

