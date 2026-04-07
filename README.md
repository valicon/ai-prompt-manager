# PromptLab — AI Prompt Manager

PromptLab is a **Prompt Gateway** that analyzes, improves, and standardizes prompts before they reach the LLM. It acts as middleware between your IDE (e.g., Cursor) and the LLM API.

## Features

- **Prompt analysis**: Score prompts (0–100) across clarity, context, constraints, format, and completeness
- **Anti-pattern detection**: Flags vague prompts, missing language/framework, missing output format
- **Prompt rewriting**: Expands weak prompts into structured prompts via LLM
- **Prompt pattern library**: Reusable templates in `prompt-db/` (coding, architecture, analysis)
- **Embedding search**: Find the best template for your input via semantic similarity
- **Local proxy**: Intercept prompts, upgrade them, forward to OpenAI, OpenRouter, Ollama, or Groq

## Quick Start

```bash
# Install dependencies (already done if you cloned)
npm install

# Copy env and configure your LLM provider
cp .env.example .env
# Edit .env: set LLM_PROVIDER and the matching API key (see below)

# Run the proxy
npm run dev
```

The proxy listens on `http://localhost:3000`.

### Dashboard

To view prompt history, metrics, and charts:

1. Build the dashboard: `npm run build:dashboard`
2. Start the proxy: `npm run dev`
3. Open `http://localhost:3000/dashboard` (or your configured port)

For dashboard development with hot reload:

1. Start the proxy: `npm run dev` (in one terminal)
2. Start the dashboard: `npm run dev:dashboard` (in another) — dev server proxies `/api` to the proxy

## Using Without OpenAI

You can use PromptLab with Cursor **without an OpenAI key**:

### OpenRouter (free models)

1. Get a free API key at [openrouter.ai](https://openrouter.ai)
2. In `.env`:
   ```
   LLM_PROVIDER=openrouter
   OPENROUTER_API_KEY=sk-or-your-key
   ```
3. Run `npm run dev`

### Ollama (local, no key)

1. Install [Ollama](https://ollama.com) and run a model: `ollama run llama3`
2. In `.env`:
   ```
   LLM_PROVIDER=ollama
   ```
3. Run `npm run dev`

### Groq (free tier)

1. Get free API key at [groq.com](https://groq.com)
2. In `.env`:
   ```
   LLM_PROVIDER=groq
   GROQ_API_KEY=gsk_your-key
   ```
3. Run `npm run dev`

## Cursor Configuration

To use PromptLab as a prompt gateway with Cursor:

1. **Start the proxy**: Run `npm run dev` (or `npm start` after `npm run build`).

2. **Configure Cursor** to use the proxy as your API endpoint:
   - Open Cursor Settings → Models
   - Enable "Override OpenAI Base URL"
   - Set the API base URL to: `http://localhost:3000/v1`
   - Use any placeholder API key in Cursor (the proxy uses its own key from `.env`)

3. **Flow**: When you send a prompt from Cursor, it goes to the proxy. The proxy:
   - Analyzes the last user message
   - Improves it via the pipeline (scoring + LLM rewrite)
   - Forwards the modified request to your configured provider (OpenAI, OpenRouter, Ollama, Groq)
   - Returns the response to Cursor

### Manual Prompt Upgrade

For a manual analyze → improve → diff flow:

- **REST API**: `POST http://localhost:3000/upgrade` with a JSON body returns `{ score, warnings, improved, rewriteSucceeded }`. Use this from a script or Cursor rule.

  ```json
  {
    "prompt": "your prompt text",
    "context": "React + TypeScript project, targeting Node 20, REST API"
  }
  ```

  - `prompt` (required): The prompt text to analyze and improve.
  - `context` (optional): Free-text project context — tech stack, domain, constraints, coding conventions. When provided, the rewriter tailors the improved prompt to your specific environment.

  **Batch upgrade**: `POST /upgrade/batch` with `{ "prompts": ["prompt1", "prompt2"] }` returns an array of results in the same order.

  **Response:**
  ```json
  {
    "score": 72,
    "warnings": ["Missing output format", "No language specified"],
    "improved": "Write a TypeScript React component...",
    "rewriteSucceeded": true
  }
  ```
### /prompt-fu Slash Command (MCP)

Upgrade prompts on demand **without changing Cursor's API endpoint**. Works with Cursor's built-in models (e.g., Opus 4.6).

1. **Start the proxy**: `npm run dev` (must be running for the tool to work).
2. **MCP is pre-configured**: The project's `.cursor/mcp.json` includes `promptlab-mcp`. Cursor will connect automatically.
3. **Rule is pre-configured**: `.cursor/rules/prompt-fu.mdc` instructs the AI to use the tool when you type `/prompt-fu`.
4. **Usage**: Type `/prompt-fu make a login system` — the AI will call the upgrade tool and respond using the improved prompt.

The `prompt_upgrade` MCP tool accepts an optional `context` parameter (project context, tech stack, constraints) that is forwarded to the upgrade endpoint to tailor the rewrite.

### /prompt-refine Slash Command

Like `/prompt-fu`, but **returns the improved prompt only**—no LLM response. Use when you want to:
- Copy the improved prompt for use elsewhere
- Refine further before sending to the LLM
- Inspect score and warnings without triggering a response

**Usage**: Type `/prompt-refine make a login system` — the AI returns the improved prompt; you can copy it or replace your message with it.

| Command | Behavior |
|---------|----------|
| `/prompt-fu` | Upgrade → AI responds to the improved prompt |
| `/prompt-refine` | Upgrade → AI returns the improved prompt (no response) |

**Prerequisites**:
- PromptLab proxy must be running (`npm run dev`).
- For prompts to be **actually improved** (not just analyzed): set `LLM_PROVIDER` and the matching API key in `.env`. Without this, the upgrade endpoint returns the original prompt with score/warnings only.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `LLM_PROVIDER` | `openai` \| `openrouter` \| `ollama` \| `groq` (default: `openai`) |
| `OPENAI_KEY` | OpenAI API key (when `LLM_PROVIDER=openai`) |
| `OPENAI_API_URL` | OpenAI base URL (default: `https://api.openai.com/v1`) |
| `OPENROUTER_API_KEY` | OpenRouter API key (when `LLM_PROVIDER=openrouter`) |
| `OPENROUTER_API_URL` | OpenRouter base URL (default: `https://openrouter.ai/api/v1`) |
| `OLLAMA_BASE_URL` | Ollama base URL (default: `http://localhost:11434`) |
| `GROQ_API_KEY` | Groq API key (when `LLM_PROVIDER=groq`) |
| `GROQ_API_URL` | Groq base URL (default: `https://api.groq.com/openai/v1`) |
| `LLM_REWRITE_MODEL` | Override model for prompt rewriting |
| `PORT` | Proxy port (default: 3000) |
| `PROMPTLAB_URL` | Base URL for MCP tool (default: `http://localhost:3000`) |

## Using PromptLab from Other Projects (MCP package)

`packages/promptlab-mcp` is a standalone npm package that exposes PromptLab's upgrade tool to **any** Cursor workspace — no need to reference the PromptLab project path or configure a local script.

### How it works

- The MCP server (`promptlab-mcp`) connects to a running PromptLab proxy over HTTP (`PROMPTLAB_URL`).
- Other projects add it to their `.cursor/mcp.json` via `npx` — no local install required.
- The PromptLab proxy (`npm run dev` in this repo) must be running for the tool to work.

### Using via npx (published package)

In any project's `.cursor/mcp.json`:

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

### Building locally (before publish or `npm link`)

```bash
cd packages/promptlab-mcp
npm install
npm run build        # compiles TypeScript → dist/
```

To use the local build globally without publishing:

```bash
cd packages/promptlab-mcp
npm link             # registers as a global binary
# now usable as: promptlab-mcp
```

To reference it from another project instead of `npx`:

```json
{
  "mcpServers": {
    "promptlab-mcp": {
      "command": "promptlab-mcp",
      "env": { "PROMPTLAB_URL": "http://localhost:3010" }
    }
  }
}
```

### Publishing to npm

```bash
cd packages/promptlab-mcp
npm run build        # prepublishOnly runs this automatically
npm publish
```

See `packages/promptlab-mcp/README.md` for full details on MCP configuration, slash command rules, and troubleshooting.

## Project Structure

```
src/
  analyzer/     # Scoring, anti-patterns, rewrite
  pipeline/     # processPrompt orchestration
  proxy/        # Express proxy server
  prompts/      # Meta-prompts
  db/           # promptStore, embeddings
  llm/          # Provider adapter (OpenAI, OpenRouter, Ollama, Groq)
  mcp/          # MCP server (prompt_upgrade tool for /prompt-fu)
prompt-db/      # Pattern templates (coding/, architecture/, analysis/)
```

## Adding Prompt Templates

Add `.md` files under `prompt-db/` with frontmatter:

```yaml
---
pattern: my_pattern
tags: [tag1, tag2]
---

Your prompt template here...
```

## License

MIT License
