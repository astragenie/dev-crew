# Plugin Marketplace — loop

## Sources

The `loop` plugin ships from this repo. The `crew` plugin ships from a separate repo.

| Plugin | Marketplace | GitHub Repo |
|--------|-------------|-------------|
| `loop` | `loop` | `sergeymilashico/hero-crew-autonomous-loop` |
| `crew` | `astra` | `sergeymilashico/hero-crew` |

## IMPORTANT: Never create local marketplaces

Always register marketplaces from GitHub, not from local paths.
Use `"source": "github"` in `known_marketplaces.json`.

## Registry files (user-global)

- `~/.claude/plugins/known_marketplaces.json` — marketplace registrations
- `~/.claude/plugins/installed_plugins.json` — installed plugin versions
- `~/.claude/plugins/marketplaces/loop/` — GitHub clone of this repo
- `~/.claude/plugins/marketplaces/astra/` — GitHub clone of crew repo
- `~/.claude/plugins/MARKETPLACE-SETUP.md` — full re-registration runbook

## Re-register from scratch

```bash
git clone --depth 1 https://github.com/sergeymilashico/hero-crew-autonomous-loop \
  ~/.claude/plugins/marketplaces/loop
git clone --depth 1 https://github.com/sergeymilashico/hero-crew \
  ~/.claude/plugins/marketplaces/astra
```

Add to `known_marketplaces.json`:
```json
"loop":  { "source": { "source": "github", "repo": "sergeymilashico/hero-crew-autonomous-loop" },
           "installLocation": "~/.claude/plugins/marketplaces/loop" },
"astra": { "source": { "source": "github", "repo": "sergeymilashico/hero-crew" },
           "installLocation": "~/.claude/plugins/marketplaces/astra" }
```

Add to `installed_plugins.json`:
```json
"loop@loop":  [{ "scope": "user", "installPath": "~/.claude/plugins/cache/astra/loop/<ver>",  "version": "<ver>" }],
"crew@astra": [{ "scope": "user", "installPath": "~/.claude/plugins/cache/astra/crew/<ver>", "version": "<ver>" }]
```
