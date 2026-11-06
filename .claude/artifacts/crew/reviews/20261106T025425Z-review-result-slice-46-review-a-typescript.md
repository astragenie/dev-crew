---
findings: "[MINOR] src/scripts/validate-repo-boundary.mts:259-262 (readHooksJson) — pre-existing, not introduced by this slice: readHooksJson has no try/catch around readFile/JSON.parse. If hooks/hooks.json is missing or malformed, checkInventoryDrift (and the --write-inventory path) throws an unhandled rejection instead of the clean `{ ok: false, detail: ... }` shape the rest of the module uses, so the CLI would exit with a raw stack trace rather than the \"Repo-boundary violations:\" message. This behavior is identical before and after the rename (only the constant's value changed), so it is not a regression from this commit, and the new discovery test already guards the actual failure mode this slice cares about (file at the wrong path). Fix (optional, separate slice): wrap the readFile/JSON.parse in readHooksJson with a try/catch that returns `{ ok: false, detail: \"hooks/hooks.json is missing or invalid JSON\" }` instead of letting the exception propagate.\n\n[INFO] src/tests/wave/touches-files.test.mts:128,135,199 — still contains the literal string \".claude-plugin/hooks/hooks.json\". Confirmed this is intentional and correct to leave alone: it's SLICE-203 fixture data reproducing a historical `touches_files` inline-array parsing bug, not a path the code under test resolves or loads. Changing it to the new path would not change what the test proves and would make it harder to tell why that exact string was chosen (it's quoting the bug report, not describing current file layout). No action needed.\n\n[INFO] Repo-wide check confirms no other shipped-surface literal of the old path (commands/, skills/, agents/, templates/, src/, hooks/, .claude-plugin/, crew/) and no `hooks` key in .claude-plugin/plugin.json — matches what the new test asserts.\n\n[INFO] docs/planning/hooksjson-crew-path-inventory.json is unchanged (0 diff), as expected: its content is derived from hooks.json's contents, not its path, and the rename didn't touch content.\n\nNo TypeScript correctness issues (`.mjs` specifier rule not applicable — no relative imports in the new test file; no `process.exit`; biome lint clean on both touched .mts files; 13/13 tests pass on re-run)."
decision: approved
---
# Review Result: SLICE-46 review A (typescript)

- Created: 2026-11-06T02:54:25.756Z
- Reviewer: typescript-reviewer
- Decision: approved
- Summary: SLICE-46 (FEAT-033) TypeScript review — commit ae411639, scope ec0e0de8..ae411639.

The change is a clean one-line-constant rename plus a genuine regression
test, not a cosmetic move. `HOOKS_JSON_REL` in
`src/scripts/validate-repo-boundary.mts` moved from
`.claude-plugin/hooks/hooks.json` to `hooks/hooks.json` and is the single
source of truth the module reads from (`readHooksJson` -> used by both
`checkInventoryDrift` and `writeInventory`); there is no stray literal of
the old path left in the validator. The existing inventory-drift test
(`src/tests/validate-repo-boundary.test.mts`) was updated to write its
fixture at the new path, and it is a real round trip (writes a fixture
hooks.json, asserts drift detection, regenerates, asserts clean) — not a
tautology.

The new `src/tests/install/hooks-discovery.test.mts` is hermetic (resolves
the repo root via `import.meta.url`, no cwd assumption, read-only) and
would genuinely fail on a regression: moving the file back to
`.claude-plugin/hooks/hooks.json` fails both the "exists at new path" and
the "does not exist at old path" assertions, and adding a `hooks` key to
`.claude-plugin/plugin.json` fails the third test. Verified by re-running
both test files (13 pass, 0 fail) and biome lint on both touched `.mts`
files (clean).

Repo-wide grep for the old literal path, scoped to shipped surfaces
(`commands/`, `skills/`, `agents/`, `templates/`, `src/`, `hooks/`,
`.claude-plugin/`, `crew/`), turns up only the validator's own doc-comment
(describing the dead path, by design), the new test's doc-comment/negative
assertion (by design), and `src/tests/wave/touches-files.test.mts`. The
latter is unrelated: it's a SLICE-203 fixture reproducing a *parser*
regression (`touches_files` inline-array parsing), using
`.claude-plugin/hooks/hooks.json` only as an arbitrary literal string in
test data, not as a path the code resolves or loads. Leaving it untouched
is the right call — changing it would not test anything different and
would blur why that fixture string exists.

Confirmed only one `hooks.json` exists repo-wide outside the vendored
`crew/` rump (at `hooks/hooks.json`), and `.claude-plugin/plugin.json` has
no `hooks` key, matching the new test's assertions and the module's
contract. The git rename itself is byte-identical (`{.claude-plugin/hooks
=> hooks}/hooks.json | 0` in the diffstat), and
`docs/planning/hooksjson-crew-path-inventory.json` is untouched, as
expected since the inventory's content is derived from file contents, not
its path.

No TypeScript correctness issues found: the `.mjs` specifier rule doesn't
apply (no relative imports in the new test file), no `process.exit`
usage, both files pass `bunx biome lint`, cognitive complexity is low in
both.

One minor, pre-existing (not introduced by this slice) robustness gap
noted under findings — not a blocker.
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: builder gates rc=0: validate-repo-boundary, manifests, agent-refs, content-length, metrics-band --check, bun test (24 pass), typecheck, lint, format:check
- Risks: -
- Required Follow-up: -

