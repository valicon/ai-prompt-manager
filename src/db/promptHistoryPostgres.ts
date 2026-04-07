/**
 * PostgreSQL storage for prompt history. Used when DB_BACKEND=postgres and DATABASE_URL is set.
 */
import { Pool } from "pg";
import type {
  InsertRecord,
  QueryFilters,
  PromptRecord,
  MetricsResult,
} from "./promptHistory";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DB_BACKEND=postgres requires DATABASE_URL");
    }
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

async function initSchema(p: Pool): Promise<void> {
  await p.query(`
    CREATE TABLE IF NOT EXISTS prompt_history (
      id SERIAL PRIMARY KEY,
      original TEXT NOT NULL,
      improved TEXT NOT NULL,
      score INTEGER NOT NULL,
      warnings JSONB NOT NULL DEFAULT '[]',
      rewrite_succeeded BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_prompt_history_created_at ON prompt_history(created_at);
    CREATE INDEX IF NOT EXISTS idx_prompt_history_score ON prompt_history(score);
    CREATE INDEX IF NOT EXISTS idx_prompt_history_rewrite_succeeded ON prompt_history(rewrite_succeeded);
  `);
  // Migrations for new columns (IF NOT EXISTS is supported in PG)
  await p.query("ALTER TABLE prompt_history ADD COLUMN IF NOT EXISTS feedback TEXT");
  await p.query("ALTER TABLE prompt_history ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE");
}

let initialized = false;

async function ensureInit(): Promise<Pool> {
  const p = getPool();
  if (!initialized) {
    await initSchema(p);
    initialized = true;
  }
  return p;
}

export async function insertPostgres(record: InsertRecord): Promise<number> {
  const p = await ensureInit();
  const res = await p.query(
    `INSERT INTO prompt_history (original, improved, score, warnings, rewrite_succeeded, created_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      record.original,
      record.improved,
      record.score,
      JSON.stringify(record.warnings),
      record.rewriteSucceeded,
      new Date().toISOString(),
    ]
  );
  return res.rows[0]?.id ?? 0;
}

export async function queryPostgres(
  filters: QueryFilters = {}
): Promise<{ items: PromptRecord[]; total: number }> {
  const p = await ensureInit();
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.q) {
    conditions.push(`(original ILIKE $${paramIdx} OR improved ILIKE $${paramIdx})`);
    params.push(`%${filters.q}%`);
    paramIdx++;
  }
  if (filters.minScore !== undefined) {
    conditions.push(`score >= $${paramIdx}`);
    params.push(filters.minScore);
    paramIdx++;
  }
  if (filters.maxScore !== undefined) {
    conditions.push(`score <= $${paramIdx}`);
    params.push(filters.maxScore);
    paramIdx++;
  }
  if (filters.rewriteSucceeded !== undefined) {
    conditions.push(`rewrite_succeeded = $${paramIdx}`);
    params.push(filters.rewriteSucceeded);
    paramIdx++;
  }
  if (filters.from) {
    conditions.push(`created_at >= $${paramIdx}`);
    params.push(filters.from);
    paramIdx++;
  }
  if (filters.to) {
    conditions.push(`created_at <= $${paramIdx}`);
    params.push(filters.to);
    paramIdx++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await p.query(`SELECT COUNT(*)::int as total FROM prompt_history ${whereClause}`, params);
  const total = countRes.rows[0]?.total ?? 0;

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  params.push(limit, offset);
  const limitParam = paramIdx;
  const offsetParam = paramIdx + 1;

  const selectRes = await p.query(
    `SELECT id, original, improved, score, warnings, rewrite_succeeded, created_at, feedback, pinned
     FROM prompt_history ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    params
  );

  const items: PromptRecord[] = selectRes.rows.map((r) => ({
    id: r.id,
    original: r.original,
    improved: r.improved,
    score: r.score,
    warnings: Array.isArray(r.warnings) ? r.warnings : JSON.parse(r.warnings || "[]"),
    rewriteSucceeded: Boolean(r.rewrite_succeeded),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    feedback: r.feedback ?? null,
    pinned: Boolean(r.pinned),
  }));

  return { items, total };
}

export async function getMetricsPostgres(
  topN = 10,
  days = 30
): Promise<MetricsResult> {
  const p = await ensureInit();

  const totalRes = await p.query(
    "SELECT COUNT(*)::int as c, AVG(score)::float as avg FROM prompt_history"
  );
  const totalCount = totalRes.rows[0]?.c ?? 0;
  const avgScore =
    totalRes.rows[0]?.avg != null
      ? Math.round(Number(totalRes.rows[0].avg) * 10) / 10
      : 0;

  const topRes = await p.query(
    `SELECT id, original, improved, score, warnings, rewrite_succeeded, created_at, feedback, pinned
     FROM prompt_history ORDER BY score DESC LIMIT $1`,
    [topN]
  );
  const topPrompts = topRes.rows.map(toRecord);

  const worstRes = await p.query(
    `SELECT id, original, improved, score, warnings, rewrite_succeeded, created_at, feedback, pinned
     FROM prompt_history ORDER BY score ASC LIMIT $1`,
    [topN]
  );
  const worstPrompts = worstRes.rows.map(toRecord);

  const distRes = await p.query(
    `SELECT score, COUNT(*)::int as count FROM prompt_history GROUP BY score ORDER BY score`
  );
  const scoreDistribution = distRes.rows.map((r) => ({
    score: r.score,
    count: r.count,
  }));

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const volRes = await p.query(
    `SELECT date(created_at)::text as date, COUNT(*)::int as count
     FROM prompt_history WHERE created_at >= $1
     GROUP BY date(created_at) ORDER BY date`,
    [cutoffStr]
  );
  const volumeByDay = volRes.rows.map((r) => ({
    date: r.date,
    count: r.count,
  }));

  return {
    avgScore,
    totalCount,
    topPrompts,
    worstPrompts,
    scoreDistribution,
    volumeByDay,
  };
}

function toRecord(r: Record<string, unknown>): PromptRecord {
  return {
    id: r.id as number,
    original: r.original as string,
    improved: r.improved as string,
    score: r.score as number,
    warnings: Array.isArray(r.warnings) ? (r.warnings as string[]) : JSON.parse((r.warnings as string) || "[]"),
    rewriteSucceeded: Boolean(r.rewrite_succeeded),
    createdAt:
      r.created_at instanceof Date ? (r.created_at as Date).toISOString() : String(r.created_at),
    feedback: (r.feedback as string | null) ?? null,
    pinned: Boolean(r.pinned),
  };
}

export async function getByIdPostgres(id: number): Promise<PromptRecord | null> {
  const p = await ensureInit();
  const res = await p.query(
    `SELECT id, original, improved, score, warnings, rewrite_succeeded, created_at, feedback, pinned
     FROM prompt_history WHERE id = $1`,
    [id]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    id: r.id,
    original: r.original,
    improved: r.improved,
    score: r.score,
    warnings: Array.isArray(r.warnings) ? r.warnings : JSON.parse(r.warnings || "[]"),
    rewriteSucceeded: Boolean(r.rewrite_succeeded),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    feedback: r.feedback ?? null,
    pinned: Boolean(r.pinned),
  };
}

export async function updateFeedbackPostgres(id: number, feedback: string | null): Promise<PromptRecord | null> {
  const p = await ensureInit();
  const res = await p.query(
    `UPDATE prompt_history SET feedback = $1 WHERE id = $2
     RETURNING id, original, improved, score, warnings, rewrite_succeeded, created_at, feedback, pinned`,
    [feedback, id]
  );
  const r = res.rows[0];
  if (!r) return null;
  return toRecord(r);
}

export async function updatePinnedPostgres(id: number, pinned: boolean): Promise<PromptRecord | null> {
  const p = await ensureInit();
  const res = await p.query(
    `UPDATE prompt_history SET pinned = $1 WHERE id = $2
     RETURNING id, original, improved, score, warnings, rewrite_succeeded, created_at, feedback, pinned`,
    [pinned, id]
  );
  const r = res.rows[0];
  if (!r) return null;
  return toRecord(r);
}
