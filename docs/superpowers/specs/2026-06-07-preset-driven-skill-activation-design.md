# Preset-Driven Skill Activation — Design

- Date: 2026-06-07
- Status: draft (pending user review)
- Author: brainstorming session
- Target plugins: `loop` (this repo), `hero-crew` (upstream, Phase 2 only)

## Problem

The user operates five repos: two Claude Code plugins (TypeScript / ESM Node) and three SaaS apps (React + TypeScript frontend, C# / .NET + Postgres backend, OpenAPI contracts). Each repo's tech stack is **known in advance** — it does not vary feature-to-feature.

Today's skill activation flow does not exploit that:

1. `/loop:backlog-enrich` dispatches the `architect` agent against every triaged FEAT to classify it into `tags` / `surface` / `stack:*` frontmatter.
2. `crew:builder-fe` and `crew:builder-be` carry baked-in routing tables that map `stack:csharp → skills/domain/csharp-pro/` and similar.
3. `/crew:orchestrate-slice` does not yet read `surface` / `stack` (upstream gap — see `docs/upstream-requests/2026-06-07-hero-crew-orchestrate-slice-surface-stack-routing.md`). So today every dispatch falls back to the generic `crew:builder` with no language-specific skill loadout.

Costs of the per-FEAT classification model:

- One architect dispatch per pending FEAT, regardless of how trivial. Wasted tokens.
- Two sources of truth (preset stack identity vs FEAT `stack:*` tag) that can drift.
- Routing tables live inside agent prompts in a different plugin (`hero-crew`), making them hard to test or evolve from the `loop` side.
- No way to express richer axes (deployment, storage, contract type) without inflating the FEAT-level tag vocabulary.

## Goals

1. Make project-level stack identity the **sole source** for builder skill activation.
2. Express the identity along multiple axes (project type, frontend, backend, storage, contract, deployment) so future agents can route on more than language.
3. Ship a working slice end-to-end in **loop alone**, with no dependency on a `hero-crew` upstream change.
4. Provide a clean migration path so that once the upstream orchestrator is upgraded, the same resolver code serves automatically.
5. Remove per-FEAT `stack:*` / `surface` classification once the resolver is in place — eliminate the architect dispatch on enrichment.

## Non-goals

- Inventing a skill registry. The known skill IDs are listed in builder agent routing tables; we treat them as opaque strings.
- Per-FEAT stack overrides. If a single FEAT in a `dotnet-react` repo touches Python tooling, the operator updates the FEAT body manually — not via tag-based routing.
- Cross-language inference. Language is implied by `frontend.framework` and `backend.framework`. No separate `languages:[]` array.
- Replacing the `hero-crew` builder agents. We use them as-is in Phase 1; Phase 3 considers contributing the Step 0 prologue upstream.

## Decisions (from brainstorming Q1–Q5)

| Q | Decision |
|---|---|
| Q1 — routing axes | Preset axes: `projectType`, `frontend`, `backend` (with storage), `contract`, `deployment`. No flat `languages` array. |
| Q2 — activation mechanism | Orchestrator (Phase 2) / operator (Phase 1) reads preset, injects a `## Required skills (resolved)` block into the builder dispatch prompt. |
| Q3 — mapping location | Each `scripts/presets/*.json` declares its own `skills` (or `fe.skills` + `be.skills`) array explicitly. No central rules table. |
| Q4 — split shape | Preset carries `split: boolean`. `true` → `fe.skills` + `be.skills` consumed by `crew:builder-fe` and `crew:builder-be`. `false` → top-level `skills` consumed by generic `crew:builder`. |
| Q5 — classifier fate | Drop `stack:*` and `surface` emission from `/loop:backlog-enrich`. Preset is sole source. Architect dispatch on enrichment may be skipped entirely if no other fields remain (revisit during implementation). |

## Architecture

Three layers, one data flow:

```
.claude/loop.json (per-repo override)
        ↓ deep-merged over
scripts/presets/<name>.json (plugin-shipped defaults)
        ↓ read by
scripts/loop.mjs resolve-skills --variant <fe|be|single>
        ↓ JSON output (skills[] + rendered block)
operator pastes block into builder dispatch          (Phase 1, today)
        ↓ OR
/crew:orchestrate-slice invokes the same CLI         (Phase 2, post-upstream)
        ↓
crew:builder-fe / crew:builder-be / crew:builder
        ↓ Step 0
Skill tool: invoke each skill id in resolved skills[]
        ↓
implementation
```

Phase 1 ships the preset schema, the resolver, the CLI, and the classifier removal. Phase 2 wires the orchestrator to call the CLI once the upstream `hero-crew` change lands. Phase 3 (optional) deletes the legacy routing tables in builder agents.

Backward compatibility: a preset without the new fields causes the resolver to return no-match (exit 2). The builder's Step 0 sees no resolved block and falls back to today's baked-in routing tables. Existing presets keep working until updated.

## Components

### Preset schema extension (`scripts/presets/*.json`)

All new fields optional during migration. `schemaVersion: 1` becomes required after Phase 1 lands.

```json
{
  "schemaVersion": 1,
  "presetName": "dotnet-react",
  "description": "...",
  "projectType": "saas",
  "split": true,
  "frontend": { "framework": "react", "language": "typescript" },
  "backend": {
    "framework": "dotnet",
    "language": "csharp",
    "storage": "postgres"
  },
  "contract": "openapi",
  "deployment": "terraform",
  "fe": {
    "skills": [
      "react-engineering",
      "typescript-pro",
      "frontend-advisory",
      "contract-codegen",
      "a11y-advisory"
    ]
  },
  "be": {
    "skills": [
      "csharp-pro",
      "backend-advisory",
      "database-architecture",
      "contract-codegen"
    ]
  }
}
```

No-split preset (claude-plugin):

```json
{
  "schemaVersion": 1,
  "presetName": "typescript-plugin-dev",
  "projectType": "claude-plugin",
  "split": false,
  "frontend": { "framework": "none", "language": "typescript" },
  "backend": { "framework": "node", "language": "typescript", "storage": "none" },
  "contract": "none",
  "deployment": "none",
  "skills": ["typescript-pro", "frontend-advisory"]
}
```

Rule: `split: true` consumes `fe.skills` + `be.skills`; `split: false` consumes top-level `skills`. The two shapes are mutually exclusive — validator rejects a preset carrying both.

### Resolver module — `src/scripts/lib/skill-resolver.mts`

Pure function. Single export:

```ts
export interface ResolvedSkills {
  variant: 'fe' | 'be' | 'single';
  skills: string[];
  source: 'preset.fe' | 'preset.be' | 'preset.skills' | 'fallback';
  dispatchInstructionBlock: string;
}

export function resolveSkills(args: {
  presetPath: string;
  overridePath?: string;
  variant: 'fe' | 'be' | 'single';
}): ResolvedSkills | null;
```

Behavior:

- Loads preset JSON, deep-merges `.claude/loop.json` over it.
- Validates `schemaVersion === 1` (throws `SchemaError` otherwise).
- `split: true` + variant `fe` or `be` → returns matching `{ fe | be }.skills` block.
- `split: false` + variant `single` → returns top-level `skills`.
- Schema mismatch (e.g. asking for `fe` on a no-split preset, or empty skills array) → returns `null`. Caller treats as exit 2.
- Renders `dispatchInstructionBlock` as a Markdown heading + bullet list of skill IDs, ready to embed in a builder dispatch prompt.

Deep-merge semantics for the override:

- Object fields merge by key.
- Array fields concat-dedup by default.
- Override may use `{ "$replace": [...] }` to fully replace an array (escape valve for explicit removal).

### CLI subcommand — `scripts/loop.mjs resolve-skills`

Thin ESM wrapper over the resolver. Args:

```
--variant <fe|be|single>     (required)
--preset <path>              (default: read .claude/loop.json -> preset name -> scripts/presets/<name>.json)
--override <path>            (default: .claude/loop.json)
--strict                     (escalate unknown skill IDs from warn to exit 1)
```

Output:

- Exit 0: JSON to stdout matching `ResolvedSkills`.
- Exit 1: real error to stderr (file missing, JSON malformed, unsupported `schemaVersion`, validation failure).
- Exit 2: no-match (split mismatch, empty skills array). Caller falls back to legacy behavior.

The three-code contract gives orchestrators and operators clean shell branching.

### Builder agent edits (Phase 2 — upstream)

A new prologue is added to `crew:builder`, `crew:builder-fe`, `crew:builder-be`:

> **Step 0 — Resolve skills.** If the dispatch prompt contains a section starting with `## Required skills (resolved)`, invoke each listed skill via the `Skill` tool before any other work. Otherwise, fall back to the routing tables in the agent prompt body.

In Phase 1 (loop-only), the builder agents are unchanged. The embedded `## Required skills (resolved)` block in the dispatch prompt is followed implicitly because LLM-driven agents follow inline instructions in their prompt body. Phase 1 therefore works without an agent code change — Phase 2 only makes the behavior deterministic and testable by adding the explicit Step 0 prologue.

The existing routing tables remain in place as the fallback path through Phase 2. They are not deleted until Phase 3.

### Operator command — `/loop:dispatch-builder` (optional convenience, Phase 1)

A slash command that wraps `resolve-skills`. Behavior:

- Reads the slice file, infers variant (`fe`, `be`, or `single`) from FEAT linkage and preset `split`.
- Runs the resolver.
- Formats a complete dispatch instruction (objective + scope + the resolved block + acceptance criteria) and writes it to `.claude/artifacts/loop/dispatches/<slice>-<variant>.md`.
- Operator pastes this file's contents into the `Agent` tool invocation.

This command is not required for the architecture to work — operators can run the CLI directly — but it removes one assembly step.

### Classifier removal — `/loop:backlog-enrich` + `src/scripts/lib/classify-parser.mts`

- Remove the architect prompt block that instructs emission of `stack:*` and `surface`.
- Update `buildClassifyUpdates` to stop writing those fields.
- Keep `tags` emission. Tags continue to drive other heuristics (e.g. cost weighting, retro grouping).
- If `tags` becomes the only field written, evaluate whether the architect dispatch is still worth the cost — possibly replace with a regex baseline.

Migration cleanup of historical FEAT frontmatter is out of scope for this design. Stale `stack:*` and `surface` fields are harmless once readers stop consuming them.

## Data flow

### Walking a SaaS slice (preset `dotnet-react`, `split: true`)

```
1. Operator: /crew:orchestrate-slice SLICE-NNN
2. Orchestrator picks FEAT, reads slice file.
3. Orchestrator determines FE + BE dispatch needed.
4a. Orchestrator runs:
    node scripts/loop.mjs resolve-skills \
      --variant fe \
      --preset scripts/presets/dotnet-react.json \
      --override .claude/loop.json
    → stdout:
      {
        "variant": "fe",
        "skills": ["react-engineering", "typescript-pro", "frontend-advisory", "contract-codegen", "a11y-advisory"],
        "source": "preset.fe",
        "dispatchInstructionBlock": "## Required skills (resolved)\n- skills/domain/react-engineering/\n- ..."
      }
4b. Same for --variant be.
5. Orchestrator embeds each block into the dispatch prompt for the matching builder.
6. Agent(subagent_type: crew:builder-fe, prompt: <objective> + <scope> + <block> + <ACs>)
   Agent(subagent_type: crew:builder-be, prompt: <objective> + <scope> + <block> + <ACs>)
7. Builder reads block as Step 0, invokes each skill via Skill tool, then implements.
```

### Walking a plugin slice (preset `typescript-plugin-dev`, `split: false`)

```
1. Operator: /crew:orchestrate-slice SLICE-NNN
2. Orchestrator runs:
   resolve-skills --variant single --preset scripts/presets/typescript-plugin-dev.json
   → { variant: "single", skills: ["typescript-pro", "frontend-advisory"], source: "preset.skills", ... }
3. Orchestrator dispatches a single crew:builder with the block embedded.
4. Builder Step 0 → Skill invocations → implementation.
```

### Walking a fallback case (preset missing the new fields)

```
1. resolve-skills exits 2 (no-match).
2. Orchestrator detects exit 2, dispatches the builder WITHOUT the resolved block.
3. Builder Step 0 sees no block → falls back to baked-in routing tables (today's behavior).
```

### Phase 1 manual flow

Steps 4–5 above run in the operator's terminal. The operator invokes the CLI, copies the JSON's `dispatchInstructionBlock`, and pastes it into the `Agent` tool call. The CLI contract is identical to the eventual Phase 2 orchestrator path.

### Multi-app picture (user's five repos)

- `repo-plugin-A` and `repo-plugin-B` (Claude Code plugins) → `.claude/loop.json` carries `"preset": "typescript-plugin-dev"`. Resolver returns `["typescript-pro", "frontend-advisory"]`.
- `repo-saas-1` (React + .NET + Postgres + OpenAPI) → `"preset": "dotnet-react"`. No overrides needed.
- `repo-saas-2` (variant adding Terraform) → `"preset": "dotnet-react"`, `.claude/loop.json` overrides set `"deployment": "terraform"` and append `"terraform-advisory"` to `be.skills`.
- `repo-saas-3` (variant using GraphQL) → fork preset to `scripts/presets/dotnet-react-graphql.json` with `"contract": "graphql"` and a matching skill list.

One preset family handles three SaaS repos. Per-repo `.claude/loop.json` carries only the deltas.

## Error handling

### Resolver-level errors

| Condition | Detection | Behavior |
|---|---|---|
| Preset file missing | `fs.readFile` throws ENOENT | Exit 1; stderr `error: preset not found at <path>` |
| Preset JSON malformed | `JSON.parse` throws | Exit 1; stderr `error: preset parse failed: <message>` |
| `.claude/loop.json` missing | optional input | Treat as `{}`; continue |
| `.claude/loop.json` malformed | `JSON.parse` throws | Exit 1; stderr — never silently swallowed |
| Missing or unsupported `schemaVersion` | post-load check | Exit 1; stderr `error: unsupported preset schemaVersion <n>; loop plugin may be too old` |
| `split: true` + variant `single` | schema mismatch | Exit 2; stderr warn |
| `split: false` + variant `fe` or `be` | schema mismatch | Exit 2; stderr warn |
| Resolved `skills` empty | post-merge check | Exit 2; stderr warn |
| Unknown skill ID with `--strict` | post-merge check | Exit 1 |
| Unknown skill ID without `--strict` | post-merge check | Warn on stderr; continue |

The three exit codes (`0`, `1`, `2`) give callers clean branching without parsing stderr.

### Orchestrator and operator-level errors

- Exit 2 from CLI → orchestrator dispatches the builder without the resolved block. The builder's Step 0 sees no block and falls back to the baked-in routing tables. The slice continues. The orchestrator logs an info line: `skill-resolver returned no-match for variant=<x>; builder falls back to legacy routing`.
- Exit 1 from CLI → orchestrator halts dispatch, emits an `escalated_to_human` workflow badge with the captured stderr. The slice pauses. The operator fixes the preset or override JSON and re-runs.

### Builder-level errors

- Block present but a skill ID is unknown to the `Skill` tool → builder logs `warn: skill <id> not found, continuing`. The builder does NOT abort. Other resolved skills still load.
- All skill IDs unknown → builder records an artifact `skill-resolution-empty`, falls back to its routing tables, and continues. The reviewer flags the slice as an anomaly so the preset can be corrected.

### No silent failures

The resolver and Step 0 never swallow errors that prevent skill loading. Every fallback is logged. Every malformed input halts. The operator always knows when defaults vs preset are in effect.

## Testing

### Unit tests — `src/tests/skill-resolver.test.mts`

| Test | Input | Expected |
|---|---|---|
| Resolves split=true fe variant | preset with `fe.skills:[react-engineering, typescript-pro]` | `{ variant: 'fe', source: 'preset.fe' }` |
| Resolves split=true be variant | same preset, variant `be` | be loadout |
| Resolves split=false single variant | preset with top-level `skills` | `{ source: 'preset.skills' }` |
| Returns null on split mismatch fe | `split:false`, variant `fe` | `null` |
| Returns null on split mismatch single | `split:true`, variant `single` | `null` |
| Returns null on empty skills array | `fe.skills: []` | `null` |
| Override appends to preset skills | preset `be.skills:[a,b]`, override `be.skills:[c]` | concat-dedup → `[a,b,c]` |
| Override replaces with $replace marker | override `be.skills: { $replace: [x] }` | `[x]` |
| Throws on malformed preset JSON | invalid JSON | throws `SchemaError` |
| Throws on missing schemaVersion | preset without version | throws `SchemaError` |
| Throws on unsupported schemaVersion | `schemaVersion: 99` | throws `SchemaError` |
| Renders dispatchInstructionBlock | any valid resolve | block starts with `## Required skills (resolved)`, contains all skill IDs as bullets |
| Deep-merge preserves untouched fields | override only sets `frontend.framework` | other fields untouched |

Roughly thirteen tests, ESM, `node --test`, colocated at `src/tests/skill-resolver.test.mts`, built to `tests/skill-resolver.test.mjs`.

### CLI integration tests — `src/tests/cli-resolve-skills.test.mts`

Shell out to `node scripts/loop.mjs resolve-skills`. Coverage:

- Exit 0 and JSON to stdout on happy path
- Exit 1 on missing preset file
- Exit 1 on malformed `.claude/loop.json`
- Exit 2 on split mismatch
- `--strict` flag escalates unknown skill IDs from warn to exit 1
- `--variant fe --preset <path>` reads the correct block

Roughly six tests.

### Preset schema validation — `scripts/validate-manifests.mjs`

Extend the existing manifest validator to validate every `scripts/presets/*.json` against the new schema. Fails CI if a preset omits `schemaVersion`, carries both `skills` and `fe`/`be` blocks, or declares an unknown `projectType`.

### Classifier removal tests

`src/tests/classify-parser.test.mts` — remove asserts that check `stack:*` and `surface` emission. Add asserts that those fields are NOT written. Keep `tags` emission.

### Builder agent prompt tests (Phase 2, upstream)

`tests/builder-fe-prompt.test.mjs` and `tests/builder-be-prompt.test.mjs` in `hero-crew` — add an assertion that the prompt contains a `Step 0 — Resolve skills` block. The upstream PR ships the prompt edit and the test together.

### Manual smoke

For each preset (`dotnet-aspire-python`, `python-only`, `dotnet-react`, `dotnet-vue`, `typescript-plugin-dev`, `dotnet-only`):

1. Add `schemaVersion`, `projectType`, `split`, `skills` or `fe.skills` + `be.skills`.
2. Run `node scripts/loop.mjs resolve-skills --variant <each>` against it.
3. Assert exit 0, block contains the expected skill IDs.
4. Capture output in `.claude/artifacts/loop/smoke/skill-resolver-<preset>.json`.

Smoke is operator-run, not CI, but the artifacts are reviewed before the Phase 1 slice merges.

### No flaky surfaces

The resolver is pure. The CLI is a thin wrapper. No network, no clock, no FS writes (only reads). All tests are deterministic, parallelizable, and fast (target under two seconds for the full suite).

## Rollout phases

| Phase | Scope | Blocked on |
|---|---|---|
| 1 | Preset schema extension, resolver module, CLI subcommand, manifest validator update, classifier removal, optional `/loop:dispatch-builder` convenience. | Nothing — ships loop-only. |
| 2 | `/crew:orchestrate-slice` reads the same CLI; operator hop disappears; orchestrator emits resolved blocks automatically. | `hero-crew` upstream PR per `docs/upstream-requests/2026-06-07-...`. |
| 3 | Delete baked-in routing tables from builder agents; preset becomes the sole source of skill loadout. | Phase 2 stable in production for at least one release cycle. |

## Open questions

- Skill ID vocabulary: do we lint against a known list or treat as opaque strings? Current decision is opaque + `--strict` escalation for early adopters. Revisit if drift becomes a problem.
- Whether `/loop:backlog-enrich` should still dispatch the architect after `stack:*` and `surface` are removed. The architect still writes `tags`, `needs_contract`, and `needs_ux` — those may justify the dispatch on their own. Decide during implementation by measuring the remaining classification load.
- Multi-preset repos (e.g. a monorepo with a TS plugin and a C# service side-by-side) are out of scope here. If they come up, the design extends naturally: per-workspace `.claude/loop.json` with a `presetPath` override.
