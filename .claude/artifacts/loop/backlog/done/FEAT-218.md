---
id: FEAT-218
status: done
priority: P1
category: architecture
target_release: null
created: 2026-07-03
updated: 2026-07-06
depends_on: []
slices: []
derived_from: null
tags: [tooling, architecture, backend, config]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: null
triage_notes: "Operator-requested. Analyze what the preset layer actually buys us, then remove it completely — fold its defaults into per-repo .claude/loop.json (and/or the installer) so there is a single source of stack config. Structural, cross-cutting, contract-changing → NOT autonomous_safe; human-in-the-loop on review. Analysis slice MUST land before any deletion slice."
---
# FEAT-218: analyze the preset layer, then remove it completely

## Origin

Operator request. The preset layer (`scripts/presets/*.json` + `config-resolver`
deep-merge) is the default-config tier that sits under per-repo
`.claude/loop.json`. It has grown to 6 files with overlapping content and a
resolver whose default (`dotnet-python`) is wrong for most repos. Operator wants
it analyzed and then eliminated so there is **one** source of stack/loop config
per repo, not a preset-name indirection plus an override file.

## Phase 1 — analysis (deliverable, no deletion)

Produce a written analysis (`docs/research/2026-07-03-preset-removal.md`) covering:

1. **What presets provide today** — enumerate every field a preset supplies:
   `loop.*` paths, `stack.build/test/frontendBuild/…`, `reviewers.ladder`,
   `mandatoryDocs`, `productName/Description`, `stackDescription`,
   split `fe/be` skills vs single `skills`, `roles.*` skills.
2. **Every consumer** — `config-resolver.mts` (`listPresets`, `loadPreset`,
   `resolveConfig` default), `loop-installer.mts`, `phase-gate`,
   `resolve-skills --variant`, `commands/list-presets.md`,
   `commands/install.md --preset`, `preset-schema.mts` (`validatePreset`),
   plus the ~30 tests keyed on a preset name.
3. **What breaks if presets vanish** — the skill-injection contract
   (builder-dispatch reads `preset.roles.<role>.skills` / `fe|be.skills`);
   `--variant fe|be|single` resolution; the "install with one flag" UX.
4. **Migration path** — recommended: `/runner:install --preset X` becomes a
   one-time *scaffolder* that writes a fully-populated `.claude/loop.json`
   (today's preset content inlined), after which the preset file is never read
   again; then delete `scripts/presets/` + the resolver's preset merge. Compare
   against alternatives (keep presets, or ship a single hardcoded default).

## Phase 2 — removal (gated on Phase 1 acceptance)

Execute the migration path chosen in Phase 1. Expected shape:

- Installer inlines the selected stack template into `.claude/loop.json` at
  install time (self-contained; no runtime preset read).
- `resolveConfig` drops the preset load/merge and the `dotnet-python` default;
  it reads `.claude/loop.json` directly (with a small hardcoded skeleton for
  absent keys, or errors clearly if unconfigured).
- `validatePreset` / `preset-schema.mts` retired or repurposed to validate
  `.claude/loop.json` instead.
- `scripts/presets/*.json`, `list-presets` command, and `--preset` flag
  removed **or** demoted to install-time templates only (decide in Phase 1).
- Tests migrated off preset-name literals onto inline config fixtures.
- Docs (README, install.md, CLAUDE.md preset paragraph) updated.

## Acceptance criteria

- AC-1: Phase 1 analysis doc lists every preset field, every consumer
  (file:line), and a chosen migration path with rationale — reviewed and
  accepted before any Phase 2 deletion.
- AC-2: After Phase 2, `grep -rn "scripts/presets" src commands` returns zero
  runtime reads (matches only in retired/template code or history).
- AC-3: A freshly installed repo produces a self-contained `.claude/loop.json`
  that drives phase-gate build/test + builder skill injection with **no**
  preset file present on disk.
- AC-4: The builder-dispatch skill-injection contract is preserved — resolved
  skills for a given repo are identical before and after removal (golden test).
- AC-5: `resolveConfig` no longer references a hardcoded `dotnet-python`
  default; unconfigured repos get a clear error or a documented minimal
  skeleton, not a silent wrong-stack default.
- AC-6: Full suite green; typecheck + lint + validate-manifests clean; snapshot
  freshness gate passes.
- AC-7: A DEC-* record captures the removal decision and the migration path.

## Risks / open questions

- Skill-injection is a **cross-plugin contract** (crew reads the resolved
  skills). Removing presets must not change the resolved-skills payload — hence
  the golden test (AC-4). Confirm no hero-crew code reads `scripts/presets/`
  directly before deleting.
- `--variant fe|be|single` semantics depend on `split` + `fe/be` vs `skills`.
  The replacement config must preserve that distinction.
- Decide whether `--preset` survives as an install-time template selector
  (recommended, low-cost) or is removed outright (higher UX cost).

## Refs

- `src/scripts/lib/config-resolver.mts` (preset load + deep-merge + default).
- `src/scripts/lib/preset-schema.mts` (`validatePreset`).
- `scripts/presets/*.json` (6 presets after the 2026-07-03 roster refresh).
- `commands/list-presets.md`, `commands/install.md`.
- CLAUDE.md § "Backlog discipline" (preset = sole stack-identity source today).
