/**
 * Builds a JSON-safe request body string for POST /upgrade.
 * Normalizes prompt and context to strings before serialization so that
 * newlines, quotes, tabs, control characters, null, and undefined are all
 * handled correctly by JSON.stringify.
 */
export function buildUpgradeRequestBody(
  prompt: unknown,
  context?: unknown
): string {
  const normalizedPrompt = String(prompt ?? "");
  const normalizedContext =
    context != null ? String(context).trim() : undefined;

  const body: { prompt: string; context?: string } = {
    prompt: normalizedPrompt,
  };
  if (normalizedContext) body.context = normalizedContext;

  return JSON.stringify(body);
}
