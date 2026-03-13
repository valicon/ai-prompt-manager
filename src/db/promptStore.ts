import * as fs from "fs";
import * as path from "path";

export interface PromptPattern {
  pattern: string;
  prompt: string;
  tags: string[];
  filePath: string;
}

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const [, frontStr, body] = match;
  const frontmatter: Record<string, unknown> = {};
  for (const line of (frontStr ?? "").split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let val: unknown = line.slice(colonIdx + 1).trim();
      if (typeof val === "string" && val.startsWith("[") && val.endsWith("]")) {
        val = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
      }
      frontmatter[key] = val;
    }
  }
  return { frontmatter, body: body ?? "" };
}

export function loadPatterns(dbPath: string): PromptPattern[] {
  const patterns: PromptPattern[] = [];
  const resolved = path.resolve(dbPath);

  if (!fs.existsSync(resolved)) {
    return patterns;
  }

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
      } else if (ent.isFile() && ent.name.endsWith(".md")) {
        const content = fs.readFileSync(full, "utf-8");
        const { frontmatter, body } = parseFrontmatter(content);
        const pattern = (frontmatter.pattern as string) ?? path.basename(ent.name, ".md");
        const tags = Array.isArray(frontmatter.tags) ? (frontmatter.tags as string[]) : [];
        patterns.push({
          pattern,
          prompt: body.trim(),
          tags,
          filePath: full,
        });
      }
    }
  }

  walk(resolved);
  return patterns;
}
