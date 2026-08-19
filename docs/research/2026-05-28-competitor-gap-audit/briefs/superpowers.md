---
competitor: superpowers
host: CC plugin
language: Markdown / shell
license: MIT
version_observed: 5.1.0
sources: [https://github.com/obra/superpowers]
brief_version: 1
---

# superpowers -- competitor brief

## Identity

- Name: superpowers
- Host: CC plugin (also Codex CLI, Codex App, Factory Droid, Gemini CLI, OpenCode, Cursor, GitHub Copilot CLI)
- Language: Markdown / shell
- Install model: Official Claude plugin marketplace or superpowers-marketplace; package.json v5.1.0
- Version observed: 5.1.0
- License: MIT

Superpowers is a zero-dependency, harness-agnostic software development methodology plugin with 14 Markdown skill files and a SessionStart hook that injects the using-superpowers bootstrap into every session. Skills auto-trigger via the harness Skill tool with no explicit user invocation required. The core workflow is: brainstorm -> design doc -> implementation plan -> subagent-driven execution with per-task two-stage review (spec compliance then code quality) -> branch finishing. It enforces TDD as an Iron Law (RED-GREEN-REFACTOR, delete code written before tests), root-cause-first debugging, and evidence-before-claims verification. There is no server-side telemetry, no backlog primitives, and no crew-style role separation.

## Matrix row

| Axis                   | Symbol | 1-line note                                                                 |
| ---------------------- | ------ | --------------------------------------------------------------------------- |
| Workflow phases        | ◐      | Named phases (brainstorm->plan->execute->review->finish) but no phase-gate runner that evaluates criteria and blocks on FAIL |
| Roles / dispatch       | ◐      | Implementer + spec-reviewer + quality-reviewer subagent pattern; no named crew roles (lead/builder/validator/deployer/researcher) |
| Artifacts / state      | ◐      | Writes design docs and plans to docs/superpowers/; no typed artifact-directory schema or handoff format |
| Memory / retention     | ○      | No persistent cross-session state beyond committed files |
| Model routing          | ○      | No per-phase or per-role model selection |
| Cost / telemetry       | ○      | No token/cost reporting, no event logs |
| Backlog / spec         | ○      | No FEAT/SPEC primitives, no priority frontmatter, no autonomous_safe flag |
| Validation / gates     | ◐      | Iron Law verification-before-completion and TDD cycle enforced in skills; no runnable gate returning structured PASS/FAIL |
| Deployment             | ◐      | finishing-a-development-branch covers merge/PR/discard and git worktree cleanup; no environment evidence or approval gates |
| Install / distribution | ●      | Multi-marketplace (official CC + superpowers-marketplace); multi-harness (8 harnesses); version-pinned via plugin system |

Legend: ● = full coverage, ◐ = partial, ○ = absent.

## Strengths vs loop / crew

- Multi-harness portability. Skills are plain Markdown and run on CC, Codex, Gemini CLI, Cursor, Copilot CLI -- loop/crew are CC-only.
- Iron Law hard-gate framing. HARD-GATE and EXTREMELY-IMPORTANT tags in skill Markdown have demonstrated behaviour-shaping power; violations are framed as rule-breaking not just deviation.
- Socratic brainstorming. Structured clarification-before-code phase with one-question-at-a-time dialogue -- loop/crew have no pre-implementation discovery primitive.
- TDD as first-class Iron Law. RED-GREEN-REFACTOR with delete-code-before-tests enforcement; crew builder guidelines are less prescriptive.
- Systematic debugging skill. 4-phase root-cause-first protocol with explicit anti-shortcuts -- loop/crew have no parallel debugging methodology as a loop primitive.
- Two-stage per-task review. Spec-compliance review then code-quality review dispatched as fresh subagents per task -- crew does one review gate at slice close.
- SessionStart bootstrap injection. Hook injects full skill context before any user turn; more reliable than relying on CLAUDE.md being read after compaction.
- Zero-dependency design. No external tools, no server, no CLI -- reduces install friction across harnesses.

## Weaknesses vs loop / crew

- No backlog or spec management. No FEAT/SPEC primitives, no priority ranking, no autonomous_safe flag -- the human must decide what to build each session; no marathon mode.
- No phase-gate runner. No mechanism that evaluates acceptance criteria and returns structured PASS/FAIL; skills are advisory and can be rationalized past.
- No formal artifact schema. Plans and design docs are untyped files; no handoff format, no review/validation result artifacts under structured directories.
- No cross-session memory. Each session starts blind; loop persists slice state, grade history, decisions, and retrospectives.
- No model routing. All phases use the same model; loop routes cheap tasks to Haiku and expensive tasks to Sonnet/Opus.
- No cost or telemetry. No token accounting, no per-slice cost, no trend analysis.
- No deployment layer. No environment evidence, no dev/prod approval gates.
- No crew role separation. Single agent plays all roles; crew enforces separate ownership per role to prevent self-review bias.
- No autonomous marathon mode. No mechanism to walk a backlog and self-continue without a human between sessions.
- No grade or retrospective system. No grade aggregation, no trend tracking, no loop retrospective.

## Gap candidates

### GAP-1: Iron Law hard-gate tag convention in skill Markdown

- Description: Superpowers uses HARD-GATE and EXTREMELY-IMPORTANT XML-like tags in skill Markdown with tested behaviour-shaping efficacy. loop/crew use free-form HARD RULE prose but lack the standardised tag framing that makes violations explicit and self-documenting.
- Source: skills/brainstorming/SKILL.md, skills/test-driven-development/SKILL.md, skills/verification-before-completion/SKILL.md
- Impact (0-3): 2 -- stronger compliance framing reduces agent rationalization of rule skips in autonomous runs
- Effort (0-3): 1 -- adopting the tag convention is documentation-level work; no architectural change
- Fit (0-3): 3 -- loop already has HARD RULE blocks; standardizing the tag format is additive
- Composite: 2 + (3 - 1) + 3 = 7

### GAP-2: SessionStart hook that injects bootstrap context before any user turn

- Description: Superpowers uses a SessionStart hook to inject the full using-superpowers skill content before the first user message, ensuring rules are present even after context compaction. loop/crew rely on CLAUDE.md being read at session start, which is less reliable in long or compacted sessions.
- Source: hooks/session-start, hooks/hooks.json
- Impact (0-3): 2 -- ensures rules.md and wake-up context survive compaction
- Effort (0-3): 2 -- loop already has hooks infrastructure; extending SessionStart to inject key content is straightforward
- Fit (0-3): 3 -- directly complements existing loop wake-up discipline
- Composite: 2 + (3 - 2) + 3 = 6

### GAP-3: Evidence-before-claims verification gate as a named skill with evidence table

- Description: verification-before-completion is a named skill with an Iron Law (NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE) and a table mapping each claim type to the required command evidence. loop/crew have a validation gate at slice close but no named skill enforcing the evidence table before any success claim mid-task.
- Source: skills/verification-before-completion/SKILL.md
- Impact (0-3): 2 -- reduces false PASS claims during autonomous loop runs
- Effort (0-3): 1 -- documentation-level addition to loop rules or a new loop skill
- Fit (0-3): 3 -- directly strengthens existing slice-close validation gate philosophy
- Composite: 2 + (3 - 1) + 3 = 7

### GAP-4: Socratic brainstorming / design-doc primitive before spec decomposition

- Description: A structured pre-implementation dialogue skill that asks clarifying questions one-at-a-time, proposes 2-3 approaches with trade-offs, presents design in digestible sections, and saves a design doc before any planning starts. loop/crew move straight to spec decomposition without a discovery phase, increasing the risk of wrong-direction slices.
- Source: skills/brainstorming/SKILL.md
- Impact (0-3): 2 -- catches scope creep and wrong assumptions before implementation cost is incurred
- Effort (0-3): 2 -- new skill + integration point before /loop:spec-decompose
- Fit (0-3): 2 -- fits alongside existing SPEC primitives; would need a trigger point in the loop entry
- Composite: 2 + (3 - 2) + 2 = 5

### GAP-5: Two-stage per-task review (spec compliance then code quality)

- Description: Superpowers dispatches two separate reviewer subagents per task: spec-compliance first, then code quality. crew dispatches a single reviewer at slice close. Splitting the review surfaces spec drift task-by-task (cheaper to fix) and separates correctness from quality concerns.
- Source: skills/subagent-driven-development/SKILL.md, skills/requesting-code-review/SKILL.md
- Impact (0-3): 2 -- catches spec drift earlier; single-stage review at slice close is a lagging signal
- Effort (0-3): 2 -- new review dispatch pattern in devcrew:fullstack-dev handoff
- Fit (0-3): 2 -- additive to existing crew review gate; does not replace it
- Composite: 2 + (3 - 2) + 2 = 5

### GAP-6: Systematic debugging skill (4-phase root-cause protocol)

- Description: A standalone skill enforcing: reproduce consistently -> isolate variables -> form and test hypothesis -> verify fix before claiming resolution. The Iron Law (NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST) is more prescriptive than anything in loop/crew. gstack-investigate exists but is a gstack skill, not a loop primitive.
- Source: skills/systematic-debugging/SKILL.md
- Impact (0-3): 2 -- reduces thrashing on difficult bugs in autonomous loop runs
- Effort (0-3): 2 -- new loop skill; no architectural changes needed
- Fit (0-3): 2 -- complements existing loop/crew workflow phases cleanly
- Composite: 2 + (3 - 2) + 2 = 5

## Inadvisable mimics

- Zero-dependency hard constraint. Superpowers refuses all third-party dependencies to stay harness-agnostic. loop/crew depend on hero-crew CLI, Node.js scripts, and plugin infrastructure powering the phase-gate runner, artifact system, and grade aggregation. Abandoning this to chase portability would remove far more value than multi-harness reach delivers.
- Stateless sessions (no backlog). Superpowers intentionally has no persistent backlog -- the human decides what to build each session. This is the opposite of the loop marathon value proposition. Mimicking stateless sessions would remove the loop primary differentiator.
- Single-agent role model. Superpowers uses one agent playing all roles. Crew separate-ownership-per-role prevents self-review bias and is architecturally deliberate. Collapsing roles for simplicity would defeat the review gate independence guarantee.
- Your-human-partner terminology. Deliberate humanisation phrasing in superpowers. loop/crew have established terminology (lead, builder, user). Renaming for parity is churn with no functional benefit.