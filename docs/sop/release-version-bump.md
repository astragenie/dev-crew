# SOP: Cutting a plugin release (version bump)

Every release requires three version files to stay in lockstep.
Drifting any one of them causes silent issues for marketplace consumers
(incident 2026-06-06: sessions installing via `marketplace.json` stayed
pinned to `0.22.0` while `plugin.json` shipped through `0.24.1`).

## The three files

| File | Field |
|---|---|
| `.claude-plugin/plugin.json` | `"version"` |
| `.claude-plugin/marketplace.json` | `plugins[].version` (own entry) |
| `package.json` | `"version"` |

## How to bump

Use the atomic bump script — never edit these files manually:

```bash
npm run bump-version <new-version>
# e.g. npm run bump-version 0.34.0
```

Output confirms all three updated:

```
plugin.json      0.33.0 -> 0.34.0
marketplace.json 0.33.0 -> 0.34.0
package.json     0.33.0 -> 0.34.0
```

Then verify the lockstep:

```bash
node ./scripts/validate-manifests.mjs
# Manifests OK:
#   plugin.json      loop@0.34.0
#   package.json     loop-plugin@0.34.0
#   marketplace.json (1 entries)
#     - loop@0.34.0
```

`validate-manifests` is a CI gate — any drift between the three files
fails the build.

## Full release checklist

1. **Bump** — `npm run bump-version <new-version>`
2. **CHANGELOG** — prepend a `## v<new-version>` section listing Added / Changed / Fixed
3. **Build** — `npm run build` (tsc must be clean)
4. **Gates** — `npm test && npm run lint && npm run format:check && node ./scripts/validate-manifests.mjs`
5. **Release artifact** — create `.claude/artifacts/loop/releases/v<new-version>.md`
6. **Commit** — `chore(release): v<new-version>`
7. **Push** — `git push origin main`

## Semver guidance

| Change type | Bump |
|---|---|
| New commands, agents, or skills | minor (`0.X.0`) |
| Bug fixes, doc-only, convention changes | patch (`0.0.X`) |
| Breaking contract changes (slice file format, config schema) | major (`X.0.0`) |

## CI enforcement

`validate-manifests.mjs` runs as a CI gate (step 2 in `.github/workflows/`).
A drift between `plugin.json`, `marketplace.json`, and `package.json` is a
hard build failure — the PR cannot merge.
