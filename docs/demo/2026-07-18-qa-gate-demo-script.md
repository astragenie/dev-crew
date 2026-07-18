# Demo recording script — Wiggin Loop + pre-build QA gate (W4.1)

Target: ~3 min screen recording for README. Operator drives; every command is copy-paste ready. Rehearsed sandbox keeps it deterministic.

## Prep (before recording, ~5 min)

```bash
# sandbox repo with loop installed
mkdir demo-repo && cd demo-repo && git init -b main
# install crew + runner plugins (marketplace), then:
/runner:install --preset typescript-plugin-dev
# enable the QA gate
#   .claude/loop.json → "loop": { ..., "qa_gate": "pre-build" }
# seed one small triaged FEAT with 3 Given-When-Then ACs (copy template below)
```

FEAT template (put in `.claude/artifacts/loop/backlog/triaged/FEAT-001.md`): a
tiny "add a `greet(name)` util + tests" feature — small enough to build live.

## Recording flow

1. **Cold open (15s)** — `bun .../loop.mts status --repo .` → show preset,
   marker block, crew CLI all green. One sentence: "Autonomous dev loop,
   installed on a fresh repo."
2. **Start ceremony (45s)** — `/runner:start FEAT-001`. Scroll the emitted
   dispatch: point at the **QA GATE PRE-FLIGHT** block — "an independent QA
   agent writes the test plan BEFORE the builder exists; it never sees the
   implementation." Point at the goalpost-lock FORBIDDEN order for the builder.
3. **Red → green (60s)** — let qa-expert write the plan, test-automator seed
   failing tests (show the red run), builder make them pass (green run).
   Caption: "goalposts locked — builder can't edit the plan; a PreToolUse hook
   mechanically denies it."
4. **Close gate (30s)** — `/runner:close`. Show grade with `test_confidence`;
   mention the 0.80 close gate + 3-close warm-up in one sentence.
5. **Snapshot (15s)** — open `.claude/artifacts/loop/loop-snapshot.md`: backlog
   counts, grades, honest cost line (median per scan), hook-enforcement badge.
6. **Outro (15s)** — README metrics band: "180 features shipped through this
   loop; the numbers regenerate from repo artifacts and CI fails if they
   drift."

## Gotchas while recording

- Fresh repo close-gate demo: warm-up means a failing close only WARNS for the
  first 3 — for the demo either show the warn + badge (honest) or pre-seed 3
  gate-evaluated closes in prep.
- Keep the sandbox offline from real backlogs — `productName` something
  obviously demo (`DemoLoop`).
- If auto-merge/PR steps are in-shot, use a throwaway GitHub repo.
