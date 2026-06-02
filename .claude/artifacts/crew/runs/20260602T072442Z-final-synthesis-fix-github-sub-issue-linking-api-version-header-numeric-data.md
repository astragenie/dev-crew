# Final Synthesis: fix: GitHub sub-issue linking — API version header + numeric database id

- Created: 2026-06-02T07:24:42.038Z
- Owner: lead-session
- Outcome: completed
- Summary: Root cause was two bugs: (1) missing X-GitHub-Api-Version: 2026-03-10 header caused 404 (endpoint requires explicit 2026 API version); (2) passing issue number instead of numeric database id caused 422. Fix: attachSubIssue now fetches the numeric id via gh api repos/{repo}/issues/{number} then calls the sub-issues endpoint with the correct header. Also: publishAll now retries sub-issue linking for already-published pairs, stderr is piped to suppress raw terminal noise, 422 duplicate errors are silently suppressed. All 473 tests pass. Live validation confirmed: sub_issues_summary shows total:1 after linking.
- Changed Files / Evidence: -
- Run / Test Steps: -
- Risks: -
- Next Step: -

