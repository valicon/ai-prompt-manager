import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processPrompt } from "./promptPipeline";

vi.mock("../analyzer/promptRewrite", () => ({
  rewritePrompt: vi.fn(),
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
