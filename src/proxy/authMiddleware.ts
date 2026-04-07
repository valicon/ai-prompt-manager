import { Request, Response, NextFunction } from "express";

/**
 * Optional bearer token authentication.
 * When PROMPTLAB_API_KEY is set, requests must include:
 *   Authorization: Bearer <key>
 * When unset, this middleware is a no-op (zero-config local use preserved).
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.PROMPTLAB_API_KEY;
  if (!apiKey) {
    next();
    return;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice("Bearer ".length);
  if (token !== apiKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
