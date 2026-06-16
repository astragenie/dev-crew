# Code Conventions — loop

This plugin follows the same conventions as the companion `crew`
plugin. The canonical reference is
[`hero-crew/docs/standards/code-conventions.md`](https://github.com/astragenie/dev-team/blob/main/docs/standards/code-conventions.md).

Mirrors
[`Astragenie.Standards/docs/javascript/coding-conventions.md`](https://github.com/sergeymilashico/Astragenie.Standards/blob/main/docs/javascript/coding-conventions.md)
when that repo is installed at a sibling path; otherwise self-contained.
The Standards repo is provenance + cross-team alignment, not a runtime
dependency.

## Lint and format

Both enforced by CI:

- `eslint.config.mjs` — flat config. `no-var`, `prefer-const`,
  `eqeqeq` (smart), `no-implicit-globals`, function-size and
  complexity budgets.
- `.prettierrc.json` — 2-space, double-quote, `trailingComma: "none"`,
  `printWidth: 100`.

## Module shape

- ESM only. One responsibility per module. Split at ~400 lines or
  when two clearly separable concerns merge.
- Public API lives in the top-level module (`scripts/lib/foo.mjs`).
  Internal helpers live in `scripts/lib/foo/<concern>.mjs`. Example:
  `slice-linker.mjs` keeps the public `sliceFromFeature` /
  `completeSlice` surface; `slice-linker/crew-bridge.mjs` carries the
  best-effort crew CLI emission.

## CLI

- Subcommand dispatch via `COMMANDS` registry in
  `scripts/loop.mjs`.
- Flag parsing via `FLAG_SPEC` table.
- Per-command lazy `await import("./lib/...")` keeps startup fast
  when a single subcommand runs.

## Error handling

- Throw for programmer errors (unknown command, missing required arg).
- Return `{ ok, error }` (or capture in `try` / set a `null` default)
  for soft / best-effort failures that should not break the surrounding
  operation. The slice-linker `crew-bridge` calls are the reference
  example: missing crew CLI is a soft no-op.
- Never `process.exit(N)` from a library. Set `process.exitCode = N`
  from the entry-point script after printing.

## Hard dependency on `crew`

This plugin requires `crew >= MIN_CREW_VERSION`
(`scripts/lib/plugin-identity.mjs`). The version gate runs at install
time. Bump `MIN_CREW_VERSION` only when this plugin starts using a
crew CLI surface that older versions do not expose.

## Tests

- One behavior per `test()`. Behavior-describing file names —
  never release-version-prefixed names.
- File-system tests use `fs.mkdtemp(path.join(os.tmpdir(), ...))`
  for isolation.
- Tests that exercise the crew CLI bridge skip with a clear reason
  when the local cache crew version is below `MIN_CREW_VERSION`;
  they do not fail. See `tests/loop-installer.test.mjs`.

## Evidence-before-claims convention

Before any completion claim ("tests pass", "lint clean", "build green",
"bug fixed", "feature works", "deploy succeeded"), an agent must run
the corresponding verification command in the current turn and post
the full output. Assertions from memory or prior turns are prohibited.
See [`skills/verification-before-completion/SKILL.md`](../skills/verification-before-completion/SKILL.md)
for the canonical claim→evidence lookup table and Iron Law block.

## HARD-GATE tag convention

Skill Markdown files use two XML tag levels to signal enforcement severity.
Use `<HARD-GATE>...</HARD-GATE>` for absolute prohibitions and
non-negotiable rules — things where a violation breaks the loop workflow
entirely (for example: stopping mid-slice without evidence, omitting a
required slice field, or bypassing the phase-gate ceremony). Use
`<EXTREMELY-IMPORTANT>...</EXTREMELY-IMPORTANT>` for strong warnings and
high-severity guidance where a violation is very bad but does not
completely break the workflow (for example: evidence quality standards,
artifact naming conventions, or recommended sequencing that may have
acceptable exceptions in extreme edge cases). Every hard rule block that
an autonomous agent MUST obey unconditionally belongs inside `<HARD-GATE>`
tags; strong-but-soft guidance that an agent should almost always follow
but that admits rare exceptions belongs inside `<EXTREMELY-IMPORTANT>` tags.

## Skill files

Skills live under `skills/**/SKILL.md`. Each file carries a YAML frontmatter
block with the following fields.

### Required fields

- `name` — unique skill identifier (string)
- `description` — one-line human-readable description (string)

### Optional fields

- `trigger` — one of `always_on` (default), `glob`, `manual`, `model_decision`
- `globs` — array of glob patterns (required when `trigger: glob`)
- `keywords` — array of keyword strings

### `keywords` field

Skills may declare `keywords: [word1, word2]` in their SKILL.md frontmatter.
When present (and when the keyword-triggered dispatch scanner ships in a later
release), these keywords will auto-activate the skill when any keyword appears
in the dispatch prompt. For now, the field is schema-validated but inert.

`validate-manifests.mts` enforces that when `keywords` is present it must be
an array of strings. A plain string value (e.g. `keywords: kubernetes`) is
rejected with a clear error message.

## GitHub sync frontmatter fields

Added by `/loop:publish`; null/absent means unpublished. Do not set manually.

**FEAT files:**

```yaml
github_issue: 42       # GitHub issue number (integer)
github_milestone: 3    # GitHub milestone number (integer)
```

**SLICE files:**

```yaml
github_issue: 87       # GitHub native sub-issue number (integer)
```

These fields are written back by `scripts/lib/github-sync.mjs`. The sync
module is opt-in via `"github": { "enabled": true }` in `.claude/loop.json`.
