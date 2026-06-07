# Final Synthesis: FE/BE routing + skills mapping + crew:lead decommission

- Created: 2026-06-07T13:21:59.069Z
- Owner: lead-session
- Outcome: completed
- Summary: Loop-side Option B: added surface (frontend|backend|mixed|none) + stack vocab to classify-parser.mts; extended buildClassifyUpdates to write surface/stack into FEAT/slice frontmatter; updated /loop:backlog-enrich architect prompt to emit them; added 9 parser tests (all green). Added 'Required skills (invoke via Skill tool at start of every dispatch)' sections to loop:architect, pm, researcher, document-writer agents — distinguish required vs consult-when-context-matches. Decommissioned crew:lead in this repo: removed from hooks/guard-feat-dispatch.mjs allowlist, added 'Decommissioned roles' section to CLAUDE.md, updated agent boundaries text. Filed upstream-request 2026-06-07-hero-crew-orchestrate-slice-surface-stack-routing.md asking crew to read the new fields and dispatch builder-fe/builder-be accordingly. All gates green: typecheck/lint/format/manifest/content-length pass; 938+9 tests pass. Review + validation skipped with explicit reasons recorded (no behavior change observable until crew plugin ships matching reader).
- Changed Files / Evidence: -
- Run / Test Steps: -
- External Deltas: Crew plugin must implement reader in /crew:orchestrate-slice — see docs/upstream-requests/2026-06-07-hero-crew-orchestrate-slice-surface-stack-routing.md. Until crew reads surface/stack, every dispatch still routes to generic crew:builder. No other off-repo changes required.
- Risks: -
- Next Step: -

