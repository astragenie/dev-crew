---
findings: "🔴:0,🟡:3,❓:1"
status: completed
---
# Review Result: Review Result

- Created: 2026-07-03T15:39:13.114Z
- Reviewer: typescript-reviewer
- Decision: approved_with_notes
- Status: completed
- Summary: FEAT-217 memory-sink passes both tsc configs, biome lint/format, and all 21 new plus existing grade-writer/learnings tests; opt-in gating, argv-array spawn (no shell injection), and the 2s abort-cap are correctly implemented and fail-silent, but an unsanitized --project arg, a stale close.md double-mirror instruction, and a wiring test-coverage gap should be addressed.
- Evidence Checked:
  - VERDICT: PASS with notes (approved_with_notes).

Verified clean:
- tsc --project tsconfig.json --noEmit and --project tsconfig.test.json --noEmit: zero errors. exactOptionalPropertyTypes compliance confirmed (?: T | undefined pattern used consistently in MemoryConfig
  - recordDecision/recordLesson/recordNote param objects; grade-writer.mts rationale field matches the string | undefined type).
- biome lint on the 4 changed files: only pre-existing baseline warnings at grade-writer.mts:392 (noExcessiveCognitiveComplexity in emitNarrativeForSlice) and :441 (useOptionalChain)
  - both outside this diffs hunks (confirmed via git diff hunk headers
  - not touching line 392/441). The memory-sink.test.mts info (process.env bracket access useLiteralKeys) is the pre-agreed out-of-scope baseline item.
- biome format check on all 4 files: clean
  - no diffs.
- bun test src/tests/memory-sink.test.mts: 21/21 pass (30 expects)
  - including the hang-cap test (AC-5
  - elapsed under 2500ms) and the POSIX argv round-trip tests (Windows-skipped for capture assertions only -- the enable/resolve/spawn path still executes on Windows via the .cmd stub
  - so coverage loss on Windows is limited to argv-content assertions
  - not path coverage -- acceptable).
- bun test src/tests/grade-writer.test.mts src/tests/grade-write-fanout.test.mts src/tests/learnings.test.mts: 23/23 pass -- the new recordDecision/recordLesson wiring does not regress existing suites (test temp-repos have no .claude/loop.json memory block
  - so wiring is inert during those runs
  - which is itself the intended contract).

SECURITY (focus point 1): PASS. spawn(cliPath
  - args
  - ...) uses an argv array
  - shell is not set (defaults false) -- no shell interpolation surface regardless of hostile content. sanitizeContent() strips control and format Unicode categories (covers NUL and all C0/C1 control chars including embedded newlines) before the string becomes an argv element
  - and caps at 2000 chars. Confirmed via AC-4 test that a NUL byte (used to test forged-terminator injection) is stripped. No secret/token is ever passed as content -- content is always decision title/rationale
  - lesson text
  - or note text; the CLI resolution path never touches auth material.

Gating (focus point 3): PASS. recordMemory checks cfg.mode is off and returns before calling resolveCli() (memory-sink.mts:114-118)
  - confirmed by test AC-1 (installs a working capturing CLI but proves 0 spawns when mode=off). recordDecision/recordLesson fully route through recordMemory
  - whose entire body is wrapped in try/catch -- the exported functions are guaranteed never to reject
  - so the grade-write and learnings-store contracts cannot be broken by a memory-sink failure.

Fail-silent + cap (focus point 2): PASS. spawnRemember uses AbortController with a 2s setTimeout
  - passes signal to spawn() (Node/Bun kills the child via the default killSignal on abort)
  - clearTimeout runs in a finally block
  - and the wrapping Promise only ever resolves (via close or error handlers
  - both guarded by a settled flag) -- never rejects
  - no dangling timer
  - no unhandled rejection surface.

--- FINDINGS ---

MEDIUM src/scripts/lib/memory-sink.mts:120-122 -- project value bypasses sanitizeContent().
Risk: content is explicitly sanitized (control chars stripped
  - NUL-terminator-forging defended per AC-4)
  - but project (sourced from loop.json productName/memory.project) is pushed into argv unsanitized. A project value containing control chars or NUL could reach the downstream astramem CLI's own arg parser with the same forging risk the content path explicitly guards against
  - or a value starting with -- could be misinterpreted as a flag by a naively-parsing downstream CLI (argv-array spawn prevents shell injection
  - but does not prevent the invoked binary's own parser from misreading a dash-prefixed argument value).
Fix: run project through sanitizeContent() (or a lighter variant
  - e.g. strip control chars and reject/quote a leading dash) before pushing into args.

MEDIUM commands/close.md new Decision-mirror-to-astramem section vs src/scripts/lib/grade-writer.mts:476-497 -- stale documentation now describes a duplicate side effect.
Risk: FEAT-217 wires extractDecisions (invoked from writeGrade
  - which slice-grade-write calls during runner:close) to automatically call recordDecision for every newly-allocated DEC id -- exactly the same decisionsAllocated array the new close.md section instructs the closing agent to manually mirror via the astramem remember MCP tool. The doc was edited in the same diff but not reconciled with the new code path: a closing agent following commands/close.md literally will double-write every decision into astramem (once automatically by grade-writer.mts
  - once manually per the doc instruction)
  - unless the doc's intent is narrowly for manual DECs authored outside runner:close (the closing sentence hints at this but the main instruction text says to record every id in the array
  - not just a manual subset).
Fix: reconcile commands/close.md so the automatic-mirror explanation is explicit -- e.g. state that grade-writer.mts already auto-mirrors decisionsAllocated via recordDecision
  - no manual step needed
  - and this section only applies to DECs written outside the close ceremony.

MEDIUM (test-coverage gap
  - not blocking) -- no test in grade-writer.test.mts or learnings.test.mts asserts the wiring itself (that extractDecisions calls recordDecision with the right featureId/sliceId
  - that logLearning calls recordLesson with the composed lesson string). Only memory-sink.test.mts exercises memory-sink.mts in isolation; the call sites are unverified except by passing
  - because memory defaults off in test temp-repos so the wiring is never exercised end-to-end in the existing suites.
Fix: add one grade-writer.test.mts / learnings.test.mts case with memory.enabled "on" plus a capturing fake CLI (same technique as memory-sink.test.mts) asserting the recordDecision/recordLesson call actually fires with correct content -- this is the only way to catch a future signature or import-path regression at the call site.

LOW src/scripts/lib/grade-writer.mts:486-494 -- await recordDecision(...) at the call site has no local try/catch
  - unlike the equivalent learnings.mts call site which wraps recordLesson in a try/catch despite the same no-throw guarantee. Both are currently safe (recordMemory's own try/catch makes the exported functions never reject)
  - so this is purely a defense-in-depth and consistency nit
  - not a live bug -- flagging since the module docstring's never-throws claim is an implementation-level contract
  - not something the type system enforces (Promise<RecordResult> return type does not prove non-rejection).
Fix (optional): wrap the grade-writer.mts call in the same defensive try/catch as learnings.mts for consistency
  - or add a one-line comment noting the guarantee is enforced by recordMemory's internal try/catch so a future refactor doesn't accidentally drop it.

HOUSEKEEPING (non-blocking
  - unrelated to code quality but present in the working tree): an untracked file named Implement at the repo root contains what looks like accidental astramem --help output (stray shell redirect) -- should be deleted before commit
  - not part of the reviewed source.
- Files Reviewed:
  - src/scripts/lib/memory-sink.mts
  - src/tests/memory-sink.test.mts
  - src/scripts/lib/grade-writer.mts
  - src/scripts/lib/learnings.mts
  - .claude/loop.json
  - commands/close.md
  - .claude/artifacts/loop/backlog/pending/FEAT-217.md
- Test Adequacy: bunx tsc --project tsconfig.json --noEmit: clean; bunx tsc --project tsconfig.test.json --noEmit: clean; bunx biome lint (4 changed files): 0 new warnings (2 pre-existing baseline warnings outside diff hunks); bunx biome format --check: clean; bun test src/tests/memory-sink.test.mts: 21 pass/0 fail; bun test src/tests/grade-writer.test.mts src/tests/grade-write-fanout.test.mts src/tests/learnings.test.mts: 23 pass/0 fail
- Risks: -
- Required Follow-up: -

