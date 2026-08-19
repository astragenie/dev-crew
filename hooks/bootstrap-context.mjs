#!/usr/bin/env node
// SessionStart hook: inject compact runner HARD RULES bootstrap context.
//
// Purpose: Ensures the six highest-leverage HARD RULE reminders survive
// context compaction in long marathonMode: true sessions.
// Content sourced from .claude/loop/rules.md (static copy — no filesystem
// read). Path retains the `loop/` directory prefix intentionally — only
// the command namespace renamed, first to `runner:*` then to `devcrew:*`
// (see CHANGELOG "Loop→Runner plugin rename" and the devcrew unification).
//
// Fail-open contract: any error exits silently with code 0.
// Never blocks session start.
//
// Token budget: BOOTSTRAP_SUMMARY must not exceed 60 lines / ~150 tokens.
// Format: stdout plaintext block consumed by Claude Code as additionalContext.

import { isFeatureEnabledLite, readHookPayload } from "./feature-flag-lite.mjs";

// Feature gate: features.bootstrap-context.enabled === false skips this
// hook entirely. Both helpers are internally fail-open (default to
// enabled/process.cwd() on any read error) — never blocks session start.
const hookPayload = readHookPayload();
const repoCwd = hookPayload?.cwd || process.cwd();
if (!isFeatureEnabledLite("bootstrap-context", repoCwd)) {
  process.exit(0);
}

const BOOTSTRAP_SUMMARY = `--- runner bootstrap context ---
HARD RULES — read .claude/loop/rules.md for the full set.

1. Run until PASS. Do not stop for confirmation. Stop only when every
   acceptance criterion is PASS with evidence, or the work is externally
   blocked (escalated_to_human, cost cap exceeded, warn-severity alerts).

2. autoMode (marathonMode: true): never raise per-slice approval gates.
   Pick architect recs and proceed. Do not paraphrase the approval gate
   as a chat question.

3. Slice ceremony is mandatory. Every slice MUST use:
     /devcrew:start --id <FEAT-ID or SLICE-NN>
   AND on completion:
     /devcrew:close --id SLICE-NN
   No slice may skip either ceremony step.

4. Dispatch discipline. Implementation goes to the tag-routed devcrew builder
   (devcrew:frontend-dev / devcrew:backend-dev / devcrew:fullstack-dev) only.
   Never implement inline except trivial single-line fixups.
   Parent loop dispatches devcrew:inspector then devcrew:verifier after builder.

5. Auto-continue: after slice ceremony, promote next backlog item without
   asking. Stop only on: escalated_to_human | cost cap exceeded |
   warn-severity pattern alerts | external blocker | backlog exhaustion.

6. First action when starting the runner:
     read .claude/loop/rules.md
     → .claude/artifacts/loop/ai-loop/00-entry/MASTER_PROMPT.md
     → .claude/artifacts/loop/ai-loop/backlog/approved-slices.md
--- end runner bootstrap context ---
`;

try {
  process.stdout.write(BOOTSTRAP_SUMMARY);
  process.exit(0);
} catch {
  process.exit(0);
}
