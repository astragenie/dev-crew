// See hero-crew/eslint.config.mjs for rationale.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

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
    files: ["src/tests/**/*.mts", "tests/**/*.mjs"],
    rules: {
      "max-lines-per-function": "off",
      "complexity": "off",
      "@typescript-eslint/ban-ts-comment": "off"
    }
  },
  {
    ignores: ["dist/**", "scripts/**", "tests/**"]
  }
];
