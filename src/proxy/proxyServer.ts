import express, { Request, Response } from "express";
import fs from "fs";
import { processPrompt } from "../pipeline/promptPipeline";
import {
  forwardChatCompletion,
  hasValidConfig,
  getProvider,
  getProviderConfig,
  getKeyEnvName,
  logProviderConfig,
} from "../llm/providerAdapter";
import { log, logError } from "../utils/logger";
import { insert as insertPromptHistory } from "../db/promptHistory";
import dashboardRoutes from "../api/dashboardRoutes";
import path from "path";

const DEFAULT_PORT = 3000;

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

export function createProxyServer() {
  const app = express();
  app.use(express.json());
  app.use("/api", dashboardRoutes);

  const dashboardDist = path.join(process.cwd(), "dashboard", "dist");
  if (fs.existsSync(dashboardDist)) {
    app.use("/dashboard", express.static(dashboardDist));
    app.get(/^\/dashboard(\/.*)?$/, (_req, res) => {
      res.sendFile(path.join(dashboardDist, "index.html"));
    });
  }

  // Manual prompt upgrade endpoint (for /prompt-upgrade flow via rules or external tools)
  app.post("/upgrade", async (req: Request, res: Response) => {
    const prompt = req.body?.prompt ?? req.body?.text;
    if (typeof prompt !== "string") {
      res.status(400).json({ error: "Missing prompt or text" });
      return;
    }
    log("Upgrade request, prompt length=%d", prompt.length);
    try {
      const result = await processPrompt(prompt);
      log(
        "Upgrade done: score=%d, rewriteSucceeded=%s, improved length=%d",
        result.score,
        result.rewriteSucceeded,
        result.improved.length
      );
      try {
        insertPromptHistory({
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

  app.post("/v1/chat/completions", async (req: Request, res: Response) => {
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
            insertPromptHistory({
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
    console.log(`PromptLab proxy listening on http://localhost:${port}`);
    console.log(`Configure Cursor API base: http://localhost:${port}/v1`);
    logProviderConfig();
  });
  server.on("error", (err) => {
    logError("Server error", err);
    process.exit(1);
  });
}
