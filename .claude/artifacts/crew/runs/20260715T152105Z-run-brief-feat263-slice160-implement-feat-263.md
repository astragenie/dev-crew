---
feature: FEAT-263
status: active
---
# Run Brief: FEAT263 SLICE160: Implement FEAT-263

- Created: 2026-07-15T15:21:05.804Z
- Tier: full
- Goal: Astramem memory e2e: preflight the astramem-local daemon on 127.0.0.1:7777 before exercising MCP tools. Add a health-check helper that GETs /health with a short timeout and, when the daemon is unreachable or status not in {ok,starting,degraded}, fails fast with an actionable message telling the operator to start the daemon (node dist/cli/index.js reinstall, or serve --port 7777) instead of an opaque ECONNREFUSED. Support an ASTRAMEM_E2E env toggle to skip vs require the memory e2e. Document the 
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - bullet 1
- bullet 2
- Out Of Scope:
  - - bullet 1
- Planned Files: -
- Next Step: Begin implementation

