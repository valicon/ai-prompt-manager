/**
 * Dev-aware logger. Verbose when NODE_ENV !== 'production' or LOG_LEVEL=verbose.
 * Never log full API keys or full prompt content - only "key present/missing", prompt length.
 */

export function isVerbose(): boolean {
  if (process.env.LOG_LEVEL === "verbose") return true;
  return process.env.NODE_ENV !== "production";
}

export function log(msg: string, ...args: unknown[]): void {
  if (isVerbose()) {
    console.log(`[PromptLab] ${msg}`, ...args);
  }
}

export function logError(msg: string, err?: unknown): void {
  if (isVerbose()) {
    const suffix = err instanceof Error ? ` ${err.message}` : err ? ` ${String(err)}` : "";
    console.error(`[PromptLab] ${msg}${suffix}`);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
  }
}
