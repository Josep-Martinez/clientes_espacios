import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      ".codex/**",
      "supabase/.temp/**",
      "supabase/.branches/**",
    ],
  },
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error",
    },
  },
  {
    ...eslint.configs.recommended,
    files: [
      "scripts/**/*.{js,mjs,cjs}",
      "tests/**/*.{js,mjs,cjs}",
      "eslint.config.mjs",
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parser: tseslint.parser,
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
