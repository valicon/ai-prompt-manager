# Installing promptlab-mcp in Other Projects

Complete guide to use promptlab-mcp (and `/prompt-fu` / `/prompt-refine` slash commands) in any Cursor project, not just ai-prompt-manager.

---

## Prerequisites

1. **Node.js 18+** – Required for `npx` and the MCP server.
2. **PromptLab proxy** – Must be running. In the ai-prompt-manager project:
   ```bash
   cd /path/to/ai-prompt-manager
   npm run dev
   ```
   The proxy runs at `http://localhost:3010` (or the port shown in the terminal).

3. **PromptLab package** – Either:
   - Published to npm: `npx -y promptlab-mcp` works out of the box, or
   - Local development: `npm link` from `packages/promptlab-mcp` (see [Local Development: Link](#local-development-link-no-npm-publish) below).

---

## Step 1: Configure MCP

Choose **project-level** (config in one project) or **global** (config for all projects).

### Option A: Project-level (only for this project)

1. Create or edit `.cursor/mcp.json` in your project root.
2. Add or merge the `promptlab-mcp` server:

```json
{
  "mcpServers": {
    "promptlab-mcp": {
      "command": "npx",
      "args": ["-y", "promptlab-mcp"],
      "env": {
        "PROMPTLAB_URL": "http://localhost:3010"
      }
    }
  }
}
```

**Path:** `your-project/.cursor/mcp.json`

### Option B: Global (all projects)

1. Open your global MCP config:
   - **Windows:** `%APPDATA%\Cursor\mcp.json` or `~/.cursor/mcp.json`
   - **macOS/Linux:** `~/.cursor/mcp.json`
2. Add or merge the same `promptlab-mcp` block as above.

**Path:** `~/.cursor/mcp.json` (or `C:\Users\<user>\AppData\Roaming\Cursor\mcp.json` on Windows)

**Note:** If you already have other MCP servers, add `promptlab-mcp` as another entry inside `mcpServers`.

---

## Step 2: Add Cursor Rules (for /prompt-fu and /prompt-refine)

To use the `/prompt-fu` and `/prompt-refine` slash commands, copy the rules from ai-prompt-manager.

1. **Create the rules directory** (if it doesn’t exist):
   ```
   your-project/.cursor/rules/
   ```

2. **Copy these rule files** from ai-prompt-manager into `.cursor/rules/`:
   - `prompt-fu.mdc` – `/prompt-fu` (upgrade prompt, then respond)
   - `prompt-refine.mdc` – `/prompt-refine` (upgrade prompt, return improved text only)

   From ai-prompt-manager:
   ```
   .cursor/rules/prompt-fu.mdc
   .cursor/rules/prompt-refine.mdc
   ```

3. **Optional: copy the slash command definitions** (if you use Cursor custom commands):
   - Copy `prompt-fu` and `prompt-refine` (or equivalent) from ai-prompt-manager’s `.cursor/commands/` into your project’s `.cursor/commands/`.

---

## Step 3: Restart Cursor

Reload Cursor so it picks up the new MCP config:

- **Windows/Linux:** `Ctrl+Shift+P` → “Developer: Reload Window”
- **macOS:** `Cmd+Shift+P` → “Developer: Reload Window”

Or fully close and reopen Cursor.

---

## Step 4: Verify

1. **Check MCP status** – Settings → Tools & MCP → `promptlab-mcp` should show “X tools enabled” (green), not “Loading tools”.
2. **Test prompt upgrade** – In chat, type:
   ```
   /prompt-fu make a login form
   ```
   If it works, the model will respond with an improved version of the prompt.

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| **"Loading tools"** | MCP server not starting | Ensure Node.js 18+ is installed. Run `npx -y promptlab-mcp` in a terminal to confirm it starts. |
| **"Cannot find module"** | Old config using relative paths | Replace `"args": ["ts-node", "src/mcp/server.ts"]` with `"args": ["-y", "promptlab-mcp"]`. |
| **"PromptLab proxy not running"** | Proxy not started | Run `npm run dev` in the ai-prompt-manager project. |
| **Wrong port** | Proxy on different port | Set `PROMPTLAB_URL` in the MCP config to match (e.g. `http://localhost:3010`). |

---

## Local Development: Link (No npm Publish)

Use this when developing on the same machine without publishing to npm. Two options:

### Option A: Global link (simplest – works for any project)

Makes `promptlab-mcp` available as a global command. No `package.json` needed in the other project.

**Step 1 – Build and link** (in ai-prompt-manager):

```bash
cd /path/to/ai-prompt-manager/packages/promptlab-mcp
npm install
npm run build
npm link
```

**Step 2 – MCP config** (in the other project's `.cursor/mcp.json`):
   ```json
   {
     "mcpServers": {
       "promptlab-mcp": {
         "command": "promptlab-mcp",
         "args": [],
         "env": {
           "PROMPTLAB_URL": "http://localhost:3010"
         }
       }
     }
   }
   ```

**Step 3 – Restart Cursor** and open the other project.

**To unlink later:** `cd packages/promptlab-mcp` then `npm unlink -g promptlab-mcp`

---

### Option B: Project link (per-project, uses npx)

Links the package into the other project's `node_modules`. That project must have a `package.json`.

**Step 1 – Build and register globally** (in ai-prompt-manager):

```bash
cd /path/to/ai-prompt-manager/packages/promptlab-mcp
npm install
npm run build
npm link
```

**Step 2 – Link into the other project:**

```bash
cd /path/to/your-other-project
npm link promptlab-mcp
```

**Step 3 – MCP config** (in the other project's `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "promptlab-mcp": {
      "command": "npx",
      "args": ["promptlab-mcp"],
      "env": {
        "PROMPTLAB_URL": "http://localhost:3010"
      }
    }
  }
}
```

**Step 4 – Restart Cursor** and open the other project.

**To unlink later:** `cd your-other-project` then `npm unlink promptlab-mcp`

---

### After code changes in promptlab-mcp

Rebuild so the linked package uses the latest code:

```bash
cd /path/to/ai-prompt-manager/packages/promptlab-mcp
npm run build
```

Then restart Cursor (or reload the MCP server).

---

## Quick Reference

| Item | Value |
|------|-------|
| MCP server name | `promptlab-mcp` |
| Run command | `npx -y promptlab-mcp` |
| Default proxy URL | `http://localhost:3000` |
| Typical proxy URL | `http://localhost:3010` |
| Config file | `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global) |
| Rules path | `.cursor/rules/prompt-fu.mdc`, `.cursor/rules/prompt-refine.mdc` |
