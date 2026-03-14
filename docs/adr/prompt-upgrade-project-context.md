# Prompt Upgrade Project Context

## Status

Accepted

## Recorded

- 2026-03-14 — from archive `openspec/changes/archive/2026-03-14-prompt-upgrade-project-context/`

## Context

Prompt upgrade (via `/prompt-fu`, `/prompt-refine`, or `POST /upgrade`) lacked project awareness. The LLM improved prompts in isolation and could guess the wrong tech stack (e.g., Python/Django when the project is Node.js/React). Users already run Omega (persistent memory) and OpenSpec (change proposals) in their projects—rich sources of project context that could make upgrades accurate and relevant.

## Decision

- Add optional `context?: string` to the upgrade flow (API, MCP tool, Cursor rules). Context is a free-form string assembled by the caller; no hardcoded stack assumptions.
- Inject context into the **user** message of the improve-prompt LLM call (not the system message), so the LLM receives project-specific guidance.
- Cursor rules gather context from `omega_query` (project tech stack, preferences, decisions) and optionally from OpenSpec `proposal.md`/`design.md`.
- Graceful degradation: if no context is gathered, call `prompt_upgrade` with prompt only (backward compatible).
- Truncate context at `PROMPTLAB_MAX_CONTEXT_LENGTH` (default 2000 chars) to avoid token overflow.

## Consequences

- **Positive**: Upgrades respect tech stack, domain, and constraints; no new tools; works with existing Omega and OpenSpec.
- **Negative**: Context quality depends on Omega/OpenSpec content; stale memories may skew upgrades.
