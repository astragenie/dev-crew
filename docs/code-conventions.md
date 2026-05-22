# Code Conventions — autonomous-loop

This plugin follows the same conventions as the companion `crew`
plugin. The canonical reference is
[`hero-crew/docs/code-conventions.md`](https://github.com/sergeymilashico/hero-crew/blob/main/docs/code-conventions.md).

Adapted from `Astragenie.Standards/docs/typescript/coding-conventions.md`
for plain Node ESM (`.mjs`).

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
  `scripts/autonomous-loop.mjs`.
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
