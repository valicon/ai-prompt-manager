import { scorePrompt } from "../analyzer/promptScore";
import { rewritePrompt } from "../analyzer/promptRewrite";

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

  const { improved, rewriteSucceeded } = await rewritePrompt(prompt);

  return {
    score: analysis.score,
    warnings: analysis.problems,
    improved,
    rewriteSucceeded,
  };
}
