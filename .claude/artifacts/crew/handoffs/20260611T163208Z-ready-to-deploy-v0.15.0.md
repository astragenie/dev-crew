---
kind: handoff
objective: Deploy release v0.15.0 — all targeted features complete
owner: deployer
release: v0.15.0
feature_count: 4
created_at: 2026-06-11
confidence: high
next_handoff: deployment-evidence
---
# Handoff — Release v0.15.0 ready to deploy

## Objective

Phase-gate PASSed. All 4 feature(s) targeting `v0.15.0` are in `done/`. Cut + deploy the release.

## Allowed scope

1. Run `/loop:release plan --version v0.15.0` to refresh the release notes with current status.
2. `git tag v0.15.0 && git push origin v0.15.0` once the release notes look right.
3. Run the deployer agent / scripts per repo deployment guidance.
4. Capture deployment evidence via crew `write-deployment-result`.

## Forbidden scope

- Production promotion without explicit user approval (per crew constitution).

## Features in this release

- FEAT-063: `.claude/artifacts/loop/backlog/done/FEAT-063.md`
- FEAT-064: `.claude/artifacts/loop/backlog/done/FEAT-064.md`
- FEAT-065: `.claude/artifacts/loop/backlog/done/FEAT-065.md`
- FEAT-066: `.claude/artifacts/loop/backlog/done/FEAT-066.md`

## Confidence

High — all features in done/, phase-gate passed.

## Risks or open questions

- Verify no in-progress slices still touch the same area (`/loop:brief` for in-flight state).
