import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // The Express handlers and SDK mocks intentionally use `any` at the
      // boundary; keep it visible as a warning rather than failing the build.
      "@typescript-eslint/no-explicit-any": "warn",
      // Ignore unused function args (e.g. Express `req`) and `_`-prefixed vars.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { args: "none", varsIgnorePattern: "^_" },
      ],
    },
  },
);
