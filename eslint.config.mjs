import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Ignore built artifacts and generated files
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "packages/api/generated/**",
    ],
  },

  // Base JS + TS rules for all packages
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Override specific rules for the codebase
  {
    rules: {
      // Downgraded to warn — existing codebase has many `any` usages; fix incrementally
      "@typescript-eslint/no-explicit-any": "warn",
      // Downgraded to warn — unused vars/imports are common in existing code
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      // Downgraded to warn — empty interfaces are common in WIP code
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },

  // Relax rules further for test files
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
