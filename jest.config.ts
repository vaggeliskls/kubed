export default {
  transform: {
    "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "./tsconfig.spec.json" }],
  },
  testEnvironment: "node",
  testRegex: "./src/.*\\.(test|spec)?\\.(ts|ts)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  roots: ["./src"],
};
