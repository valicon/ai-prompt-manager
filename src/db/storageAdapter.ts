/**
 * Storage adapter interface. DB_BACKEND=sqlite|postgres.
 * Default: sqlite.
 */
import type { InsertRecord, QueryFilters, PromptRecord } from "./promptHistory";

export interface StorageAdapter {
  insert(record: InsertRecord): number;
  query(filters: QueryFilters): { items: PromptRecord[]; total: number };
  getById(id: number): PromptRecord | null;
}

export function getStorageBackend(): "sqlite" | "postgres" {
  const env = process.env.DB_BACKEND?.toLowerCase();
  if (env === "postgres") return "postgres";
  return "sqlite";
}
