# Multi-Provider LLM Adapter

## Status

Accepted

## Recorded

- 2026-03-13 — from archive `openspec/changes/archive/2026-03-13-multi-provider-llm-support/`
- 2026-03-13 — from archive `openspec/changes/archive/2026-03-13-promptlab-prompt-quality-system/`

## Context

PromptLab originally used OpenAI exclusively for prompt rewriting and proxy forwarding. Users without OpenAI keys (e.g., Cursor-only users, those preferring free tiers like OpenRouter or Ollama) could not use the system. OpenRouter, Ollama, and Groq offer OpenAI-compatible chat completion endpoints.

## Decision

- **Provider abstraction**: New `src/llm/providerAdapter.ts` with `createChatCompletion(messages, options)` that routes to the configured provider via fetch.
- **Selection**: `LLM_PROVIDER=openai|openrouter|ollama|groq` via env. Default `openai` for backward compatibility.
- **Per-provider config**: `OPENAI_KEY`, `OPENROUTER_API_KEY`, `OLLAMA_BASE_URL`, `GROQ_API_KEY` (and optional URL overrides).
- **Proxy and rewriter** both use the same provider abstraction.
- **Embeddings**: Keep OpenAI for embeddings; optional abstraction later.

## Consequences

- **Positive**: Works with Cursor and free tiers (OpenRouter, Ollama, Groq) without requiring OpenAI key.
- **Positive**: Single adapter; no duplicated provider logic.
- **Negative**: Model name mismatches across providers require documentation and per-provider defaults (`LLM_REWRITE_MODEL`).
