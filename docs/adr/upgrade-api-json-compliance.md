# Upgrade API JSON Compliance

## Status

Accepted

## Recorded

- 2026-04-07 — from archive `openspec/changes/archive/2026-04-07-upgrade-api-json-compliance/`

## Context

PromptLab exposes `POST /upgrade` and `POST /upgrade/batch` for prompt improvement. Callers include the MCP tool (`prompt_upgrade`), the in-process MCP server, and potentially scripts or dashboards. The request body is JSON: `{ prompt: string, context?: string }`. Prompt and context often contain newlines, quotes, tabs, and Unicode — characters that must be escaped for valid JSON. Without explicit serialization discipline, callers constructing bodies manually or passing edge-case values (`null`, `undefined`, control chars) produce malformed JSON, causing parse failures, 400 errors, or silent truncation.

## Decision

1. **Use `JSON.stringify` with explicit input normalization.** Normalize `prompt` and `context` to strings before building the body, then use `JSON.stringify(body)`. `JSON.stringify` correctly escapes `\n`, `\r`, `\t`, `"`, `\`, and control characters. `prompt` is coerced via `String(prompt ?? "")` and `context` via `String(context ?? "")`, omitting the key if empty after trim.

2. **Introduce a shared utility `buildUpgradeRequestBody(prompt, context?): string`.** Rather than duplicating inline logic in each caller, a single utility handles serialization. Located at `packages/promptlab-mcp/src/upgradeBody.ts` (or `src/utils/upgradeBody.ts`), reusable by both `packages/promptlab-mcp` and `src/mcp/server.ts`. Single point for testing and documentation.

3. **Backend contract unchanged.** The fix is purely on the caller/sender side. `express.json()` on the backend already rejects malformed JSON with 400. Stricter backend validation (e.g., enforcing non-empty `prompt`) is deferred as a follow-up if clearer error messages are needed.

## Consequences

**Positive:**
- All callers consistently produce valid JSON regardless of prompt/context content (newlines, quotes, Unicode, control chars, nulls).
- A single tested utility makes serialization behavior auditable and easy to update.
- No backend changes required; changes are additive and backward compatible.

**Negative / Trade-offs:**
- Callers who bypass the utility and construct bodies manually can still produce malformed JSON — mitigation is documentation and call-site audits.
- Very large prompts are handled by `JSON.stringify` but may warrant size limits in a future rate limiter (deferred).
