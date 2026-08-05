---
id: SLICE-196
title: Task-signal to skill mapping/matcher table
status: pending
feature: FEAT-230
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-08-04
updated: 2026-08-04
effort_points: 2
estimated_tokens: 100000
github_issue: 613
github_url: "https://github.com/astragenie/runner-plugin/issues/613"
---
# SLICE-196: Task-signal to skill mapping/matcher table

Implements FEAT-230. See [feature file](../../../backlog/in-progress/FEAT-230.md) for product context.

## Objective

Map task signals (slice tags, stack, concern) to skills drawn from the LIVE
catalog, replacing static preset skill lists that nothing validates.

SLICE-195 landed `enumerateSkillCatalog` (`src/scripts/lib/skill-catalog.mts`),
which walks `<crewRepoPath>/skills/domain/**` for `SKILL.md` markers. It has no
production caller by design — this slice is its first consumer.

**Measured 2026-08-05, and worse than FEAT-230's own description.** The four
genuinely dead skills are not merely referenced in this repo's `.claude/loop.json`
— they are referenced in **shipped presets** under `scripts/presets/`, which are
product surface rendered into adopter repos:

| preset | dead skills referenced |
|---|---|
| `dotnet-only.json` | `csharp-pro` |
| `dotnet-python.json` | `a11y-advisory`, `csharp-pro`, `frontend-advisory` |
| `dotnet-react.json` | `a11y-advisory`, `csharp-pro`, `frontend-advisory` |
| `dotnet-typescript-vue.json` | `a11y-advisory`, `csharp-pro`, `frontend-advisory`, `vue-engineering` |
| `typescript-plugin-dev.json` | `frontend-advisory` |
| `typescript-service.json` | — clean |

Five of six shipped presets name at least one skill that does not exist. Every
adopter on a dotnet preset has builders instructed to load skills that cannot be
loaded, silently — `resolveSkills` (`skill-resolver.mts:34`) reads the preset,
picks a block, and returns the names without ever checking any of them are real.

## In scope

- A signal→skill mapping/matcher keyed on slice tags (`stack:*`, `concern:*`)
  that resolves against `enumerateSkillCatalog`'s live output rather than a
  static list.
- **Unresolvable signals must fail loudly**, not silently drop. A signal that
  maps to no available skill is the exact condition that produced the table
  above and went unnoticed.
- Deterministic and explainable: same inputs always yield the same skills, and
  the reason a skill was selected is inspectable (feeds SLICE-197's `--explain`).
- Nested-skill correctness. `backend-advisory`, `database-architecture` and
  `react-engineering` are LIVE but nested under a subcategory. A flat lookup
  reports them missing — that is FEAT-230's own bug, and I reproduced it earlier
  while measuring drift. Fixtures must include at least one nested skill.
- Basename-collision handling. The catalog keys by basename; all 36 live skills
  are unique today, so collision is latent, not live. Make a collision fail
  loudly rather than silently picking one.

## Out of scope

- **Do not edit `scripts/presets/*.json` or `.claude/loop.json` in this slice.**
  The dead references are real and want fixing, but changing shipped adopter
  surface is a separate, deliberate change — and doing it here would erase the
  evidence this slice's matcher must be tested against. Fixtures should encode
  the current broken state, not a cleaned-up one.
- The CLI surface (`--slice` / `--tags` / `pickBlock` fallback) — SLICE-197.
- Cross-plugin docs and the upstream-request amendment — SLICE-198.
- The CI fixture-snapshot gate and DEC-071 — SLICE-199.
- Do not change `resolveSkills`'s existing preset path yet; this slice adds the
  mapping layer, SLICE-197 wires it in.

## Note on FEAT-230's autonomous_safe: false

This FEAT is a cross-plugin contract change — crew's `orchestrate-slice` is a
consumer, and two plugins' output contracts must stay compatible. Surface any
decision that changes what crew receives rather than settling it inside the
slice.

## Acceptance criteria

Scoped 2026-08-05 to this slice. FEAT-230 AC-1 is this slice's core; AC-2 and AC-6 are shared with SLICE-197; AC-3/AC-4 belong to SLICE-197, AC-5/AC-7 to SLICE-199, and the DEC-071 write-up to SLICE-199.

**The AC text below was reconstructed from `FEAT-230.md` by hand.** The
generated versions were truncated to each AC's first physical line ("WHEN the",
"THEN the" — sentences ending mid-clause), because FEAT-230's ACs are wrapped
across multiple lines and the extractor takes only the first. Filed separately;
do not re-generate this section from the FEAT.

- [ ] AC-1: GIVEN a slice tagged `stack:csharp` + `concern:security`, WHEN the mapping table resolves skills, THEN it returns only skill IDs that EXIST in the live crew catalog, matched to the task signals — no dead IDs.
- [ ] AC-2: GIVEN a signal that maps to no available skill, WHEN resolving, THEN it emits a clear "no matching skill for &lt;signal&gt;" and injects nothing for that signal — never a fabricated or dead ID.
- [ ] AC-3: GIVEN a skill that is LIVE but nested under a subcategory (`backend-advisory`, `database-architecture`, `react-engineering`), WHEN resolution runs, THEN it is found. A flat lookup reports these as missing, which is the exact bug FEAT-230 exists to fix.
- [ ] AC-4: GIVEN two catalog entries sharing a basename, WHEN resolution runs, THEN it fails loudly rather than silently selecting one. All 36 live skills are unique today, so this is latent, not live — assert it anyway.
- [ ] AC-5: GIVEN the same inputs twice, WHEN resolution runs, THEN the output is identical and the selecting signal for each skill is inspectable, so SLICE-197 can render `--explain` over it.
- [ ] AC-6: GIVEN the current shipped presets, WHEN fixtures are built, THEN they encode the real broken state (five of six presets naming at least one dead skill), not a cleaned-up version — the fixtures are the regression evidence.
- [ ] AC-7: Full suite green; typecheck + lint + format clean; snapshot-freshness passes.

**Correction to FEAT-230's own AC-1, do not propagate it.** The FEAT text cites
"`csharp-pro`/`react-engineering`-style dead IDs" as examples. `csharp-pro` is
genuinely dead; **`react-engineering` is LIVE**, just nested under a
subcategory. The FEAT's own acceptance criterion misclassifies a live skill as
dead by exactly the flat-lookup mistake the FEAT was written to eliminate. Use
`vue-engineering` or `a11y-advisory` as the second dead example instead.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- **FEAT-230 stays in `in-progress/`** — SLICE-197/198/199 remain open; only the final slice moves the feature to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
