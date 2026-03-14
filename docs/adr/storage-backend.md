# Storage Backend (Prompt History)

## Status

Accepted

## Recorded

- 2026-03-13 — from archive `openspec/changes/archive/2026-03-13-prompt-dashboard/`
- 2026-03-13 — from archive `openspec/changes/archive/2026-03-13-promptlab-roadmap/`

## Context

PromptLab needed to persist prompt upgrade results for history, search, and metrics. No persistence existed; each upgrade was ephemeral. The system targets dev/single-user initially with optional scale-out.

## Decision

- **Default**: SQLite via `better-sqlite3`. DB file at `data/prompts.db` (gitignored).
- **Optional scale**: Env `DB_BACKEND=sqlite|postgres`. When `postgres`, use `DATABASE_URL`.
- **Data model**: `id`, `original`, `improved`, `score`, `warnings` (JSON), `rewrite_succeeded`, `created_at`. Indexes on `created_at`, `score`, `rewrite_succeeded`.
- **Rationale**: SQLite requires no setup; sufficient for thousands of prompts. PostgreSQL is opt-in for multi-instance teams.

## Consequences

- **Positive**: Zero-config for single-user; no separate DB service.
- **Positive**: Config-driven; no breaking changes for existing users.
- **Negative**: SQLite write contention under high load; migrate to Postgres if needed.
- **Negative**: PostgreSQL migration path not required for v1; defaults preserve current behavior.
