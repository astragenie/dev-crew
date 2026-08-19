# ADR — TS6-vs-TS7 compiler-API landmine (FEAT-014 SLICE-1)

Status: **decided**. Source: `.claude/artifacts/loop/backlog/triaged/FEAT-014.md`
§ Architect note (3 options sketched there; this ADR resolves them with evidence).

## Context

`crew/package.json:12` pins `"typescript": "^6.0.3"`; root `package.json:28`
pins `"typescript": "^7.0.0"`. `crew/tsconfig.json:5` sets
`moduleResolution: "Bundler"` against root's `"NodeNext"`. FEAT-014 wants one
root `package.json`/`bun.lock` and one tsconfig strategy for the 287-file
`crew/` tree. The forcing function is `crew/scripts/validate-contracts.mts:16`:
`import openapiTS, { astToString } from "openapi-typescript"`, used at
`validate-contracts.mts:96-99` (`generateTs`) as exactly two calls:
`openapiTS(doc)` → AST, `astToString(ast)` → string. Coupling to
openapi-typescript's own surface is narrow (2 named exports, 1 call each);
the risk is entirely in what those two calls depend on internally.

## Evidence gathered

- **openapi-typescript genuinely needs the classic TS compiler API at
  runtime**, not just at its own build time. `crew/node_modules/openapi-typescript/dist/lib/ts.mjs:2`:
  `import ts from 'typescript'`, then live calls
  `ts.factory.createKeywordTypeNode(...)`, `ts.SyntaxKind.BooleanKeyword`,
  `ts.factory.createToken(...)` etc. — the AST-node-factory surface, not the
  full `ts.createProgram`/type-checker surface my earlier architect note
  guessed at. `openapi-typescript`'s own `package.json` (`crew/node_modules/openapi-typescript/package.json`)
  declares `peerDependencies.typescript: "^5.x"` and only vendors
  `typescript@^5.9.3` as a **devDependency for its own build** — the runtime
  import is a real peer resolution against whatever `typescript` package the
  consuming repo has installed (crew's `^6.0.3`, one minor above stated peer
  range but functionally compatible — factory/SyntaxKind are stable 5.x→6.x).
- **Root's typescript@7.0.2 cannot serve that import today — verified, not
  assumed.** `node_modules/typescript/package.json`'s `"exports"` field: the
  bare `"."` entry resolves to `"./lib/version.cjs"` (a version string
  module) **only** — there is no `lib/typescript.js`-style classic compiler
  API export at all in the 7.x package shape. A new, explicitly-named
  `"./unstable/ast/factory"` subpath exists (`→ ./dist/ast/factory.generated.js`),
  but it's a different import path under an `unstable/` namespace — nothing
  in the currently-installed `openapi-typescript@7.13.0` dist targets it,
  and there is no CHANGELOG/README mention (searched both, zero hits) of
  any openapi-typescript release adopting it. `import ts from 'typescript'`
  under root's TS7 resolves to an object with no `.factory` property — the
  code in `ts.mjs` above would throw immediately.
- **Option 2's most obvious zero-new-tool path is closed.** `@redocly/cli`
  is already a `crew/package.json:8` dependency (`^1.34.15`) and its `--help`
  command list — `stats, split, join, push, lint, bundle, check-config,
  login, logout, preview, preview-docs, build-docs, translate, eject` — has
  **no type-generation command**. `validate-contracts.mts` already uses it
  only for `redocly lint` (line ~20-29). Swapping openapi-typescript for
  redocly is not an option; it would require adopting an entirely
  unresearched third-party tool, which is genuinely new-tool risk, not a
  drop-in.
- **Option 3 (bunx --package typescript@6) has no precedent in this repo**
  (`grep -rn "bunx --package"` across `.github/`, `crew/scripts/`, `docs/` —
  zero hits) and conflicts with this repo's own reproducibility convention:
  every install step in `.github/workflows/ci.yml` uses
  `bun install --frozen-lockfile` (root and `crew/`, e.g. lines 187-188,
  281-282). `bunx --package` resolves against the registry **outside** the
  lockfile at invocation time — an unpinned `^6` could silently pick up a
  new patch release between CI runs, which is a direct threat to
  `validate-contracts.mts`'s own drift check (`opts.checkDrift`, lines
  70-83), whose entire purpose is byte-identical regenerated-output
  stability. This option would undermine the exact gate it feeds. The
  self-hosted runner (persistent cache, registry-reachable per `.npmrc` +
  every `bun install` step) makes it *technically* workable, but the
  reproducibility cost is self-inflicted and avoidable.

## Decision

**Option 1 — keep `typescript@^6.0.3` as a scoped devDependency**, confined
to whichever package/workspace boundary ends up owning
`validate-contracts.mts` after the SLICE-2 package.json merge. This is not
merely lowest-risk; the evidence above shows it is **the only currently
working option** — TS7 cannot serve the runtime import as published, and
neither alternative tool path (redocly, unpinned bunx) is viable without
either unresearched tool adoption or breaking an existing gate's own
guarantee.

## Consequences

- Two `typescript` versions persist in this repo indefinitely (or until
  openapi-typescript ships a verified TS7-`unstable/ast`-based release —
  re-evaluate this ADR if that happens). This is an intentional, documented
  exception, not unresolved drift.
- `bunx tsc --project tsconfig.json --noEmit` / `--project crew/tsconfig.json --noEmit`
  (both already separate `bun-commands:` entries in `ci.yml:163-165`) keep
  running against their own resolved `typescript`, unaffected.
- Redefines what FEAT-014's own AC-2 ("a single lockfile resolves for the
  whole repo with no version conflicts left unresolved") must mean under
  this decision: **not** one resolved `typescript` version repo-wide, but
  one `bun.lock` containing **two intentionally-pinned, workspace-scoped
  `typescript` entries** (root `^7.0.0`, contracts-tooling `^6.0.3`),
  verified via a package-manager query (e.g. `bun pm ls typescript`)
  showing exactly two resolved versions — both named, both tested, neither
  accidental. SLICE-2's acceptance evidence must show this query's output,
  not a single-version grep.

## Migration steps for FEAT-014's remaining slices

1. **SLICE-2** (merge crew-only deps into root `package.json`/`bun.lock`):
   `crew/` must remain (or become) a genuine Bun workspace member with its
   own `package.json` declaring `typescript: "^6.0.3"` as a devDependency —
   a flat single-manifest merge cannot hold two versions of the same
   top-level dependency name. Document this as the one deliberate exception
   in SLICE-2's own handoff, citing this ADR.
2. **SLICE-3** (unify `moduleResolution`): `crew/tsconfig.json`'s
   `Bundler`→`NodeNext` migration is independent of the TS-version split —
   proceed as scoped; `openapi-typescript`'s runtime import is unaffected by
   `moduleResolution` (it's a `ts.factory` call, not a module-resolution
   concern).
3. **SLICE-4** (collapse CI crew-tests job into root suite invocation): no
   change required by this decision — the two `bunx tsc --project ...`
   `bun-commands:` entries already run as separate invocations in `ci.yml`
   and stay that way.
