---
filed: 2026-06-07
target_plugin: hero-crew
target_repo: astragenie/dev-team
status: pending-upstream-author
loop_tracking_feat: FEAT-074
loop_related_spec: docs/superpowers/specs/2026-06-07-preset-driven-skill-activation-design.md
---

# Upstream-request: author forward-declared skill IDs referenced by loop presets

## Filed against

- **Plugin:** hero-crew (`astra/crew/<version>`)
- **Surface:** `skills/domain/` — skill directories referenced by builder agents

## What loop ships

Loop v0.27.0–v0.28.x ship presets (`scripts/presets/*.json`) whose builder
loadouts reference skill IDs that the resolver passes verbatim to the
`Skill` tool at builder dispatch time. The IDs the resolver emits are
opaque strings — there is no runtime registry validating them today.

Some of these IDs **do not have a matching skill directory** in upstream
`hero-crew` (`skills/domain/<id>/SKILL.md`) at the time of this filing.
They were chosen to match the routing tables already documented in
`agents/builder-fe.md` and `agents/builder-be.md` upstream (the
"`stack:csharp` → `skills/domain/csharp-pro/`" line and similar).
Those routing tables forward-declare the IDs too.

## IDs already present in upstream `skills/domain/`

Confirmed at `~/.claude/plugins/marketplaces/astra/skills/domain/` as of
2026-06-07:

- `react-engineering`
- `typescript-pro`
- `python-pro`
- `frontend-advisory`
- `backend-advisory`
- `contract-codegen`
- `database-architecture`

## IDs forward-declared (no directory yet)

These appear in shipped loop preset skill arrays and must be authored
upstream — or aliased — to avoid `Skill` tool no-ops at dispatch time:

| Skill ID | First referenced by | Notes |
|---|---|---|
| `csharp-pro` | `scripts/presets/dotnet-only.json`, `dotnet-react.json`, `dotnet-vue.json`, `dotnet-aspire-python.json` | Builder-be routing table at `agents/builder-be.md:48` literally says "**NEW skill in this FEAT; first slice authors it**" |
| `go-pro` | (none in v0.28.x; reserved for future Go preset) | Same upstream note: gated on demand |
| `vue-engineering` | `scripts/presets/dotnet-vue.json` | FE counterpart of `react-engineering` |
| `angular-engineering` | (reserved; no preset uses it yet) | Future |
| `svelte-engineering` | (reserved; no preset uses it yet) | Future |
| `a11y-advisory` | `scripts/presets/dotnet-react.json`, `dotnet-vue.json`, `dotnet-aspire-python.json` (every fe block) | Builder-fe routes `concern:accessibility` → `skills/domain/a11y-advisory/` at `agents/builder-fe.md:49` |
| `aspire-orchestration` | (reserved; no preset uses it yet) | Future, when `deployment: "aspire"` repos add explicit Aspire skill |
| `azure-deployment` | (reserved; not in shipped presets) | Future |
| `terraform-advisory` | (reserved; not in shipped presets) | Future |
| `k8s-advisory` | (reserved; not in shipped presets) | Future |

Loop also forward-declares **role skills** in `roles.<name>.skills`
across all presets:

| Skill ID | Where referenced | Status |
|---|---|---|
| `superpowers:verification-before-completion` | `roles.pm.skills`, `roles.researcher.skills` | Shipped in upstream superpowers plugin already |
| `superpowers:brainstorming` | `roles.architect.skills` | Shipped in upstream superpowers plugin already |
| `devcrew:loop-discipline` | `roles.pm/researcher/architect/document-writer.skills` | Shipped in loop plugin itself (this repo) |

The role-skill row is fine — those resolve at runtime.

## Why now

The resolver CLI ships dispatch instruction blocks naming these IDs as
of loop v0.27.0. If a builder is dispatched today with `csharp-pro` in
its `## Required skills (resolved)` block, the `Skill` tool either no-ops
or surfaces a "skill not found" message. Loop tolerates this as a Skill-tool
warning (see `devcrew:builder-be` fallback) but the design intent is that the
ID resolves to a real skill.

## Asks

1. Author `skills/domain/csharp-pro/SKILL.md` (highest priority — used by
   four shipped presets).
2. Author `skills/domain/a11y-advisory/SKILL.md` (every FE-bearing preset
   references it).
3. Author `skills/domain/vue-engineering/SKILL.md` (`dotnet-vue` preset).
4. Defer `go-pro`, `angular-engineering`, `svelte-engineering`,
   `aspire-orchestration`, `azure-deployment`, `terraform-advisory`,
   `k8s-advisory` until a shipped preset references them.

Alternative: provide an alias / passthrough mechanism so the `Skill` tool
can map `csharp-pro` → an existing related skill (e.g.
`crew:3rdparty:c-sharp-pro` is shipped) without forcing skill duplication.

## Loop-side mitigation

None planned. The resolver is opaque about skill IDs by design (see Q3 of
the preset-driven skill activation design doc — "treat as opaque
strings"). Loop will not lint or filter the array; that responsibility
sits upstream once a registry exists.

Loop's `--strict` flag is reserved for a future registry-check mode.
Today it emits a stderr warning that it is a no-op. When upstream ships
the registry, loop's `--strict` will gain meaning and the flag becomes a
hard validation gate.

## How to mark resolved

When the three priority skill directories exist upstream, update this
file's frontmatter:

```yaml
status: resolved-by-upstream-skills-authored
resolved: <date>
resolved_by: hero-crew vN.M.K — authored csharp-pro, a11y-advisory, vue-engineering under skills/domain/
```

and move the remaining IDs (`go-pro`, etc.) into a follow-up
"reserved-for-future" tracking file.
