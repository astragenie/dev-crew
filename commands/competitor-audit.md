---
name: competitor-audit
description: Run a fresh competitor gap audit across all registered competitors, dispatch researchers to collect latest data, aggregate into ranked FEATs.
auto_execute_steps: false
---

# Competitor Audit

Refreshes the competitor gap registry by running market researchers on stale
competitors, then aggregates all briefs into a ranked FEAT backlog.

## Prerequisites

- `docs/research/competitors.json` — registry of competitors (auto-seeded from
  existing briefs).
- `scripts/competitor-audit/aggregate.mjs` — aggregation script (parameterized
  for repeatable runs).
- `loop:market-researcher` agent (requires loop plugin >= v0.36.0; shipped after
  release v0.35.0). Fallback: `crew:researcher` on older plugins.

## Workflow

Execute these steps in order:

1. **Read registry** — parse `docs/research/competitors.json` to extract
   competitor entries (each has `name`, `host`, `language`, `slug`,
   `suggested_sources`, `last_audited`).
2. **Identify stale competitors** — any where `(today - last_audited) > 30` days
   (or custom staleDays threshold).
3. **Create dated briefs directory** — `docs/research/<YYYY-MM-DD>-competitor-gap-audit/briefs/`
   (use today's date).
4. **Dispatch researchers in parallel** — for each stale competitor, dispatch
   `loop:market-researcher` via the Agent tool. Fill in `scripts/competitor-audit/researcher-prompt.md`
   placeholders: `{{COMPETITOR_NAME}}`, `{{COMPETITOR_HOST}}`, `{{COMPETITOR_LANGUAGE}}`,
   `{{COMPETITOR_SLUG}}`, `{{SUGGESTED_SOURCES}}`. Each researcher writes one brief
   to the new briefs directory (e.g., `cursor-agents.md`).
5. **Aggregate** — run aggregation script. This idempotent script parses all
   briefs, builds the comparison matrix, and writes new FEAT files for gaps with
   `composite >= 6`.
6. **Update registry** — edit `docs/research/competitors.json` to set
   `last_audited` (today) and `last_audit_dir` for each refreshed competitor.
7. **Suggest next action** — propose `/loop:triage` to score the new pending FEATs.

## Steps 1–2: Read registry and identify stale competitors

```bash
# Parse docs/research/competitors.json and list any competitors with
# last_audited older than today - 30 days
cat docs/research/competitors.json | node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync(0, 'utf8'));
  const today = new Date().toISOString().split('T')[0];
  const staleDays = 30;
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() - staleDays);
  data.competitors.forEach(c => {
    const lastAudited = new Date(c.last_audited);
    if (lastAudited < threshold) {
      console.log(c.slug);
    }
  });
"
```

For each stale competitor returned, note its `name`, `host`, `language`, `slug`,
and `suggested_sources`.

## Steps 3–4: Create briefs directory and dispatch researchers

Create the directory:

```bash
mkdir -p docs/research/$(date +%Y-%m-%d)-competitor-gap-audit/briefs
```

For each stale competitor, dispatch `loop:market-researcher` via the Agent tool
with this dispatch instruction (replace placeholders from the registry):

```
Dispatch loop:market-researcher with the researcher-prompt.md template filled in:
- {{COMPETITOR_NAME}} = <name from registry>
- {{COMPETITOR_HOST}} = <host from registry>
- {{COMPETITOR_LANGUAGE}} = <language from registry>
- {{COMPETITOR_SLUG}} = <slug from registry>
- {{SUGGESTED_SOURCES}} = <suggested_sources from registry>

Output target: docs/research/<YYYY-MM-DD>-competitor-gap-audit/briefs/<slug>.md
```

For loop plugin < v0.36.0, fall back to `crew:researcher` with this dispatch
instruction:

```
Research and write a competitor brief for <COMPETITOR_NAME> at
docs/research/<YYYY-MM-DD>-competitor-gap-audit/briefs/<COMPETITOR_SLUG>.md.
Use scripts/competitor-audit/researcher-prompt.md as the template. Fill in all
frontmatter (competitor, host, language, license, version_observed, sources,
brief_version), then complete the 10-axis matrix row and gap candidates.
Baseline: loop plugin (Wiggin-Loop) and crew plugin (workflow harness).
```

Dispatch all researchers in parallel (each writes a separate brief file).

## Step 5: Aggregate briefs into matrix and FEATs

```bash
node scripts/competitor-audit/aggregate.mjs --audit-dir docs/research/$(date +%Y-%m-%d)-competitor-gap-audit
```

This script:
- Parses all `briefs/*.md` files
- Builds a 10-axis comparison matrix
- Writes `matrix.md` to the audit directory
- Creates new FEAT files in `.claude/artifacts/loop/backlog/pending/` for each
  gap with `composite_score >= 6`
- Updates FEAT frontmatter on subsequent runs (idempotent)

## Step 6: Update registry

Edit `docs/research/competitors.json` to set `last_audited: "<YYYY-MM-DD>"` and
`last_audit_dir: "docs/research/<YYYY-MM-DD>-competitor-gap-audit"` for each
audited competitor.

## Step 7: Suggest triage

```
/loop:triage
```

This routes the newly written FEAT files through PM scoring (5-axis composite
priority, autonomous_safe flags, etc.).

## Output artifacts

- `docs/research/<YYYY-MM-DD>-competitor-gap-audit/matrix.md` — visual
  comparison grid (10 axes, loop+crew baseline, all competitors).
- `docs/research/<YYYY-MM-DD>-competitor-gap-audit/briefs/*.md` — individual
  researcher briefs for each audited competitor.
- `.claude/artifacts/loop/backlog/pending/*.md` — new FEAT files (one per gap
  with composite >= 6; `autonomous_safe: false` pending PM triage).
- `docs/research/competitors.json` — updated registry (last_audited,
  last_audit_dir per audited competitor).
