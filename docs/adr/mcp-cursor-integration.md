# MCP and Cursor Integration

## Status

Accepted

## Recorded

- 2026-03-13 — from archive `openspec/changes/archive/2026-03-13-prompt-fu-mcp-slash-command/`
- 2026-03-13 — from archive `openspec/changes/archive/2026-03-13-prompt-refine-command/`

## Context

Users with Cursor's built-in models cannot use the proxy-based upgrade (which requires changing Cursor's API endpoint). They need an on-demand flow: type a slash command, get the prompt upgraded, optionally respond to it—without switching away from Cursor's default API. MCP lets Cursor invoke external tools.

## Decision

- **MCP server**: Same package, `src/mcp/` module. stdio transport (Cursor launches as subprocess).
- **Tool**: `prompt_upgrade` calls `POST {PROMPTLAB_URL}/upgrade`; returns improved prompt. `PROMPTLAB_URL` env (default `http://localhost:3000`).
- **Slash commands**:
  - `/prompt-fu`: Call `prompt_upgrade`, then **respond** to the improved prompt as the actual request.
  - `/prompt-refine`: Call `prompt_upgrade`, **return** the improved prompt to the user only; do not invoke LLM.
- **Rules**: `.cursor/rules/prompt-fu.mdc` and `prompt-refine.mdc` with `alwaysApply: true` to catch commands in chat.
- **Prerequisite**: PromptLab proxy must be running (`npm run dev`).

## Consequences

- **Positive**: Works with Cursor's built-in models; no proxy endpoint change.
- **Positive**: Reuses same MCP tool; only rule behavior differs between commands.
- **Negative**: AI must follow rules; user can retry or paste manually if not.
- **Negative**: Tool fails with clear error if proxy not running; documented in README.
