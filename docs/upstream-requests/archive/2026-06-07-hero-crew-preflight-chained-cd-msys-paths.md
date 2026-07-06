---
filed: 2026-06-07
target_plugin: hero-crew
target_repo: astragenie/dev-team
status: pending-upstream-fix
loop_tracking_feat: FEAT-068
loop_related_slice: SLICE-68 (this doc)
---

# Upstream-request: `preflight-shell` chained-cd guard accepts MSYS mount-prefix paths on Windows

## Filed against

- **Plugin:** hero-crew (`astra/crew/<version>`)
- **Hook:** `hooks/preflight-shell.mjs` → `scripts/lib/preflight/checks.mjs::checkChainedCdPaths`
- **Source line:** `scripts/lib/preflight/checks.mjs:120-128` (the `path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath)` + `fs.stat(resolved)` site)
- **Reason:** hook fires false-positive on valid Windows Git Bash paths. Loop tracks the request for visibility; the fix lives in hero-crew.

## Problem

On Windows Git Bash / MSYS, the natural path syntax for chained `cd` is:

```bash
cd /c/work/mega/loopobserver && git status
```

`/c/work/mega/loopobserver` is the MSYS mount-prefix representation of `C:\work\mega\loopobserver`. The shell resolves it correctly. Node's `fs.stat("/c/work/mega/loopobserver")` on Windows does NOT — it sees the path as relative-to-root and reports ENOENT.

Today the hook surfaces:

```
PreToolUse:Bash says: chained cd target does not exist: /c/work/mega/loopobserver
```

Encountered 2026-06-07 while porting `loopobserver` to nested slice layout. Repeated `cd /c/work/mega/loopobserver && git <cmd>` blocked despite path validity. The hook is correctly suspicious of relative chained-cd targets that resolve to nothing, but MSYS paths are a Windows-platform-specific false positive.

## Current code (excerpt)

`scripts/lib/preflight/checks.mjs` lines 120-128:

```js
const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath);
try {
  await fs.stat(resolved);
} catch (err) {
  if (/** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT") {
    warnings.push(`chained cd target does not exist: ${resolved}`);
  }
  // Other errors (EPERM etc.) — don't warn, be conservative
}
```

`path.isAbsolute("/c/work/...")` returns `true` (it starts with `/`), so `resolved === "/c/work/..."` — and `fs.stat` against that on Windows returns ENOENT even though the same path is reachable via the shell.

## Suggested fix

Add a `normalizeCdTarget` helper that translates the MSYS mount prefix to a Windows path on `win32` only, then `fs.stat` against the normalized form:

```js
/**
 * On Windows, MSYS / Git Bash represent C:\foo as /c/foo. Node's fs sees
 * the raw form as relative-to-root and reports ENOENT even when the shell
 * would resolve it. Translate /c/foo → C:\foo before the existence check.
 *
 * No-op on Linux/macOS where /c/foo would be a real (POSIX) path.
 */
function normalizeCdTarget(raw) {
  if (process.platform !== "win32") return raw;
  const m = raw.match(/^\/([a-zA-Z])\/(.*)$/);
  if (m) return `${m[1].toUpperCase()}:\\${m[2].replace(/\//g, "\\")}`;
  return raw;
}
```

Then change the `fs.stat` site to:

```js
const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath);
const target = normalizeCdTarget(resolved);
try {
  await fs.stat(target);
} catch (err) {
  if (/** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT") {
    warnings.push(`chained cd target does not exist: ${target}`);
  }
}
```

## Acceptance criteria (from FEAT-068)

1. **AC-1** — hook accepts `cd /c/<path>` on Windows by normalizing the MSYS mount prefix (`/c/` → `C:\\`, `/d/` → `D:\\`, etc.) before `fs.stat`
2. **AC-2** — hook still blocks genuinely nonexistent paths (negative case)
3. **AC-3** — behavior unchanged on Linux/macOS (where `/c/...` is a real path and should be checked literally)
4. **AC-4** — tolerates mixed slashes (`/c/work\mega\loopobserver`)
5. **AC-5** — tests cover all three platforms via path-normalization unit tests (no live FS dependency)
6. **AC-6** — `npm test` + lint clean

## Out of scope (for the upstream PR)

- Cygwin `/cygdrive/c/...` translation — different prefix; separate request if it surfaces.
- WSL `/mnt/c/...` translation — different prefix; separate request if it surfaces.
- Any other check in `preflight/checks.mjs` beyond the chained-cd existsSync site.

## Current operator workaround

Use `git -C "C:/work/mega/loopobserver" <cmd>` instead of `cd /c/work/mega/loopobserver && git <cmd>`. Forward slashes inside `C:/...` work on Windows in both Git Bash and Node, and `-C` sidesteps the chained-cd guard entirely. The workaround is verbose enough that the natural shell pattern is preferable once the upstream lands.

## Cross-references

- Loop tracking FEAT: FEAT-068
- Loop slice: SLICE-68
- Companion upstream requests already filed:
  - `docs/upstream-requests/2026-06-06-hero-crew-redundant-read-hook-deny.md`
  - `docs/upstream-requests/2026-06-07-hero-crew-brief-me-halt-badge-rendering.md`

## Follow-up

When the upstream fix lands, flip `status` to `landed-upstream` and reference the hero-crew PR / release that contains the change.
