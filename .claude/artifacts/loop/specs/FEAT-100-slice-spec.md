# Spec: FEAT-100 — SessionStart hook that injects loop bootstrap context

## Metadata
- developer_type: human
- estimated_complexity: low
- languages: [javascript (node)]
- autonomous_safe: false
- rationale_for_human: Modifying `.claude-plugin/hooks/hooks.json` changes hook execution for every Claude Code session where the loop plugin is installed. The injection content must be carefully bounded to avoid context-budget overconsumption. An architect review of injection size and content selection is required before implementation.

---

## Objective

Add a second `SessionStart` hook entry to `.claude-plugin/hooks/hooks.json` that runs a new Node script `hooks/bootstrap-context.mjs`. The script prints a compact loop rules summary (≤ 150 tokens / ≤ 60 lines) to stdout as `additionalContext`, ensuring key HARD RULE reminders survive context compaction in long `marathonMode: true` sessions. The hook is fail-open: any error exits silently with code 0 so the existing `version-check.mjs` hook and all normal session startup is unaffected.

---

## Context

### Existing hook infrastructure

The canonical hooks configuration lives at `.claude-plugin/hooks/hooks.json` (not `hooks/hooks.json` — no such file exists in the repo). It is authoritative for Claude Code plugin hook registration.

Current `SessionStart` entry (`.claude-plugin/hooks/hooks.json` lines 25–36):

```json
"SessionStart": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/version-check.mjs\"",
        "description": "loop:version-drift-warning",
        "timeout": 5
      }
    ]
  }
]
```

Existing hooks directory (`hooks/`):
- `hooks/version-check.mjs` — SessionStart; compares installed vs. marketplace version; prints additionalContext via `process.stdout.write`; fail-open (`process.exit(0)` on any error).
- `hooks/guard-feat-dispatch.mjs` — PreToolUse:Agent; blocks ad-hoc FEAT work; exits 2 on block.
- `hooks/read-guard.sh` — PreToolUse:Bash; detects post-Edit re-reads; exits 1 on block.

The `version-check.mjs` hook is the pattern to follow for SessionStart hooks: write to stdout, use `process.exit(0)` for all exit paths, wrap everything in try/catch, keep the script under ~100 lines.

### Content to inject

The HARD RULES summary block already exists in `CLAUDE.md` (lines 306–322, the `<!-- loop:start -->` ... `<!-- loop:end -->` block). However, at session start the hook runs before the model reads any project file. The hook's `additionalContext` is injected directly into the session context, so it supplements — not replaces — CLAUDE.md reading.

The injected summary must be compact. The PM `scopeNotes` state: "Must keep injection small to avoid consuming context budget." The FEAT `risks` warn against "Injecting full CLAUDE.md at every session start would consume significant context budget."

**Bounded content for injection (the bootstrap summary):**

The script emits a plaintext block containing only the six highest-leverage reminders. These are sourced directly from `.claude/loop/rules.md` (the plugin-managed full HARD RULES file):

1. Run until PASS — do not stop for confirmation (from "Autonomous Loop Instruction — HARD RULE").
2. autoMode: never raise per-slice approval gates; pick architect recs and proceed (from "Auto Mode No-Approval — HARD RULE").
3. Slice start/close ceremony — every slice MUST use `/loop:slice start` and `/loop:slice complete` (from "Slice Start Ceremony" and "Slice Close Ceremony" HARD RULEs).
4. Dispatch discipline — implementation goes to `crew:builder` subagent; never implement inline (from "Dispatch Discipline — HARD RULE").
5. Stop only on: `escalated_to_human`, cost cap exceeded, warn-severity alerts, external blocker (from "Auto Mode No-Approval — HARD RULE").
6. First action: read `.claude/loop/rules.md` → `docs/ai-loop/00-entry/MASTER_PROMPT.md` → `docs/ai-loop/backlog/approved-slices.md` (from "First Action — Starting the Loop").

This is a static string embedded in the script — no filesystem reads at runtime. Static embedding avoids any ENOENT risk and keeps hook startup time under 50 ms.

### Idempotency and safety

- **Fail-open required.** Any error (spawn failure, stdout write failure, unexpected exception) must `process.exit(0)` silently. The hook must never block session start.
- **Static content.** The summary is a hardcoded string constant in the script. No file I/O, no network, no shell. Zero runtime dependencies beyond `process.stdout`.
- **No duplication guard needed.** Claude Code's plugin system runs each hook once per session; the hook itself does not accumulate state. There is no risk of the same text appearing twice from this hook.
- **Context budget.** The injected string must not exceed 60 lines / ~150 tokens. The builder must verify token count before finalizing the content string.

---

## Implementation Contract

### Inputs

None. The hook receives no stdin. `CLAUDE_PLUGIN_ROOT` environment variable is available (set by Claude Code's plugin runner) and is used by the command string in hooks.json — the script itself does not need to read it.

### Outputs

On success: a plaintext block printed to stdout, consumed by Claude Code as `additionalContext`. Format:

```
--- loop bootstrap context ---
[compact rules summary, ≤ 60 lines]
--- end loop bootstrap context ---
```

On error: silent exit with code 0. Nothing written to stdout.

### Side effects

- No filesystem writes.
- No environment mutations.
- One stdout write per session start (the summary block), or no write on error.

---

## Files to Create / Modify

### Create (new file)

**`hooks/bootstrap-context.mjs`** — SessionStart hook script.

Requirements:
- Shebang: `#!/usr/bin/env node`
- Top comment block explaining: purpose, content source (`.claude/loop/rules.md` summary), fail-open contract, token budget constraint.
- One `const BOOTSTRAP_SUMMARY = \`...\`` constant holding the static summary text. Max 60 lines including the fencing lines.
- `try { process.stdout.write(BOOTSTRAP_SUMMARY); process.exit(0); } catch { process.exit(0); }` — the entire body.
- No imports. No `require`. No external modules.
- Line count must not exceed 80 lines (well within the 300-line agent file cap from `validate-content-length`; hooks are not owned-agent files but staying short is correct).

### Modify (existing file)

**`.claude-plugin/hooks/hooks.json`** — add a second hook entry to the existing `SessionStart` array.

Current `SessionStart` array has one element (the version-check hook). Add a second element:

```json
"SessionStart": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/version-check.mjs\"",
        "description": "loop:version-drift-warning",
        "timeout": 5
      }
    ]
  },
  {
    "hooks": [
      {
        "type": "command",
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/bootstrap-context.mjs\"",
        "description": "loop:bootstrap-context",
        "timeout": 5
      }
    ]
  }
]
```

No other changes to `hooks.json`.

---

## Required Tests

Tests live at `src/tests/bootstrap-context.test.mts`, run under Bun directly (`bun src/tests/bootstrap-context.test.mts`).

Because the hook is a plain `.mjs` script with no imports, the tests invoke it as a subprocess via `spawnSync` and inspect stdout/exit code. This matches the pattern used for other hook tests if any exist; if none, this file establishes the pattern.

**Test 1 — Happy path: hook exits 0 and writes non-empty stdout**

```
Given: hooks/bootstrap-context.mjs exists and is syntactically valid
When:  spawnSync("node", ["hooks/bootstrap-context.mjs"], { encoding: "utf8" })
Then:  result.status === 0
       AND result.stdout.length > 0
       AND result.stdout.includes("loop bootstrap context")
```

**Test 2 — Output is within token budget (line count)**

```
Given: hooks/bootstrap-context.mjs runs successfully
When:  result.stdout is split by "\n"
Then:  lines.length <= 65
       (65 = 60 content lines + 5 margin for fencing and trailing newline)
```

**Test 3 — Output contains each of the six key reminder topics**

```
Given: result.stdout from Test 1
When:  checking substring presence
Then:  result.stdout includes "Run until PASS"        (or equivalent wording)
       AND result.stdout includes "autoMode"           (or "auto mode")
       AND result.stdout includes "slice start"        (or "/loop:slice start")
       AND result.stdout includes "crew:builder"
       AND result.stdout includes "escalated_to_human"
       AND result.stdout includes "rules.md"
```

**Test 4 — Fail-open: hook exits 0 even when stdout is forcibly closed**

```
Given: hooks/bootstrap-context.mjs is invoked with stdout piped to a closed descriptor
       spawnSync("node", ["hooks/bootstrap-context.mjs"], { stdio: ["pipe","ignore","pipe"] })
When:  the script attempts to write to stdout (which is /dev/null equivalent)
Then:  result.status === 0
       (The try/catch must catch the write error and still exit 0)
```

**Test 5 — hooks.json registers the new hook entry**

```
Given: .claude-plugin/hooks/hooks.json is valid JSON
When:  JSON.parse(readFileSync(".claude-plugin/hooks/hooks.json")).hooks.SessionStart
Then:  array.length === 2
       AND array[1].hooks[0].command includes "bootstrap-context.mjs"
       AND array[1].hooks[0].description === "loop:bootstrap-context"
       AND array[1].hooks[0].timeout === 5
```

---

## Acceptance Criteria

**AC-001: New hook script exists and is syntactically valid**
```
Given: the slice is complete
When:  node --check hooks/bootstrap-context.mjs
Then:  exit code 0, no syntax errors printed
```

**AC-002: Hook is registered in hooks.json**
```
Given: .claude-plugin/hooks/hooks.json is read
When:  SessionStart array is inspected
Then:  two entries are present; second entry command contains "bootstrap-context.mjs"; description is "loop:bootstrap-context"; timeout is 5
```

**AC-003: Hook output is non-empty and bounded**
```
Given: the hook is run directly
When:  node hooks/bootstrap-context.mjs
Then:  exit code 0, stdout contains "loop bootstrap context", line count of stdout <= 65
```

**AC-004: Hook output covers all six HARD RULE reminder topics**
```
Given: node hooks/bootstrap-context.mjs output is captured
When:  the stdout string is inspected for presence of each topic keyword
Then:  all six topics present: "Run until PASS", "autoMode" or "auto mode", "/loop:slice start" or "slice start", "crew:builder", "escalated_to_human", "rules.md"
```

**AC-005: Hook is fail-open — no imports, no I/O**
```
Given: hooks/bootstrap-context.mjs source is read
When:  grep for import, require, readFile, existsSync, spawnSync, fetch
Then:  zero matches (the script has no runtime dependencies and no filesystem reads)
```

**AC-006: Existing version-check hook is unmodified**
```
Given: .claude-plugin/hooks/hooks.json after the edit
When:  SessionStart[0].hooks[0].command is read
Then:  value equals: node "${CLAUDE_PLUGIN_ROOT}/hooks/version-check.mjs"
       AND SessionStart[0].hooks[0].description equals: "loop:version-drift-warning"
```

**AC-007: All tests pass**
```
Given: src/tests/bootstrap-context.test.mts exists
When:  bun src/tests/bootstrap-context.test.mts
Then:  exit code 0, all 5 test cases report pass, zero failures
```

**AC-008: Full CI gate passes**
```
Given: both files are created/modified
When:  bun run test
Then:  exit code 0, all existing tests continue to pass
```

---

## Verification Commands

**Syntax check the new hook script:**
```powershell
node --check C:\work\mega\loop\hooks\bootstrap-context.mjs
```
Expected: no output, exit 0.

**Run the hook and inspect output:**
```powershell
node C:\work\mega\loop\hooks\bootstrap-context.mjs
```
Expected: prints a plaintext block starting with `--- loop bootstrap context ---`, ending with `--- end loop bootstrap context ---`, exit 0.

**Count output lines (must be ≤ 65):**
```powershell
(node C:\work\mega\loop\hooks\bootstrap-context.mjs | Measure-Object -Line).Lines
```
Expected: integer ≤ 65.

**Validate hooks.json is valid JSON and has two SessionStart entries:**
```powershell
node -e "const h = JSON.parse(require('fs').readFileSync('.claude-plugin/hooks/hooks.json','utf8')); console.log('SessionStart count:', h.hooks.SessionStart.length); console.log('second desc:', h.hooks.SessionStart[1].hooks[0].description);" 2>&1
```
Run from `C:\work\mega\loop`. Expected: `SessionStart count: 2`, `second desc: loop:bootstrap-context`.

**Run only the new tests:**
```powershell
cd C:\work\mega\loop; bun src/tests/bootstrap-context.test.mts
```
Expected: all 5 tests pass, exit 0.

**Full test suite (CI gate):**
```powershell
cd C:\work\mega\loop; bun run test
```
Expected: exit 0, all tests pass, no regressions.

---

## Rationale and Context

### Why a static string, not dynamic CLAUDE.md read

The FEAT risks section flags "Injecting full CLAUDE.md at every session start would consume significant context budget." CLAUDE.md is ~320 lines. A dynamic read would also add a filesystem I/O dependency and an ENOENT failure mode. A static 60-line summary avoids both risks. The summary content can be updated in the same slice that updates `.claude/loop/rules.md` — they are co-owned by `/loop:install`.

### Why a separate script (not extending version-check.mjs)

Each hook script has one responsibility. Mixing version-drift detection with rules injection in a single file would violate the single-responsibility principle and make future updates to either concern harder to reason about. The `version-check.mjs` precedent is to keep hook files narrowly scoped.

### Why `developer_type: human`

The PM flagged `autonomous_safe: false` because this change modifies `.claude-plugin/hooks/hooks.json`, which affects every Claude Code session for every user where the loop plugin is installed. The blast radius is wide. An architect review of the injected content's token budget is required before merging. The builder should implement, but a human reviewer must approve the exact content of `BOOTSTRAP_SUMMARY` before the PR is merged.

### What was rejected

- **Full CLAUDE.md injection:** rejected — too large (~320 lines, ~800+ tokens); would meaningfully reduce the effective context window for every session.
- **Dynamic file read at hook runtime:** rejected — adds ENOENT failure mode; the fail-open contract becomes harder to guarantee; startup latency increases.
- **Extending version-check.mjs:** rejected — single-responsibility violation; harder to evolve independently.
- **Injecting `.claude/loop/rules.md` verbatim:** rejected — 248 lines, far over budget; the compact summary achieves the same compaction-recovery goal at ~60 lines.

### Open question

The FEAT notes a near-exact duplicate relationship with FEAT-132. Before implementing, the architect review should confirm whether FEAT-132 covers the same scope or targets a different injection mechanism / content set, and whether the two should be merged into a single slice.

---

## Dependencies

- **No new npm/bun packages.** The hook script uses no imports.
- **Architect review required** before this slice can be marked `autonomous_safe: true` or handed to an unattended builder. Review gate: confirm token budget of `BOOTSTRAP_SUMMARY` (must be ≤ 150 tokens by conservative estimate); confirm the six topic selection is complete and not redundant with Claude Code's native CLAUDE.md injection.
- **FEAT-132 deconfliction.** Check whether FEAT-132 overlaps; if so, merge or explicitly close one as a duplicate before slicing.
