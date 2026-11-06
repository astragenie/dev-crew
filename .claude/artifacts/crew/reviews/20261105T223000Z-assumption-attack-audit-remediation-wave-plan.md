---
kind: review-result
reviewer: crew:3rdparty:critical-thinking (model: fable)
subject: docs/superpowers/plans/2026-11-05-audit-remediation-waves.md + source plan + FEAT-022..032
decision: rejected_assumptions
created_at: 2026-11-05T22:30:00Z
confidence: high
---

# Assumption attack — audit remediation wave plan

Format: assumption → question → evidence → consequence-if-false → severity.

1. **"The plugin cache never runs an install, so `dist/` must be committed."**
   Official loading docs: marketplace-installed plugins get eligible Node deps
   installed automatically when cached, but only when the root has
   package.json + a lockfile pinning registry-only packages; "a plugin with a
   git, GitHub, folder, workspace, or linked dependency gets no install".
   Root `bun.lock:4` declares workspaces; crew member depends on a git URL
   (`crew/bun.lock:9`, `crew/package.json:46` astramem-plugin). devcrew is
   ineligible for a fixable reason. Sibling caches here DO have node_modules
   (`cache/astra/crew/0.67.0`, `runner/0.78.0`) — though crew 0.67.0 also
   carried the same git dep, so eligibility semantics are not fully
   settled. devcrew 1.1.0 cache the baseline cites does not exist on this
   machine; CLI here is 2.1.270 vs 2.1.318 in the handoff. `.gitignore:13`
   ignores `dist/`. **MAJOR** — FEAT-026 may be replaceable or complementable
   by a lockfile-eligibility fix; smoke test should assert eligibility too.
2. **"Fail-open on missing `--decision` is latent."** Every final call passes
   it (`commands/build.md:194`, `commands/review.md:50`,
   `agents/reviewer.md:54-67`), but every reviewer's mandatory FIRST action
   is `--scaffold --status in-progress` with no decision
   (`agents/reviewer.md:43-46`, `architect-reviewer.md:30`,
   `csharp-reviewer.md:44`, `typescript-reviewer.md:44`,
   `reviewer-lite.md:44`, `verifier.md:78`). Scaffold registers the artifact
   (`crew/scripts/lib/artifacts/write.mts:932-934`) →
   `workflow-state.mts:425-431` stamps review_passed before the review
   starts; `src/scripts/lib/review-gate.mts:6` treats it as satisfied at
   slice close. Live on every dispatch → P0 stands. FEAT-024 as written
   (exit 2 on missing decision) breaks six agent prompts unless `--scaffold`
   is exempted. **BLOCKER for T4 as specified.**
3. **"Two reviewers last-writer-wins is live."** `commands/build.md:96`
   dispatches A and B in one message; `.claude/loop.json:67-70` ladder A,B;
   prose aggregation at `build.md:108-111` governs only what the dispatcher
   tells the user. Holds. Confirms P0.
4. **"Crashing hooks mean nothing is enforced."** Docs: non-2 non-zero exit
   lets the action proceed unless `onFailure: "block"` (v2.1.295+);
   hooks.json has no onFailure. Holds. Missed by the plan: (a) this CLI
   (2.1.270) ignores `onFailure`, so T8's fail-closed is a no-op locally;
   (b) docs say hooks load from `hooks/hooks.json` at plugin root or the
   manifest `hooks` key — devcrew ships `.claude-plugin/hooks/hooks.json`
   with no `hooks` key in plugin.json. If not loaded, NO devcrew hook runs
   for consumers and T8's render target is wrong. (c) Fail-closed means a
   consumer without `bun` has every Bash/Agent call blocked; README does not
   list bun as a consumer prerequisite. **MAJOR, needs one live check.**
5. **"One dispatcher per event is an 8-point perf win."**
   `crew/tests/hook-cold-start-bench.test.mts:8-16` measures one hook's
   cold start only; events.jsonl has no timing; 214 ms is from dev-team.
   PreToolUse Bash = 3 bun spawns, Agent = 3 bun + 1 node, SubagentStop = 8
   processes; T8 leaves node .mjs alone → SubagentStop drops to ~4, not 1.
   Codex #3 rated fan-out OVERSTATED. Operator pain unanswered. **MAJOR for
   sizing**; timeouts and fail-closed are separable from the refactor.
6. **"The wave planner packs these FEATs as the table says."**
   `src/scripts/lib/wave/planner.mts:105` walks slices/pending (SLICES); all
   11 FEATs have `slices: []` → wave plan returns nothing until
   `/devcrew:start`. touches_files comes from slice frontmatter or body
   inference (`touches-files.mts:136-152`), not FEAT proposed_slices. Field
   mismatch: planner reads `composite_score`, `pm_strategic_fit`,
   `pm_risk_level` (planner.mts:259-263) while intake writes
   `pm_composite_priority`, `pm_strategic_alignment`, `pm_technical_risk`
   (pm-apply.mts:410, intake.mts:187) → ranking flat; the
   "autonomous_safe=false AND pm_risk_level>=0.7" pre-flight
   (planner.mts:183,209) never drops FEAT-031/032. `depends_on` honoured
   (planner.mts:216-221) but only against done/ → wave 2 cannot plan until
   wave 1 FEATs are closed to done. FEAT-031's five slices materialize at
   once (feature-lifecycle.mts:326); packWave rejects only on file conflict
   → registry.mts / dispatch.mts slices run in parallel, breaking the
   sequential intent. `bun loop.mts wave run` cannot dispatch headless
   (`wave/real-deps.mts:3-6`); `/devcrew:wave run` slash flow required.
   **BLOCKER for the execution section as written.**
7. **"T11 can install the branch as a local plugin."** Hard rule: never
   register a local plugin marketplace (CLAUDE.md,
   `crew/.claude/crew/plugin-marketplace.md`). Docs sanction
   `claude --plugin-dir <path>` and `CLAUDE_CODE_PLUGIN_DIRS`;
   `claude plugin install --from` is undocumented; T11's fallback violates
   the rule. `--plugin-dir` loads in place (worktree has node_modules) and
   dep auto-install does not apply → "node_modules absent" assertion proves
   nothing unless the tree is copied without node_modules first. Live
   registry pins devcrew 1.1.0 to astragenie/dev-crew with NO ref → the only
   way to exercise the real cache path is pushing main, forbidden until
   sign-off. Circular. **MAJOR.**
8. **"Removing the constitution include is a hand-edit outside marker
   blocks."** `CLAUDE.md:199-202` places it INSIDE `<!-- crew:start -->`,
   regenerated by `crew/scripts/lib/installer/claude-md.mts`; snapshot
   include at `CLAUDE.md:227` is outside (hand-editable) but
   `src/scripts/lib/memory-snapshot.mts:439` tells agents to re-add it.
   Bytes: CLAUDE.md 12,288, AGENTS.md 8,438, constitution 3,692, snapshot
   2,162, global ~/.claude includes 6,979 (total 33,559). Removing both
   includes → ~27.7 KB vs 12,288 budget; CLAUDE.md alone equals the budget.
   T10's CI step targets a retry that does not exist (ci.yml:49-53 e2e-smoke
   never runs; ci.yml:234 is max_attempts=2 on slow-tests). **BLOCKER for
   T10 acceptance.**
9. **"Restructuring now is justified before usage data."** T8, T10, T7's
   classifier, T6's single report contract are restructurings. T8 has no
   measurement here; T10 has a measurement but no failure; T7 is a defect
   fix only for the empty-diff case. Codex #24/#28/#29: enforcement first,
   measure before restructuring. FEAT-031 is 8 of 43 points. **MAJOR
   (scope).**
10. **"Sole operator, no consumers affected."** CHANGELOG.md:49-51: 20
    adopter repos migrated to devcrew; registry pins devcrew to
    astragenie/dev-crew with no ref → ANY push to main ships to every new
    install/update regardless of version string. No compatibility note for
    adopters who must re-run `/devcrew:install` after T10 changes templates;
    commands path rewrite to dist/ bricks every command if dist/ is absent in
    a consumer tree; `validate-marketplace-sync.mts:22` flags a local 1.2.0
    bump until the registry moves (advisory). Local marketplace clone stale
    (2026-08-03); no devcrew cache here → baseline was produced elsewhere
    (handoff says CLI 2.1.318; here 2.1.270). **MINOR for plan, MAJOR for
    the "re-verify baseline" step.**

Added:
- A. Line numbers: refs are 91 (crew.mts) + 42 (loop.mts) in commands/*.md,
  not 85/37; other cited lines verify. MINOR.
- B. T9 pricing keys: `session-cost.mts:27-34` is startsWith; adding
  `claude-opus-5-5` leaves `claude-opus-5`, `claude-haiku-4-5-20251001` on
  fallback. Path bug confirmed (`session-cost.mts:21`, no
  decodeURIComponent). MINOR.
- C. has-consumer-ci keys on `stack.build[].cmd`; here stack.build[0] is
  `bun run lint`; tests live under `stack.test` (`.claude/loop.json:30-55`).
  MINOR.
- D. T2 externals safe: otel hooks lazy-import behind bridgeEnabled
  (`crew/hooks/otel-post-tool-use.mts:11-14`); zod is the static crash.
  Holds.
- E. T4 test calls `registerWorkflowArtifact(repo, kind, fields)`; real
  signature is `(repoPath, artifact: ArtifactRef, fields)` (write.mts:933).
  MINOR.
- F. Hook `timeout` is seconds per docs; "+1 s" fine. Holds.

**Three most likely false:** (1) "cache never runs an install" — fixable
eligibility, not platform limit; (2) "requiring --decision is a safe P0
fix" — breaks six decision-less scaffolds; (3) "wave plan / wave run will
execute the tabled waves" — planner reads slices not FEATs, wrong PM field
names, parallelizes FEAT-031 slices, CLI cannot dispatch headless. Close
fourth: (8) T10 budget unreachable + marker-block rule.

Open check the reviewer could not settle read-only: whether Claude Code
loads `.claude-plugin/hooks/hooks.json` at all.

## Lead's verification (same session)

- runner@astra is enabled (`~/.claude/settings.json:107`), ships
  `.claude-plugin/hooks/hooks.json` (same layout as devcrew), and its
  SessionStart `bootstrap-context.mjs:62` writes stdout unconditionally.
  This session's SessionStart carried only caveman + superpowers output —
  no runner block. crew 0.67.0 (layout `hooks/hooks.json`) demonstrably ran
  (checkpoint-cadence state written). Caveman declares hooks via the manifest
  `hooks` key. Strong empirical signal that `.claude-plugin/hooks/hooks.json`
  is NOT loaded; docs lookup pending.
