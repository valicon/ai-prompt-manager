# promptlab-mcp

MCP server for [PromptLab](https://github.com/your-org/ai-prompt-manager) prompt upgrade. Use it from **any** Cursor workspace via `npx`—no absolute paths or local clone required.

**→ [Full installation guide for other projects](INSTALL.md)** – MCP config, rules, slash commands, troubleshooting.

## Quick Start

Run directly with npx (no install needed):

```bash
npx -y promptlab-mcp
```

Or install globally:

```bash
npm install -g promptlab-mcp
promptlab-mcp
```

## Cursor MCP Configuration

Add to your project's `.cursor/mcp.json` or global `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "promptlab-mcp": {
      "command": "npx",
      "args": ["-y", "promptlab-mcp"],
      "env": {
        "PROMPTLAB_URL": "http://localhost:3010"
      }
    }
  }
}
```

This works from any workspace—no need to reference the ai-prompt-manager project path.

## Environment Variables

| Variable        | Default                | Description                          |
|----------------|------------------------|--------------------------------------|
| `PROMPTLAB_URL` | `http://localhost:3000` | URL of the PromptLab proxy (run `npm run dev` in ai-prompt-manager) |

## Requirements

- **PromptLab proxy** must be running. In the ai-prompt-manager project, run:
  ```bash
  npm run dev
  ```
- Node.js 18+

## Tools

- **prompt_upgrade** – Sends a prompt to PromptLab's `/upgrade` endpoint and returns the improved prompt with score and warnings.

## Upgrade API — Request Body

The `/upgrade` endpoint expects a JSON body:

```json
{ "prompt": "string", "context": "string (optional)" }
```

All callers must send `Content-Type: application/json` with a properly serialized body. The `buildUpgradeRequestBody(prompt, context?)` utility (exported from `src/upgradeBody.ts`) handles normalization:

- `prompt` is coerced to a string (`String(prompt ?? "")`) — `null`/`undefined` become `""`
- `context` is trimmed and omitted from the body if empty after trimming
- `JSON.stringify` escapes newlines, tabs, quotes, backslashes, carriage returns, and other control characters automatically

This ensures prompts containing code snippets, file paths, multi-line text, or Unicode are sent without parse errors.
