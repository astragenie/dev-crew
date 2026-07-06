---
filed: 2026-07-06
target_plugin: hero-crew
target_repo: astragenie/dev-team
status: open
loop_tracking_feat: FEAT-218
loop_related_decision: .claude/artifacts/loop/decisions/DEC-069.md
loop_related_research: docs/research/2026-07-06-preset-removal.md
resolved: null
resolved_by: null
---

# Upstream-request: repoint `/crew:orchestrate-slice` Step 2.5 at `.claude/loop.json` instead of `scripts/presets/<name>.json`

## Filed against

- **Plugin:** hero-crew (`astra/crew/<version>`)
- **Surface:** `commands/orchestrate-slice.md` Step 2.5 (skill-injection block, lines ~139–162 as of this filing)
- **Reason:** loop's FEAT-218 Phase 2 (DEC-069) demoted `scripts/presets/*.json` to install-time-only templates. `resolveConfig` no longer reads them at runtime — a repo's `.claude/loop.json` is now the sole, fully self-contained source of stack/skill config after install. `orchestrate-slice.md` still constructs a hardcoded path into the loop plugin's own install directory to resolve builder skills, which is the one remaining coupling this migration didn't (and couldn't, from the loop side alone) fix.

## Problem

`commands/orchestrate-slice.md` Step 2.5 does (paraphrased from the loop-side Phase 1 analysis, `docs/research/2026-07-06-preset-removal.md` §3a):

```bash
PRESET_NAME=$(grep -oP '"preset"\s*:\s*"\K[^"]+' .claude/loop.json 2>/dev/null)
...
node "${LOOP_ROOT}/scripts/loop.mts" resolve-skills \
  --variant fe \
  --preset "${LOOP_ROOT}/scripts/presets/${PRESET_NAME}.json" \
  --override .claude/loop.json
```

This greps the consuming repo's `.claude/loop.json` for a `preset` field, then builds a path into `scripts/presets/${PRESET_NAME}.json` **inside the loop plugin's own install cache directory**, and resolves skills from that file with the repo's `.claude/loop.json` layered on top via `--override`.

This still works today because `scripts/presets/*.json` remain on disk (loop's DEC-069 explicitly kept them as install-time templates rather than deleting them — see "Alternatives considered and rejected" in the research doc). But it is fragile and increasingly stale:

- It re-derives, via a hardcoded path + `--override` merge, something `/runner:install` already computed once and inlined into `.claude/loop.json` at install time. The two sources can drift (e.g. a repo's `.claude/loop.json.skills` array is hand-edited post-install; `--override` semantics mean the union isn't obviously predictable without reading both files).
- `.claude/loop.json`'s `preset` field is purely informational now (a label copied over at scaffold time) — nothing else in loop reads it to make a decision. Depending on it for path construction is depending on a field that could be removed or made optional in a future loop release without anyone noticing dev-team still parses it with a regex.
- No fallback if `scripts/presets/${PRESET_NAME}.json` is missing or the preset name is stale relative to the installed loop version — the call just fails, degrading silently to "no skill block" per `orchestrate-slice.md:166-171`.

## Ask

Change Step 2.5 to resolve skills directly from the repo's own config, since it is already self-contained post-install:

```bash
node "${LOOP_ROOT}/scripts/loop.mts" resolve-skills \
  --variant fe \
  --preset .claude/loop.json
```

Notes for whoever picks this up:

- Drop `--override .claude/loop.json` — there is nothing left to layer on top of it; the repo's own config **is** the fully-resolved config now.
- `resolve-skills`'s CLI shape is unchanged (`--preset <path> --variant <fe|be|single|pm|researcher|architect|document-writer>`); only the path argument changes. No loop-side code change is required to support this — `skill-resolver.mts::resolveSkills` already accepts any JSON file matching the `PresetV1` shape, and an installer-inlined `.claude/loop.json` satisfies that shape today (verified by loop's AC-4 golden test, `src/tests/skill-resolution-golden.test.mts`, which asserts resolved skills are byte-identical whether the source file is a named template or an installed repo's own config).
- Recommended transition: try `.claude/loop.json` first; fall back to the current `scripts/presets/${PRESET_NAME}.json` path only if `.claude/loop.json` resolves to `null`/error, to cover repos that installed loop before FEAT-218 landed and haven't re-run `/runner:install` to backfill the `skills`/`fe`/`be`/`roles` fields (see DEC-069's "Known gap" consequence). Drop the fallback once a reasonable migration window has passed.

## Loop-side state (already shipped as of this filing)

- `scripts/presets/*.json` (6 files) remain on disk, unchanged in shape — this request does not require any loop-side file moves.
- `/runner:install --preset <name>` inlines a template's full content (`loop.*`, `stack.*`, `reviewers`, `mandatoryDocs`, `productName`/`productDescription`, `stackDescription`, `skills`/`fe`/`be`, `roles.*`) into `.claude/loop.json` at scaffold time (`src/scripts/lib/loop-installer.mts::installLoop`).
- `config-resolver.mts::resolveConfig` no longer merges a preset at runtime; it reads `.claude/loop.json` directly (errors clearly if absent).
- No loop-side blocker remains for this request — it is purely a dev-team-side edit to one Bash step in one command markdown file.
