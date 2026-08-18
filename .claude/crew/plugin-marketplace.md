# Plugin Marketplace — runner-plugin (marketplace slug `loop`)

<!-- Corrected 2026-07-21 (agentic-setup audit): this file previously cited
the pre-transfer `sergeymilashico/loop` + `sergeymilashico/hero-crew` repos
and a standalone `loop` marketplace. Both plugins now ship from the single
central `astragenie/astra-marketplace` registry (ADR-013, 2026-06-16) —
plugin *code* still lives in separate repos, but there is no more
per-plugin marketplace repo. See README.md "Marketplace history" for the
full timeline. Note: `.claude/crew/` is not in `validate-org-refs.mts`'s
scan targets, so this drift evaded CI — see `docs/ci-gates.md` gate 15. -->

## Sources

Plugin code and the marketplace registry are separate repos. The `loop`
plugin (this repo, GitHub `astragenie/runner-plugin`) and the `crew` plugin
(GitHub `astragenie/dev-team`) both publish through one registry.

| Plugin | Marketplace slug | Plugin code repo |
|--------|-------------------|-------------------|
| `loop` (plugin id `runner`) | `astra` | `astragenie/runner-plugin` |
| `crew` | `astra` | `astragenie/dev-team` |

Registry source of truth: `astragenie/astra-marketplace`'s `marketplace.json`
(`bun ./src/scripts/validate-marketplace-sync.mts` is the CI gate keeping
this repo's `.claude-plugin/plugin.json` version in sync with it).

## IMPORTANT: Never create local marketplaces

Always register marketplaces from GitHub, not from local paths.
Use `"source": "github"` in `known_marketplaces.json`.

## Registry files (user-global)

- `~/.claude/plugins/known_marketplaces.json` — marketplace registrations
- `~/.claude/plugins/installed_plugins.json` — installed plugin versions
- `~/.claude/plugins/marketplaces/astra/` — GitHub clone of
  `astragenie/astra-marketplace`
- `~/.claude/plugins/MARKETPLACE-SETUP.md` — full re-registration runbook

## Re-register from scratch

```bash
git clone --depth 1 https://github.com/astragenie/astra-marketplace \
  ~/.claude/plugins/marketplaces/astra
```

Add to `known_marketplaces.json`:
```json
"astra": { "source": { "source": "github", "repo": "astragenie/astra-marketplace" },
           "installLocation": "~/.claude/plugins/marketplaces/astra" }
```

Then install both plugins from that one marketplace:

```
/plugin marketplace add astragenie/astra-marketplace
/plugin install crew@astra
/plugin install loop@astra
```

Add to `installed_plugins.json`:
```json
"loop@astra": [{ "scope": "user", "installPath": "~/.claude/plugins/cache/astra/loop/<ver>", "version": "<ver>" }],
"crew@astra": [{ "scope": "user", "installPath": "~/.claude/plugins/cache/astra/crew/<ver>", "version": "<ver>" }]
```
