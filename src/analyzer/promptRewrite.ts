import {
  createChatCompletion,
  hasValidConfig,
  getProvider,
  getKeyEnvName,
} from "../llm/providerAdapter";
import { IMPROVE_PROMPT_SYSTEM, buildImproveUserPrompt, type SimilarPatternRef } from "../prompts/improveMetaPrompt";
import { log, logError } from "../utils/logger";
import type { AnalysisResult } from "./promptScore";

export interface RewriteResult {
  improved: string;
  /** True when LLM rewrite succeeded; false when we fell back to original */
  rewriteSucceeded: boolean;
  analysis?: AnalysisResult;
}

export interface RewriteOptions {
  similarPatterns?: SimilarPatternRef[];
  /** Optional project context (tech stack, domain, constraints) to inject into the improve-prompt LLM call */
  context?: string;
}

export async function rewritePrompt(
  prompt: string,
  _apiKey?: string,
  options?: RewriteOptions
): Promise<RewriteResult> {
  const provider = getProvider();
  if (!hasValidConfig(provider)) {
    const keyEnv = getKeyEnvName(provider);
    const hint = keyEnv
      ? `Set LLM_PROVIDER and ${keyEnv} in .env`
      : "Set LLM_PROVIDER in .env";
    log("Rewrite skipped: no LLM config. %s", hint);
    return { improved: prompt, rewriteSucceeded: false };
  }

  try {
    const userContent = buildImproveUserPrompt(prompt, options?.similarPatterns, options?.context);
    const completion = await createChatCompletion(
      [
        { role: "system", content: IMPROVE_PROMPT_SYSTEM },
        { role: "user", content: userContent },
      ],
      { response_format: { type: "json_object" } }
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { improved: prompt, rewriteSucceeded: false };
    }

    const parsed = JSON.parse(content) as {
      score?: number;
      problems?: string[];
      suggestions?: string[];
      improved_prompt?: string;
    };

    if (typeof parsed.improved_prompt === "string" && parsed.improved_prompt.trim()) {
      return {
        improved: parsed.improved_prompt.trim(),
        rewriteSucceeded: true,
        analysis: parsed.score !== undefined
          ? {
              score: parsed.score,
              problems: Array.isArray(parsed.problems) ? parsed.problems : [],
              suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
              dimensions: {
                clarity: 0,
                context: 0,
                constraints: 0,
                format: 0,
                completeness: 0,
              },
            }
          : undefined,
      };
    }
  } catch (err) {
    const keyEnv = getKeyEnvName(getProvider());
    const hint = keyEnv ? `Check ${keyEnv} and provider URL` : "Check provider config";
    logError("Rewrite failed", err);
    log("Remediation: %s", hint);
  }

  return { improved: prompt, rewriteSucceeded: false };
}
