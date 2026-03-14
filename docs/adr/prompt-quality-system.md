# Prompt Quality System (Scoring, Rewriting, Pattern DB)

## Status

Accepted

## Recorded

- 2026-03-13 — from archive `openspec/changes/archive/2026-03-13-promptlab-prompt-quality-system/`

## Context

Developers often send vague prompts ("fix this", "make login system"), leading to poor outputs. There was no middleware to analyze, improve, and standardize prompts before they reach the model. PromptLab acts as a Prompt Gateway.

## Decision

- **Scoring**: Hybrid. Rule-based for dimensions (token count, language/framework keywords, constraints) plus optional LLM meta-evaluation. Five dimensions (clarity, context, constraints, format, completeness), 20 points each, total 100.
- **Anti-patterns**: Rule-based detection (too short, no language/framework, no constraints, no output format).
- **Rewriter**: LLM-based using meta-prompt. Templates from prompt-db can be injected as few-shot examples.
- **Prompt database**: File-based Markdown in `prompt-db/` with structure (coding/, architecture/, analysis/). Each pattern is `.md` with frontmatter (pattern, prompt, tags).
- **Embedding search**: OpenAI `text-embedding-3-small`; vectors in memory at startup. Cosine similarity for search. Optional sqlite-vss or pgvector later.
- **Proxy**: Always upgrades prompts when enabled. User opts in by pointing Cursor to `http://localhost:3000/v1`.
- **Score threshold**: `SKIP_REWRITE_ABOVE_SCORE=80` (default); skip LLM rewrite when score meets threshold.

## Consequences

- **Positive**: Rule-based is fast, deterministic, cheap; LLM adds quality when needed.
- **Positive**: File-based prompt-db is versionable, no DB setup.
- **Negative**: LLM calls add latency; make rewriter optional; allow "analyze only" mode.
- **Negative**: Meta-prompt can be brittle; version meta-prompts; allow override via env.
