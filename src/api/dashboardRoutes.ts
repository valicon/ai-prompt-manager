import { Router, Request, Response } from "express";
import { diffLines } from "diff";
import fs from "fs";
import path from "path";
import { query, getById, getMetrics, updateFeedback, updatePinned } from "../db/promptHistory";
import { promptEventEmitter } from "../events/promptEventEmitter";

const router = Router();

router.get("/prompts", async (req: Request, res: Response) => {
  const q = req.query.q as string | undefined;
  const minScore = req.query.minScore != null ? parseInt(String(req.query.minScore), 10) : undefined;
  const maxScore = req.query.maxScore != null ? parseInt(String(req.query.maxScore), 10) : undefined;
  const rewriteSucceeded =
    req.query.rewriteSucceeded != null
      ? req.query.rewriteSucceeded === "true" || req.query.rewriteSucceeded === "1"
      : undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const limit = req.query.limit != null ? parseInt(String(req.query.limit), 10) : undefined;
  const offset = req.query.offset != null ? parseInt(String(req.query.offset), 10) : undefined;

  const { items, total } = await query({
    q: q?.trim() || undefined,
    minScore: Number.isNaN(minScore) ? undefined : minScore,
    maxScore: Number.isNaN(maxScore) ? undefined : maxScore,
    rewriteSucceeded,
    from,
    to,
    limit,
    offset,
  });
  res.json({ items, total });
});

router.get("/prompts/export", async (req: Request, res: Response) => {
  const format = (req.query.format as string)?.toLowerCase() || "json";
  const limit = req.query.limit != null ? parseInt(String(req.query.limit), 10) : 1000;
  const offset = req.query.offset != null ? parseInt(String(req.query.offset), 10) : 0;

  const { items } = await query({
    limit: Number.isNaN(limit) ? 1000 : limit,
    offset: Number.isNaN(offset) ? 0 : offset,
  });

  if (format === "csv") {
    const header = "id,original,improved,score,warnings,rewriteSucceeded,createdAt\n";
    const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const rows = items.map(
      (r) =>
        `${r.id},${escape(r.original)},${escape(r.improved)},${r.score},${escape(JSON.stringify(r.warnings))},${r.rewriteSucceeded},${r.createdAt}`
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=prompt-history.csv");
    res.send(header + rows.join("\n"));
  } else {
    res.json(items);
  }
});

router.get("/prompts/:id", async (req: Request, res: Response) => {
  const idParam = req.params.id;
  const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const record = await getById(id);
  if (!record) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const diff = record.rewriteSucceeded
    ? diffLines(record.original, record.improved)
    : [];
  res.json({ ...record, diff });
});

router.get("/metrics", async (req: Request, res: Response) => {
  const topN = req.query.topN != null ? parseInt(String(req.query.topN), 10) : 10;
  const days = req.query.days != null ? parseInt(String(req.query.days), 10) : 30;
  const metrics = await getMetrics(
    Number.isNaN(topN) ? 10 : topN,
    Number.isNaN(days) ? 30 : days
  );
  res.json(metrics);
});

router.patch("/prompts/:id/feedback", async (req: Request, res: Response) => {
  const idParam = req.params.id;
  const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam, 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { feedback } = req.body as { feedback?: unknown };
  if (feedback !== "up" && feedback !== "down" && feedback !== null) {
    res.status(400).json({ error: "feedback must be 'up', 'down', or null" });
    return;
  }
  const updated = await updateFeedback(id, feedback ?? null);
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.patch("/prompts/:id/pin", async (req: Request, res: Response) => {
  const idParam = req.params.id;
  const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam, 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { pinned } = req.body as { pinned?: unknown };
  if (typeof pinned !== "boolean") {
    res.status(400).json({ error: "pinned must be a boolean" });
    return;
  }
  const updated = await updatePinned(id, pinned);
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.post("/prompts/:id/promote", async (req: Request, res: Response) => {
  const idParam = req.params.id;
  const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam, 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const record = await getById(id);
  if (!record) { res.status(404).json({ error: "Not found" }); return; }
  if (!record.pinned) {
    res.status(400).json({ error: "Prompt must be pinned before promoting" });
    return;
  }
  // Derive slug from first non-whitespace line of the prompt
  const firstLine = record.original.trim().split("\n")[0] ?? "";
  const slug = firstLine
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "prompt";
  const timestamp = Date.now();
  const filename = `${slug}-${timestamp}.md`;
  const userDir = path.join(process.cwd(), "prompt-db", "user");
  fs.mkdirSync(userDir, { recursive: true });
  const filePath = path.join(userDir, filename);
  const tags = record.warnings.length > 0
    ? record.warnings.map((w) => w.replace(/\s+/g, "_").toLowerCase()).join(", ")
    : "user-promoted";
  const content =
    `---\npattern: ${slug}\ntags: [${tags}]\n---\n\n${record.improved || record.original}\n`;
  fs.writeFileSync(filePath, content, "utf-8");
  const relativePath = path.join("prompt-db", "user", filename).replace(/\\/g, "/");
  res.status(201).json({ path: relativePath });
});

// SSE: real-time prompt stream
router.get("/events", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const onPrompt = (record: unknown) => {
    res.write(`data: ${JSON.stringify(record)}\n\n`);
  };
  promptEventEmitter.on("prompt", onPrompt);
  req.on("close", () => {
    promptEventEmitter.off("prompt", onPrompt);
  });
});

export default router;
