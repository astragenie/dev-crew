---
kind: agent-report
phase: null
feature: FEAT-269
slice: SLICE-165
created_at: "2026-08-02T16:16:32.226Z"
session_id: d5fa9790-9c1e-4bfd-9f4d-19aa954e3108
agent_count: 193
total_turns: 10782
total_duration_ms: 44288000
---
**Feature:** FEAT-269 · **Slice:** SLICE-165

> **Note:** 2 agent(s) have no `subagent_stop` event recorded. SubagentStop fires when the orchestrator returns to the user, which can land after slice-complete; duration and tool usage for these entries are partial.

## Agents

| Role | Model | Turns | Duration | Top tools | Skills |
|------|-------|-------|----------|-----------|--------|
| crew:fullstack-dev | claude-sonnet-5 | 46 | 10m 39s | Bash×7, Read×6, Glob×4 | astramem:using-memory |
| crew:reviewer | claude-sonnet-5 | 45 | 6m 50s | Bash×15, Grep×3, Read×2 | astramem:using-memory |
| phase1-memory-tagging | claude-sonnet-5 | 91 | 8m 17s | Read×17, Grep×11, Edit×9 | — |
| phase1-review | claude-sonnet-5 | 33 | 2m 46s | Bash×10, Read×7, Write×1 | — |
| phase2-e2e-suite | claude-sonnet-5 | 150 | 21m 14s | Bash×47, Read×23, Edit×6 | — |
| phase2-review | claude-sonnet-5 | 58 | 4m 4s | Bash×16, Read×12, Grep×7 | — |
| phase3a-scope-hygiene | claude-sonnet-5 | 104 | 12m 13s | Edit×17, Bash×15, Read×14 | — |
| phase3a-review | claude-sonnet-5 | 87 | 10m 40s | Bash×41, Read×11, Write×1 | — |
| arch-extraction-proposal | claude-sonnet-5 | 31 | 4m 57s | Read×8, Grep×6, Bash×3 | — |
| archrev-extraction-proposal | claude-sonnet-5 | 37 | 4m 29s | Bash×7, Grep×6, Read×5 | — |
| crew:fullstack-dev | claude-sonnet-5 | 131 | 15m 57s | Bash×24, Read×21, Edit×13 | astramem:using-memory |
| crew:fullstack-dev | claude-sonnet-5 | 307 | 13m 33s | Read×63, Bash×51, Edit×39 | astramem:using-memory |
| crew:fullstack-dev | claude-sonnet-5 | 56 | 4m 51s | Bash×10, Read×6, Edit×4 | astramem:using-memory |
| w1-r0-echo-origin | claude-sonnet-5 | 58 | 4m 40s | Grep×12, Glob×9, Bash×9 | — |
| crew:reviewer | claude-sonnet-5 | 38 | 2m 58s | Bash×13, Read×4, Skill×1 | astramem:using-memory |
| r-lead-rename | claude-sonnet-5 | 21 | 8m 54s | Grep×2, Read×2, Agent×2 | — |
| runner:researcher | claude-sonnet-5 | 70 | 5m 10s | Grep×39, Read×9, Skill×2 | runner:loop-discipline, astramem:using-memory |
| crew:researcher | claude-sonnet-5 | 22 | 3m 48s | Bash×8, Read×2 | — |
| crew:reviewer | claude-sonnet-5 | 113 | 11m 50s | Bash×41, Read×10, mcp__plugin_crew_astramem__submit_feedback×3 | astramem:using-memory |
| crew:reviewer | claude-sonnet-5 | 166 | 4m 21s | Bash×65, Read×9, Grep×5 | astramem:using-memory |
| dt-drift-cleanup | claude-sonnet-5 | 139 | 19m 29s | Bash×46, Edit×16, Read×12 | — |
| dt-credit-loop | claude-sonnet-5 | 322 | 38m 12s | Read×69, Bash×50, Edit×42 | — |
| crew:fullstack-dev | claude-sonnet-5 | 108 | 17m 35s | Bash×38, Edit×10, Read×7 | astramem:using-memory |
| r-dt-drift | claude-sonnet-5 | 32 | 3m 12s | Bash×11, Read×2, Grep×1 | — |
| crew:reviewer | claude-sonnet-5 | 62 | 5m 27s | Bash×18, Grep×9, Read×4 | astramem:using-memory |
| r-dt-creditloop | claude-sonnet-5 | 54 | 6m 34s | Bash×19, Read×9, Write×1 | — |
| cloud-mapper | claude-sonnet-5 | 51 | 2m 38s | Bash×19, Read×14, ToolSearch×1 | — |
| devteam-sliceB | claude-sonnet-5 | 232 | 8m 8s | Bash×59, Read×30, Edit×27 | — |
| cloud-usefulness-chart | claude-sonnet-5 | 137 | 13m 1s | Bash×37, Read×21, Grep×9 | — |
| review-sliceB | claude-sonnet-5 | 386 | 4m 43s | Bash×197, Write×10, Read×5 | — |
| review-chart | claude-sonnet-5 | 256 | 6m 13s | Bash×98, Read×27, Write×5 | — |
| cloud-obs-wave | claude-sonnet-5 | 192 | 9s | Bash×28, Read×23, Grep×18 | — |
| w1-index | claude-sonnet-5 | 112 | 12m 29s | Bash×51, Read×7, Glob×2 | — |
| w2-badge-dec | claude-sonnet-5 | 135 | 14m 26s | Bash×50, Read×17, Grep×6 | — |
| w3-testrot-scout | claude-sonnet-5 | 144 | 15m 40s | Bash×54, Read×8, Write×6 | — |
| b1-testrot | claude-sonnet-5 | 174 | 2m 41s | Edit×44, Bash×35, Read×19 | — |
| b2-testrot | claude-sonnet-5 | 155 | 13m 24s | Bash×37, Edit×25, Read×18 | — |
| b3-testrot | claude-sonnet-5 | 210 | 2m 58s | Bash×50, Read×23, Edit×20 | — |
| b4-testrot | claude-sonnet-5 | 82 | 2m 23s | Bash×29, Read×3, Edit×3 | — |
| b5-testrot | claude-sonnet-5 | 161 | 52s | Bash×49, Edit×18, Read×13 | — |
| crew:dev-lite | claude-sonnet-5 | 2 | 4s | — | — |
| general-purpose | claude-sonnet-5 | 97 | 10m 54s | Read×24, Write×21, Bash×9 | — |
| general-purpose | claude-sonnet-5 | 69 | 7m 51s | Bash×21, Read×8, Write×8 | — |
| general-purpose | claude-sonnet-5 | 71 | 4m 28s | Bash×23, Edit×10, Read×9 | — |
| review-batches | claude-sonnet-5 | 46 | 5m 15s | Bash×17, Read×2, Write×1 | — |
| reader-devteam | claude-sonnet-5 | 31 | 4m 18s | Bash×16, Read×1, ToolSearch×1 | — |
| reader-runner | claude-sonnet-5 | 41 | 3m 47s | Bash×12, Read×8, Grep×3 | — |
| reader-gepa | claude-sonnet-5 | 39 | 4m 31s | Bash×23, SendMessage×2, ToolSearch×1 | — |
| reader-astramem | claude-sonnet-5 | 53 | 5m 46s | Bash×21, Read×9, Grep×3 | — |
| reader-otta-site | claude-sonnet-5 | 68 | 56s | mcp__plugin_playwright_playwright__browser_navigate×7, Bash×7, Read×7 | — |
| reader-otta-repo | claude-sonnet-5 | 44 | 3m 55s | Read×19, Bash×9, ToolSearch×1 | — |
| reader-cog | claude-sonnet-5 | 28 | 3m 24s | Read×14, Bash×3, ToolSearch×1 | — |
| arch-plan | claude-sonnet-5 | 74 | 1m 37s | Read×24, Glob×13, Grep×9 | — |
| arch-review-plan | claude-sonnet-5 | 64 | 48s | Bash×22, Read×10, Grep×1 | — |
| research-qa | claude-sonnet-5 | 64 | 53s | Bash×18, Read×16, Glob×1 | — |
| general-purpose | claude-sonnet-5 | 106 | 5m 42s | Bash×42, Read×10, Edit×9 | — |
| bld-w1a-hooks | claude-sonnet-5 | 206 | 20m 24s | Bash×47, Read×29, Edit×18 | plugin-dev:hook-development |
| bld-w1b-dedup | claude-sonnet-5 | 239 | 23m 54s | Bash×92, Read×16, Edit×15 | — |
| bld-w5-gepa | claude-sonnet-5 | 208 | 9m 6s | Bash×54, Read×26, Edit×19 | — |
| general-purpose | claude-sonnet-5 | 96 | 12m 41s | Bash×30, Edit×11, Read×10 | — |
| general-purpose | claude-sonnet-5 | 54 | 3m 42s | Bash×17, Read×8, Glob×3 | — |
| general-purpose | claude-sonnet-5 | 77 | 10m 5s | Bash×30, Edit×6, Read×5 | — |
| rev-533 | claude-sonnet-5 | 35 | 4m 37s | Bash×15, Read×2, ToolSearch×1 | — |
| rev-534 | claude-sonnet-5 | 31 | 3m 0s | Bash×13, Read×1, ToolSearch×1 | — |
| rev-535 | claude-sonnet-5 | 26 | 2m 5s | Bash×8, Read×2, Grep×1 | — |
| rev-259 | claude-sonnet-5 | 51 | 5m 0s | Bash×24, ToolSearch×1, SendMessage×1 | — |
| rev-260 | claude-sonnet-5 | 79 | 7m 24s | Bash×32, Read×5, Write×1 | — |
| general-purpose | claude-sonnet-5 | 133 | 21m 41s | Bash×39, Read×22, Edit×11 | — |
| general-purpose | claude-sonnet-5 | 109 | 16m 18s | Bash×28, Read×14, Edit×9 | — |
| general-purpose | claude-sonnet-5 | 230 | 21s | Bash×94, Read×22, Edit×13 | — |
| rev-262 | claude-sonnet-5 | 110 | 1m 41s | Bash×32, Read×17, PowerShell×3 | — |
| rev-536 | claude-sonnet-5 | 73 | 5m 59s | Bash×25, Read×9, Grep×4 | — |
| rev-537 | claude-sonnet-5 | 52 | 4m 33s | Bash×20, Read×3, Grep×1 | — |
| general-purpose | claude-sonnet-5 | 160 | 12m 48s | Bash×53, Edit×18, Read×16 | — |
| e2e-qa-gate | claude-sonnet-5 | 66 | 4m 30s | Read×15, Grep×13, Glob×4 | — |
| e2e-hooks | claude-sonnet-5 | 56 | 4m 49s | Bash×24, Read×5, ToolSearch×1 | — |
| e2e-gepa | claude-sonnet-5 | 51 | 4m 40s | Bash×13, Grep×5, Read×4 | — |
| e2e-onboarding | claude-sonnet-5 | 55 | 33s | Bash×16, Grep×8, Read×6 | — |
| bld-dt-a12 | claude-sonnet-5 | 150 | 1m 45s | Bash×39, Read×14, Edit×11 | — |
| bld-run-a45 | claude-sonnet-5 | 103 | 30s | Bash×25, Read×10, Grep×8 | — |
| bld-run-a3 | claude-sonnet-5 | 148 | 12m 26s | Bash×44, Read×17, Edit×9 | — |
| rev-run-a45 | claude-sonnet-5 | 69 | 34s | Bash×24, Read×6, Grep×1 | — |
| rev-run-a3 | claude-sonnet-5 | 75 | 10m 32s | Bash×30, Read×11, Grep×4 | — |
| rev-dt-a12 | claude-sonnet-5 | 89 | 41s | Bash×34, Grep×5, Read×3 | — |
| e2e2-dt | claude-sonnet-5 | 51 | 4m 2s | Bash×19, Read×6, Glob×3 | — |
| runner:pm | claude-sonnet-5 | 67 | 11m 31s | Bash×14, Read×12, Grep×9 | superpowers:verification-before-completion, runner:loop-discipline, astramem:using-memory |
| runner:architect | claude-sonnet-5 | 20 | 3m 4s | Read×8, Skill×2, Glob×1 | runner:loop-discipline, astramem:using-memory |
| lane-feat249 | claude-sonnet-5 | 113 | 4m 11s | Bash×25, Read×16, Grep×10 | — |
| lane-feat236 | claude-sonnet-5 | 171 | 6m 10s | Bash×36, Read×27, Edit×24 | — |
| lane-feat266 | claude-sonnet-5 | 33 | 2m 22s | Bash×8, Read×5, Edit×2 | — |
| lane-devteam-preset | claude-sonnet-5 | 28 | 2m 8s | Bash×7, Read×3, Edit×2 | — |
| review-feat266 | claude-sonnet-5 | 19 | 1m 57s | Bash×4, Read×3, Write×1 | — |
| review-devteam-pr267 | claude-sonnet-5 | 25 | 2m 19s | Bash×5, Grep×4, Read×3 | — |
| review-feat249 | claude-sonnet-5 | 52 | 5m 59s | Bash×17, Read×4, Grep×4 | — |
| crew:reviewer | claude-sonnet-5 | 48 | 3m 46s | Bash×15, Grep×9, Read×2 | astramem:using-memory |
| runner:pm | claude-sonnet-5 | 58 | 5m 40s | Read×11, Grep×10, Bash×6 | astramem:using-memory, runner:loop-discipline |
| crew:reviewer | claude-sonnet-5 | 73 | 6m 1s | Bash×16, Grep×9, Read×8 | astramem:using-memory |
| crew:reviewer | claude-sonnet-5 | 52 | 5m 18s | Bash×21, Grep×4, Skill×1 | astramem:using-memory |
| arch-improve | claude-sonnet-5 | 17 | 1m 49s | Read×4, Bash×2, Grep×2 | — |
| arch-demolish | claude-sonnet-5 | 37 | 29s | Bash×16, Read×3, ToolSearch×1 | — |
| pm-intake | claude-sonnet-5 | 63 | 15m 7s | Bash×21, Read×13, Edit×2 | — |
| arch-classify | claude-sonnet-5 | 32 | 2m 45s | Read×9, Edit×7, Bash×3 | — |
| wave-slice-161 | claude-sonnet-5 | 115 | 36s | Bash×47, Read×15, Write×1 | — |
| rev-slice-161 | claude-sonnet-5 | 30 | 2m 33s | Bash×9, Read×6, ToolSearch×1 | — |
| wave-slice-162 | claude-sonnet-5 | 135 | 40s | Bash×43, Read×21, Grep×8 | — |
| wave-slice-166 | claude-sonnet-5 | 66 | 23s | Bash×18, Read×7, Grep×4 | — |
| wave-slice-176 | claude-sonnet-5 | 125 | 27s | Bash×29, Read×15, Grep×14 | — |
| rev-slice-166 | claude-sonnet-5 | 19 | 54s | Bash×5, Read×5, SendMessage×2 | — |
| rev-slice-162 | claude-sonnet-5 | 84 | 8m 11s | Bash×41, Read×5, ToolSearch×1 | — |
| rev-slice-176 | claude-sonnet-5 | 34 | 3m 6s | Bash×11, Read×5, ToolSearch×1 | — |
| wave-slice-163 | claude-sonnet-5 | 96 | 22s | Bash×20, Read×17, Grep×12 | — |
| wave-slice-167 | claude-sonnet-5 | 113 | 25s | Bash×22, Read×21, Edit×10 | — |
| wave-slice-177 | claude-sonnet-5 | 67 | 4m 45s | Grep×18, Read×12, Bash×6 | — |
| rev-slice-177 | claude-sonnet-5 | 36 | 15s | Bash×14, Read×4, Grep×3 | — |
| rev-slice-167 | claude-sonnet-5 | 41 | 2m 44s | Bash×14, Grep×5, Read×4 | — |
| rev-slice-163 | claude-sonnet-5 | 38 | 3m 32s | Bash×17, Read×3, ToolSearch×1 | — |
| wave-slice-165 | claude-sonnet-5 | 86 | 28s | Bash×26, Edit×9, Read×7 | — |
| wave-slice-168 | claude-sonnet-5 | 95 | 32s | Bash×19, Read×14, Edit×14 | — |
| wave-slice-174 | claude-sonnet-5 | 79 | 27s | Bash×20, Read×12, Grep×7 | — |
| rev-slice-165 | claude-sonnet-5 | 28 | 17s | Bash×7, Grep×4, Read×1 | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| unknown | n/a | 0 | n/a | — | — |
| rev-slice-168 | n/a | 0 | n/a | — | — |
| rev-slice-174 | n/a | 0 | n/a | — | — |

## Parallel groups

**Group 1** (2 agents, concurrent): arch-extraction-proposal, archrev-extraction-proposal
**Group 2** (8 agents, concurrent): crew:fullstack-dev, crew:fullstack-dev, w1-r0-echo-origin, crew:reviewer, r-lead-rename, runner:researcher, crew:researcher, crew:reviewer
**Group 3** (5 agents, concurrent): dt-drift-cleanup, dt-credit-loop, crew:fullstack-dev, r-dt-drift, crew:reviewer
**Group 4** (6 agents, concurrent): review-sliceB, review-chart, b1-testrot, b3-testrot, b4-testrot, review-batches
**Group 5** (3 agents, concurrent): cloud-obs-wave, w1-index, w3-testrot-scout
**Group 6** (7 agents, concurrent): w2-badge-dec, b2-testrot, b5-testrot, crew:dev-lite, general-purpose, general-purpose, general-purpose
**Group 7** (6 agents, concurrent): reader-devteam, reader-runner, reader-gepa, reader-astramem, reader-otta-repo, reader-cog
**Group 8** (3 agents, concurrent): arch-plan, arch-review-plan, research-qa
**Group 9** (8 agents, concurrent): bld-w1a-hooks, general-purpose, general-purpose, rev-536, rev-537, bld-w1b-dedup, rev-260, bld-w5-gepa
**Group 10** (6 agents, concurrent): general-purpose, general-purpose, general-purpose, rev-533, rev-534, rev-535
**Group 11** (2 agents, concurrent): rev-262, general-purpose
**Group 12** (3 agents, concurrent): e2e-qa-gate, e2e-hooks, e2e-gepa
**Group 13** (5 agents, concurrent): bld-dt-a12, bld-run-a3, rev-run-a3, bld-run-a45, rev-run-a45
**Group 14** (5 agents, concurrent): lane-feat249, lane-feat236, review-feat249, review-devteam-pr267, review-feat266
**Group 15** (2 agents, concurrent): lane-feat266, lane-devteam-preset
**Group 16** (3 agents, concurrent): wave-slice-176, rev-slice-162, rev-slice-176
**Group 17** (2 agents, concurrent): wave-slice-163, rev-slice-167
**Group 18** (2 agents, concurrent): wave-slice-165, wave-slice-168
**Group 19** (2 agents, concurrent): wave-slice-174, rev-slice-165

## Tool summary

| Tool | Total calls | Top agents |
|------|-------------|-----------|
| Bash | 3121 | crew:fullstack-dev×7, crew:reviewer×15, phase1-memory-tagging×9, phase1-review×10, phase2-e2e-suite×47, phase2-review×16, phase3a-scope-hygiene×15, phase3a-review×41, arch-extraction-proposal×3, archrev-extraction-proposal×7, crew:fullstack-dev×24, crew:fullstack-dev×51, crew:fullstack-dev×10, w1-r0-echo-origin×9, crew:reviewer×13, r-lead-rename×1, crew:researcher×8, crew:reviewer×41, crew:reviewer×65, dt-drift-cleanup×46, dt-credit-loop×50, crew:fullstack-dev×38, r-dt-drift×11, crew:reviewer×18, r-dt-creditloop×19, cloud-mapper×19, devteam-sliceB×59, cloud-usefulness-chart×37, review-sliceB×197, review-chart×98, cloud-obs-wave×28, w1-index×51, w2-badge-dec×50, w3-testrot-scout×54, b1-testrot×35, b2-testrot×37, b3-testrot×50, b4-testrot×29, b5-testrot×49, general-purpose×9, general-purpose×21, general-purpose×23, review-batches×17, reader-devteam×16, reader-runner×12, reader-gepa×23, reader-astramem×21, reader-otta-site×7, reader-otta-repo×9, reader-cog×3, arch-plan×2, arch-review-plan×22, research-qa×18, general-purpose×42, bld-w1a-hooks×47, bld-w1b-dedup×92, bld-w5-gepa×54, general-purpose×30, general-purpose×17, general-purpose×30, rev-533×15, rev-534×13, rev-535×8, rev-259×24, rev-260×32, general-purpose×39, general-purpose×28, general-purpose×94, rev-262×32, rev-536×25, rev-537×20, general-purpose×53, e2e-qa-gate×4, e2e-hooks×24, e2e-gepa×13, e2e-onboarding×16, bld-dt-a12×39, bld-run-a45×25, bld-run-a3×44, rev-run-a45×24, rev-run-a3×30, rev-dt-a12×34, e2e2-dt×19, runner:pm×14, lane-feat249×25, lane-feat236×36, lane-feat266×8, lane-devteam-preset×7, review-feat266×4, review-devteam-pr267×5, review-feat249×17, crew:reviewer×15, runner:pm×6, crew:reviewer×16, crew:reviewer×21, arch-improve×2, arch-demolish×16, pm-intake×21, arch-classify×3, wave-slice-161×47, rev-slice-161×9, wave-slice-162×43, wave-slice-166×18, wave-slice-176×29, rev-slice-166×5, rev-slice-162×41, rev-slice-176×11, wave-slice-163×20, wave-slice-167×22, wave-slice-177×6, rev-slice-177×14, rev-slice-167×14, rev-slice-163×17, wave-slice-165×26, wave-slice-168×19, wave-slice-174×20, rev-slice-165×7 |
| Read | 1336 | crew:fullstack-dev×6, crew:reviewer×2, phase1-memory-tagging×17, phase1-review×7, phase2-e2e-suite×23, phase2-review×12, phase3a-scope-hygiene×14, phase3a-review×11, arch-extraction-proposal×8, archrev-extraction-proposal×5, crew:fullstack-dev×21, crew:fullstack-dev×63, crew:fullstack-dev×6, w1-r0-echo-origin×4, crew:reviewer×4, r-lead-rename×2, runner:researcher×9, crew:researcher×2, crew:reviewer×10, crew:reviewer×9, dt-drift-cleanup×12, dt-credit-loop×69, crew:fullstack-dev×7, r-dt-drift×2, crew:reviewer×4, r-dt-creditloop×9, cloud-mapper×14, devteam-sliceB×30, cloud-usefulness-chart×21, review-sliceB×5, review-chart×27, cloud-obs-wave×23, w1-index×7, w2-badge-dec×17, w3-testrot-scout×8, b1-testrot×19, b2-testrot×18, b3-testrot×23, b4-testrot×3, b5-testrot×13, general-purpose×24, general-purpose×8, general-purpose×9, review-batches×2, reader-devteam×1, reader-runner×8, reader-astramem×9, reader-otta-site×7, reader-otta-repo×19, reader-cog×14, arch-plan×24, arch-review-plan×10, research-qa×16, general-purpose×10, bld-w1a-hooks×29, bld-w1b-dedup×16, bld-w5-gepa×26, general-purpose×10, general-purpose×8, general-purpose×5, rev-533×2, rev-534×1, rev-535×2, rev-260×5, general-purpose×22, general-purpose×14, general-purpose×22, rev-262×17, rev-536×9, rev-537×3, general-purpose×16, e2e-qa-gate×15, e2e-hooks×5, e2e-gepa×4, e2e-onboarding×6, bld-dt-a12×14, bld-run-a45×10, bld-run-a3×17, rev-run-a45×6, rev-run-a3×11, rev-dt-a12×3, e2e2-dt×6, runner:pm×12, runner:architect×8, lane-feat249×16, lane-feat236×27, lane-feat266×5, lane-devteam-preset×3, review-feat266×3, review-devteam-pr267×3, review-feat249×4, crew:reviewer×2, runner:pm×11, crew:reviewer×8, arch-improve×4, arch-demolish×3, pm-intake×13, arch-classify×9, wave-slice-161×15, rev-slice-161×6, wave-slice-162×21, wave-slice-166×7, wave-slice-176×15, rev-slice-166×5, rev-slice-162×5, rev-slice-176×5, wave-slice-163×17, wave-slice-167×21, wave-slice-177×12, rev-slice-177×4, rev-slice-167×4, rev-slice-163×3, wave-slice-165×7, wave-slice-168×14, wave-slice-174×12, rev-slice-165×1 |
| Edit | 579 | crew:fullstack-dev×1, phase1-memory-tagging×9, phase2-e2e-suite×6, phase3a-scope-hygiene×17, crew:fullstack-dev×13, crew:fullstack-dev×39, crew:fullstack-dev×4, dt-drift-cleanup×16, dt-credit-loop×42, crew:fullstack-dev×10, devteam-sliceB×27, cloud-usefulness-chart×7, review-sliceB×1, cloud-obs-wave×5, w1-index×1, w2-badge-dec×4, w3-testrot-scout×1, b1-testrot×44, b2-testrot×25, b3-testrot×20, b4-testrot×3, b5-testrot×18, general-purpose×7, general-purpose×1, general-purpose×10, general-purpose×9, bld-w1a-hooks×18, bld-w1b-dedup×15, bld-w5-gepa×19, general-purpose×11, general-purpose×1, general-purpose×6, general-purpose×11, general-purpose×9, general-purpose×13, general-purpose×18, e2e-qa-gate×2, bld-dt-a12×11, bld-run-a45×5, bld-run-a3×9, lane-feat249×8, lane-feat236×24, lane-feat266×2, lane-devteam-preset×2, pm-intake×2, arch-classify×7, wave-slice-161×1, wave-slice-162×3, wave-slice-166×3, wave-slice-176×3, wave-slice-167×10, wave-slice-177×2, wave-slice-165×9, wave-slice-168×14, wave-slice-174×1 |
| Grep | 503 | crew:reviewer×3, phase1-memory-tagging×11, phase2-e2e-suite×4, phase2-review×7, phase3a-scope-hygiene×7, arch-extraction-proposal×6, archrev-extraction-proposal×6, crew:fullstack-dev×6, crew:fullstack-dev×13, crew:fullstack-dev×1, w1-r0-echo-origin×12, crew:reviewer×1, r-lead-rename×2, runner:researcher×39, crew:reviewer×1, crew:reviewer×5, dt-drift-cleanup×10, dt-credit-loop×20, crew:fullstack-dev×5, r-dt-drift×1, crew:reviewer×9, devteam-sliceB×26, cloud-usefulness-chart×9, cloud-obs-wave×18, w2-badge-dec×6, b3-testrot×2, reader-runner×3, reader-astramem×3, reader-otta-site×1, arch-plan×9, arch-review-plan×1, bld-w1a-hooks×7, bld-w1b-dedup×2, bld-w5-gepa×6, general-purpose×5, general-purpose×3, rev-535×1, general-purpose×7, general-purpose×7, rev-262×2, rev-536×4, rev-537×1, e2e-qa-gate×13, e2e-gepa×5, e2e-onboarding×8, bld-run-a45×8, bld-run-a3×6, rev-run-a45×1, rev-run-a3×4, rev-dt-a12×5, runner:pm×9, lane-feat249×10, lane-feat236×10, review-devteam-pr267×4, review-feat249×4, crew:reviewer×9, runner:pm×10, crew:reviewer×9, crew:reviewer×4, arch-improve×2, wave-slice-162×8, wave-slice-166×4, wave-slice-176×14, wave-slice-163×12, wave-slice-167×8, wave-slice-177×18, rev-slice-177×3, rev-slice-167×5, wave-slice-168×7, wave-slice-174×7, rev-slice-165×4 |
| Write | 178 | crew:fullstack-dev×2, phase1-memory-tagging×1, phase1-review×1, phase2-e2e-suite×5, phase2-review×1, phase3a-scope-hygiene×2, phase3a-review×1, arch-extraction-proposal×1, archrev-extraction-proposal×1, crew:fullstack-dev×3, crew:fullstack-dev×7, crew:fullstack-dev×1, w1-r0-echo-origin×1, r-lead-rename×1, crew:reviewer×1, dt-drift-cleanup×1, dt-credit-loop×8, crew:fullstack-dev×1, r-dt-drift×1, r-dt-creditloop×1, devteam-sliceB×2, cloud-usefulness-chart×4, review-sliceB×10, review-chart×5, cloud-obs-wave×12, w2-badge-dec×2, w3-testrot-scout×6, b1-testrot×2, b2-testrot×1, b3-testrot×2, b5-testrot×3, general-purpose×21, general-purpose×8, general-purpose×1, review-batches×1, general-purpose×1, bld-w1a-hooks×9, bld-w1b-dedup×3, bld-w5-gepa×5, general-purpose×3, rev-260×1, general-purpose×2, general-purpose×1, general-purpose×2, general-purpose×2, e2e-qa-gate×1, e2e-gepa×1, bld-run-a45×2, bld-run-a3×4, runner:pm×1, lane-feat249×1, lane-feat236×4, lane-feat266×1, review-feat266×1, review-feat249×1, runner:pm×1, pm-intake×1, wave-slice-161×1, wave-slice-162×2, wave-slice-176×3, wave-slice-163×1, wave-slice-167×1, wave-slice-174×1 |
| ToolSearch | 129 | crew:fullstack-dev×2, crew:reviewer×1, phase1-memory-tagging×1, phase1-review×1, phase2-e2e-suite×1, phase2-review×1, phase3a-scope-hygiene×1, phase3a-review×1, arch-extraction-proposal×1, archrev-extraction-proposal×1, crew:fullstack-dev×2, crew:fullstack-dev×3, crew:fullstack-dev×3, w1-r0-echo-origin×1, crew:reviewer×1, r-lead-rename×1, runner:researcher×1, crew:reviewer×1, crew:reviewer×2, dt-drift-cleanup×1, dt-credit-loop×1, crew:fullstack-dev×2, r-dt-drift×1, r-dt-creditloop×1, cloud-mapper×1, devteam-sliceB×1, cloud-usefulness-chart×1, review-sliceB×3, review-chart×4, cloud-obs-wave×3, w1-index×1, w2-badge-dec×1, w3-testrot-scout×1, b1-testrot×2, b2-testrot×1, b3-testrot×2, b4-testrot×1, b5-testrot×1, review-batches×1, reader-devteam×1, reader-runner×1, reader-gepa×1, reader-astramem×1, reader-otta-site×3, reader-otta-repo×1, reader-cog×1, arch-plan×1, arch-review-plan×1, research-qa×1, bld-w1a-hooks×1, bld-w1b-dedup×2, bld-w5-gepa×2, rev-533×1, rev-534×1, rev-535×1, rev-259×1, rev-260×1, general-purpose×1, rev-262×3, rev-536×1, rev-537×1, e2e-hooks×1, e2e-gepa×1, e2e-onboarding×1, bld-dt-a12×3, bld-run-a45×1, bld-run-a3×1, rev-run-a45×1, rev-run-a3×1, rev-dt-a12×1, e2e2-dt×1, runner:pm×1, runner:architect×1, lane-feat266×1, lane-devteam-preset×1, review-feat266×1, review-devteam-pr267×1, review-feat249×1, crew:reviewer×1, runner:pm×1, crew:reviewer×2, crew:reviewer×1, arch-improve×1, arch-demolish×1, pm-intake×1, arch-classify×1, wave-slice-161×1, rev-slice-161×1, wave-slice-162×1, wave-slice-166×1, wave-slice-176×1, rev-slice-162×1, rev-slice-176×1, wave-slice-163×1, wave-slice-167×1, wave-slice-177×1, rev-slice-177×1, rev-slice-167×1, rev-slice-163×1, wave-slice-165×1, wave-slice-168×1, wave-slice-174×1, rev-slice-165×1 |
| Glob | 120 | crew:fullstack-dev×4, phase1-memory-tagging×7, phase2-e2e-suite×1, archrev-extraction-proposal×3, crew:fullstack-dev×4, crew:fullstack-dev×6, crew:fullstack-dev×1, w1-r0-echo-origin×9, runner:researcher×1, cloud-usefulness-chart×2, cloud-obs-wave×4, w1-index×2, b4-testrot×1, reader-runner×1, arch-plan×13, research-qa×1, general-purpose×3, general-purpose×4, e2e-qa-gate×4, e2e-onboarding×1, bld-dt-a12×1, bld-run-a3×2, rev-run-a3×2, e2e2-dt×3, runner:pm×2, runner:architect×1, lane-feat249×3, runner:pm×5, arch-classify×1, wave-slice-162×1, wave-slice-166×2, wave-slice-176×6, wave-slice-163×1, wave-slice-167×5, wave-slice-177×2, wave-slice-165×2, wave-slice-168×4, wave-slice-174×5 |
| SendMessage | 117 | crew:fullstack-dev×1, phase1-memory-tagging×1, phase1-review×1, phase2-e2e-suite×1, phase2-review×1, phase3a-scope-hygiene×1, phase3a-review×1, arch-extraction-proposal×1, archrev-extraction-proposal×1, crew:fullstack-dev×1, crew:fullstack-dev×2, crew:fullstack-dev×1, w1-r0-echo-origin×1, r-lead-rename×1, dt-drift-cleanup×1, dt-credit-loop×1, crew:fullstack-dev×1, r-dt-drift×1, r-dt-creditloop×1, cloud-mapper×1, devteam-sliceB×2, cloud-usefulness-chart×1, review-sliceB×5, review-chart×5, cloud-obs-wave×1, w1-index×1, w2-badge-dec×2, w3-testrot-scout×1, b1-testrot×2, b2-testrot×1, b3-testrot×2, b4-testrot×2, b5-testrot×2, review-batches×1, reader-devteam×1, reader-runner×1, reader-gepa×2, reader-astramem×2, reader-otta-site×1, reader-otta-repo×1, reader-cog×1, arch-plan×1, arch-review-plan×1, research-qa×1, bld-w1a-hooks×3, bld-w1b-dedup×2, bld-w5-gepa×1, rev-533×1, rev-534×1, rev-535×1, rev-259×1, rev-260×1, general-purpose×1, rev-262×2, rev-536×1, rev-537×1, e2e-qa-gate×2, e2e-hooks×1, e2e-gepa×1, e2e-onboarding×1, bld-dt-a12×1, bld-run-a45×1, bld-run-a3×1, rev-run-a45×1, rev-run-a3×1, rev-dt-a12×1, e2e2-dt×1, lane-feat266×1, lane-devteam-preset×1, review-feat266×1, review-devteam-pr267×1, review-feat249×1, arch-improve×1, arch-demolish×1, pm-intake×1, arch-classify×1, wave-slice-161×1, rev-slice-161×1, wave-slice-162×1, wave-slice-166×1, wave-slice-176×1, rev-slice-166×2, rev-slice-162×1, rev-slice-176×1, wave-slice-163×1, wave-slice-167×1, wave-slice-177×1, rev-slice-177×1, rev-slice-167×1, rev-slice-163×1, wave-slice-165×1, wave-slice-168×1, wave-slice-174×1, rev-slice-165×1 |
| Skill | 23 | crew:fullstack-dev×1, crew:reviewer×1, crew:fullstack-dev×1, crew:fullstack-dev×1, crew:fullstack-dev×1, crew:reviewer×1, runner:researcher×2, crew:reviewer×1, crew:reviewer×1, crew:fullstack-dev×1, crew:reviewer×1, bld-w1a-hooks×1, runner:pm×3, runner:architect×2, crew:reviewer×1, runner:pm×2, crew:reviewer×1, crew:reviewer×1 |
| TaskUpdate | 18 | cloud-obs-wave×18 |
| mcp__plugin_crew_astramem__recall_memory | 17 | crew:fullstack-dev×1, crew:reviewer×1, crew:fullstack-dev×1, crew:fullstack-dev×1, crew:reviewer×1, runner:researcher×1, crew:reviewer×2, crew:reviewer×1, crew:fullstack-dev×1, cloud-obs-wave×1, runner:pm×1, runner:architect×1, crew:reviewer×1, runner:pm×1, crew:reviewer×1, crew:reviewer×1 |
| mcp__plugin_crew_astramem__agent_profile | 13 | crew:fullstack-dev×1, crew:reviewer×1, crew:reviewer×1, runner:researcher×1, crew:reviewer×1, crew:reviewer×1, crew:fullstack-dev×1, runner:pm×1, runner:architect×1, crew:reviewer×1, runner:pm×1, crew:reviewer×1, crew:reviewer×1 |
| mcp__plugin_crew_astramem__submit_feedback | 10 | crew:fullstack-dev×2, crew:reviewer×3, crew:reviewer×1, crew:fullstack-dev×3, crew:reviewer×1 |
| mcp__plugin_crew_astramem__remember | 9 | crew:fullstack-dev×1, crew:reviewer×1, crew:fullstack-dev×1, crew:reviewer×2, crew:fullstack-dev×1, runner:pm×1, runner:pm×1, crew:reviewer×1 |
| TaskCreate | 9 | cloud-obs-wave×9 |
| mcp__plugin_playwright_playwright__browser_navigate | 7 | reader-otta-site×7 |
| Agent | 6 | r-lead-rename×2, b1-testrot×2, b4-testrot×2 |
| mcp__plugin_playwright_playwright__browser_take_screenshot | 6 | reader-otta-site×6 |
| PowerShell | 5 | crew:reviewer×1, crew:reviewer×1, rev-262×3 |
| mcp__plugin_playwright_playwright__browser_snapshot | 3 | reader-otta-site×3 |
| Monitor | 3 | bld-w1b-dedup×1, bld-w5-gepa×1, bld-dt-a12×1 |
| mcp__plugin_playwright_playwright__browser_console_messages | 1 | reader-otta-site×1 |
