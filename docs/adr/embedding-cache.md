# Embedding Cache

## Status

Accepted

## Recorded

- 2026-03-13 — from archive `openspec/changes/archive/2026-03-13-promptlab-roadmap/`

## Context

PromptLab uses embeddings for semantic search over prompt templates. For small prompt-db (<100 patterns), in-memory is sufficient. Scale-out may require shared or persistent cache across instances.

## Decision

- **Default**: In-memory cache. Load vectors from prompt-db at startup.
- **Optional**: Env `EMBEDDING_CACHE=memory|redis`. When `redis`, use `REDIS_URL`.
- **Rationale**: Most users don't need Redis; those who scale embeddings can enable it.
- **Fallback**: Lazy init or fallback to in-memory if Redis unavailable; log warning.

## Consequences

- **Positive**: Zero-config for single-instance.
- **Positive**: Config-driven; no breaking changes.
- **Negative**: Redis adds dependency when enabled.
- **Open**: Should Redis cache be shared across multiple proxy instances for horizontal scaling?
