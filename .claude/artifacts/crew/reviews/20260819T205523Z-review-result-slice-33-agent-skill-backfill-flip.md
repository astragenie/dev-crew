---
decision: approved
reviewer: crew:reviewer
slice: SLICE-33
reviewed_commits: [1617eadf]
---

# Review — SLICE-33 (FEAT-015): agent/skill content backfill + validate-agents/skills flip to blocking

## Summary

Commit `1617eadf` clears pre-existing content debt (missing prompt_id/
version/report-contract, dangling eval pointers, a skill naming
inconsistency) and flips `validate-agents.mts`/`validate-skills.mts` from
advisory to blocking in the CI aggregate. I verified every claim
adversarially rather than trusting the commit message: diffed the two
validators against the parent commit (genuinely untouched), independently
ran all four exception claims (including empirically simulating a bare CI
environment for the universals-hash-drift check, not just reading the
code), read the three new "## Report contract" sections for genuine
content, hand-counted gate numbering across all three sources, and ran the
targeted suites. **Decision: approved.**

## 1. No validator weakened

`git diff 1617eadf^ 1617eadf -- crew/scripts/validate-agents.mts
crew/scripts/validate-skills.mts` → **zero lines of diff**. Both files are
byte-identical to the parent commit. The only change is in
`crew/scripts/validate-all.mts`: `validate-skills.mts`/`validate-agents.mts`
moved from the `advisoryValidators` array into `validators`, and
`advisoryValidators` is now empty — a pure reclassification in the
aggregator, no check logic touched. Confirmed by running
`crew/scripts/validate-all.mts` directly: `✓ validate-manifests.mts / ✓
validate-slices.mts / ✓ validate-skills.mts / ✓ validate-agents.mts / All 4
validators passed.` — matches the "4-blocking-validator count" the commit
describes.

## 2. Exception claims — all four independently verified

**(a) Skills `devcrew:`-prefix strip.** Read the actual diff for
`skills/loop-discipline/SKILL.md` and `skills/pm-decompose/SKILL.md`:
`name: devcrew:loop-discipline` → `name: loop-discipline` (plus backfilled
`prompt_id`/`version`/`tier`) — this is the skill's own frontmatter
identity field, not a dispatch token. `bun ./src/scripts/validate-agent-refs.mts`
→ `Agent-ref validation OK: no phantom crew:/runner: dispatch references
found`, exit 0. Grepped every `devcrew:loop-discipline` /
`devcrew:pm-decompose` / `devcrew:pm-rescope` / `devcrew:pm-review` /
`devcrew:triage` reference across `commands/`, `skills/`, `agents/`,
`CLAUDE.md` — all of these are live dispatch-token usages (Skill-tool
invocations, slash commands), a different namespace convention from the
skill's own `name:` field, and none of them broke — confirming the
resolution genuinely keys off directory name, not frontmatter, exactly as
claimed.

**(b) Evals repoint.** `git show 1617eadf -- agents/market-researcher.md
agents/pm.md agents/swarm.md` shows no `evals:` field on those 3 (they
don't have eval specs), so I widened the check to all 9 repointed files
(`grep -rn "evals/agents" agents/*.md`), spot-checked 4 of the 9 real paths
on disk: `crew/evals/agents/crew-aiplugin-dev.yaml`,
`crew-backend-dev.yaml`, `crew-verifier.yaml`, `crew-fullstack-dev.yaml` —
all exist. Confirmed the old pre-repoint path
(`evals/agents/crew-aiplugin-dev.yaml`) is genuinely gone.

**(c) Verifier universals marker degrades to skip, not fail.** Read
`crew/scripts/validate-agents.mts`'s `getExpectedUniversalsHash()`: it
spawns `render-universal-skills.mts --print-hash`; on non-zero exit,
`cachedExpectedHash = ""` and `checkUniversalsHash` returns early
(advisory skip) rather than erroring. Rather than trusting this reading, I
**empirically simulated a bare CI env** — redirected `HOME`/`USERPROFILE`
to a fresh directory with no `.claude/plugins/cache/` (confirmed via
`os.homedir()` that the redirect genuinely took effect) — and ran
`bun crew/scripts/validate-agents.mts` fresh: still `Agents OK: 26 agent(s)
checked, 14 3rdparty agent(s) checked`, exit 0. The drift check silently
skipped as designed; it did not fail. Also ran it once more in the normal
environment (real plugin cache present) to confirm the hash currently
matches — `Agents OK` there too, meaning the injected marker's hash is
actually correct today, not just skipped by luck.

**(d) Content-length overrides use the existing table mechanism.** Diff
shows `AGENT_LINE_OVERRIDES["agents/pm.md"]` bumped 335→345 and a new
`AGENT_LINE_OVERRIDES["agents/verifier.md"] = 345` entry — the established
per-file table, comment explicitly says "Bump per file, never the global
default." Confirmed `AGENT_MAX_LINES = 300` (the global default) is
untouched. Confirmed actual line counts: `pm.md` = 344 lines (under 345),
`verifier.md` = 339 lines (under 345) — both fit their new caps with
headroom, not padded to the limit. `bun src/scripts/validate-content-length.mts`
→ `Content length OK: agents (28 enforced, 14 exempt, cap=300 lines)`,
exit 0.

## 3. Content quality — the three new "## Report contract" sections

Read all three in full (`market-researcher.md`, `pm.md`, `swarm.md`). None
are boilerplate — each describes that specific agent's real, distinct
deliverable and cross-references an existing section by name:
- `market-researcher`: "the deliverable is the markdown block defined in
  'Your output contract' above" — the referenced heading exists at line 23.
- `pm`: "the deliverable is the JSON block... `pm-apply` reads the JSON
  directly from your response" — the referenced heading exists at line 21.
- `swarm`: "the deliverable is the 'Return to caller' block above...
  Children's own completion artifacts... already carry the detail; do not
  duplicate them here" — the referenced heading exists at line 105.

All three cross-references resolve to real sections (checked via grep), not
dangling. `prompt_id`/`version: 1.0.0` were backfilled on all three,
consistent with every other owned agent's machine-contract fields.

## 4. Machine contracts

- **`CLAUDE.md` size**: `wc -c CLAUDE.md` → **12,260 bytes**, under the
  12,288-byte limit with 28 bytes of headroom.
- **`generate-metrics-band.mts --check`**: `README.md metrics band is up to
  date`, exit 0.
- **Gate numbering, hand-counted across all three sources**: `docs/ci-gates.md`
  and `CLAUDE.md` both list exactly 41 numbered gates, and agree
  entry-for-entry: `#29 = crew/scripts/validate-agents.mts` (no "(advisory)"
  suffix — blocking), `#30 = crew/scripts/validate-skills.mts` (blocking),
  `#31-34` = the 4 remaining advisory gates (`validate-syntheses.mts`,
  `validate-routing-table.mts` full-coverage, `validate-adr-template.mts
  --strict`, `validate-backlog-drift.mts`), each explicitly marked
  "(advisory)". Cross-checked against `.github/workflows/ci.yml`'s actual
  `validators:`/`advisory-validators:` blocks: the plain `validators:` list
  ends with `validate-agents.mts` then `validate-skills.mts` (matching
  #29/#30), and `advisory-validators:` contains exactly those same 4 items
  in the same order (matching #31-34). Order and count are consistent
  across ci.yml, docs/ci-gates.md, and CLAUDE.md.

## 5. Targeted suites

- `bun test crew/tests/validate-all.test.mts`: **2 pass, 0 fail**.
- `bun src/scripts/validate-agent-refs.mts`: OK, exit 0.
- `bun crew/scripts/validate-agents.mts`: OK (26 + 14 3rdparty), exit 0 —
  run twice (real env + simulated bare env), both clean.
- `bun crew/scripts/validate-skills.mts`: `Skills OK: 79 skill(s) checked`,
  exit 0 (prints several pre-existing advisory `!` warnings on unrelated
  skills — confirmed these are non-blocking within the script itself, not
  something this slice introduced or needs to clear, since the script is
  byte-identical to its parent commit).
- `bun src/scripts/validate-content-length.mts`: OK, exit 0.
- `bun src/scripts/validate-manifests.mts` + `bun crew/scripts/validate-manifests.mts`:
  both OK.
- `bun src/scripts/generate-metrics-band.mts --check`: up to date.

## Decision rationale

`approved`. The flip itself is minimal and correctly scoped — only the
aggregator's classification changed, both underlying validators are
byte-identical to before. Every one of the four exception claims held up
under adversarial testing, not just code-reading: I empirically forced the
bare-CI-env code path for the universals-hash check rather than trusting
the read, spot-checked real files on disk for the evals repoint, and
independently grepped for dangling references after the skill-name strip.
The three new Report-contract sections are genuinely agent-specific, not
templated filler, and their cross-references resolve. Gate numbering is
consistent across all three sources I was asked to hand-count, and
CLAUDE.md is comfortably under its byte budget. All targeted suites pass.
