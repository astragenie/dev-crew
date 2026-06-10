---
id: FEAT-068
status: done
priority: P2
category: bug-fix
target_release: null
created: 2026-06-07
updated: 2026-06-07
depends_on: []
slices: [SLICE-68]
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.45
pm_technical_risk: 0.2
pm_dependency_depth: 0.1
composite_score: 0.55
autonomous_safe: true
triage_notes: "Self-triaged 2026-06-07. Small hook fix, pure path-normalization helper, fully unit-testable, no runtime IO change. Confirmed reproduction on Windows Git Bash during loopobserver port (`cd /c/work/mega/loopobserver` blocked by PreToolUse:Bash chained-cd-target-not-exist guard despite path being valid)."
started_at: 2026-06-07
slices_complete: [SLICE-68]
completed_at: 2026-06-07
github_issue: 142
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/142"
---
# FEAT-068: PreToolUse:Bash chained-cd guard accepts MSYS mount-prefix paths on Windows

## Description

On Windows Git Bash / MSYS, the natural path syntax for chained `cd` is `cd /c/work/mega/loopobserver && <cmd>`. The PreToolUse:Bash hook today calls `fs.existsSync` against the raw string and reports `chained cd target does not exist: /c/work/mega/loopobserver` even when the Windows path `C:\work\mega\loopobserver` is valid and the same `cd` would succeed in the shell. This forces operators into the longer-form workaround `git -C "C:/path" <cmd>` or sidesteps the hook entirely.

The hook's intent is to catch typos in chained-cd targets, not block valid MSYS paths.

## Acceptance criteria

- AC-1: hook accepts `cd /c/<path>` on Windows by normalizing the MSYS mount prefix (`/c/` → `C:\\`, `/d/` → `D:\\`, etc.) before `fs.existsSync`
- AC-2: hook still blocks genuinely nonexistent paths (negative case)
- AC-3: behavior unchanged on Linux/macOS (where `/c/...` is a real path and should be checked literally)
- AC-4: tolerates mixed slashes (`/c/work\mega\loopobserver`)
- AC-5: tests cover all three platforms via path normalization unit tests (no live FS dependency)
- AC-6: `npm test` + `npm run lint` clean

## Suggested implementation

Add a `normalizeCdTarget(p)` helper to the hook module:

```js
function normalizeCdTarget(raw) {
  if (process.platform !== "win32") return raw;
  // MSYS mount → Windows: /c/foo → C:\foo, /d/bar → D:\bar
  const m = raw.match(/^\/([a-zA-Z])\/(.*)$/);
  if (m) return `${m[1].toUpperCase()}:\\${m[2].replace(/\//g, "\\")}`;
  return raw;
}
```

Then use `fs.existsSync(normalizeCdTarget(target))` at the existing check site.

## Out of scope

- General path-style preference change in other hooks (only the chained-cd guard).
- Cygwin-style `/cygdrive/c/...` translation (different prefix; separate FEAT if it surfaces).
- WSL `/mnt/c/...` translation (different prefix; separate FEAT).

## Why

Today the workaround is `git -C "C:/work/mega/loopobserver" <cmd>` — works but punishes the natural Windows-Git-Bash shell pattern. The hook should normalise the path before the existence check so the operator's natural input is accepted.

## Origin

2026-06-07 session — encountered while porting `loopobserver` to nested slice layout. Repeated `cd /c/work/mega/loopobserver && git <cmd>` blocked by `PreToolUse:Bash` guard despite path validity.
