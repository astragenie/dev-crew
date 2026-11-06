---
kind: review-synthesis
owner: lead (session "crew", Fable 5.1)
subject: audit remediation wave plan rev 1 → rev 2; FEAT-022..035
inputs:
  - .claude/artifacts/crew/reviews/20261105T222800Z-architect-review-audit-remediation-wave-plan.md (rejected)
  - .claude/artifacts/crew/reviews/20261105T223300Z-review-result-audit-remediation-feat-set.md (rejected)
  - .claude/artifacts/crew/reviews/20261105T223000Z-assumption-attack-audit-remediation-wave-plan.md
  - .claude/artifacts/crew/validations/20261105T223500Z-validation-plugin-hooks-json-discovery.md (FAIL)
created_at: 2026-11-05T22:45:00Z
outcome: all findings applied; plan rev 2 + FEAT bodies rewritten; PM re-score pending at write time
---

# Synthesis — three Fable reviews of the audit remediation plan

Three independent reviewers (architect-reviewer, reviewer, critical-thinking)
rejected rev 1. Overlap was high: all three found the STATUS-block regex
break, the marker-block hand-edit, the unreachable 12,288 B budget, the
smoke-test/path-rewrite contradiction, and the scaffold fail-open. The
critical-thinking pass surfaced the two findings that reorder the plan
(hooks discovery, planner field mismatch); the lead verified both live.

## Findings → actions

| # | Finding (who) | Action | Where |
|---|---|---|---|
| 1 | `.claude-plugin/hooks/hooks.json` never loads (assumption #4 → lead live test) | New P0 FEAT, runs alone before wave 1 | FEAT-033, wave 0.5 |
| 2 | Planner reads PM fields intake never writes; pre-flight dead; FEAT slices parallelised (assumption #6, lead verified) | New FEAT in wave 1; manual dispatch until it lands | FEAT-034, plan §Execution |
| 3 | `dist/` gitignored; inventory gate 9; band gate 20; Bun-version flake (arch OBJ-1/11, reviewer) | Scope += .gitignore, inventory regen, band regen, .bun-version, normalised --check | FEAT-026 |
| 4 | Smoke CLI list vs deferred rewrite (arch OBJ-2, reviewer B4) | Command-derived CLI entries + EXPECTED_FAIL ratchet; serial W2.5 path rewrite after wave 2 | FEAT-022, FEAT-026, plan W2.5 |
| 5 | FEAT-030 budget unreachable; includes inside marker blocks; phantom e2e/capture-perf (arch OBJ-3, reviewer B2/B3, assumption #8) | Rescope to installer templates + install re-run; 24,576 B repo-rooted ratchet; drop e2e; real benches to crew/bench/ | FEAT-030 |
| 6 | `STATUS:` block breaks incomplete-detector + gate-guard; DEC-038 lane; 11 relative-path hits (arch OBJ-4, reviewer B1) | Marker-first block; DEC-040; scope += architect/reviewer/verifier path lines; backend-dev replace-not-add | FEAT-028 |
| 7 | Scaffold writes fail-open; unconditional --decision breaks six prompts; --required-reviewers duplicates ladder (arch OBJ-5, assumption #2, reviewer) | --decision required only on terminal writes; scaffold registers no verdict; ladder snapshot; flag deleted | FEAT-024 |
| 8 | Bundling breaks import.meta sibling reads (pricing.json, templates) (arch OBJ-7) | pricing inlined as JSON import; import.meta audit; AC on data files | FEAT-025, FEAT-026 |
| 9 | Wrong paths: docs/routing-table.md, crew/scripts/validate-agent-refs.mts; validator-gate skill missed; test.yml cites; stack.build vs stack.test (arch OBJ-8/13/14, reviewer) | Five docs; deriveValidationGate honours CI presence; src/ validator path; stack.test | FEAT-027, FEAT-028, FEAT-029 |
| 10 | Light path can never be eligible (arch OBJ-9) | Path tokens extracted from task text; fail closed | FEAT-029 SLICE-3 |
| 11 | 29 missing backticked paths; placeholders (arch OBJ-8, reviewer) | NNN/`<`/`*` exemption + seeded allowlist | FEAT-029 SLICE-2 |
| 12 | Codex #6 (inert peer-dispatch rule) and #13 (jq fail-open) had no FEAT yet were "closed" (arch OBJ-13, reviewer) | #6 → FEAT-028 validator rule; #13 → FEAT-029 SLICE-1; closure list corrected | FEAT-028, 029, 032 |
| 13 | "One spawn" unreachable; onFailure ignored on SubagentStop and on CLI < 2.1.295; no hyperfine/baseline; slice order TDD-inverted (arch OBJ-10, reviewer, assumption #4/#5) | One bun entry per event, matcher union; exit-2 carries enforcement; in-repo bench before/after; tests per slice; SLICE-2 = 4 pts | FEAT-031 |
| 14 | `plugin install --from` nonexistent; local marketplace is a never-do; dogfood double-fire; real cache only after push (reviewer B5, assumption #7/#10, arch OBJ-18) | `claude --plugin-dir <pluginCopy>`; smokes in scratch repo; post-push re-check listed | FEAT-032 |
| 15 | Skills undeclared, 44 MB cache, audit #30/#38 uncovered (reviewer coverage) | New deferred FEAT | FEAT-035 |
| 16 | Backlog paths exempted as docs-only skip four validators (arch OBJ-16) | Backlog = code; recorded in ci-gates.md | FEAT-023 |
| 17 | Model ids `-5-5` unverified; prefix match wrong (reviewer, assumption B) | Keys from real transcripts; exact or date-suffix match; add claude-opus-4-5 | FEAT-025 |
| 18 | Auto-install exists; devcrew ineligible (assumption #1, lead verified against crew 0.67.0 cache) | Decision recorded: bundle; alternative rejected (workspace + git dep + registry auth) | FEAT-026, docs/memory.md |
| 19 | depends_on 026→023 serialises a P0 behind a P1 for no reason (reviewer) | Edge dropped | depends_on stamp |

## Decisions taken by the lead (not relitigated by reviewers)

- Keep bundling (FEAT-026) over fixing lockfile eligibility: eligibility
  would still require @astragenie registry auth at install time on every
  consumer machine; bundling needs nothing.
- Delete `--required-reviewers` (architect) rather than keep-as-override
  (reviewer): one source of truth wins.
- Light path kept (with task-text path extraction) rather than deleted:
  dev-lite/reviewer-lite have routing rows and a 2-file/50-LOC refusal that
  already fails closed.
- FEAT-033 runs alone before wave 1 (not as a wave-1 lane): it collides
  with 023 (ci-gates.md) and 034 (touches-files test), and every later
  FEAT reads the new path.

## Estimates (architect) — applied via PM re-score

026 5→8, 029 5→8, 031 8→13, 024 3→5, 028 3→5, 025 3→5, 030 3, others hold.
New: 033 (small, P0), 034 (small), 035 (deferred).

## Still open after rev 2

- Discovery result should be re-checked on a CLI ≥ 2.1.295 (FEAT-033 AC-4).
- Real marketplace cache path is exercisable only after the operator pushes
  (FEAT-032 post-push step).
- Licence mismatch (MPL-2.0 vs MIT) — operator decision.
