# PromptLab Roadmap (Phased Evolution)

## Status

Accepted

## Recorded

- 2026-03-13 — from archive `openspec/changes/archive/2026-03-13-promptlab-roadmap/`

## Context

PromptLab had a solid foundation (proxy, pipeline, multi-provider LLM, dashboard) but lacked tests, observability, and optional scale-out paths. A clear roadmap was needed that prioritizes foundation first and makes advanced storage/caching optional.

## Decision

- **Phase 1 (Foundation)**: Health endpoints (`/health`, `/ready`), score threshold (`SKIP_REWRITE_ABOVE_SCORE`), wire pattern search into pipeline, unit tests (Vitest).
- **Phase 2 (Quality)**: Structured logging (Pino), LLM retries with backoff, API rate limiting (`express-rate-limit` on `/upgrade` and `/v1/chat/completions`).
- **Phase 3 (Features)**: Batch upgrade API (`POST /upgrade/batch`), prompt history export (CSV/JSON).
- **Phase 4 (Scale – optional)**: Config-driven storage (`DB_BACKEND=sqlite|postgres`), config-driven embedding cache (`EMBEDDING_CACHE=memory|redis`), Dockerfile and docker-compose.
- **Document**: Single source of truth (`ROADMAP.md`) with phases, ordering, and config options.
- **Defaults**: SQLite and in-memory cache remain defaults; no breaking changes.

## Consequences

- **Positive**: Incremental value; each phase independently deployable.
- **Positive**: Optional scale; single-instance users keep zero-config.
- **Negative**: Retries can amplify provider costs; cap retries (e.g., 2); only retry on 5xx and network errors.
- **Negative**: Rate limit too strict for heavy users; make limits configurable.
