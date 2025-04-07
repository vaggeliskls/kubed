import { InfiniteDepthConfigWithExtends } from "typescript-eslint";
import tseslint from "typescript-eslint";
import stylisticTs from "@stylistic/eslint-plugin-ts";

export default {
  ignores: ["src/**/*.spec.ts", "src/**/*.test.ts"],
  files: ["./src/**/*.ts", "./src/**/*.tsx"],
  plugins: {
    "@typescript-eslint": tseslint.plugin,
    "@stylistic/ts": stylisticTs,
  },
  rules: {
    semi: ["error", "always"],
    quotes: ["error", "double"],
    "@stylistic/ts/function-call-spacing": ["error", "never"],
    "@typescript-eslint/no-inferrable-types": "error",
    "@typescript-eslint/require-array-sort-compare": "error",
    "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
    "@typescript-eslint/no-unnecessary-type-constraint": "error",
    "@typescript-eslint/no-unsafe-declaration-merging": "error",
    "@typescript-eslint/prefer-as-const": "error",
    "@typescript-eslint/prefer-string-starts-ends-with": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/no-unnecessary-qualifier": "error",
    "@typescript-eslint/restrict-plus-operands": "error",
    "@typescript-eslint/no-extra-non-null-assertion": "error",
    "@typescript-eslint/no-unnecessary-type-arguments": "error",

    "@typescript-eslint/no-useless-constructor": "error",
    "@typescript-eslint/no-use-before-define": "error",
    "@typescript-eslint/consistent-generic-constructors": "error",
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "as",
        objectLiteralTypeAssertions: "allow",
      },
    ],
    "@typescript-eslint/no-confusing-non-null-assertion": "error",
    "@typescript-eslint/switch-exhaustiveness-check": "error",
    "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
    "@typescript-eslint/triple-slash-reference": [
      "error",
      {
        path: "always",
        types: "always",
        lib: "always",
      },
    ],
    "@typescript-eslint/consistent-type-definitions": "error",
    "@typescript-eslint/no-duplicate-enum-values": "error",
    "@typescript-eslint/no-implied-eval": "error",

    "@typescript-eslint/no-restricted-types": "error",
    "@typescript-eslint/no-empty-object-type": "error",
    "@typescript-eslint/no-unsafe-function-type": "error",
    "@typescript-eslint/no-wrapper-object-types": "error",
    "no-restricted-globals": ["error", "event", "fdescribe"],
    "no-restricted-properties": [
      2,
      {
        object: "disallowedObjectName",
        property: "disallowedPropertyName",
      },
    ],

    "@typescript-eslint/prefer-includes": "error",
    "@typescript-eslint/member-ordering": [
      "error",
      {
        default: [
          "signature",
          "public-static-field",
          "protected-static-field",
          "private-static-field",
          "public-abstract-field",
          "protected-abstract-field",
          "private-decorated-field",
          "private-instance-field",
          "protected-decorated-field",
          "protected-instance-field",
          "public-decorated-field",
          "public-instance-field",
          "public-constructor",
          "protected-constructor",
          "private-constructor",
          "public-static-method",
          "protected-static-method",
          "private-static-method",
          "public-abstract-get",
          "public-abstract-set",
          "protected-abstract-get",
          "protected-abstract-set",
          "public-abstract-method",
          "protected-abstract-method",
          "public-decorated-method",
          "public-instance-method",
          "protected-decorated-method",
          "protected-instance-method",
          "private-decorated-method",
          "private-instance-method",
        ],
      },
    ],
    "@typescript-eslint/explicit-member-accessibility": [
      "error",
      {
        accessibility: "no-public",
      },
    ],
  },
} as InfiniteDepthConfigWithExtends;
