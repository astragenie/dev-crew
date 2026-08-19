---
decision: approved
reviewer: crew:reviewer
slice: SLICE-15+16
---

# Independent review — SLICE-15 (agent map merges + trims), SLICE-16 (skill dedupe + manifest rename), P3 stabilization, resolver fix

Consolidated independent pass over the P3 (FEAT-004) surface-merge batch at
`C:/work/mega/devcrew`, all currently uncommitted. Four workflow-verify
stages already ran on this batch; this pass is the read-for-coherence layer
those stages don't cover, plus a re-run of the gate matrix from scratch.

## 1. Merge quality — agents/architect.md, document-writer.md, researcher.md

All three read as single coherent prompts, not stitched fragments.

- **architect.md**: confirmed a genuine two-parent merge, not just a token
  rename. The new "Prompt mode: read-only design" section explicitly
  supersedes what used to be a standalone read-only architect variant
  ("this is the mechanism that replaces the standalone read-only architect
  variant — same agent, lighter-weight output"), and the write-boundary /
  peer-dispatch / SLA-cap contracts from the original are all still present,
  just de-tabled into prose. No contradictions found.
- **document-writer.md**, **researcher.md**: additions are coherent with
  existing structure — researcher picked up an injection-defense section, a
  market-researcher redirect rule, and a default output-block template;
  document-writer picked up `disallowedTools: NotebookEdit` and consistent
  `devcrew:`/`crew:` token updates. No duplicated or conflicting sections.

## 2. Trimmed agents (verifier, backend-dev, release-engineer, architect)

Line counts after trim: `architect.md` 300, `backend-dev.md` 299,
`release-engineer.md` 287, `verifier.md` 299 — all at or under the 300 cap
(AC-3), confirmed by `validate-content-length.mts` (green, see §5).

Read each diff in full rather than trusting the line-count delta:

- Compression is real prose-tightening (lists → dense paragraphs) and
  cross-agent dedup ("Context efficiency" sections in verifier/backend-dev/
  release-engineer now point at "the shared pattern used across
  researcher/architect/verifier/document-writer agents" instead of repeating
  the same four bullets four times) — no operational rule lost. Spot-checked
  backend-dev's "Query shape review" collapse (7 items → 2): the 5 dropped
  items (projection, index, cardinality, pagination, N+1) are still covered
  either in the adjacent "Performance escalation path" section or in two
  other N+1-specific bullets elsewhere in the same file (`grep -n "N+1"
  agents/backend-dev.md` → 3 hits) — genuine dedup, not loss.
- **Finding (non-blocking, P4-worthy):** `verifier.md`'s trim removed the
  `<!-- pre-loaded-universals:BEGIN hash=... -->` block that
  `crew/scripts/validate-agents.mts`'s `UNIVERSALS_DRIFT_REQUIRED` gate
  requires for the agent named `verifier`. Traced the blast radius: that
  gate is not live anywhere in this repo's actual CI — it's wired only via
  `crew/package.json`'s `validate:agents` script and
  `crew/.github/workflows/test.yml`, and GitHub Actions does not execute
  workflows from a nested `crew/.github/workflows/` path (only the repo-root
  `.github/workflows/` runs, and `ci.yml` there never calls
  `validate-agents.mts`). So this doesn't break a live gate today, but it
  does mean `crew/scripts/validate-agents.mts` + `render-universal-skills.mts`
  are now orphaned machinery referencing a mechanism that no longer exists
  anywhere in the merged tree. P4 should decide: port the pre-rendered-
  universals mechanism forward to root `agents/verifier.md`, or delete the
  now-dead validator + render script pair as part of the content/CI pass.

## 3. Skill folds (SLICE-16, 7 pairs)

Confirmed the general shape: 7 `crew/skills/**` paths were deleted outright
(`domain/prompt-engineering`, `domain/security-advisory`, `meta/skill-creator`,
`universal/writing-claude-md`, `universal/writing-task-handoffs`,
`workflow/commit`, `workflow/review-gates`) and all 7 already have a
surviving counterpart at the merged root `skills/**` — genuine dedupe pairs,
not silent content drops. (`workflow/using-crew` is an 8th deletion with no
replacement — that one's a dead reference, see §6.)

Spot-read 4 of the 7 (more than the requested 3, since the first two were
cheap to check once found):

- **review-gates**: real content fold, not just file selection. The 13-line
  "Silent-failure hunt" subsection (swallowed-error / promise-rejection /
  health-check-tier checklist) existed verbatim in the deleted
  `crew/skills/workflow/review-gates/SKILL.md` and now lives in the merged
  root file — confirmed by grep against the pre-deletion blob
  (`git show HEAD:crew/skills/...`). Also caught and fixed a real bug in
  passing: `crew.mjs` → `crew.mts` in the write-review-result command
  example.
- **commit**, **writing-task-handoffs**, **security-advisory**: frontmatter
  normalized (`prompt_id`/`version` added), `npm`/`node` command examples
  converted to `bun` (matches this repo's Bun-only convention), stale
  `.mjs` script refs fixed to `.mts`, and `lead` → `dispatcher` terminology
  updated to match the post-lead-decommission agent roster. No contradictory
  content, no cap violations (`validate-content-length.mts` green, 79 skill
  files under the 200-line cap).

## 4. Deletion honesty — crew/tests/agent-topology.test.mts

Justification holds on the facts:

- `crew/agents/` no longer exists on disk (`ls crew/agents/` → "No such file
  or directory") — the directory is genuinely dissolved, not just mostly
  emptied. The deleted test hard-coded `AGENTS_ROOT =
  path.join(repoRoot, "agents")` resolved relative to its own
  `crew/tests/` location, i.e. `crew/agents/` — it would have failed
  (0 agents found vs. a 23-name `EXPECTED_AGENTS` set) the moment the
  directory moved, regardless of whether anyone deleted the test file.
- **Finding (flag per the requested framing, P4 gap not a blocker):** no
  other test anywhere in the tree (`src/tests/`, `crew/tests/`) asserts
  "root `agents/` contains exactly the expected set." Confirmed via grep for
  `EXPECTED_AGENTS`/`agent-topology` across both test roots — zero hits. The
  invariant this test protected (an agent can't be silently added or
  removed without a deliberate roster update) is real and now genuinely
  uncovered — root `agents/` currently holds 26 top-level `.md` files vs.
  the old 23-name crew-side list, so a fresh test would need a new roster
  anyway (it'd need to add the runner-side agents: `pm`, `swarm`,
  `market-researcher`, plus whichever else). Worth a P4 slice, not a
  blocker on this batch.

## 5. Resolver fix (crew/scripts/lib/dispatch/resolve-token.mts + 2 callers)

Read the 3-file diff in full.

- **Split is sound.** `createTokenResolver` now accepts either a bare string
  (back-compat: `{ surfaceRoot: roots, docsRoot: roots }`) or a
  `{ surfaceRoot, docsRoot? }` object where `docsRoot` defaults to
  `surfaceRoot` when omitted. Traced the default-merge expression
  (`{ docsRoot: roots.surfaceRoot, ...roots }`) by hand for both the
  omitted- and provided-`docsRoot` cases — correct in both. (Minor
  theoretical edge case: an explicit `docsRoot: undefined` in the object
  form would override the default with `undefined` rather than falling
  back — not reachable through any real call site in this diff, not worth
  blocking on.)
- **Callers correct.** Both `validate-agent-refs.mts` and
  `validate-configs.mts` compute `SURFACE_ROOT = path.resolve(REPO_ROOT,
  "..")` (monorepo root, since both scripts live under `crew/scripts/`) and
  pass `{ surfaceRoot: SURFACE_ROOT, docsRoot: REPO_ROOT }` in production,
  while preserving single-root behavior when a `repoRoot` is passed
  explicitly (test fixtures). Ran both suites directly:
  `bun test tests/validate-configs.test.mts tests/validate-agent-refs.test.mts`
  from `crew/` → **25 pass / 0 fail**.
- **crew/.claude zero-diff confirmed independently**: `git status --porcelain
  -- crew/.claude/` and `git diff --stat` / `git diff --cached --stat -- crew/.claude/`
  all return empty. The handoff's claim that `workflow-config.mts`'s
  cwd-relative default reads `crew/.claude/workflows.yaml` (so it had to be
  restored rather than deleted) checks out against the current tree state.

## 6. Gate matrix — re-run from scratch, not trusted from prior reports

| Gate | Result |
|---|---|
| `bun ./src/scripts/validate-manifests.mts` | OK — `devcrew@1.0.0-rc.1` (plugin.json + package.json), marketplace.json absent (expected, registry-based) |
| `bun ./src/scripts/validate-content-length.mts` | OK — agents (28 enforced / 14 exempt, cap 300), skills (79 files, cap 200) |
| `bun ./src/scripts/validate-agent-refs.mts` (root) | OK — zero phantom refs |
| `bun ./src/scripts/validate-imports.mts` | OK |
| `bunx tsc --project tsconfig.json --noEmit` | 0 errors |
| `bunx tsc --project tsconfig.test.json --noEmit` | 0 errors |
| `crew/` `bunx tsc --noEmit` | 0 errors |
| `bun test src/tests/ --parallel --timeout 60000` | **3316 pass / 7 skip / 2 fail** — matches the claimed "3316/2 known." The 2 failures (`DEC-070 contract record exists for FEAT-229`, `DEC-068 contract record exists for FEAT-222`) are pre-existing content-linkage assertions on unrelated historical FEATs, not anything touched by this batch. |
| `crew/` `bun test tests/ --parallel --timeout 60000` | **1969 pass / 117 skip / 0 fail** — matches "crew suite 0 fail" |

All numbers independently reproduced, not copied from the workflow-verify
summaries.

## 7. Residual crew-side validator findings — partially content debt, one real bug

Ran both crew-side validators directly rather than trusting the count:
`crew/scripts/validate-agent-refs.mts` → 6 findings, `crew/scripts/validate-configs.mts`
→ 2 findings (overlapping — `crew:brief-me` appears in both runs).

Broke down all 6 `validate-agent-refs` findings by reading each one in
context:

- **Confirmed content debt / negation-prose false positives (4 of 6):**
  `.claude/loop/rules.md:59` — `crew:builder` inside "never `crew:builder`,
  which is not an agent" (×1, plus the doubled entry from validate-configs
  scanning the same file) — the validator's regex can't distinguish a
  negated mention from a real dispatch token. `agents/pm.md:253` —
  `crew:lead` inside "There is no `crew:lead` step in this repo
  (decommissioned 2026-06-07)" — same pattern, explicitly says the token
  doesn't resolve.
- **Confirmed dead routing-table entries (2, from validate-configs):**
  `crew:using-crew` (routing-table.yaml workflow-signals row — no matching
  skill anywhere in the repo, matches the resolver handoff's own note that
  this is "likely dead content from the original dev-team subtree import")
  and `crew:brief-me` (`commands/brief.md` prose referencing a retired
  command name, `docs/routing-table.yaml` row referencing the same).
- **Finding — not pure content debt (worth flagging separately from the
  rest):** `.claude/loop/rules.md:39` — `` dispatch `crew:reviewer`, then
  `crew:validator` if behavior changed ``. Unlike the `crew:builder`
  mentions on the same two lines, this is not negated prose — it reads as a
  literal (mistaken) dispatch instruction in the autonomous loop's own HARD
  RULES. There is no agent named `validator` anywhere in the merged tree;
  the actual owned agent is `verifier` (`agents/verifier.md`), and every
  other agent's peer-dispatch list in this batch (architect.md, backend-dev.md,
  release-engineer.md all diffed above) consistently says
  `devcrew:verifier`, not `devcrew:validator`. This looks like the same
  "validator" vs. "verifier" terminology drift the crew constitution
  documents at the *role* level (constitution.md's "Team Roles" list calls
  the role `validator` while the concrete agent is `verifier`) leaking into
  a machine-parseable rules file where it now matches the phantom-token
  regex for real. Recommend P4 either rename the two rules.md hits to
  `crew:verifier` (if that's what was meant) or add them to
  `docs/routing-table.yaml`'s forward-reference allowlist as a deliberate
  role-name alias — but don't wave this pair through with the same "false
  positive" label as the `crew:builder` ones; they're a different kind of
  finding.

## Decision

**approved.** Every claim I could independently re-derive checked out: gate
matrix matches the reported numbers exactly (3316/2, 1969/0, all four
validators + three tsc runs green), the resolver fix is sound and its two
target test files pass 25/25, `crew/.claude` is genuinely untouched, the
agent merges and skill folds are real content merges (not selection-only),
and the topology-test deletion is honestly justified. Two non-blocking
findings for P4 to pick up: the orphaned `pre-loaded-universals` mechanism
in `crew/scripts/validate-agents.mts` (dead but not live-gated), the
uncovered "agents/ contains exactly N" invariant, and the `crew:validator`
vs. `crew:verifier` drift in `.claude/loop/rules.md` (distinct from the
other 4 genuine false-positive findings — recommend an actual fix, not just
an acknowledgment).
