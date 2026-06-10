// See hero-crew/eslint.config.mjs for rationale.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";

// Sub-module boundary rule: imports of slice-linker sub-modules
// (scripts/lib/slice-linker/*.mjs) must go through the barrel
// (scripts/lib/slice-linker.mjs) and must never be imported
// directly from outside of slice-linker.mts.
//
// Pattern: any .mts file that is NOT src/scripts/lib/slice-linker.mts
// must not import from ../scripts/lib/slice-linker/*.
const sliceLinkerBoundaryRule = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: ["**/slice-linker/feature-lifecycle*"],
          message:
            "Import from scripts/lib/slice-linker.mts barrel instead of sub-module directly."
        },
        {
          group: ["**/slice-linker/complete-slice*"],
          message:
            "Import from scripts/lib/slice-linker.mts barrel instead of sub-module directly."
        },
        {
          group: ["**/slice-linker/start-slice*"],
          message:
            "Import from scripts/lib/slice-linker.mts barrel instead of sub-module directly."
        },
        {
          group: ["**/slice-linker/dispatch*"],
          message:
            "Import from scripts/lib/slice-linker.mts barrel instead of sub-module directly."
        },
        {
          group: ["**/slice-linker/crew-bridge*"],
          message:
            "Import from scripts/lib/slice-linker.mts barrel instead of sub-module directly."
        },
        {
          group: ["**/slice-linker/slice-progress*"],
          message:
            "Import from scripts/lib/slice-linker.mts barrel instead of sub-module directly."
        },
        {
          group: ["**/slice-linker/agent-report-writer*"],
          message:
            "Import from scripts/lib/slice-linker.mts barrel instead of sub-module directly."
        }
      ]
    }
  ]
};

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "eqeqeq": ["error", "smart"],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-implicit-globals": "error",
      "max-lines-per-function": ["warn", { max: 120, skipBlankLines: true, skipComments: true }],
      "complexity": ["warn", 15]
    }
  },
  {
    // Apply boundary rule to non-test source files only.
    // Exceptions:
    //   - The barrel (src/scripts/lib/slice-linker.mts) re-exports from sub-modules — allowed.
    //   - Unit-test files targeting individual sub-modules are allowed to import directly.
    //     These include tests named after the sub-module they cover.
    files: ["src/scripts/**/*.mts"],
    ignores: [
      "src/scripts/lib/slice-linker.mts",
      "src/scripts/lib/slice-linker/**/*.mts"
    ],
    rules: {
      ...sliceLinkerBoundaryRule
    }
  },
  {
    files: ["src/tests/**/*.mts", "tests/**/*.mjs"],
    plugins: { sonarjs },
    rules: {
      "max-lines-per-function": "off",
      "complexity": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      // Surface repeated literals (ids, paths, preset names) so they get
      // hoisted into src/tests/_fixtures.mts. WARN for now — the remaining
      // warnings are the incremental cleanup backlog; flip to "error" once
      // the suite is migrated onto the shared fixtures.
      "sonarjs/no-duplicate-string": ["warn", { threshold: 5 }]
    }
  },
  {
    ignores: ["dist/**", "scripts/**", "tests/**"]
  }
];
