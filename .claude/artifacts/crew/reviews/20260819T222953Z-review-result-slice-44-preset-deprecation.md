---
decision: approved
reviewer: crew:reviewer
slice: SLICE-44
reviewed_commits: [308bcdd7]
---

# Review — SLICE-44 (FEAT-021): deprecate `dotnet-typescript-vue` preset

## Summary

Light review, all 5 requested checks pass. **Decision: approved.**

## 1. Commit purity

`git show 308bcdd7 --stat` — exactly 5 files: `ADOPTION.md` (1 row removed),
`README.md` (1 row removed), `commands/list-presets.md` (1 bullet removed),
`CHANGELOG.md` (Unreleased hard-break entry added), and
`scripts/presets/dotnet-typescript-vue.json` (deleted, 66 lines). Nothing
else touched. Read the full diff — the 3 doc-row removals are clean
single-line deletions, no collateral edits.

## 2. Live install run — clear error, exit 1, zero writes

`git init`'d a fresh temp dir and ran
`bun src/scripts/loop.mts install --preset dotnet-typescript-vue --repo <tmp>`:

```
Unknown preset "dotnet-typescript-vue". Known presets: dotnet-only, dotnet-python, dotnet-react, typescript-plugin-dev, typescript-service
```

Exit code 1. `find <tmp> -type f -not -path "*/.git/*"` returned nothing —
zero files written. Names all 5 remaining presets correctly. This also
incidentally re-exercises SLICE-37's arg-safety path (no crash, no partial
scaffold) as noted.

## 3. `preset-skill-ids.test.mts` — green, genuinely dynamic

`bun test src/tests/preset-skill-ids.test.mts` → **7 pass, 0 fail** (5
per-preset dynamic tests + 2 synthetic neuter-proof tests, matching the 5
files now in `scripts/presets/`). Confirmed the test list is genuinely
dynamic: `presetFiles = readdirSync(presetsDir).filter(f =>
f.endsWith(".json"))` — globs the real directory at test-collection time,
no hardcoded count anywhere in the file (its own header comment says so:
"Globs ALL presets... so a future preset file is guarded for free").
Grepped the wider repo for a stale hardcoded preset count — found exactly
2 hits, both in dated historical docs (`docs/cleanup-audit-2026-06-11.md`,
`docs/research/2026-07-06-preset-removal.md`) referencing an entirely
different, older preset set (`dotnet-aspire-python`, `dotnet-vue`,
`python-only` — none of today's names) — clearly point-in-time snapshots,
not live references that need updating by this slice.

## 4. Borderline row: `docs/planning/feat-007-skill-matcher-contract.md`

Read the referencing section in full context (lines 23-31, "Dead-ID
re-verification against `scripts/presets/dotnet-only.json`,
`dotnet-react.json`, `dotnet-typescript-vue.json`"). This is defensible as
left-untouched: it's a point-in-time "Current state (evidence)" section of
an architecture contract doc, documenting the audit that **found**
`vue-engineering` as a dead skill id in the first place — which is
precisely the fact this slice's own CHANGELOG entry cites as *why*
`dotnet-typescript-vue` became dead weight ("shipped with no
framework-specific frontend skill since `vue-engineering` was deleted...").
Scrubbing this reference would destroy part of the evidence trail that
explains the later deprecation, not just leave stale text — same category
as not editing old commit messages or superseded ADRs. Correctly left
alone; not a live reference surface like README/ADOPTION/list-presets.md,
which were correctly updated.

## 5. `list-presets` CLI output

`bun src/scripts/loop.mts list-presets` → JSON listing exactly the 5
remaining presets (`dotnet-only`, `dotnet-python`, `dotnet-react`,
`typescript-plugin-dev`, `typescript-service`); `dotnet-typescript-vue` is
genuinely absent from the live CLI output, not just the docs.

## Decision rationale

`approved`. Commit is exactly the claimed 5 files, the hard-break install
path fails cleanly with zero side effects and correct alternatives, the
regression-guard test is genuinely directory-driven (not a count the
builder could have forgotten to update), and the one row deliberately left
untouched is a defensible historical-evidence citation rather than a
missed live reference.
