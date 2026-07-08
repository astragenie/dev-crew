---
id: FEAT-238
status: done
closed: 2026-07-08
priority: P1
category: bug
target_release: null
created: 2026-07-08
updated: 2026-07-08
depends_on: []
slices: []
derived_from: null
tags: [concern:reliability, area:memory, area:slice-ceremony]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: null
triage_notes: "Filed 2026-07-08 from plugins-common loop adoption. Reproduced: fresh repo with runner installed but @astragenie/astramem-client absent from the runner plugin cache node_modules → every `slice start` (and any command that builds memory context) hard-crashes at module load. Blocks the entire loop in that repo."
---
## Description

`src/scripts/lib/memory-context.mts:35` uses a **top-level static** import:

```ts
import { recallSilent } from "@astragenie/astramem-client";
```

Because it is static, the module is resolved at import time — before the `memory.enabled`
gate runs. If `@astragenie/astramem-client` is not resolvable in the **runner plugin cache**
`node_modules` (e.g. a consumer repo that never installed it), `slice start` and any command
that builds memory context crash with:

```
ENOENT while resolving package '@astragenie/astramem-client' from '.../src/scripts/lib/memory-transport.mts'
```

Setting `loop.memory.enabled = "never"` does **not** bypass it — the crash happens at module
load, before the gate. This defeats the fail-silent memory contract (which only covers runtime
send failures, not the import itself), and blocks the loop entirely in any repo where the
package isn't present in the plugin cache.

**Contrast:** `grade-writer.mts`, `learnings.mts`, `phase-gate.mts`, `loop-installer.mts` all
correctly use `await import("./memory-*.mjs")` gated on `memory.enabled`. `memory-context.mts`
is the outlier.

**Workaround used in the field:** copy the built `@astragenie/astramem-client` package into the
runner plugin cache `node_modules/@astragenie/astramem-client`.

## Acceptance criteria
- AC-1: Given a repo with `loop.memory.enabled = "never"` (or the astramem-client package absent from the plugin cache), When `slice start` runs, Then it completes without ENOENT — memory recall is skipped, not crashed.
- AC-2: Given `memory.enabled` is on/auto and the package IS resolvable, When memory context is built, Then recall works exactly as today (no behavior regression).
- AC-3: The `@astragenie/astramem-client` import in `memory-context.mts` is converted to a `memory.enabled`-gated dynamic `await import(...)`, matching the pattern in `grade-writer.mts`/`learnings.mts`; a test simulates the unresolvable/`never` case and asserts no throw.
