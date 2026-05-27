---
kind: handoff
objective: Document agent-report-writer timestamp bug investigation findings
owner: caveman:cavecrew-investigator
status: investigation_complete
created_at: 2026-05-26
scope: read-only investigation into FEAT-002 agent-report naming bug
---

## Investigation Summary

Read-only investigation into the agent-report-writer bug identified in FEAT-002 (pending backlog).

**Bug:** Agent-report artifacts lack the leading `YYYYMMDDTHHMMSSZ-` timestamp prefix that all other crew artifacts have.

## Files Examined

1. `scripts/lib/slice-linker/agent-report-writer.mjs` (full)
2. `scripts/lib/artifact-naming.mjs` (full)
3. `scripts/lib/slice-linker/crew-bridge.mjs` (lines 310–340)
4. `scripts/lib/ceremonies.mjs` (lines 95–108)
5. `tests/agent-report-writer.test.mjs` (full)
6. `.claude/artifacts/loop/backlog/pending/FEAT-002.md` (full)

## Findings

### Agent Data Collection

- **Scanner function:** `readEventsInWindow(repoPath, startedAt)` at agent-report-writer.mjs:23
  - Reads `.claude/logs/events.jsonl` line-by-line
  - Filters for `event === "subagent_start"` or `event === "subagent_stop"`
  - Time-floors on `startedAt` (line 25): `new Date(startedAt).getTime()`
  - Returns `[]` when file missing or `startedAt` is null

- **Pairing logic:** `pairAgentEvents(startPayloads, stopPayloads, startTimestamps, stopTimestamps)` at line 76
  - Correlates start and stop events by `agent_id` (line 80)
  - Includes stops without matching starts (line 87, `startTs: null`)
  - Returns array of `{ agentId, agentType, sessionId, startTs, stopTs, transcriptPath, backgroundTasks, stopHookActive }`

- **Payload loading:** `collectEventPayloads(events)` at line 280
  - Iterates events, calls `loadPayload(event.payloadPath)` per event
  - Separates start and stop payloads (lines 287–293)
  - Returns `{ startPayloads, startTimestamps, stopPayloads, stopTimestamps }`

- **Enrichment:** `enrichPairsWithTranscripts(pairs)` at line 298
  - Parses agent transcripts via `parseTranscript(pair.transcriptPath)` for each agent
  - Computes `duration_ms` from `startTs` and `stopTs` (line 304)
  - Returns enriched pairs with `turns`, `model`, `tools` (Map), `skills` (array)

### Session ID Source

- **Line 342:** `sessionId = agents.find((a) => a.sessionId)?.sessionId ?? null`
- Extracted from first agent with non-null `sessionId` (collected from stop payload in `buildAgentPair()` line 63)
- Single session_id per report (not per-agent)

### Metrics Aggregation

- **agent_count** (line 340): `agents.length`
- **total_turns** (line 341): `agents.reduce((sum, a) => sum + (a.turns || 0), 0)`
- **total_duration_ms** (line 341): `agents.reduce((sum, a) => sum + (a.duration_ms || 0), 0)`

### Markdown Body Rendering

- **Entry point:** `buildBody(agents, groups)` at line 262
- Renders three sections: `## Agents`, `## Parallel groups`, `## Tool summary`
- **Agent table** (line 216): columns for Role, Model, Turns, Duration, Top tools, Skills
- **Parallel groups** (line 223): groups agents by temporal overlap; each group lists member agent types
- **Tool summary** (line 248): aggregates tool usage across all agents
- **Note:** phase, feature, slice metadata are in **frontmatter only** (lines 346–348), not in markdown body

### Entry Point Function Signature

```javascript
export async function writeAgentReport(
  repoPath,
  { sliceId, featureId = null, phase = null, startedAt = null }
)
```

- **Parameters:**
  - `repoPath` (string): repo root
  - `sliceId` (required): slice identifier
  - `featureId` (optional): feature tag (e.g., "FEAT-021")
  - `phase` (optional): phase tag (e.g., "3")
  - `startedAt` (optional): ISO timestamp to floor event window

- **Returns:** `{ reportPath, agentCount, totalTurns, totalDurationMs }`

### The Bug (ROOT CAUSE)

**Location:** agent-report-writer.mjs:328–329

```javascript
const slug = buildArtifactSlug({ featureId, phase, sliceId });
const target = path.join(agentsDir, `${slug}-agent-report.md`);
```

**Problem:**
- `buildArtifactSlug()` produces filenames like `feat021-slice36-agent-report.md`
- No leading `YYYYMMDDTHHMMSSZ-` timestamp is prepended
- All other crew artifacts (cost-report, review-result, validation-result) receive timestamp from crew CLI
- Agent reports are **loop-owned** and must add their own timestamp, but do not

**Comparison:**
- **ceremonies.mjs:103** (`writeFeatureEndCeremony`): `const stamp = result.timestamp.replace(/[^0-9]/g, ""); const filename = feature-end-${result.id}-${stamp}.json`
- **artifact-naming.mjs:48–50** (`hasLeadingTimestamp`): pattern `YYYYMMDDTHHMMSSZ-` is recognized but never written by agent-report-writer
- **crew-bridge.mjs:279–282** (final-synthesis): explicitly does NOT add timestamp ("No timestamp — slice closes once per slice id"), but that is a deliberate design choice for overwrite-idempotency
- **agent-report-writer:** should add timestamp because multiple agents can run across multiple slices, reports are append-only history

**FEAT-002 Acceptance Criteria (line 24):**
> agent-report filenames: leading timestamp present

## Caller Sites

- **crew-bridge.mjs:316–318** — `tryWriteAgentReport(repoPath, { sliceId, featureId, phase, startedAt })`
  - Wrapper that imports and calls `writeAgentReport()`
  - Used during slice close ceremony

- **agent-report-writer.test.mjs:151, 183, …** — Test harness direct calls

## Test Coverage

10 test cases in agent-report-writer.test.mjs covering:
- Happy path (2 agents, full data)
- Zero agents (time-window filter)
- Missing transcript (graceful degrade)
- Missing events.jsonl (no-throw)
- startedAt null (disables time-floor)
- Parallel group detection
- Sequential agents (no parallel)
- Skill extraction
- Idempotent overwrite
- Slug format validation
- Duration formatting

**Test gap:** No test validates that reportPath includes a leading timestamp. Test at line 373–382 validates slug format only.

## Recommended Next Steps

1. **Fix:** Prepend timestamp to agent-report filename
   - Add timestamp generation (ISO → YYYYMMDDTHHMMSSZ format)
   - Update line 329 target path construction
   - Import helper from artifact-naming.mjs if available, or inline stamp logic (see ceremonies.mjs:103 pattern)

2. **Test:** Add case validating timestamp presence in reportPath

3. **Verify:** Run full test suite to confirm no regressions

## Confidence & Risks

- **High confidence** on root cause (code is clear, FEAT-002 matches findings)
- **Low risk** on fix (isolated change, similar pattern exists in ceremonies.mjs)
- **Risk mitigation:** Test coverage exists; verify artifact-linking still works after rename

---

**Investigation methodology:** Read-only code inspection, grep for symbol usage, test harness review, cross-repo pattern matching (ceremonies.mjs, crew-bridge.mjs).

**Files that will need modification:** `scripts/lib/slice-linker/agent-report-writer.mjs` (1 function, ~5 lines)

**Related artifacts:** FEAT-002 pending backlog item, agent-report-writer.test.mjs (will need 1 new test)
