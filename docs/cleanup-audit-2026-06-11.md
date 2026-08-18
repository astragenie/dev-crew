# Cleanup audit — 2026-06-11

Read-only inventory produced by `loop:researcher` dispatch on 2026-06-11.
Source surface: 18.7k LOC lib + 24.9k tests + 2.1k agents + 1.7k skills
+ 2.6k commands.

## Summary

- Total LOC inspected (sampled): ~5k of 18.7k lib (Grep over 100% surface; full Read on 8 files).
- Net cleanup opportunity (estimated): **~115 lines + 2–4 files** of *clearly* dead/legacy code, plus **2 file renames** and **3 doc archive moves**.
- Risk-ranked batches: 6.

Most of the legacy / back-compat surface the operator expected to find has
**already been deleted** in recent commits (`505a8a5` triage regex;
`4a31c62` Bun migration drop of `scripts/*.mjs`). What remains is mostly
load-bearing fallbacks (default resolution, single-report cost fallback)
that are first-class behavior, not shims.

## Findings

### Batch 1 — Safe deletes (zero risk; isolated dead code)

**1.1 — Removed-but-stubbed CLI subcommand `backlog triage`** (decision needed: keep helpful error vs. delete entirely)
- `src/scripts/loop.mts:685-689` — `if (sub === "triage") { throw new Error("`backlog triage` (regex fallback) was removed on 2026-06-11. ... invoke `/loop:triage`"); }`.
- Est. LOC removed: ~6.
- The stub is **load-bearing** — it converts an unknown-subcommand error into an actionable directive. Recommend keeping for one release cycle, then deleting in v0.41+. Mark with `// TODO(2026-09-11): remove stub`.
- Confidence: high.

**1.2 — Module rename: `backlog-triage.mts` → `acceptance-criteria.mts`** (confidence: high)
- `src/scripts/lib/backlog-triage.mts:1-12` — file-level comment: "What remains: `detectAcceptanceCriteria`, used by slice-start.mts to count AC bullets in slice bodies (unrelated to PM scoring)".
- Test mismatch: `src/tests/backlog-triage-autosafe.test.mts:5` imports `detectAcceptanceCriteria` — no triage logic exercised.
- Only **2** code references (source + test) per Grep. Est. LOC removed: 0; pure rename.

**1.3 — Unused `.d.mts` shim candidate: `src/scripts/lib/bun-test.d.mts`** (confidence: medium)
- No `import "bun-test"` resolves to this shim across the source tree (Grep). Verify with `bunx tsc --noEmit` before deleting.

### Batch 2 — Likely-safe deletes (single consumer; easy to verify)

**2.1 — Legacy `useOrchestrateSlice` boolean fallback** (operator-flagged in upstream-request)
- `src/scripts/lib/slice-linker/start-slice.mts:82-99` — comment "The legacy `useOrchestrateSlice` boolean is retained as fallback for callers that pre-date the config option". Function returns `"lead"` regardless of the boolean: `return useOrchestrateSlice ? "lead" : "lead";` (line 98). The parameter is functionally dead in start-slice.
- `src/scripts/lib/slice-linker/dispatch.mts:67-75,88-106` — `resolveOrchestratorMode(orchestratorMode, useOrchestrateSlice)` still routes when `orchestratorMode` is `undefined` (legacy returns `orchestrate-slice` vs. `direct-builder`).
- `src/tests/slice-linker.test.mts:306-325` — 2 explicit back-compat tests.
- Upstream cross-reference: `docs/upstream-requests/2026-06-10-hero-crew-lead-orchestrator-restoration.md:70` — "Drop the `useOrchestrateSlice` boolean fallback...".
- Est. LOC removed: ~40 source + ~30 test. Batch as one slice.
- Confidence: high.

**2.2 — Back-compat: `github.enabled` field write**
- `src/scripts/lib/task-store/setup-writer.mts:32-35` — "Back-compat: keep `github.enabled` for callers that still check it".
- Still active (`.claude/loop.json:130` writes it). **Do not delete.** Flagged for the operator's awareness only — defer until full task-store migration.

### Batch 3 — Compat shims (need a deprecation cycle or version note)

**3.1 — `gradeFilePath` legacy-format predictable path**
- `src/scripts/lib/grade-parser.mts:229-238` — "Used as a fallback for callers that need a predictable write target".
- 5 active consumers (grade-writer + tests). **Active fallback, not dead.** Mark for removal after a full release cycle of timestamped grades only.

**3.2 — `FALLBACK_MODEL` in model-router** (NOT a shim — first-class)
- `src/scripts/lib/model-router.mts:13` — last-resort default at 18-19. No action.

### Batch 4 — Vendored 3rdparty audit

All seven vendored agents under `agents/3rdparty/` have ≥1 reference outside the file:

| Vendored agent | Referenced by |
|---|---|
| `code-reviewer.md` | `agents/researcher.md:73` |
| `context-manager.md` | `agents/researcher.md:72`, `agents/pm.md:142`, `agents/architect.md:87` |
| `diagram-architect.md` | `agents/document-writer.md:70,75`, `agents/architect.md:85` |
| `fact-checker.md` | `agents/researcher.md:71`, `agents/pm.md:139`, `agents/market-researcher.md:99,146` |
| `markdown-syntax-formatter.md` | `agents/document-writer.md:69,74` |
| `research-coordinator.md` | `agents/researcher.md:70`, `agents/pm.md:141`, `agents/market-researcher.md:148`, `agents/architect.md:86` |
| `task-decomposition-expert.md` | `agents/pm.md:140`, `agents/architect.md:84` |

`skills/3rdparty/` does **not exist** (Glob returned no files). **No deletes recommended.**

### Batch 5 — Test crust

**5.1 — Rename `src/tests/backlog-triage-autosafe.test.mts` → `acceptance-criteria.test.mts`** — covered in 1.2. The `autosafe` suffix references deleted regex-based `autonomous_safe` inference; with the rest of the module gone in `505a8a5`, the suffix is meaningless.

**5.2 — Drop `useOrchestrateSlice` back-compat tests** — `src/tests/slice-linker.test.mts:306-325`, covered in 2.1.

**5.3 — `src/tests/triage-flow.test.mts` already gone** — verified deleted in `505a8a5`. No drift.

### Batch 6 — Doc rot

**6.1 — Archive resolved upstream-requests**
- `docs/upstream-requests/2026-06-07-hero-crew-orchestrate-slice-surface-stack-routing.md:5` — `status: superseded-by-resolver-cli` (resolved 2026-06-07). Note: file has TWO status lines (`superseded-by-resolver-cli` and `triaged`) — drift; operator should confirm authoritative line.
- `docs/upstream-requests/2026-06-07-hero-crew-forward-declared-skill-ids.md` — TWO status lines (`pending-upstream-author` and `resolved-by-upstream-skills-authored`); the resolved status indicates archival.
- Action: move both to `docs/upstream-requests/archive/`. Est. 2 file moves + 1 status cleanup. Confidence: medium on the double-status drift — operator should `git log` to confirm.

**6.2 — `docs/superpowers/plans/bun-migration-baseline.txt`** (confidence: low — speculative)
- After `4a31c62` ("finish Bun migration") landed, this baseline file likely served its purpose. Check tooling refs; if none, archive.

**6.3 — `commands/` no orphans found** — all 42 are slash-flow contracts surfaced to the operator; no consumer-detection is meaningful. Skipped.

**6.4 — `skills/` no orphans found** — all 6 owned skills (`pm-review`, `loop-discipline`, `authoring-slices`, `pm-decompose`, `verification-before-completion`, `triage`) have ≥1 reference in `agents/*.md`, `commands/*.md`, or `.claude/loop/rules.md`.

**6.5 — `scripts/presets/` no orphans** — all 6 presets are referenced. The five non-active ones (`dotnet-aspire-python`, `dotnet-only`, `dotnet-react`, `dotnet-vue`, `python-only`) are loaded by `src/scripts/lib/phase-gate.mts`, `src/scripts/lib/phase-gate/runners.mts`, `src/scripts/lib/config-resolver.mts`. Intentional preset library entries for other projects.

## Recommended sequence

| Slice | Batch(es) | Est. LOC | Risk |
|---|---|---|---|
| SLICE-1 | 1.1 + 1.2 + 5.1 (rename `backlog-triage` → `acceptance-criteria`; sunset-tag the triage stub) | ~10 + rename | Low |
| SLICE-2 | 6.1 (archive 2 resolved upstream-requests; fix double-status drift) | 0 source; 2 file moves | Zero |
| SLICE-3 | 2.1 + 5.2 (drop `useOrchestrateSlice` legacy boolean + 2 back-compat tests) | ~70 | **Medium** — requires upstream lead-restoration first |
| SLICE-4 | 1.3 (verify + remove `bun-test.d.mts` if dead) | ~10 | Low |
| SLICE-5 (later) | 3.1 + 2.2 (remove `gradeFilePath` legacy reader + `github.enabled` back-compat) | ~25 | Low-medium — needs a full release cycle of new format / key only |

Total: **~115 LOC + 4 file ops** across 5 slices. Modest, as expected for a recently-cleaned codebase.

## Out of scope

- **Full dead-export sweep across 18.7k LOC of lib.** Spot-checked 8 modules (`backlog-triage`, `model-router`, `cost-regression`, `effective-cwd`, `auto-merge`, `decisions-store`, `loop-iteration`, `halt-badges`); every public export had ≥1 consumer. Operator should run `bunx ts-prune` or `bunx knip` for the full picture — mechanical work that doesn't fit a 25-tool-call read-only audit.
- **CHANGELOG / release-notes consolidation.**
- **Surviving `.mjs` entry-points under `scripts/`.** Per `CLAUDE.md`, several are intentional exceptions; spot-check via `Glob` did not reveal new drift but full scan deferred.
- **Cross-plugin (hero-crew) impact analysis** — out of repo boundary.
- **`.claude/artifacts/loop/*` artifact pruning** — durable repo memory; out of scope per `CLAUDE.md`.

## Confidence statement

- **High** on 1.1, 1.2, 2.1, 4.*, 5.1, 5.2, 6.4, 6.5 — direct grep evidence with cited file:line.
- **Medium** on 1.3, 6.1 — need TS resolution check / git log first.
- **Low** on 6.2 — speculative.
