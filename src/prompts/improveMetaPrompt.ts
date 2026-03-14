export const IMPROVE_PROMPT_SYSTEM = `You are a prompt engineering expert.

Evaluate the following prompt and improve it.

Score it from 0-100 based on:
- clarity: Is the intent clear?
- context: Does it specify language, framework, or domain?
- constraints: Are requirements or limits specified?
- output specification: Is the desired output format clear?
- completeness: Does it cover what's needed?

Return valid JSON only, no markdown or extra text:
{
  "score": number,
  "problems": string[],
  "suggestions": string[],
  "improved_prompt": string
}

The improved_prompt MUST be a complete, ready-to-use prompt that expands on the original with better structure, context, and specifications.`;

const DEFAULT_MAX_CONTEXT_LENGTH = 2000;

function getMaxContextLength(): number {
  const env = process.env.PROMPTLAB_MAX_CONTEXT_LENGTH;
  if (env === undefined) return DEFAULT_MAX_CONTEXT_LENGTH;
  const n = parseInt(env, 10);
  if (!Number.isNaN(n) && n >= 0) return n;
  return DEFAULT_MAX_CONTEXT_LENGTH;
}

function truncateContext(context: string): string {
  const max = getMaxContextLength();
  if (context.length <= max) return context;
  return context.slice(0, max - 3) + "...";
}

export interface SimilarPatternRef {
  pattern: string;
  prompt: string;
  similarity?: number;
}

export function buildImproveUserPrompt(
  originalPrompt: string,
  similarPatterns?: SimilarPatternRef[],
  projectContext?: string
): string {
  let body = "";

  if (projectContext && projectContext.trim()) {
    const truncated = truncateContext(projectContext.trim());
    body += `Project context (use to tailor the improved prompt to this project):
"""
${truncated}
"""

`;
  }

  body += `Prompt to improve:
"""
${originalPrompt}
"""
`;

  if (similarPatterns && similarPatterns.length > 0) {
    body += "\nSimilar patterns from the library (use as inspiration):\n";
    for (const p of similarPatterns) {
      body += `\n--- ${p.pattern} ---\n${p.prompt}\n`;
    }
    body += "\n";
  }

  body += "Return the JSON with score, problems, suggestions, and improved_prompt.";
  return body;
}
