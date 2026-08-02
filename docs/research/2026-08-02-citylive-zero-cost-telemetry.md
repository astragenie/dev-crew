# Root-cause spike: citylive zero-cost telemetry (SLICE-174 / FEAT-273)

Status: **CONCLUDED — reproducible bug found, dual-location (loop-side
practical fix + crew-side defense-in-depth), both testable.** Not a
"transcripts genuinely absent for unrelated reasons" case — the exact
mechanism that produced the symptom is identified with file:line evidence
and is live in the currently-installed crew build.

## Summary

All 11 per-slice cost reports under
`C:\work\mega\citylive\.claude\artifacts\crew\cost\` (read-only reference
for this spike, dated 2026-05-24) show `usd: 0`, `Sessions Scanned: 0`,
no Model Mix, and `Auto-detected: no`. Every one carries
`source_project: AstraGenie.CityLive` in its frontmatter — a **human-
readable project name, not a slugified path**. That literal string was
passed through to crew's session scanner as an explicit `--source-project`
override, which crew's scanner (`dev-team/scripts/lib/session-cost.ts`
and the near-duplicate `session-cost-scanner.ts`) uses **verbatim** as a
directory name under `~/.claude/projects/<value>/` — it is never run
through the same slugify function (`repoPath.replace(/[^A-Za-z0-9]/g,
"-")`) that both crew and Claude Code itself use to derive real project
directory names. No such directory (`~/.claude/projects/AstraGenie.CityLive/`)
exists, so every scan finds zero session files. Worse: crew's own
auto-detect safety net (which searches for "the busiest in-window project
dir" when no source is given) is **only** wired to fire `if (!sourceProject
&& autoDetect)` — an explicit-but-wrong `sourceProject` bypasses it
completely, silently, with no error or warning surfaced anywhere in the
report.

This is a live, current-day bug (confirmed byte-identical in the actually-
installed `crew@0.67.0` plugin cache, not just the `dev-team` source
checkout) that will reproduce for **any** repo whose `.claude/loop.json`
sets `loop.costProject` (or `loop.costProjectAliases`) to anything other
than an already-fully-slugified absolute-path string — not a citylive-
specific one-off.

## Evidence

### The symptom, verbatim from a citylive artifact

`C:\work\mega\citylive\.claude\artifacts\crew\cost\cost-report-cost-feat001-slice01.md:1-25`
(read-only reference, not modified):

```
---
kind: cost-report
feature: FEAT-001
run_title: "FEAT001 SLICE01"
usd: 0
duration_ms: 857963
source_project: AstraGenie.CityLive
created_at: 2026-05-24T17:48:43.579Z
---
...
- Sessions Scanned: 0
- Total USD: $0.0000
- Source Project: AstraGenie.CityLive
- Auto-detected: no
- Aggregate All: no
```

All 11 sibling `cost-report-cost-feat0*-slice*.md` files carry the
identical `source_project: AstraGenie.CityLive` / `Auto-detected: no` /
`Aggregate All: no` triple (grep across the directory confirms this is not
a one-off). The single 12th file in that directory
(`20260524T174803Z-cost-report-cost-feat001-slice01-msw-mock-layer.md`) is
the separate `cost-report-aggregate` artifact kind, which legitimately
shows `source_project: aggregate` (the literal sentinel `resolveScanSources`
returns for aggregate-mode scans) and is not part of this bug.

### No directory named `AstraGenie.CityLive` exists — and the correctly-named one is also empty

`~/.claude/projects/` (read-only directory listing only, no file contents
read, per the investigation's scope) contains no entry matching
`AstraGenie.CityLive` literally. It does contain
`C--work-mega-AstraGenie-CityLive` — the correctly-slugified form of what
the repo's absolute path must have been at the time
(`C:\work\mega\AstraGenie.CityLive`, matching the git remote
`sergeymilashico/AstraGenie.CityLive.git` — confirmed via
`git remote -v` in the current `C:\work\mega\citylive` checkout, which is
the same repository post-rename: `citylive`'s on-disk directory has a
`CreationTime` of 2026-05-14, well before the 2026-05-24 report dates,
consistent with a later folder rename rather than a fresh clone).

Recursively listing `C--work-mega-AstraGenie-CityLive/` (file paths and
names only, no content read) shows exactly two files, both under a
`memory/` subdirectory (`MEMORY.md`, `feedback_open-means-browser.md`) —
**zero `.jsonl` session transcripts**, versus a healthy project directory
(e.g. `C--work-mega-runner-plugin`, 54 entries, alternating `<uuid>` dirs
and `<uuid>.jsonl` files). This means even a hypothetical fix that
correctly re-slugified `AstraGenie.CityLive` to
`C--work-mega-AstraGenie-CityLive` would **still** find nothing for these
specific historical reports — the transcripts for whatever produced them
are not present under this repo-derived key today (most likely explanation:
work was orchestrated from a parent/dispatcher session with a different
cwd — mirroring this very investigation, whose own worktree
`C:\work\mega\runner-plugin-SLICE-174-0` has no dedicated
`~/.claude/projects/` entry of its own, and whose parent-folder project
directory `C--work-mega` also has zero `.jsonl` files). That is a
separate, deeper architectural question (how subagent/worktree-dispatched
work gets attributed to a project directory) and is **out of scope for a
fixture-testable SLICE-175 fix** — it does not block filing and fixing
the concrete slugification bug below, which is real and independently
reproducible regardless of where citylive's specific May-24 transcripts
ended up.

## Mechanism (file:line trail)

### Crew-side: `sourceProject` bypasses `slugifyRepoPath` entirely

`C:\work\mega\dev-team\scripts\lib\session-cost.ts:11-13`:

```ts
export function slugifyRepoPath(repoPath: string): string {
  return repoPath.replace(/[^A-Za-z0-9]/g, "-");
}
```

This is the function that (by design) turns a full absolute path into the
same dash-joined form Claude Code itself uses for `~/.claude/projects/<slug>/`
directory names (verified: `C:\work\mega\runner-plugin` ↔
`C--work-mega-runner-plugin`, colon/backslash/dot all collapse to `-`).

`session-cost.ts:46-53` (`listProjectSessions`):

```ts
async function listProjectSessions(
  repoPath: string,
  sourceProjectSlug: string | null = null
): Promise<string[]> {
  const slug = sourceProjectSlug ?? slugifyRepoPath(repoPath);
  const dir = path.join(getProjectsRoot(), slug);
  return getCachedDirFiles(dir, (name) => name.endsWith(".jsonl"));
}
```

`session-cost.ts:200-216` (`resolveSingleSource`, called from
`resolveScanSources`):

```ts
let effectiveSlug = sourceProject ?? slugifyRepoPath(repoPath);   // line 200
let autoDetected = false;
let initialFiles = await listProjectSessions(repoPath, effectiveSlug);   // line 202
if (!sourceProject && autoDetect) {                                // line 203
  const hasActivity = await sessionsHaveInWindowAssistantTurns(initialFiles, startMs, endMs);
  if (!hasActivity) {
    const detected = await autoDetectSourceProject({ startedAt, completedAt: endIso });
    if (detected && detected !== effectiveSlug) {
      effectiveSlug = detected;
      initialFiles = await listProjectSessions(repoPath, effectiveSlug);
      autoDetected = true;
    }
  }
}
```

`session-cost-scanner.ts:177-219` (`resolveScanSources`, the sibling
implementation used by the non-`.ts`-import call path) has the identical
pattern at line 191: `let effectiveSlug = sourceProject || slugifyRepoPath(repoPath);`
and the same `if (!sourceProject && autoDetect)` guard at line 206.

**The bug**: whenever a caller supplies an explicit `sourceProject` string
(via `--source-project` on the CLI), it is trusted as an already-correct
directory name and used as-is at line 202/`listProjectSessions` — never
passed through `slugifyRepoPath`. And because `sourceProject` is truthy
(even though wrong), the `if (!sourceProject && autoDetect)` guard at line
203 is skipped, so the auto-detect fallback that exists specifically to
recover from "no/empty scan results" **never runs**. The citylive report's
own `Auto-detected: no` line is a direct behavioral fingerprint of this
exact code path firing.

Cross-checked against the actually-installed plugin, not just the
`dev-team` source checkout — `C:\Users\serge\.claude\plugins\cache\astra\crew\0.67.0\scripts\lib\session-cost.ts:200`
and `...\session-cost-scanner.ts:191` are byte-identical to the above, so
this is live in production, not a stale-cache or unreleased-fix artifact.

### Loop-side: the same unvalidated pass-through exists in `crew-bridge.mts`

`src/scripts/lib/slice-linker/crew-bridge.mts:252-258` (this repo,
`tryWriteCostReport`):

```ts
if (mode === "scoped") {
  const project = config?.loop?.costProject ?? repoPath.replace(/[^A-Za-z0-9]/g, "-");
  const aliases = config?.loop?.costProjectAliases;
  appendSourceProjectArgs(reportArgs, project, aliases);
} else {
  reportArgs.push("--aggregate-all");
}
```

Note the asymmetry: the **fallback** value (no `costProject` configured)
is correctly slugified inline (`repoPath.replace(/[^A-Za-z0-9]/g, "-")`,
identical regex to crew's own `slugifyRepoPath`). But when
`config.loop.costProject` **is** set, it is passed straight to
`appendSourceProjectArgs` (`crew-bridge.mts:214-227`) and out to
`--source-project` with **no normalization at all**. Nothing in
`CLAUDE.md`, `crew-bridge.mts`'s comments, or `docs/` states that
`loop.costProject` must already be a slugified value rather than a
human-readable project name — a reasonable person configuring this field
by hand (or an older/removed version of citylive's `.claude/loop.json` —
`git log -p --all -- .claude/loop.json` in the citylive checkout shows no
commit ever touching a `costProject` key, so if it was set it was either
an uncommitted local edit or passed via a since-removed manual/ad-hoc
invocation; the exact historical origin of the literal string
`AstraGenie.CityLive` could not be pinned to a specific commit or call
site, and is not needed to confirm or fix the bug) would very plausibly
type the product's readable name, exactly matching what's recorded in
every affected citylive report.

### Why this generalizes beyond citylive

`detectCostMode` (`crew-bridge.mts:144-171`) returns `"scoped"` whenever
`config?.loop?.costProject` is set, OR the repo is a linked worktree, OR
more than one worktree is attached — i.e., **exactly the wave/swarm
worktree-dispatch pattern this very SLICE-174 investigation is running
under**. Any repo using `loop.costProject` for cross-worktree cost
isolation (the documented purpose, per the comment at
`crew-bridge.mts:140-143`) is one human typo away from silently zeroing
out all its scoped cost telemetry, with no error surfaced — the report
still renders, just with `usd: 0` and no diagnostic hint pointing at the
misconfigured value.

## Fix scoping for SLICE-175

Two independent, non-conflicting fixes, both testable without needing the
other:

1. **Loop-side (primary, fixture-testable in THIS repo, satisfies AC-2
   directly)** — normalize `config?.loop?.costProject` (and each entry of
   `costProjectAliases`) through the same `.replace(/[^A-Za-z0-9]/g, "-")`
   transform already used for the fallback, at
   `crew-bridge.mts:253-254`, before calling `appendSourceProjectArgs`.
   This is idempotent on already-correct slugs (a dash matches
   `[^A-Za-z0-9]` and maps to itself), so a repo with a properly-slugified
   `costProject` today is provably unaffected — satisfies AC-4 for free.
   A citylive-shaped fixture test: set `config.loop.costProject =
   "AstraGenie.CityLive"`, assert the value handed to
   `appendSourceProjectArgs` (or the resulting `--source-project` argv
   entry) is the slugified form, not the raw string.
2. **Crew-side (defense-in-depth, upstream request — AC-3)** — the deeper
   gap is that `resolveScanSources`/`resolveSingleSource` trusts any
   caller-supplied `sourceProject` completely and disables its own
   auto-detect safety net whenever one is present, even a non-existent
   one. A crew-side improvement (either normalize `sourceProject` the same
   way, or fall back to auto-detect when the supplied slug's directory
   has zero in-window activity, regardless of whether it was explicitly
   given) would close this for every caller, not just loop's. This is the
   right shape for a `docs/upstream-requests/` entry rather than a
   loop-side patch, since loop cannot fix another plugin's scanner
   internals — file it alongside SLICE-175's loop-side fix, not instead
   of it.

Recommend SLICE-175 implement (1) as the concrete, verifiable AC-2 fix,
and file (2) as a `docs/upstream-requests/` entry per AC-3 (root cause
is confirmed crew-side for the auto-detect-bypass half of the bug).

## Files referenced (read-only, no edits made in this spike)

- `src/scripts/lib/slice-linker/crew-bridge.mts` (runner-plugin, this
  worktree)
- `scripts/lib/session-cost.ts` (dev-team, read-only reference)
- `scripts/lib/session-cost-scanner.ts` (dev-team, read-only reference)
- `scripts/lib/cost-hygiene/cost-slice-handler.ts` (dev-team, read-only
  reference)
- `scripts/lib/cost-hygiene/render-frontmatter.ts` (dev-team, read-only
  reference)
- `C:\work\mega\citylive\.claude\artifacts\crew\cost\*.md` (12 files,
  read-only reference, not modified)
- `C:\work\mega\citylive\.claude\loop.json` (read-only reference)
- `C:\work\mega\citylive` git remote + directory metadata (read-only,
  `git remote -v`, directory listing/creation time only)
- `~/.claude/projects/` directory listing only (names, file counts;
  **no transcript file contents read**, per this slice's forbidden-scope
  constraint) — `C--work-mega-AstraGenie-CityLive`, `C--work-mega`,
  `C--work-mega-runner-plugin` used as comparison points
- Installed plugin cache cross-check:
  `C:\Users\serge\.claude\plugins\cache\astra\crew\0.67.0\scripts\lib\session-cost.ts`
  and `...\session-cost-scanner.ts` (confirmed byte-identical to the
  `dev-team` source checkout, so this is not a stale-cache artifact)
