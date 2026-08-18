---
title: Cross-Session Learnings
date: 2026-05-28
status: draft
owner: lead
type: feature-spec
feat: FEAT-011
---

# Cross-Session Learnings — FEAT-011

## Goal

Persist per-project operational learnings as an append-only JSONL file so the loop
can proactively surface the most relevant ones at slice start. The user can also add
learnings manually via `/loop:learn`, review and prune them via `/loop:learnings`, and
export them to CLAUDE.md or another markdown file.

Learnings compound loop effectiveness across sessions. They are distinct from
`lessons-feed.mjs`, which retroactively extracts grade content. Learnings are proactive
annotations: authored by the agent or user when something durable is discovered, then
recalled before new work begins.

## Non-Goals

- Semantic / vector search. Keyword and tag matching only.
- Cross-repo learnings. One JSONL file per repo.
- A UI or interactive terminal browser.
- Replacing `lessons-feed.mjs`. The two systems coexist: grade lessons flow through
  the existing grades pipeline; learnings live in their own file and are injected at
  slice start independently.
- TTL for manually-added learnings unless the user explicitly sets one.
- Automatic deduplication on write (dedup is display-time only, to preserve full audit trail).

---

## Architecture

### Separation from `lessons-feed.mjs`

| Concern | `lessons-feed.mjs` | `learnings.mjs` (new) |
|---|---|---|
| Source | Grade markdown files, retroactive | JSONL entries, proactive |
| Trigger | Next-slice planner | Slice start (every slice) |
| Content | Lessons / surprises from graded slices | Operational insights, pitfalls, preferences |
| Lifecycle | Grows with grades; never expires | TTL-aware; prunable |
| Author | Grade writer (automated) | Agent (automated) or user (manual) |

### Data flow

1. **Write path** — `appendLearning(repoPath, entry)` in `scripts/lib/learnings.mjs`.
   Called from: (a) `scripts/loop.mjs` `learn` command, (b) future hook points in slice-linker.
2. **Read/filter path** — `recallLearnings(repoPath, { title, category, limit })` in `scripts/lib/learnings.mjs`.
3. **Slice-start injection** — `scripts/lib/slice-linker.mjs` or `scripts/lib/ceremonies.mjs`
   calls `recallLearnings` during slice start and adds digest to context block. Best-effort:
   missing or empty file → block omitted silently.
4. **CLI surface** — two new top-level commands in `scripts/loop.mjs`: `learn` and `learnings`.

### Path resolution

Add to `PATH_DEFAULTS` in `scripts/lib/paths.mjs`:

```js
learningsRoot: ".claude/artifacts/loop/learnings"
```

Export a new helper:

```js
export function learningsRoot(repoPath, config) {
  return path.join(repoPath, resolve("learningsRoot", config));
}
```

File per repo:
```
<repoPath>/.claude/artifacts/loop/learnings/<repo-slug>.jsonl
```

`repo-slug` = `path.basename(repoPath)` with non-alphanumeric → hyphens, lowercased.
Example: `hero-crew-autonomous-loop`. Convenience function `learningsPath(repoPath, config)`
in `learnings.mjs` assembles the full path.

---

## Storage Schema

Each line in `<repo-slug>.jsonl` is one JSON object:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | yes | `lrn-<yyyymmdd>-<6 hex>`. Unique per file. |
| `date` | `string` | yes | ISO-8601 date `YYYY-MM-DD`. |
| `tags` | `string[]` | yes | 1–5 kebab-case labels. |
| `body` | `string` | yes | One-sentence insight. Max 300 chars enforced on write. |
| `source` | `string` | yes | `"slice:<slice-id>"` or `"manual"`. |
| `ttl_days` | `number \| null` | yes | Days until expiry from `date`. `null` = no expiry. Default: 90 for agent-written; `null` for manual. |
| `confidence` | `number` | no | 1–10. Omit when unknown. |

Example:
```json
{"id":"lrn-20260528-a3f9c1","date":"2026-05-28","tags":["cache","paths"],"body":"cache.mjs keyed by repoPath+slug; bust on any write to backlog frontmatter or new entry.","source":"slice:SLICE-042","ttl_days":90,"confidence":8}
```

Append-only on write. Last entry for a duplicate concept wins at display time.

---

## Commands

### `loop:learn`

```
node scripts/loop.mjs learn [--repo <path>] [--tags <tag,...>] [--ttl-days <n|none>] -- <insight text>
```

Behavior:
1. Validate: insight text non-empty, ≤ 300 chars (truncate with `…` rather than error).
2. Parse `--tags` from positional text heuristically; `--tags tag1,tag2` explicit flag wins.
3. Build entry: `source: "manual"`, `ttl_days: null` (or `--ttl-days` value).
4. Call `appendLearning(repoPath, entry)`.
5. Return `{ ok: true, id, path }`.

New `FLAG_SPEC` entries in `loop.mjs`:
```js
"--tags":     { key: "tags" }
"--ttl-days": { key: "ttlDays" }
"--dry-run":  { key: "dryRun", boolean: true }
```

### `loop:learnings`

Three subcommands. Dispatcher mirrors existing `backlog` pattern.

**`learnings list`** `[--tags <tag,...>] [--limit <n>]`
- Reads JSONL, filters by tag overlap, display-time dedup (same body prefix → keep newest).
- Returns `{ count, entries[] }` each with `expired: boolean`. Default limit: 20.

**`learnings prune`** `[--dry-run]`
- Identifies expired: `ttl_days !== null && new Date(date) + ttl_days * 86400000 <= Date.now()`.
- Atomic rewrite: write to `<file>.tmp` then `fs.rename`. Returns `{ pruned, remaining, dryRun }`.

**`learnings export`** — out of scope for initial slice.

---

## `scripts/lib/learnings.mjs` — Public API

```js
export function repoSlug(repoPath)
export function learningsPath(repoPath, config)
export async function appendLearning(repoPath, entry, config)
export async function readLearnings(repoPath, config)
export function filterLearnings(entries, { query, tags, limit })
export async function recallLearnings(repoPath, { title, category, limit = 3 }, config)
export function expiredEntries(entries)
export async function pruneExpired(repoPath, config, { dryRun = false })
export function renderLearningsDigest(entries)
```

ID generation (no external dep):
```js
function generateId(date) {
  const d = date.replace(/-/g, "");
  const rand = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
  return `lrn-${d}-${rand}`;
}
```

**Error handling:** soft failures return `{ ok: false, error }`. Never `throw` from library
functions. Never `process.exit` from library functions.

---

## Slice-Start Injection

In the file that assembles slice-start context (builder confirms whether `slice-linker.mjs`
or `ceremonies.mjs` owns this), add:

```js
try {
  const { recallLearnings, renderLearningsDigest } = await import("./learnings.mjs");
  const recalled = await recallLearnings(repoPath, { title: slice.title, category: slice.category }, config);
  if (recalled.length > 0) {
    contextLines.push("", "## Recalled learnings (top 3)", renderLearningsDigest(recalled));
  }
} catch {
  // learnings not available — silent no-op
}
```

Must not break existing tests when learnings file is absent.

---

## Implementation Plan

| # | Task | File(s) |
|---|---|---|
| 1 | Add `learningsRoot` to `PATH_DEFAULTS`; export helper | `scripts/lib/paths.mjs` |
| 2 | Implement `scripts/lib/learnings.mjs` with full public API | new file |
| 3 | Add `--tags`, `--ttl-days`, `--dry-run` (+ `--limit` if absent) to `FLAG_SPEC` | `scripts/loop.mjs` |
| 4 | Add `learn` command handler | `scripts/loop.mjs` |
| 5 | Add `learnings` command + `runLearningsSubcommand` dispatcher | `scripts/loop.mjs` |
| 6 | Inject recalled learnings at slice start (best-effort, try/catch) | `scripts/lib/slice-linker.mjs` or `scripts/lib/ceremonies.mjs` |
| 7 | Write tests | `tests/learnings.test.mjs` |

---

## Test Plan (`tests/learnings.test.mjs`)

Use `fs.mkdtemp(path.join(os.tmpdir(), "al-lrn-"))` for tmp repos.

| Test | Assertion |
|---|---|
| `repoSlug` strips non-alnum and lowercases | `/work/My Repo!` → `my-repo` |
| `appendLearning` creates directory on first call | dir exists after call |
| `appendLearning` writes valid JSON line | entry has correct id/date/body/tags/source/ttl_days |
| `appendLearning` truncates body > 300 chars | stored body ends with `…`, ≤ 301 chars |
| `readLearnings` returns `[]` when file missing | no throw, empty array |
| `readLearnings` returns all entries in insertion order | 3 appended → 3 returned in order |
| `filterLearnings` ranks by tag overlap | 2 tag matches ranked above 0 matches |
| `filterLearnings` respects `limit` | limit=2 returns at most 2 entries |
| `filterLearnings` breaks ties by date desc | same score → newer entry first |
| `recallLearnings` returns empty when file missing | no throw, empty array |
| `expiredEntries` identifies expired | date `2020-01-01`, ttl_days 1 → expired |
| `expiredEntries` does not flag `ttl_days: null` | manual entry never flagged |
| `pruneExpired` removes expired entries | 2 expired + 1 valid → 1 remains |
| `pruneExpired --dry-run` does not modify file | file unchanged; returns `{ dryRun: true }` |
| `renderLearningsDigest` returns non-empty markdown | contains at least one body value |
| `renderLearningsDigest` returns `""` for empty input | empty array → empty string |
