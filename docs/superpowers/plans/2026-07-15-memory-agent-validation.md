# Plan — validate agents actually receive astramem memory (both plugins)

**Date:** 2026-07-15
**Owner:** memory-integration
**Status:** in-progress — blockers filed (astramem-local#341 write-tag, #343 cold-start)
**Goal:** prove a dispatched agent (reviewer / architect / builder) receives its
prior role-scoped lessons in-context and credits what it used — on BOTH the
runner (programmatic, DEC-009) and crew (SubagentStart hook + `using-memory`
skill) paths.

## Background (what's already true)

- **Both plugins already implement load + feedback.**
  - crew/dev-team: agent-profile load+feedback via `SubagentStart` hook (#235,
    v0.64) + universal `using-memory` skill (#237, v0.65).
  - runner: programmatic `buildMemoryContext` → `profileSilent(agentType)` load
    (v0.74) + `submitSliceProfileFeedback` → `feedbackSilent` on gate pass
    (v0.75). Design record DEC-009 — deliberately NOT skill-based (skills are
    model-elective and don't fire for autonomous subagents; a canary test on
    2026-07-15 reproduced exactly that).
- **Both are blocked by one root cause: astramem-local#341.** The
  `@astragenie/astramem-client` `rememberSilent` path drops `project`/`agent`
  tags — `IngestPayload` has no top-level `project`/`agent`, and
  `daemon-client.remember` reads top-level `RememberRequest` only; nothing maps
  `metadata.project` → `req.project`. Result: `agent_profile` returns empty →
  profile injection injects nothing even when enabled. This is why the shipped
  "live e2e" never passed.
- **Decoupling insight:** #341 blocks ORGANIC end-to-end, but validation can seed
  agent-tagged memories directly via MCP `remember` with top-level
  `projectId`/`agentId` (proven — canary recalled at 0.945). So LOAD + FEEDBACK
  validation starts NOW, in parallel with the #341 fix.

## Critical path

Steps 2→3→4 = first proof agents get memory (no #341 needed).
Step 6 = organic end-to-end (gated on #341 or the interim memory-sink patch).
Fastest "agents working" proof: Steps 2–4 on runner-plugin alone (~30 min).

## Steps

### Step 1 — Repo hygiene (prereq)
- [x] dev-team: rebased onto origin/main (v0.65.0; `using-memory` skill present).
- [ ] astramem-plugin: checkout `main` (currently on contracts branch) — only if
      testing the skill copy.
- [x] runner-plugin: already v0.75.0.
- **AC:** `git log` shows #235/#237 in dev-team; runner has `profile-feedback.mts`.

### Step 2 — Enable memory in configs
- [x] runner `.claude/loop.json`: `memory:{ enabled:true, project:"runner-plugin",
      profile:{enabled:true, timeoutMs:20000}, feedback:{enabled:true, timeoutMs:20000} }`
      (20s cap is a cold-start bandaid pending F1/F2).
- [ ] dev-team `.claude/loop.json`: `memory.enabled:true` + `memory.profile.enabled:true`.
- [ ] Daemon env: `ASTRAMEM_BASE_URL` + `ASTRAMEM_BEARER || MEMORY_BEARER`; `get_health` ok.
- **AC:** config parses (plugins-common #31 accepts profile/feedback keys — was
      silently rejecting before).

### Step 3 — Seed agent-tagged canaries (bypasses #341 for validation)
- [ ] Per repo × role (builder, reviewer, architect): MCP `remember({ type:lesson,
      projectId:<repo>, agentId:"crew:<role>", scope:"team", importance:0.9,
      content:"…CANARY-<role>-####" })`.
- **AC:** `agent_profile({agent:"devcrew:reviewer"})` returns the canary;
      `recall_memory({project:"runner-plugin"})` finds it.

### Step 4 — Validate LOAD (both paths) ← first proof
- [ ] runner programmatic: drive `buildMemoryContext({agentType, sliceId, project})`
      (unit + live) → block contains canary. Then a real reviewer dispatch via
      `post-builder-fanout` → block present in prompt.
- [ ] crew hook: run `subagent-start-profile.ts` `{agent_type:"devcrew:architect",
      cwd:dev-team}` + profile enabled → `additionalContext` emits the "Your track
      record" block with the canary.
- [ ] Live agent: dispatch a real `devcrew:reviewer` / `devcrew:architect` in dev-team →
      injected block appears, agent references the canary lesson.
- **AC = PASS:** a dispatched reviewer/architect provably sees its role's prior lesson.

### Step 5 — Validate FEEDBACK
- [ ] runner: complete a seeded slice on clean gate → `feedbackSilent(id)` →
      daemon `used`/usefulness rose off the flat 0.5.
- [ ] crew: `crew profile-feedback --agent` credits injected ids.
- **AC:** injected canary's usefulness moves off 0.5.

### Step 6 — Validate the REAL write path (needs #341 or interim patch)
- [ ] After #341 fix (map `metadata.{project,agent}` → top-level in
      astramem-client), run a real `/devcrew:close` → the DEC/lesson it writes is
      tagged (recall by project finds it; agent_profile shows it).
- [ ] Interim option: patch runner `memory-sink.mts` to set top-level
      `projectId`/`agentId` on the payload, if organic writes are wanted before
      #341 lands upstream.
- **AC:** organic slice-close write is project+agent tagged and recallable.

### Step 7 — Coverage extension
- [ ] runner: thread `sliceId`/`agentType` into architect/verifier/researcher/pm
      dispatch (DEC-009 load currently threads builder + reviewer only).
- [ ] crew hook: verify architect/reviewer subagents trigger SubagentStart.
- **AC:** each named role gets its profile injected.

### Step 8 — Docs + rollout
- [x] CLAUDE.md memory binding (cortex→astramem, project=runner-plugin).
- [x] commands/close.md (cortex→astramem wording + top-level project note).
- [ ] dev-team memory-keeper SKILL.md: metadata→top-level + feedback-loop steps.
- [ ] astramem-local recall-filters.md: warn JS-client consumers need top-level project.
- [ ] astramem-plugin remember.md 10-type list; recall.md drop `loop` example.
- [ ] astra-marketplace README memory→astramem row.
- [ ] Roll config (project id + profile/feedback enable) to other repos; repeat
      Step 3–5 canary per repo.

## Dependencies

```
Step1 → Step2 → Step3 → Step4 → Step5     (ASAP validation, no #341)
                                  Step6    (organic e2e — gated on #341 / interim patch)
Step7, Step8                               (breadth + durability)
```

## Execution findings (2026-07-15)

Ran the ASAP path (Steps 1–4) against the live daemon. Results:

- ✅ **agent_profile is populated per-role** — `devcrew:reviewer` 1121 atoms / 237
  lessons, `devcrew:architect` 73 atoms — both including seeded canaries. The
  role-scoped lessons the load path needs already exist (written by the
  capture-at-close hook + direct MCP, which DO tag agent).
- ✅ **Stale dependency fixed** — installed `@astragenie/astramem-client` was
  **0.2.0** (no `profileSilent`/`feedbackSilent` export at all) despite `^0.3.0`
  declared; the v0.74/0.75 code silently no-op'd. `bun install` → 0.3.0.
- ✅ **Config enabled** — `memory.enabled:true` + `profile`/`feedback` blocks in
  runner `.claude/loop.json` (plugins-common #31 now accepts these keys).
- ✅ **`buildMemoryContext` renders a block** — local-lessons leg works; warm
  daemon calls are 4–5ms.
- ⚠️ **Profile leg blocked by cold-start (astramem-local#343)** — first daemon
  call per process = 2–14s (cold connection + daemon lazy-init + flapping),
  warm = 4–5ms. One-shot dispatch callers always pay cold → default 5s cap →
  `profileSilent` returns null → empty profile injection. THE live blocker.
- ⚠️ **Write path drops tags (astramem-local#341)** — `memory-sink` nests
  project/agent in `metadata`; the client reads top-level only → runner's own
  writes are untagged (profiles stay warm only from other writers).

Net: machinery is sound + data exists; #341 (write tag) and #343 (cold-start)
are the only two things between here and reviewer/architect getting lessons live.

## Features to build + ETA

Sizes: S ≈ ½ day, M ≈ 1–2 days, L ≈ 3–5 days. ETAs are engineering time, not wall-clock.

| # | Feature | Repo | Size / ETA | Depends on | Status |
|---|---|---|---|---|---|
| F1 | **Cold-start fix — reuse one client + `warmup()` /health ping** so the timed profile/feedback call rides a warm socket | astramem-client (plugins-common) | S · ~0.5d | — | todo (#343) |
| F2 | **Daemon eager-init + stop flapping** — warm DB/vec/model on boot; fix intermittent connection refusal | astramem-local | M · ~1–2d | — | todo (#343) |
| F3 | **Write-tag map** — lift `IngestPayload.metadata.{project,agent,importance}` → top-level `RememberRequest` in the client adapter | astramem-client (plugins-common) | S · ~0.5d | — | todo (#341) |
| F4 | **Live canary e2e harness** — seed role-tagged canary → dispatch → assert injected + credited; automated, per-repo | runner-plugin | S · ~0.5d | F1 or F2 | partial (manual done) |
| F5 | **Role coverage extension** — thread `sliceId`/`agentType` into architect / verifier / researcher / pm dispatch (today: builder + reviewer only) | runner-plugin | M · ~1d | F4 | todo |
| F6 | **Feedback validation** — confirm `feedbackSilent` credits injected atoms on gate pass; usefulness moves off 0.5 | runner-plugin | S · ~0.5d | F1, F4 | todo |
| F7 | **Stale-doc cleanup** — memory-keeper SKILL (metadata→top-level + feedback steps), recall-filters.md, remember.md 10-type list, marketplace README | dev-team / astramem-local / astramem-plugin / astra-marketplace | S · ~0.5d | — | partial (runner CLAUDE.md + close.md done) |
| F8 | **Config rollout** — enable `memory.profile/feedback` + set project id in each target repo; run F4 canary per repo | all consumer repos | S · ~0.5d/repo | F1–F4 | todo |

**Critical path to first live green:** F1 (client warmup, ~0.5d) → F4 (canary e2e,
~0.5d) → F6 (feedback, ~0.5d). ≈ **1.5 days** to a validated reviewer/architect
receiving + crediting a lesson live. F2 (daemon eager-init) hardens it; F3 makes
runner's own writes self-tag; F5/F8 broaden coverage.

## Wave execution plan (parallel, isolated worktrees)

Run features as parallel lanes in isolated git worktrees, merged in dependency
order. Worktree isolation prevents file-level conflicts between lanes touching
the same repo; merge order resolves logical dependencies. Combined same-package
work into one lane to avoid intra-repo worktree races.

### Wave 1 — no cross-deps, all lanes start together

| Lane | Feature(s) | Repo | Worktree | Size |
|---|---|---|---|---|
| W1-A | **F1 + F3** — client `warmup()`/reuse **and** write-tag `metadata→top-level` map (same package, one lane to avoid intra-repo race) | plugins-common (`packages/astramem-client`) | `wt-astramem-client` | S+S ≈ 1d |
| W1-B | **F2** — daemon eager-init + stop flapping | astramem-local | `wt-daemon` | M ≈ 1–2d |
| W1-C | **F5** — role coverage: thread `sliceId`/`agentType` into architect/verifier/researcher/pm dispatch | runner-plugin | `wt-runner-coverage` | M ≈ 1d |
| W1-D | **F7** — stale-doc cleanup (memory-keeper SKILL, recall-filters, remember.md, marketplace README) | dev-team / astramem-* / marketplace | `wt-docs` (per-repo) | S ≈ 0.5d |

Wave-1 wall-clock = **max(1d, 1–2d, 1d, 0.5d) ≈ 1–2d** (gated by F2). Note: the
live-green path does NOT need F2 — F1 alone (W1-A, ~1d, but the warmup half is
~0.5d) unblocks injection, so Wave 2 can start against W1-A as soon as the
warmup change merges, without waiting on F2.

### Wave 2 — after W1-A (client) merges

| Lane | Feature | Repo | Worktree | Size | Merge order |
|---|---|---|---|---|---|
| W2-A | **F4** — live canary e2e harness (seed → dispatch → assert injected) | runner-plugin | `wt-runner-e2e` | S ≈ 0.5d | 1st |
| W2-B | **F6** — feedback validation (credit on gate pass; usefulness off 0.5) | runner-plugin | `wt-runner-feedback` | S ≈ 0.5d | 2nd (after F4) |
| W2-C | **F8** — config rollout + per-repo canary | all consumer repos | `wt-rollout` | S ≈ 0.5d/repo | parallel w/ F6 |

Wave-2 wall-clock = **F4 (0.5d) → F6 (0.5d)**, F8 parallel ≈ **1d**.

### Updated ETA (wall-clock with parallelism)

- **First live green** (F1-warmup → F4 → F6): **≈ 1.5d** — reviewer/architect
  receives + credits a lesson live. Everything else lands in the same window.
- **Full plan wall-clock**: **≈ 2.5–3d** (Wave 1 ~1–2d gated by F2 + Wave 2 ~1d),
  vs **~6d serial**.

### Merge / conflict notes

- **plugins-common intra-repo** (F1+F3): combined into W1-A one lane — no race.
- **runner-plugin intra-repo** (F5 in W1, F4/F6 in W2): isolated worktrees,
  different files (F5=dispatch threading; F4=tests; F6=complete-slice). Merge
  order F5 → F4 → F6; rebase each on the prior.
- **F2 flakiness risk**: daemon work may destabilize the live daemon mid-wave —
  run F2 against a dedicated daemon instance/port so W2 canary runs stay green.
- **Cross-repo publish gate**: W1-A (astramem-client) must publish a version
  runner consumes before W2/F8 can pin it — add a publish step between waves.

## Related

- astramem-local#341 (root write-tag-drop blocker)
- astramem-local#343 (cold-connection / one-shot-caller timeout blocker)
- runner DEC-009 / `docs/integrations/memory-integration.md` (programmatic path,
  "live e2e outstanding")
- plugins-common #31 (config keys accepted — prior link in the chain)
- dev-team #235 (hook load+feedback), #237 (using-memory skill)
