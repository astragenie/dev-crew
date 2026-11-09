# docs/ — map

One-screen guide to what lives where. Check here before adding a new
top-level `docs/` folder.

| Dir / file | What goes here | Naming |
|---|---|---|
| `memory.md` | Durable-facts index (load-bearing CLAUDE.md contracts, path drift, command history, dogfood metrics) — supersede in place | — |
| `ci-gates.md` | Full per-gate CI rationale; the short numbered list in `CLAUDE.md` § "CI gates" is machine-counted (`generate-metrics-band.mts`) and must stay in sync with this file's numbering | — |
| `halt-badges.md` | Registry of every halt-badge field the loop emits in `snapshot.*` (cross-plugin contract, SPEC-003) | — |
| `code-conventions.md` | ESM / Node conventions, authoritative for this repo | — |
| `state-contract.md` | Workflow-state shape contract | — |
| `task-store.md` | Task-store persistence contract | — |
| `ci-fast-path.md` | Fast-path CI notes | — |
| `session-2026-06-12.md`, `cleanup-audit-2026-06-11.md` | One-off dated session/audit notes | `YYYY-MM-DD-slug.md` |
| `decisions/` | Lightweight decision log (`DEC-NNN`) for calls too small for a full ADR | `DEC-NNN-slug.md`, copy `decision-template.md` |
| `sop/` | Standing operating procedures (memory bridge wire contract, specialist-pause handling, release version bump, JSONL ledger merge driver) | descriptive kebab-case |
| `audits/` | Point-in-time audit + wave-plan docs | `YYYY-MM-DD-slug.md` |
| `conventions/` | Report-filename conventions | descriptive kebab-case |
| `integrations/` | Cross-system integration notes (GitHub PR comment teammate, Linear teammate, memory integration) | descriptive kebab-case |
| `research/` | Competitor audits, platform positioning, architecture retrospectives | `YYYY-MM-DD-slug.md` or dated subdir |
| `specs/` | Templates for ADR/PRD/research/SRE/user-journey docs | `*-template.md` |
| `superpowers/{plans,specs}/` | Superpowers-skill-generated plans/specs (separate tool from `decisions/`, same "dated doc" shape) | `YYYY-MM-DD-slug.md` |
| `demo/` | Demo scripts (e.g. QA-gate demo) | descriptive kebab-case |
| `grades/` | Slice-grade template + README | — |
| `prompts/` | Standalone reusable prompts | `YYYY-MM-DD-slug-prompt.md` |
| `upstream-requests/` | Open requests filed against sibling plugins (`dev-team`/`crew`, `astramem-plugin`) — see `memory.md` "Open upstream requests"; `archive/` holds resolved/superseded ones | `YYYY-MM-DD-<target-plugin>-slug.md` |
| `ai-loop/`, `backlog/` | **Legacy/stale** — pre-dates the `.claude/artifacts/loop/{ai-loop,backlog}` path migration (last touched 2026-06-09/12). The live equivalents are under `.claude/`, driven by `.claude/loop.json`'s `aiLoopRoot`/`backlogPath`. See `memory.md` "Known path drift" — flagged as delete-candidates, not yet removed (operator call, not this audit's scope) |

## Merged-repo docs disposition (SLICE-25, 2026-08-19)

`crew/docs/**` (123 files: `architecture/`, `backlog/`, `contracts/`,
`decisions/`, `design/`, `diagnostics/`, `grades/`, `investigations/`,
`observability/`, `operations/`, `process/`, `prompts/`, `research/`,
`retrospectives/`, `specs/`, `standards/`, `superpowers/`) is the
pre-merge `crew`/`dev-team` plugin's own docs tree, vendored as part of
the `crew/` rump — **DEFERRED, not migrated by this slice.** Reason: bulk
content-relevant migration (architecture decisions, contracts) is out of
this 1-effort-point slice's budget; the map here just needs to be honest
about where things live today. Until a follow-up FEAT does the move,
`crew/docs/**` is the live reference for pre-merge `crew` design history —
read it in place rather than assuming it was ported into this `docs/`
tree. `crew/CLAUDE.md` (the rump's own root doc, still scanned by
`validate-agent-refs.mts`'s `SCAN_FILES`) is likewise untouched by this
slice.

## What's NOT here

`templates/`, `commands/`, `skills/`, `agents/` (excl. `3rdparty/` vendored
copies) live at repo root, not under `docs/` — they're install-time /
runtime plugin surface consumed by adopter repos and by Claude Code's plugin
loader, not reference documentation. See `AGENTS.md` § Structure.
- `handover-2026-11-09.md` — where things stand after v1.2.0: state, how to run the loop, known sharp edges, release steps. Start here if you are new to the repo.
