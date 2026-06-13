#!/usr/bin/env node
// SessionStart hook: inject compact loop HARD RULES bootstrap context.
//
// Purpose: Ensures the six highest-leverage loop HARD RULE reminders
// survive context compaction in long marathonMode: true sessions.
// Content sourced from .claude/loop/rules.md (static copy — no filesystem read).
//
// Fail-open contract: any error exits silently with code 0.
// Never blocks session start.
//
// Token budget: BOOTSTRAP_SUMMARY must not exceed 60 lines / ~150 tokens.
// Format: stdout plaintext block consumed by Claude Code as additionalContext.

const BOOTSTRAP_SUMMARY = `--- loop bootstrap context ---
HARD RULES — read .claude/loop/rules.md for the full set.

1. Run until PASS. Do not stop for confirmation. Stop only when every
   acceptance criterion is PASS with evidence, or the work is externally
   blocked (escalated_to_human, cost cap exceeded, warn-severity alerts).

2. autoMode (marathonMode: true): never raise per-slice approval gates.
   Pick architect recs and proceed. Do not paraphrase the approval gate
   as a chat question.

3. Slice ceremony is mandatory. Every slice MUST use:
     /loop:slice start --id SLICE-NNN
   AND on completion:
     /loop:slice complete --id SLICE-NNN
   No slice may skip either ceremony step.

4. Dispatch discipline. Implementation goes to crew:builder subagent only.
   Never implement inline except trivial single-line fixups.
   Parent loop dispatches crew:inspector then crew:verifier after builder.

5. Auto-continue: after slice ceremony, promote next backlog item without
   asking. Stop only on: escalated_to_human | cost cap exceeded |
   warn-severity pattern alerts | external blocker | backlog exhaustion.

6. First action when starting the loop:
     read .claude/loop/rules.md
     → docs/ai-loop/00-entry/MASTER_PROMPT.md
     → docs/ai-loop/backlog/approved-slices.md
--- end loop bootstrap context ---
`;

try {
  process.stdout.write(BOOTSTRAP_SUMMARY);
  process.exit(0);
} catch {
  process.exit(0);
}
