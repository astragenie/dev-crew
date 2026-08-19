---
title: Competitor Gap Audit — loop & crew plugins
date: 2026-05-28
status: approved
owner: lead
type: research-spec
---

# Competitor Gap Audit — loop & crew plugins

## Goal

Catalog every feature that 7 competitor projects ship which `loop` and
`crew` do not, anchored to a fixed 10-axis taxonomy native to loop /
crew. Output drives the backlog: each unmet gap becomes a ranked
candidate FEAT for triage.

This is a **research / discovery brief**, not an implementation
project. No competitor feature is implemented as part of this work —
the audit produces ranked candidates only.

## Inputs

### Competitor shortlist (7)

| # | Competitor       | Host / language          | Why included                                     |
| - | ---------------- | ------------------------ | ------------------------------------------------ |
| 1 | superpowers      | Claude Code plugin       | Direct CC-plugin cousin, skill-based methodology |
| 2 | gstack           | Claude Code plugin       | Direct CC-plugin cousin, slash-command workflow  |
| 3 | CrewAI (lib)     | Python library           | Same-name agent-team framework; runtime rival    |
| 4 | LangGraph        | Python library           | Stateful agent orchestration; workflow-state competitor |
| 5 | Aider            | Python CLI               | Solo-agent build-loop competitor                 |
| 6 | Devin / SWE-Agent | Hosted / OSS autonomous | Autonomous-coding flagships                      |
| 7 | Cursor agents    | IDE-hosted               | Adjacent host with growing slash-command surface |

### Taxonomy — 10 axes

1. **Workflow phases** — explicit named phases (frame / build / review / validate / ship).
2. **Roles / dispatch** — distinct roles (builder / reviewer / validator / deployer / researcher) and how work is handed between them.
3. **Artifacts / state** — durable on-disk artifacts (handoffs, reviews, validations, run briefs, final syntheses).
4. **Memory / retention** — persistent state across sessions (memory files, summaries, snapshots).
5. **Model routing** — model selection per phase or per role; cost-aware switching.
6. **Cost / telemetry** — token / cost reporting; event logs.
7. **Backlog / spec** — feature/spec management primitives (FEAT, SPEC, decomposition, triage).
8. **Validation / gates** — runnable gates that block progression (validation gate, phase-gate, simplify gate).
9. **Deployment** — environment evidence (dev / prod), deployment artifacts, approval gates.
10. **Install / distribution** — install model (marketplace, pip, npm, vendored), version pinning, upgrade story.

## Method

### Dispatch model

Lead dispatches **7 parallel `devcrew:researcher` subagents**, one per
competitor. Each researcher works read-only against public sources
(documentation sites, GitHub repos, marketplace listings, blog posts).
No hands-on install / runtime probing is required.

Each researcher returns a **structured brief** (schema below). The lead
aggregates and synthesizes into the master matrix and ranked backlog
candidates.

### Per-researcher deliverable schema

Each researcher returns one Markdown file with this structure:

```markdown
---
competitor: <name>
host: <CC plugin | Python lib | Python CLI | IDE | hosted | …>
license: <MIT | proprietary | …>
version_observed: <semver or commit hash>
sources: [url1, url2, …]
---

# <Competitor> — competitor brief

## Identity
- Name, host, language, install model, version observed, license.

## Matrix row (10 axes)
| Axis                  | Symbol | 1-line note |
| --------------------- | ------ | ----------- |
| Workflow phases       | ● ◐ ○  | …           |
| Roles / dispatch      | ● ◐ ○  | …           |
| …                     | …      | …           |

- ● = full coverage  ◐ = partial  ○ = absent

## Strengths vs loop / crew
- bullet 1
- bullet 2

## Weaknesses vs loop / crew
- bullet 1
- bullet 2

## Gap candidates
For each feature this competitor ships that loop / crew lacks:

- **<gap title>** — short description.
  - Source: <doc URL or repo path>
  - Impact (0-3): N — why
  - Effort (0-3): N — why (higher = more effort to ship in loop / crew)
  - Fit (0-3): N — why (alignment with current architecture)
  - Composite: impact + (3 - effort) + fit = N / 9

## Inadvisable mimics
Features this competitor ships that loop / crew should NOT copy, with
reason (e.g. fights existing architecture, low value, philosophically
opposed).
```

### Lead synthesis

After all 7 researchers return:

1. **Build master matrix.** 8 columns (7 competitors + 1 baseline column
   for combined loop / crew) × 10 rows. Each cell carries the symbol +
   the 1-line note from the matching researcher brief.
2. **Compute gap-density per axis.** For each row, count how many
   competitors show ● where loop / crew show ◐ or ○. Axes with the
   highest density are flagged as priority investment areas.
3. **Dedupe gap candidates.** Identical or near-identical candidates
   from multiple competitors collapse into one with a `source_competitors`
   list.
4. **Rank by composite score** (descending).
5. **Auto-draft FEAT files** for any gap candidate with composite ≥ 6.
   Frontmatter:
   ```yaml
   id: FEAT-NNN
   title: <gap title>
   priority: P0 (composite 9) | P1 (8-7) | P2 (6) | P3 (<6, not auto-drafted)
   category: competitor-gap
   source_competitors: [<name1>, <name2>]
   composite_score: N
   created: 2026-05-28
   status: pending
   autonomous_safe: false
   ```
   Body includes rationale, source URLs, and a "Consider rejecting
   because …" section pre-filled from the inadvisable-mimic checks.

## Deliverables

| Path                                                                   | Owner       | Purpose                                                |
| ---------------------------------------------------------------------- | ----------- | ------------------------------------------------------ |
| `docs/superpowers/specs/2026-05-28-loop-crew-competitor-gap-audit-design.md` | lead   | This spec                                              |
| `docs/research/2026-05-28-competitor-gap-audit/briefs/<competitor>.md`  | researcher  | One per competitor (7 files)                           |
| `docs/research/2026-05-28-competitor-gap-audit/matrix.md`              | lead        | Master matrix + gap-density + ranked candidate list    |
| `.claude/artifacts/loop/backlog/pending/FEAT-NNN.md`                   | lead        | Auto-drafted FEAT files for composite ≥ 6 candidates   |

## Scoring rubric (detail)

### Impact (0-3)

| Score | Meaning                                                          |
| ----- | ---------------------------------------------------------------- |
| 0     | Cosmetic; users would not notice it missing                       |
| 1     | Niche; affects one workflow pattern                               |
| 2     | Common; affects most users at some point                          |
| 3     | Foundational; visible every session, structural                   |

### Effort (0-3)

| Score | Meaning                                                          |
| ----- | ---------------------------------------------------------------- |
| 0     | Trivial: hours; one module                                       |
| 1     | Small: 1-2 days; one module + tests                              |
| 2     | Medium: 3-7 days; multiple modules + ceremony updates            |
| 3     | Large: 2+ weeks; cross-cuts methodology + plugin + crew dep      |

### Fit (0-3)

| Score | Meaning                                                          |
| ----- | ---------------------------------------------------------------- |
| 0     | Fights existing architecture; would require rewriting core       |
| 1     | Plausible but awkward; needs an abstraction layer                |
| 2     | Drops in cleanly with minor adapter                              |
| 3     | Natural extension of an existing primitive                       |

### Composite

```
composite = impact + (3 - effort) + fit          # range 0-9
```

Mapping to priority on auto-drafted FEAT files:

| Composite | Priority |
| --------- | -------- |
| 9         | P0       |
| 8-7       | P1       |
| 6         | P2       |
| <6        | P3 (appears in master ranked candidate list; no auto-drafted FEAT) |

## Out of scope

- Positioning / messaging rewrites (would be a separate brief).
- User interviews / surveys.
- Paid features behind authentication walls (public docs only).
- Hands-on installation or runtime probing of competitors.
- Actually implementing any gap candidate (audit produces ranked list
  only; the user decides which to triage).

## Risks

- **Researcher quality drift.** 7 parallel agents may return briefs of
  uneven depth. Mitigation: the per-researcher schema is strict; the
  lead rejects + redispatches any brief missing matrix row, gap
  candidates, or inadvisable-mimic section.
- **Source rot.** Competitors version-bump fast (especially Aider,
  Cursor). Every brief stamps `version_observed`; matrix cells valid
  only at that snapshot.
- **CrewAI name collision.** The Python library `CrewAI` is unrelated
  to our `crew` plugin. The brief must include a 1-paragraph
  disambiguation block.
- **Auto-FEAT noise.** Composite ≥ 6 cutoff may produce too many draft
  features. If the audit produces >15 draft FEATs, the lead pauses and
  asks the user to either raise the cutoff or accept the volume.

## Success criteria

- 7 briefs in `docs/research/2026-05-28-competitor-gap-audit/briefs/`,
  each conforming to the schema.
- 1 master matrix file with all 80 cells (8 cols × 10 rows) filled,
  gap-density computed per axis, ranked candidate list at the bottom.
- N draft FEAT files in `.claude/artifacts/loop/backlog/pending/` where
  N is the count of composite-≥-6 candidates after dedup.
- Lead final synthesis under `.claude/artifacts/crew/runs/` summarizing
  top 5 candidates and recommending the next 2-3 to triage.

## Open follow-ups (for the implementation plan, not this spec)

- Cadence: should this audit re-run on a schedule (quarterly?) or
  on-demand only?
- Should the auto-drafted FEAT files run through `/loop:pm-triage`
  immediately, or stay in `pending/` until the user reviews them
  manually?
- If a competitor publishes a major version between the brief and
  triage, what's the staleness rule?
