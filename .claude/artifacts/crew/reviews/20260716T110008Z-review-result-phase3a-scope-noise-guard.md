# Review Result: Phase 3a — memory.scope default + sink-level noise guard

- Reviewed: 2026-07-16T11:00:08Z
- Reviewer: Reviewer A (correctness + AC coverage)
- Scope: uncommitted diff (`git diff HEAD`) in `src/scripts/lib/memory-transport.mts`,
  `src/scripts/lib/memory-sink.mts`, `src/scripts/lib/memory-noise-guard.mts` (new),
  `src/tests/memory-sink.test.mts`, `src/tests/memory-transport.test.mts`.
  Did not review any PR #516-owned file (`astramem-e2e*`, `astramem-e2e-preflight.mts`,
  `bounded-fetch.mts`, `docs/sop/memory-bridge.md`) — confirmed untouched.
- Builder handoff: `.claude/artifacts/crew/handoffs/20260716T104859Z-handoff-memory-scope-noise-guard-phase3a.md`

## review_decision: PASS

## Gate outputs (independently re-run)

- `bun test src/tests/memory-sink.test.mts src/tests/memory-transport.test.mts --timeout 60000` → **63 pass, 0 fail** (133 expect calls).
- `bunx tsc --project tsconfig.test.json --noEmit` → clean.
- `bunx tsc --project tsconfig.json --noEmit` → clean.
- `bunx biome lint` on all 5 touched files → 0 errors/warnings, 14 pre-existing `useLiteralKeys` infos in `memory-transport.test.mts:67/68/86` (predate this change, matches handoff claim).
- `git diff HEAD --name-only` → exactly the 4 tracked files above; `memory-gepa.mts` and all PR #516-owned paths show no changes.

## AC table

| # | Focus item | Result | Evidence |
|---|---|---|---|
| 1 | Fail-silent contract intact; no ReDoS; cap/sanitize before noise check | PASS | `recordMemory` order confirmed: `sanitizeContent` (caps to 2000 chars, `memory-sanitize.mts:16`) → empty check → `isNoiseContent` → I/O (`memory-sink.mts:175-179`). All 3 `NOISE_PATTERNS` regexes use a single non-nested `.*`/optional-group — no catastrophic-backtracking shape, and content is bounded to 2000 chars before they ever run. |
| 2 | Daemon `remember` accepts top-level `scope`, enum semantics, team≠org, no privacy leak | PASS | Verified against the actual sibling server repo (`C:\work\mega\memory`), not just the client type: `StoreMemoryRequest.Scope` (`AstraMemory.Modules.Memories/Models/MemoryModels.cs:10`) is JSON key `"scope"`, bound by `POST /remember` → `Store` (`MemoriesController.cs:139,71`). `ScopeNormalizer.CanonicalScopes = ["private","team","org"]` and `MemoryWriteService` does `Scope = scope` directly at insert (line ~186) with no promotion path found. `team` is a narrower tier than `org`, so defaulting to `team` (vs. astramem's own `private` default, which is invisible to shared recall) cannot leak repo-private content to `org`-wide visibility. |
| 3 | `normalizeScope` fallback/precedence semantics | PASS (see finding L2) | All 6 config cases + per-call-override-wins + default-when-absent are unit-tested and pass. One edge case noted below (L2). |
| 4 | Noise-guard bias — near-misses pass, bare-command heuristic doesn't reject real lessons | PASS | Reviewer's own example ("git rebase --onto is dangerous here") traced by hand: tokens `git,rebase,--onto,is,dangerous,here` — `is` ∈ `PROSE_STOPWORDS` (`memory-noise-guard.mts:45`) fails `.every(...)`, so `looksLikeBareCommand` returns `false` and the content is recorded. All 7 exemplar/near-miss pairs in the test file pass. |
| 5 | Precedence: disabled vs. noise, deterministic and documented | PASS (see note) | Noise check runs before `readMemoryConfig`/mode check (`memory-sink.mts:175-183`), so a disabled repo with noise-shaped content returns `reason: "noise"`, not `"disabled"`. This is explicitly locked in by test `"noise guard runs even when memory is disabled"` — deterministic, not accidental, and doesn't change the externally-visible outcome (`recorded: false`, no I/O either way), only the `reason` string. |
| 6 | `buildTagFields` extraction — byte-identical project/agent/metadata shape | PASS | Diffed against pre-refactor inline code: same conditional `project`/`agent`/`metadata` construction, same spread pattern. Only change is `scope` added as an unconditional new top-level key ahead of the others — JSON key order is not semantically meaningful, so no behavioral regression. |
| 7 | No #516-owned file touched | PASS | `git diff HEAD --name-only` and `git status` on the 6 named forbidden paths show nothing. |
| 8 | Gates | PASS | See "Gate outputs" above — reproduced independently, matches handoff's reported numbers. |

## Findings

- **[LOW] Fabricated citation — "ADR-009" does not exist.** `memory-transport.mts:45` and `memory-sink.mts`'s `buildTagFields` doc comment both cite "ADR-009" for the "team/org insert directly, no promotion step" framing. No `ADR-009` exists anywhere in this repo or the sibling `memory` repo (`grep -rl "ADR-009"` — zero hits in either tree). The only "009" decision record in this repo is `docs/decisions/DEC-009-memory-integration-programmatic-not-skill.md`, which is about programmatic-vs-skill memory *loading*, entirely unrelated to scope semantics. The builder's own handoff flagged "I have not read ADR-009" as an open risk — the correct finding is that it doesn't exist at all, not merely that it went unread. **The underlying technical claim is independently verified TRUE** (see AC #2 above, sourced from the real `ScopeNormalizer`/`MemoryWriteService` code), so this is a documentation-accuracy issue, not a functional bug. Fix: replace the "ADR-009" reference with a concrete citation (e.g. point at `AstraMemory.Domain/Tenancy/ScopeNormalizer.cs` / "DEC-048 CONTRACT" in the sibling repo, or file a real local decision record if this repo wants a durable citation of its own).
- **[LOW] `normalizeScope` doesn't dual-accept the daemon's legacy scope words.** The sibling server's `ScopeNormalizer` (DEC-048 CONTRACT) still accepts two legacy scope words at the write boundary — `project` → normalizes server-side to `team`, `shared` → normalizes server-side to `org`. This repo's `normalizeScope` (`memory-sink.mts`) treats anything outside the exact 3-value union as invalid and coerces to `"team"`. For `memory.scope: "project"` the outcome is accidentally identical (`team` either way). For `memory.scope: "shared"`, however, a user intending org-level visibility would silently get `team` instead, because the local normalizer never forwards the raw legacy word to let the daemon do its own (correct) mapping. Not a privacy/security issue — the failure direction is toward *narrower*, not broader, visibility — and `.claude/loop.json`'s own documented vocabulary is only `private`/`team`/`org` (this PR's own `MemoryScope` type), so a user would have to independently know astramem's legacy cloud vocabulary to hit this. Non-blocking; worth a one-line comment update if anyone ever wires those words through.

## Out-of-scope observation (not a Phase 3a finding — flagging only for awareness)

While tracing the wire path server-side to verify the `scope` claim, I noticed the **pre-existing** (untouched by this diff, tagged `CANARY-REVIEWER-8801`) top-level `project`/`agent` fields sent by `memory-sink.mts` don't match `StoreMemoryRequest`'s actual JSON keys (`project_id`/`agent_id`, not `project`/`agent`), and `WorkspaceProjectId` (`project_id`) is required server-side (400 if blank) on the same `POST /remember` route this repo's `scope` field rides on. This predates Phase 3a, is explicitly outside the builder's allowed scope for this task, and was apparently already reviewed once (the `CANARY-REVIEWER-8801` marker). Not asserting it's broken in practice (an intermediate local-daemon default/rewrite could still fill `project_id`) — just surfacing it so it isn't lost, since it's adjacent to what this review verified.

## Conclusion

Both features (scope default/override threading, sink-level noise guard) are correctly implemented, additive, fail-silent-preserving, and test-covered including the specific near-miss/precedence scenarios this review was asked to stress. The two findings are both LOW severity, non-blocking, and don't change the safety conclusion: defaulting to `team` scope is safe (narrower than `org`, no privacy leak) and the noise guard's bias is correctly conservative in the case the reviewer probed by hand.
