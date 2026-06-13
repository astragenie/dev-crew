---
feature: FEAT-111
status: active
---
# Run Brief: FEAT111 SLICE115: One-click platform-native task ingress from Issue / PR

- Created: 2026-06-13T08:52:48.029Z
- Tier: full
- Goal: Add `--from-issue <url>` flag to `/loop:backlog-add` slash command so a GitHub Issue URL auto-populates FEAT frontmatter (title, body, github_issue, github_url) via `gh issue view`.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `--from-issue <url>` flag added to `commands/backlog-add.md` slash command flow
- `src/scripts/lib/from-issue.mts` (or extension of backlog-add script) that calls `gh issue view <url> --json title
  - body
  - number
  - url`
- Graceful error if `gh` CLI not available
  - not authenticated
  - or issue is inaccessible
- Unit tests for frontmatter generation from gh JSON output
- Out Of Scope:
  - - PR ingress (Issues only for this slice)
- Changes to loop.json github.repo field
- Planned Files: -
- Next Step: Begin implementation

