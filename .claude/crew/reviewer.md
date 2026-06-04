# Repo Reviewer Instructions — loop

This repo is a Claude Code plugin. Apply these additional review gates
for plugin-specific changes.

## Plugin component changes

When the diff touches any of these paths, invoke
`plugin-dev:plugin-validator` and include its output in the review:

- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `.claude-plugin/hooks/`
- `agents/*.md`
- `commands/*.md`

## Skill changes

When the diff touches `skills/*.md`, invoke `plugin-dev:skill-reviewer`
on each changed skill file. Include its quality assessment in the review
findings.

## Manifest validation

Run `node scripts/validate-manifests.mjs` as part of the review.
Failure is a blocking finding.
