# Logging Strategy

## Status

Accepted

## Recorded

- 2026-03-13 — from archive `openspec/changes/archive/2026-03-13-verbose-dev-logging/`
- 2026-03-13 — from archive `openspec/changes/archive/2026-03-13-promptlab-roadmap/`

## Context

When PromptLab fails (missing LLM config, rewrite errors, proxy errors), the console showed nothing. Developers using `npm run dev` could not diagnose why prompts weren't improved or why requests failed. Verbose logging in dev mode is essential.

## Decision

- **Dev mode**: `NODE_ENV !== 'production'` enables verbose logs. Optional `LOG_LEVEL=verbose` forces verbose in production for debugging.
- **Implementation**: Simple `src/utils/logger.ts` with `log()` and `logError()`; no external dependency for v1.
- **Roadmap**: Pino for structured logging (JSON, request IDs) in Phase 2.
- **Logging points**: Startup (provider, config status, port); each request (upgrade, proxy); failures with remediation hints (e.g., "Set GROQ_API_KEY in .env").
- **Security**: Log only prompt length, never full keys or prompt content.

## Consequences

- **Positive**: Developers can diagnose config and rewrite failures quickly.
- **Positive**: Remediation hints reduce support burden.
- **Negative**: Simplicity vs flexibility—no log levels beyond verbose/quiet in v1.
- **Negative**: Too noisy in dev is a risk; keep messages concise.
