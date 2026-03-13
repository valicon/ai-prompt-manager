import { Router, Request, Response } from "express";
import { query, getById, getMetrics } from "../db/promptHistory";

const router = Router();

router.get("/prompts", (req: Request, res: Response) => {
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

  const { items, total } = query({
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

router.get("/prompts/:id", (req: Request, res: Response) => {
  const idParam = req.params.id;
  const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const record = getById(id);
  if (!record) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(record);
});

router.get("/metrics", (req: Request, res: Response) => {
  const topN = req.query.topN != null ? parseInt(String(req.query.topN), 10) : 10;
  const days = req.query.days != null ? parseInt(String(req.query.days), 10) : 30;
  const metrics = getMetrics(
    Number.isNaN(topN) ? 10 : topN,
    Number.isNaN(days) ? 30 : days
  );
  res.json(metrics);
});

export default router;
