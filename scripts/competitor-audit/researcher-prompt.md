# Researcher Prompt — Competitor Gap Audit

You are a `crew:researcher` subagent. Read-only investigation.

## Target

`{{COMPETITOR_NAME}}` — `{{COMPETITOR_HOST}}` ({{COMPETITOR_LANGUAGE}}).

## Reference repos / docs (the agent finds the rest)

{{SUGGESTED_SOURCES}}

## Baseline you are comparing against

- `loop` plugin (dev-crew method layer for Claude Code): HARD RULE blocks, slice scaffold (`/loop:slice from-feature|start|complete|grade`), phase-gate runner (`/loop:phase-gate`), backlog mgmt (FEAT/SPEC), grade trend + retrospectives, PM agent with 5-axis scoring + `autonomous_safe`, model routing per phase, per-invocation cache, validation gate at slice close.
- `crew` plugin (workflow harness for Claude Code): roles (lead, builder, reviewer, validator, deployer, researcher), gates (review, validation, deployment dev/prod, blocked, escalation), artifact discipline (`.claude/artifacts/crew/{runs,handoffs,reviews,validations,deployments,cost,cost-insights,agents}`), workflow-state badges, hero-crew CLI (`mark-badge`, `write-handoff`, `write-review-result`, `write-validation-result`, `write-final-synthesis`).

## Taxonomy — 10 axes

1. Workflow phases — explicit named phases (frame / build / review / validate / ship).
2. Roles / dispatch — distinct roles + handoff mechanics.
3. Artifacts / state — durable on-disk artifacts.
4. Memory / retention — persistent state across sessions.
5. Model routing — model selection per phase or per role.
6. Cost / telemetry — token / cost reporting + event logs.
7. Backlog / spec — FEAT / SPEC primitives.
8. Validation / gates — runnable gates that block progression.
9. Deployment — environment evidence + approval gates.
10. Install / distribution — install model, version pinning, upgrade story.

## Deliverable

Write a single Markdown file to:

`docs/research/2026-05-28-competitor-gap-audit/briefs/{{COMPETITOR_SLUG}}.md`

Conform to this schema EXACTLY (the aggregator parses it):

```markdown
---
competitor: {{COMPETITOR_NAME}}
host: <CC plugin | Python lib | Python CLI | IDE | hosted>
language: <Python | TypeScript | …>
license: <MIT | Apache-2.0 | proprietary | …>
version_observed: <semver or commit hash or date if no version>
sources: [<url1>, <url2>]
brief_version: 1
---

# {{COMPETITOR_NAME}} — competitor brief

## Identity

- Name, host, language, install model, version observed, license.
- 1-paragraph what-it-is summary (no marketing).

## Matrix row

| Axis                 | Symbol | 1-line note                        |
| -------------------- | ------ | ---------------------------------- |
| Workflow phases      | ● ◐ ○  | …                                  |
| Roles / dispatch     | ● ◐ ○  | …                                  |
| Artifacts / state    | ● ◐ ○  | …                                  |
| Memory / retention   | ● ◐ ○  | …                                  |
| Model routing        | ● ◐ ○  | …                                  |
| Cost / telemetry     | ● ◐ ○  | …                                  |
| Backlog / spec       | ● ◐ ○  | …                                  |
| Validation / gates   | ● ◐ ○  | …                                  |
| Deployment           | ● ◐ ○  | …                                  |
| Install / distribution | ● ◐ ○ | …                                  |

Legend: ● = full coverage, ◐ = partial, ○ = absent.

## Strengths vs loop / crew

- bullet
- bullet

## Weaknesses vs loop / crew

- bullet
- bullet

## Gap candidates

For each feature this competitor ships that loop / crew lack, write:

### GAP-1: <short title>

- Description: …
- Source: <doc URL or repo path>
- Impact (0-3): N — why
- Effort (0-3): N — why (higher = more effort to ship in loop / crew)
- Fit (0-3): N — why (alignment with current architecture)
- Composite: impact + (3 - effort) + fit = N

### GAP-2: …

## Inadvisable mimics

Features this competitor ships that loop / crew should NOT copy, with
reason (fights architecture, low value, philosophically opposed).

- bullet
- bullet
```

## Rules

- Read-only. No code edits, no git ops, no destructive commands.
- Public sources only. Skip features behind login walls.
- Stamp `version_observed` from the actual repo/site (not "latest").
- All 10 axes must appear in the matrix row (no skipping).
- Gap candidates ≥ 1 unless the competitor genuinely covers everything
  loop / crew do (very unlikely).
- Composite score: `impact + (3 - effort) + fit`, range 0-9. Show the
  arithmetic in the brief.

## Return value

When done, return:
- the path you wrote the brief to
- a 2-sentence headline summary
- the count of GAP-N entries

The lead reads the artifact directly; do not paste the full brief in
the return value.
