import { scorePrompt } from "../analyzer/promptScore";
import { rewritePrompt } from "../analyzer/promptRewrite";
import { searchSimilarPatterns } from "../db/embeddings";
import { log } from "../utils/logger";

export interface PipelineResult {
  score: number;
  warnings: string[];
  improved: string;
  /** True when LLM rewrite succeeded; false when we fell back to original */
  rewriteSucceeded?: boolean;
}

export interface PipelineOptions {
  /** When true, skip LLM rewrite and return original prompt as improved */
  analyzeOnly?: boolean;
  /** Skip rewrite when score >= this value. Default from SKIP_REWRITE_ABOVE_SCORE env (80) */
  skipRewriteAboveScore?: number;
  /** When true, search for similar patterns and inject into rewriter context. Requires OPENAI_KEY. */
  usePatternSearch?: boolean;
  /** Max similar patterns to inject when usePatternSearch is true. Default 3. */
  patternSearchTopN?: number;
  /** Optional project context (tech stack, domain, constraints) to inject into the improve-prompt LLM call */
  context?: string;
}

const DEFAULT_SKIP_REWRITE_ABOVE_SCORE = 80;

function getSkipRewriteThreshold(options: PipelineOptions): number {
  if (options.skipRewriteAboveScore !== undefined) return options.skipRewriteAboveScore;
  const env = process.env.SKIP_REWRITE_ABOVE_SCORE;
  if (env !== undefined) {
    const n = parseInt(env, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return DEFAULT_SKIP_REWRITE_ABOVE_SCORE;
}

export async function processPrompt(
  prompt: string,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const analysis = scorePrompt(prompt);

  if (options.analyzeOnly) {
    return {
      score: analysis.score,
      warnings: analysis.problems,
      improved: prompt,
      rewriteSucceeded: false,
    };
  }

  const threshold = getSkipRewriteThreshold(options);
  if (threshold > 0 && analysis.score >= threshold) {
    return {
      score: analysis.score,
      warnings: analysis.problems,
      improved: prompt,
      rewriteSucceeded: false,
    };
  }

  let similarPatterns: { pattern: string; prompt: string; similarity?: number }[] | undefined;
  if (options?.usePatternSearch) {
    const topN = options.patternSearchTopN ?? 3;
    similarPatterns = await searchSimilarPatterns(prompt, topN);
  }

  const { improved, rewriteSucceeded } = await rewritePrompt(prompt, undefined, {
    similarPatterns,
    context: options.context,
  });

  if (rewriteSucceeded) {
    const rewrittenScore = scorePrompt(improved).score;
    if (rewrittenScore <= analysis.score) {
      // Quality gate: rewrite regressed or didn't improve — discard it
      log(
        "Quality gate: discarding rewrite (original=%d, rewritten=%d)",
        analysis.score,
        rewrittenScore
      );
      return {
        score: analysis.score,
        warnings: analysis.problems,
        improved: prompt,
        rewriteSucceeded: false,
      };
    }
  }

  return {
    score: analysis.score,
    warnings: analysis.problems,
    improved,
    rewriteSucceeded,
  };
}
