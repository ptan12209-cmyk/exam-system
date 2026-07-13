import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Progressive lint: legacy `any` / unused are warnings so CI can gate
 * on real errors while we clean the codebase. Tighten over time.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
    // Tooling / plan dumps / seed helpers — not app runtime
    ".agents/**",
    ".claude/**",
    ".cursor/**",
    ".gemini/**",
    ".grok/**",
    "docs/**",
    "migrations/**",
    "seed_*.js",
    "examhub_bot_allinone_plan.jsx",
    "**/discord_examhub_sprint_plan.jsx",
    "node_modules/**",
  ]),
  {
    rules: {
      // ~300 legacy sites — warn until online-first modules are fully typed
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // React 19 compiler-style rules flood the legacy app (100+ setState-in-effect).
      // Re-enable gradually after online-study extract; do not block CI today.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      // Vietnamese copy uses "quotes" freely — warn only
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/ban-ts-comment": [
        "warn",
        { "ts-ignore": "allow-with-description" },
      ],
      // Still hard-fail on these
      "@typescript-eslint/no-require-imports": "error",
      "prefer-const": "error",
    },
  },
]);

export default eslintConfig;
