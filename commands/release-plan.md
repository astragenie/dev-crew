---
description: Plan a release — collect all FEAT entries targeting a version, group by parent spec, write release notes to docs/releases/v<X.Y.Z>.md.
---

# Release Plan

Generates a structured release report from backlog state. Includes everything
targeting the given version: `done` features (shipped), plus
`in-progress` / `triaged` / `pending` (in flight).

Usage:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/autonomous-loop.mjs" release plan \
  --repo "$PWD" \
  --version v1.1.0
```

`--version` accepts `1.1.0` or `v1.1.0` (normalized to `v1.1.0`).

Returns JSON:

```json
{
  "version": "v1.1.0",
  "status": "READY" | "IN_PROGRESS" | "EMPTY",
  "artifactPath": "docs/releases/v1.1.0.md",
  "featureCount": 12,
  "shipped": 9,
  "inFlight": 3,
  "bySpec": ["SPEC-001", "SPEC-003"]
}
```

Side effect: writes / overwrites `docs/releases/v<X.Y.Z>.md`. The file groups
features under their parent spec (if any) and surfaces an "_standalone_"
section for features not tied to a spec. Shows badges per feature:
`✓ shipped`, `● in flight`, `○ triaged`, `○ pending`.

When `status: READY` the report also includes instructions for cutting the
release (tag, push, optionally archive done features into a version-stamped
subdir to keep `done/` short).

Use this:
- At the end of a sprint to see what's actually ready to ship
- During planning to confirm a target version has the right scope
- Auto-invoked by the Phase Completion Gate when a phase closes (v0.1.5 +)

For a leaner status check without writing a file, use:

```bash
node ... release status --repo "$PWD" --version v1.1.0
```

Returns just the counts (total / done / in-progress / triaged / pending) as
JSON. No artifact written.
