import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import { getStorageBackend } from "./storageAdapter";
import {
  insertPostgres,
  queryPostgres,
  getByIdPostgres,
  getMetricsPostgres,
} from "./promptHistoryPostgres";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "prompts.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    initDb(db);
  }
  return db;
}

function usePostgres(): boolean {
  return getStorageBackend() === "postgres" && !!process.env.DATABASE_URL;
}

function initDb(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS prompt_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original TEXT NOT NULL,
      improved TEXT NOT NULL,
      score INTEGER NOT NULL,
      warnings TEXT NOT NULL,
      rewrite_succeeded INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_prompt_history_created_at ON prompt_history(created_at);
    CREATE INDEX IF NOT EXISTS idx_prompt_history_score ON prompt_history(score);
    CREATE INDEX IF NOT EXISTS idx_prompt_history_rewrite_succeeded ON prompt_history(rewrite_succeeded);
  `);
}

export interface InsertRecord {
  original: string;
  improved: string;
  score: number;
  warnings: string[];
  rewriteSucceeded: boolean;
}

export interface QueryFilters {
  q?: string;
  minScore?: number;
  maxScore?: number;
  rewriteSucceeded?: boolean;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface PromptRecord {
  id: number;
  original: string;
  improved: string;
  score: number;
  warnings: string[];
  rewriteSucceeded: boolean;
  createdAt: string;
}

export async function insert(record: InsertRecord): Promise<number> {
  if (usePostgres()) {
    return insertPostgres(record);
  }
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO prompt_history (original, improved, score, warnings, rewrite_succeeded, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const createdAt = new Date().toISOString();
  const result = stmt.run(
    record.original,
    record.improved,
    record.score,
    JSON.stringify(record.warnings),
    record.rewriteSucceeded ? 1 : 0,
    createdAt
  );
  return result.lastInsertRowid as number;
}

export async function query(
  filters: QueryFilters = {}
): Promise<{ items: PromptRecord[]; total: number }> {
  if (usePostgres()) {
    return queryPostgres(filters);
  }
  const database = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.q) {
    conditions.push("(original LIKE ? OR improved LIKE ?)");
    const term = `%${filters.q}%`;
    params.push(term, term);
  }
  if (filters.minScore !== undefined) {
    conditions.push("score >= ?");
    params.push(filters.minScore);
  }
  if (filters.maxScore !== undefined) {
    conditions.push("score <= ?");
    params.push(filters.maxScore);
  }
  if (filters.rewriteSucceeded !== undefined) {
    conditions.push("rewrite_succeeded = ?");
    params.push(filters.rewriteSucceeded ? 1 : 0);
  }
  if (filters.from) {
    conditions.push("created_at >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push("created_at <= ?");
    params.push(filters.to);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countStmt = database.prepare(`
    SELECT COUNT(*) as total FROM prompt_history ${whereClause}
  `);
  const { total } = countStmt.get(...params) as { total: number };

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const selectStmt = database.prepare(`
    SELECT id, original, improved, score, warnings, rewrite_succeeded, created_at
    FROM prompt_history ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  const rows = selectStmt.all(...params, limit, offset) as Array<{
    id: number;
    original: string;
    improved: string;
    score: number;
    warnings: string;
    rewrite_succeeded: number;
    created_at: string;
  }>;

  const items: PromptRecord[] = rows.map((r) => ({
    id: r.id,
    original: r.original,
    improved: r.improved,
    score: r.score,
    warnings: JSON.parse(r.warnings || "[]") as string[],
    rewriteSucceeded: r.rewrite_succeeded === 1,
    createdAt: r.created_at,
  }));

  return { items, total };
}

export async function getById(id: number): Promise<PromptRecord | null> {
  if (usePostgres()) {
    return getByIdPostgres(id);
  }
  const database = getDb();
  const row = database
    .prepare(
      `SELECT id, original, improved, score, warnings, rewrite_succeeded, created_at
       FROM prompt_history WHERE id = ?`
    )
    .get(id) as {
    id: number;
    original: string;
    improved: string;
    score: number;
    warnings: string;
    rewrite_succeeded: number;
    created_at: string;
  } | undefined;
  if (!row) return null;
  return {
    id: row.id,
    original: row.original,
    improved: row.improved,
    score: row.score,
    warnings: JSON.parse(row.warnings || "[]") as string[],
    rewriteSucceeded: row.rewrite_succeeded === 1,
    createdAt: row.created_at,
  };
}

export interface MetricsResult {
  avgScore: number;
  totalCount: number;
  topPrompts: PromptRecord[];
  worstPrompts: PromptRecord[];
  scoreDistribution: Array<{ score: number; count: number }>;
  volumeByDay: Array<{ date: string; count: number }>;
}

export async function getMetrics(topN = 10, days = 30): Promise<MetricsResult> {
  if (usePostgres()) {
    return getMetricsPostgres(topN, days);
  }
  const database = getDb();
  const totalRow = database.prepare("SELECT COUNT(*) as c, AVG(score) as avg FROM prompt_history").get() as {
    c: number;
    avg: number | null;
  };
  const totalCount = totalRow.c;
  const avgScore = totalRow.avg != null ? Math.round(totalRow.avg * 10) / 10 : 0;

  const topRows = database
    .prepare(
      `SELECT id, original, improved, score, warnings, rewrite_succeeded, created_at
       FROM prompt_history ORDER BY score DESC LIMIT ?`
    )
    .all(topN) as Array<{
    id: number;
    original: string;
    improved: string;
    score: number;
    warnings: string;
    rewrite_succeeded: number;
    created_at: string;
  }>;
  const topPrompts = topRows.map(toRecord);

  const worstRows = database
    .prepare(
      `SELECT id, original, improved, score, warnings, rewrite_succeeded, created_at
       FROM prompt_history ORDER BY score ASC LIMIT ?`
    )
    .all(topN) as Array<{
    id: number;
    original: string;
    improved: string;
    score: number;
    warnings: string;
    rewrite_succeeded: number;
    created_at: string;
  }>;
  const worstPrompts = worstRows.map(toRecord);

  const distRows = database
    .prepare(
      `SELECT score, COUNT(*) as count FROM prompt_history GROUP BY score ORDER BY score`
    )
    .all() as Array<{ score: number; count: number }>;
  const scoreDistribution = distRows;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const volRows = database
    .prepare(
      `SELECT date(created_at) as date, COUNT(*) as count
       FROM prompt_history WHERE created_at >= ?
       GROUP BY date(created_at) ORDER BY date`
    )
    .all(cutoffStr) as Array<{ date: string; count: number }>;
  const volumeByDay = volRows;

  return {
    avgScore,
    totalCount,
    topPrompts,
    worstPrompts,
    scoreDistribution,
    volumeByDay,
  };
}

function toRecord(r: {
  id: number;
  original: string;
  improved: string;
  score: number;
  warnings: string;
  rewrite_succeeded: number;
  created_at: string;
}): PromptRecord {
  return {
    id: r.id,
    original: r.original,
    improved: r.improved,
    score: r.score,
    warnings: JSON.parse(r.warnings || "[]") as string[],
    rewriteSucceeded: r.rewrite_succeeded === 1,
    createdAt: r.created_at,
  };
}
