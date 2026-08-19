# Competitive Audit — Astra Stack vs otta.build vs COG-second-brain

> Execution prompt. Paste into a fresh Claude Code session at `C:\work\mega`.
> Revision 2 — addresses review: subject-count fix, GEPA-as-capability, N/A
> normalization, evidence reproducibility, Playwright fallback, comparison
> pairing, repo-freshness baseline, confidence labels, anti-copying filter,
> citation-effort calibration.

## Mission

Perform an honest, evidence-backed competitive audit of the Astra development
stack and two competitor products. Apply one centrally controlled rubric,
identify plainly what we lack, and produce a prioritized adoption list from
otta.build and COG-second-brain. otta is especially relevant for UX,
onboarding, positioning, feature presentation, demos, and promotion.

No home-team bias. For every applicable comparison dimension, explicitly
answer: **what does the competitor do better than us?**

Distinguish implementation, documentation, marketing claims, and demonstrated
usage. A feature that exists in source but is not integrated, exercised, or
useful must not receive the same credit as a proven feature.

## Subjects (six)

Score all **six** subjects. The otta.build website and the otta plugin
repository are **two evidence surfaces for the single "otta" subject**, not
separate subjects.

### Astra implementation subjects

1. **dev-team / crew plugin** — `C:\work\mega\dev-team`
   Specialist-agent orchestration: builder/reviewer/validator ladder, slice
   ceremony, worktree parallelism, ship/review gates.

2. **runner-plugin / loop** — `C:\work\mega\runner-plugin`
   dev-crew method layer over crew: autonomous backlog walking, PM
   triage, architect gate, wave mode, halt badges, cost telemetry, marathon
   checkpoints.

3. **GEPA capability** — `C:\work\mega\gepa-core` plus the `devcrew:gepa-*`
   commands in dev-team (`gepa-optimize`, `gepa-eval`, `gepa-history`, rubric
   agents under `agents/*.gepa*`). Determine what works today, what is
   partially implemented, what is stubbed, and whether gepa-core is active,
   integrated-but-diverged, orphaned, or superseded relative to dev-team.
   **GEPA is evaluated as a capability module, not a standalone commercial
   product. Score applicable dimensions but do NOT compute a product-wide
   aggregate score for GEPA.**

4. **astramem memory integration**
   Daemon: `C:\work\mega\astramem-local`
   Consumer seam: `C:\work\mega\plugins-common` (astramem-client)
   MCP wiring in dev-team (crew plugin).
   Inspect recall, remember, feedback ranking, consolidation, entity graph,
   integration ergonomics, and measured usefulness. Current usefulness
   telemetry: **served=862, used=14, rate=1.6%**. Treat this as a primary
   finding, not a footnote — investigate what "served" and "used" actually
   mean in the telemetry code before drawing conclusions.

### Competitor subjects

5. **otta** — one subject, two evidence surfaces:
   - Website: https://otta.build — audit live using Playwright MCP
     (`browser_navigate` + `browser_snapshot` + `browser_take_screenshot`).
     **Fallback:** if Playwright MCP is unavailable, use the strongest
     available browser/fetch tool, record the limitation in the methodology
     section, and lower evidence confidence. Do NOT silently replace the
     live-site audit with search snippets or README content.
     Walk landing page, docs, installation, pricing, onboarding, any
     accessible demo. Capture: value-proposition copy, time-to-first-value,
     visual polish, demo assets (GIF/video/playground), social proof,
     waitlist/conversion mechanics, feature presentation, distribution and
     promo tactics.
   - Repository: https://github.com/otta-build/plugin — clone into the
     session scratch directory (never into an Astra repo). Inspect
     architecture, command/agent surface, install flow, docs quality, tests,
     release cadence, stars/issues/community signals.

6. **COG-second-brain** — https://github.com/huytieu/COG-second-brain
   Clone into scratch. Focus: capture model, recall/retrieval, ranking,
   feedback, persistence, consolidation, context injection, integration
   story, tests, operational maturity.

## Primary comparison pairs

Narrative comparisons MUST follow these pairs; do not force irrelevant
cross-category comparisons (e.g. COG vs runner-plugin on marketing):

- **dev-team + runner-plugin + GEPA ↔ otta**
- **astramem ↔ COG-second-brain**

The full scorecard may contain all six subjects; the head-to-head narratives
follow the pairs above.

## Repository baseline (capture BEFORE scoring)

For every local and cloned repository record:

- repo path or URL
- current/default branch
- HEAD commit SHA
- latest commit date
- dirty working-tree status (local repos)
- release/manifest version where present
- audit access date

For **gepa-core** specifically: determine whether dev-team imports/invokes
the current implementation, contains a divergent copy, or no longer uses it.
Label it one of: `active`, `integrated-but-diverged`, `orphaned`,
`superseded` — with evidence.

Do not modify dirty files or normalize repository state.

## Rubric (0–10 per applicable dimension)

1. Install & onboarding UX (time-to-first-value, error paths, prerequisites)
2. Docs & README quality (can a stranger succeed in 10 minutes?)
3. Marketing, positioning & promotion (copy, visuals, demos, social proof)
4. Orchestration depth (agents, parallelism, gates, ceremony)
5. Autonomy & safety (unattended operation, halt conditions, cost control)
6. Memory (capture → recall → ranking → feedback loop; measured usefulness)
7. Prompt/self-optimization (GEPA or equivalent)
8. Telemetry & observability (what can an operator actually see?)
9. Developer experience (command ergonomics, config surface, error messages)
10. Community & distribution (marketplace, install path, stars, activity)

### Scoring anchors

- **0** — absent and clearly applicable
- **1–2** — claim, placeholder, or nonfunctional surface
- **3–4** — basic implementation with important gaps
- **5–6** — useful but incomplete or poorly integrated
- **7–8** — strong, usable, supported by evidence
- **9** — unusually complete and polished
- **10** — category-leading, proven, hard to improve materially

### Citation-effort calibration

- Every numeric score: at least one directly supporting evidence reference.
- Scores 0–3 and 8–10: stronger justification (they are strong conclusions).
- N/A: one-phrase scope explanation.
- Major conclusions: multiple independent sources.

### N/A handling and aggregation

- Use N/A only when a dimension is genuinely outside the subject's intended
  scope. Explain every N/A briefly.
- **Exclude N/A cells from averages; never convert N/A to zero.**
- Show both raw dimension scores and an applicability-adjusted average.
- Do not use the adjusted average as the sole ranking or conclusion; explain
  category fit separately.
- All applicable dimensions equally weighted; a second, strategic weighting
  (relevance to Astra's roadmap) may be presented explicitly alongside.
- GEPA receives dimension scores but **no standalone product aggregate**.

### Honesty rules

- No evidence → maximum score of 3.
- A README claim is not implementation evidence.
- Existing code is not automatically integrated functionality.
- Integrated functionality is not automatically adopted or useful.
- State a competitor advantage plainly even when it makes Astra look weak.
- If a competitor README or onboarding flow is better than ours, say so with
  a short excerpt or precise reference.
- No points for planned work, TODOs, dead code, inaccessible demos, or
  implied architecture.
- Record contradictory evidence; do not select only the favorable
  interpretation.

### Evidence confidence labels

Label every score:

- **High** — source, tests, runtime artifacts, or direct browser observation
- **Medium** — consistent documentation or multiple indirect signals
- **Low** — incomplete, marketing-only, or inferential evidence

### Evidence format (reproducible citations)

- Local source: `repo-relative/path.ext:L12-L38`
- Cloned competitor source: `<repo>@<commit-sha>:path.ext:L12-L38`
- Website: exact page URL + access date + local screenshot filename
- Repository metadata: exact repo URL + retrieval date
- Runtime-generated or minified files: cite the nearest stable source file
  and explain why exact lines are unavailable.
- Label each piece of evidence: `implemented` | `tested` | `documented` |
  `marketed` | `observed-in-live-flow` | `measured-in-usage` | `inferred`.
- README claims must be labeled as documented claims unless confirmed in
  source or tests.

## Method

Fan out read-only research in parallel:

- one reader for dev-team
- one reader for runner-plugin
- one reader for gepa-core + the GEPA seams in dev-team
- one reader for the astramem repos + MCP integration
- one market researcher for the otta.build site (browser)
- one reader for the cloned otta plugin repo
- one reader for COG-second-brain

Researchers collect evidence and preliminary observations only — they must
NOT assign final scores. The main thread performs one synthesis pass and
assigns all final scores centrally so the rubric is applied consistently.
Resolve conflicting researcher findings by returning to primary evidence.

## Deliverables

Write the final report to:
`C:\work\mega\runner-plugin\docs\research\2026-07-18-competitive-audit.md`

### 1. Executive summary
- three most important competitor advantages
- three most serious Astra gaps
- strongest defensible Astra advantage
- highest-priority action for the next two weeks

### 2. Methodology & baseline
Repo SHAs, access dates, tooling limitations, unavailable pages, evidence
gaps.

### 3. Scorecard
Subjects × dimensions: score, confidence label, compact citation per
applicable cell; raw + applicability-adjusted averages (no aggregate for
GEPA).

### 4. Per-subject analysis
Demonstrated strengths; implementation gaps; adoption/usefulness gaps;
docs/onboarding gaps; what the relevant competitor does better; what Astra
does better; misleading or unsupported claims, if any.

### 5. Head-to-head comparisons
- astramem vs COG-second-brain
- crew + loop + GEPA vs otta

Separate: feature breadth, implementation depth, usability, evidence of
adoption, positioning and distribution.

### 6. Prioritized adoption list (top 10)
From otta and COG. Each item:
- recommendation
- observed user or distribution advantage
- evidence
- **copy / adapt / reject** verdict on the competitor approach
- strategic fit for Astra (why it fits our architecture and users)
- destination repository
- dependencies + likely maintenance cost
- effort (S/M/L), expected impact, implementation risk
- suggested sequencing

Do NOT recommend a feature merely because a competitor has it.

### 7. FEAT drafts (top 3–5)
Ready for `/devcrew:intake`, each with: title, target repo, problem,
user/operator value, proposed scope, acceptance criteria, exclusions,
dependencies, evidence links. **Do not create backlog files** — keep drafts
inside the report for operator review.

### 8. Evidence appendix
Source inventory; website pages visited; screenshot index; cloned competitor
SHAs; unresolved questions; claims that could not be verified.

## Screenshots

Save key otta.build pages next to the report with descriptive names
(`otta-landing.png`, `otta-install.png`, `otta-onboarding.png`,
`otta-pricing.png`, `otta-demo.png`). Reference filenames from the report.
Capture only pages/states that support meaningful findings.

## Constraints

- All Astra repositories are read-only.
- Writes allowed only under `C:\work\mega\runner-plugin\docs\research\**`.
- Competitor repos clone into the session scratch directory only.
- No commits, no branches, no PRs, no direct backlog changes.
- Do not install or execute untrusted competitor code unless required for a
  clearly identified verification step and safe to do so.
- Do not expose secrets, environment variables, private URLs, or credentials
  in the report.
- A claim without a file reference, stable URL, screenshot, repo-metadata
  reference, or clearly labeled inference is an opinion, not a finding.
- If a required tool or page is unavailable: continue with remaining
  evidence, document the limitation, lower confidence — never invent a
  conclusion.
