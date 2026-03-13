import { describe, it, expect } from "vitest";
import * as path from "path";
import { loadPatterns } from "./promptStore";

const FIXTURES = path.join(__dirname, "__fixtures__", "prompt-db");

describe("loadPatterns", () => {
  it("returns empty array when path does not exist", () => {
    const result = loadPatterns(path.join(__dirname, "nonexistent-dir-xyz"));
    expect(result).toEqual([]);
  });

  it("loads patterns from markdown files with frontmatter", () => {
    const result = loadPatterns(FIXTURES);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const p = result.find((r) => r.pattern === "sample-pattern");
    expect(p).toBeDefined();
    if (p) {
      expect(p.prompt).toContain("Create a TypeScript function");
      expect(p.tags).toContain("coding");
      expect(p.tags).toContain("typescript");
    }
  });

  it("uses filename as pattern when frontmatter pattern is missing", () => {
    const result = loadPatterns(FIXTURES);
    const p = result.find((r) => r.pattern === "no-pattern-meta");
    expect(p).toBeDefined();
    if (p) {
      expect(p.prompt).toContain("Body content without pattern");
      expect(p.tags).toContain("a");
      expect(p.tags).toContain("b");
    }
  });
});
