---
id: FEAT-230
status: pending
priority: P1
category: architecture
target_release: null
created: 2026-07-06
updated: 2026-07-06
depends_on: [FEAT-218]
slices: []
derived_from: null
tags: [architecture, backend, dispatch, cross-plugin, skills]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: null
triage_notes: "Operator-requested 2026-07-06. Decommission presets as the skill source. Today the dispatcher injects a FROZEN per-stack skill list from preset.roles.*.skills / fe|be.skills; that list drifts (an upstream audit found this repo's presets reference crew skill IDs that no longer exist after crew's skills/domain reorg — csharp-pro/react-engineering/etc. gone → broken skill injection). FEAT-218 already demoted presets to install-time templates; this removes their SKILL role entirely and makes the dispatcher select the BEST-FIT skill set from the LIVE crew skill catalog based on the task (slice tags: stack/concern/surface), validated against what actually exists. Cross-plugin (reads crew's skill catalog) -> needs_contract, NOT autonomous_safe. Structural."
github_issue: 491
github_url: https://github.com/astragenie/runner-plugin/issues/491
---
# FEAT-230: task-driven skill selection — decommission presets as the skill source

## Contract landed (2026-07-08)

Architect design artifact:
`.claude/artifacts/crew/runs/2026-07-08-feat230-task-driven-skill-selection-contract.md`
(5 decisions, Options-Considered each; verified live against `dev-team/skills/domain/*`).

- **Decision 1 (central):** enumerate `<crewRepoPath>/skills/domain/**` recursively
  at resolve time (marker `SKILL.md`), gated on `loop.crewRepoPath` (reuse
  `eval-generator.mts:65-69` pattern, DEC-068 precedent). **Rejected the
  hardcoded-allowlist** — `validate-agent-refs.mts`'s `CREW_KNOWN_TOKENS` is the
  *same* drift-failure shape this FEAT fixes, not a fix.
- **Decision 2:** explicit hand-authored `Record<tagToken, skillId[]>` table,
  validated (never derived) against the live catalog. Rejected trigger-frontmatter
  heuristic matching.
- **Decision 3 (gap the FEAT glossed):** `resolve-skills` CLI (`loop.mts:712-753`)
  has **no task/tag input today** — `--variant` selects a role only. The upstream
  "only the path changes" premise
  (`docs/upstream-requests/2026-07-06-crew-orchestrate-slice-preset-path.md:55`)
  is false once task-driven selection lands → add an additive `--slice`/`--tags`
  flag, keep the old `pickBlock` path as fallback (DEC-069 "demote don't delete").
- **Decision 4:** layered validation — resolve-time catalog check (load-bearing)
  + CI fixture-snapshot regression guard on the mapping table.
- **Present-day finding:** this repo's own `.claude/loop.json` has **no
  `crewRepoPath`**, and the default `slice-build` dispatch
  (`dispatch.mts:69-80`) never calls `resolve-skills` — so AC-3 is trivially true
  for this repo's own default path. Real integration point = the CLI/resolver core
  + crew's external `orchestrate-slice.md` consumer, NOT a new in-loop call site.

Proposed slices: SLICE-1 catalog enumerator → SLICE-2 mapping/matcher →
SLICE-3 CLI integration + fallback → SLICE-4 cross-plugin docs (amend the
upstream-request) → SLICE-5 CI gate + DEC-071. Still `autonomous_safe: false`
(cross-plugin) — build behind the contract with a review-heavy lane.

## Origin

Operator request, 2026-07-06. An upstream-request audit surfaced a concrete
failure: this repo's presets (`dotnet-only.json`, `dotnet-react.json`,
`dotnet-typescript-vue.json`) reference crew skill IDs that **no longer exist**
(`csharp-pro`, `react-engineering`, `frontend-advisory`, `a11y-advisory`,
`vue-engineering`, … removed when crew reorganized `skills/domain/` into
`architecture`/`backend`/`ui`/`security-advisory`/…). The dispatcher injects
those dead IDs → **skill injection silently no-ops for those stacks**.

Root cause is architectural, not a typo: skill selection is driven by a
**frozen, hand-maintained per-stack list** in the preset (`preset.roles.<role>.
skills`, `preset.fe/be.skills`), resolved via `loop.mts resolve-skills --variant
<fe|be|single>`. That list drifts from crew's live catalog with every crew
reorg. FEAT-218 already demoted presets to install-time-only templates; this FEAT
finishes the job — **remove presets as the skill source entirely** and select the
best-fit skill set from the LIVE catalog by task.

## Goal

At builder-dispatch time, the dispatcher picks the agent + skill set by matching
the **task's actual needs** (the slice/FEAT's `tags`: `stack:*`, `concern:*`,
`surface:*`) against the **skills that actually exist in the crew catalog** — not
a preset's frozen list. Dead/renamed IDs become impossible because selection only
ever returns real catalog entries.

## Scope

1. **Live skill catalog source.** Discover crew's real skill inventory at
   resolve time (enumerate `<crewRepoPath>/skills/domain/*` or a crew-published
   skill manifest — pin the exact source in the contract step; reuse the
   `loop.crewRepoPath` config from FEAT-222/DEC-068). READ-ONLY on crew.
2. **Task → skill resolver.** Replace `resolve-skills --variant <fe|be|single>`
   (preset-list-driven) with a resolver that maps slice/FEAT signals
   (`stack:csharp` → the C#/backend skills that exist; `concern:security` →
   `security-advisory`/`security-sweep`; `surface:frontend` → `ui`/`typescript-pro`;
   etc.) to the best-fit subset of the LIVE catalog. Deterministic + explainable
   (log which signals selected which skills).
3. **Decommission the preset skill role.** Remove `preset.roles.*.skills` /
   `preset.fe/be.skills` as the source of truth. Presets may still seed
   stack IDENTITY (build/test commands, contract/deployment) per FEAT-218's
   install-time-template model, but they no longer dictate skill IDs. Retire
   `--variant fe|be|single` skill semantics.
4. **Validation gate.** A check (CI + resolve-time) that every resolved skill ID
   exists in the live catalog — this would have caught the dead-ID drift. When a
   signal maps to nothing available, log a clear "no matching skill" rather than
   injecting a dead ID.
5. **Cross-plugin contract.** crew's `orchestrate-slice.md` consumes the resolved
   skills. Coordinate with the FEAT-218 slice-D upstream-request
   (`docs/upstream-requests/2026-07-06-crew-orchestrate-slice-preset-path.md`) —
   the resolver's OUTPUT contract (what the dispatch payload carries) must stay
   compatible or be jointly updated. Record a DEC.

## Acceptance criteria

- AC-1: GIVEN a slice tagged `stack:csharp` + `concern:security`, WHEN the
  dispatcher resolves skills, THEN it returns only skill IDs that EXIST in the
  live crew catalog (no `csharp-pro`/`react-engineering`-style dead IDs), matched
  to the task signals.
- AC-2: GIVEN a signal that maps to no available skill, WHEN resolving, THEN the
  resolver logs a clear "no matching skill for <signal>" and injects nothing for
  it — never a fabricated/dead ID (structural fix for the drift).
- AC-3: GIVEN a repo with presets present, WHEN the dispatcher resolves skills,
  THEN `preset.roles.*.skills` / `fe/be.skills` are NOT read as the skill source
  (grep proves no runtime read of preset skill lists in the dispatch path).
- AC-4: GIVEN the resolver output, WHEN a builder is dispatched, THEN the
  dispatch payload's skill block is compatible with what crew's `orchestrate-slice`
  consumes (contract preserved or jointly updated per the upstream-request).
- AC-5: A validation gate (CI + resolve-time) fails when a resolved/declared skill
  ID is absent from the live catalog.
- AC-6: Resolution is deterministic + explainable — a `--explain` (or log) shows
  which task signals selected which skills.
- AC-7: A DEC-* records the decommission-preset-skills decision + the live-catalog
  source + the task→skill mapping rules.
- AC-8: Full suite green; typecheck + lint + format clean; snapshot-freshness passes.

## Risks / open questions

- **Live-catalog source** — enumerate `skills/domain/*` directly vs a crew-published
  manifest. Directory enumeration is simplest but couples to crew's layout; a
  manifest is cleaner but doesn't exist yet (would be an upstream ask). Decide in
  the contract step.
- **Mapping rules** — `stack/concern/surface` → skills needs an explicit,
  reviewable table; avoid an opaque heuristic. Start from the tags the PM/architect
  already emit (FEAT-218 kept `tags`/`needs_contract`/`needs_ux`).
- **Cross-plugin timing** — crew's `orchestrate-slice` still hardcodes a preset
  path (slice-D, still open). This FEAT's resolver output must not break that
  during the migration window — sequence with the slice-D upstream request.
- **Offline / no-crew-repo** — when `loop.crewRepoPath` is unset, resolution must
  degrade gracefully (skip skill injection with a logged reason, never throw),
  mirroring FEAT-222's skip-path posture.

## Refs

- `src/scripts/lib/skill-resolver.mts` (`resolveSkills`) + `loop.mts resolve-skills`
  (the preset-driven resolver to replace).
- `scripts/presets/*.json` (`roles.*.skills`, `fe/be.skills` — the frozen lists to
  decommission as the skill source).
- FEAT-218 / DEC-069 (preset removal groundwork — presets already install-time-only).
- `loop.crewRepoPath` + DEC-068 (live crew-repo access, skip-path posture).
- `docs/upstream-requests/2026-07-06-crew-orchestrate-slice-preset-path.md` (slice-D — crew-side consumer).
- Evidence: upstream-request audit 2026-07-06 (dead skill IDs in this repo's presets).
