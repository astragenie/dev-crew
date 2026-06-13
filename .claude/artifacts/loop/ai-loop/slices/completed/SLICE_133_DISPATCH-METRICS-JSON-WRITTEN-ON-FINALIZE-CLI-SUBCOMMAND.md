---
id: SLICE-133
title: dispatch-metrics.json written on finalize + dispatch metrics CLI subcommand
status: completed
feature: FEAT-094
phase: null
priority: P3
target_release: null
requires_validation: false
created: 2026-06-13
updated: 2026-06-13
github_issue: 174
github_url: "https://github.com/sergeymilashico/loop/issues/174"
completed_at: 2026-06-13
---
# SLICE-133: dispatch-metrics.json written on finalize + dispatch metrics CLI subcommand

Implements FEAT-094. See [feature file](../../../backlog/in-progress/FEAT-094.md) for product context.

## Objective

After `dispatch finalize` completes, write `.claude/artifacts/loop/dispatch/<runId>/dispatch-metrics.json` with token counts, cost, model, timing, and child count. Add `dispatch metrics --run-id <id>` CLI subcommand to read it back as machine-parseable JSON.

## Acceptance Criteria

- AC-001: finalize writes dispatch-metrics.json with all required fields on success
- AC-002: `dispatch metrics --run-id <id>` prints JSON to stdout, exits 0
- AC-003: partial status written when all children fail/are blocked
- AC-004: metrics write failure does NOT abort dispatch (non-blocking, stderr warn only)
- AC-005: unknown run-id exits 1 with `[dispatch-metrics] not found: <id>` on stderr
