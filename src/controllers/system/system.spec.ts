import { containsWord } from "./system";

describe("containsWord", () => {
  it("should return true if the word is in the text", () => {
    expect(containsWord("Hello World", "World")).toBe(true);
  });
});
