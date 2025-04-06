import eslint from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["node_modules", "dist"],
    files: ["./src/**/*.ts", "./src/**/*.tsx"],
    languageOptions: {
      parser: eslint,
    },
    plugins: {},
    rules: {
      "no-console": "error",
      "no-unused-vars": "off",
    },
  },
]);
