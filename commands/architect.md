---
description: Run the codebase research pre-flight using the architect model (Opus) and return a two-model dispatch instruction.
---

# Architect

Runs the codebase research pre-flight pass using the architect model (Opus)
and returns a two-model dispatch instruction that names both the architect
(research/plan) and editor (implementation) models.

This command implements the **FEAT-005 two-model split**: a dedicated
research phase using the architect model, followed by a dispatch instruction
that directs the editor model to implement based on the generated plan
artifact.

## What it does

1. Resolves the configured architect and editor models from `loop.json`.
   - **Architect model:** `modelRouting.architect` → `modelRouting.sliceStart` → Opus (defaults to Opus for research/planning)
   - **Editor model:** `modelRouting.build` → `modelRouting.default` → Opus (Sonnet when using standard presets)

2. Calls `runPlanPreflight` to execute the codebase research pass:
   - Locates the slice file under `.claude/artifacts/loop/ai-loop/slices/`
   - Extracts in-scope file hints from slice frontmatter or body
   - Reads first 50 lines of each matched source file
   - Extracts exported symbol names

3. Writes the plan artifact to `.claude/artifacts/loop/plans/<TS>-plan-<sliceId>.md`

4. Returns a structured dispatch instruction that names both models explicitly
   and tells the agent to dispatch `/crew:build` for the editor phase.

## Usage

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" architect \
  --repo "$PWD" \
  --id SLICE-NN
```

## Returns

```json
{
  "sliceId": "SLICE-10",
  "architectModel": "opus",
  "editorModel": "sonnet",
  "planPath": ".claude/artifacts/loop/plans/20260602T120000Z-plan-SLICE-10.md",
  "filesResearched": ["src/scripts/lib/slice-plan.mts", "commands/slice-plan.md"],
  "dispatchInstruction": "## Two-Model Split Dispatch\n\n**Architect Model (Research/Plan):** opus\n**Editor Model (Implementation):** sonnet\n\n..."
}
```

## When to use

Before dispatching `/crew:build` on a non-trivial slice that requires explicit
model routing. This command:

- **Complements Plan Mode** (FEAT-006): while Plan Mode adds an approval gate,
  the architect command adds explicit model naming.
- **Enables two-model workflows** where research (architect/Opus) and
  implementation (editor/Sonnet) are handled by different models.
- **Surfaces model decisions** so the dispatch instruction can be reviewed
  before `/crew:build` is invoked.

Typical flow:

```
1. loop architect --id SLICE-10          # Architect does research
2. [Review plan artifact]
3. /crew:build                           # Editor does implementation (per dispatch instruction)
```

## Relationship to other commands

- **`loop slice plan`**: The bare pre-flight primitive (no model routing).
  The architect command wraps this and adds explicit two-model coordination.
- **`loop slice start`**: Triggers the full ceremony (plan + dispatch).
  The architect command is a lower-level hook for explicit model routing control.
