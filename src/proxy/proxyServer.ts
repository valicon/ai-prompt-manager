import express, { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import { randomUUID } from "crypto";
import { processPrompt } from "../pipeline/promptPipeline";
import {
  forwardChatCompletion,
  hasValidConfig,
  getProvider,
  getProviderConfig,
  getKeyEnvName,
  logProviderConfig,
} from "../llm/providerAdapter";
import { log, logError, setRequestId, clearRequestId } from "../utils/logger";
import { insert as insertPromptHistory } from "../db/promptHistory";
import dashboardRoutes from "../api/dashboardRoutes";
import path from "path";

const DEFAULT_PORT = 3000;

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10) || 60000;
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10) || 100;

const apiRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: { error: "Too many requests" },
});

function getRemediationHint(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Missing API key") || msg.includes("Set ")) {
    const provider = getProvider();
    const keyEnv = getKeyEnvName(provider);
    return keyEnv ? `Set ${keyEnv} in .env` : "Configure LLM provider in .env";
  }
  if (msg.includes("401")) return "Check API key validity";
  if (msg.includes("fetch") || msg.includes("ECONNREFUSED")) return "Check provider URL and connectivity";
  return "See error above";
}

function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const id = (req.headers["x-request-id"] as string) || randomUUID();
  (req as Request & { id: string }).id = id;
  setRequestId(id);
  next();
}

export function createProxyServer() {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);

  // Health endpoints
  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
  app.get("/ready", (_req, res) => {
    if (hasValidConfig(getProvider())) {
      res.status(200).json({ status: "ready" });
    } else {
      res.status(503).json({ status: "not ready", reason: "LLM config invalid" });
    }
  });

  app.use("/api", dashboardRoutes);

  const dashboardDist = path.join(process.cwd(), "dashboard", "dist");
  if (fs.existsSync(dashboardDist)) {
    app.use("/dashboard", express.static(dashboardDist));
    app.get(/^\/dashboard(\/.*)?$/, (_req, res) => {
      res.sendFile(path.join(dashboardDist, "index.html"));
    });
  }

  // Manual prompt upgrade endpoint (for /prompt-upgrade flow via rules or external tools)
  app.post("/upgrade", apiRateLimiter, async (req: Request, res: Response) => {
    const prompt = req.body?.prompt ?? req.body?.text;
    if (typeof prompt !== "string") {
      res.status(400).json({ error: "Missing prompt or text" });
      return;
    }
    const context = typeof req.body?.context === "string" ? req.body.context : undefined;
    log("Upgrade request, prompt length=%d", prompt.length);
    try {
      const result = await processPrompt(prompt, { context });
      log(
        "Upgrade done: score=%d, rewriteSucceeded=%s, improved length=%d",
        result.score,
        result.rewriteSucceeded,
        result.improved.length
      );
      try {
        await insertPromptHistory({
          original: prompt,
          improved: result.improved,
          score: result.score,
          warnings: result.warnings,
          rewriteSucceeded: result.rewriteSucceeded ?? false,
        });
      } catch (storeErr) {
        logError("Failed to store prompt history", storeErr);
      }
      res.json(result);
    } catch (err) {
      const hint = getRemediationHint(err);
      logError("Upgrade failed", err);
      log("Remediation: %s", hint);
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/upgrade/batch", apiRateLimiter, async (req: Request, res: Response) => {
    const prompts = req.body?.prompts;
    if (!Array.isArray(prompts)) {
      res.status(400).json({ error: "Missing or invalid prompts array" });
      return;
    }
    if (prompts.length === 0) {
      res.json([]);
      return;
    }
    try {
      const results = await Promise.all(
        prompts.map(async (p) => {
          if (typeof p !== "string") {
            return { score: 0, warnings: ["Invalid prompt"], improved: "", rewriteSucceeded: false };
          }
          try {
            return await processPrompt(p);
          } catch {
            return { score: 0, warnings: ["Upgrade failed"], improved: p, rewriteSucceeded: false };
          }
        })
      );
      res.json(results);
    } catch (err) {
      logError("Batch upgrade failed", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/v1/chat/completions", apiRateLimiter, async (req: Request, res: Response) => {
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: { message: "Missing or invalid messages" } });
      return;
    }

    const lastIdx = messages.length - 1;
    const lastMsg = messages[lastIdx];
    const content = lastMsg?.content;

    if (lastMsg?.role === "user" && typeof content === "string") {
      if (hasValidConfig(getProvider())) {
        try {
          const result = await processPrompt(content);
          messages[lastIdx] = { ...lastMsg, content: result.improved };
          log("Proxy: upgraded last message, rewriteSucceeded=%s", result.rewriteSucceeded);
          try {
            await insertPromptHistory({
              original: content,
              improved: result.improved,
              score: result.score,
              warnings: result.warnings,
              rewriteSucceeded: result.rewriteSucceeded ?? false,
            });
          } catch (storeErr) {
            logError("Failed to store prompt history", storeErr);
          }
        } catch (err) {
          logError("Proxy: upgrade failed, using original", err);
          log("Remediation: %s", getRemediationHint(err));
        }
      }
    }

    try {
      const upstream = await forwardChatCompletion(req.body);
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    } catch (err) {
      logError("Proxy: upstream LLM failed", err);
      log("Remediation: %s", getRemediationHint(err));
      res.status(502).json({
        error: { message: "Failed to reach LLM", details: String(err) },
      });
    }
  });

  return app;
}

export function startProxyServer(port: number = DEFAULT_PORT): void {
  const app = createProxyServer();
  const server = app.listen(port, () => {
    log("PromptLab proxy listening on http://localhost:%d", port);
    log("Configure Cursor API base: http://localhost:%d/v1", port);
    logProviderConfig();
  });
  server.on("error", (err) => {
    logError("Server error", err);
    process.exit(1);
  });
}
