/**
 * Simple heuristic for token count.
 * ~4 chars per token is a rough approximation for English/code.
 */
export function countTokens(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return Math.ceil(text.trim().length / 4);
}
