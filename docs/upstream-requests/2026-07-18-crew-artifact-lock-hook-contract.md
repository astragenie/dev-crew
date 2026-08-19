# Upstream request — crew: PreToolUse artifact-lock hook + dispatch-scoped lock-state wire contract

- **Date:** 2026-07-18
- **Status:** open
- **Upstream repo:** astragenie/dev-team (crew plugin)
- **Upstream tracking:** dev-team#257 (W1 enforcement hooks)
- **Consumer:** runner-plugin FEAT-264 SLICE-4 (goalpost-lock, AC-4) — externally
  blocked on this contract
- **Origin:** competitive audit §6 items 1–2 (runner-plugin#525), design review on
  runner-plugin#527 (architect C.1, reviewer OBJ-3)

## Ask

Crew ships a `PreToolUse:Write|Edit` hook that denies edits to *declared locked
paths*, plus the wire contract by which a consumer repo's dispatch flow declares
those locks. The SubagentStop gate-guard and repair-signature dedup in dev-team#257
are self-contained crew work; **this document specifies only the lock-state
handshake**, which crosses the plugin boundary and is currently designed nowhere.

## Why cross-plugin

The lock *enforcement* must live in crew (hooks execute in the crew plugin runtime,
alongside `pre-tool-use-dispatch-size.ts` and `pre-tool-use-model-enforce.ts`), but
the *lock declaration* originates in runner-plugin: `dispatch.mts` computes the
test-plan artifact path at dispatch time and must communicate "this slice's builder
may not touch path X" to a hook it does not own.

Static cross-plugin config reads are already proven —
`dev-team/hooks/pre-tool-use-model-enforce.ts:41` reads the consumer repo's
`.claude/loop.json`. What does NOT exist anywhere is **dispatch-scoped dynamic
state**: per-slice locks that appear at dispatch and disappear at close.

## Proposed contract (option A — state file; preferred)

Consumer writes one JSON file per active slice:

```
.claude/state/loop/artifact-locks/<sliceId>.json
{
  "sliceId": "SLICE-NNN",
  "lockedPaths": [".claude/artifacts/crew/validations/<plan-file>.md"],
  "lockedBy": "qa-gate",
  "createdAt": "<ISO>",
  "expiresAt": "<ISO, optional TTL guard>"
}
```

Crew hook behavior:

1. On `PreToolUse:Write|Edit`, glob `.claude/state/loop/artifact-locks/*.json`
   (consumer repo cwd); if the tool-input path matches any `lockedPaths` entry,
   deny with the lock's `lockedBy` + sliceId in the reason.
2. **Fail-open**: malformed lock file, unreadable dir, or any hook error → allow
   (crew's established hook philosophy, `pre-tool-use-dispatch-size.ts:17-19`).
3. **Warn-first rollout**: warn-only mode before hard-deny, feature-flagged like
   the dispatch-size gate.
4. **Orphan handling**: locks past `expiresAt` (or older than a default TTL, e.g.
   48h) are ignored and eligible for reaping; runner-plugin's `devcrew:close` and
   `dispatch prune` delete the slice's lock file. A dead slice therefore cannot
   wedge future work (reviewer OBJ-3's orphaned-lock concern).

Lifecycle ownership: runner-plugin writes the lock in its qa-gate pre-flight
(SLICE-3/4 code) and removes it at `devcrew:close`/prune; crew only ever reads.
Single-writer, matches the existing state-file idiom (`workflow-state.json`,
`halt-badge-state.json`).

## Rejected alternative (option B — prompt-embedded)

Passing the locked path inline in the dispatch prompt and having the hook parse it
back out of `tool_input` context: survives no compaction, invites prompt-injection
of the lock itself, and gives the hook no lifecycle signal. Rejected.

## Acceptance for closing this request

- Crew hook merged behind a feature flag with the option-A read contract.
- Contract doc (this file's schema) mirrored in crew's hook header comment.
- One integration fixture in either repo proving: lock present → builder Write to
  locked path denied; lock absent/expired → allowed.
- runner-plugin then implements the writer side inside FEAT-264 SLICE-4.
