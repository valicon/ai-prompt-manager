import { describe, it, expect } from "vitest";
import { scorePrompt } from "./promptScore";

describe("scorePrompt", () => {
  it("returns score, warnings, and dimensions", () => {
    const result = scorePrompt("Create a React component");
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("problems");
    expect(result).toHaveProperty("suggestions");
    expect(result).toHaveProperty("dimensions");
    expect(typeof result.score).toBe("number");
    expect(Array.isArray(result.problems)).toBe(true);
    expect(Array.isArray(result.suggestions)).toBe(true);
  });

  it("scores very short prompts low on clarity", () => {
    const short = scorePrompt("fix it");
    expect(short.dimensions.clarity).toBeLessThan(15);
  });

  it("scores longer prompts higher on clarity", () => {
    const long = scorePrompt(
      "Create a TypeScript Express API with authentication using JWT and a PostgreSQL database"
    );
    expect(long.dimensions.clarity).toBeGreaterThan(5);
  });

  it("scores prompts with language/framework higher on context", () => {
    const withLang = scorePrompt("Build a React component in TypeScript");
    const withoutLang = scorePrompt("Build something");
    expect(withLang.dimensions.context).toBeGreaterThanOrEqual(withoutLang.dimensions.context);
  });

  it("caps total score at 100", () => {
    const result = scorePrompt(
      "Create a full TypeScript React component with Express backend, JWT auth, PostgreSQL, " +
        "return complete code, provide list of steps, must use strict mode, should include tests"
    );
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
