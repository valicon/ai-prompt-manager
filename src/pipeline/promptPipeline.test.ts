import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processPrompt } from "./promptPipeline";

vi.mock("../analyzer/promptRewrite", () => ({
  rewritePrompt: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
  log: vi.fn(),
}));

const { rewritePrompt } = await import("../analyzer/promptRewrite");

describe("processPrompt", () => {
  beforeEach(() => {
    vi.mocked(rewritePrompt).mockResolvedValue({
      improved: "improved prompt",
      rewriteSucceeded: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes context to rewritePrompt when provided", async () => {
    // Use skipRewriteAboveScore to force rewrite path with a low score
    vi.mocked(rewritePrompt).mockResolvedValue({
      improved: "improved",
      rewriteSucceeded: true,
    });

    await processPrompt("Add logging", {
      skipRewriteAboveScore: 100, // Always rewrite
      context: "Tech: Node.js, React",
    });

    expect(rewritePrompt).toHaveBeenCalledWith(
      "Add logging",
      undefined,
      expect.objectContaining({
        context: "Tech: Node.js, React",
      })
    );
  });

  it("passes undefined context when not provided", async () => {
    await processPrompt("Add logging", {
      skipRewriteAboveScore: 100,
    });

    expect(rewritePrompt).toHaveBeenCalledWith(
      "Add logging",
      undefined,
      expect.objectContaining({
        context: undefined,
      })
    );
  });
});

describe("rewrite quality gate", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns rewrite when rewritten prompt scores higher", async () => {
    // A short original prompt will score low; a rich rewritten prompt scores higher
    vi.mocked(rewritePrompt).mockResolvedValue({
      improved:
        "Please refactor the following TypeScript function to use async/await. " +
        "Requirements: must handle errors, must return a typed result, output as code block.",
      rewriteSucceeded: true,
    });

    const result = await processPrompt("refactor this", { skipRewriteAboveScore: 100 });
    expect(result.rewriteSucceeded).toBe(true);
    expect(result.improved).toContain("async/await");
  });

  it("discards rewrite and returns original when rewrite does not improve score", async () => {
    // Original is a decent prompt; rewrite returns something trivially short
    const original =
      "Refactor this TypeScript function to use async/await. " +
      "Requirements: handle errors, return typed result, output as code block.";

    vi.mocked(rewritePrompt).mockResolvedValue({
      improved: "fix it",
      rewriteSucceeded: true,
    });

    const result = await processPrompt(original, { skipRewriteAboveScore: 100 });
    expect(result.rewriteSucceeded).toBe(false);
    expect(result.improved).toBe(original);
  });

  it("does not apply gate when rewriteSucceeded is false", async () => {
    vi.mocked(rewritePrompt).mockResolvedValue({
      improved: "fix it",
      rewriteSucceeded: false,
    });

    const result = await processPrompt("something", { skipRewriteAboveScore: 100 });
    expect(result.rewriteSucceeded).toBe(false);
    // improved comes directly from rewritePrompt mock when rewriteSucceeded is false
    expect(result.improved).toBe("fix it");
  });
});
