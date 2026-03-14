import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildImproveUserPrompt } from "./improveMetaPrompt";

describe("buildImproveUserPrompt", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("includes prompt to improve without context when context is omitted", () => {
    const result = buildImproveUserPrompt("Add logging");
    expect(result).toContain('Prompt to improve:');
    expect(result).toContain('"""');
    expect(result).toContain("Add logging");
    expect(result).not.toContain("Project context");
  });

  it("includes project context when provided", () => {
    const result = buildImproveUserPrompt("Add logging", undefined, "Tech: Node.js, React. Domain: AI.");
    expect(result).toContain("Project context");
    expect(result).toContain("Tech: Node.js, React. Domain: AI.");
    expect(result).toContain("Add logging");
  });

  it("places project context before the prompt to improve", () => {
    const result = buildImproveUserPrompt("Add auth", undefined, "Node.js, Express");
    const contextIdx = result.indexOf("Project context");
    const promptIdx = result.indexOf("Prompt to improve:");
    expect(contextIdx).toBeLessThan(promptIdx);
  });

  it("truncates context when longer than max length", () => {
    process.env.PROMPTLAB_MAX_CONTEXT_LENGTH = "20";
    const longContext = "abcdefghijklmnopqrstuvwxyz";
    const result = buildImproveUserPrompt("Add logging", undefined, longContext);
    expect(result).toContain("abcdefghijklmnopq...");
    expect(result).not.toContain("uvwxyz");
  });

  it("includes similar patterns when provided", () => {
    const result = buildImproveUserPrompt("Add logging", [
      { pattern: "logging", prompt: "Add Pino logging with levels" },
    ]);
    expect(result).toContain("Similar patterns");
    expect(result).toContain("logging");
    expect(result).toContain("Add Pino logging with levels");
  });

  it("includes both context and similar patterns when both provided", () => {
    const result = buildImproveUserPrompt(
      "Add logging",
      [{ pattern: "log", prompt: "Use structured logging" }],
      "Node.js project"
    );
    expect(result).toContain("Project context");
    expect(result).toContain("Node.js project");
    expect(result).toContain("Similar patterns");
    expect(result).toContain("Use structured logging");
  });

  it("skips empty or whitespace-only context", () => {
    const result = buildImproveUserPrompt("Add logging", undefined, "   ");
    expect(result).not.toContain("Project context");
  });
});
