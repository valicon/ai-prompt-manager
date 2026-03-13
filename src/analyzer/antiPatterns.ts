import { countTokens } from "./tokenCount";

const DEFAULT_TOKEN_THRESHOLD = 15;

const LANGUAGE_KEYWORDS = [
  "javascript",
  "typescript",
  "python",
  "java",
  "c#",
  "c++",
  "go",
  "rust",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "scala",
  "r",
  "sql",
  "html",
  "css",
  "react",
  "vue",
  "angular",
  "node",
  "nodejs",
];

const OUTPUT_FORMAT_KEYWORDS = [
  "return",
  "output",
  "format",
  "json",
  "code",
  "list",
  "example",
  "provide",
  "give",
  "show",
  "write",
  "create",
  "implement",
];

const CONSTRAINT_KEYWORDS = [
  "must",
  "should",
  "require",
  "constraint",
  "limit",
  "only",
  "without",
  "using",
  "with",
  "without",
  "avoid",
  "ensure",
  "follow",
];

export interface AntiPatternResult {
  problems: string[];
  suggestions: string[];
}

export function detectAntiPatterns(
  prompt: string,
  tokenThreshold: number = DEFAULT_TOKEN_THRESHOLD
): AntiPatternResult {
  const problems: string[] = [];
  const suggestions: string[] = [];
  const lower = prompt.toLowerCase().trim();

  const tokens = countTokens(prompt);

  if (tokens < tokenThreshold) {
    problems.push("Prompt too short or vague");
    suggestions.push("Add more context and specifics to your prompt");
  }

  const hasLanguage = LANGUAGE_KEYWORDS.some((kw) => lower.includes(kw));
  if (!hasLanguage) {
    problems.push("No programming language specified");
    suggestions.push("Specify the language (e.g., TypeScript, Python)");
  }

  const hasOutputFormat = OUTPUT_FORMAT_KEYWORDS.some((kw) => lower.includes(kw));
  if (!hasOutputFormat) {
    problems.push("No output format specified");
    suggestions.push("Specify desired output (e.g., code, JSON, list)");
  }

  const hasConstraints = CONSTRAINT_KEYWORDS.some((kw) => lower.includes(kw));
  if (!hasConstraints && tokens > 10) {
    problems.push("No constraints specified");
    suggestions.push("Add requirements or constraints");
  }

  return { problems, suggestions };
}
