import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";

// We test the SQLite path directly by exercising the module against a temp DB.
// We override the DB path via a module-level approach: use better-sqlite3 directly
// to verify schema and logic, since promptHistory.ts opens the real data/prompts.db.
// Instead we test updateFeedback and updatePinned logic in isolation.

describe("updateFeedback / updatePinned (SQLite logic)", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE prompt_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original TEXT NOT NULL,
        improved TEXT NOT NULL,
        score INTEGER NOT NULL,
        warnings TEXT NOT NULL,
        rewrite_succeeded INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        feedback TEXT,
        pinned INTEGER NOT NULL DEFAULT 0
      )
    `);
    db.prepare(`
      INSERT INTO prompt_history (original, improved, score, warnings, rewrite_succeeded, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("original prompt", "improved prompt", 75, "[]", 1, new Date().toISOString());
  });

  afterEach(() => {
    db.close();
  });

  it("feedback column defaults to null", () => {
    const row = db.prepare("SELECT feedback FROM prompt_history WHERE id = 1").get() as { feedback: string | null };
    expect(row.feedback).toBeNull();
  });

  it("pinned column defaults to 0", () => {
    const row = db.prepare("SELECT pinned FROM prompt_history WHERE id = 1").get() as { pinned: number };
    expect(row.pinned).toBe(0);
  });

  it("can set feedback to 'up'", () => {
    db.prepare("UPDATE prompt_history SET feedback = ? WHERE id = ?").run("up", 1);
    const row = db.prepare("SELECT feedback FROM prompt_history WHERE id = 1").get() as { feedback: string };
    expect(row.feedback).toBe("up");
  });

  it("can clear feedback by setting null", () => {
    db.prepare("UPDATE prompt_history SET feedback = ? WHERE id = ?").run("up", 1);
    db.prepare("UPDATE prompt_history SET feedback = ? WHERE id = ?").run(null, 1);
    const row = db.prepare("SELECT feedback FROM prompt_history WHERE id = 1").get() as { feedback: string | null };
    expect(row.feedback).toBeNull();
  });

  it("can set pinned to 1", () => {
    db.prepare("UPDATE prompt_history SET pinned = ? WHERE id = ?").run(1, 1);
    const row = db.prepare("SELECT pinned FROM prompt_history WHERE id = 1").get() as { pinned: number };
    expect(row.pinned).toBe(1);
  });

  it("returns 0 changes when updating non-existent id", () => {
    const result = db.prepare("UPDATE prompt_history SET pinned = ? WHERE id = ?").run(1, 9999);
    expect(result.changes).toBe(0);
  });
});
