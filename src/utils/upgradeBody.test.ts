import { describe, it, expect } from "vitest";
import { buildUpgradeRequestBody } from "./upgradeBody";

describe("buildUpgradeRequestBody", () => {
  it("serializes a simple prompt", () => {
    const result = JSON.parse(buildUpgradeRequestBody("fix the bug"));
    expect(result).toEqual({ prompt: "fix the bug" });
  });

  it("includes context when provided", () => {
    const result = JSON.parse(buildUpgradeRequestBody("fix bug", "Node.js, TypeScript"));
    expect(result).toEqual({ prompt: "fix bug", context: "Node.js, TypeScript" });
  });

  it("omits context when empty string", () => {
    const result = JSON.parse(buildUpgradeRequestBody("fix bug", ""));
    expect(result).toEqual({ prompt: "fix bug" });
    expect(result.context).toBeUndefined();
  });

  it("omits context when whitespace only", () => {
    const result = JSON.parse(buildUpgradeRequestBody("fix bug", "   "));
    expect(result.context).toBeUndefined();
  });

  it("omits context when undefined", () => {
    const result = JSON.parse(buildUpgradeRequestBody("fix bug", undefined));
    expect(result.context).toBeUndefined();
  });

  it("handles prompt with newlines", () => {
    const prompt = "line one\nline two\nline three";
    const json = buildUpgradeRequestBody(prompt);
    // Must be valid JSON and round-trip correctly
    expect(JSON.parse(json).prompt).toBe(prompt);
    // Raw string must not contain unescaped newlines
    expect(json).not.toMatch(/[^\\]\n/);
  });

  it("handles prompt with double quotes", () => {
    const prompt = 'say "hello world"';
    const json = buildUpgradeRequestBody(prompt);
    expect(JSON.parse(json).prompt).toBe(prompt);
  });

  it("handles prompt with tabs", () => {
    const prompt = "column1\tcolumn2";
    const json = buildUpgradeRequestBody(prompt);
    expect(JSON.parse(json).prompt).toBe(prompt);
  });

  it("handles prompt with carriage returns", () => {
    const prompt = "line one\r\nline two";
    const json = buildUpgradeRequestBody(prompt);
    expect(JSON.parse(json).prompt).toBe(prompt);
  });

  it("handles Unicode characters", () => {
    const prompt = "Fix the function: résumé, 日本語, emoji 🚀";
    const json = buildUpgradeRequestBody(prompt);
    expect(JSON.parse(json).prompt).toBe(prompt);
  });

  it("handles backslashes", () => {
    const prompt = "path: C:\\Users\\test\\file.txt";
    const json = buildUpgradeRequestBody(prompt);
    expect(JSON.parse(json).prompt).toBe(prompt);
  });

  it("normalizes null prompt to empty string", () => {
    const result = JSON.parse(buildUpgradeRequestBody(null));
    expect(result.prompt).toBe("");
  });

  it("normalizes undefined prompt to empty string", () => {
    const result = JSON.parse(buildUpgradeRequestBody(undefined));
    expect(result.prompt).toBe("");
  });

  it("produces valid JSON in all cases", () => {
    const tricky = "line1\nline2\t\"quoted\"\r\n\\backslash";
    expect(() => JSON.parse(buildUpgradeRequestBody(tricky, tricky))).not.toThrow();
  });
});
