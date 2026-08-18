# Demolition synthesis — three adversarial reviews of merge-plan-prompt-v1

Date: 2026-08-18. Reviews: architecture (crew:architect-reviewer, verdict REJECTED, 3 CRITICAL),
prompt-engineering (general-purpose), assumption-challenge (critical-thinking).
Architecture review artifact: `runner-plugin/.claude/artifacts/crew/reviews/20260818T193442Z-review-result-adversarial-review-devcrew-merge-plan-crew-runner-plugin.md`.

## Findings that killed v1

1. **[CRITICAL] Namespace shims are fiction.** Claude Code binds CLI namespace to
   `plugin.json` `name` 1:1 — no multi-namespace mechanism found. v1's P2 ("single
   manifest + alias shims for `/crew:*` and `/runner:*`") cannot ship as written.
   Resolution in v2: no shims. Single `/devcrew:*` namespace, hard cutover, scripted
   migration of local repos. Viable only because of the operator decision below.
2. **[CRITICAL] No options considered.** v1 assumed merge from sentence one. Two real
   alternatives never weighed: (a) versioned shared-contract package — `plugins-common`
   exists and targets exactly the cited rename-phantom/version-skew pain; (c) absorb
   runner as a subdirectory of dev-team, keep two manifests.
3. **[CRITICAL] The cited pain is contract-versioning pain, not two-plugin pain.**
   Every historical incident (crew:inspector rename phantom, 3× MIN_CREW_VERSION bump,
   marketplace drift) maps to "missing shared registry / contract test" — fixable by
   alternative (a) at slice cost.
4. **False "verified" facts.** v1 claimed verification on its own authoring date; spot
   checks: crew hooks = 26 registered (not 22), runner skills = 18 (not 12), upstream
   requests = 13 (not 12), "122 src files reference crew" unreproducible under any
   measurement (89–233 depending on scope). Hardcoded counts rot; v2 replaces them with
   discovery commands.
5. **Phase-stall precedent.** plugins-common's consumer wiring stalled ~6 weeks after
   its DEC (2026-07-08). A phased program with no forcing function repeats that.
6. **Sequencing bug.** Seam elimination (direct imports) before runtime unification
   reintroduces in-process the bun/node skew the execFile bridge deliberately absorbs.
   The bridge's process isolation is load-bearing today (`crewCliRuntime()` branches
   bun/node by extension; calls are fail-soft). v2 orders runtime unification first.
7. **No break-even math.** Seam cost per incident vs merge program cost never
   estimated, despite slice-cost data existing in runner-plugin `docs/memory.md`.
8. **Unnamed risks:** GEPA `prior_prompt_hash` promotion pointers invalidated by
   history rewrite; astramem `memory.project` identity fracture (~90k records under
   `runner-plugin`); `docs/halt-badges.md` SPEC-003 cross-plugin contract missing from
   must-survive list; `.claude/loop.json` + crew config schema merge with no adopter
   migration; loss of the MIN_CREW_VERSION pin as a de-risking lever.

## Operator decisions that changed the calculus (2026-08-18, after reviews dispatched)

- **Sole operator, no external installs to protect.** Kills the adopter-breakage
  top-risk and the shim/deprecation phases. Hard namespace cutover + one migration
  script over ~9 local repos (enumerable by grep) is acceptable.
- **Bun-first**: `.mts` + `bun test --parallel` wherever possible; dev-team's ADR-002
  Node fallback and no-parallel workaround are legacy to migrate off (verify the Bun
  scheduler bug first; quarantine offenders, don't serialize globally).
- **Branding**: "Wiggin Loop" retired; methodology and plugin are both **dev-crew**
  (plugin id `devcrew`). Scrub during content import.
- Target repo `C:\mega\dev-crew` created; crew + runner harness installed there; the
  merge plans/builds itself through its own ceremony.

## Honest residual

The strongest surviving objection is architecture-review finding 3: a finished
plugins-common contract package retires the named pain cheaper, and repo co-location
(alternative c) captures "one repo" without plugin-identity risk. The operator chose
full unification anyway — legitimate under sole-operator economics (no external blast
radius, preference for one release train and one surface, willingness to pay the
cutover). v2's decision-record section requires the plan to state this trade
explicitly rather than pretend the alternatives lost on technical merit alone.
