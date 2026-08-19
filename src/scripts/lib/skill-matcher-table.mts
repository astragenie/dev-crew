// skill-matcher-table.mts — FEAT-007/SLICE-35 task-signal -> skill id rule
// table. Plain data, no I/O. Sibling of skill-matcher.mts, which consumes
// this table against a live SkillCatalogEntry map (see skill-catalog.mjs).
//
// Keys are exact tag strings from a FEAT/slice's `tags:` frontmatter array,
// restricted to the `stack:`, `concern:`, and `surface:` prefixes:
//   - `stack:*`   — implementation language/framework signals.
//   - `concern:*` — cross-cutting problem-domain signals.
//   - `surface:*` — the risk-classifier's own vocabulary
//     (risk-classifier.mts:15-16, e.g. "surface:schema"/"surface:api").
// `area:*` is deliberately NOT a matcher key — it is repo-local bucketing
// (see this repo's own FEAT-007..019 frontmatter for examples), too
// fine-grained to generalize into a cross-repo skill mapping.
//
// Every `skillIds` entry below is a real directory basename under
// skills/domain/** at the time this table was authored (verified via
// `find skills/domain -name SKILL.md`). matchSkills() re-validates every id
// against the LIVE catalog at resolve time regardless — an id here going
// stale (renamed/removed skill dir) surfaces as `unresolved`, not a silent
// drop (AC-2), so this table does not need to be perfectly in sync with the
// tree to fail safely.
//
// `stack:vue` is a deliberate exception: it points at `vue-engineering`,
// which is confirmed dead (removed when crew reorganized skills/domain/ —
// see docs/planning/feat-007-skill-matcher-contract.md's dead-ID
// re-verification). It is kept here on purpose rather than omitted, so a
// live `stack:vue` tag surfaces the drift via `unresolved` instead of
// silently resolving to zero skills — this is exactly the original defect
// (dotnet-typescript-vue.json referencing a since-removed skill id) this
// FEAT exists to catch, reproduced as a real rule instead of a synthetic
// test fixture only.

import type { SkillMatchRule } from "./skill-matcher.mjs";

export const SKILL_MATCH_TABLE: readonly SkillMatchRule[] = [
  // --- stack:* ---
  { tag: "stack:typescript", skillIds: ["typescript-pro", "node-ts-patterns"] },
  { tag: "stack:javascript", skillIds: ["js-conventions"] },
  {
    tag: "stack:csharp",
    skillIds: ["csharp-conventions", "aspnetcore-patterns", "ef-core-patterns"]
  },
  {
    tag: "stack:dotnet",
    skillIds: ["csharp-conventions", "aspnetcore-patterns", "ef-core-patterns"]
  },
  { tag: "stack:python", skillIds: ["python-pro"] },
  { tag: "stack:dart", skillIds: ["dart-conventions"] },
  { tag: "stack:flutter", skillIds: ["flutter-conventions", "dart-conventions"] },
  { tag: "stack:react", skillIds: ["react-engineering", "react-ui-quality"] },
  // Deliberately dead — see module header. vue-engineering was removed when
  // crew reorganized skills/domain/; kept so drift is caught, not hidden.
  { tag: "stack:vue", skillIds: ["vue-engineering"] },

  // --- concern:* ---
  { tag: "concern:security", skillIds: ["security-advisory", "security-sweep"] },
  { tag: "concern:database", skillIds: ["database-architecture"] },
  { tag: "concern:data-migration", skillIds: ["database-architecture"] },
  { tag: "concern:api-design", skillIds: ["api-architecture", "openapi-authoring"] },
  { tag: "concern:contract-codegen", skillIds: ["contract-codegen"] },
  { tag: "concern:deployment", skillIds: ["deployment-patterns"] },
  { tag: "concern:release-engineering", skillIds: ["release-engineer-reference"] },
  { tag: "concern:cloud-infra", skillIds: ["cloud-architecture", "terraform-ops-traps"] },
  { tag: "concern:docker", skillIds: ["docker-expert"] },
  { tag: "concern:devops", skillIds: ["devops-engineering"] },
  { tag: "concern:microservices", skillIds: ["microservices-patterns"] },
  { tag: "concern:mcp-integration", skillIds: ["mcp-integration"] },
  { tag: "concern:prompt-engineering", skillIds: ["prompt-engineering"] },
  { tag: "concern:ai-engineering", skillIds: ["ai-engineering"] },
  { tag: "concern:architecture-review", skillIds: ["architecture-advisory", "fullstack-advisory"] },
  { tag: "concern:task-decomposition", skillIds: ["task-decomposition"] },
  { tag: "concern:diagramming", skillIds: ["diagram-methodology"] },
  {
    tag: "concern:ui-design",
    skillIds: ["product-ui-patterns", "frontend-design", "ux-methodology"]
  },
  { tag: "concern:styling", skillIds: ["tailwind-patterns"] },
  { tag: "concern:mobile-design", skillIds: ["mobile-design"] },

  // --- surface:* (risk-classifier.mts vocabulary) ---
  { tag: "surface:api", skillIds: ["api-architecture", "openapi-authoring", "contract-codegen"] },
  { tag: "surface:schema", skillIds: ["database-architecture", "ef-core-patterns"] },
  { tag: "surface:ui", skillIds: ["product-ui-patterns", "react-engineering", "frontend-design"] }
];
