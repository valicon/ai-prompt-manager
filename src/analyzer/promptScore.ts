import { countTokens } from "./tokenCount";
import { detectAntiPatterns } from "./antiPatterns";

export interface PromptScore {
  clarity: number;
  context: number;
  constraints: number;
  format: number;
  completeness: number;
}

export interface AnalysisResult {
  score: number;
  problems: string[];
  suggestions: string[];
  dimensions: PromptScore;
}

const MAX_PER_DIMENSION = 20;

function scoreClarity(prompt: string): number {
  const tokens = countTokens(prompt);
  if (tokens < 5) return 0;
  if (tokens < 15) return 5;
  if (tokens < 30) return 10;
  if (tokens < 60) return 15;
  return MAX_PER_DIMENSION;
}

function scoreContext(prompt: string): number {
  const lower = prompt.toLowerCase();
  const hasLanguage =
    /\b(javascript|typescript|python|java|go|rust|ruby|php|node|react|vue)\b/i.test(
      lower
    );
  const hasFramework =
    /\b(express|react|vue|angular|django|flask|fastapi|spring)\b/i.test(lower);
  const hasDomain =
    /\b(api|login|auth|database|ui|frontend|backend|test)\b/i.test(lower);
  let score = 0;
  if (hasLanguage) score += 7;
  if (hasFramework) score += 7;
  if (hasDomain) score += 6;
  return Math.min(score, MAX_PER_DIMENSION);
}

function scoreConstraints(prompt: string): number {
  const lower = prompt.toLowerCase();
  const hasConstraints =
    /\b(must|should|require|constraint|without|using|with|avoid|ensure)\b/i.test(
      lower
    );
  const hasList = /[-*]\s+\w+/.test(prompt) || /\d+\.\s+\w+/.test(prompt);
  if (hasConstraints && hasList) return MAX_PER_DIMENSION;
  if (hasConstraints || hasList) return 10;
  return 0;
}

function scoreFormat(prompt: string): number {
  const lower = prompt.toLowerCase();
  const hasOutput =
    /\b(return|output|format|json|code|list|example|provide|give|show|write)\b/i.test(
      lower
    );
  const hasExplicit =
    /return\s+(full\s+)?code|provide\s+.*\s+(list|format)/i.test(prompt);
  if (hasExplicit) return MAX_PER_DIMENSION;
  if (hasOutput) return 12;
  return 0;
}

function scoreCompleteness(prompt: string): number {
  const tokens = countTokens(prompt);
  const hasStructure = /[-*]|\d+\.|requirements?|steps?/i.test(prompt);
  if (tokens >= 50 && hasStructure) return MAX_PER_DIMENSION;
  if (tokens >= 30) return 15;
  if (tokens >= 15) return 10;
  return 5;
}

export function scorePrompt(prompt: string): AnalysisResult {
  const dimensions: PromptScore = {
    clarity: scoreClarity(prompt),
    context: scoreContext(prompt),
    constraints: scoreConstraints(prompt),
    format: scoreFormat(prompt),
    completeness: scoreCompleteness(prompt),
  };

  const total =
    dimensions.clarity +
    dimensions.context +
    dimensions.constraints +
    dimensions.format +
    dimensions.completeness;

  const { problems, suggestions } = detectAntiPatterns(prompt);

  return {
    score: Math.min(100, total),
    problems,
    suggestions,
    dimensions,
  };
}
