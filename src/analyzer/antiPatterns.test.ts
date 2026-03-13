import { describe, it, expect } from "vitest";
import { detectAntiPatterns } from "./antiPatterns";

describe("detectAntiPatterns", () => {
  it("detects vague/short prompts", () => {
    const result = detectAntiPatterns("fix it");
    expect(result.problems).toContain("Prompt too short or vague");
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("detects missing language", () => {
    const result = detectAntiPatterns(
      "build a thing that does math and handles data and sends it to the cloud"
    );
    expect(result.problems).toContain("No programming language specified");
  });

  it("does not flag when language is present", () => {
    const result = detectAntiPatterns("Create a TypeScript function that returns JSON");
    expect(result.problems).not.toContain("No programming language specified");
  });

  it("detects missing output format", () => {
    const result = detectAntiPatterns(
      "build a thing in typescript that handles user input and processes it"
    );
    expect(result.problems).toContain("No output format specified");
  });

  it("does not flag when output keywords present", () => {
    const result = detectAntiPatterns("Provide a Python script that returns a list");
    expect(result.problems).not.toContain("No output format specified");
  });

  it("returns both problems and suggestions", () => {
    const result = detectAntiPatterns("x");
    expect(result.problems.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.problems.length).toBe(result.suggestions.length);
  });
});
