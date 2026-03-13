import * as path from "path";
import OpenAI from "openai";
import { loadPatterns, type PromptPattern } from "./promptStore";

const EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_SIMILARITY_THRESHOLD = 0.5;

export function getDefaultDbPath(): string {
  return path.join(process.cwd(), "prompt-db");
}

export interface PatternWithEmbedding extends PromptPattern {
  embedding: number[];
}

let cachedPatterns: PatternWithEmbedding[] | null = null;

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function computeEmbeddings(
  dbPath: string,
  apiKey?: string
): Promise<PatternWithEmbedding[]> {
  const key = apiKey ?? process.env.OPENAI_KEY;
  if (!key) {
    return [];
  }

  const patterns = loadPatterns(dbPath);
  if (patterns.length === 0) return [];

  const client = new OpenAI({ apiKey: key });

  const texts = patterns.map((p) => `${p.pattern}\n${p.prompt}`.slice(0, 8000));
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  return patterns.map((p, i) => ({
    ...p,
    embedding: response.data[i]?.embedding ?? [],
  }));
}

export async function initEmbeddings(dbPath: string): Promise<void> {
  cachedPatterns = await computeEmbeddings(dbPath);
}

export function findBestTemplate(
  userInput: string,
  apiKey?: string,
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD
): Promise<PromptPattern | null> {
  return findBestTemplateWithEmbeddings(
    userInput,
    cachedPatterns,
    apiKey,
    threshold,
    getDefaultDbPath()
  );
}

export async function findBestTemplateWithEmbeddings(
  userInput: string,
  patterns: PatternWithEmbedding[] | null,
  apiKey?: string,
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD,
  dbPath?: string
): Promise<PromptPattern | null> {
  const key = apiKey ?? process.env.OPENAI_KEY;
  if (!key) return null;

  let toSearch = patterns;
  if (!toSearch || toSearch.length === 0) {
    toSearch = await computeEmbeddings(dbPath ?? getDefaultDbPath(), key);
  }

  if (!toSearch || toSearch.length === 0) return null;

  const client = new OpenAI({ apiKey: key });
  const resp = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: userInput,
  });
  const inputEmbedding = resp.data[0]?.embedding ?? [];

  let best: PatternWithEmbedding | null = null;
  let bestScore = threshold;

  for (const p of toSearch) {
    const sim = cosineSimilarity(inputEmbedding, p.embedding);
    if (sim > bestScore) {
      bestScore = sim;
      best = p;
    }
  }

  return best ? { pattern: best.pattern, prompt: best.prompt, tags: best.tags, filePath: best.filePath } : null;
}
