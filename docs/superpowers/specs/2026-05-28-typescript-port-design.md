# TypeScript Port Design — loop plugin

## Goal

Improve plugin stability and maintainability by migrating source files from `.mjs`
(checked-by-`checkJs`) to `.mts` (strict TypeScript). Primary payoff: parameter
contract violations and return-shape mismatches caught at compile time rather than
as runtime regressions. Secondary: better IDE support for future contributors.

---

## Scope

Three sequential phases. Each phase is a separate FEAT with a hard dependency chain.

| FEAT | Phase | autonomous_safe |
|------|-------|-----------------|
| FEAT-021 | Phase 1 — mechanical rename | yes |
| FEAT-022 | Phase 2 — refactoring | **no** |
| FEAT-023 | Phase 3 — stability hardening | yes |

This spec covers all three phases. Implementation plans are written per-FEAT.

---

## Phase 1 — Mechanical Rename (FEAT-021)

### Rule: zero logic changes

Every file in this phase is renamed and typed. No logic moves, no algorithm changes,
no "while I'm here" cleanups. Logic changes go in Phase 2. This is the only rule that
makes the parity test meaningful.

### Directory layout

```
src/                          ← NEW: TypeScript source lives here
  scripts/
    loop.mts
    validate-manifests.mts
    migrate-product-backlog.mts
    pre-push-validate.mts
    lib/
      *.mts                   ← renamed from scripts/lib/*.mjs (43 files)
      slice-linker/
        *.mts                 ← renamed from scripts/lib/slice-linker/*.mjs (3 files)
  tests/
    *.test.mts                ← renamed from tests/*.test.mjs (47 files)

scripts/                      ← compiled output (committed to repo — plugin consumers
  loop.mjs                      run these directly, no build step needed post-clone)
  lib/
    *.mjs
    slice-linker/
      *.mjs
```

`tests/` compiled output is NOT committed. Tests run from source via tsx in dev and
from compiled output in CI.

### tsconfig.json (replace current)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": ".",
    "strict": true,
    "noEmit": false,
    "declaration": false,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "types": ["node"]
  },
  "include": ["src/**/*.mts"],
  "exclude": ["node_modules", ".claude", "docs"]
}
```

Key choices:
- `module: NodeNext` + `moduleResolution: NodeNext` — required for Node.js native ESM
- `rootDir: "src"` / `outDir: "."` — `src/scripts/lib/foo.mts` compiles to `scripts/lib/foo.mjs`
- `verbatimModuleSyntax: true` — prevents import elision bugs in ESM
- `strict: true` — the whole point

### Separate tsconfig for tests

```json
// tsconfig.test.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist/tests",
    "rootDir": "src/tests"
  },
  "include": ["src/tests/**/*.mts"]
}
```

### Import extension convention

`.mts` files import using `.mjs` extension. TypeScript NodeNext resolves `.mjs`
imports to `.mts` source at compile time, and emits `.mjs` at output.

```typescript
// correct — resolves to ./foo.mts, emits ./foo.mjs
import { bar } from './foo.mjs';

// wrong — don't use .ts or .mts in import paths
import { bar } from './foo.mts';
```

No import statements need to change during migration — all current `.mjs` imports
already use `.mjs` extensions.

### package.json scripts

```json
{
  "build":       "tsc --project tsconfig.json",
  "build:tests": "tsc --project tsconfig.test.json",
  "typecheck":   "tsc --project tsconfig.json --noEmit && tsc --project tsconfig.test.json --noEmit",
  "test":        "npm run build && npm run build:tests && node --test dist/tests/*.test.mjs",
  "pretest":     "npm run build"
}
```

### CI changes

Add drift guard step in `.github/workflows/test.yml` after build:

```yaml
- run: npm run build
- run: git diff --exit-code scripts/    # fail if compiled output drifts from source
- run: npm run typecheck
- run: node --test dist/tests/*.test.mjs
```

Also bump Node version from `20` to `22` in CI — required for current TypeScript 6
ESM features.

### Migration order (per-file, lowest-risk first)

1. Leaf modules with no imports from other lib files (e.g. `frontmatter.mts`, `paths.mts`)
2. Mid-level utilities (`config-resolver.mts`, `backlog-parser.mts`)
3. Gate modules (`validation-gate.mts`, `test-adequacy-gate.mts`, `ac-linter.mts`, `grade-trend.mts`)
4. Orchestrators (`slice-linker.mts`, `backlog-writer.mts`)
5. Entry scripts (`loop.mts`, `validate-manifests.mts`)
6. Tests last (depend on all lib files being typed)

Each group can be one commit. Tests verify parity after each group.

### Parity check

After build, `git diff scripts/` (original `.mjs` vs compiled output) should be
whitespace and comment changes only. Any logic diff is a migration error — stop and fix.

---

## Phase 2 — Refactoring (FEAT-022)

### Target: slice-linker decomposition

`slice-linker.mts` is the primary regression source (738 lines, hit ESLint complexity
cap twice). Split into focused sub-modules, each with a single responsibility:

| New module | Responsibility | Approx lines |
|------------|---------------|--------------|
| `slice-linker/start-slice.mts` | `startSlice`, `runSliceStartGates`, `buildStartSliceReturn` | ~150 |
| `slice-linker/complete-slice.mts` | `completeSlice`, `evaluateFeatureGates`, `computeFeatureResult` | ~180 |
| `slice-linker/dispatch.mts` | `buildDispatchInstruction`, `readFeatureExcerpt` | ~120 |
| `slice-linker/feature-lifecycle.mts` | `sliceFromFeature`, `moveFeatureToDone`, `moveAndStampSlice` | ~150 |
| `slice-linker.mts` | Re-export barrel only | ~30 |

### TypeScript interfaces (new file: `src/scripts/lib/types.mts`)

```typescript
export interface SliceContext {
  file: string | null;
  frontmatter: Record<string, unknown>;
  goal: string | null;
  scope: string | null;
  outOfScope: string | null;
  content: string | null;
}

export interface GateResult {
  satisfied: boolean;
  reason: string;
  artifacts?: string[];
}

export interface FeatureResult {
  skipped?: boolean;
  reason?: string;
  id?: string;
  from?: string;
  to?: string;
}
```

### Rule: human review required per split

Each sub-module split gets its own PR. No autonomous execution — the loop dispatches
and waits for human sign-off before merging. `autonomous_safe: false`.

---

## Phase 3 — Stability Hardening (FEAT-023)

### Integration tests

Add full-cycle `startSlice` → `completeSlice` integration tests covering:
- Happy path: all gates pass, feature moves to done
- Ladder gate blocks start, resolves after score improvement
- Test-adequacy gate blocks complete, resolves after review populated
- Validation gate blocks complete, resolves after badge written

### ESLint boundary enforcement

Add `eslint-plugin-import` rule preventing `slice-linker.mts` barrel from being
bypassed (consumers import from `slice-linker.mts`, not from sub-modules directly):

```js
// eslint.config.mjs
restrictedImports: ['**/slice-linker/start-slice.mts', ...]
```

### CI hardening

- `typecheck` runs on every PR branch, not just `main` push
- Drift guard runs on every PR
- Test count gate: fail if test count drops below 401

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| ESM import extension bugs | `.mts` → `.mjs` is natively supported by NodeNext; no extension changes needed |
| Compiled output drift | CI drift guard `git diff --exit-code scripts/` |
| Logic accidentally changes during rename | Parity check: diff compiled output vs original before/after |
| Phase 2 split introduces regressions | TS type checker catches contract breaks; full test suite required per PR |
| `postinstall` not running for plugin consumers | Compiled `scripts/` output committed to repo — plugin works from clone |

---

## Out of scope

- Shipping `.d.ts` declarations to consumers (internal-only migration)
- Migrating test framework (stays on `node --test`)
- Changing module APIs or behavior (Phase 2 moves code, does not change contracts)
- Migrating the `crew` plugin (separate repo)
