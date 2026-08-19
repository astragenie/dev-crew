---
decision: approved
reviewer: crew:reviewer
slice: SLICE-34
reviewed_commits: [f6ae6bc6]
---

# Review — SLICE-34 (FEAT-013): root↔crew/ import boundary validator + hooks.json inventory

## Summary

The builder shipped a new boundary validator and, honestly and prominently,
surfaced that ground truth (10 sanctioned cross-imports across 3 files) is
wider than the contract doc's evidence (4, from 1 file). I independently
re-derived the ground truth with a from-scratch reimplementation (not the
shipped validator's own code), traced the extra imports to real production
call sites, adversarially probed both directions and three edge-case import
shapes, exercised the inventory regen/drift/restore cycle, and verified
machine contracts in an isolated clean worktree (the shared working tree is
being concurrently mutated by another live process, which I explicitly
worked around rather than misattributing its noise to this slice). Found
one genuine, demonstrated coverage gap — dynamic `import()` bypasses the
scanner entirely — which I flagged as a non-blocking follow-up rather than
a defect, since the contract itself never specified dynamic-import
coverage and no live code currently exploits it. **Decision: approved.**

## 1. The 10-entry ground truth — independently re-derived, not just re-read

Wrote a **from-scratch reimplementation** of the scan (not a copy of the
shipped validator's code) and ran it against the real repo with zero
allowlist filtering: **exactly 10 unique `(file, crewModule)` pairs across
exactly 3 files** —
`hooks/pre-push-gate.mts` (4), `src/scripts/lib/slice-linker/crew-bridge.mts`
(5), `src/scripts/lib/phase-gate.mts` (1) — byte-for-byte the same 10
entries as the shipped `ALLOWED_CROSS_IMPORTS` array. Not 9, not 11.

Traced one call site in each extra file to confirm they're genuinely live,
not vestigial:
- `crew-bridge.mts` is imported by `complete-slice.mts` and `start-slice.mts`,
  both re-exported through `slice-linker.mts` — the module backing the
  `slice from-feature`/`slice complete` CLI commands. Spot-checked
  `writeArtifact("run-brief", ...)` is genuinely called (not just imported)
  at `crew-bridge.mts:92`.
- `phase-gate.mts`'s `writeValidationResultArtifact` import is called at
  line 124, and `phase-gate.mts` itself is directly loaded by `loop.mts:102`
  (`runPhaseGate`) — a live CLI command handler.

Both extra files are real, load-bearing production code, not dead imports
the builder happened to allowlist for convenience.

## 2. Reverse direction + path-resolution robustness

Wrote a second independent reimplementation scanning `crew/**` for any
import resolving outside `crew/`: **397 crew/ files scanned, 0 escapes** —
confirms the zero-entry reverse allowlist matches reality, independently
of the shipped validator.

**The `crew/tests/../hooks/` trap**: confirmed this pattern is not a
strawman — `crew/tests/*.test.mts` genuinely imports via `"../hooks/lib/*.mjs"`
dozens of times (e.g. `check-builder-terminal-state.test.mts`,
`dispatch-size-gate.test.mts`). This string-contains "hooks/" (which would
false-positive under naive string matching against the root `hooks/`
directory) but correctly resolves to `crew/hooks/lib/*.mjs`. My independent
reverse-scan probe — real `path.resolve`-based resolution, not string
matching — correctly found zero escapes despite this pattern appearing
dozens of times, confirming the resolution approach is sound (not just
trusting that the shipped validator's own test suite covers it, though it
does — test #5, "does not flag a crew-internal relative import that
string-matches a root dir name").

**Adversarial import shapes, tried live against the real validator:**
- **Dynamic `import()`**: added a scratch file
  (`src/scripts/lib/_scratch-boundary-probe/dynamic-import-probe.mts`)
  containing `await import("../../../../crew/scripts/lib/gepa/gepa-killswitch-cmds.mjs")`,
  an unsanctioned cross-import. Ran the validator: **`validate-repo-boundary: OK`**
  — it did not catch it. **This is a real, demonstrated blind spot**: the
  scanner's `extractRelativeImports` regex (`from\s+["']([^"']+)["']`) only
  matches static `import/export ... from "..."` syntax, never `import(...)`
  call expressions. See "Findings" below for severity assessment — cleaned
  up the scratch file immediately after confirming.
- **Bare (non-relative) specifier**: checked for a `tsconfig.json` `paths`
  alias that could let a bare specifier resolve into `crew/` — none exists,
  and no code anywhere uses `from "crew/..."` (bare). This vector is
  structurally unreachable in this codebase today, not just unexploited.
- **`.mts`/`.mjs` specifier extension mismatch**: added a scratch file
  importing an otherwise-allowlisted crew module but with a `.mts`
  extension instead of the repo's `.mjs` convention. The validator
  correctly **flagged** it (`disallowed cross-import from
  "../../../../crew/scripts/lib/artifacts/write.mts" — not on the
  allowlist`) — the exact-string match against the allowlist means an
  extension typo fails safe (gets rejected) rather than silently bypassing
  the check. Not a vulnerability.

## 3. Validator bite (file:line naming)

Directly demonstrated above by the `.mts`-extension probe: the failure
output was exactly
`src/scripts/lib/_scratch-boundary-probe2/mts-ext-probe.mts:4: disallowed
cross-import from "..." — not on the root↔crew/ allowlist` — correct
file, correct line, matches AC-1's literal message format. Scratch file
removed immediately after; `git status --short src/scripts/lib/` confirmed
clean.

## 4. Inventory regen / drift / restore

- Copied the committed `docs/planning/hooksjson-crew-path-inventory.json`,
  ran `--write-inventory` to regenerate it fresh from the live
  `.claude-plugin/hooks/hooks.json`, then `diff`'d the two: **identical,
  zero drift** — `git status --short` on the file also confirmed no byte
  changed.
- Perturbed the committed inventory file directly (`{"perturbed": true}`),
  reran the validator: **correctly failed** —
  `docs/planning/hooksjson-crew-path-inventory.json is stale relative to
  .claude-plugin/hooks/hooks.json — regenerate with --write-inventory`.
  Restored from backup, confirmed `git diff --stat` on the file was empty
  (clean restore) and the validator passed again.

## 5. Machine contracts — verified in an isolated clean worktree

The shared working tree has a concurrent autonomous-loop process actively
mutating backlog/state files (same pattern observed in earlier reviews
this session) — I confirmed `generate-metrics-band --check` initially
failed in the shared tree, but rather than attribute that to SLICE-34, I
created an isolated `git worktree` at exactly commit `f6ae6bc6`, installed
both root and `crew/` dependencies fresh, and reran everything there:

- **CLAUDE.md byte count**: `12288` bytes — exactly at the cap, matching
  the builder's claim precisely, confirmed in both the shared tree and the
  clean worktree (unaffected by concurrent mutation either way).
- **`generate-metrics-band.mts --check`**: fails in the shared/dirty tree
  (concurrent-process noise), **passes clean** (`README.md metrics band is
  up to date`) in the isolated worktree at SLICE-34's own commit — confirms
  the earlier failure was not attributable to this slice.
- **Gate numbering, hand-counted in the clean worktree**: `docs/ci-gates.md`
  and `CLAUDE.md` both list **exactly 42** numbered gates, and agree
  entry-for-entry — `#9` in both is `validate-repo-boundary.mts`
  (`docs/ci-gates.md` explicitly marks it "**new gate** (SLICE-34, ...)"),
  sitting immediately after `#8 validate-imports.mts` and before
  `#10 validate-backlog-writes.mts` — exactly matching the contract doc's
  specified insertion point. Cross-checked against `ci.yml`'s actual
  `validators:` block: `validate-imports.mts` → `validate-repo-boundary.mts`
  → `validate-backlog-writes.mts` in that exact order. Count and order
  consistent across all three sources.

## 6. Targeted suites — clean in the isolated worktree

- `bun test src/tests/validate-repo-boundary.test.mts`: **7 pass, 0 fail**
  (the shared/dirty tree initially showed a timeout on one test, traced to
  a missing `crew/` `bun install` in my fresh worktree, not a real defect —
  resolved by installing `crew/`'s own deps, then clean).
- `bun src/scripts/validate-agent-refs.mts`: OK.
- `bunx tsc --project tsconfig.json --noEmit` + `--project tsconfig.test.json --noEmit`:
  both clean (the initial `@astragenie/memory-provider` resolution errors
  were the same missing-`crew/`-install artifact, resolved the same way).

## Findings

### [MEDIUM, non-blocking] Dynamic `import()` is not scanned in either direction

Demonstrated live (see §2): a `await import("<path into crew/>")` inside a
new root-side file completely bypasses the boundary check, in both
directions (root→crew and, by the same regex limitation, crew→root). This
is not currently exploited anywhere in the repo (confirmed via grep — zero
existing dynamic imports touch `crew/`), and the contract doc itself only
ever specified static `import ... from "<spec>"` syntax as the rule to
enforce — so the validator faithfully implements what was scoped, and its
own docstring doesn't overclaim ("driven by real path resolution" is true
for the syntax it does parse). I'm flagging it as a real, worth-tracking
gap rather than a defect in this slice, because this codebase's own
dominant convention for lazy command-handler loading is exactly
`const { x } = await import("./lib/y.mjs")` (seen throughout `loop.mts`,
`crew.mts`, and elsewhere) — meaning a future accidental cross-import via
that idiom, inside either a new root command handler or a new crew/-side
module, would sail through this gate silently. Recommend a fast follow-up
extending `extractRelativeImports` to also match
`import\(\s*["']([^"']+)["']` call-expression specifiers — cheap, same
resolution logic already handles it correctly once extracted (proven by
the `.mts`-extension-mismatch test still correctly flagging on the static
path).

## Architectural opinion (for the FEAT-014 record)

Should `crew-bridge.mts`/`phase-gate.mts`'s cross-imports stay permanent
bridges, or move in a flatten-phase-2? **Stay permanent.** Checked the
just-landed `docs/planning/feat-014-adr-typescript-unification.md`
(commit `0f6c0377`, same session) — it's an evidence-based decision that
`crew/` keeps its own scoped `typescript@^6.0.3` and remains a distinct Bun
workspace member indefinitely (TS7's package exports genuinely can't serve
`openapi-typescript`'s runtime classic-compiler-API import; this isn't
inertia, it's a real toolchain incompatibility). Given `crew/` isn't
flattening away, and the specific functionality these 6 imports reach for
(workflow-state tracking, cost-hygiene, artifact/validation-result writing)
is intrinsically crew-orchestration-owned state — not generic utility code
that happens to live in the wrong directory — moving it to root would mean
either duplicating crew-owned state-tracking logic at root (violating
`DEC-020`'s "no split-brain" principle, landed this same session) or
relocating crew's own workflow-state ownership to root, a much larger
change than this FEAT ever scoped. A small, explicitly-allowlisted,
well-documented bridge module (which `crew-bridge.mts` already is, by name
and design) is the right permanent shape for this seam.

## Decision rationale

`approved`. Every quantitative claim in the commit message — the 10-entry
ground truth, the 3-file split, the 42-gate renumbering, the exact
12,288-byte CLAUDE.md — checked out under independent, from-scratch
re-derivation, not just re-reading the shipped code. The reverse-direction
zero-escape claim and the specific "crew/tests/../hooks/" resolution trap
both held up under a second, independently-written implementation. The one
real gap I found (dynamic `import()`) is honestly a limitation of the
*specified* rule, not a broken promise, isn't currently exploited, and is
cheap to close as a fast follow-up — not grounds to block a slice that
otherwise closes a real, previously-unenforced boundary and does so with
unusually thorough self-disclosure of its own scoping discrepancy against
the contract doc.
