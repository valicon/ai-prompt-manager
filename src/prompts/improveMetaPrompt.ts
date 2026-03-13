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

export function buildImproveUserPrompt(originalPrompt: string): string {
  return `Prompt to improve:
"""
${originalPrompt}
"""

Return the JSON with score, problems, suggestions, and improved_prompt.`;
}
