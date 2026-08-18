# dev-crew cleanup inventory

Date: 2026-08-18. Scope: what should NOT survive the merge, beyond
`unification-plan.md` §5's sketch. Every claim below was grep-verified this
session against the live parent repos (`C:/work/mega/dev-team`,
`C:/work/mega/runner-plugin`) — no reuse of prior-session counts. Where a
claim from the task brief or an existing doc turned out to be wrong, that's
called out explicitly rather than silently corrected.

Verdicts: **DELETE** (drop entirely, nothing survives) · **ARCHIVE** (keep a
copy somewhere non-live, e.g. `docs/retrospectives/` or a `_archived/`
corner, but not on the active surface) · **MERGE-INTO `<target>`** (one side
wins, named deltas fold in) · **KEEP** (carries forward unchanged).

---

## 1. Dead paths (runner-plugin)

| Path | Verdict | Evidence | Phase |
|---|---|---|---|
| `docs/ai-loop/` (00-entry/2 files, 01-loop-control/3, backlog/3, slices/pending/1 — 9 files) | DELETE | Byte-identical structure to the live `.claude/artifacts/loop/ai-loop/` tree (same subdirs: 00-entry, 01-loop-control, backlog, slices). `.claude/loop/rules.md` (the actually-consumed HARD RULES doc) points at `.claude/artifacts/loop/ai-loop/01-loop-control/EVIDENCE_RULES.md`, never `docs/ai-loop/...`. Only non-artifact live-code reference is a comment in `src/scripts/lib/slice-linker/slice-progress.mts:8` ("fallback when no...") and a one-off migration script (`src/scripts/migrate-product-backlog.mts`) that reads it as a *source* for a completed migration. `git log -1` on the path: 2026-06-09 (untouched 70+ days). Confirms `docs/memory.md`'s own flag (lines 40-47). **Caveat found while verifying:** `CLAUDE.md:272` itself still says `First action... docs/ai-loop/00-entry/MASTER_PROMPT.md` — that line is stale/wrong in the *current* runner-plugin CLAUDE.md (the real entry point is the `.claude/artifacts/...` copy); don't port that sentence as-is into devcrew's CLAUDE.md. | P4 (docs) |
| `docs/backlog/` (README.md, feature-template.md, product-backlog.md, pending/3, done/4, in-progress/0, triaged/0 — 10 files) | DELETE | `doctor.mts:25` lists it in `LEGACY_ROOTS = ["docs/backlog", ".claude/artifacts/loop/backlog"]` — i.e. it's kept alive only as a *known historical location* a drift-detector scans for stragglers, not as a place anything writes today. The real active backlog is `.claude/artifacts/loop/backlog/{pending,triaged,in-progress,done}/` per `CLAUDE.md`'s own "Backlog discipline" section. `intake.mts:147-148` and `commands/close.md:41` / `commands/retrospective.md:9` reference the `docs/backlog/` string as a legacy fallback/doc mention, not a write target. Only FEAT-001..005 remain in it, last touched 2026-06-12. Confirms `docs/memory.md` lines 45-47, 58-60 ("dead paths... delete-candidates, left untouched by this audit — operator call"). This audit makes the operator call: delete. | P4 (docs) — but the `LEGACY_ROOTS` *constant* in `doctor.mts` should keep the string (harmless drift check) even after the directory is deleted; only the directory/files go. |
| `.claude/artifacts/loop/pending-dispatch/` (11 stray `*-loop-architect.json` marker files) | DELETE | `docs/memory.md:145-148`: "the marker queue... is deprecated, no consumer planned." Verified: the only in-repo reference is a comment in `src/scripts/lib/auto-dispatch.mts:4` explicitly documenting it as dead ("The marker-write path (pending-dispatch/..."). No reader anywhere (`grep -rl pending-dispatch src/scripts commands agents skills hooks` → only that one comment). This is pure accumulating litter (new files landing in it going back months) — highest-confidence delete in this whole inventory. | P1 (can go with the subtree import — don't even carry it across) |
| `crew-architecture-analysis.md`, `crew-optimization.md` (dev-team repo root, 382 + 142 = 524 LOC) | ARCHIVE | Zero inbound references anywhere in either repo (`grep -rl` for both filenames across `.md`/`.ts`, excluding self, = empty). Last touched 2026-05-26 (stale ~85 days). Loose analysis docs sitting at repo root, not under `docs/`. Historical value (architecture reasoning that may have shaped later decisions) — archive under `docs/retrospectives/` or similar rather than delete outright, since content isn't disposable litter the way `pending-dispatch/` is. | P4 (docs) |

**Not found / correction to the task brief:** the brief also asked about "stub redirects for commands removed in v0.53." No such stub-redirect files exist in either repo — `git log --all --oneline | grep -i v0.53` and a scan of `commands/` for redirect-only `.md` bodies (files under ~10 lines that just point elsewhere) turned up nothing matching that description. Either the pattern was already fully removed with no trace, or the claim doesn't apply to this repo pair. Not listing a deletion item for something that doesn't exist.

## 2. Duplicated pairs across repos

### Skills (8 claimed shared names — verified 6 real, 1 false collision, 1 not-shared; +1 uncounted real pair found)

The plan's §2 lists 8 shared skill names: `writing-claude-md`, `writing-task-handoffs`,
`review-gates`, `systematic-debugging`, `critical-thinking`, `prompt-engineering`,
`security-advisory`, `skill-creator`. Verification:

| Pair | Verdict | Evidence |
|---|---|---|
| `universal/writing-claude-md` | MERGE-INTO dev-team's (33 vs 31 lines) | Both exist, content differs (`diff` non-empty), dev-team's is the longer/superset version consistently across every pair below — treat as the pattern, not per-pair luck. Fold-in: whatever's unique in runner's 31 lines (needs a line-level pass at import, not done here — flagging the pattern, not double-doing the diff work devcrew's own import step will do). |
| `universal/writing-task-handoffs` | MERGE-INTO dev-team's (72 vs 70 lines) | Same pattern. |
| `workflow/review-gates` | MERGE-INTO dev-team's (107 vs 92 lines) | Diffed in full: dev-team carries an entire extra section, "Silent-failure hunt (runnable changes)" (13 lines — swallowed-error/telemetry/health-check-tier checklist) that runner's copy lacks entirely. Also: dev-team says "dispatcher", runner says "lead" (role-naming drift, not a content difference — devcrew's own role vocabulary decision resolves this trivially at merge). dev-team references `crew.ts`/`.ts`, runner references `crew.mjs`/`.mjs` (tooling-convention drift, resolved by §3's Bun/.mts policy). **This is the concrete fold-in example** — the Silent-failure-hunt section must not be lost. |
| `domain/prompt-engineering` | MERGE-INTO dev-team's (149 vs 131 lines) | Both have a `references/` subdir too — subdir contents not diffed (time-boxed out); flag for a recursive diff at actual import time. |
| `domain/security-advisory` | MERGE-INTO dev-team's (144 vs 126 lines) | Same pattern, not deep-diffed. |
| `meta/skill-creator` | MERGE-INTO dev-team's SKILL.md only (127 vs 109 lines) | `diff -rq` on the full directory shows **only `SKILL.md` differs** — `LICENSE.txt`, `agents/`, `assets/`, `eval-viewer/`, `references/`, `scripts/` are byte-identical between the two copies. Cheapest merge in the set: take either side's subdirs (they're the same), merge just the two `SKILL.md` bodies. |
| `workflow/critical-thinking` | **NOT a skill collision — plan claim is wrong** | Runner has `skills/workflow/critical-thinking/`. dev-team has **no skill by that name anywhere** — what dev-team has is `agents/3rdparty/critical-thinking.md`, a vendored *agent* (confirmed live in the session's own agent roster as `crew:3rdparty:critical-thinking`). Skill vs. agent, not a duplicate pair. Nothing to merge; runner's skill carries forward as-is, dev-team's agent carries forward as-is under `agents/3rdparty/` — they coexist under different names in the target layout (`devcrew:critical-thinking` skill + `devcrew:3rdparty:critical-thinking` agent), which is a naming collision worth a decision at P3 (do both keep the identical leaf name?) but is not a content-dedup item. |
| `workflow/systematic-debugging` | **Not shared — plan overcounts** | `find` across all of dev-team for `*systematic-debugging*` returns nothing. This is a runner-only skill; carries forward unchanged, no counterpart to merge. (It may collide with the *user's global* `superpowers:systematic-debugging` skill, but that's outside repo scope.) |
| `workflow/commit` | MERGE-INTO dev-team's — **real shared pair the plan's "8" list missed** | Both repos ship `skills/workflow/commit/SKILL.md`. Diffed in full: near-identical, only differences are frontmatter (`prompt_id`/`version` present in dev-team, absent in runner) and tooling strings (dev-team: `bun run lint && bun test --parallel && node .../validate-manifests.ts`; runner: `npm run lint && npm test && node .../validate-manifests.mjs`) — mechanical, resolved by devcrew's single Bun-only toolchain (§3 of the plan already settles this). Cheapest merge in the whole list. |

Net: plan said "8 shared names ≈ 81 total skills after dedupe." Corrected: **7 real shared pairs** (6 claimed + commit), **critical-thinking is agent-vs-skill not skill-vs-skill**, **systematic-debugging isn't shared at all**. The skill-count arithmetic in unification-plan.md §2 (`crew 71 + runner 18 − 8 dupes ≈ 81`) should be `71 + 18 − 7 ≈ 82`, and the critical-thinking/systematic-debugging line items removed from the "shared" framing. Small delta, but it's exactly the class of hardcoded-count rot demolition-synthesis.md finding 4 already flagged once — recurring pattern, not a one-off.

### Validators

Both repos ship `validate-org-refs`, `validate-agent-refs`, `validate-manifests` — plan says keep runner's, widen scope. Verified both sides exist:
- dev-team: `scripts/validate-org-refs.ts`, `validate-agent-refs.ts`, `validate-manifests.ts` (157 lines) — 19 total `validate-*.ts` files.
- runner: `src/scripts/validate-org-refs.mts`, `validate-agent-refs.mts`, `validate-manifests.mts` (238 lines) — 15 total `validate-*.mts` files.

| Item | Verdict |
|---|---|
| `validate-org-refs`, `validate-agent-refs`, `validate-manifests` | MERGE-INTO runner's `.mts` versions (runner's `validate-manifests.mts` is already the larger/238-line version — consistent with "keep runner's, widen scope"), extend scan targets to cover dev-team's tree shape too. dev-team's 3 `.ts` versions DELETE after the scope-widened `.mts` versions are verified to catch everything the `.ts` versions caught. |
| dev-team-only 16: `validate-adr-template`, `validate-agents`, `validate-all`, `validate-backlog-drift`, `validate-badges`, `validate-bundles`, `validate-configs`, `validate-contracts`, `validate-dispatch-graph`, `validate-loop-state`, `validate-routing-table`, `validate-skills`, `validate-slices`, `validate-syntheses`, `validate-ux-spec`, `validate-workflows` | KEEP, carry from crew per plan §7, rename `.ts`→`.mts` in the P1 rename sweep. |
| runner-only 12: `validate-backlog-writes`, `validate-content-length`, `validate-decline-citations`, `validate-dispatch-markers`, `validate-effort-points`, `validate-event-schemas`, `validate-imports`, `validate-learnings-schema`, `validate-memory-config`, `validate-slice-touches-files`, `validate-snapshot-freshness`, `validate-marketplace-sync` | KEEP, carry from runner per plan §7 (marketplace-sync retargeted to the single devcrew entry, per plan). |

### Worktree managers

- dev-team: `scripts/lib/worktree-manager.ts`, **154 lines**. Comment at line 12-13 documents a load-bearing integration point: "the claim state the disjoint-check reads (`scripts/lib/claims.ts`, #163) already converges there" — i.e. dev-team's version is wired into a file-claim/disjoint-ownership check that runner's has no equivalent for.
- runner: `scripts/lib/worktree-manager.mts` (**464 lines**) + `scripts/lib/dispatch-worktree.mts` (**576 lines**, wave dispatch) = 1,040 lines. Backed by 6 dedicated test files (`dispatch-worktree*.test.mts` x2, `grade-jsonl-writer-worktree-canonical`, `learnings-worktree-canonical`, `wave-worktree-cleaned`, `worktree-manager.test.mts`) vs. dev-team's 2 (`worktree-manager.test.mts`, `claims-worktree-canonical.test.mts`).

| Verdict | Evidence |
|---|---|
| KEEP runner's pair as base (matches plan) | 3x the code, 3x the test coverage, purpose-built for wave/parallel dispatch which is the harder problem. |
| MERGE-INTO runner's: dev-team's claim/approval convergence logic | Named explicitly in dev-team's own code comment as the one piece runner's doesn't have — the `scripts/lib/claims.ts` disjoint-ownership check integration. This is the concrete "port crew's claim/approval integration" item the plan names abstractly; now it's pointed at an exact source line (`worktree-manager.ts:12-13`) and an exact dependency (`claims.ts`). |
| DELETE dev-team's `worktree-manager.ts` (154 LOC) + its 2 tests once the port lands | — |

### jsonl helpers

Plan mentions "two jsonl helpers" — verified **four** files, no name overlap, not yet diffed for content (time-boxed):
- dev-team: `scripts/lib/jsonl.mjs`, `scripts/lib/telemetry/serialize-jsonl.ts`
- runner: `scripts/lib/grade-jsonl-writer.mts`, `scripts/lib/jsonl-append.mts`

**Verdict: MERGE-INTO one canonical helper, but flagged NOT VERIFIED at the line level this session** — recommend runner's `jsonl-append.mts` as the structural base (already `.mts`/Bun-native, matching §3's runtime-unification-first ordering), with dev-team's `telemetry/serialize-jsonl.ts` reviewed for telemetry-specific serialization logic that may not have a runner equivalent (`grade-jsonl-writer.mts` is grade-artifact-specific, not general telemetry). This needs an actual content diff at P1/P4 import time — don't treat "4 files → 1" as mechanical without that pass.

### Artifact writers

Plan mentions "two artifact writers." Verified: runner has `src/scripts/lib/pm-artifact-writer.mts` and `src/scripts/lib/slice-linker/artifact-lock-writer.mts`. **No dev-team file matches that name pattern** (`find` for `*artifact*writer*` in dev-team's `scripts/` returns nothing). dev-team's artifact writing goes through the `crew.ts` CLI (`write-run-brief`, `write-review-result`, `write-validation-result`, etc. — the exact subcommands already inventoried in plan §4's seam-elimination table), not a standalone library module by that name.

**Correction:** "two artifact writers" as a symmetric pair doesn't exist. What's real is asymmetric: runner has two writer *modules*, dev-team has the equivalent logic behind CLI *subcommands* that plan §4 already disposes of one-by-one (direct-import replacements, fail-soft/fail-hard per call). No separate cleanup action needed here beyond what §4 of the plan already covers — don't double-book this as a distinct merge item.

### Hooks

Not deep-diffed this session (time-boxed) — plan's "overlap check... done at import" for session-start/close hooks stands as the right call. Flagging only what's verifiable without that pass: dev-team registers 26 hooks, runner 12 (both counts match plan's Appendix A), no further verification performed here.

## 3. Unused/vestigial config

| Item | Verdict | Evidence |
|---|---|---|
| `models.yaml` (dev-team) vs `model-router.mts` (runner) | MERGE, but **not mechanical — needs a design decision** | `model-router.mts:24-25` contains a code comment that is itself an open cross-repo sync obligation: *"dev-team mirrors these semantics in scripts/lib/models/resolve-model.ts (isModelRoutingEnabledInConfig) — keep the two in sync."* Verified both sides exist (`dev-team/scripts/lib/models/resolve-model.ts`, 121 lines + `schema.ts`; `models.yaml` top-level profile table). They're not simple duplicates: runner's router resolves directly to tier *names* (`opus`/`sonnet`/`haiku`) via phase- and slice-shape-based rules (`SHAPE_TIER_MAP`, `MODEL_PHASES`); dev-team's `models.yaml` adds an extra indirection layer (named "profiles," e.g. `claude: {reasoning: opus, standard: sonnet, light: haiku}`) explicitly designed to support a *second* provider profile later. Recommendation: keep runner's phase/shape routing logic, adopt dev-team's profile-indirection layer underneath it (don't drop the extensibility dev-team already built) — this is a P2 design item, not a P4 mechanical dedup. |
| Preset system (`scripts/presets/*.json`, 6 files + `preset-schema.mts` + `list-presets.md`) | KEEP as-is, not vestigial | Initially flagged as a candidate per the task brief's "dead preset files" prompt — verified live and heavily used: it's the install-time stack-selection system for adopter repos (`dotnet-only`, `dotnet-python`, `dotnet-react`, `dotnet-typescript-vue`, `typescript-plugin-dev`, `typescript-service`), consumed at runtime by `config-resolver.mts`, `loop-installer.mts`, `phase-gate` (per `docs/research/2026-07-06-preset-removal.md`'s own analysis, which is itself a live phase-1 investigation for FEAT-218, not evidence of removal — the doc's title is misleading: it's "removal *analysis*," nothing was removed). dev-team has no equivalent, so there's no duplication to resolve — presets carry forward as product surface. **One real finding from that analysis worth porting forward, not re-doing:** `preset-schema.mts`'s `PresetV1` interface is already known to be stale relative to the actual shipped preset shape (undeclared fields: `loop.*`, `stack.*`, `reviewers`, `mandatoryDocs`, `productName`, `productDescription`, `stackDescription` — all read by `config-resolver`/`loop-installer`/`phase-gate` but not validated). That's a pre-existing bug to fix during the P1 rename sweep, not a merge-cleanup item — noting it so it isn't lost. |
| Top-level `scripts/` dir in runner-plugin (separate from `src/scripts/`) | KEEP, not dead — different purpose | Contains `presets/` (above, live), `competitor-audit/` (market-research tooling), `github-sync.mjs`, `setup-github-sync.mjs`, `setup-task-store.mjs`, `setup-watch-scheduler.mjs` — one-time setup scripts and non-`.mts` tooling, distinct from the `src/scripts/` runtime tree. Not investigated further (out of the six named categories) but flagging that it exists as a second `scripts/`-named root, which could read as confusing/duplicated at first glance in the new monorepo layout — worth a naming decision at P3 (e.g. `tools/` vs `scripts/`) even though nothing here is dead. |

## 4. Docs rot

Confirmed stale/superseded, beyond what's in §1:
- `crew-architecture-analysis.md`, `crew-optimization.md` — covered in §1 (ARCHIVE).
- `docs/upstream-requests/` (13 open, excl. `archive/` which holds 4 already-archived) — full classification below.

### Upstream-requests classification (13 open, target-verified from each file's frontmatter/status line)

| File | Target | Status | Becomes moot at merge? |
|---|---|---|---|
| `2026-06-06-hero-crew-redundant-read-hook-deny.md` | dev-team (hero-crew) | pending-upstream-fix | **Yes** — target repo becomes same repo |
| `2026-06-07-hero-crew-brief-me-halt-badge-rendering.md` | dev-team | pending-upstream-fix | **Yes** |
| `2026-06-07-hero-crew-forward-declared-skill-ids.md` | dev-team | pending-upstream-author | **Yes** |
| `2026-06-13-hero-crew-verdict-not-checked-author-judge.md` | dev-team | resolved-by-upstream | Already resolved — pure archive, not a "moot" case |
| `2026-07-02-hero-crew-3rdparty-provenance-and-injection-defense.md` | dev-team | open | **Yes** |
| `2026-07-02-hero-crew-workflow-state-load-validation.md` | dev-team | open | **Yes** |
| `2026-07-06-crew-orchestrate-slice-preset-path.md` | dev-team | open | **Yes** |
| `2026-07-10-crew-team-lead-label-collision.md` | dev-team | open | **Yes** |
| `2026-07-16-crew-dispatch-memory-credit-loop.md` | dev-team | open | **Yes** |
| `2026-07-16-dev-team-escalated-to-lead-badge-removal.md` | dev-team | open | **Yes** |
| `2026-07-18-crew-artifact-lock-hook-contract.md` | dev-team | open | **Yes** |
| `2026-08-02-crew-session-scanner-source-project-slugify.md` | dev-team | open | **Yes** |
| `2026-07-08-astramem-plugin-abortsignal-cancellation.md` | **astramem-plugin** (separate repo, not merging) | open | **No** — stays a genuine cross-repo request |

**Verdict:** 12 of 13 → ARCHIVE with a `resolved-by-merge` status stamp (each documents a real historical pain point worth keeping as institutional memory, e.g. for the rename-phantom / version-skew narrative demolition-synthesis.md already leans on) and, where the underlying ask is still valid, refile as an in-repo devcrew backlog FEAT instead of an "upstream request" (the barrier that made it "upstream" no longer exists). 1 of 13 (`astramem-plugin-abortsignal-cancellation.md`) → KEEP unchanged, still a real cross-repo ask against a repo that isn't part of this merge.

### kb references

Not separately investigated beyond what CLAUDE.md's own "Ecosystem canon" section already states: `../kb/...` links are explicitly documented as filesystem-relative/machine-local, with `kb/02-systems/loop.md` already self-flagged as stale ("cites v0.1.11 / `/autonomous-loop:*` commands... all superseded... flagged back to the vault owner rather than linked here as authoritative"). Nothing new to add — the repo already tracks this correctly; carry the same caveat into devcrew's CLAUDE.md rather than re-investigating.

## 5. Test suite — seam-dying tests

Per plan §4's crew-bridge disposition table, once direct imports replace the `execFile` bridge:

**DELETE outright (428 LOC, 3 files) — test the bridge/version-gate mechanism itself, which stops existing:**
- `src/tests/crew-bridge.test.mts` (210 lines)
- `src/tests/plugin-identity.test.mts` (78 lines) — tests `MIN_CREW_VERSION` gating, which plan §4 explicitly deletes (`findCrewCli`/`crewCliRuntime`/`MIN_CREW_VERSION`/`CREW_MARKETPLACE_NAME` → "deleted — n/a, same-repo imports")
- `src/tests/validate-marketplace-sync.test.mts` (140 lines) — tests the two-plugin-entry drift check; the underlying prod file `validate-marketplace-sync.mts` (189 lines) survives per plan §7 but retargeted to a single `devcrew` entry, so its test needs a new/simpler fixture, not deletion of the concept — but the *current* test file's fixtures (built around two separate manifest entries) don't survive as-is.

**REWRITE, not delete (consumers of the bridge/identity module, not tests of it) — 6-7 files:**
- `src/tests/cost-project-slugify.test.mts`, `cost-scan-cursor.test.mts`, `cost-scan-window-regression.test.mts` — exercise cost-slice/cost-advise flows that plan §4 moves to direct imports (fail-soft preserved)
- `src/tests/loop-installer.test.mts`, `phase-gate.test.mts` — phase-gate's `write-validation-result` call is the one **fail-hard** case in plan §4's table; its test needs to assert the new fail-hard behavior, not just get a mock swapped
- `src/tests/slice-start.test.mts` — resolves the CLI via `plugin-identity.mts` today
- `src/tests/_fixtures.mts` — shared test helper, almost certainly mocks the crew CLI process boundary; needs inspection at P2, not counted as a hard "file" deletion since it's infrastructure, not a test itself

## 6. 3rdparty vendored agents/commands — dispatch-reference check

Verified 14 agents (9 dev-team + 5 runner, confirmed **no name overlap** — matches plan) and 4 commands (all dev-team; runner ships zero 3rdparty commands).

**Agents — none are zero-reference; no clean drop candidates.** Reference counts (grep for `3rdparty:<name>` / `3rdparty/<name>` across each repo's *owned* `.md`/script content, excluding the vendored file's own self-reference and generated artifacts):

| Agent | Owner repo | Owned-content refs | Verdict |
|---|---|---|---|
| database-architect, expert-react-frontend-engineer | dev-team | 6 each | KEEP |
| critical-thinking, ui-ux-designer | dev-team | 3 each | KEEP |
| frontend-developer | dev-team | 3 | KEEP |
| mobile-developer, playwright-tester, refactoring-specialist | dev-team | 2 each | KEEP |
| flutter-ui-developer | dev-team | **1** | KEEP, weak — verify at import whether that one reference is load-bearing or a stray mention |
| research-coordinator | runner | 5 | KEEP |
| context-manager, fact-checker | runner | 4 each | KEEP |
| diagram-architect | runner | 2 | KEEP |
| markdown-syntax-formatter | runner | **1** | KEEP, weak — same caveat as flutter-ui-developer |

None hit zero, so the brief's "candidates to drop at import" framing doesn't produce a hit list for agents — every vendored agent has at least one documented dispatch path. (Caveat: a grep-based reference count can't see ad-hoc `Agent(subagent_type: ...)` calls made directly by an operator with no supporting `.md` reference — a true zero-owned-content-refs agent could still be genuinely used that way. This check catches "no documented path," not "definitely never invoked.")

**Commands — 3 of 4 are drop candidates, 1 is not:**

| Command | Owned-content refs | Listed in README/CLAUDE.md index? | Verdict |
|---|---|---|---|
| `architecture-review` | 0 | No | **DROP candidate** |
| `create-architecture-documentation` | 0 | No | **DROP candidate** |
| `refactor-code` | 0 | No | **DROP candidate** |
| `create-prd` | 1 | No | KEEP (has at least one real reference) |

Caveat matching the agents case: slash commands are typically user-invoked directly rather than referenced by other owned content, so a "0 refs" count is weaker evidence for commands than for agents — a human could type `/3rdparty:architecture-review` with nothing in the repo ever mentioning it. Flagging these as drop *candidates* pending an explicit operator check ("do you ever run this"), not an unconditional delete.

## Counts

- **Files deletable (clean DELETE verdict):** ~38 — `docs/ai-loop/` (9) + `docs/backlog/` (10) + `pending-dispatch/` (11 JSON) + seam-only tests (3) + drop-candidate 3rdparty commands (3, pending operator confirmation) + dev-team's superseded `worktree-manager.ts` and its dedicated test (2).
- **LOC removable (estimate, not exhaustively counted):** roughly **2,700–3,500 LOC** direct-delete (docs/ai-loop + docs/backlog content ≈1,200, pending-dispatch JSON ≈220, stray dev-team root docs 524, seam-only tests 428, worktree-manager.ts 154, 3 drop-candidate commands ≈300), plus a further **~1,500–2,000 LOC** consolidated-not-removed via the skill/validator/worktree-manager merges (the losing side of each pair, once folded, stops existing as a separate file even though its unique content survives inside the winner).
- **Tests removable outright:** 3 files / 428 LOC. **Tests requiring rewrite (not removal):** 6-7 files, not yet sized individually.
- **Docs archived (not deleted, history preserved):** 12 upstream-request files + 2 stray dev-team root docs = 14.
- **Corrections logged against existing planning docs:** 3 — the skill-pair "8 shared names" arithmetic (§2), the "two artifact writers" symmetric-pair claim (§2), and CLAUDE.md's own stale `docs/ai-loop/00-entry/MASTER_PROMPT.md` first-action pointer (§1) which should not be ported forward as-is.
