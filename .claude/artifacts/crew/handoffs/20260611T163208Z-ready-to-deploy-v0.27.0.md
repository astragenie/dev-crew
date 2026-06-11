---
kind: handoff
objective: Deploy release v0.27.0 — all targeted features complete
owner: deployer
release: v0.27.0
feature_count: 2
created_at: 2026-06-11
confidence: high
next_handoff: deployment-evidence
---
# Handoff — Release v0.27.0 ready to deploy

## Objective

Phase-gate PASSed. All 2 feature(s) targeting `v0.27.0` are in `done/`. Cut + deploy the release.

## Allowed scope

1. Run `/loop:release plan --version v0.27.0` to refresh the release notes with current status.
2. `git tag v0.27.0 && git push origin v0.27.0` once the release notes look right.
3. Run the deployer agent / scripts per repo deployment guidance.
4. Capture deployment evidence via crew `write-deployment-result`.

## Forbidden scope

- Production promotion without explicit user approval (per crew constitution).

## Features in this release

- FEAT-074: `.claude/artifacts/loop/backlog/done/FEAT-074.md`
- FEAT-076: `.claude/artifacts/loop/backlog/done/FEAT-076.md`

## Confidence

High — all features in done/, phase-gate passed.

## Risks or open questions

- Verify no in-progress slices still touch the same area (`/loop:brief` for in-flight state).
