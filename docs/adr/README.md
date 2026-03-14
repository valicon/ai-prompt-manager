# Architecture Decision Records (ADRs)

ADRs capture architecturally significant decisions from OpenSpec archived changes.

| ADR | Summary |
|-----|---------|
| [llm-provider-adapter](llm-provider-adapter.md) | Multi-provider LLM support (OpenAI, OpenRouter, Ollama, Groq) via env |
| [storage-backend](storage-backend.md) | SQLite default, PostgreSQL optional for prompt history |
| [prompt-dashboard](prompt-dashboard.md) | React+Vite+Chart.js dashboard, modal detail view, Express serving |
| [mcp-cursor-integration](mcp-cursor-integration.md) | MCP stdio server, prompt_upgrade tool, /prompt-fu and /prompt-refine |
| [prompt-quality-system](prompt-quality-system.md) | Scoring, rewriter, prompt-db file-based, embedding search |
| [embedding-cache](embedding-cache.md) | In-memory default, Redis optional |
| [logging](logging.md) | Verbose dev logging, Pino roadmap |
| [promptlab-roadmap](promptlab-roadmap.md) | Phased evolution, config-driven scale options |
| [prompt-upgrade-project-context](prompt-upgrade-project-context.md) | Optional project context for prompt upgrade (Omega + OpenSpec) |

Source: `openspec/changes/archive/` (10 archives processed 2026-03-14)
