# Prompt Dashboard (Web UI)

## Status

Accepted

## Recorded

- 2026-03-13 — from archive `openspec/changes/archive/2026-03-13-prompt-dashboard/`
- 2026-03-13 — from archive `openspec/changes/archive/2026-03-13-dashboard-improvements/`

## Context

PromptLab processes prompts but did not persist or visualize them. Developers could not inspect prompt history, compare original vs improved prompts, or track quality trends. A lightweight dashboard was needed for dev use.

## Decision

- **Stack**: React + Vite for SPA; Chart.js for charts (bar, line). No Recharts.
- **Serving**: Express serves built static assets from `dashboard/dist/` at `/dashboard`. API at `/api/prompts`, `/api/metrics`, `/api/prompts/export`.
- **Detail view**: Modal overlay for full prompt record; fetch via `GET /api/prompts/:id` when modal opens.
- **Date filters**: Native HTML `<input type="date">` for from/to; no date picker library.
- **Copy**: `navigator.clipboard.writeText()` with fallback.
- **No auth** in v1 (local/dev use).

## Consequences

- **Positive**: Single server; no CORS; simple dev (`npm run dev` + `npm run dev:dashboard`).
- **Positive**: Minimal dependencies; Chart.js is lightweight.
- **Negative**: Export API may lack filter params; add from/to/minScore/maxScore if export should respect filters.
- **Negative**: Modal may block small screens; use responsive full-screen on mobile.
