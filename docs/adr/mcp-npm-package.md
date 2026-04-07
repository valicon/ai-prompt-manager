# MCP Server as Standalone npm Package

## Status

Accepted

## Recorded

- 2026-04-07 — from archive `openspec/changes/archive/2026-04-07-add-promptlab-mcp-package/`

## Context

The promptlab-mcp MCP server (`src/mcp/server.ts`) was only usable when the ai-prompt-manager project was the active Cursor workspace. When users copied the MCP config to other projects, Cursor ran the command from the other project's directory, causing module-not-found errors. Users resorted to absolute paths in `mcp.json` as a workaround — brittle and not shareable. A standalone npm package enables `npx promptlab-mcp` from any workspace without path hacks.

## Decision

- **Package layout**: In-repo package (`packages/promptlab-mcp/` or `promptlab-mcp/` at root) rather than a separate repo — simpler to maintain, allows workspace linking, avoids extra CI overhead for a small package.
- **Package name**: `promptlab-mcp` (unscoped), or scoped (`@<scope>/promptlab-mcp`) if namespace is required. Clear, matches the existing server name.
- **Build**: TypeScript compiled to JS for publish; `bin` entry points to `dist/index.js`. Consumers do not need ts-node; faster startup, smaller install.
- **ai-prompt-manager integration**: Keep `src/mcp/server.ts` in ai-prompt-manager for local development; optionally switch to consuming the published package after first release. Avoids circular dependency and allows independent development/publish.
- **Versioning**: Semantic versioning with manual or script-assisted release (`npm version` + changelog). No full CI release pipeline in this change; can be added later.
- **Runtime config**: `PROMPTLAB_URL` environment variable; default `http://localhost:3000`. No auto-discovery to keep the package minimal.
- **Dependencies**: Only `@modelcontextprotocol/sdk` and `zod` — no express, pg, redis, or other app-level dependencies.

## Consequences

- **Positive**: Any Cursor workspace can use `npx -y promptlab-mcp` in its MCP config — no absolute paths, fully portable.
- **Positive**: Package is small and self-contained; fast `npx` startup with compiled JS.
- **Positive**: `prompt_upgrade` tool behavior and schema remain unchanged; zero impact on existing users.
- **Negative**: Two sources of truth for the MCP server code during v1 (ai-prompt-manager source + package copy) until consolidation after first publish.
- **Negative**: Package name collision risk on npm; use scoped name as fallback.
- **Negative**: Users must set `PROMPTLAB_URL` if proxy runs on a non-default port; no auto-discovery.
