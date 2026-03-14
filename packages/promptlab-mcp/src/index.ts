#!/usr/bin/env node
const path = require("path");
const serverDir = path.dirname(require.resolve("@modelcontextprotocol/sdk/server"));
const { McpServer } = require(path.join(serverDir, "mcp.js"));
const { StdioServerTransport } = require(path.join(serverDir, "stdio.js"));
const { z } = require("zod");

const PROMPTLAB_URL = process.env.PROMPTLAB_URL ?? "http://localhost:3000";

const server = new McpServer({
  name: "promptlab-mcp",
  version: "1.0.0",
});

server.registerTool(
  "prompt_upgrade",
  {
    description:
      "Upgrade a prompt using PromptLab. Calls the /upgrade endpoint to analyze and improve the prompt. Returns the improved prompt. Requires PromptLab proxy to be running (npm run dev).",
    inputSchema: {
      prompt: z.string().describe("The prompt text to upgrade"),
      context: z.string().optional().describe("Optional project context (tech stack, domain, constraints) to tailor the upgrade"),
    },
  },
  async ({ prompt, context }: { prompt: string; context?: string }) => {
    try {
      const body: { prompt: string; context?: string } = { prompt };
      if (context && context.trim()) body.context = context.trim();
      const res = await fetch(`${PROMPTLAB_URL.replace(/\/$/, "")}/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          content: [
            {
              type: "text" as const,
              text: `PromptLab error: ${res.status}. Is the proxy running? Run \`npm run dev\`. ${errText}`,
            },
          ],
          isError: true,
        };
      }

      const data = (await res.json()) as {
        improved?: string;
        score?: number;
        warnings?: string[];
        rewriteSucceeded?: boolean;
      };
      const improved = typeof data.improved === "string" ? data.improved : prompt;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              improved,
              score: data.score,
              warnings: data.warnings,
              rewriteSucceeded: data.rewriteSucceeded,
            }),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to call PromptLab: ${err instanceof Error ? err.message : String(err)}. Ensure the proxy is running (npm run dev).`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("PromptLab MCP server error:", err);
  process.exit(1);
});
