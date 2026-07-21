# CI gates — full detail

Full rationale for each CI gate. The numbered list of gate *names* lives in
`CLAUDE.md` § "CI gates" — `src/scripts/generate-metrics-band.mts` counts that
numbered list programmatically to compute the README metrics-band's
"CI gates enforced" figure, so the count and order there must stay in sync
with this file's numbering. If a gate is added, removed, or reordered, update
both files in the same change.

GitHub Actions runs on every push and PR (all under Bun, no `npm ci`/build):

1. `bun install --frozen-lockfile`
2. `bun ./src/scripts/validate-manifests.mts` — manifest sanity check.
3. `bun ./src/scripts/validate-content-length.mts` — owned-agent line cap
   (300) + SKILL.md line cap (200). `agents/3rdparty/` exempt.
4. `bun ./src/scripts/validate-decline-citations.mts --repo .` — every P4
   FEAT in `triaged/`/`done/` must carry `declined_per: [<clause-id>, ...]`
   citing a real `<!-- clause: X -->` marker from `CLAUDE.md`
   (`src/scripts/lib/clause-registry.mts` extracts the known set).
5. `bun ./src/scripts/validate-agent-refs.mts` — blocks a `crew:<name>` /
   `runner:<name>` dispatch instruction whose `<name>` doesn't resolve to a
   real agent, command, or skill (astragenie/runner-plugin#371 — a phantom
   `crew:builder` shipped in installed loop rules and broke consumer
   orchestrators). Scans `CLAUDE.md` only.
6. `bunx tsc --project tsconfig.json --noEmit` + `--project tsconfig.test.json`
7. `bunx biome lint src/`
8. `bunx biome format src/` (check mode — unformatted files fail)
9. `bun ./src/scripts/validate-imports.mts` — enforces the slice-linker
   sub-module import boundary (files outside `slice-linker/` must go
   through the barrel, not reach into sub-modules directly).
10. `bun ./src/scripts/validate-backlog-writes.mts` — explicit-allowlist
    guard (SLICE-153 / FEAT-250, COND-D): fails when a file outside
    `backlog-store.mts` (the sole sanctioned BacklogStore writer, DEC-076)
    raw-writes a backlog-shaped FEAT/SLICE path. `doctor.mts` (cross-tree
    reconciliation) and `pm-apply.mts` (body-section content edits) are
    named allowlist exceptions with an inline rationale each.
11. `bun ./src/scripts/validate-slice-touches-files.mts` — validates every
    pending/in-progress/needs-review slice's `touches_files` (declared or
    inferred from body prose). Errors on absolute paths, `..` traversal, or
    a path whose grandparent directory doesn't exist (a typo'd or
    fabricated path). A missing immediate parent dir is allowed — slices
    routinely plan ONE new subdirectory level under an existing area (e.g.
    `docs/architecture/foo.md` when `docs/architecture` doesn't exist yet
    but `docs` does) — but deeper fabricated nesting under a real
    top-level dir still errors. Warns (does not fail) when `touches_files`
    is absent altogether on a slice created on/after `--warn-cutoff`
    (default 2026-06-15).
12. `bun test src/tests/ --parallel --timeout 60000`
13. `bun ./src/scripts/validate-snapshot-freshness.mts` — blocks a stale
    `.claude/artifacts/loop/loop-snapshot.md` from merging (FEAT-208).
    Regenerates the snapshot content in-memory and diffs it against the
    on-disk file; any drift (backlog/grade counts, "next to slice" list,
    decisions, telemetry) fails CI. The pre-push hook still runs this
    check in warn-only mode (`--check-generated`) — CI is the hard gate.
14. `bun ./src/scripts/validate-org-refs.mts` — stale-owner sweep (#474
    follow-up): fails when the banned pre-transfer GitHub owner name (see
    the script's `BANNED_OWNER` constant) appears in AUTHORED surfaces
    (README, ADOPTION, `src/`, `docs/`, `commands/`, `skills/`, `agents/`
    excl. `3rdparty/`, `.claude-plugin/`). The owner is now `astragenie`
    (repo paths) / `astra` (skill `owner:` field); GitHub redirects the
    old path so stale refs still work, which is why they rot undetected.
    Frozen history (CHANGELOG past entries, `.claude/artifacts/**`,
    `.claude/logs/**`) is out of scope. The guard's own source + test are
    named allowlist exceptions (they must name the banned token). **Note
    (2026-07-21 audit): `.claude/crew/` is not in this gate's scan
    targets** — `.claude/crew/plugin-marketplace.md` carried a stale
    pre-transfer-owner reference undetected until this run corrected it
    by hand; consider adding `.claude/crew/` to `SCAN_TARGETS` in a future
    FEAT.
15. `bun ./src/scripts/validate-marketplace-sync.mts` — registry drift
    guard: fetches `astragenie/astra-marketplace`'s `marketplace.json` and
    fails when its `runner` entry version ≠ this repo's `plugin.json` (the
    registry sat at 0.67.0 while 0.68/0.69/0.70 shipped — consumers got a
    stale version). An UNREACHABLE registry degrades to a warning (exit 0)
    so a network blip never blocks CI; a reachable-and-mismatched registry
    is a hard fail.
16. `bun ./src/scripts/validate-dispatch-markers.mts` — checks that the
    `<task-scoped>` order-block marker (FEAT-263 T1/T5, dispatch.mts +
    start-slice.mts) is balanced, non-nested, and that every
    FORBIDDEN/GATES/RETURN/ECHO order-block keyword stays confined inside
    a marked region.
17. `bun ./src/scripts/validate-memory-config.mts` — memory-feedback config
    drift guard (improvement plan 2026-07-18, W0.2): fails when
    `.claude/loop.json` has memory enabled but the feedback shape lags the
    current contract (e.g. `memory.feedback.creditLoop` absent — the exact
    gap behind the 1.6% usefulness finding in runner-plugin#525). Memory
    disabled/absent passes; an explicit `enabled: false` on a key passes
    (choice, not drift).
18. `bun ./src/scripts/generate-metrics-band.mts --check` — README
    metrics-band freshness gate (W4): regenerates the dogfood metrics band
    in-memory from repo artifacts and fails on drift against the committed
    README, same pattern as the snapshot-freshness gate. Regenerate with
    `--write` after material state changes (FEAT close, grade, cost
    report).

Pre-push hook (`src/scripts/pre-push-validate.mts`, run via Bun) runs
manifest + content-length + format-check locally before any `git push`.
