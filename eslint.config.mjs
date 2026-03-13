import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

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

  // React rules for admin and mobile packages
  {
    files: ["packages/admin/src/**/*.{ts,tsx}", "packages/mobile/src/**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Not needed with React 17+ JSX transform
      "react/prop-types": "off", // TypeScript handles prop types
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // Relax some rules for test files
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
