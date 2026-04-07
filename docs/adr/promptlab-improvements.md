# PromptLab Improvements: Quality Gate, Diff, Auth, Feedback, Pinning, Real-time

## Status

Accepted

## Recorded

- 2026-04-07 — from archive `openspec/changes/archive/2026-04-07-promptlab-improvements/`

## Context

PromptLab rewrote prompts via LLM but provided no post-rewrite validation, no user visibility into what changed, no protection on internal endpoints, and no real-time feedback loop. These gaps eroded trust and limited adoption beyond single-developer local use. Six capabilities were added across the pipeline, database, API, and dashboard layers — all additive, preserving the core `/v1/chat/completions` proxy flow unchanged.

## Decision

### 1. Rewrite quality gate: inline synchronous re-scoring

After LLM rewrite, `scorePrompt()` is called on the rewritten output. If `rewrittenScore <= originalScore` the rewrite is discarded and the original is returned with `rewrite_succeeded = false`. The check is synchronous (<1ms) using the existing scorer — no extra LLM call, no external service.

**Rejected:** LLM self-evaluation (too slow, another LLM call on the critical path); external validator service (unnecessary complexity for a local tool).

### 2. Diff computation: server-side, returned in API response

`GET /api/prompts/:id` includes a `diff` field computed via the `diff` npm package (`diffLines(original, improved)`). The dashboard renders it as highlighted add/remove lines. No diffing logic in the browser.

**Rejected:** Client-side `diff-match-patch` (adds frontend dependency, larger bundle); raw text both sides diffed in browser (pushes compute to client unnecessarily).

### 3. API authentication: opt-in bearer token via env var

`authMiddleware` reads `PROMPTLAB_API_KEY`. When unset, it is a no-op (zero-config local use preserved). When set, `/upgrade`, `/upgrade/batch`, and `/api/*` require `Authorization: Bearer <key>`. The `/v1/chat/completions` route is intentionally excluded — IDE clients cannot inject custom headers through the standard base-URL override.

**Rejected:** Always-require auth (breaks existing setups); IP allowlist (harder to configure, doesn't help with Docker/remote).

### 4. Real-time dashboard: SSE via in-process EventEmitter

After each `insertPromptHistory`, a singleton `EventEmitter` emits a `prompt` event. `GET /api/events` subscribes to it and streams `data: <JSON>\n\n` to connected clients. No external message bus. Dashboard uses native `EventSource`, which auto-reconnects on drop.

**Rejected:** WebSockets (bidirectional, more complex; read-only push is sufficient); polling (wastes requests, adds latency); Redis pub/sub (overkill for single-process local tool).

### 5. Feedback and pinning: inline DB columns, not separate tables

`feedback TEXT NULL` (values `'up'|'down'|null`) and `pinned BOOLEAN DEFAULT FALSE` are added as columns on `prompt_history`. One feedback signal per record is sufficient; no separate tables or joins required.

**Rejected:** Separate feedback table (overkill for a single thumbs signal); localStorage-only feedback (lost on refresh, useless for analytics).

### 6. Schema migration: startup-time ALTER TABLE

New columns are added at server startup via `ALTER TABLE`. SQLite uses try/catch (no `IF NOT EXISTS` for columns). PostgreSQL uses `ADD COLUMN IF NOT EXISTS`. No data migration needed; existing rows get nullable/default values. Rollback: drop the two columns (core history unaffected).

### 7. Promote-to-template: timestamp-suffixed filenames in `prompt-db/user/`

Pinned prompts can be promoted to `prompt-db/user/<slug>-<timestamp>.md`. The `user/` subdirectory separates user-created templates from built-ins. `promptStore.ts` already loads all `.md` files recursively, so promoted templates are available at next server start without configuration.

## Consequences

**Positive:**
- Rewrite regressions are automatically discarded — quality gate improves pipeline reliability
- Diff view builds user trust by making changes transparent
- Auth is additive; zero-config local use is fully preserved
- SSE requires no new dependencies and auto-reconnects natively
- Feedback data is co-located with prompt records for easy analytics
- User-promoted templates feed back into the rewriter's pattern library

**Negative / Trade-offs:**
- Quality gate has false negatives: keyword-based scorer may discard a semantically better but keyword-sparse rewrite. Mitigated by logging both scores and showing diff.
- SSE has browser connection limits (6 per origin); multiple dashboard tabs compete. Acceptable for local use.
- `/v1/chat/completions` intentionally bypasses auth — a malicious local process could still use it as an LLM proxy. Existing rate limiting is the only safeguard.
- Promoted template filenames use timestamps to avoid collisions; filenames may be verbose.
