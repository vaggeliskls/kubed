// @ts-check
import eslint from "@eslint/js";
import jestPlugin from "eslint-plugin-jest";
import tseslint from "typescript-eslint";

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
    ignores: ["src/**/*.spec.ts", "src/**/*.test.ts"],
    files: ["./src/**/*.ts", "./src/**/*.tsx"],
    rules: {
      "no-console": "error",
      "no-unused-vars": "off",
      "no-undef": "off",
    },
  },
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
