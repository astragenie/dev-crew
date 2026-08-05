# Plan — complete all open slices (FEAT-284 / FEAT-230 / FEAT-259)

- **Created:** 2026-08-04
- **Scope:** 10 pending slices across 3 in-progress FEATs, plus 3 Phase-0 unblockers
- **Baseline:** `65d62aeb`, origin/main in sync, CI green
- **Budget:** ~880k builder tokens declared; ≈1.3–1.6M with review

## Preconditions found in the slice files (fix before dispatch)

1. **All 10 pending slice bodies are stubs.** `## Objective` empty, `## In scope`
   reads `- bullet 1 / - bullet 2`, `## Out of scope` reads `- bullet 1`. ACs are
   the parent FEAT's full set copy-pasted identically across siblings, carrying
   their own warning: `ACs copied from FEAT-284 and shared across 7 sibling
   slices — scope per-slice before close`. Every slice's Done-When says
   *"feature moved from in-progress to done"*, so closing any one slice claims
   the whole FEAT shipped. A builder handed SLICE-191 as written sees FEAT-284's
   entire AC set; the title is the only real scope signal.
2. **AC drift between siblings.** SLICE-194 carries the corrected AC-1…AC-8.
   SLICE-191/192/193 carry the superseded AC-1…AC-5, including the AC-1 wording
   corrected on 2026-08-04 — the one that would *not* have caught the original
   incident. The correction landed in one sibling only.
3. **No slice declares `touches_files`** (verified across all 10). `packWave`
   sees `confidence: "missing"` and forces solo dispatch, so no parallel wave is
   possible until FEAT-288's inline-write/block-read round-trip is fixed.

## Phase 0 — unblock

| # | Item | Why it gates the rest |
|---|---|---|
| 0.1 | FEAT-283 SLICE-1 | Review gate reads `PASS` as rejection. ~10 slices × ~2 reviewer dispatches = ~20 hand-written verdict headers avoided |
| 0.2 | FEAT-289 | `agents/pm.md` at 335/335 against a 335 cap — any pm.md edit fails CI gate 3 |
| 0.3 | Rescope 10 slice bodies | Fill Objective/In-scope/Out-of-scope per title; narrow ACs to the subset each slice owns; fix Done-When so only the final slice moves the FEAT |
| 0.4 | FEAT-288 *(optional)* | Only needed for parallel waves; then backfill `touches_files` on all 10 |

0.3 is not paperwork — it is the difference between four builders each
implementing all of FEAT-284 and four builders implementing four slices.

## Phase 1 — FEAT-284, finish the slice-loss fix (4 slices, ~360k)

Highest urgency: this code corrupts slice state, and executing this plan pushes
10 slice transitions through it.

```
194 (independent) ──┐
191 ──> 192 ──> 193 ┘
```

| Slice | Scope | Note |
|---|---|---|
| 194 | Squash-body bullet lines treated as subject-equivalent (AC-8) | Recovers the ~20% genuine matches AC-7 knowingly dropped. Measured: 0/3 false positives return, 2/4 genuine recovered. Isolated — start here |
| 191 | `proposed_slices_shipped` frontmatter: index-prefix → `id_suffix`-keyed | Data-shape migration; needs a back-compat read path for existing FEATs |
| 192 | `materializeProposedSlices` keys off `id_suffix`, not `existingSlices.length` | Kills the duplicate-slice bug that spawned issue #598 |
| 193 | CLI escape hatch: force-materialize one slice by `id_suffix` | Replaces the raw-BacklogStore-API hand repair used on 2026-08-04 because no CLI flag existed |

**Gate:** re-run the FEAT-284 repro against live git history — `71604bb4` and
`c2e77fe7` filtered, `859be561` recognized.

## Phase 2 — FEAT-230, skill injection (4 slices, ~360k)

```
196 ──> 197 ──> 199
          └───> 198
```

| Slice | Scope |
|---|---|
| 196 | Task-signal → skill mapping/matcher table; consumes the SLICE-195 enumerator |
| 197 | `resolve-skills --slice/--tags` + `pickBlock` fallback |
| 198 | Cross-plugin docs + upstream-request amendment (crew is the consumer) |
| 199 | CI fixture-snapshot gate + DEC-071 write-up |

**Watch:** the catalog is keyed by basename; 36/36 unique today, so collision is
latent, not live — 196 should fail loudly rather than silently pick one. Include
the three nested-but-live skills (`backend-advisory`, `database-architecture`,
`react-engineering`) in fixtures; a flat lookup reports them missing, which is
the exact bug FEAT-230 exists to fix.

## Phase 3 — FEAT-259, close honestly (2 slices, ~160k)

| Slice | Verdict |
|---|---|
| 183 — receipt schema + docs | Buildable now; doc/schema only, no execution point needed |
| 186 — idle-ping suppression + dispatch-loop wiring | **Do not build as titled — re-scope first** |

SLICE-186 assumes a dispatch loop that can observe a subagent's live idle state.
No such execution point exists — verified across `dispatch.mts`,
`dispatch-prune.mts`, all 13 `wave/` files, and `report-gate.mjs`. Same wall that
left SLICE-185's watchdog with zero production callers by design.

Re-scope 186 to **build the execution point** (a poll/tick that reads dispatch
state and can act), then wire watchdog + suppression into it. Before wiring,
harden `parseChangedPaths` (fixed `slice(3)`, mishandles quoted paths and rename
arrows) — it guards the rule whose entire purpose is never nudging a running
builder. Only then does FEAT-259 close truthfully; today's three green ACs do not
close the loop.

## What this buys

- **FEAT-284 — stop losing work silently.** Today a prose mention of a slice in
  any commit message counts as proof it shipped; it fired four times in one day
  and cited its own documentation commits as evidence. Done: materialization is
  idempotent and diff-corroborated, gaps are CLI-repairable, skips print a
  visible warning. The backlog can be trusted to reflect what shipped.
- **FEAT-230 — builders get the right skills.** A flat lookup against a nested
  catalog reports live skills as missing; 4 skills are genuinely dead and one
  (`frontend-advisory`) is wired into this repo's own `loop.json`. Done: skills
  resolve from the live catalog by slice tags, deterministically, with
  `--explain`, and CI fails on a referenced-but-missing skill. Cross-plugin
  contract, so crew benefits too.
- **FEAT-259 — the loop stops needing a babysitter.** 27 idle-without-report
  pings in one session; recovery is reliable but 100% manual. Done properly
  (including the re-scoped 186): agents cannot stop without reporting, receipts
  are structured, a watchdog nudges once. This is what makes wave mode scale —
  past ~5 parallel agents, manual nudging is the binding constraint.
- **Phase 0 — the gates start working.** 283 makes a reviewer's verdict parse
  correctly instead of `PASS` reading as rejection; 289 unblocks `pm.md`; 288
  restores parallel wave packing.

The thread through all four: this repo is strong at *doing* and weak at
*verifying it did*. Every item converts a green signal that verifies nothing
into one that actually checks.
