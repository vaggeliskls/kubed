// @ts-check
import eslint from "@eslint/js";
import jestPlugin from "eslint-plugin-jest";
import tseslint from "typescript-eslint";

import genericRules from "./tools/eslint/generic-rules";
import typescriptRules from "./tools/eslint/typescript-rules";

export default tseslint.config(
  {
    ignores: ["**/assets/**", "**/bin/**", "**/dist/**", "**/node_modules/**"],
  },
  eslint.configs.recommended,
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      jest: jestPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        allowDefaultProject: true,
      },
    },
    extends: [],
    ignores: ["src/**/*.spec.ts", "src/**/*.test.ts"],
    files: ["./src/**/*.ts", "./src/**/*.tsx"],
  },
  genericRules,
  typescriptRules,
  {
    // disable type-aware linting on JS files
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // enable jest rules on test files
    files: ["test/**", "src/**/*.spec.ts", "src/**/*.test.ts"],
    extends: [jestPlugin.configs["flat/recommended"]],
  }
);
