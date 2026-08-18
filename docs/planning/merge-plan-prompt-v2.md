# Self-prompt v2: produce the dev-crew unification plan

> Paste into a fresh session with cwd `C:\mega\dev-crew`. Supersedes
> `merge-plan-prompt-v1.md` (kept for provenance). Built from three adversarial
> reviews — see `demolition-synthesis.md` for what changed and why.

---

## PROMPT

You are producing the unification plan for **dev-crew**: merging the `crew` plugin
(repo `C:\work\mega\dev-team`, id `crew`) and the `runner` plugin (repo
`C:\work\mega\runner-plugin`, id `runner`, marketplace name `loop`) into a single
plugin **`devcrew`** developed in this repo (`C:\mega\dev-crew`), which already has
both harnesses installed and dogfoods the merge through its own backlog/slice
ceremony.

### Fixed operator decisions (do not relitigate — see CLAUDE.md "Decided constraints")

- Sole operator; no external installs to protect. Migration blast radius = local
  repos on this machine only.
- Full unification is the chosen end state: one repo, one manifest, one namespace
  `/devcrew:*`, hard cutover (no compat shims — Claude Code binds namespace to
  `plugin.json` `name` 1:1; verify empirically in step V4, but plan assumes no
  multi-namespace mechanism).
- Runtime: Bun-first. `.mts` sources, no build step, `bun test --parallel` wherever
  possible. dev-team's Node `--experimental-strip-types` fallback and no-parallel
  workaround (ADR-002) are legacy to migrate off.
- Branding: "Wiggin Loop" is retired. Methodology and plugin are both **dev-crew**.
  Scrub the name during content import (docs, templates, prompts, command text).
- Rejected alternatives, recorded not reargued: (a) versioned shared-contract
  package (plugins-common) — retires the historical pain cheaper but keeps two
  release trains and coordination tax; (c) runner as subdirectory of dev-team with
  two manifests — half-measure keeping two surfaces. Operator prefers one train,
  one surface, and accepts the cutover cost. Your plan's Section 1 records this
  trade honestly; it does not reopen it.

### Step 0 — Re-verification appendix (run FIRST, paste fresh outputs into working notes)

Every count below must come from these commands run in THIS session. Do not trust
any number written in any prior planning doc — three of six "verified" facts in v1
were already wrong on authoring day.

```bash
# surface counts, per parent repo (run in each)
find commands -maxdepth 1 -name '*.md' | wc -l
find commands/3rdparty -name '*.md' 2>/dev/null | wc -l
find agents -maxdepth 1 -name '*.md' | wc -l
find agents/3rdparty -name '*.md' 2>/dev/null | wc -l
find skills -name 'SKILL.md' | wc -l
# hook registrations (count commands in hooks.json, not files on disk)
python3 -c "import json;d=json.load(open('hooks/hooks.json'));print(sum(len(h['hooks']) for e in d['hooks'].values() for h in e))"  # dev-team
python3 -c "import json;d=json.load(open('.claude-plugin/hooks/hooks.json'));print(sum(len(h['hooks']) for e in d['hooks'].values() for h in e))"  # runner-plugin
# test counts
find tests -name '*.test.ts' | wc -l          # dev-team
find src/tests -name '*.mts' | wc -l          # runner-plugin
# versions + coupling floor
grep -n MIN_CREW_VERSION C:/work/mega/runner-plugin/src/scripts/lib/plugin-identity.mts
grep -n '"version"' C:/work/mega/dev-team/.claude-plugin/plugin.json C:/work/mega/runner-plugin/.claude-plugin/plugin.json C:/work/mega/astra-marketplace/.claude-plugin/marketplace.json
# crew-reference count — state the command WITH the number, always
grep -rlw crew C:/work/mega/runner-plugin/src/scripts | wc -l
# open upstream requests (open vs archived, separately)
ls C:/work/mega/runner-plugin/docs/upstream-requests/*.md | wc -l
ls C:/work/mega/runner-plugin/docs/upstream-requests/archive/*.md | wc -l
# local adopter repos (minimum blast radius; treat as floor not ceiling)
grep -rl '<!-- runner:start -->' C:/work/mega --include=CLAUDE.md
grep -rl '<!-- crew:start -->' C:/work/mega --include=CLAUDE.md
```

Structural facts stable enough to keep inline (still Read-confirm before load-bearing
use, flag drift as `[STALE — what changed]` rather than silently correcting):
runner→crew hard coupling via `plugin-identity.mts` (`MIN_CREW_VERSION`,
`findCrewCli()`, `CREW_MARKETPLACE_NAME`) and `slice-linker/crew-bridge.mts`
(execFile bridge, fail-soft per call, `crewCliRuntime()` branches bun/node by file
extension); crew→runner soft coupling via `.claude/loop.json` and named ceremony
references; crew works standalone, runner does not.

### Required reads before drafting (prior art — adopt or explicitly override)

- `C:/work/mega/dev-team/docs/architecture/decisions/ADR-002-bun-runtime-no-go.md`
  — the reasoned case for crew's Node fallback. Bun-first is decided, but your
  runtime section must address each ADR-002 concern: fixed, obsolete, or
  quarantined. Check the underlying Bun scheduler bug's upstream status live.
- `C:/work/mega/plugins-common` — structure + README + any ADRs. State what its
  shared-package attempt learned that the dedupe phase reuses.
- runner-plugin `docs/memory.md` (machine contracts, path drift, reviewer ladder)
  and `docs/halt-badges.md` (SPEC-003 cross-plugin halt-badge contract).
- runner-plugin DEC-075..079 + the 2026-07-08 plugins-common DEC; dev-team
  `gepa.config.json` + `agents/*/.gepa/` state layout.
- `demolition-synthesis.md` (sibling file) — full findings disposition.

### Live experiments (do, don't recall)

- **V4 namespace check**: build a throwaway plugin whose manifest name is `devcrew`
  containing one command; install locally; confirm `/devcrew:x` resolves and that no
  mechanism exposes a second prefix from one manifest. Record result. If multi-prefix
  IS possible, note it as an option but keep the single-namespace decision.
- **Bun parallel check**: run dev-team's test suite once under
  `bun test --parallel` on this machine, record failures. Output feeds the runtime
  phase: migrate-clean vs quarantine-list.

### Deliverable: plan document (each section has a rejection bar — a plan failing any bar is not done)

1. **Decision record** — the fixed decisions above, the two rejected alternatives
   with their genuine strengths stated fairly, and the operator's actual reasons.
   Bar: a reader who disagreed could still reconstruct the trade.
2. **Target architecture** — devcrew repo layout; single manifest; full old→new
   naming map as tables: every command (`/crew:*`, `/runner:*` → `/devcrew:*`),
   every agent (`crew:fullstack-dev` → `devcrew:fullstack-dev`, collision
   resolutions for duplicated names: both parents ship `document-writer`,
   `researcher`, `cost-setup`, `install`), every skill dir, every hook. Bar: no
   "TBD" cells; collisions resolved by rule stated once.
3. **Runtime unification (BEFORE seam work)** — Bun-first migration: `.ts`→`.mts`
   policy for dev-team source, test-runner strategy from the live parallel-check
   results (quarantine list, not global serialization), single tsconfig/biome
   story, ADR-002 concern-by-concern disposition. Bar: every ADR-002 concern
   addressed by name.
4. **Seam elimination** — only after §3: every `execFile` call in
   `crew-bridge.mts` mapped to a direct import or deliberately kept (the bridge is
   fail-soft; direct imports convert subprocess failures to in-process crashes —
   state per call which error-handling contract replaces it); delete
   `findCrewCli`/`MIN_CREW_VERSION`; merge `.claude/loop.json` + crew config into
   one schema with a migration for already-installed local repos. Bar: per-call
   inventory keyed to Step 0's fresh reference count, not a prose wave.
5. **Content import + dedupe** — git history preservation strategy (subtree vs
   filter-repo) with explicit handling of GEPA `prior_prompt_hash` promotion
   pointers (commit-hash references break under rewrite — decide preserve vs
   reset-with-note); skill/agent/validator dedupe using plugins-common lessons;
   Wiggin Loop branding scrub inventory (grep-derived file list). Bar: GEPA and
   branding each have a concrete file-level inventory.
6. **Identity migrations** — astramem: `memory.project` moves to `dev-crew`
   (already set in this repo's loop.json); decide fate of ~90k records under
   project `runner-plugin` (re-tag, dual-project recall window, or abandon with
   rationale). Marketplace: replace `loop` + `crew` entries with one `devcrew`
   entry in `astra-marketplace`; local repos migration script that rewrites
   `<!-- runner:start -->`/`<!-- crew:start -->` blocks and `crew:*`/`runner:*`
   dispatch tokens across the Step 0 adopter list. Bar: the migration script's
   behavior specified per marker-block type; runs idempotently.
7. **CI harmonization** — one gate list from both parents' validators (counted
   fresh), dedupe (`validate-org-refs`, `validate-agent-refs`, `validate-manifests`
   exist in both), disposition of runner's metrics-band/clause-registry machine
   contracts (keep, port, or retire deliberately). Bar: every parent gate
   dispositioned by name.
8. **Risk register** — one row per historical seam incident (rename-phantom,
   version-floor bumps, marketplace drift, lead-mode pause) stating the condition
   under which that class recurs INSIDE the monorepo, plus: GEPA state portability,
   release-train coupling (crew hotfix now ships runner surface too — name the
   mitigation), context bloat (~55 commands / ~40 agents / ~85 skills in one
   plugin surface — measure, don't assume, what Claude Code loads per session;
   propose trimming/tiering if material), loss of MIN_CREW_VERSION pin as
   de-risking lever. Bar: every row has a checkable tripwire (a command, a CI
   gate, a schema check) — no vague-mitigation rows.
9. **Phases + effort** — phases ordered per §3-before-§4; each phase tagged
   serialized vs wave-parallelizable (history import is serialized; dedupe sweeps
   may wave); slice-size only the parallelizable ones; effort in slices using this
   repo's ceremony. Bar: each phase has entry/exit gates measurable from repo
   state.

### Stop conditions (halt, report, do not keep planning)

- Any structural coupling fact above found materially wrong (not off-by-one) on
  re-verification.
- V4 namespace experiment contradicts the single-namespace assumption in a way
  that changes the migration path.
- Bun parallel check fails catastrophically (>10% of dev-team suites) — runtime
  decision needs operator input before the plan proceeds.
- GEPA or astramem state turns out to be unmigratable without loss the operator
  hasn't approved.

### Non-goals

No code imports, no commits, no marketplace edits, no FEAT filing until the
operator approves the plan. Plan lands at `docs/planning/unification-plan.md` in
this repo; then file phase-0 FEATs via `/runner:intake` on approval.
