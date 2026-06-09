# Task Handoff: R-B competitor-audit repeatable - design complete, implementation pending

- Created: 2026-06-09T23:07:17.769Z
- From: researcher
- To: builder
- Objective: Make the one-shot 2026-05-28 competitor-gap audit repeatable — competitor registry, parameterized + idempotent aggregate.mjs, /loop:competitor-audit slash flow dispatching loop:market-researcher.
- Allowed Scope: scripts/competitor-audit/aggregate.mjs (hand-authored .mjs exception per CLAUDE.md — edit directly, no .mts source), src/tests/competitor-audit-aggregate.test.mts, docs/research/competitors.json (new), commands/competitor-audit.md (new).
- Forbidden Scope: agents/* (R-A shipped in c83df84), researcher-prompt.md schema fields parsed by aggregate.mjs (10-axis matrix, GAP-N regexes — changing them breaks 11 existing briefs), trend layer (R-C), PM wiring (R-D).
- Deliverable: registry + parameterized idempotent aggregator + slash command, tests green, one commit.
- Changed Files:
  - scripts/competitor-audit/aggregate.mjs
  - src/tests/competitor-audit-aggregate.test.mts
  - docs/research/competitors.json
  - commands/competitor-audit.md
- Confidence: high — all research done this session, findings below are read-from-code, not assumed.
- Risks: idempotency matching must scan ALL backlog states (a gap FEAT may have moved pending → triaged → done); title-key match via normalizeTitle can false-positive on retitled FEATs — match on category=competitor-gap AND normalized title.
- Suggested Next Handoff: builder → reviewer (standard ladder), then R-C (trend layer).

## Context (read-from-code findings, 2026-06-10 session)

### aggregate.mjs current state (scripts/competitor-audit/aggregate.mjs, 363 lines)
- Hardcoded audit dir in the CLI entry (~line 335): `docs/research/2026-05-28-competitor-gap-audit`.
- Hardcoded date strings in output: matrix heading "Master matrix — 2026-05-28 competitor gap audit" (~line 288) and renderGapBody "Competitor gap audit (2026-05-28)" (~line 228).
- NOT idempotent: runAudit's drafted loop (~lines 302-322) calls `addFeature` unconditionally for every ranked gap with composite >= 6 — a re-run duplicates every FEAT.
- Exports: AXES, parseBrief, dedupeAndRank, renderMatrixMarkdown, priorityFromComposite, runAudit. Key internals: normalizeTitle (lowercase, non-alnum → "-"; non-ASCII titles normalize to "" and are skipped), merge takes max(impact), min(effort), max(fit), recomputes composite.
- isMain CLI entry uses process.cwd() as repoPath, builds an all-● baseline named "loop+crew".

### Available helpers (scripts/lib/)
- backlog-writer.mjs: addFeature (writes pending/, frontmatter id/status/priority/category/created/updated/depends_on/slices/derived_from), updateFeatureFrontmatter(filePath, updates), moveFeature, findFeatureById(repoPath, featureId, config).
- backlog-parser.mjs: backlogRoot(repoPath, config), listBacklog, BACKLOG_STATES, nextFeatureId. Use listBacklog to scan all states for idempotency matching.
- frontmatter.mjs: parseFrontmatter, mergeFrontmatter, serializeFrontmatter.
- Backlog root: .claude/artifacts/loop/backlog/{pending,triaged,in-progress,done}.

### Existing tests (src/tests/competitor-audit-aggregate.test.mts, 294 lines, @ts-nocheck)
10 tests using tmpdir repos + SAMPLE_BRIEF constant. runAudit test (~line 247) shows the harness pattern: mkdtemp repo, write briefs, call runAudit, assert matrix.md + drafted FEAT frontmatter via findFeatureById. Extend, don't rewrite.

### Existing briefs (registry seed data)
docs/research/2026-05-28-competitor-gap-audit/briefs/: aider, crewai, cursor-agents, devin-swe-agent, github-copilot-workspace, gstack, langgraph, openhands, qodo, superpowers, windsurf (11 briefs, each with frontmatter: competitor, host, language, license, version_observed, sources[]). A second dated dir exists: docs/research/2026-06-08-platform-positioning (different schema, not part of this flow).

## Implementation steps

1. **Registry — docs/research/competitors.json** (new). Shape:
   `{ "staleDays": 30, "competitors": [{ "slug": "aider", "name": "aider", "suggested_sources": [<from brief frontmatter sources>], "last_audited": "2026-05-28", "last_audit_dir": "docs/research/2026-05-28-competitor-gap-audit" }, ...] }`
   Seed all 11 from existing brief frontmatter (read each brief's competitor + sources fields). Keep slug = brief filename base.

2. **aggregate.mjs parameterization.**
   - CLI flags: `--audit-dir <path>` (default: current hardcoded path for back-compat), `--repo <path>` (default cwd).
   - Derive `auditLabel` from the audit dir basename (e.g. "2026-05-28-competitor-gap-audit") and thread through runAudit opts; replace both hardcoded date strings.

3. **aggregate.mjs idempotency.**
   - New helper `findExistingGapFeat(repoPath, gapKey)`: listBacklog across ALL BACKLOG_STATES, match entries where frontmatter.category === "competitor-gap" AND normalizeTitle(title from `# FEAT-NNN: <title>` heading or frontmatter) === gapKey.
   - In the drafted loop: if found → updateFeatureFrontmatter with { composite_score, source_competitors (union), autonomous_safe preserved if already set by PM, updated: today, last_audit: auditLabel }; do NOT rewrite the body (PM/triage annotations live there); push to `updatedFeats`. If not found → existing addFeature path; also stamp `last_audit`.
   - Return shape: { briefs, ranked, matrixPath, draftedFeats, updatedFeats }.

4. **commands/competitor-audit.md** (new slash flow doc, follows commands/retrospective.md style). Steps it instructs:
   a. Read docs/research/competitors.json; stale = today - last_audited > staleDays (default 30).
   b. Create dated dir docs/research/<YYYY-MM-DD>-competitor-gap-audit/briefs/.
   c. Per stale competitor: dispatch `loop:market-researcher` (Agent tool) with scripts/competitor-audit/researcher-prompt.md filled ({{COMPETITOR_NAME}}, {{COMPETITOR_HOST}}, {{COMPETITOR_LANGUAGE}}, {{COMPETITOR_SLUG}}, {{SUGGESTED_SOURCES}}) targeting the new briefs dir. Parallel dispatch OK (independent files).
   d. Run `node scripts/competitor-audit/aggregate.mjs --audit-dir <new dir>`.
   e. Update registry: last_audited + last_audit_dir per audited competitor.
   f. Suggest /loop:triage as next action (new FEATs land in pending/).
   Note in the doc: loop:market-researcher requires plugin >= v0.36.0 (R-A shipped post-v0.35.0... verify: R-A commit c83df84 is AFTER the v0.35.0 bump 44b61eb, so market-researcher needs the NEXT release); fallback `crew:researcher` with prompt inlined works on older plugins.

5. **Tests to add** (extend existing file):
   - runAudit re-run on same briefs creates 0 new FEATs, updates existing (updatedFeats.length === draftedFeats from run 1; composite_score refreshed).
   - Re-run after gap FEAT moved to triaged/ still matches (no duplicate in pending/).
   - auditLabel threads into matrix.md heading + FEAT body (no hardcoded 2026-05-28 when --audit-dir differs).
   - Registry JSON parses and all 11 slugs present (cheap schema guard).

6. **Validators**: npm test, npm run lint, format:check, validate-manifests, validate-content-length (commands/*.md has no cap; agents unchanged).

## Session context for the next agent

- R-A shipped: agents/market-researcher.md (loop:market-researcher) at commit c83df84 — NOT in any release yet; cut v0.36.0 after R-B/R-C/R-D land, then `claude plugin update loop@loop`.
- This repo's plugin runtime serves from ~/.claude/plugins/cache/loop/loop/<version>/ — agents/skills changes are invisible to sessions until release + update + restart.
- pwsh JSON flags: plain single quotes ('{"a":1}'), CLI flags are kebab-case.
- R-C (trend layer: 11th Trajectory axis + /loop:market-trends cross-audit diffing) and R-D (PM demand-evidence wiring) remain after R-B; plan summary in the 2026-06-10 conversation, recoverable from this handoff + CLAUDE.md.
