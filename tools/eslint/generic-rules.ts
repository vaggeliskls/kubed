import { InfiniteDepthConfigWithExtends } from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default {
  ignores: ["src/**/*.spec.ts", "src/**/*.test.ts"],
  files: ["./src/**/*.ts", "./src/**/*.tsx"],
  plugins: {
    "@typescript-eslint": tseslint.plugin,
    "unused-imports": unusedImports,
  },
  extends: [],
  rules: {
    "no-unused-vars": "off",
    "no-undef": "off",
    "unused-imports/no-unused-imports": "error",
    "no-duplicate-imports": "error",
    "no-console": "error",
    eqeqeq: "error",
    "spaced-comment": [
      "error",
      "always",
      {
        block: {
          exceptions: ["*"],
        },
      },
    ],
    "arrow-parens": ["error", "as-needed"],
    "space-in-parens": "error",
    "space-before-function-paren": [
      "error",
      {
        named: "never",
        asyncArrow: "always",
      },
    ],

    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: "typeLike",
        format: ["PascalCase", "UPPER_CASE"],
      },
      {
        selector: "class",
        modifiers: ["exported"],
        format: ["PascalCase"],
      },
      {
        selector: "function",
        modifiers: ["exported"],
        format: ["camelCase"],
      },
      {
        selector: "interface",
        modifiers: ["exported"],
        format: ["PascalCase"],
      },
      {
        selector: "variable",
        modifiers: ["destructured"],
        format: null,
      },
      {
        selector: "variable",
        format: ["camelCase"],
      },
      {
        selector: "variable",
        modifiers: ["global"],
        format: ["UPPER_CASE", "camelCase", "PascalCase"],
      },
      {
        selector: "variable",
        modifiers: ["exported"],
        format: ["UPPER_CASE", "camelCase", "PascalCase"],
      },
      {
        selector: "class",
        modifiers: ["abstract"],
        format: ["PascalCase"],
      },
      {
        selector: "enum",
        format: ["StrictPascalCase"],
        suffix: ["Enum"],
      },
      {
        selector: "enum",
        modifiers: ["exported"],
        format: ["StrictPascalCase"],
        suffix: ["Enum"],
      },
      {
        selector: "enumMember",
        format: ["StrictPascalCase"],
      },
    ],
  },
} as InfiniteDepthConfigWithExtends;
